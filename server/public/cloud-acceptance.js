import { samples } from './cloud-acceptance-fixtures.js';
const progress = document.getElementById('progress');
const output = document.getElementById('report');
const controls = ['run', 'isolation'].map(id => document.getElementById(id));
let report;
function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v !== null && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
async function digest(v) {
  const bytes = new TextEncoder().encode(canonical(v));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function request(method, path, body) {
  const start = performance.now();
  const response = await fetch(path, { method, credentials: 'same-origin', headers: { 'X-BE01-Acceptance': '1', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, data: await response.json(), clientWallClockMs: performance.now() - start, requestId: response.headers.get('x-request-id') };
}
function check(value, message) { if (!value) throw Error(message); }
function record(label, result, expected) {
  report.checks.push({ label, status: result.status, expected, pass: result.status === expected, requestId: result.requestId, ...(result.data.error ? { code: result.data.error.code } : {}) });
  show(); check(result.status === expected, label + ': HTTP ' + result.status);
}
function show() { output.textContent = JSON.stringify(report, null, 2); document.getElementById('download').disabled = false; }
async function begin(kind, run) {
  controls.forEach(c => { c.disabled = true; });
  report = { kind, startedAt: new Date().toISOString(), origin: location.origin, cpuMeasured: false, meteringScope: 'D1 commit batch only; excludes auth and preflight queries', samples: [], checks: [] };
  try {
    const health = await request('GET', '/api/health');
    check(health.status === 200 && health.data.environment === 'development', 'Development environment required');
    record('trusted signed-in session', await request('GET', '/api/me'), 200);
    await run(); report.passed = true; progress.textContent = 'Acceptance passed. Download the report for inspection.';
  } catch (error) { report.passed = false; report.failure = error.message; progress.textContent = 'Acceptance stopped: ' + error.message; }
  finally { report.finishedAt = new Date().toISOString(); show(); controls.forEach(c => { c.disabled = false; }); }
}
document.getElementById('run').onclick = () => begin('real-session-save', async () => {
  for (const [name, count] of [['Umbria', 25], ['near-body-limit', 5]]) {
    progress.textContent = 'Saving ' + name + '…';
    const container = samples[name];
    const body = { name: 'BE-01 ' + name + ' ' + report.startedAt, mutationId: crypto.randomUUID(), container };
    const first = await request('POST', '/api/projects', body);
    record(name + ' create', first, 201);
    const sample = { name, projectId: first.data.project.id, mutationId: body.mutationId, snapshotBytes: new TextEncoder().encode(canonical(container)).length, hash: await digest(container), writes: [] };
    report.samples.push(sample);
    const keep = (result, phase) => sample.writes.push({ phase, revision: result.data.project.revision, requestId: result.requestId, clientWallClockMs: result.clientWallClockMs, commitBatchMetering: result.data.metering });
    keep(first, 'first');
    const replay = await request('POST', '/api/projects', body);
    record(name + ' response-loss retry', replay, 201);
    check(replay.data.replayed && replay.data.project.id === sample.projectId && replay.data.project.revision === 1, 'Retry must reuse original commit');
    let revision = 1;
    for (let i = 1; i < count; i++) {
      progress.textContent = name + ': write ' + (i + 1) + '/' + count;
      const saved = await request('PUT', '/api/projects/' + sample.projectId, { expectedRevision: revision, mutationId: crypto.randomUUID(), container });
      record(name + ' continuous ' + i, saved, 200); revision = saved.data.project.revision; keep(saved, 'continuous');
    }
    const read = await request('GET', '/api/projects/' + sample.projectId);
    record(name + ' authorized read', read, 200);
    check(await digest(read.data.container) === sample.hash, name + ' content or millimeter precision changed');
    sample.roundTripHashMatched = true;
    if (name === 'Umbria') {
      sample.domainCounts = { rooms: read.data.container.domain.geometry.rooms.length, walls: read.data.container.domain.geometry.walls.length, furniture: read.data.container.domain.furniture.length };
      const contenders = [0, 1].map(i => ({ expectedRevision: revision, mutationId: crypto.randomUUID(), container: structuredClone(container) }));
      contenders.forEach((b, i) => { b.container.domain.furniture[0].cx += i + 1; });
      const concurrent = await Promise.all(contenders.map(b => request('PUT', '/api/projects/' + sample.projectId, b)));
      sample.concurrent = concurrent.map((r, i) => ({ status: r.status, mutationId: contenders[i].mutationId, requestId: r.requestId }));
      check(concurrent.filter(r => r.status === 200).length === 1 && concurrent.filter(r => r.status === 409).length === 1, 'Same revision must have one winner');
      const winner = concurrent.findIndex(r => r.status === 200);
      const latest = await request('GET', '/api/projects/' + sample.projectId);
      record('concurrent latest read', latest, 200);
      check(latest.data.project.revision === revision + 1 && await digest(latest.data.container) === await digest(contenders[winner].container), 'Winner snapshot must exist');
      const loser = await request('GET', '/api/mutations/' + contenders[1 - winner].mutationId);
      record('loser has no success receipt', loser, 404);
    }
    show();
  }
  record('oversize envelope rejected', await request('POST', '/api/projects', { padding: 'x'.repeat(1024 * 1024 + 1) }), 413);
  record('forged owner rejected', await request('POST', '/api/projects', { mutationId: crypto.randomUUID(), name: 'BE-01 forged owner', ownerId: 'another-user', container: samples.Umbria }), 422);
});
document.getElementById('isolation').onclick = () => begin('real-account-isolation', async () => {
  const project = document.getElementById('other-project').value.trim();
  const mutation = document.getElementById('other-mutation').value.trim();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  check(uuid.test(project) && uuid.test(mutation), 'Both IDs must be UUIDs');
  record('other account cannot read project', await request('GET', '/api/projects/' + project), 404);
  record('other account cannot modify project', await request('PUT', '/api/projects/' + project, { expectedRevision: 1, mutationId: crypto.randomUUID(), container: samples.Umbria }), 404);
  record('other account cannot read receipt', await request('GET', '/api/mutations/' + mutation), 404);
  const list = await request('GET', '/api/projects'); record('account-scoped project list', list, 200);
  check(!list.data.projects.some(p => p.id === project), 'Other account project appeared in list');
});
document.getElementById('download').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'BE-01-' + report.kind + '.json'; a.click(); URL.revokeObjectURL(url);
};
