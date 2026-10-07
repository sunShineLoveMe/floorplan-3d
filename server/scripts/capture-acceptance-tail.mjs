import { spawn } from 'node:child_process';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const output = process.argv[2];
if (!output) throw Error('Usage: node scripts/capture-acceptance-tail.mjs <sanitized.jsonl>');
await mkdir(path.dirname(output), { recursive: true });
const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'tail', '--env', 'development', '--format', 'json', '--header', 'X-BE01-Acceptance:1'], { stdio: ['ignore', 'pipe', 'pipe'] });
let pending = '', json = '', events = 0;
let writes = Promise.resolve();
child.stdout.on('data', chunk => {
  pending += chunk.toString();
  let newline;
  while ((newline = pending.indexOf('\n')) !== -1) {
    const line = pending.slice(0, newline); pending = pending.slice(newline + 1);
    if (!json && line.trim() !== '{') continue;
    json += line + '\n';
    if (line === '}') {
      try {
        const event = JSON.parse(json);
        const request = event.event?.request;
        // Only retain generated acceptance traffic; discard URL queries, headers,
        // cookies, auth endpoints, logs and exceptions before any file or output.
        const url = request?.url ? new URL(request.url) : null;
        if (url && /^\/api\/(projects(?:\/[^/]+)?|mutations\/[^/]+|me|health)$/.test(url.pathname)) {
          const safe = { timestamp: event.eventTimestamp, method: request.method, path: url.pathname, outcome: event.outcome, status: event.event?.response?.status,
            ...(typeof event.cpuTime === 'number' ? { cpuTimeMs: event.cpuTime } : {}), ...(typeof event.wallTime === 'number' ? { wallTimeMs: event.wallTime } : {}) };
          writes = writes.then(() => appendFile(output, JSON.stringify(safe) + '\n'));
          events++; process.stdout.write('Sanitized acceptance event ' + events + '; CPU metric available: ' + (typeof event.cpuTime === 'number') + '\n');
        }
      } catch { process.stdout.write('Unparsed tail event discarded.\n'); }
      json = '';
    }
  }
});
child.stderr.on('data', () => { process.stdout.write('Wrangler tail diagnostic received (raw output discarded).\n'); });
child.on('exit', async code => { await writes; process.exitCode = code ?? 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
console.log('Capturing only sanitized BE-01 acceptance events; stop with Ctrl+C. CPU is recorded only when the platform supplies it.');
