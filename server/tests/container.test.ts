import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRectangleProject } from '../../src/data/project-data.js';
import { fixture, fixtureProject } from '../../tests/helpers/house-fixture.js';
import { editorToCloud, cloudToEditor, normalizeContainer, canonicalJson } from '../src/container';
import type { ProjectMetadata } from '../src/types';
const meta: ProjectMetadata = { id: crypto.randomUUID(), name: 'Current project name', revision: 12,
  createdAt: '2026-10-07T00:00:00.000Z', updatedAt: '2026-10-07T01:00:00.000Z', deletedAt: null };
const raster = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4S8AAAAASUVORK5CYII=';
for (const [name, p] of [
  ['v2 rectangle', createRectangleProject({ width: 3657.6, depth: 3048.127, height: 2438.4 })],
  ['v1 custom', JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/custom-project.json', import.meta.url), 'utf8'))],
  ['Umbria', fixtureProject(fixture('newmark-umbria-P0-scenario'))]
] as const) test(name + ' round-trip preserves domain and millimetres', () => {
  const c = normalizeContainer(editorToCloud(p));
  const restored = cloudToEditor(c, meta);
  assert.deepEqual(restored.geometry, p.geometry);
  assert.deepEqual(restored.furniture, p.furniture);
  assert.equal(restored.name, meta.name);
  assert.equal(restored.id, meta.id);
  assert.equal(restored.version, 2);
  assert.equal(c.domain.name, undefined);
  assert.equal(c.domain.updatedAt, undefined);
});
test('raster becomes an asset ID, explicit bytes required on restore', () => {
  const p: any = createRectangleProject();
  p.referencePlan = { name: 'Reference', src: raster, pixelWidth: 1, pixelHeight: 1, mmPerPixel: 25.4, x: -25.4, y: 0, opacity: .6, visible: true };
  const c = normalizeContainer(editorToCloud(p, crypto.randomUUID()));
  assert.equal(c.domain.referencePlan.src, undefined);
  assert.throws(() => cloudToEditor(c, meta), /ASSET_UNAVAILABLE/);
  assert.deepEqual(cloudToEditor(c, meta, raster).referencePlan, p.referencePlan);
});
test('unknown fields are stripped at every structured boundary; authorization fields rejected', () => {
  const p: any = createRectangleProject();
  p.preview = { cx: 42 }; p.geometry.extra = 'ignored'; p.furniture = [{ id: 'chair-1', type: 'chair', name: 'Chair', w: 450.25, d: 480.125, height: 823.7, cx: 1000, cy: 1000, rot: 0, color: '#abcdef', extra: 'ignored' }];
  const c = normalizeContainer(editorToCloud(p));
  assert.equal(c.domain.preview, undefined); assert.equal(c.domain.geometry.extra, undefined); assert.equal(c.domain.furniture[0].extra, undefined);
  assert.equal(cloudToEditor(c, meta).furniture[0].height, 823.7);
  for (const key of ['ownerId', 'role', 'session', 'permissions']) {
    const dirty = structuredClone(c); dirty.domain.furniture[0][key] = 'admin';
    assert.throws(() => normalizeContainer(dirty), /INVALID_REQUEST/);
  }
  const dirty = JSON.parse(canonicalJson(c)); dirty.domain.rooms['__proto__'] = 'not own';
  assert.throws(() => normalizeContainer(JSON.parse('{"format":"floorplan-cloud","version":1,"domain":{"__proto__":{}}}')), /INVALID_REQUEST/);
});
test('bad geometry, malformed container and deeply nested input fail closed', () => {
  const c = editorToCloud(createRectangleProject());
  c.domain.geometry.height = 10;
  assert.throws(() => normalizeContainer(c), /INVALID_PROJECT/);
  assert.throws(() => normalizeContainer({ format: 'floorplan-cloud', version: 2, domain: {} }), /INVALID_REQUEST/);
  let child: any = {}; for (let i = 0; i < 45; i++) child = { extra: child };
  assert.throws(() => normalizeContainer(child), /INVALID_REQUEST/);
});
