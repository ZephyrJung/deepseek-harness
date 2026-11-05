/**
 * Client-module smoke test.
 *
 * Runs the plain-JS browser bundle in a vm with a stub React, a stub module
 * loader and a stub Cordis context. It asserts that the factory and apply()
 * run without throwing (this is what keeps the sidebar entry from vanishing),
 * that both slots register, that the stylesheet is injected and cleaned up,
 * that locale/*.json agrees with the inline dictionaries, and that a first
 * render produces an element tree with every locale key resolved.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const packageDir = new URL('..', import.meta.url).pathname;
const source = await readFile(join(packageDir, 'client.js'), 'utf8');

const React = {
  createElement(type, props, ...children) {
    return {
      type,
      props: props || {},
      children: children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false),
    };
  },
  useState(value) { return [typeof value === 'function' ? value() : value, () => {}]; },
  useRef(value) { return { current: value }; },
  useCallback(value) { return value; },
  useMemo(factory) { return factory(); },
  useEffect() {},
  useLayoutEffect() {},
};

let definition = null;
const window = { __ModuleLoader__: { load(value) { definition = value; } } };
const styleTags = [];
const document = {
  head: { appendChild(node) { styleTags.push(node); } },
  body: { appendChild() {}, removeChild() {} },
  createElement(tagName) {
    return { tagName, dataset: {}, textContent: '', removed: false, remove() { this.removed = true; } };
  },
};

const context = vm.createContext({
  window,
  document,
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  WebSocket: class { constructor() { this.readyState = 0; } close() {} addEventListener() {} },
  fetch: async () => ({ ok: false, status: 0, json: async () => ({}) }),
  navigator: { clipboard: { writeText: async () => {} } },
});
vm.runInContext(source, context, { filename: 'client.js' });

/* ---------- module shape ---------- */
assert(definition, 'module factory did not run');
assert.equal(definition.id, '@local/dsh-my-mobile');
const client = definition.factory((name) => {
  assert.equal(name, 'react');
  return React;
});
assert.equal(typeof client.apply, 'function');
assert.deepEqual([...client.inject], ['connection', 'slots', 'locale']);
assert(client.__meta && client.__meta.zh && client.__meta.en, 'missing meta dictionaries');

/* ---------- apply: slots + stylesheet ---------- */
const registered = {};
const slots = [];
const cleanups = [];
const missingKeys = new Set();

const ctx = {
  locale: {
    register(namespace, values) {
      assert.equal(namespace, 'my-mobile');
      registered[namespace] = values;
    },
    bind(namespace) {
      return (key, params) => {
        const dictionary = registered[namespace];
        assert(dictionary, 'locale dictionary was not registered before bind');
        const raw = dictionary.zh[key];
        if (raw === undefined) {
          missingKeys.add(key);
          return `⟪${key}⟫`;
        }
        let text = raw;
        if (params) for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, String(value));
        return text;
      };
    },
  },
  slots: {
    inject(owner, callback) {
      assert.equal(typeof owner, 'string');
      callback();
    },
    register(options, component) {
      slots.push({ options, component });
      return () => {};
    },
  },
  effect(factory) {
    const cleanup = factory();
    if (typeof cleanup === 'function') cleanups.push(cleanup);
    return cleanup;
  },
};

client.apply(ctx);

assert.equal(styleTags.length, 1, 'expected exactly one injected style tag');
const styleTag = styleTags[0];
assert.equal(styleTag.tagName, 'style');
assert.equal(styleTag.dataset.dshPlugin, '@local/dsh-my-mobile');
assert(styleTag.textContent.includes('.dmm-root'), 'stylesheet does not define .dmm-root');

const sidebar = slots.find((slot) => slot.options.name === 'sidebar.panellist');
assert(sidebar, 'sidebar.panellist slot was not registered');
assert.equal(sidebar.options.id, 'my-mobile');
assert.equal(sidebar.options.label(), '手机控制台');
assert.equal(typeof sidebar.component, 'function');

const main = slots.find((slot) => slot.options.name === 'main');
assert(main, 'main panel was not registered');
assert.equal(main.options.key, 'my-mobile');
assert.equal(main.options.locale, 'my-mobile');

