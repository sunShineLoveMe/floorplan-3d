import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { editorToCloud } from '../src/container.ts';
import { fixture, fixtureProject } from '../../tests/helpers/house-fixture.js';
import { createRectangleProject } from '../../src/data/project-data.js';
import { writeFile } from 'node:fs/promises';
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = path.join(root, 'server/dist/assets');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
// Explicit roots only. Do not traverse the repository root or copy docs/configs/tests.
await cp(path.join(root, 'index.html'), path.join(out, 'index.html'));
for (const file of ['cloud-development.html', 'cloud-development.js', 'cloud-acceptance.js']) await cp(path.join(root, 'server/public', file), path.join(out, file));
// Publish synthetic validation samples only, never the test tree or source drawings.
const umbria = editorToCloud(fixtureProject(fixture('newmark-umbria-P0-scenario')));
const large = createRectangleProject();
large.furniture = Array.from({ length: 1600 }, (_, i) => ({ id: 'f-' + i, type: 'chair', name: 'x'.repeat(500), w: 450.25, d: 480.125, height: 823.7, cx: 1000.125, cy: 1000.625, rot: 0, color: '#abcdef' }));
await writeFile(path.join(out, 'cloud-acceptance-fixtures.js'), 'export const samples = ' + JSON.stringify({ Umbria: umbria, 'near-body-limit': editorToCloud(large) }) + ';\n');
for (const dir of ['src', 'styles', 'vendor']) await cp(path.join(root, dir), path.join(out, dir), {
  recursive: true, filter: async source => (await stat(source)).isDirectory() || /\.(js|mjs|css|png|jpe?g|webp|svg|woff2?)$/i.test(source) || path.basename(source) === 'LICENSE'
});
async function inventory(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const name = path.join(dir, e.name);
    if (e.isDirectory()) await inventory(name);
    else if (!/\.(html|js|mjs|css|png|jpe?g|webp|svg|woff2?)$/i.test(name) && e.name !== 'LICENSE') throw Error('Unexpected published asset: ' + name);
  }
}
await inventory(out);
console.log('Static allowlist: editor, cloud development checks, generated synthetic samples, src/, styles/, vendor/');
