import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import { Miniflare } from 'miniflare';
import { app } from '../src/index';
import { createAuth } from '../src/auth';
import { editorToCloud } from '../src/container';
import { createRectangleProject } from '../../src/data/project-data.js';
import { fixture, fixtureProject } from '../../tests/helpers/house-fixture.js';
import type { Env } from '../src/types';
let mf: Miniflare, env: Env, cookies: Record<string, string> = {};
const requestOrigin = 'http://127.0.0.1:8787';
const migrations = ['0001_auth.sql', '0002_projects.sql'];
async function migrate(db: D1Database, names = migrations) {
  for (const file of names) {
    const sql = await readFile(new URL('../migrations/' + file, import.meta.url), 'utf8');
    // D1 exec is line-oriented. Keep trigger bodies intact by splitting SQL with a small lexer.
    const statements = splitSql(sql);
    await db.batch(statements.map(s => db.prepare(s)));
  }
}
function splitSql(sql: string) {
  const lines = sql.replace(/--[^\n]*/g, '').split('\n'), statements: string[] = [];
  let pending = '', trigger = false;
  for (const line of lines) {
    pending += line + '\n';
    if (/CREATE TRIGGER/i.test(pending)) trigger = true;
    if (trigger ? /END;\s*$/.test(line) : /;\s*$/.test(line)) {
      statements.push(pending.trim()); pending = ''; trigger = false;
    }
  }
  if (pending.trim()) throw Error('Unterminated migration');
  return statements;
}
async function seed(owner: string) {
  const ctx = await createAuth(env).$context;
  await ctx.internalAdapter.createUser({ id: owner, name: owner, email: owner + '@example.test', emailVerified: true }, { method: 'oauth', oauth: { providerId: 'google' } });
  const s = await ctx.internalAdapter.createSession(owner, false);
  assert.ok(s);
  cookies[owner] = 'better-auth.session_token=' + encodeURIComponent(s.token + '.' + createHmac('sha256', env.BETTER_AUTH_SECRET).update(s.token).digest('base64'));
}
before(async () => {
  mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("test"); } };',
    compatibilityDate: '2026-07-30', d1Databases: ['DB', 'UPGRADE'], r2Buckets: ['BUCKET'] });
  env = { DB: await mf.getD1Database('DB') as unknown as D1Database, BUCKET: await mf.getR2Bucket('BUCKET') as unknown as R2Bucket,
    APP_ORIGIN: requestOrigin, ENVIRONMENT: 'development', BETTER_AUTH_SECRET: 'local-test-secret-with-more-than-32-characters', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '' } as Env;
  await migrate(env.DB);
  await seed('account-a'); await seed('account-b');
});
after(async () => { await mf?.dispose(); });
async function call(method: string, path: string, body?: any, owner = 'account-a', override: Partial<Env> = {}, headers: Record<string, string> = {}) {
  const response = await app.fetch(new Request(requestOrigin + path, { method,
    headers: { Origin: requestOrigin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.0.0.1', ...(owner ? { Cookie: cookies[owner] } : {}), ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) }), { ...env, ...override });
  return { response, status: response.status, data: await response.json() as any };
}
async function create(container = editorToCloud(createRectangleProject()), override: Partial<Env> = {}) {
  const body = { mutationId: crypto.randomUUID(), name: 'Private project', container };
  const result = await call('POST', '/api/projects', body, 'account-a', override);
  assert.equal(result.status, 201, JSON.stringify(result.data));
  return { ...result.data, body };
}
const counts = async (id: string) => {
  const versions = await env.DB.prepare('SELECT count(*) AS n FROM project_versions WHERE project_id = ?').bind(id).first<{ n: number }>();
  const receipts = await env.DB.prepare('SELECT count(*) AS n FROM mutation_receipts WHERE project_id = ?').bind(id).first<{ n: number }>();
  return [versions?.n, receipts?.n];
};
test('fresh initialization, auth schema and business upgrade preserve existing users', async () => {
  const db = await mf.getD1Database('UPGRADE') as unknown as D1Database;
  await migrate(db, ['0001_auth.sql']);
  await db.prepare('INSERT INTO user(id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, ?)').bind('old-user', 'Old', 'old@example.test', Date.now(), Date.now()).run();
  await migrate(db, ['0002_projects.sql']);
  assert.equal((await db.prepare('SELECT id FROM user').first<{ id: string }>())?.id, 'old-user');
  assert.equal((await db.prepare('SELECT count(*) AS n FROM projects').first<{ n: number }>())?.n, 0);
});
test('session required, signed cookie verified and forged owner cannot authorize', async () => {
  assert.equal((await call('GET', '/api/projects', undefined, '')).status, 401);
  assert.equal((await call('GET', '/api/me', undefined, '', {}, { Cookie: 'better-auth.session_token=forged' })).status, 401);
  assert.equal((await call('GET', '/api/me')).data.user.id, 'account-a');
  const body = { mutationId: crypto.randomUUID(), name: 'Forged', ownerId: 'account-b', container: editorToCloud(createRectangleProject()) };
  assert.equal((await call('POST', '/api/projects', body)).status, 400);
});
test('wrong and missing Origin writes fail; private responses cannot be shared-cached', async () => {
  assert.equal((await call('POST', '/api/projects', {}, 'account-a', {}, { Origin: 'https://evil.test' })).status, 403);
  const r = await app.fetch(new Request(requestOrigin + '/api/projects', { method: 'POST', headers: { Cookie: cookies['account-a'] }, body: '{}' }), env);
  assert.equal(r.status, 403);
  const safe = await call('GET', '/api/me'); assert.equal(safe.response.headers.get('Cache-Control'), 'private, no-store');
  assert.ok(safe.response.headers.get('X-Request-Id'));
});
test('cross-site Google callback reaches OAuth state validation; other cross-site requests stay rejected', async () => {
  const callback = await app.fetch(new Request(requestOrigin + '/api/auth/callback/google', {
    headers: { 'Sec-Fetch-Site': 'cross-site', 'CF-Connecting-IP': '127.0.0.1' }
  }), env);
  assert.equal(callback.status, 302);
  const errorURL = new URL(callback.headers.get('Location')!);
  assert.equal(errorURL.origin, requestOrigin);
  assert.equal(errorURL.searchParams.get('error'), 'state_not_found');
  assert.equal(callback.headers.get('Set-Cookie'), null);
  assert.equal((await call('GET', '/api/me', undefined, 'account-a', {}, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await call('POST', '/api/auth/sign-in/social', { provider: 'google' }, '', {}, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await call('POST', '/api/auth/callback/google', {}, '', {}, { Origin: 'https://evil.test', 'Sec-Fetch-Site': 'cross-site' })).status, 403);
});
test('create / authorized read / list / cross-account save and receipt boundaries', async () => {
  const p = await create(editorToCloud(fixtureProject(fixture('newmark-umbria-P0-scenario'))));
  const path = '/api/projects/' + p.project.id;
  const read = await call('GET', path); assert.equal(read.status, 200);
  assert.equal(read.data.container.domain.geometry.rooms.length, 25); assert.equal(read.data.container.domain.geometry.walls.length, 95); assert.equal(read.data.container.domain.furniture.length, 43);
  assert.equal((await call('GET', path, undefined, 'account-b')).status, 404);
  assert.equal((await call('PUT', path, { expectedRevision: 1, mutationId: crypto.randomUUID(), container: p.body.container }, 'account-b')).status, 404);
  assert.equal((await call('GET', '/api/mutations/' + p.mutationId, undefined, 'account-b')).status, 404);
  const listB = await call('GET', '/api/projects', undefined, 'account-b'); assert.deepEqual(listB.data.projects, []);
  const replay = await call('POST', '/api/projects', p.body); assert.equal(replay.data.project.id, p.project.id); assert.equal(replay.data.replayed, true);
  assert.deepEqual(await counts(p.project.id), [1, 1]);
});
test('same revision concurrent mutations commit once, zero-row loser has no receipt/version', async () => {
  const p = await create(), path = '/api/projects/' + p.project.id;
  const make = () => ({ expectedRevision: 1, mutationId: crypto.randomUUID(), container: p.body.container });
  const bodies = [make(), make()];
  const results = await Promise.all(bodies.map(b => call('PUT', path, b)));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const lost = results.findIndex(r => r.status === 409);
  assert.equal((await call('GET', '/api/mutations/' + bodies[lost].mutationId)).status, 404);
  assert.deepEqual(await counts(p.project.id), [2, 2]);
  assert.equal((await call('GET', path)).data.project.revision, 2);
});
test('same mutation concurrent requests and lost response retries never increment twice', async () => {
  const p = await create(), path = '/api/projects/' + p.project.id;
  const body = { expectedRevision: 1, mutationId: crypto.randomUUID(), container: p.body.container };
  const results = await Promise.all([call('PUT', path, body), call('PUT', path, body)]);
  assert.deepEqual(results.map(r => r.status), [200, 200]);
  // Discard successful response, retry the original frozen payload.
  const retry = await call('PUT', path, body); assert.equal(retry.data.project.revision, 2); assert.equal(retry.data.replayed, true);
  assert.deepEqual(await counts(p.project.id), [2, 2]);
  body.container.domain.view.mode = '3d';
  assert.equal((await call('PUT', path, body)).data.error.code, 'MUTATION_REUSED');
});
test('concurrent creates with one mutation yield one server-generated project', async () => {
  const body = { mutationId: crypto.randomUUID(), name: 'Concurrent create', container: editorToCloud(createRectangleProject()) };
  const r = await Promise.all([call('POST', '/api/projects', body), call('POST', '/api/projects', body)]);
  assert.deepEqual(r.map(x => x.status), [201, 201]);
  assert.equal(r[0].data.project.id, r[1].data.project.id);
  assert.deepEqual(await counts(r[0].data.project.id), [1, 1]);
});
test('R2 write failure changes no D1 pointer or successful receipt', async () => {
  const p = await create(), path = '/api/projects/' + p.project.id;
  const body = { expectedRevision: 1, mutationId: crypto.randomUUID(), container: p.body.container };
  const bucket = new Proxy(env.BUCKET, { get(target, key) { if (key === 'put') return async () => { throw Error('Injected R2 failure'); }; const v = Reflect.get(target, key); return typeof v === 'function' ? v.bind(target) : v; } });
  assert.equal((await call('PUT', path, body, 'account-a', { BUCKET: bucket })).status, 503);
  assert.equal((await call('GET', path)).data.project.revision, 1);
  assert.deepEqual(await counts(p.project.id), [1, 1]);
});
test('D1 failure after actual UPDATE rolls back pointer, version, quota and receipt; retry succeeds', async () => {
  const p = await create(), path = '/api/projects/' + p.project.id;
  const usageBefore = await env.DB.prepare('SELECT stored_bytes FROM user_usage WHERE owner_id = ?').bind('account-a').first();
  const body = { expectedRevision: 1, mutationId: crypto.randomUUID(), container: p.body.container };
  await env.DB.prepare(`CREATE TRIGGER inject_version_failure BEFORE INSERT ON project_versions WHEN NEW.project_id = '${p.project.id}' BEGIN SELECT RAISE(ABORT, 'injected'); END`).run();
  assert.equal((await call('PUT', path, body)).status, 503);
  assert.equal((await call('GET', path)).data.project.revision, 1);
  assert.deepEqual(await counts(p.project.id), [1, 1]);
  assert.deepEqual(await env.DB.prepare('SELECT stored_bytes FROM user_usage WHERE owner_id = ?').bind('account-a').first(), usageBefore);
  await env.DB.prepare('DROP TRIGGER inject_version_failure').run();
  assert.equal((await call('PUT', path, body)).status, 200);
});
test('D1 commit succeeded but transport throws; original mutation resolves on retry', async () => {
  const p = await create(), path = '/api/projects/' + p.project.id;
  const body = { expectedRevision: 1, mutationId: crypto.randomUUID(), container: p.body.container };
  const db = new Proxy(env.DB, { get(target, key) { if (key === 'batch') return async (s: D1PreparedStatement[]) => { await target.batch(s); throw Error('Injected lost D1 reply'); }; const v = Reflect.get(target, key); return typeof v === 'function' ? v.bind(target) : v; } });
  assert.equal((await call('PUT', path, body, 'account-a', { DB: db })).status, 503);
  const retry = await call('PUT', path, body); assert.equal(retry.status, 200); assert.equal(retry.data.replayed, true);
  assert.deepEqual(await counts(p.project.id), [2, 2]);
});
test('body limits / malformed JSON / storage and project quotas reject without false success', async () => {
  const base = { mutationId: crypto.randomUUID(), name: 'Limit', container: editorToCloud(createRectangleProject()) };
  assert.equal((await call('POST', '/api/projects', base, 'account-a', { MAX_BODY_BYTES: '32' })).status, 413);
  assert.equal((await call('POST', '/api/projects', '{bad')).status, 400);
  assert.equal((await call('POST', '/api/projects', base, 'account-a', { MAX_USER_BYTES: '1' })).data.error.code, 'QUOTA_EXCEEDED');
  assert.equal((await call('POST', '/api/projects', base, 'account-a', { MAX_PROJECTS: '1' })).data.error.code, 'QUOTA_EXCEEDED');
  assert.equal((await call('GET', '/api/mutations/' + base.mutationId)).status, 404);
});
test('schema rejects cross-owner versions, duplicate receipts and asset foreign ownership', async () => {
  const p = await create();
  await assert.rejects(env.DB.prepare('INSERT INTO project_versions(project_id, owner_id, revision, object_key, hash, bytes, created_at) VALUES (?, ?, 99, ?, ?, 1, ?)').bind(p.project.id, 'account-b', crypto.randomUUID(), 'a'.repeat(64), new Date().toISOString()).run());
  await assert.rejects(env.DB.prepare('INSERT INTO mutation_receipts SELECT * FROM mutation_receipts WHERE owner_id = ? AND mutation_id = ?').bind('account-a', p.mutationId).run());
});
test('ready raster permission, private download, calibrated snapshot and missing object behavior', async () => {
  const id = crypto.randomUUID(), key = 'test-raster/' + id;
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4S8AAAAASUVORK5CYII=', 'base64');
  await env.BUCKET.put(key, bytes);
  await env.DB.prepare("INSERT INTO assets(id, owner_id, kind, state, object_key, bytes, hash, mime, created_at) VALUES (?, ?, 'raster', 'ready', ?, ?, ?, 'image/png', ?)").bind(id, 'account-a', key, bytes.length, 'a'.repeat(64), new Date().toISOString()).run();
  const editor: any = createRectangleProject(); editor.referencePlan = { name: 'Reference', src: 'data:image/png;base64,' + bytes.toString('base64'), pixelWidth: 1, pixelHeight: 1, mmPerPixel: 25.4, x: -50.8, y: 25.4, opacity: .6, visible: true };
  const p = await create(editorToCloud(editor, id));
  const got = await call('GET', '/api/projects/' + p.project.id); assert.equal(got.data.container.domain.referencePlan.mmPerPixel, 25.4);
  assert.equal((await call('GET', '/api/assets/' + id, undefined, 'account-b')).status, 404);
  const allowed = await app.fetch(new Request(requestOrigin + '/api/assets/' + id, { headers: { Cookie: cookies['account-a'] } }), env);
  assert.equal(allowed.status, 200); assert.deepEqual(Buffer.from(await allowed.arrayBuffer()), bytes);
  const unauthorized = await call('POST', '/api/projects', { mutationId: crypto.randomUUID(), name: 'Stolen raster', container: p.body.container }, 'account-b'); assert.equal(unauthorized.status, 422);
  await assert.rejects(env.DB.prepare('INSERT INTO version_assets(project_id, owner_id, revision, asset_id) VALUES (?, ?, 1, ?)').bind(p.project.id, 'account-b', id).run());
  const row = await env.DB.prepare('SELECT current_object_key FROM projects WHERE id = ?').bind(p.project.id).first<{ current_object_key: string }>();
  await env.BUCKET.delete(row!.current_object_key);
  assert.equal((await call('GET', '/api/projects/' + p.project.id)).data.error.code, 'SNAPSHOT_UNAVAILABLE');
});
test('expired receipt requires resync, never replayed as a new mutation', async () => {
  const p = await create();
  await env.DB.prepare('UPDATE mutation_receipts SET expires_at = ? WHERE mutation_id = ?').bind('2020-01-01T00:00:00.000Z', p.mutationId).run();
  assert.equal((await call('POST', '/api/projects', p.body)).data.error.code, 'MUTATION_EXPIRED');
  assert.deepEqual(await counts(p.project.id), [1, 1]);
});
test('signout invalidates the original server session, session expiry also fails closed', async () => {
  await seed('logout-user');
  const out = await call('POST', '/api/auth/sign-out', {}, 'logout-user'); assert.equal(out.status, 200);
  assert.equal((await call('GET', '/api/me', undefined, 'logout-user')).status, 401);
  await seed('expired-user');
  await env.DB.prepare('UPDATE session SET expiresAt = ? WHERE userId = ?').bind(1, 'expired-user').run();
  assert.equal((await call('GET', '/api/me', undefined, 'expired-user')).status, 401);
});
test('concurrent different-project saves cannot overrun the shared committed quota', async () => {
  const projects = [await create(), await create()];
  const stored = (await env.DB.prepare('SELECT stored_bytes FROM user_usage WHERE owner_id = ?').bind('account-a').first<{ stored_bytes: number }>())!.stored_bytes;
  const bytes = new TextEncoder().encode(JSON.stringify(projects[0].body.container)).length;
  const result = await Promise.all(projects.map(p => call('PUT', '/api/projects/' + p.project.id,
    { expectedRevision: 1, mutationId: crypto.randomUUID(), container: p.body.container }, 'account-a', { MAX_USER_BYTES: String(stored + bytes + 10) })));
  assert.deepEqual(result.map(r => r.status).sort(), [200, 429]);
  assert.equal(result.find(r => r.status === 429)!.data.error.code, 'QUOTA_EXCEEDED');
  const usage = (await env.DB.prepare('SELECT stored_bytes FROM user_usage WHERE owner_id = ?').bind('account-a').first<{ stored_bytes: number }>())!.stored_bytes;
  assert.ok(usage <= stored + bytes + 10);
  assert.deepEqual((await Promise.all(projects.map(p => counts(p.project.id)))).map(x => x[0]).sort(), [1, 2]);
});
test('deleted projects never accept stale saves or replay successful receipts', async () => {
  const p = await create(), path = '/api/projects/' + p.project.id;
  await env.DB.prepare('UPDATE projects SET deleted_at = ? WHERE id = ?').bind(new Date().toISOString(), p.project.id).run();
  assert.equal((await call('GET', path)).status, 404);
  assert.equal((await call('GET', '/api/mutations/' + p.mutationId)).status, 404);
  assert.equal((await call('POST', '/api/projects', p.body)).status, 404);
  assert.equal((await call('PUT', path, { expectedRevision: 1, mutationId: crypto.randomUUID(), container: p.body.container })).status, 404);
  assert.deepEqual(await counts(p.project.id), [1, 1]);
});
test('server-issued HTTPS session cookie carries Secure / HttpOnly / SameSite', async () => {
  const ctx = await createAuth({ ...env, APP_ORIGIN: 'https://development.example.test' }).$context;
  const cookie = ctx.authCookies.sessionToken;
  assert.equal(cookie.attributes.secure, true);
  assert.equal(cookie.attributes.httpOnly, true);
  assert.equal(cookie.attributes.sameSite, 'lax');
});
test('forced zero-row CAS batch writes no version, quota increment or success receipt', async () => {
  const p = await create(), path = '/api/projects/' + p.project.id;
  const losing = { expectedRevision: 1, mutationId: crypto.randomUUID(), container: p.body.container };
  const winning = { expectedRevision: 1, mutationId: crypto.randomUUID(), container: p.body.container };
  let observed: D1Result[] = [];
  const db = new Proxy(env.DB, { get(target, key) {
    if (key === 'batch') return async (statements: D1PreparedStatement[]) => {
      // Force a real successful competing commit AFTER preflight/R2, BEFORE this CAS batch.
      assert.equal((await call('PUT', path, winning)).status, 200);
      observed = await target.batch(statements); return observed;
    };
    const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
  } });
  const lost = await call('PUT', path, losing, 'account-a', { DB: db });
  assert.equal(lost.status, 409);
  assert.ok(observed.length >= 5);
  assert.equal(observed[1].meta.changes, 0);
  assert.ok(observed.slice(2).every(r => r.meta.changes === 0));
  assert.equal((await call('GET', '/api/mutations/' + losing.mutationId)).status, 404);
  assert.deepEqual(await counts(p.project.id), [2, 2]);
});
