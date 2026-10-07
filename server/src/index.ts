import { Hono } from 'hono';
import { createAuth } from './auth';
import { ApiError, invalid } from './errors';
import { limits } from './limits';
import { commitProject, listProjects, readProject, receiptStatus } from './projects';
import { uuid } from './container';
import type { Env } from './types';

type Variables = { owner: string; requestId: string };
export const app = new Hono<{ Bindings: Env; Variables: Variables }>();
app.use('/api/*', async (c, next) => {
  c.set('requestId', crypto.randomUUID());
  c.header('Cache-Control', 'private, no-store');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Request-Id', c.get('requestId'));
  const origin = new URL(c.env.APP_ORIGIN).origin;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) && c.req.header('Origin') !== origin) throw new ApiError('ORIGIN_REJECTED', 403);
  // Google returns through a cross-site GET navigation. Better Auth validates its
  // state / PKCE binding; keep the cross-site guard for every other endpoint.
  const googleCallback = c.req.method === 'GET' && c.req.path === '/api/auth/callback/google';
  if (c.req.header('Sec-Fetch-Site') === 'cross-site' && !googleCallback) throw new ApiError('ORIGIN_REJECTED', 403);
  await next();
});
app.get('/api/health', c => c.json({ status: 'ok', environment: c.env.ENVIRONMENT, contract: 1 }));
app.on(['GET', 'POST'], '/api/auth/*', c => createAuth(c.env).handler(c.req.raw));
app.use('/api/*', async (c, next) => {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers, query: { disableCookieCache: true } });
  if (!session) throw new ApiError('SESSION_REQUIRED', 401);
  c.set('owner', session.user.id);
  await next();
});
async function jsonBody(request: Request, max: number): Promise<Record<string, any>> {
  if (!request.headers.get('Content-Type')?.match(/^application\/json(?:;|$)/i)) throw new ApiError('UNSUPPORTED_MEDIA_TYPE', 415);
  if (Number(request.headers.get('Content-Length')) > max) throw new ApiError('BODY_TOO_LARGE', 413);
  const reader = request.body?.getReader();
  if (!reader) return invalid('body');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); throw new ApiError('BODY_TOO_LARGE', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { return invalid('JSON'); }
}
app.get('/api/me', c => c.json({ user: { id: c.get('owner') } }));
app.get('/api/projects', async c => c.json(await listProjects(c.env, c.get('owner'), c.req.query('cursor'))));
app.post('/api/projects', async c => c.json(await commitProject(c.env, c.get('owner'), await jsonBody(c.req.raw, limits(c.env).bodyBytes)), 201));
app.get('/api/projects/:id', async c => c.json(await readProject(c.env, c.get('owner'), c.req.param('id'))));
app.put('/api/projects/:id', async c => c.json(await commitProject(c.env, c.get('owner'), await jsonBody(c.req.raw, limits(c.env).bodyBytes), c.req.param('id'))));
app.get('/api/mutations/:id', async c => c.json(await receiptStatus(c.env, c.get('owner'), c.req.param('id'))));
// BE-01 read boundary only. Upload/finalize and cache adaptation belong to BE-03.
app.get('/api/assets/:id', async c => {
  if (!uuid(c.req.param('id'))) invalid('assetId');
  const asset = await c.env.DB.prepare("SELECT object_key, mime FROM assets WHERE id = ? AND owner_id = ? AND state = 'ready' AND deleted_at IS NULL").bind(c.req.param('id'), c.get('owner')).first<{ object_key: string; mime: string }>();
  if (!asset) throw new ApiError('NOT_FOUND', 404);
  const object = await c.env.BUCKET.get(asset.object_key);
  if (!object) throw new ApiError('ASSET_UNAVAILABLE', 503);
  c.header('Content-Type', asset.mime);
  return c.body(object.body);
});
app.notFound(c => c.json({ error: { code: 'NOT_FOUND', requestId: c.get('requestId') } }, 404));
app.onError((error, c) => {
  const known = error instanceof ApiError;
  const code = known ? error.code : 'TEMPORARY_FAILURE';
  // No cookies, OAuth codes, object keys or body content in application logs.
  if (!known) console.error(JSON.stringify({ requestId: c.get('requestId'), code }));
  return c.json({ error: { code, requestId: c.get('requestId'), ...(known && error.detail ? error.detail : {}) } }, (known ? error.status : 503) as 400);
});
export default app;
