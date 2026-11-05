/**
 * 脚本录制功能验证。
 *
 * 录制器把手动操作（tap/swipe/longPress）和模型骨架都归一化成白名单动作序列，
 * 存成 JSON。本测试钉死这份契约：normalizeScriptStep 的字段清洗与白名单拒绝、
 * scriptFile 的文件名校验、以及 SCRIPT_MAX_STEPS 上限常量的存在。
 */
import assert from 'node:assert/strict';
import { __planner } from '../index.js';

const { normalizeScriptStep, scriptFile, SCRIPTS_DIR, SCRIPT_MAX_STEPS } = __planner;

/* ---------- normalizeScriptStep：合法动作的字段清洗 ---------- */
const tap = normalizeScriptStep({ kind: 'tap', x: 540, y: 1200, say: '点击搜索框' });
assert.deepEqual(tap, { kind: 'tap', say: '点击搜索框', x: 540, y: 1200 }, 'tap keeps kind/say/x/y');

/* 相对坐标（fx/fy）会被归一化成像素 */
const tapFrac = normalizeScriptStep({ kind: 'tap', fx: 0.5, fy: 0.5 });
assert.equal(tapFrac.x, 540, 'fx 0.5 → 540px (1080 fallback width)');
assert.equal(tapFrac.y, 1170, 'fy 0.5 → 1170px (2340 fallback height)');

const swipe = normalizeScriptStep({ kind: 'swipe', x1: 0, y1: 100, x2: 200, y2: 100, ms: 260, say: '右滑' });
assert.deepEqual(swipe, { kind: 'swipe', say: '右滑', x1: 0, y1: 100, x2: 200, y2: 100, ms: 260 }, 'swipe keeps all coords');

const longPress = normalizeScriptStep({ kind: 'longPress', x: 10, y: 20, ms: 600 });
assert.equal(longPress.kind, 'longPress');
assert.equal(longPress.ms, 600);

const key = normalizeScriptStep({ kind: 'key', key: 'back', say: '返回' });
assert.deepEqual(key, { kind: 'key', say: '返回', key: 'back' });

const text = normalizeScriptStep({ kind: 'text', text: 'hello', say: '输入 hello' });
assert.deepEqual(text, { kind: 'text', say: '输入 hello', text: 'hello' });

const app = normalizeScriptStep({ kind: 'app', name: '微信', say: '打开微信' });
assert.equal(app.kind, 'app');
assert.equal(app.package, 'com.tencent.mm', 'app name resolves to a package');

/* ---------- 白名单拒绝 ---------- */
assert.equal(normalizeScriptStep({ kind: 'rm', arg: '-rf /' }), null, 'unknown kind is refused');
assert.equal(normalizeScriptStep(null), null, 'null is refused');
assert.equal(normalizeScriptStep('tap'), null, 'non-object is refused');

/* planPixel 会把越界坐标夹紧到屏幕内（夹紧行为已在 plan-smoke 覆盖），
   这里验证越界像素不会被拒绝，而是夹成合法 tap。 */
const clamped = normalizeScriptStep({ kind: 'tap', x: 99999, y: 99999 });
assert.equal(clamped.kind, 'tap', 'out-of-range pixel is clamped, not rejected');
assert.equal(clamped.x, 1080, 'x clamps to fallback width');
assert.equal(clamped.y, 2340, 'y clamps to fallback height');

/* ---------- scriptFile：文件名校验 ---------- */
assert.equal(scriptFile('wechat-msg').endsWith('wechat-msg.json'), true, 'valid slug maps to .json');
assert.equal(scriptFile('wechat-msg.json').endsWith('wechat-msg.json'), true, '.json suffix is stripped then re-added');
assert.equal(scriptFile('打开微信').endsWith('.json'), true, 'Chinese name is allowed');
assert.equal(scriptFile('打开微信').includes('打开微信.json'), true);

assert.throws(() => scriptFile(''), /脚本名/, 'empty name is refused');
assert.throws(() => scriptFile('has space'), /脚本名/, 'spaces are refused');
assert.throws(() => scriptFile('a/b'), /脚本名/, 'slashes are refused');
assert.throws(() => scriptFile('x'.repeat(81)), /脚本名/, 'overlong name is refused');

/* ---------- 常量 ---------- */
assert.ok(SCRIPTS_DIR.endsWith('scripts'), 'scripts live under a scripts/ directory');
assert.ok(SCRIPT_MAX_STEPS > 0, 'a step ceiling exists for replayed scripts');

console.log('PASS my-mobile script smoke (step normalization, filename validation, replay ceiling)');
