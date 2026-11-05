/**
 * Host-side smoke test for speech-notes.
 *
 * It replaces v2t with a tiny shell script and Ollama with a local HTTP server,
 * then exercises the exact Fetch routes the browser panel calls.  Run with:
 *
 *   node test/harness.mjs
 */
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const packageDir = new URL('..', import.meta.url).pathname;
const host = await import(join(packageDir, 'index.js'));

function makeContext() {
  const routes = new Map();
  const effects = [];
  const ctx = {
    logger: { info() {} },
    connection: {
      fetch: {
        register(route) {
          assert(!routes.has(route.path), `duplicate route ${route.path}`);
          ctx.effect(() => {
            routes.set(route.path, route);
            return () => routes.delete(route.path);
          }, `route ${route.path}`);
          return () => routes.delete(route.path);
        },
      },
    },
    effect(factory, label) {
      const dispose = factory();
      effects.push({ dispose, label });
      return dispose;
    },
    dispose() {
      for (const effect of effects.reverse()) {
        if (typeof effect.dispose === 'function') effect.dispose();
      }
    },
  };
  return { ctx, routes };
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

async function makeFakeV2t(directory, first, second) {
  const path = join(directory, 'fake-v2t.sh');
  const script = `#!/bin/bash
out=""
while [ $# -gt 0 ]; do
  case "$1" in
    -out) out="$2"; shift 2 ;;
    *) shift ;;
  esac
done
printf '%s\\n' ${JSON.stringify(first)} > "$out"
trap 'printf "%s\\n" ${JSON.stringify(second)} >> "$out"; exit 0' INT
while true; do sleep 0.1; done
`;
  await writeFile(path, script, 'utf8');
  await chmod(path, 0o755);
  return path;
}

async function makeFakeOllama() {
  const requests = [];
  const server = createServer(async (request, response) => {
    if (request.url === '/api/tags') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ models: [{ name: 'fake-summary:latest' }] }));
      return;
    }
    if (request.url === '/api/chat' && request.method === 'POST') {
      let body = '';
      for await (const chunk of request) body += chunk;
      requests.push(JSON.parse(body));
      response.writeHead(200, { 'content-type': 'application/x-ndjson' });
      const pieces = ['## 一句话概述\n', '这是一段测试总结。\n\n', '## 要点\n', '- 测试要点'];
      for (const piece of pieces) {
        response.write(`${JSON.stringify({ message: { content: piece } })}\n`);
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      response.write(`${JSON.stringify({ done: true, eval_count: 16 })}\n`);
      response.end();
      return;
    }
    response.writeHead(404);
    response.end();
  });
  const port = await listen(server);
  return { server, port, requests };
}

async function call(routes, path, init = {}) {
  const url = new URL(path, 'http://127.0.0.1');
  const route = routes.get(url.pathname);
  assert(route, `missing route ${url.pathname}`);
  const request = new Request(url, init);
  const response = await route.fetch(request);
  return response;
}

async function json(routes, path, init) {
  const response = await call(routes, path, init);
  const text = await response.text();
  assert.equal(response.status, 200, `${path} -> ${response.status}: ${text}`);
  return JSON.parse(text);
}

async function post(routes, path, body) {
  return json(routes, path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function readEvents(response) {
  const text = await response.text();
  return text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

const root = await mkdtemp(join(tmpdir(), 'dsh-speech-notes-test-'));
await mkdir(join(root, 'long'), { recursive: true });
const fake = await makeFakeOllama();
const v2tSimple = await makeFakeV2t(join(root), '第一段：今天下午三点开会，讨论发布计划。', '第二段：结论是周五前完成测试，李雷负责。');
const longText = '长文本测试内容。'.repeat(700);

try {
  /* Simple path: short transcript, one summary call. */
  const first = makeContext();
  host.apply(first.ctx, {
    binary: v2tSimple,
    dataDir: root,
    chunkSeconds: 2,
    summary: {
      baseUrl: `http://127.0.0.1:${fake.port}`,
      model: 'fake-summary',
      maxChars: 4000,
      maxChunks: 2,
      timeoutMs: 20000,
    },
  });

  const health = await json(first.routes, '/api/speech-notes/health');
  assert.equal(health.v2t.available, true);
  assert.equal(health.summary.available, true);
  assert.equal(health.summary.model, 'fake-summary');

  const started = await post(first.routes, '/api/speech-notes/start', { source: 'mic', language: 'zh' });
  assert.equal(started.ok, true);
  assert.equal(started.session.phase, 'recording');
  const id = started.session.id;

  await new Promise((resolve) => setTimeout(resolve, 250));
  const live = await json(first.routes, `/api/speech-notes/state?session=${encodeURIComponent(id)}`);
  assert.match(live.session.transcript, /第一段/);

  const stopped = await post(first.routes, '/api/speech-notes/stop', { sessionId: id });
  assert.equal(stopped.session.phase, 'done');
  assert.match(stopped.session.transcript, /第二段/);
  assert.match(stopped.session.transcript, /李雷/);

  const summaryResponse = await call(first.routes, '/api/speech-notes/summarize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: id }),
  });
  assert.equal(summaryResponse.status, 200);
  const events = await readEvents(summaryResponse);
  assert(events.some((event) => event.type === 'start'));
  assert(events.some((event) => event.type === 'chunk'));
  const done = events.find((event) => event.type === 'done');
  assert(done, 'summary did not finish');
  assert.match(done.summary, /测试总结/);

  const history = await json(first.routes, '/api/speech-notes/history');
  assert.equal(history.sessions[0].id, id);
  assert.equal(history.sessions[0].hasSummary, true);
  assert(history.sessions[0].chars > 0);

  const saved = await readFile(join(root, 'sessions', id, 'summary.md'), 'utf8');
  assert.match(saved, /测试总结/);

  /* Map-reduce path: a tiny maxChars forces part summaries and a merge call. */
  const second = makeContext();
  const v2tLong = await makeFakeV2t(join(root, 'long'), longText, '结束。');
  host.apply(second.ctx, {
    binary: v2tLong,
    dataDir: root,
    chunkSeconds: 2,
    summary: {
      baseUrl: `http://127.0.0.1:${fake.port}`,
      model: 'fake-summary',
      maxChars: 1000,
      maxChunks: 3,
      timeoutMs: 20000,
    },
  });
  const longStart = await post(second.routes, '/api/speech-notes/start', { source: 'mic', language: 'zh' });
  const longId = longStart.session.id;
  await new Promise((resolve) => setTimeout(resolve, 250));
  await post(second.routes, '/api/speech-notes/stop', { sessionId: longId });
  const longSummary = await call(second.routes, '/api/speech-notes/summarize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: longId }),
  });
  const longEvents = await readEvents(longSummary);
  assert(longEvents.some((event) => event.type === 'progress' && event.phase === 'extract'));
  assert(longEvents.some((event) => event.type === 'progress' && event.phase === 'final'));
  assert(longEvents.some((event) => event.type === 'done' && event.truncated === true));

  first.ctx.dispose();
  second.ctx.dispose();

  /* No route may remain after the plugin unloads. */
  assert.equal(first.routes.size, 0);
  assert.equal(second.routes.size, 0);

  console.log(`PASS speech-notes host smoke test (${fake.requests.length} model calls)`);
} finally {
  await close(fake.server);
  await rm(root, { recursive: true, force: true });
}
