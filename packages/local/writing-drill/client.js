window.__ModuleLoader__.load({
  id: '@local/dsh-writing-drill',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
    const React = require('react');
    const h = React.createElement;

    const PACKAGE = '@local/dsh-writing-drill';
    const NS = 'writing-drill';
    const API = '/api/writing-drill';

    const zh = {
      'panel.kicker': '本机写作教练',
      'panel.title': '写作片段练习',
      'panel.subtitle': '由本机 Ollama 模型出题、评判并给出专业写作建议：写一段、交评、按建议改进，直到达到较高水准。所有内容只在这台电脑上处理。',
      'pill.local': '本机处理',
      'status.checking': '正在检查本机 Ollama…',
      'status.ready': '模型 {model} 已就绪',
      'status.offline': '本机 Ollama 未连接',
      'status.noModel': '模型不可用',
      'setup.title': '需要先准备本机 Ollama',
      'setup.body': '无法连接本机 Ollama（{url}），或没有找到模型 {model}。请确认 Ollama 已启动并已拉取该模型；也可以在 profile 的 cordis.patch.yml 里改 writing-drill 的 config.model 与 config.baseUrl。',
      'theme.label': '主题类型',
      'theme.placeholder': '例如：亲情、成长、城市生活、自然…（留空由 AI 自由出题）',
      'genre.label': '写作体裁',
      'genre.placeholder': '例如：记叙文、议论文、散文、小说、诗歌…（留空由 AI 判断）',
      'prompt.action': '出题',
      'prompt.prompting': '出题中…',
      'prompt.reprompt': '换一题',
      'prompt.title': '本次练习题目',
      'prompt.empty': '还没有题目：先在上方限定主题/体裁（可选），点「出题」让模型出一道题。',
      'writing.title': '你的习作',
      'writing.placeholder': '在这里写下你的习作，字数不限…',
      'writing.chars': '{count} 字',
      'grade.action': '交 AI 评判',
      'grade.grading': '评判中…',
      'grade.regrade': '重新评判',
      'grade.empty': '写下习作后点「交 AI 评判」，模型会打分并从专业写作角度给出建议。',
      'grade.title': 'AI 评判',
      'grade.model': '模型：{model}',
      'verdict.pass': '已达标',
      'verdict.fail': '尚未达标，按建议改进后再交',
      'verdict.score': '{score} 分',
      'verdict.threshold': '达标线 {score} 分',
      'verdict.noScore': '本次未给出明确分数，以「达标判断」为准',
      'phase.prompting': '正在出题…',
      'phase.grading': '正在评判…',
      'error.service': '无法连接本机写作服务。请确认 writing-drill 插件已启用，然后重新加载页面。',
      'error.prompt': '出题失败：{message}',
      'error.grade': '评判失败：{message}',
      'error.empty': '请先写下习作再提交评判。',
      'hint.local': '题目与评判都由本机 Ollama 生成，你的习作不会上传到云端。',
      'hint.loop': '评分达到达标线即判定通过；未通过时按「建议」逐条改进，再交一次评判。',
      'history.title': '练习记录',
      'history.empty': '还没有练习记录：完成一次「交 AI 评判」后，这里会保留每次的题目、习作、评分与评价，方便回看。',
      'history.count': '{count} 轮',
      'history.expand': '展开',
      'history.collapse': '收起',
      'history.pass': '达标',
      'history.fail': '未达标',
      'history.noscore': '未评分',
      'history.export': '导出 Markdown',
      'history.clear': '清空记录',
      'history.clearConfirm': '确定清空所有练习记录吗？此操作不可撤销。',
      'history.cleared': '已清空练习记录',
      'history.exportEmpty': '还没有可导出的练习记录。',
      'history.exported': '已导出 {count} 轮练习记录',
      'history.loadFailed': '练习记录加载失败：{message}',
      'history.round': '第 {n} 轮',
    };

    const en = {
      'panel.kicker': 'On-device writing coach',
      'panel.title': 'Writing Drill',
      'panel.subtitle': 'A local Ollama model proposes prompts, grades your passages and gives professional writing advice: write, submit, revise, until it reaches a high standard. Everything stays on this computer.',
      'pill.local': 'On-device',
      'status.checking': 'Checking the local Ollama…',
      'status.ready': 'Model {model} is ready',
      'status.offline': 'Local Ollama not connected',
      'status.noModel': 'Model unavailable',
      'setup.title': 'Set up the local Ollama first',
      'setup.body': 'Cannot reach the local Ollama ({url}) or model {model} was not found. Make sure Ollama is running and the model is pulled; you can also change config.model and config.baseUrl for writing-drill in the profile cordis.patch.yml.',
      'theme.label': 'Theme',
      'theme.placeholder': 'e.g. family, growing up, city life, nature… (empty = the AI picks)',
      'genre.label': 'Genre',
      'genre.placeholder': 'e.g. narrative, argument, prose, fiction, poetry… (empty = the AI decides)',
      'prompt.action': 'Give me a prompt',
      'prompt.prompting': 'Drafting…',
      'prompt.reprompt': 'New prompt',
      'prompt.title': 'Prompt',
      'prompt.empty': 'No prompt yet: optionally constrain the theme/genre above, then tap "Give me a prompt".',
      'writing.title': 'Your passage',
      'writing.placeholder': 'Write your passage here, any length…',
      'writing.chars': '{count} characters',
      'grade.action': 'Grade my writing',
      'grade.grading': 'Grading…',
      'grade.regrade': 'Re-grade',
      'grade.empty': 'Write a passage, then tap "Grade my writing" for a score and professional advice.',
      'grade.title': 'Feedback',
      'grade.model': 'Model: {model}',
      'verdict.pass': 'Passed',
      'verdict.fail': 'Not yet — revise using the advice and resubmit',
      'verdict.score': '{score} / 10',
      'verdict.threshold': 'Pass line {score}',
      'verdict.noScore': 'No explicit score this time; the verdict below decides',
      'phase.prompting': 'Drafting a prompt…',
      'phase.grading': 'Grading…',
      'error.service': 'Cannot reach the local writing service. Make sure the writing-drill plugin is enabled, then reload the page.',
      'error.prompt': 'Drafting failed: {message}',
      'error.grade': 'Grading failed: {message}',
      'error.empty': 'Write a passage before submitting.',
      'hint.local': 'Prompts and feedback are produced by your local Ollama; your writing is never uploaded.',
      'hint.loop': 'Reaching the pass line means you pass; otherwise revise using the advice and submit again.',
      'history.title': 'History',
      'history.empty': 'No history yet: after you submit a passage for grading, every prompt, passage, score and feedback is kept here for review.',
      'history.count': '{count} rounds',
      'history.expand': 'Expand',
      'history.collapse': 'Collapse',
      'history.pass': 'Passed',
      'history.fail': 'Not passed',
      'history.noscore': 'Unscored',
      'history.export': 'Export Markdown',
      'history.clear': 'Clear history',
      'history.clearConfirm': 'Clear all history? This cannot be undone.',
      'history.cleared': 'History cleared',
      'history.exportEmpty': 'Nothing to export yet.',
      'history.exported': 'Exported {count} rounds',
      'history.loadFailed': 'Failed to load history: {message}',
      'history.round': 'Round {n}',
    };

    const CSS = [
      '.dwd-root{min-height:100%;height:100%;overflow:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);}',
      '.dwd-wrap{width:100%;max-width:860px;margin:0 auto;padding:34px 40px 64px;box-sizing:border-box;}',
      '.dwd-kicker{margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);}',
      '.dwd-title{margin:0;font-size:23px;line-height:1.25;font-weight:600;letter-spacing:-.015em;}',
      '.dwd-sub{margin:9px 0 0;font-size:13px;line-height:1.65;color:var(--dsw-alias-label-secondary);}',
      '.dwd-status{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:18px;font-size:12px;color:var(--dsw-alias-label-secondary);}',
      '.dwd-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);}',
      '.dwd-dot--ok{background:var(--dsw-alias-state-success-primary);}',
      '.dwd-dot--busy{background:var(--dsw-alias-state-warn-primary);}',
      '.dwd-dot--bad{background:var(--dsw-alias-state-error-primary);}',
      '.dwd-pill{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:2px 9px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}',
      '.dwd-card{margin-top:22px;display:flex;flex-direction:column;gap:16px;padding:22px;border:1px solid var(--dsw-alias-border-l1);border-radius:16px;background:var(--dsw-alias-bg-layer-1);}',
      '.dwd-fields{display:flex;flex-direction:column;gap:12px;}',
      '.dwd-field{display:flex;flex-direction:column;gap:6px;}',
      '.dwd-label{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);}',
      '.dwd-input{width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;}',
      '.dwd-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary);}',
      '.dwd-input::placeholder{color:var(--dsw-alias-label-secondary);opacity:.8;}',
      '.dwd-textarea{width:100%;box-sizing:border-box;min-height:180px;resize:vertical;padding:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:1.8;}',
      '.dwd-textarea:focus{outline:none;border-color:var(--dsw-alias-brand-primary);}',
      '.dwd-textarea::placeholder{color:var(--dsw-alias-label-secondary);opacity:.8;}',
      '.dwd-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}',
      '.dwd-btn{appearance:none;padding:8px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;cursor:pointer;}',
      '.dwd-btn:hover:not(:disabled){border-color:var(--dsw-alias-border-l2);}',
      '.dwd-btn:disabled{opacity:.45;cursor:not-allowed;}',
      '.dwd-btn--primary{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary);color:#fff;}',
      '.dwd-btn--primary:hover:not(:disabled){opacity:.9;}',
      '.dwd-spinner{width:14px;height:14px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);animation:dwd-spin .8s linear infinite;flex:none;}',
      '@keyframes dwd-spin{to{transform:rotate(360deg);}}',
      '.dwd-streaming{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--dsw-alias-label-secondary);}',
      '.dwd-markdown{white-space:normal;}',
      '.dwd-md-p{margin:0 0 10px;white-space:pre-wrap;}',
      '.dwd-md-p:last-child{margin-bottom:0;}',
      '.dwd-md-h{margin:16px 0 8px;font-weight:600;line-height:1.4;white-space:normal;}',
      '.dwd-md-h:first-child{margin-top:0;}',
      '.dwd-md-h1{font-size:18px;}',
      '.dwd-md-h2{font-size:16px;}',
      '.dwd-md-h3{font-size:15px;}',
      '.dwd-md-h4,.dwd-md-h5,.dwd-md-h6{font-size:14px;}',
      '.dwd-md-list{margin:0 0 10px;padding-left:22px;white-space:normal;}',
      '.dwd-md-list li{margin:3px 0;}',
      '.dwd-md-list li::marker{color:var(--dsw-alias-label-secondary);}',
      '.dwd-md-hr{margin:14px 0;border:none;border-top:1px solid var(--dsw-alias-border-l1);}',
      '.dwd-md-quote{margin:0 0 10px;padding-left:12px;border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:pre-wrap;}',
      '.dwd-md-code{padding:1px 5px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;}',
      '.dwd-placeholder{font-size:13px;line-height:1.7;color:var(--dsw-alias-label-secondary);}',
      '.dwd-stats{display:flex;flex-wrap:wrap;gap:14px;font-size:11.5px;color:var(--dsw-alias-label-secondary);}',
      '.dwd-verdict{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;font-size:13px;line-height:1.5;}',
      '.dwd-verdict--pass{border:1px solid var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);color:var(--dsw-alias-label-primary);}',
      '.dwd-verdict--fail{border:1px solid var(--dsw-alias-state-warn-primary);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);color:var(--dsw-alias-label-primary);}',
      '.dwd-verdict--none{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);}',
      '.dwd-verdict-badge{flex:none;display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;}',
      '.dwd-verdict--pass .dwd-verdict-badge{background:var(--dsw-alias-state-success-primary);color:#fff;}',
      '.dwd-verdict--fail .dwd-verdict-badge{background:var(--dsw-alias-state-warn-primary);color:#fff;}',
      '.dwd-verdict--none .dwd-verdict-badge{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);}',
      '.dwd-error{margin-top:14px;padding:10px 12px;border:1px solid var(--dsw-alias-state-error-primary);border-radius:10px;font-size:12.5px;line-height:1.55;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;}',
      '.dwd-hint{margin:14px 0 0;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);}',
      '.dwd-hint + .dwd-hint{margin-top:6px;}',
      '.dwd-char-count{margin-top:4px;font-size:11px;color:var(--dsw-alias-label-secondary);text-align:right;}',
      '.dwd-history-item{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;}',
      '.dwd-history-head{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;user-select:none;}',
      '.dwd-history-head:hover{background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 55%, transparent);}',
      '.dwd-history-num{flex:none;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);}',
      '.dwd-history-meta{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11.5px;color:var(--dsw-alias-label-secondary);}',
      '.dwd-history-meta time{white-space:nowrap;font-variant-numeric:tabular-nums;}',
      '.dwd-history-badge{flex:none;display:inline-flex;align-items:center;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:600;}',
      '.dwd-history-badge--pass{background:var(--dsw-alias-state-success-primary);color:#fff;}',
      '.dwd-history-badge--fail{background:var(--dsw-alias-state-warn-primary);color:#fff;}',
      '.dwd-history-badge--none{border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);}',
      '.dwd-history-score{flex:none;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;}',
      '.dwd-history-chevron{flex:none;color:var(--dsw-alias-label-secondary);transition:transform .15s ease;font-size:11px;}',
      '.dwd-history-chevron--open{transform:rotate(90deg);}',
      '.dwd-history-body{padding:0 16px 16px;border-top:1px solid var(--dsw-alias-border-l1);}',
      '.dwd-history-section{margin-top:14px;}',
      '.dwd-history-label{margin:0 0 6px;font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);}',
      '.dwd-history-passage{margin:0;padding:12px;border-radius:9px;background:var(--dsw-alias-bg-layer-1);font-size:13px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere;}',
      '.dwd-history-md{font-size:13px;line-height:1.7;}',
      '@media (max-width:640px){.dwd-wrap{padding:22px 18px 48px;}.dwd-card{padding:16px;}}',
      '@media (prefers-reduced-motion: reduce){.dwd-spinner{animation:none;}}',
    ].join('\n');

    async function readJson(response) {
      let payload = null;
      try {
        payload = await response.json();
      } catch (_) {
        payload = null;
      }
      if (!response.ok || !payload || payload.ok === false) {
        const message = payload && payload.error && payload.error.message
          ? payload.error.message
          : `HTTP ${response.status}`;
        throw new Error(message);
      }
      return payload;
    }

    async function getJson(path) {
      const response = await fetch(`${API}${path}`, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      return readJson(response);
    }

    /* Stream an NDJSON response line by line, calling onEvent for each object.
       The controller's abort is exposed via onAbort so the panel can cancel
       the in-flight stream when it unmounts. */
    async function streamPost(path, body, onEvent, onAbort) {
      const controller = new AbortController();
      if (onAbort) onAbort(controller);
      const response = await fetch(`${API}${path}`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || {}),
        signal: controller.signal,
      });
      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const payload = await response.json();
          if (payload && payload.error && payload.error.message) message = payload.error.message;
        } catch (_) { /* keep HTTP status */ }
        throw new Error(message);
      }
      if (response.body === null) throw new Error('服务没有返回内容');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const consume = (line) => {
        const trimmed = line.trim();
        if (trimmed === '') return;
        let event;
        try {
          event = JSON.parse(trimmed);
        } catch (_) {
          return;
        }
        onEvent(event);
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline = buffer.indexOf('\n');
        while (newline !== -1) {
          consume(buffer.slice(0, newline));
          buffer = buffer.slice(newline + 1);
          newline = buffer.indexOf('\n');
        }
      }
      buffer += decoder.decode();
      consume(buffer);
      reader.releaseLock();
    }

    function PenIcon({ size = 20, active }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        'aria-hidden': true,
        style: { display: 'block', opacity: active ? 1 : 0.78 },
      },
        h('path', {
          d: 'M4 20l1-4 11-11a1.6 1.6 0 0 1 2.3 0l.7.7a1.6 1.6 0 0 1 0 2.3L8 19l-4 1z',
          stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round',
        }),
        h('path', { d: 'M14.5 6.5l3 3', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
      );
    }

    function renderInline(text) {
      const nodes = [];
      const pattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/gu;
      let last = 0;
      let index = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match.index > last) nodes.push(text.slice(last, match.index));
        const token = match[0];
        if (token.startsWith('**')) {
          nodes.push(h('strong', { key: `b${index}` }, token.slice(2, -2)));
        } else if (token.startsWith('`')) {
          nodes.push(h('code', { key: `c${index}`, className: 'dwd-md-code' }, token.slice(1, -1)));
        } else {
          nodes.push(h('em', { key: `i${index}` }, token.slice(1, -1)));
        }
        index += 1;
        last = match.index + token.length;
      }
      if (last < text.length) nodes.push(text.slice(last));
      return nodes.length > 0 ? nodes : [text];
    }

    function renderMarkdown(text) {
      const lines = String(text).replace(/\r\n?/gu, '\n').split('\n');
      const blocks = [];
      let paragraph = [];
      let list = null;
      let quote = null;
      let key = 0;
      const flushParagraph = () => {
        if (paragraph.length === 0) return;
        blocks.push(h('p', { key: `p${key}`, className: 'dwd-md-p' }, renderInline(paragraph.join('\n'))));
        key += 1;
        paragraph = [];
      };
      const flushList = () => {
        if (list === null) return;
        const tag = list.ordered ? 'ol' : 'ul';
        blocks.push(h(tag, { key: `l${key}`, className: 'dwd-md-list' },
          list.items.map((item, index) => h('li', { key: index }, renderInline(item)))));
        key += 1;
        list = null;
      };
      const flushQuote = () => {
        if (quote === null) return;
        blocks.push(h('div', { key: `q${key}`, className: 'dwd-md-quote' }, renderInline(quote.join('\n'))));
        key += 1;
        quote = null;
      };
      const flushAll = () => {
        flushParagraph();
        flushList();
        flushQuote();
      };
      for (const raw of lines) {
        const line = raw.replace(/\s+$/u, '');
        if (line.trim() === '') {
          flushAll();
          continue;
        }
        const heading = /^(#{1,6})\s+(.*)$/u.exec(line);
        if (heading !== null) {
          flushAll();
          const level = heading[1].length;
          blocks.push(h(`h${level}`, {
            key: `h${key}`,
            className: `dwd-md-h dwd-md-h${level}`,
          }, renderInline(heading[2])));
          key += 1;
          continue;
        }
        if (/^-{3,}\s*$/u.test(line)) {
          flushAll();
          blocks.push(h('hr', { key: `hr${key}`, className: 'dwd-md-hr' }));
          key += 1;
          continue;
        }
        const quoted = /^>\s?(.*)$/u.exec(line);
        if (quoted !== null) {
          flushParagraph();
          flushList();
          if (quote === null) quote = [];
          quote.push(quoted[1]);
          continue;
        }
        flushQuote();
        const bullet = /^\s*[-*+]\s+(.*)$/u.exec(line);
        const ordered = /^\s*\d+[.)]\s+(.*)$/u.exec(line);
        if (bullet !== null || ordered !== null) {
          flushParagraph();
          const isOrdered = ordered !== null;
          if (list === null || list.ordered !== isOrdered) {
            flushList();
            list = { ordered: isOrdered, items: [] };
          }
          list.items.push((bullet !== null ? bullet : ordered)[1]);
          continue;
        }
        flushList();
        paragraph.push(line);
      }
      flushAll();
      return blocks;
    }

    function Panel({ t }) {
      const [health, setHealth] = React.useState(null);
      const [healthError, setHealthError] = React.useState('');

      const [theme, setTheme] = React.useState('');
      const [genre, setGenre] = React.useState('');
      const [prompt, setPrompt] = React.useState('');
      const [prompting, setPrompting] = React.useState(false);

      const [passage, setPassage] = React.useState('');
      const [grading, setGrading] = React.useState(false);
      const [feedback, setFeedback] = React.useState('');   // raw markdown streamed from the model
      const [verdict, setVerdict] = React.useState(null);   // { score, passed, passScore }
      const [gradeModel, setGradeModel] = React.useState('');
      const [error, setError] = React.useState('');

      const abortRef = React.useRef(null);

      /* 练习历史：每次评判完成追加一轮，挂载时从宿主拉取持久化的记录。 */
      const [history, setHistory] = React.useState([]);
      const [expanded, setExpanded] = React.useState(null); // 当前展开的轮次 id
      const [exporting, setExporting] = React.useState(false);

      React.useEffect(() => {
        let cancelled = false;
        (async () => {
          try {
            const payload = await getJson('/session');
            if (!cancelled && payload && Array.isArray(payload.session.rounds)) {
              setHistory(payload.session.rounds);
            }
          } catch (e) {
            if (!cancelled) setError(t('history.loadFailed', { message: e && e.message ? e.message : String(e) }));
          }
        })();
        return () => { cancelled = true; };
      }, []);

      React.useEffect(() => {
        let cancelled = false;
        (async () => {
          try {
            const payload = await getJson('/health');
            if (!cancelled) setHealth(payload);
          } catch (e) {
            if (!cancelled) setHealthError(e && e.message ? e.message : String(e));
          }
        })();
        return () => { cancelled = true; };
      }, []);

      React.useEffect(() => () => {
        if (abortRef.current) abortRef.current.abort();
      }, []);

      const model = health ? health.model : '';
      const modelAvailable = health && health.available === true;

      const statusPill = (() => {
        if (healthError !== '') return { dot: 'bad', text: t('status.offline') };
        if (health === null) return { dot: 'busy', text: t('status.checking') };
        if (!modelAvailable) return { dot: 'bad', text: t('status.noModel') };
        return { dot: 'ok', text: t('status.ready', { model }) };
      })();

      const runPrompt = async () => {
        if (prompting) return;
        setError('');
        setPrompting(true);
        setPrompt('');
        try {
          await streamPost('/prompt', { theme, genre }, (event) => {
            if (event.type === 'chunk' && typeof event.text === 'string') {
              setPrompt((current) => current + event.text);
            } else if (event.type === 'done') {
              if (typeof event.prompt === 'string' && event.prompt !== '') {
                setPrompt(event.prompt);
              }
            } else if (event.type === 'error') {
              throw new Error(event.message || '出题失败');
            }
          }, (controller) => { abortRef.current = controller; });
        } catch (e) {
          setError(t('error.prompt', { message: e && e.message ? e.message : String(e) }));
        } finally {
          setPrompting(false);
          abortRef.current = null;
        }
      };

      const runGrade = async () => {
        if (grading) return;
        if (passage.trim() === '') {
          setError(t('error.empty'));
          return;
        }
        setError('');
        setGrading(true);
        setFeedback('');
        setVerdict(null);
        try {
          await streamPost('/grade', { prompt, passage, genre }, (event) => {
            if (event.type === 'chunk' && typeof event.text === 'string') {
              setFeedback((current) => current + event.text);
            } else if (event.type === 'done') {
              if (typeof event.grade === 'string' && event.grade !== '') {
                setFeedback(event.grade);
              }
              if (typeof event.model === 'string') setGradeModel(event.model);
              setVerdict({
                score: event.score,
                passed: event.passed === true,
                passScore: event.passScore,
              });
              if (event.round && typeof event.round.id === 'string') {
                setHistory((current) => [...current, event.round]);
              }
            } else if (event.type === 'error') {
              throw new Error(event.message || '评判失败');
            }
          }, (controller) => { abortRef.current = controller; });
        } catch (e) {
          setError(t('error.grade', { message: e && e.message ? e.message : String(e) }));
        } finally {
          setGrading(false);
          abortRef.current = null;
        }
      };

      const verdictView = (() => {
        if (verdict === null) return null;
        if (verdict.score === null && verdict.passed === undefined) {
          return h('div', { className: 'dwd-verdict dwd-verdict--none' },
            h('span', { className: 'dwd-verdict-badge' }, t('verdict.noScore')),
          );
        }
        const passed = verdict.passed === true;
        const scoreText = typeof verdict.score === 'number'
          ? t('verdict.score', { score: String(verdict.score) })
          : '';
        const passLine = typeof verdict.passScore === 'number'
          ? t('verdict.threshold', { score: String(verdict.passScore) })
          : '';
        const detail = [scoreText, passLine].filter(Boolean).join(' · ');
        return h('div', { className: `dwd-verdict ${passed ? 'dwd-verdict--pass' : 'dwd-verdict--fail'}` },
          h('span', { className: 'dwd-verdict-badge' }, passed ? t('verdict.pass') : t('verdict.fail')),
          h('span', null, detail),
        );
      })();

      const needsSetup = healthError !== '' || (health !== null && !modelAvailable);

      /* 把一轮记录序列化成 Markdown 片段（题目/习作/评分/评价）。 */
      const roundToMarkdown = (round, index) => {
        const lines = [];
        const date = typeof round.at === 'number'
          ? new Date(round.at).toLocaleString('zh-CN', { hour12: false })
          : '';
        lines.push(`## ${t('history.round', { n: String(index + 1) })}${date ? `（${date}）` : ''}`);
        lines.push('');
        if (round.theme) lines.push(`- 主题类型：${round.theme}`);
        if (round.genre) lines.push(`- 体裁：${round.genre}`);
        if (typeof round.score === 'number') lines.push(`- 评分：${round.score} / 10`);
        if (typeof round.passed === 'boolean') lines.push(`- 结果：${round.passed ? '达标' : '未达标'}`);
        if (round.model) lines.push(`- 评判模型：${round.model}`);
        lines.push('');
        lines.push('### 题目');
        lines.push('');
        lines.push(round.prompt || '');
        lines.push('');
        lines.push('### 习作');
        lines.push('');
        lines.push(round.passage || '');
        lines.push('');
        lines.push('### 评价');
        lines.push('');
        lines.push(round.grade || '');
        lines.push('');
        return lines.join('\n');
      };

      const exportMarkdown = () => {
        if (history.length === 0) {
          setError(t('history.exportEmpty'));
          return;
        }
        setExporting(true);
        try {
          const header = [
            '# 写作片段练习记录',
            '',
            `> 共 ${history.length} 轮练习，导出时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`,
            '',
            '---',
            '',
          ].join('\n');
          const body = history.map(roundToMarkdown).join('\n---\n\n');
          const markdown = `${header}${body}\n`;
          const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/gu, '-');
          anchor.href = url;
          anchor.download = `写作练习记录-${stamp}.md`;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
          setError('');
        } catch (e) {
          setError(e && e.message ? e.message : String(e));
        } finally {
          setExporting(false);
        }
      };

      const clearHistory = async () => {
        if (!window.confirm(t('history.clearConfirm'))) return;
        try {
          const response = await fetch(`${API}/session`, {
            method: 'DELETE',
            credentials: 'same-origin',
            cache: 'no-store',
          });
          await readJson(response);
          setHistory([]);
          setExpanded(null);
          setError('');
        } catch (e) {
          setError(e && e.message ? e.message : String(e));
        }
      };

      const historyView = (() => {
        if (history.length === 0) {
          return h('p', { className: 'dwd-placeholder' }, t('history.empty'));
        }
        return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
          history.map((round, index) => {
            const open = expanded === round.id;
            const badge = (() => {
              if (typeof round.passed === 'boolean') {
                return h('span', {
                  className: `dwd-history-badge ${round.passed ? 'dwd-history-badge--pass' : 'dwd-history-badge--fail'}`,
                }, round.passed ? t('history.pass') : t('history.fail'));
              }
              return h('span', { className: 'dwd-history-badge dwd-history-badge--none' }, t('history.noscore'));
            })();
            const date = typeof round.at === 'number'
              ? new Date(round.at).toLocaleString('zh-CN', { hour12: false })
              : '';
            const tags = [];
            if (round.theme) tags.push(round.theme);
            if (round.genre) tags.push(round.genre);
            return h('div', { key: round.id, className: 'dwd-history-item' },
              h('div', {
                className: 'dwd-history-head',
                onClick: () => setExpanded(open ? null : round.id),
                role: 'button',
                tabIndex: 0,
                onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(open ? null : round.id); } },
              },
                h('span', { className: 'dwd-history-num' }, `#${index + 1}`),
                h('span', { className: 'dwd-history-meta' },
                  date ? h('time', null, date) : null,
                  tags.length > 0 ? h('span', null, tags.join(' · ')) : null,
                ),
                typeof round.score === 'number'
                  ? h('span', { className: 'dwd-history-score' }, t('verdict.score', { score: String(round.score) }))
                  : null,
                badge,
                h('span', { className: `dwd-history-chevron${open ? ' dwd-history-chevron--open' : ''}` }, '▶'),
              ),
              open ? h('div', { className: 'dwd-history-body' },
                round.prompt ? h('div', { className: 'dwd-history-section' },
                  h('p', { className: 'dwd-history-label' }, t('prompt.title')),
                  h('div', { className: 'dwd-history-md' }, renderMarkdown(round.prompt)),
                ) : null,
                round.passage ? h('div', { className: 'dwd-history-section' },
                  h('p', { className: 'dwd-history-label' }, t('writing.title')),
                  h('p', { className: 'dwd-history-passage' }, round.passage),
                ) : null,
                round.grade ? h('div', { className: 'dwd-history-section' },
                  h('p', { className: 'dwd-history-label' }, t('grade.title')),
                  h('div', { className: 'dwd-history-md' }, renderMarkdown(round.grade)),
                ) : null,
              ) : null,
            );
          }),
        );
      })();

      return h('div', { className: 'dwd-root' },
        h('div', { className: 'dwd-wrap' },
          h('p', { className: 'dwd-kicker' }, t('panel.kicker')),
          h('h1', { className: 'dwd-title' }, t('panel.title')),
          h('p', { className: 'dwd-sub' }, t('panel.subtitle')),
          h('div', { className: 'dwd-status' },
            h('span', { className: `dwd-dot dwd-dot--${statusPill.dot}` }),
            h('span', null, statusPill.text),
            h('span', { className: 'dwd-pill' }, t('pill.local')),
          ),

          needsSetup
            ? h('div', { className: 'dwd-card' },
                h('h3', { className: 'dwd-label' }, t('setup.title')),
                h('p', { className: 'dwd-placeholder' }, t('setup.body', { url: health ? health.baseUrl : '', model })),
              )
            : null,

          /* 出题卡：主题类型 + 体裁（都可留空），点出题 */
          h('section', { className: 'dwd-card' },
            h('div', { className: 'dwd-fields' },
              h('div', { className: 'dwd-field' },
                h('label', { className: 'dwd-label' }, t('theme.label')),
                h('input', {
                  className: 'dwd-input',
                  value: theme,
                  placeholder: t('theme.placeholder'),
                  onChange: (e) => setTheme(e.target.value),
                }),
              ),
              h('div', { className: 'dwd-field' },
                h('label', { className: 'dwd-label' }, t('genre.label')),
                h('input', {
                  className: 'dwd-input',
                  value: genre,
                  placeholder: t('genre.placeholder'),
                  onChange: (e) => setGenre(e.target.value),
                }),
              ),
            ),
            h('div', { className: 'dwd-actions' },
              h('button', {
                className: 'dwd-btn dwd-btn--primary',
                disabled: prompting || !modelAvailable,
                onClick: () => { void runPrompt(); },
              },
                prompting ? t('prompt.prompting') : (prompt ? t('prompt.reprompt') : t('prompt.action'))),
              prompting ? h('span', { className: 'dwd-streaming' },
                h('span', { className: 'dwd-spinner' }), t('phase.prompting')) : null,
            ),
            prompt !== ''
              ? h('div', { className: 'dwd-markdown' }, renderMarkdown(prompt))
              : h('p', { className: 'dwd-placeholder' }, t('prompt.empty')),
          ),

          /* 写作卡 */
          h('section', { className: 'dwd-card' },
            h('h3', { className: 'dwd-label' }, t('writing.title')),
            h('textarea', {
              className: 'dwd-textarea',
              value: passage,
              placeholder: t('writing.placeholder'),
              onChange: (e) => setPassage(e.target.value),
            }),
            h('div', { className: 'dwd-char-count' }, t('writing.chars', { count: String(passage.length) })),
            h('div', { className: 'dwd-actions' },
              h('button', {
                className: 'dwd-btn dwd-btn--primary',
                disabled: grading || !modelAvailable || prompt === '' || passage.trim() === '',
                onClick: () => { void runGrade(); },
              },
                grading ? t('grade.grading') : (feedback ? t('grade.regrade') : t('grade.action'))),
              grading ? h('span', { className: 'dwd-streaming' },
                h('span', { className: 'dwd-spinner' }), t('phase.grading')) : null,
            ),
          ),

          /* 评判卡 */
          h('section', { className: 'dwd-card' },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' } },
              h('h3', { className: 'dwd-label', style: { margin: 0 } }, t('grade.title')),
              gradeModel ? h('span', { className: 'dwd-stats' }, t('grade.model', { model: gradeModel })) : null,
            ),
            verdictView,
            feedback !== ''
              ? h('div', { className: 'dwd-markdown' }, renderMarkdown(feedback))
              : h('p', { className: 'dwd-placeholder' }, t('grade.empty')),
          ),

          /* 练习记录卡：追溯每一轮的内容与评价，并支持导出 / 清空 */
          h('section', { className: 'dwd-card' },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' } },
              h('h3', { className: 'dwd-label', style: { margin: 0 } },
                `${t('history.title')} · ${t('history.count', { count: String(history.length) })}`),
              h('div', { className: 'dwd-actions' },
                h('button', {
                  className: 'dwd-btn dwd-btn--primary',
                  disabled: exporting || history.length === 0,
                  onClick: exportMarkdown,
                }, exporting ? t('phase.grading') : t('history.export')),
                h('button', {
                  className: 'dwd-btn',
                  disabled: history.length === 0,
                  onClick: () => { void clearHistory(); },
                }, t('history.clear')),
              ),
            ),
            historyView,
          ),

          error ? h('div', { className: 'dwd-error' }, error) : null,

          h('p', { className: 'dwd-hint' }, t('hint.local')),
          h('p', { className: 'dwd-hint' }, t('hint.loop')),
        ),
      );
    }

    const inject = ['connection', 'slots', 'locale'];

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }));
      ctx.effect(() => {
        const tag = document.createElement('style');
        tag.dataset.dshPlugin = PACKAGE;
        tag.textContent = CSS;
        document.head.appendChild(tag);
        return () => tag.remove();
      });

      const translate = ctx.locale.bind(NS);
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: NS,
        order: 22,
        label: () => translate('panel.title'),
      }, PenIcon));
      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: NS,
        locale: NS,
      }, Panel));
    }

    exports.inject = inject;
    exports.apply = apply;
    exports.__markdown = renderMarkdown;
    return module.exports;
  },
});
