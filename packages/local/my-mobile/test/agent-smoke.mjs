/**
 * Per-step agent contract smoke test.
 *
 * The panel no longer stops on a step count — a run ends when the model says
 * the goal is met, or says it does not know what the next action is. This test
 * pins that contract end to end against a stub Ollama: `pause` must come back
 * as a distinct outcome (not `done`, not an error), the other action shapes
 * must still parse, and the prompt must only carry a recent window of history
 * now that runs can be long.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { __planner } from '../index.js';

const { resolveConfig, agentStep, AGENT_SYSTEM } = __planner;

/* ---------- defaults: no step ceiling ---------- */
assert.equal(resolveConfig({}).llm.maxAgentSteps, 0, '默认不应设步数上限（0 = 不限）');
assert.equal(resolveConfig({ llm: { maxAgentSteps: 30 } }).llm.maxAgentSteps, 30, '显式预算应生效');
assert.equal(resolveConfig({ llm: { maxAgentSteps: -5 } }).llm.maxAgentSteps, 0, '非法值退回不限');

/* ---------- prompt contract ---------- */
assert(AGENT_SYSTEM.includes('{"pause":true'), '提示词应说明 pause 的形状');
assert(AGENT_SYSTEM.includes('拿不准就输出 pause'), '提示词应要求不确定时 pause 而不是猜');
assert(!AGENT_SYSTEM.includes('试了两三次仍没有进展时，输出 {"done":true'), '卡住不能再谎报 done');

/* ---------- stub screen + stub ollama ---------- */
const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
if (!hasFfmpeg) {
  console.log('SKIP my-mobile agent smoke (ffmpeg not on PATH)');
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), 'my-mobile-agent-'));
const png = join(dir, 'screen.png');
const made = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'lavfi', '-i', 'color=c=#203040:s=1080x2340', '-frames:v', '1', png,
], { stdio: 'ignore' });
assert.equal(made.status, 0, 'ffmpeg could not render a test screen');
const screen = readFileSync(png);

const replies = [];
const prompts = [];
const server = http.createServer((request, response) => {
  let body = '';
  request.on('data', (chunk) => { body += chunk; });
  request.on('end', () => {
    const payload = JSON.parse(body);
    prompts.push(payload.messages[1].content);
    /* An empty queue returns done, so a bug cannot spin the server. */
    const content = replies.shift() ?? '{"done":true,"say":"结束"}';
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: { content }, done_reason: 'stop', eval_count: 24 }));
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const options = resolveConfig({ dataDir: join(dir, 'data'), llm: { baseUrl, model: 'stub-vision' } });
const client = { screenshot: async () => screen };
const device = { width: 1080, height: 2340 };

try {
  /* ---------- the model declines to guess ---------- */
  replies.push('{"pause":true,"say":"搜索框下面有三个同名结果，不知道该点哪个"}');
  const asked = await agentStep(options, client, { text: '把 FreeOTP 卸载掉', done: [], device, serial: 'stub' });
  assert.equal(asked.pause, true, 'pause 必须作为独立结果返回');
  assert.equal(asked.done, false, 'pause 不是 done');
  assert.equal(asked.step, null, 'pause 不应带动作');
  assert(asked.say.includes('三个同名结果'), 'pause 的理由要原样带回面板');
  assert.equal(asked.unchanged, false, '首轮没有上一帧可比');
  assert.equal(prompts.length, 1, '一轮只应该发一次请求');
  assert(prompts[0].includes('用户目标：把 FreeOTP 卸载掉'), '提示里应带用户目标');
  assert(prompts[0].includes('这是第一步'), '首轮应说明还没有动作');

  /* 兼容两种简写 */
  replies.push('{"kind":"pause","say":"看不清当前是哪一页"}');
  assert.equal((await agentStep(options, client, { text: 'x', done: [], device })).pause, true);
  replies.push('{"ask":true,"say":"需要验证码"}');
  assert.equal((await agentStep(options, client, { text: 'x', done: [], device })).pause, true);

  /* ---------- normal action still parses ---------- */
  replies.push('{"kind":"tap","fx":0.5,"fy":0.3,"say":"点击搜索框"}');
  const acted = await agentStep(options, client, {
    text: '打开图库找最近的照片',
    done: [{ kind: 'app', say: '打开图库', ok: true }],
    device,
  });
  assert.equal(acted.pause, undefined, '正常动作不应被当成 pause');
  assert.equal(acted.done, false);
  assert.equal(acted.step.kind, 'tap');
  assert.equal(acted.step.x, 540, '0.5 的 fx 应换算成 1080 宽的中点');
  assert.equal(acted.step.y, 702, '0.3 的 fy 应换算成 2340 高的 30%');
  assert.equal(acted.image.width, 720, '下发给模型的图应缩到 720 宽');

  /* ---------- done ---------- */
  replies.push('{"done":true,"say":"图库已打开并显示照片列表"}');
  const finished = await agentStep(options, client, {
    text: '打开图库', done: [{ kind: 'app', say: '打开图库', ok: true }], device,
  });
  assert.equal(finished.done, true);
  assert.equal(finished.pause, undefined);
  assert(finished.say.includes('照片列表'));

  /* ---------- long run: history is windowed, not resent whole ---------- */
  const long = Array.from({ length: 25 }, (_, index) => ({ kind: 'key', say: `第 ${index + 1} 步`, ok: true }));
  replies.push('{"pause":true,"say":"已经滚到底了"}');
  await agentStep(options, client, { text: '一直往下翻', done: long, device });
  const longPrompt = prompts[prompts.length - 1];
  assert(longPrompt.includes('共 25 个动作'), '长任务应告诉模型总步数');
  assert(longPrompt.includes('以下是最近 20 个'), '长任务只应带最近 20 条历史');
  assert(longPrompt.includes('第 25 步'), '最新一步必须在窗口里');
  assert(!longPrompt.includes('第 5 步'), '早期步骤应被丢弃');
} finally {
  server.close();
  rmSync(dir, { recursive: true, force: true });
}

console.log('PASS my-mobile agent smoke (pause 契约, 动作解析, 历史窗口)');
