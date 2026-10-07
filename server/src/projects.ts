import type { CloudContainer, Env, ProjectRow } from './types';
import { metadata } from './types';
import { ApiError, invalid } from './errors';
import { canonicalJson, hash, normalizeContainer, uuid } from './container';
import { limits } from './limits';

interface Receipt { request_hash: string; response_json: string; expires_at: string; deleted_at: string | null }
export async function getOwned(env: Env, owner: string, id: string): Promise<ProjectRow> {
  if (!uuid(id)) invalid('projectId');
  const p = await env.DB.prepare('SELECT * FROM projects WHERE id = ? AND owner_id = ? AND deleted_at IS NULL').bind(id, owner).first<ProjectRow>();
  if (!p) throw new ApiError('NOT_FOUND', 404);
  return p;
}
async function receipt(env: Env, owner: string, mutation: string, requestHash: string) {
  const row = await env.DB.prepare('SELECT r.request_hash, r.response_json, r.expires_at, p.deleted_at FROM mutation_receipts r JOIN projects p ON p.id = r.project_id AND p.owner_id = r.owner_id WHERE r.owner_id = ? AND r.mutation_id = ?').bind(owner, mutation).first<Receipt>();
  if (!row) return null;
  if (row.deleted_at) throw new ApiError('NOT_FOUND', 404);
  if (row.request_hash !== requestHash) throw new ApiError('MUTATION_REUSED', 409);
  if (row.expires_at <= new Date().toISOString()) throw new ApiError('MUTATION_EXPIRED', 409);
  return JSON.parse(row.response_json);
}
export async function receiptStatus(env: Env, owner: string, mutation: string) {
  if (!uuid(mutation)) invalid('mutationId');
  const r = await env.DB.prepare('SELECT r.response_json, r.expires_at, p.deleted_at FROM mutation_receipts r JOIN projects p ON p.id = r.project_id AND p.owner_id = r.owner_id WHERE r.owner_id = ? AND r.mutation_id = ?').bind(owner, mutation).first<Receipt>();
  if (!r || r.deleted_at) throw new ApiError('NOT_FOUND', 404);
  if (r.expires_at <= new Date().toISOString()) throw new ApiError('MUTATION_EXPIRED', 409);
  return JSON.parse(r.response_json);
}
export async function commitProject(env: Env, owner: string, input: Record<string, any>, id?: string) {
  const operation = id ? 'save' : 'create';
  const allowed = id ? ['mutationId', 'expectedRevision', 'container'] : ['mutationId', 'name', 'container'];
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !allowed.includes(k))) invalid('request fields');
  if (!uuid(input.mutationId)) invalid('mutationId');
  if (id && (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1)) invalid('expectedRevision');
  if (!id && (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 500)) invalid('name');
  // Ownership is checked before receipt replay or reading/writing R2.
  const previous = id ? await getOwned(env, owner, id) : null;
  const container = normalizeContainer(input.container);
  const config = limits(env);
  const body = canonicalJson(container), bytes = new TextEncoder().encode(body).byteLength;
  if (bytes > config.bodyBytes) throw new ApiError('BODY_TOO_LARGE', 413);
  const requestHash = await hash(canonicalJson({ operation, projectId: id ?? null, ...input, container }));
  const replay = await receipt(env, owner, input.mutationId, requestHash);
  if (replay) return { ...replay, replayed: true };
  if (previous && previous.revision !== input.expectedRevision) throw new ApiError('CONFLICT', 409, { currentRevision: previous.revision });
  const assetId = container.domain.referencePlan?.assetId;
  if (assetId) {
    const asset = await env.DB.prepare("SELECT object_key, bytes FROM assets WHERE id = ? AND owner_id = ? AND kind = 'raster' AND state = 'ready' AND deleted_at IS NULL").bind(assetId, owner).first<{ object_key: string; bytes: number }>();
    if (!asset) throw new ApiError('ASSET_UNAVAILABLE', 422);
    if (asset.bytes > config.rasterBytes || !await env.BUCKET.head(asset.object_key)) throw new ApiError('ASSET_UNAVAILABLE', 503);
  }
  const projectId = id ?? crypto.randomUUID(), commitToken = crypto.randomUUID(), now = new Date().toISOString();
  const revision = previous ? input.expectedRevision + 1 : 1;
  const objectKey = 'snapshots/' + owner + '/' + projectId + '/' + commitToken + '.json';
  const bodyHash = await hash(body);
  // Fresh immutable key per attempt. Never delete it on ambiguous database failure.
  try {
    const object = await env.BUCKET.put(objectKey, body, { httpMetadata: { contentType: 'application/json' }, customMetadata: { sha256: bodyHash } });
    if (!object) throw Error('R2 write failed');
  } catch { throw new ApiError('TEMPORARY_FAILURE', 503); }
  const response = { project: { id: projectId, name: previous?.name ?? input.name.trim(), revision,
    createdAt: previous?.created_at ?? now, updatedAt: now, deletedAt: null }, mutationId: input.mutationId };
  const expires = new Date(Date.parse(now) + 30 * 86400000).toISOString();
  const stmt = (sql: string, ...args: any[]) => env.DB.prepare(sql).bind(...args);
  const assetGuard = !assetId ? '1 = 1' : "EXISTS (SELECT 1 FROM assets WHERE id = ? AND owner_id = ? AND state = 'ready' AND kind = 'raster' AND deleted_at IS NULL)";
  const assetArgs = assetId ? [assetId, owner] : [];
  // Every later statement is guarded by this attempt's token, not the shared mutationId.
  const guard = 'EXISTS (SELECT 1 FROM projects WHERE id = ? AND owner_id = ? AND commit_token = ?)';
  const guardArgs = [projectId, owner, commitToken];
  const batch = [stmt('INSERT OR IGNORE INTO user_usage(owner_id) VALUES (?)', owner)];
  const quotaGuard = 'EXISTS (SELECT 1 FROM user_usage WHERE owner_id = ? AND stored_bytes + reserved_bytes + ? <= ?)';
  const mutationGuard = 'NOT EXISTS (SELECT 1 FROM mutation_receipts WHERE owner_id = ? AND mutation_id = ?)';
  if (previous) batch.push(stmt(`UPDATE projects SET revision = ?, current_object_key = ?, current_hash = ?, current_bytes = ?, updated_at = ?, commit_token = ?
    WHERE id = ? AND owner_id = ? AND deleted_at IS NULL AND revision = ? AND ${mutationGuard} AND ${quotaGuard} AND ${assetGuard}`,
    revision, objectKey, bodyHash, bytes, now, commitToken, projectId, owner, input.expectedRevision, owner, input.mutationId, owner, bytes, config.userBytes, ...assetArgs));
  else batch.push(stmt(`INSERT INTO projects(id, owner_id, name, revision, current_object_key, current_hash, current_bytes, created_at, updated_at, commit_token)
    SELECT ?, ?, ?, 1, ?, ?, ?, ?, ?, ? WHERE ${mutationGuard} AND ${quotaGuard}
    AND (SELECT count(*) FROM projects WHERE owner_id = ?) < ? AND ${assetGuard}`,
    projectId, owner, input.name.trim(), objectKey, bodyHash, bytes, now, now, commitToken, owner, input.mutationId, owner, bytes, config.userBytes, owner, config.projects, ...assetArgs));
  batch.push(stmt(`INSERT INTO project_versions(project_id, owner_id, revision, object_key, hash, bytes, created_at)
    SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${guard}`, projectId, owner, revision, objectKey, bodyHash, bytes, now, ...guardArgs));
  if (assetId) batch.push(stmt(`INSERT INTO version_assets(project_id, owner_id, revision, asset_id) SELECT ?, ?, ?, ? WHERE ${guard}`, projectId, owner, revision, assetId, ...guardArgs));
  batch.push(stmt(`UPDATE user_usage SET stored_bytes = stored_bytes + ? WHERE owner_id = ? AND ${guard}`, bytes, owner, ...guardArgs));
  batch.push(stmt(`INSERT INTO mutation_receipts(owner_id, mutation_id, project_id, operation, request_hash, revision, response_json, created_at, expires_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${guard}`, owner, input.mutationId, projectId, operation, requestHash, revision, JSON.stringify(response), now, expires, ...guardArgs));
  try {
    const results = await env.DB.batch(batch);
    if (results.some(r => !r.success)) throw Error('D1 batch failed');
    const won = results[1].meta.changes === 1;
    // Replay can also be the winning concurrent request with the same mutation.
    const committed = await receipt(env, owner, input.mutationId, requestHash);
    if (committed) return { ...committed, replayed: !won, metering: {
      rowsRead: results.reduce((sum, r) => sum + r.meta.rows_read, 0), rowsWritten: results.reduce((sum, r) => sum + r.meta.rows_written, 0)
    } };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('TEMPORARY_FAILURE', 503);
  }
  // Zero affected rows is not a SQL exception. It must never produce a success response.
  const current = id ? await getOwned(env, owner, id) : null;
  if (current && current.revision !== input.expectedRevision) throw new ApiError('CONFLICT', 409, { currentRevision: current.revision });
  if (assetId && !await env.DB.prepare("SELECT id FROM assets WHERE id = ? AND owner_id = ? AND state = 'ready' AND deleted_at IS NULL").bind(assetId, owner).first()) throw new ApiError('ASSET_UNAVAILABLE', 422);
  throw new ApiError('QUOTA_EXCEEDED', 429);
}
export async function readProject(env: Env, owner: string, id: string) {
  const p = await getOwned(env, owner, id);
  const object = await env.BUCKET.get(p.current_object_key);
  if (!object) throw new ApiError('SNAPSHOT_UNAVAILABLE', 503);
  const body = await object.text();
  if (new TextEncoder().encode(body).byteLength !== p.current_bytes || await hash(body) !== p.current_hash) throw new ApiError('SNAPSHOT_UNAVAILABLE', 503);
  return { project: metadata(p), container: JSON.parse(body) as CloudContainer };
}
export async function listProjects(env: Env, owner: string, cursor?: string) {
  // UUID keyset pagination. Metadata only; no cross-owner body scans.
  if (cursor && !uuid(cursor)) invalid('cursor');
  const rows = await env.DB.prepare('SELECT id, owner_id, name, revision, created_at, updated_at, deleted_at FROM projects WHERE owner_id = ? AND deleted_at IS NULL AND id > ? ORDER BY id LIMIT 21').bind(owner, cursor ?? '').all<ProjectRow>();
  return { projects: rows.results.slice(0, 20).map(metadata), nextCursor: rows.results.length > 20 ? rows.results[19].id : null };
}
