/**
 * Planner validation smoke test.
 *
 * The semantic planner trusts nothing: whatever the local model returns is
 * re-validated here before it can reach adb. This test pins that contract —
 * fractions become pixels and clamp to the screen, invented action kinds and
 * unknown keys/qualities are dropped, package names are resolved or refused,
 * and a runaway plan is truncated.
 */
import assert from 'node:assert/strict';
import { __planner } from '../index.js';

const {
  normalizePlan,
  normalizePlanStep,
  parsePlanJson,
  planPixel,
  planPackage,
  PLAN_MAX_STEPS,
} = __planner;

const screen = { width: 1080, height: 2340 };

/* ---------- coordinates ---------- */
assert.equal(planPixel(0.5, 1080), 540, 'fraction should map to the middle');
assert.equal(planPixel(1, 1080), 1080, 'fraction 1 is the far edge');
assert.equal(planPixel(0, 1080), 0);
assert.equal(planPixel(540, 1080), 540, 'values above 1 are pixels');
assert.equal(planPixel(-0.4, 1080), 0, 'negative fractions clamp to 0');
assert.equal(planPixel(99999, 1080), 1080, 'oversized pixels clamp to the edge');
assert.equal(planPixel('nonsense', 1080), null, 'non-numeric coordinate is rejected');

/* ---------- package names ---------- */
assert.equal(planPackage('com.tencent.mm'), 'com.tencent.mm');
assert.equal(planPackage('微信'), 'com.tencent.mm', 'known alias resolves');
assert.equal(planPackage('打开微信'), 'com.tencent.mm', 'alias inside a sentence resolves');
assert.equal(planPackage('QQ'), 'com.tencent.mobileqq', 'case-insensitive alias');
assert.equal(planPackage('com.example.app2'), 'com.example.app2');
assert.equal(planPackage('随便编的应用'), '', 'unknown names are refused, not invented');
assert.equal(planPackage(''), '');

/* ---------- single steps ---------- */
assert.deepEqual(
  normalizePlanStep({ kind: 'app', package: 'com.tencent.mm', say: '打开微信' }, screen),
  { kind: 'app', package: 'com.tencent.mm', say: '打开微信' },
);
assert.equal(normalizePlanStep({ kind: 'app', name: '不存在的应用' }, screen), null, 'unresolved app is dropped');
assert.deepEqual(
  normalizePlanStep({ kind: 'tap', fx: 0.5, fy: 0.08 }, screen),
  { kind: 'tap', x: 540, y: 187, say: '点击 (540, 187)' },
);
assert.equal(normalizePlanStep({ kind: 'tap', fx: 0.5 }, screen), null, 'tap needs both axes');
assert.equal(normalizePlanStep({ kind: 'key', key: 'reboot' }, screen), null, 'unknown key is dropped');
assert.deepEqual(
  normalizePlanStep({ kind: 'key', key: 'back' }, screen),
  { kind: 'key', key: 'back', say: '按键 back' },
);
assert.equal(normalizePlanStep({ kind: 'quality', quality: 'ultra' }, screen), null);
assert.deepEqual(
  normalizePlanStep({ kind: 'record', seconds: 9999 }, screen),
  { kind: 'record', seconds: 600, say: '录屏 600 秒' },
  'record seconds clamp to the plugin cap',
);
assert.deepEqual(
  normalizePlanStep({ kind: 'record', seconds: 1 }, screen),
  { kind: 'record', seconds: 3, say: '录屏 3 秒' },
  'too-short durations rise to the 3 s floor',
);
assert.deepEqual(
  normalizePlanStep({ kind: 'record', seconds: 0 }, screen),
  { kind: 'record', seconds: 15, say: '录屏 15 秒' },
  'a nonsensical duration falls back to 15 s',
);
assert.equal(normalizePlanStep({ kind: 'text', text: '   ' }, screen), null, 'blank text is dropped');
assert.equal(normalizePlanStep({ kind: 'shell', command: 'rm -rf /' }, screen), null, 'unknown kinds cannot pass');
assert.equal(normalizePlanStep(null, screen), null);

/* ---------- whole plans ---------- */
const plan = normalizePlan({
  steps: [
    { kind: 'app', package: 'com.taobao.taobao', say: '打开淘宝' },
    { kind: 'tap', fx: 0.5, fy: 0.08, say: '点搜索框' },
    { kind: 'text', text: '今天的推荐' },
    { kind: 'key', key: 'enter' },
    { kind: 'screenshot' },
    { kind: 'rm-rf' },
  ],
}, screen);
assert.equal(plan.length, 5, 'the bogus action is dropped, the rest survive');
assert.deepEqual(plan.map((step) => step.kind), ['app', 'tap', 'text', 'key', 'screenshot']);
assert.equal(plan[1].x, 540);
assert.equal(plan[2].text, '今天的推荐');

const runaway = normalizePlan({ steps: Array.from({ length: 40 }, () => ({ kind: 'screenshot' })) }, screen);
assert.equal(runaway.length, PLAN_MAX_STEPS, 'a runaway plan is truncated');

assert.deepEqual(normalizePlan({ steps: [] }, screen), []);
assert.deepEqual(normalizePlan({}, screen), [], 'a reply without steps yields nothing');
assert.deepEqual(normalizePlan('nope', screen), []);
assert.equal(normalizePlan({ actions: [{ kind: 'screenshot' }] }, screen).length, 1, 'accepts the `actions` alias');

/* ---------- reply parsing ---------- */
assert.deepEqual(parsePlanJson('{"steps":[{"kind":"screenshot"}]}'), { steps: [{ kind: 'screenshot' }] });
assert.deepEqual(
  parsePlanJson('```json\n{"steps":[]}\n```'),
  { steps: [] },
  'fenced replies still parse',
);
assert.deepEqual(
  parsePlanJson('好的，计划如下：{"steps":[{"kind":"wake"}]} 希望有帮助'),
  { steps: [{ kind: 'wake' }] },
  'prose around the object is tolerated',
);
assert.equal(parsePlanJson('完全不是 JSON'), null, 'unparseable replies are refused');

console.log('PASS my-mobile planner smoke (coordinates, packages, action whitelist, plan truncation, reply parsing)');
