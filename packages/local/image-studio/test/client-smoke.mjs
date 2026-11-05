/**
 * Client-module smoke test.
 *
 * Runs the plain-JS browser bundle in a vm with a minimal module loader, stub
 * React and Cordis context. It checks the module factory id, inject list,
 * sidebar + main slot registration, the injected stylesheet (and its cleanup),
 * locale registration, locale file/dictionary agreement for zh and en, that
 * every literal `t('key')` used by the panel exists in both dictionaries,
 * that the rename + two-task (txt2img/img2img) surface is present, and that a
 * first render of the panel produces a coherent (element-only) tree.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const packageDir = new URL('..', import.meta.url).pathname;
const source = await readFile(join(packageDir, 'client.js'), 'utf8');
const zhFile = JSON.parse(await readFile(join(packageDir, 'locale/zh.json'), 'utf8'));
const enFile = JSON.parse(await readFile(join(packageDir, 'locale/en.json'), 'utf8'));

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
const window = {
  __ModuleLoader__: {
    load(value) {
      definition = value;
    },
  },
};

const styleTags = [];
const document = {
  head: { appendChild(node) { styleTags.push(node); } },
  body: { appendChild() {}, removeChild() {} },
  createElement(tagName) {
    return {
      tagName,
      dataset: {},
      textContent: '',
      removed: false,
      remove() { this.removed = true; },
    };
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
});
vm.runInContext(source, context, { filename: 'client.js' });

assert(definition, 'module factory did not run');
assert.equal(definition.id, '@local/dsh-image-studio');
const client = definition.factory((name) => {
  assert.equal(name, 'react');
  return React;
});

assert.equal(typeof client.apply, 'function');
assert.deepEqual([...client.inject], ['connection', 'slots', 'locale']);
assert(client.__meta && client.__meta.zh && client.__meta.en, 'missing meta dictionaries');

/* ---------- locale dictionaries from ctx.locale.register ---------- */
const registered = {};
const slots = [];
const cleanups = [];
const tCalls = new Set();
const ctx = {
  locale: {
    register(namespace, values) {
      assert.equal(namespace, 'image-studio');
      registered[namespace] = values;
    },
    bind(namespace) {
      return (key, params) => {
        tCalls.add(key);
        const dictionary = registered[namespace];
        assert(dictionary, 'locale dictionary was not registered before bind');
        assert(typeof dictionary.zh[key] === 'string', `missing zh locale key: ${key}`);
        assert(typeof dictionary.en[key] === 'string', `missing en locale key: ${key}`);
        let text = dictionary.zh[key];
        if (params) {
          for (const [name, value] of Object.entries(params)) {
            assert(text.includes(`{${name}}`), `locale key ${key} does not interpolate {${name}}`);
            text = text.replaceAll(`{${name}}`, String(value));
          }
        }
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

/* ---------- injected stylesheet ---------- */
assert.equal(styleTags.length, 1, 'expected exactly one injected style tag');
const styleTag = styleTags[0];
assert.equal(styleTag.tagName, 'style');
assert.equal(styleTag.dataset.dshPlugin, '@local/dsh-image-studio');
assert(styleTag.textContent.includes('.dsi-root'), 'stylesheet does not define .dsi-root');
assert(styleTag.textContent.includes('@media (max-width:980px)'), 'stylesheet is missing its responsive rules');
for (const className of ['.dsi-tabs', '.dsi-upload', '.dsi-range', '.dsi-pair', '.dsi-task-badge', '.dsi-denoise']) {
  assert(styleTag.textContent.includes(className), `stylesheet is missing ${className}`);
}
assert(!/dangerouslySetInnerHTML/.test(source), 'client must not use dangerouslySetInnerHTML');
assert(!/\binnerHTML\b/.test(source), 'client must not assign innerHTML');
for (const cleanup of cleanups) cleanup();
assert(styleTag.removed, 'style cleanup did not remove the tag');

/* ---------- slots ---------- */
const sidebar = slots.find((slot) => slot.options.name === 'sidebar.panellist');
assert(sidebar, 'sidebar.panellist slot was not registered');
assert.equal(sidebar.options.id, 'image-studio');
assert.equal(typeof sidebar.options.label, 'function');
assert.equal(sidebar.options.label(), 'AI作图');
assert.equal(typeof sidebar.component, 'function');

const main = slots.find((slot) => slot.options.name === 'main');
assert(main, 'main panel was not registered');
assert.equal(main.options.key, 'image-studio');
assert.equal(main.options.locale, 'image-studio');
assert.equal(typeof main.component, 'function');

/* ---------- locale files vs registered dictionaries ---------- */
const dictionaries = registered['image-studio'];
assert(dictionaries, 'locale dictionary was not registered');
const plain = (value) => JSON.parse(JSON.stringify(value));
const flat = (file) => {
  const { meta, ...rest } = file;
  return rest;
};
assert.deepEqual(flat(zhFile), plain(dictionaries.zh), 'locale/zh.json is out of sync with client.js zh dictionary');
assert.deepEqual(flat(enFile), plain(dictionaries.en), 'locale/en.json is out of sync with client.js en dictionary');
assert.deepEqual(zhFile.meta, plain(client.__meta.zh), 'locale/zh.json meta differs from client meta');
assert.deepEqual(enFile.meta, plain(client.__meta.en), 'locale/en.json meta differs from client meta');
for (const lang of ['zh', 'en']) {
  const meta = client.__meta[lang];
  assert(typeof meta.title === 'string' && meta.title.trim() !== '', `meta.title missing for ${lang}`);
  assert(typeof meta.description === 'string' && meta.description.trim() !== '', `meta.description missing for ${lang}`);
}
assert.equal(client.__meta.zh.title, 'AI作图');
assert.equal(client.__meta.en.title, 'AI Art');
assert.equal(zhFile.meta.title, 'AI作图');
assert.equal(enFile.meta.title, 'AI Art');

/* ---------- dictionaries are complete and consistent ---------- */
const zhDict = plain(dictionaries.zh);
const enDict = plain(dictionaries.en);
const zhKeys = Object.keys(zhDict).sort();
const enKeys = Object.keys(enDict).sort();
assert.deepEqual(zhKeys, enKeys, 'zh and en dictionaries have different key sets');
for (const key of zhKeys) {
  assert(typeof zhDict[key] === 'string' && zhDict[key].trim() !== '', `zh value empty: ${key}`);
  assert(typeof enDict[key] === 'string' && enDict[key].trim() !== '', `en value empty: ${key}`);
}

/* every literal key passed to t('...') must exist; no dictionary key may be dead */
const used = new Set();
for (const match of source.matchAll(/\bt\('([^']+)'/g)) used.add(match[1]);
used.add('sidebar.label'); // resolved through translate(), not t()
for (const key of used) {
  assert(key in dictionaries.zh, `missing zh locale key: ${key}`);
  assert(key in dictionaries.en, `missing en locale key: ${key}`);
}
for (const key of zhKeys) {
  assert(used.has(key), `unused locale key: ${key}`);
}

/* the new two-task / img2img surface must be present in both dictionaries */
const REQUIRED_KEYS = [
  'task.label', 'task.txt2img', 'task.img2img', 'task.loading',
  'img2img.composer', 'img2img.drop', 'img2img.paste', 'img2img.formats',
  'img2img.uploading', 'img2img.replace', 'img2img.remove', 'img2img.useLatest',
  'img2img.latestName', 'img2img.reference', 'img2img.needImage',
  'img2img.continueSession', 'img2img.optionalDesc', 'img2img.optionalDescPlaceholder',
  'img2img.hint', 'denoise.label', 'denoise.tune', 'denoise.balance',
  'denoise.overhaul', 'denoise.hint', 'result.init', 'result.output',
  'result.denoise', 'result.initFrom', 'initFrom.source', 'initFrom.turn',
  'error.fileType', 'error.fileSize', 'error.readFile', 'error.upload',
  'notice.uploaded',
];
for (const key of REQUIRED_KEYS) {
  assert(typeof zhDict[key] === 'string' && zhDict[key].trim() !== '', `missing zh img2img key: ${key}`);
  assert(typeof enDict[key] === 'string' && enDict[key].trim() !== '', `missing en img2img key: ${key}`);
}
assert(source.includes("postJson('/upload'"), 'client does not call POST /upload');
assert(source.includes('/session?task='), 'client does not load latest sessions by task');
assert(source.includes("task: 'img2img'"), 'client does not send the img2img task');
assert(source.includes('onPaste'), 'client does not support pasting a reference image');

/* every interpolation placeholder used with a key must be documented */
for (const match of source.matchAll(/\bt\('([^']+)',\s*\{([^}]+)\}/g)) {
  for (const pair of match[2].split(',')) {
    const name = pair.split(':')[0].trim();
    if (name === '') continue;
    assert(zhDict[match[1]].includes(`{${name}}`), `zh ${match[1]} lacks {${name}}`);
    assert(enDict[match[1]].includes(`{${name}}`), `en ${match[1]} lacks {${name}}`);
  }
}

/* ---------- first render ---------- */
const t = ctx.locale.bind('image-studio');
const tree = main.component({ t });
assert(tree && tree.type === 'div', 'panel did not render a root element');
assert.equal(tree.props.className, 'dsi-root');
assert.equal(tree.props['aria-busy'], 'false');

const nodes = [];
const texts = [];
const walk = (node) => {
  if (node === null || node === undefined || node === false) return;
  if (typeof node === 'string') {
    texts.push(node);
    return;
  }
  if (typeof node !== 'object') return;
  nodes.push(node);
  assert(!('dangerouslySetInnerHTML' in node.props), 'dangerouslySetInnerHTML used in rendered tree');
  for (const child of node.children || []) walk(child);
};
walk(tree);

const classNames = new Set();
for (const node of nodes) {
  if (typeof node.props.className === 'string') {
    for (const name of node.props.className.split(/\s+/)) classNames.add(name);
  }
}
for (const required of [
  'dsi-root',
  'dsi-shell',
  'dsi-header',
  'dsi-pills',
  'dsi-toolbar',
  'dsi-tabs',
  'dsi-tab',
  'dsi-composer',
  'dsi-turns',
  'dsi-side',
  'dsi-engine',
  'dsi-engine-options',
  'dsi-engine-option',
  'dsi-prefs',
  'dsi-history',
  'dsi-footer',
]) {
  assert(classNames.has(required), `rendered tree is missing .${required}`);
}
assert(!classNames.has('dsi-upload'), 'txt2img composer must not render the img2img drop zone');
assert(!classNames.has('dsi-range'), 'txt2img composer must not render the denoise slider');
assert(!classNames.has('dsi-health'), 'the old local-services health card must be gone');
assert(nodes.some((node) => node.props.role === 'radiogroup'), 'engine radiogroup missing');
assert(nodes.filter((node) => node.props.role === 'radio').length === 2, 'engine selector must offer exactly two engines');
assert.equal(typeof tree.props.onPaste, 'function', 'panel root is missing the paste handler');
assert(nodes.some((node) => node.props.role === 'tablist'), 'task tablist missing');
const buttonCount = nodes.filter((node) => node.type === 'button').length;
assert(buttonCount >= 7, `expected at least 7 buttons on first render, saw ${buttonCount}`);
assert(nodes.some((node) => node.type === 'textarea'), 'composer textarea missing');
assert(nodes.some((node) => node.type === 'h1' && node.children.includes(zhDict['panel.title'])), 'panel title missing');
assert(texts.includes(zhDict['task.txt2img']) && texts.includes(zhDict['task.img2img']), 'task labels missing from tabs');
assert(!nodes.some((node) => node.type === 'img'), 'image should not render before a turn exists');
assert(!texts.some((text) => /<[a-z][\s\S]*>/i.test(text)), 'raw HTML-looking text found in render');
assert(tCalls.size > 50, `expected the panel to use locale keys, saw ${tCalls.size}`);

console.log(`PASS client smoke test (${slots.length} slots, ${zhKeys.length} locale keys per language, ${buttonCount} buttons rendered)`);