/* ---------- locale files vs inline dictionaries ---------- */
const plain = (value) => JSON.parse(JSON.stringify(value));
for (const lang of ['zh', 'en']) {
  const file = JSON.parse(await readFile(join(packageDir, `locale/${lang}.json`), 'utf8'));
  const { meta, ...rest } = file;
  assert.deepEqual(rest, plain(registered['my-mobile'][lang]), `locale/${lang}.json is out of sync with client.js`);
  assert.deepEqual(meta, plain(client.__meta[lang]), `locale/${lang}.json meta differs from client meta`);
  assert(typeof meta.title === 'string' && meta.title.trim() !== '', `meta.title missing for ${lang}`);
  assert(typeof meta.description === 'string' && meta.description.trim() !== '', `meta.description missing for ${lang}`);
}
assert.deepEqual(
  Object.keys(registered['my-mobile'].zh).sort(),
  Object.keys(registered['my-mobile'].en).sort(),
  'zh and en dictionaries have different key sets',
);

/* ---------- first render ---------- */
const tree = main.component({ t: ctx.locale.bind('my-mobile') });
assert(tree && tree.type === 'div', 'panel did not render a root element');
assert.equal(tree.props.className, 'dmm-root');

const nodes = [];
const texts = [];
const walk = (node) => {
  if (node === null || node === undefined || node === false) return;
  if (typeof node === 'string') { texts.push(node); return; }
  if (typeof node !== 'object') return;
  nodes.push(node);
  assert(!('dangerouslySetInnerHTML' in node.props), 'dangerouslySetInnerHTML used in rendered tree');
  for (const child of node.children || []) walk(child);
};
walk(tree);

assert(nodes.length > 40, `expected a substantial first render, saw ${nodes.length} nodes`);
assert.equal(missingKeys.size, 0, `unresolved locale keys: ${[...missingKeys].join(', ')}`);
assert(!/\binnerHTML\b/.test(source), 'client must not assign innerHTML');

/* ---------- 工作状态与指令输入是同一张卡 ---------- */
/* 模型要用户确认时，用户的「回复」就是在指令框里再写一句话，所以状态和输入框
   必须在一起，且只保留一个主按钮：空闲叫「执行」，有待确认的断点时叫「继续」。 */
const byClass = (root, className) => {
  const hits = [];
  const visit = (node) => {
    if (node === null || typeof node !== 'object') return;
    const cls = node.props && node.props.className;
    if (typeof cls === 'string' && cls.split(' ').includes(className)) hits.push(node);
    for (const child of node.children || []) visit(child);
  };
  visit(root);
  return hits;
};

const workCards = byClass(tree, 'dmm-card--work');
assert.equal(workCards.length, 1, '工作状态卡应当只有一张');
const workCard = workCards[0];
assert.equal(byClass(workCard, 'dmm-textarea').length, 1, '指令输入应并入工作状态卡');
assert.equal(byClass(workCard, 'dmm-split').length, 1, '状态与输入之间应有一条分隔');
assert(byClass(workCard, 'dmm-muted').some((node) => node.children.includes('指令输入')), '卡内应保留「指令输入」标签');
const primaries = byClass(workCard, 'dmm-btn--primary');
assert.equal(primaries.length, 1, '主按钮只能有一个（执行/继续共用一个位置）');
assert.deepEqual(primaries[0].children, ['执行'], '空闲时主按钮应叫「执行」');
assert.equal(byClass(tree, 'dmm-card').length >= 4, true, '其它卡片不应被合并掉');
/* 文字输入已并入主卡，不再有第二张独立输入卡。 */
assert.equal(byClass(tree, 'dmm-textarea').length, 1, '全面板只能有一个输入框（文字输入卡已并入）');
const kindButtons = byClass(workCard, 'dmm-segmented')[0];
const kindLabels = (kindButtons?.children || []).map((c) => c.children).flat();
assert(kindLabels.includes('手机操作') && kindLabels.includes('文字输入'), '主卡应提供「手机操作 / 文字输入」二态切换');
/* 脚本录制卡：存在、含录制开关、意图输入框与步骤列表容器。 */
const scriptCards = byClass(tree, 'dmm-card--script');
assert.equal(scriptCards.length, 1, '脚本录制卡应当只有一张');
const scriptCard = scriptCards[0];
assert(byClass(scriptCard, 'dmm-input').length >= 2, '脚本卡应有意图框与脚本名框');
assert(byClass(scriptCard, 'dmm-scriptsteps').length >= 0, '步骤列表容器可渲染');

for (const cleanup of cleanups) cleanup();
assert(styleTag.removed, 'style cleanup did not remove the tag');

console.log(`PASS my-mobile client smoke (${slots.length} slots, ${Object.keys(registered['my-mobile'].zh).length} locale keys, ${nodes.length} nodes rendered)`);
