/**
 * Optional integration check against the real local Ollama model.
 * It does not record audio; it writes a synthetic transcript session and calls
 * the same Host routes the panel uses. Run with:
 *
 *   node test/real-summary.mjs
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const packageDir = new URL('..', import.meta.url).pathname;
const host = await import(join(packageDir, 'index.js'));

const root = await mkdtemp(join(tmpdir(), 'dsh-speech-notes-real-'));
const id = 'real-summary-1';
const directory = join(root, 'sessions', id);
await mkdir(directory, { recursive: true });
const transcript = [
  '今天下午三点开会，讨论下个版本的发布计划。',
  '小王负责登录页改版，周三前给出设计稿。',
  '李雷负责接口联调，周五前完成。',
  '测试环境下周一可用。',
  '决定本周五下午四点再开一次同步会，确认剩余风险。',
  '另外，用户反馈里提到的导出功能，先放到下个迭代。',
].join('\n');
await writeFile(join(directory, 'transcript.txt'), `${transcript}\n`, 'utf8');
await writeFile(join(directory, 'meta.json'), `${JSON.stringify({
  id,
  createdAt: Date.now() - 120000,
  endedAt: Date.now() - 60000,
  language: 'zh',
  source: 'mic',
  phase: 'done',
})}\n`, 'utf8');

const routes = new Map();
const effects = [];
const ctx = {
  logger: { info() {} },
  connection: { fetch: { register(route) { routes.set(route.path, route); } } },
  effect(factory) { effects.push(factory()); },
  dispose() { for (const dispose of effects.reverse()) if (typeof dispose === 'function') dispose(); },
};
host.apply(ctx, {
  dataDir: root,
  summary: {
    baseUrl: 'http://127.0.0.1:11434',
    model: 'qwen3.8:27b-mlx',
    maxChars: 4000,
    maxChunks: 2,
    numPredict: 500,
    timeoutMs: 600000,
  },
});

const call = (path, init) => {
  const url = new URL(path, 'http://127.0.0.1');
  const route = routes.get(url.pathname);
  assert(route, `missing route ${url.pathname}`);
  return route.fetch(new Request(url, init));
};

try {
  const health = await (await call('/api/speech-notes/health')).json();
  assert.equal(health.v2t.available, true);
  assert.equal(health.summary.available, true, health.summary.error);

  const started = Date.now();
  const response = await call('/api/speech-notes/summarize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: id }),
  });
  assert.equal(response.status, 200);
  const text = await response.text();
  const events = text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const failure = events.find((event) => event.type === 'error');
  assert(!failure, failure && failure.message);
  const done = events.find((event) => event.type === 'done');
  assert(done && done.summary.length > 20, 'summary was empty');
  console.log('--- real summary ---');
  console.log(done.summary);
  console.log('---', `${Math.round((Date.now() - started) / 1000)}s,`, `${events.filter((event) => event.type === 'chunk').length} chunks`);
} finally {
  ctx.dispose();
  await rm(root, { recursive: true, force: true });
}
