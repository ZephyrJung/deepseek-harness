/**
 * writing-drill 宿主契约验证：钉死「评判结论解析」的行为。
 *
 * 模型输出的评分段落是自由文本，宿主需要从中抽出 0-10 分数与「达标判断：
 * 是/否」。本测试覆盖常见写法（分数在前/后、中文/英文判定词、缺失情况）。
 */
import assert from 'node:assert/strict';
import { __test } from '../index.js';

const { parseVerdict } = __test;

/* ---------- 分数提取 ---------- */
assert.deepEqual(
  parseVerdict('## 评分\n8.5 / 10，立意新颖。\n\n## 结论\n达标判断：是'),
  { score: 8.5, passed: true },
  'parses "8.5 / 10" and Chinese pass',
);

assert.deepEqual(
  parseVerdict('分数：7 分\n达标判断：否'),
  { score: 7, passed: false },
  'parses "分数：7 分" and Chinese fail',
);

assert.deepEqual(
  parseVerdict('本次得分 9 分，整体优秀。\n达标判断：通过'),
  { score: 9, passed: true },
  'parses "得分 9 分" and 通过',
);

/* ---------- 英文判定词 ---------- */
assert.deepEqual(
  parseVerdict('Score: 8.0/10\n达标判断：yes'),
  { score: 8, passed: true },
  'accepts "yes"',
);

/* ---------- 分数夹紧到 0-10 ---------- */
assert.deepEqual(
  parseVerdict('评分 12 分\n达标判断：是'),
  { score: 10, passed: true },
  'clamps score above 10 down to 10',
);

/* ---------- 缺失情况 ---------- */
assert.deepEqual(
  parseVerdict('这段写得很一般，还有进步空间。'),
  { score: null, passed: null },
  'returns nulls when no score or verdict is present',
);

assert.deepEqual(
  parseVerdict('8 分'),
  { score: 8, passed: null },
  'score only, no verdict',
);

console.log('writing-drill smoke: all checks passed');
