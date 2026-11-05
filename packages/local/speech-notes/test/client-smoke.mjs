/**
 * Client-module smoke test.
 *
 * Executes the plain-JS browser bundle with a minimal module loader, React and
 * Cordis context. It proves the factory and `apply` do not throw, both slots are
 * registered, and every `t('...')` key exists in both locale dictionaries.
 * It does not render React output.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const packageDir = new URL('..', import.meta.url).pathname;
const source = await readFile(join(packageDir, 'client.js'), 'utf8');

const React = {
  createElement(type, props, ...children) {
    return { type, props: props || {}, children: children.flat(Infinity) };
  },
  useState(value) { return [typeof value === 'function' ? value() : value, () => {}]; },
  useCallback(value) { return value; },
  useEffect() {},
  useRef(value) { return { current: value }; },
};

let registered = null;
const window = {
  __ModuleLoader__: {
    load(definition) {
      assert.equal(definition.id, '@local/dsh-speech-notes');
      registered = definition.factory((name) => {
        assert.equal(name, 'react');
        return React;
      });
    },
  },
};
const document = {
  head: { appendChild() {} },
  createElement() { return { dataset: {}, textContent: '', remove() {} }; },
};

const context = vm.createContext({ window, document, console, setTimeout, clearTimeout });
vm.runInContext(source, context, { filename: 'client.js' });

assert(registered, 'module factory did not run');
assert.equal(typeof registered.apply, 'function');
assert.deepEqual([...registered.inject], ['connection', 'slots', 'locale']);

const dictionaries = {};
const slots = [];
let styleAdded = false;
const ctx = {
  locale: {
    register(namespace, values) { dictionaries[namespace] = values; },
    bind(namespace) {
      return (key, params) => {
        let text = dictionaries[namespace] && dictionaries[namespace][key];
        if (typeof text !== 'string') return key;
        if (params) for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, value);
        return text;
      };
    },
  },
  slots: {
    inject(owner, callback) { callback(); },
    register(options, component) {
      slots.push({ options, component });
      return () => {};
    },
  },
  effect(factory) {
    if (factory.toString().includes('createElement')) styleAdded = true;
    factory();
  },
};
registered.apply(ctx);

assert(styleAdded, 'stylesheet effect did not run');
assert.equal(dictionaries['speech-notes'] ? Object.keys(dictionaries['speech-notes']).length : 0, 2);
assert(slots.some((slot) => slot.options.name === 'sidebar.panellist'));
const main = slots.find((slot) => slot.options.name === 'main');
assert(main, 'main panel was not registered');
assert.equal(main.options.key, 'speech-notes');
assert.equal(typeof main.component, 'function');

assert.equal(typeof registered.__markdown, 'function');
const tree = registered.__markdown([
  '## 一句话概述',
  '',
  '会议确定了发布计划。',
  '',
  '## 要点',
  '',
  '- 小王负责登录页',
  '- **李雷**负责接口联调',
  '',
  '> 注意：周五同步',
  '',
  '---',
  '',
  '1. 第一步',
  '2. 第二步',
].join('\n'));
const flatten = (node) => {
  if (typeof node === 'string') return node;
  if (!node || typeof node !== 'object') return '';
  return (node.children || []).map(flatten).join('');
};
const headings = tree.filter((node) => node.type === 'h2');
assert.equal(headings.length, 2);
assert(headings.some((node) => flatten(node) === '一句话概述'));
const list = tree.find((node) => node.type === 'ul');
assert(list, 'unordered list missing');
assert.equal(list.children.length, 2);
assert.equal(list.children[1].children.some((node) => node && node.type === 'strong'), true);
const ordered = tree.find((node) => node.type === 'ol');
assert(ordered && ordered.children.length === 2, 'ordered list missing');
assert(tree.some((node) => node.type === 'hr'), 'horizontal rule missing');
assert(tree.some((node) => node.type === 'div' && node.props.className === 'dsn-md-quote'), 'quote missing');
assert(tree.some((node) => node.type === 'p' && flatten(node).includes('会议确定')), 'paragraph missing');
assert(!tree.some((node) => flatten(node).includes('##')), 'heading markers leaked into output');

/* The real local model uses asterisk bullets with extra spaces. */
const realTree = registered.__markdown([
  '## 一句话概述',
  '会议确定发布计划。',
  '',
  '## 要点',
  '*   小王负责登录页改版。',
  '*   李雷负责接口联调。',
  '',
  '## 待办与决定',
  '*   团队：周五同步。',
].join('\n'));
const realHeads = realTree.filter((node) => node.type === 'h2').map(flatten);
assert.equal(realHeads.join('|'), '一句话概述|要点|待办与决定');
const realLists = realTree.filter((node) => node.type === 'ul');
assert.equal(realLists.length, 2);
assert.equal(realLists[0].children.length, 2);
assert.equal(realLists[1].children.length, 1);

const zh = dictionaries['speech-notes'].zh;
const en = dictionaries['speech-notes'].en;
const used = new Set();
for (const match of source.matchAll(/\bt\('([^']+)'/g)) used.add(match[1]);
for (const key of used) {
  if (!key.includes('.')) continue;
  if (key === 'sidebar.panellist') continue;
  assert(key in zh, `missing zh locale key: ${key}`);
  assert(key in en, `missing en locale key: ${key}`);
}

console.log(`PASS client smoke test (${slots.length} slots, ${used.size} locale keys)`);
