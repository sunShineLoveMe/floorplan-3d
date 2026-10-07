import { validate } from '../../src/data/project-data.js';
import { CATALOGS } from '../../src/data/catalogs.js';
import { validateReference } from '../../src/data/reference-plan.js';
import { ApiError, invalid } from './errors';
import type { CloudContainer, JsonObject, ProjectMetadata } from './types';

type Schema = true | { [key: string]: Schema } | [Schema];
const scalar: Schema = true, point: Schema = [scalar], polygon: Schema = [point];
const opening: Schema = Object.fromEntries('id roomId wallId type mode offset width height sill hinge swing pairedWith'.split(' ').map(k => [k, scalar]));
const objectSchema = (fields: string): Schema => Object.fromEntries(fields.split(' ').map(k => [k, scalar]));
const sides = (s: Schema): Schema => ({ top: s, right: s, bottom: s, left: s });
const refFields = 'name pixelWidth pixelHeight mmPerPixel x y visible opacity';
const schema: Schema = {
  templateId: scalar, migratedFrom: objectSchema('format templateId'),
  units: objectSchema('internal display'), layout: objectSchema('id name'),
  view: { mode: scalar, layers: objectSchema('dims labels furn grid bearing wallSnap') },
  roomEditor: { kind: scalar, roomId: scalar, width: scalar, depth: scalar, height: scalar, wallThickness: scalar, floorSlab: scalar,
    rooms: [{ id: scalar, x: scalar, y: scalar, width: scalar, depth: scalar,
      notch: objectSchema('corner width depth shape wallThickness'), wallWidths: sides(scalar), wallSegments: sides([objectSchema('offset length height')]),
      obstacles: [objectSchema('id name x y width depth height')] }], openings: [opening] },
  geometry: {
    height: scalar, origin: point, bounds: objectSchema('x y w h'),
    rooms: [{ ...objectSchema('id name mat counted usableAreaM2') as object, poly: polygon, at: point }],
    walls: [point], wallIds: [scalar], wallHeights: [scalar], floorSlabs: [point], floorPolygons: [polygon],
    obstacles: [{ ...objectSchema('id roomId name height') as object, rect: point }],
    diagonalWalls: [{ ...objectSchema('id roomId height') as object, poly: polygon, inner: polygon }],
    passages: [{ roomId: scalar, rect: point }],
    windows: [{ ...objectSchema('id wallId roomId sill head pairedWith') as object, rect: point }],
    doors: [{ ...objectSchema('id wallId roomId len height name pairedWith') as object, rect: point, h: point, c: point, o: point }],
    slides: [{ ...objectSchema('id wallId roomId v height style swing pairedWith') as object, rect: point }],
    lintels: [{ ...objectSchema('id wallId roomId height passage pairedWith') as object, rect: point }],
    dimensions: [{ ...objectSchema('horizontal at start') as object, segments: point }],
    walkStart: { position: point, target: point }, entry: { position: point }
  },
  rooms: { $record: objectSchema('name mat labelHidden') },
  furniture: [{ ...objectSchema('id type name w d height cx cy rot color') as object,
    clearance: objectSchema('mode containerId'), useZones: [objectSchema('id kind side widthMm depthMm offsetMm')] }],
  demolished: [scalar], measures: [{ a: objectSchema('x y'), b: objectSchema('x y') }],
  clearance: objectSchema('targetMm doorState fromRoomId toRoomId'),
  referencePlan: { ...objectSchema(refFields) as object, assetId: scalar }
};
const forbidden = new Set(['ownerId', 'owner_id', 'role', 'permissions', 'session', 'sessionToken', '__proto__', 'constructor', 'prototype']);
export function rejectForbidden(v: unknown, depth = 0): void {
  if (depth > 40) invalid('nesting');
  if (v && typeof v === 'object') for (const [k, child] of Object.entries(v)) {
    if (forbidden.has(k)) invalid(k);
    rejectForbidden(child, depth + 1);
  }
}
function scrub(v: any, s: Schema, path = 'domain'): any {
  if (v === null) return null;
  if (s === true) {
    if (typeof v === 'object' || typeof v === 'undefined') invalid(path);
    return v;
  }
  if (Array.isArray(s)) {
    if (!Array.isArray(v)) invalid(path);
    return v.map((x: any, i: number) => scrub(x, s[0], path + '.' + i));
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) invalid(path);
  const result: JsonObject = {};
  for (const [k, child] of Object.entries(v)) {
    const field = s.$record ?? s[k];
    if (field) result[k] = scrub(child, field, path + '.' + k);
  }
  return result;
}
function domainValidate(p: unknown) {
  try { return validate(p, CATALOGS); }
  catch { throw new ApiError('INVALID_PROJECT', 422); }
}
export const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function editorToCloud(editor: JsonObject, assetId?: string): CloudContainer {
  rejectForbidden(editor);
  const clean = { ...scrub(editor, schema), format: editor.format, version: editor.version,
    id: editor.id, name: editor.name, createdAt: editor.createdAt, updatedAt: editor.updatedAt };
  if (clean.referencePlan) { delete clean.referencePlan.assetId; clean.referencePlan.src = editor.referencePlan.src; }
  const p = domainValidate(clean);
  const domain = scrub(p, schema);
  if (p.referencePlan) {
    if (!uuid(assetId)) invalid('referencePlan.assetId');
    domain.referencePlan = scrub({ ...p.referencePlan, assetId }, (schema as Record<string, Schema>).referencePlan);
  }
  return { format: 'floorplan-cloud', version: 1, domain };
}
export function normalizeContainer(input: unknown): CloudContainer {
  rejectForbidden(input);
  const c = input as CloudContainer;
  if (!c || c.format !== 'floorplan-cloud' || c.version !== 1 || Object.keys(c).some(k => !['format', 'version', 'domain'].includes(k))) invalid('container');
  if (!c.domain || typeof c.domain !== 'object' || Array.isArray(c.domain)) invalid('domain');
  const domain = scrub(c.domain, schema);
  if (domain.referencePlan) {
    if (!uuid(domain.referencePlan.assetId)) invalid('referencePlan.assetId');
    // Reuse the existing reference validation without embedding asset content in the snapshot.
    try { validateReference({ ...domain.referencePlan, src: 'data:image/png;base64,AAAA' }); }
    catch { throw new ApiError('INVALID_PROJECT', 422); }
  }
  cloudToEditor({ format: 'floorplan-cloud', version: 1, domain }, validationMetadata, domain.referencePlan ? 'data:image/png;base64,AAAA' : undefined);
  return { format: 'floorplan-cloud', version: 1, domain };
}
const validationMetadata: ProjectMetadata = { id: '00000000-0000-4000-8000-000000000000', name: 'Validation', revision: 1,
  createdAt: '2026-10-07T00:00:00.000Z', updatedAt: '2026-10-07T00:00:00.000Z', deletedAt: null };
export function cloudToEditor(c: CloudContainer, meta: ProjectMetadata, raster?: string): JsonObject {
  const d = structuredClone(c.domain);
  if (d.referencePlan) {
    if (!raster) throw new ApiError('ASSET_UNAVAILABLE', 503);
    delete d.referencePlan.assetId;
    d.referencePlan.src = raster;
  }
  return domainValidate({ ...d, format: 'floorplan-3d', version: 2, id: meta.id, name: meta.name, createdAt: meta.createdAt, updatedAt: meta.updatedAt });
}
export function canonicalJson(v: any): string {
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  if (v !== null && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonicalJson(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
export async function hash(text: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
