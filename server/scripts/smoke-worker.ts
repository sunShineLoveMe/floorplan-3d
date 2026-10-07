import assert from 'node:assert/strict';
import { Miniflare } from 'miniflare';
import { readFile, writeFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import { createAuth } from '../src/auth';
import { editorToCloud, canonicalJson } from '../src/container';
import { fixture, fixtureProject } from '../../tests/helpers/house-fixture.js';
import { createRectangleProject } from '../../src/data/project-data.js';
import type { Env, JsonObject } from '../src/types';
const secret = 'isolated-worker-test-secret-no-production-credentials';
const origin = 'http://127.0.0.1:8787';
const mf = new Miniflare({ modules: [{ type: 'ESModule', path: 'dist/worker/index.js' }], compatibilityDate: '2026-07-30', compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'], r2Buckets: ['BUCKET'], bindings: { APP_ORIGIN: origin, ENVIRONMENT: 'development', BETTER_AUTH_SECRET: secret, GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '' } });
try {
  const env = { DB: await mf.getD1Database('DB'), BUCKET: await mf.getR2Bucket('BUCKET'), APP_ORIGIN: origin,
    ENVIRONMENT: 'development', BETTER_AUTH_SECRET: secret, GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '' } as unknown as Env;
  // Wrangler created the reviewed schema in its own state; this workerd smoke uses an isolated fresh database.
  for (const file of ['0001_auth.sql', '0002_projects.sql']) {
    const text = (await readFile('migrations/' + file, 'utf8')).replace(/--[^\n]*/g, '');
    const statements: string[] = []; let pending = '', trigger = false;
    for (const line of text.split('\n')) {
      pending += line + '\n'; if (/CREATE TRIGGER/i.test(pending)) trigger = true;
      if (trigger ? /END;\s*$/.test(line) : /;\s*$/.test(line)) { statements.push(pending.trim()); pending = ''; trigger = false; }
    }
    await env.DB.batch(statements.map(s => env.DB.prepare(s)));
  }
  const ctx = await createAuth(env).$context;
  await ctx.internalAdapter.createUser({ id: 'worker-user', email: 'worker@example.test', name: 'Worker test' }, { method: 'oauth', oauth: { providerId: 'google' } });
  const session = await ctx.internalAdapter.createSession('worker-user', false);
  const cookie = 'better-auth.session_token=' + encodeURIComponent(session!.token + '.' + createHmac('sha256', secret).update(session!.token).digest('base64'));
  const call = async (method: string, path: string, body?: any, useCookie = true) => {
    const started = performance.now();
    const response = await mf.dispatchFetch(origin + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.0.0.1', ...(useCookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json() as any, wallClockMs: performance.now() - started };
  };
  assert.equal((await call('GET', '/api/me')).status, 200);
  assert.equal((await call('GET', '/api/me', undefined, false)).status, 401);
  const report: JsonObject = { runtime: 'local bundled workerd + D1 + R2', cpuMeasured: false, oauthProviderContacted: false, samples: [] };
  const umbria = editorToCloud(fixtureProject(fixture('newmark-umbria-P0-scenario')));
  const large: JsonObject = createRectangleProject();
  large.furniture = Array.from({ length: 1600 }, (_, i) => ({ id: 'f-' + i, type: 'chair', name: 'x'.repeat(500), w: 450.25, d: 480.125, height: 823.7, cx: 1000.125, cy: 1000.625, rot: 0, color: '#abcdef' }));
  const largeCloud = editorToCloud(large);
  assert.ok(new TextEncoder().encode(canonicalJson(largeCloud)).length < 1024 * 1024);
  for (const [name, container, count] of [['Umbria', umbria, 25], ['near-body-limit', largeCloud, 5]] as const) {
    const body = { name, mutationId: crypto.randomUUID(), container };
    const first = await call('POST', '/api/projects', body); assert.equal(first.status, 201, JSON.stringify(first.data));
    const times = [first.wallClockMs], meters = [first.data.metering];
    let revision = 1;
    for (let i = 1; i < count; i++) {
      const result = await call('PUT', '/api/projects/' + first.data.project.id, { expectedRevision: revision++, mutationId: crypto.randomUUID(), container });
      assert.equal(result.status, 200, JSON.stringify(result.data)); times.push(result.wallClockMs); meters.push(result.data.metering);
    }
    const read = await call('GET', '/api/projects/' + first.data.project.id); assert.equal(read.status, 200); assert.deepEqual(read.data.container, container);
    const sorted = [...times.slice(1)].sort((a, b) => a - b);
    const quantile = (p: number) => sorted[Math.ceil(sorted.length * p) - 1];
    report.samples.push({ name, requests: count, failures: 0, snapshotBytes: new TextEncoder().encode(canonicalJson(container)).length,
      firstLocalWallClockMs: times[0], continuousLocalWallClockP95Ms: quantile(.95), continuousLocalWallClockP99Ms: quantile(.99),
      meteringScope: 'D1 commit batch only; excludes auth, reads, preflight and receipt lookup', commitBatchMetering: meters });
  }
  assert.equal((await call('POST', '/api/auth/sign-out', {})).status, 200);
  assert.equal((await call('GET', '/api/me')).status, 401);
  const target = process.argv[2];
  if (target) await writeFile(target, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ bundledWorkerPassed: true, samples: report.samples.map((s: any) => ({ name: s.name, requests: s.requests, snapshotBytes: s.snapshotBytes, failures: s.failures })), cpuMeasured: false }, null, 2));
} finally { await mf.dispose(); }
