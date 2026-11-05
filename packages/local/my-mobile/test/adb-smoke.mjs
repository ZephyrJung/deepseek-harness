/**
 * adb 指令操作模式验证。
 *
 * 宿主把模型产出的「结构化意图」映射成固定、白名单化的 adb 命令，不执行自由
 * shell。本测试钉死这份契约：意图→argv 的映射、危险操作的标记、非法意图的丢弃、
 * 以及参数（按键码、文本、包名）的校验与夹紧。
 */
import assert from 'node:assert/strict';
import { __planner } from '../index.js';

const { adbIntentToCommand, normalizeAdbPlan, ADB_KINDS, ADB_DANGEROUS } = __planner;

/* ---------- 意图 → argv 映射 ---------- */
const app = adbIntentToCommand({ kind: 'app', name: '微信' }, '');
assert.ok(app, 'app intent should map');
assert.deepEqual(app.argv, ['shell', 'monkey', '-p', 'com.tencent.mm', '-c', 'android.intent.category.LAUNCHER', '1']);
assert.equal(app.dangerous, false);

const home = adbIntentToCommand({ kind: 'home' }, '');
assert.deepEqual(home.argv, ['shell', 'input', 'keyevent', '3'], 'home maps to KEYCODE_HOME');

const back = adbIntentToCommand({ kind: 'back' }, '');
assert.deepEqual(back.argv, ['shell', 'input', 'keyevent', '4']);

const recents = adbIntentToCommand({ kind: 'recents' }, '');
assert.deepEqual(recents.argv, ['shell', 'input', 'keyevent', '187']);

const volumeUp = adbIntentToCommand({ kind: 'volumeUp' }, '');
assert.deepEqual(volumeUp.argv, ['shell', 'input', 'keyevent', '24']);

const text = adbIntentToCommand({ kind: 'text', text: 'hello' }, '');
assert.deepEqual(text.argv, ['shell', 'input', 'text', 'hello']);

const screenshot = adbIntentToCommand({ kind: 'screenshot' }, '');
assert.deepEqual(screenshot.argv, ['shell', 'screencap', '-p']);

/* 序列号会作为 -s 前缀传入 */
const appWithSerial = adbIntentToCommand({ kind: 'app', package: 'com.tencent.mm' }, 'ABC123');
assert.deepEqual(appWithSerial.argv.slice(0, 2), ['-s', 'ABC123'], 'serial becomes the -s prefix');

/* ---------- 危险操作标记 ---------- */
const uninstall = adbIntentToCommand({ kind: 'uninstall', name: '微信' }, '');
assert.equal(uninstall.dangerous, true, 'uninstall must be marked dangerous');
assert.deepEqual(uninstall.argv, ['shell', 'pm', 'uninstall', 'com.tencent.mm']);

const clearData = adbIntentToCommand({ kind: 'clearData', package: 'com.example.app' }, '');
assert.equal(clearData.dangerous, true, 'clearData must be marked dangerous');
assert.deepEqual(clearData.argv, ['shell', 'pm', 'clear', 'com.example.app']);

const install = adbIntentToCommand({ kind: 'install', apk: '/data/local/tmp/a.apk' }, '');
assert.equal(install.dangerous, true, 'install must be marked dangerous');

/* 无法解析的中文名（不在别名表里）→ 拒绝，而不是编造包名 */
assert.equal(adbIntentToCommand({ kind: 'uninstall', name: '中原银行' }, ''), null, 'unknown app name is refused');

/* ---------- 非法/未知意图被拒 ---------- */
assert.equal(adbIntentToCommand({ kind: 'rm', arg: '-rf /' }, ''), null, 'free shell is never allowed');
assert.equal(adbIntentToCommand({ kind: 'tap' }, ''), null, 'tap is not an adb intent (belongs to screen mode)');
assert.equal(adbIntentToCommand({ kind: 'app', name: '不存在的中文应用名' }, ''), null, 'unresolvable app name is refused');
assert.equal(adbIntentToCommand({ kind: 'keyevent', key: '999' }, ''), null, 'unknown keycode is refused');
assert.equal(adbIntentToCommand({ kind: 'text', text: '' }, ''), null, 'empty text is refused');
assert.equal(adbIntentToCommand({ kind: 'install', apk: 'no-slashes.apk' }, ''), null, 'install requires a device path');

/* ---------- 白名单集合 ---------- */
for (const dangerous of ADB_DANGEROUS) {
  assert.ok(ADB_KINDS.has(dangerous), `dangerous kind ${dangerous} must also be a valid kind`);
}
assert.ok(ADB_KINDS.has('listPackages'));

/* ---------- normalizeAdbPlan：批量解析 + 丢弃计数 ---------- */
const plan = normalizeAdbPlan({
  steps: [
    { kind: 'app', name: '微信', say: '打开微信' },
    { kind: 'tap', fx: 0.5, fy: 0.5 },            // 非法：不是 adb 意图
    { kind: 'text', text: 'hi', say: '输入' },
    { kind: 'uninstall', name: '微信', say: '卸载微信' },
  ],
}, '');
assert.equal(plan.commands.length, 3, 'only valid adb intents survive');
assert.equal(plan.dropped, 1, 'the invalid tap is counted as dropped');
assert.equal(plan.commands[0].say, '打开微信');
assert.equal(plan.commands[0].dangerous, false);
assert.equal(plan.commands[2].kind, 'uninstall');
assert.equal(plan.commands[2].dangerous, true, 'dangerous flag survives normalization');

/* 空步骤 */
assert.deepEqual(normalizeAdbPlan({ steps: [] }, ''), { commands: [], dropped: 0 });

console.log('PASS my-mobile adb smoke (intent→argv mapping, dangerous flags, refusal of free shell)');
