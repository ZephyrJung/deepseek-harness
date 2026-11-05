window.__ModuleLoader__.load({
  id: '@local/dsh-speech-notes',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
    const React = require('react');
    const h = React.createElement;

    const PACKAGE = '@local/dsh-speech-notes';
    const NS = 'speech-notes';
    const API = '/api/speech-notes';

    const zh = {
      'panel.kicker': '本机语音速记',
      'panel.title': '语音速记',
      'panel.subtitle': '由本机 v2t 边录边转写，录音结束后可用本机 Ollama 模型生成总结。音频与文字都只在这台电脑上处理。',
      'pill.local': '本机处理',
      'pill.live': 'v2t live',
      'pill.unlimited': '不限时',
      'status.checking': '正在检查本机 v2t…',
      'status.ready': '本机 v2t 已就绪',
      'status.missing': '未找到本机 v2t',
      'status.offline': '本机服务未连接',
      'status.summary': '总结模型 {model}',
      'status.summaryReady': '总结模型 {model} 已就绪',
      'status.transcribing': '转写中',
      'source.label': '声音来源',
      'source.mic': '麦克风',
      'source.system': '系统声音',
      'source.both': '麦克风 + 系统声音',
      'source.micHint': '只录麦克风，适合口述笔记。首次录音时 macOS 可能请求麦克风权限。',
      'source.systemHint': '只录电脑正在播放的声音；v2t 会使用系统音频捕获，首次使用可能请求屏幕/音频录制权限。',
      'source.bothHint': '同时录麦克风和系统声音，适合会议或网课；两路会混成一条单声道。',
      'language.label': '识别语言',
      'language.auto': '自动识别',
      'language.zh': '中文',
      'language.en': '英语',
      'language.yue': '粤语',
      'language.ja': '日语',
      'language.ko': '韩语',
      'caption.idle': '点击开始录音，v2t 会边录边转写。',
      'caption.starting': '正在启动本机录音…',
      'caption.recording': '正在录音，v2t 每 {seconds} 秒输出一段转写。',
      'caption.stopping': '正在结束录音并读取转换结果…',
      'caption.done': '录音已结束，转写结果已读取。',
      'caption.failed': '录音异常结束。',
      'action.record': '开始录音',
      'action.starting': '正在启动',
      'action.stop': '停止并读取结果',
      'action.copy': '复制转写',
      'action.copied': '已复制',
      'action.export': '导出笔记',
      'action.clear': '清空面板',
      'action.summarize': '生成总结',
      'action.summarizing': '总结中…',
      'action.regenerate': '重新总结',
      'action.cancelSummary': '取消总结',
      'transcript.title': '转写文字',
      'transcript.placeholder': '开始录音后，v2t 识别出的文字会自动显示在这里。',
      'transcript.listening': '正在聆听，第一段转写稍后出现…',
      'summary.title': '总结概述',
      'summary.placeholder': '录音结束后，点击“生成总结”，由本机 Ollama 模型整理要点、结论和待办。',
      'summary.phase.starting': '正在准备本地模型…',
      'summary.phase.extract': '正在整理长文本（第 {index}/{total} 部分）…',
      'summary.phase.final': '正在合并各部分要点…',
      'summary.model': '本地模型：{model}',
      'summary.truncated': '转写较长，总结只覆盖了前面的部分。',
      'summary.copy': '复制总结',
      'stats.chars': '共 {count} 字',
      'stats.duration': '录音 {duration}',
      'stats.summaryTime': '总结耗时 {seconds} 秒',
      'setup.title': '需要先准备本机 v2t',
      'setup.body': '没有找到可执行的 v2t（{path}）。请确认该文件存在并有执行权限；也可以在 profile 的 cordis.patch.yml 中把 speech-notes 的 config.binary 指向其他路径。',
      'setup.note': 'v2t 是本机录音与转写工具；总结默认使用本机 Ollama（{url}）的 {model} 模型。',
      'error.service': '无法连接本机语音服务。请确认 speech-notes 插件已启用，然后重新加载页面。',
      'error.start': '无法开始录音：{message}',
      'error.stop': '停止录音失败：{message}',
      'error.state': '读取录音状态失败：{message}',
      'error.summary': '生成总结失败：{message}',
      'error.copy': '复制失败，请手动选择文字。',
      'error.empty': '这段录音还没有转写文字。',
      'error.summaryUnavailable': '本地总结模型不可用：{message}',
      'error.v2tMissing': '未找到可执行的 v2t：{path}',
      'error.cancelled': '总结已取消。',
      'hint.local': '所有音频与转写文字只交给本机 v2t 与 Ollama，不会上传到云端。',
      'hint.live': 'v2t -live 会边录边切片转写，识别慢只会延迟，不会丢音频。',
      'hint.sources': '系统声音捕获依赖 macOS 权限；如果失败，可改用麦克风，或用 BlackHole 等虚拟声卡把系统输出接到麦克风输入。',
      'history.title': '最近速记',
      'history.empty': '还没有速记记录。',
      'history.summary': '已有总结',
      'history.loading': '正在读取…',
      'history.expand': '展开全部 {count} 条',
      'history.collapse': '收起',
    };

    const en = {
      'panel.kicker': 'On-device speech',
      'panel.title': 'Speech Notes',
      'panel.subtitle': 'Record and transcribe with the machine-local v2t tool, then summarize with a local Ollama model. Audio and text stay on this computer.',
      'pill.local': 'On-device',
      'pill.live': 'v2t live',
      'pill.unlimited': 'No time limit',
      'status.checking': 'Checking the local v2t tool…',
      'status.ready': 'Local v2t is ready',
      'status.missing': 'Local v2t was not found',
      'status.offline': 'Local service is not connected',
      'status.summary': 'Summary model {model}',
      'status.summaryReady': 'Summary model {model} is ready',
      'status.transcribing': 'Transcribing',
      'source.label': 'Audio source',
      'source.mic': 'Microphone',
      'source.system': 'System audio',
      'source.both': 'Microphone + system audio',
      'source.micHint': 'Records the microphone only. macOS may ask for microphone permission on the first recording.',
      'source.systemHint': 'Records only what the computer plays. v2t uses system audio capture and may ask for screen/audio recording permission.',
      'source.bothHint': 'Records microphone and system audio together as one mono track, useful for meetings or classes.',
      'language.label': 'Language',
      'language.auto': 'Detect automatically',
      'language.zh': 'Chinese',
      'language.en': 'English',
      'language.yue': 'Cantonese',
      'language.ja': 'Japanese',
      'language.ko': 'Korean',
      'caption.idle': 'Press record; v2t transcribes while you speak.',
      'caption.starting': 'Starting the local recorder…',
      'caption.recording': 'Recording. v2t writes a new transcript part every {seconds} seconds.',
      'caption.stopping': 'Stopping and reading the transcription…',
      'caption.done': 'Recording stopped and the transcript was read.',
      'caption.failed': 'Recording ended unexpectedly.',
      'action.record': 'Start recording',
      'action.starting': 'Starting',
      'action.stop': 'Stop and read result',
      'action.copy': 'Copy transcript',
      'action.copied': 'Copied',
      'action.export': 'Export note',
      'action.clear': 'Clear panel',
      'action.summarize': 'Summarize',
      'action.summarizing': 'Summarizing…',
      'action.regenerate': 'Summarize again',
      'action.cancelSummary': 'Cancel summary',
      'transcript.title': 'Transcript',
      'transcript.placeholder': 'Recognized text appears here as soon as recording starts.',
      'transcript.listening': 'Listening. The first transcript part will appear shortly.',
      'summary.title': 'Summary',
      'summary.placeholder': 'After recording, press “Summarize” to let the local Ollama model extract key points, conclusions and next steps.',
      'summary.phase.starting': 'Preparing the local model…',
      'summary.phase.extract': 'Summarizing long text (part {index}/{total})…',
      'summary.phase.final': 'Merging the partial summaries…',
      'summary.model': 'Local model: {model}',
      'summary.truncated': 'The transcript was long; only the first parts were summarized.',
      'summary.copy': 'Copy summary',
      'stats.chars': '{count} characters',
      'stats.duration': 'Recorded {duration}',
      'stats.summaryTime': 'Summarized in {seconds}s',
      'setup.title': 'Prepare the local v2t tool',
      'setup.body': 'No executable v2t was found at {path}. Make sure it exists and is executable, or point config.binary for speech-notes at another path in the profile cordis.patch.yml.',
      'setup.note': 'v2t records and transcribes locally. Summaries use the local Ollama model {model} at {url}.',
      'error.service': 'Cannot reach the local speech service. Make sure the speech-notes plugin is enabled, then reload the page.',
      'error.start': 'Could not start recording: {message}',
      'error.stop': 'Could not stop recording: {message}',
      'error.state': 'Could not read the recording state: {message}',
      'error.summary': 'Could not generate the summary: {message}',
      'error.copy': 'Copy failed. Select the text manually.',
      'error.empty': 'This recording has no transcript yet.',
      'error.summaryUnavailable': 'The local summary model is unavailable: {message}',
      'error.v2tMissing': 'No executable v2t was found at {path}',
      'error.cancelled': 'Summary cancelled.',
      'hint.local': 'Audio and transcripts go only to the local v2t tool and Ollama; nothing is uploaded.',
      'hint.live': 'v2t -live transcribes rolling slices while recording; slow recognition delays text but does not lose audio.',
      'hint.sources': 'System audio capture depends on macOS permissions. If it fails, use the microphone or route output through a virtual device such as BlackHole.',
      'history.title': 'Recent notes',
      'history.empty': 'No speech notes yet.',
      'history.summary': 'Has summary',
      'history.loading': 'Loading…',
      'history.expand': 'Show all {count}',
      'history.collapse': 'Collapse',
    };

    const CSS = [
      '.dsn-root{min-height:100%;height:100%;overflow:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);}',
      '.dsn-wrap{width:100%;max-width:820px;margin:0 auto;padding:34px 40px 64px;box-sizing:border-box;}',
      '.dsn-kicker{margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);}',
      '.dsn-title{margin:0;font-size:23px;line-height:1.25;font-weight:600;letter-spacing:-.015em;}',
      '.dsn-sub{margin:9px 0 0;font-size:13px;line-height:1.65;color:var(--dsw-alias-label-secondary);}',
      '.dsn-status{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:18px;font-size:12px;color:var(--dsw-alias-label-secondary);}',
      '.dsn-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);}',
      '.dsn-dot--ok{background:var(--dsw-alias-state-success-primary);}',
      '.dsn-dot--busy{background:var(--dsw-alias-state-warn-primary);}',
      '.dsn-dot--bad{background:var(--dsw-alias-state-error-primary);}',
      '.dsn-pill{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:2px 9px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}',
      '.dsn-pill--live{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);}',
      '.dsn-card{margin-top:22px;display:flex;flex-direction:column;gap:16px;padding:22px;border:1px solid var(--dsw-alias-border-l1);border-radius:16px;background:var(--dsw-alias-bg-layer-1);}',
      '.dsn-rec-row{display:flex;align-items:center;gap:18px;min-width:0;}',
      '.dsn-record{flex:none;display:grid;place-items:center;width:64px;height:64px;padding:0;border:none;border-radius:50%;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-base);cursor:pointer;transition:transform .12s ease,opacity .12s ease;}',
      '.dsn-record:hover:not(:disabled){transform:scale(1.03);}',
      '.dsn-record:disabled{opacity:.4;cursor:not-allowed;}',
      '.dsn-record--stop{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary);border:1px solid var(--dsw-alias-border-l2);}',
      '.dsn-meta{flex:1;min-width:0;}',
      '.dsn-timer{font-size:30px;line-height:1;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums;}',
      '.dsn-caption{margin-top:6px;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);}',
      '.dsn-wave{display:block;width:100%;height:42px;margin-top:4px;color:var(--dsw-alias-label-secondary);}',
      '.dsn-wave line{transform-box:fill-box;transform-origin:center;opacity:.35;}',
      '.dsn-wave--live line{animation:dsn-breathe 1.05s ease-in-out infinite alternate;opacity:.9;color:var(--dsw-alias-state-error-primary);}',
      '@keyframes dsn-breathe{from{transform:scaleY(.35);}to{transform:scaleY(1.8);}}',
      '.dsn-controls{display:flex;flex-wrap:wrap;gap:12px 22px;align-items:center;}',
      '.dsn-field{display:flex;align-items:center;gap:9px;font-size:12px;color:var(--dsw-alias-label-secondary);}',
      '.dsn-select{max-width:250px;padding:6px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;}',
      '.dsn-select:disabled{opacity:.5;cursor:not-allowed;}',
      '.dsn-source-note{margin:0;font-size:11px;line-height:1.55;color:var(--dsw-alias-label-secondary);}',
      '.dsn-actions{display:flex;flex-wrap:wrap;gap:8px;}',
      '.dsn-btn{appearance:none;padding:7px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer;}',
      '.dsn-btn:hover:not(:disabled){border-color:var(--dsw-alias-border-l2);}',
      '.dsn-btn:disabled{opacity:.45;cursor:not-allowed;}',
      '.dsn-btn--ghost{background:transparent;}',
      '.dsn-btn--primary{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);}',
      '.dsn-transcript-head{display:flex;align-items:center;justify-content:space-between;gap:12px;}',
      '.dsn-label{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);}',
      '.dsn-transcript{min-height:164px;max-height:44vh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font-size:14.5px;line-height:1.8;color:var(--dsw-alias-label-primary);}',
      '.dsn-placeholder{font-size:13px;line-height:1.7;color:var(--dsw-alias-label-secondary);}',
      '.dsn-stats{display:flex;flex-wrap:wrap;gap:14px;font-size:11.5px;color:var(--dsw-alias-label-secondary);}',
      '.dsn-summary{min-height:72px;overflow-wrap:anywhere;font-size:13.5px;line-height:1.75;color:var(--dsw-alias-label-primary);}',
      '.dsn-markdown{white-space:normal;}',
      '.dsn-md-p{margin:0 0 10px;white-space:pre-wrap;}',
      '.dsn-md-p:last-child{margin-bottom:0;}',
      '.dsn-md-h{margin:16px 0 8px;font-weight:600;line-height:1.4;white-space:normal;}',
      '.dsn-md-h:first-child{margin-top:0;}',
      '.dsn-md-h1{font-size:18px;}',
      '.dsn-md-h2{font-size:16.5px;}',
      '.dsn-md-h3{font-size:15px;}',
      '.dsn-md-h4,.dsn-md-h5,.dsn-md-h6{font-size:14px;}',
      '.dsn-md-list{margin:0 0 10px;padding-left:22px;white-space:normal;}',
      '.dsn-md-list li{margin:3px 0;}',
      '.dsn-md-list li::marker{color:var(--dsw-alias-label-secondary);}',
      '.dsn-md-hr{margin:14px 0;border:none;border-top:1px solid var(--dsw-alias-border-l1);}',
      '.dsn-md-quote{margin:0 0 10px;padding-left:12px;border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:pre-wrap;}',
      '.dsn-md-code{padding:1px 5px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;}',
      '.dsn-summary-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;}',
      '.dsn-summary-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}',
      '.dsn-streaming{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--dsw-alias-label-secondary);}',
      '.dsn-error{margin-top:14px;padding:10px 12px;border:1px solid var(--dsw-alias-state-error-primary);border-radius:10px;font-size:12.5px;line-height:1.55;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;}',
      '.dsn-warn{margin-top:14px;padding:10px 12px;border:1px solid var(--dsw-alias-state-warn-primary);border-radius:10px;font-size:12px;line-height:1.55;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
      '.dsn-hint{margin:14px 0 0;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);}',
      '.dsn-hint + .dsn-hint{margin-top:6px;}',
      '.dsn-history{display:flex;flex-direction:column;gap:2px;max-height:340px;overflow:auto;}',
      '.dsn-history-tools{display:flex;align-items:center;gap:10px;}',
      '.dsn-history-item{display:flex;align-items:flex-start;gap:12px;width:100%;padding:10px 8px;border:none;border-radius:10px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;}',
      '.dsn-history-item:hover{background:var(--dsw-alias-bg-layer-2);}',
      '.dsn-history-item--active{background:var(--dsw-alias-bg-layer-2);}',
      '.dsn-history-item:disabled{opacity:.55;cursor:not-allowed;}',
      '.dsn-history-time{flex:none;width:112px;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;}',
      '.dsn-history-body{flex:1;min-width:0;}',
      '.dsn-history-preview{font-size:12.5px;line-height:1.55;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.dsn-history-meta{margin-top:3px;display:flex;gap:10px;font-size:11px;color:var(--dsw-alias-label-secondary);}',
      '@media (max-width:640px){.dsn-wrap{padding:22px 18px 48px;}.dsn-card{padding:16px;}.dsn-rec-row{gap:14px;}.dsn-timer{font-size:26px;}.dsn-history-time{width:88px;}}',
      '@media (prefers-reduced-motion: reduce){.dsn-record{transition:none;}.dsn-record:hover:not(:disabled){transform:none;}.dsn-wave--live line{animation:none;transform:scaleY(1.8);}}',
    ].join('\n');

    function formatClock(seconds) {
      const total = Math.max(0, Math.floor(Number(seconds) || 0));
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const rest = String(total % 60).padStart(2, '0');
      if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${rest}`;
      return `${String(minutes).padStart(2, '0')}:${rest}`;
    }

    function formatDuration(ms) {
      const total = Math.max(0, Math.round(Number(ms) / 1000));
      return formatClock(total);
    }

    function formatDateTime(ms) {
      const date = new Date(Number(ms) || Date.now());
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleString(undefined, {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    function formatBytes(ms) {
      const total = Math.max(0, Math.round(Number(ms) / 1000));
      return total < 60 ? `${total}s` : formatClock(total);
    }

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

    async function postJson(path, body) {
      const response = await fetch(`${API}${path}`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      return readJson(response);
    }

    function MicIcon({ size = 26 }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        'aria-hidden': true, style: { display: 'block' },
      },
        h('rect', { x: 9, y: 2.6, width: 6, height: 11.2, rx: 3, stroke: 'currentColor', strokeWidth: 1.7 }),
        h('path', { d: 'M5.6 11.4a6.4 6.4 0 0 0 12.8 0', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }),
        h('path', { d: 'M12 17.8v3', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }),
      );
    }

    function StopIcon({ size = 22 }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        'aria-hidden': true, style: { display: 'block' },
      },
        h('rect', { x: 6.5, y: 6.5, width: 11, height: 11, rx: 2.2, fill: 'currentColor' }),
      );
    }

    function SidebarIcon({ size = 20, active }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        'aria-hidden': true,
        style: { display: 'block', opacity: active ? 1 : 0.78 },
      },
        h('rect', { x: 9, y: 2.8, width: 6, height: 10.6, rx: 3, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('path', { d: 'M5.9 11.1a6.1 6.1 0 0 0 12.2 0', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        h('path', { d: 'M12 17.2v3.1', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        h('path', { d: 'M9.2 20.6h5.6', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
      );
    }

    function Waveform({ active, label }) {
      return h('svg', {
        className: `dsn-wave${active ? ' dsn-wave--live' : ''}`,
        viewBox: '0 0 640 42',
        preserveAspectRatio: 'none',
        role: 'img',
        'aria-label': label,
      }, Array.from({ length: 64 }, (_, index) => h('line', {
        key: index,
        x1: index * 10 + 5,
        x2: index * 10 + 5,
        y1: 10,
        y2: 32,
        stroke: 'currentColor',
        strokeWidth: 3,
        strokeLinecap: 'round',
        style: active ? { animationDelay: `${(index % 11) * 0.075}s` } : undefined,
      })));
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
          nodes.push(h('code', { key: `c${index}`, className: 'dsn-md-code' }, token.slice(1, -1)));
        } else {
          nodes.push(h('em', { key: `i${index}` }, token.slice(1, -1)));
        }
        index += 1;
        last = match.index + token.length;
      }
      if (last < text.length) nodes.push(text.slice(last));
      return nodes.length > 0 ? nodes : [text];
    }

    /*
     * The local model writes Markdown. Rendering it as pre-wrap text leaves
     * `##` and `-` visible, so parse the small subset the summary prompt asks
     * for. Everything becomes React elements; no HTML string is injected.
     */
    function renderMarkdown(text) {
      const lines = String(text).replace(/\r\n?/gu, '\n').split('\n');
      const blocks = [];
      let paragraph = [];
      let list = null;
      let quote = null;
      let key = 0;
      const flushParagraph = () => {
        if (paragraph.length === 0) return;
        blocks.push(h('p', { key: `p${key}`, className: 'dsn-md-p' }, renderInline(paragraph.join('\n'))));
        key += 1;
        paragraph = [];
      };
      const flushList = () => {
        if (list === null) return;
        const tag = list.ordered ? 'ol' : 'ul';
        blocks.push(h(tag, { key: `l${key}`, className: 'dsn-md-list' },
          list.items.map((item, index) => h('li', { key: index }, renderInline(item)))));
        key += 1;
        list = null;
      };
      const flushQuote = () => {
        if (quote === null) return;
        blocks.push(h('div', { key: `q${key}`, className: 'dsn-md-quote' }, renderInline(quote.join('\n'))));
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
            className: `dsn-md-h dsn-md-h${level}`,
          }, renderInline(heading[2])));
          key += 1;
          continue;
        }
        if (/^-{3,}\s*$/u.test(line)) {
          flushAll();
          blocks.push(h('hr', { key: `hr${key}`, className: 'dsn-md-hr' }));
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
      const [phase, setPhase] = React.useState('idle');
      const [session, setSession] = React.useState(null);
      const [sessionId, setSessionId] = React.useState('');
      const [transcript, setTranscript] = React.useState('');
      const [summary, setSummary] = React.useState('');
      const [summaryModel, setSummaryModel] = React.useState('');
      const [summarizing, setSummarizing] = React.useState(false);
      const [summaryPhase, setSummaryPhase] = React.useState('');
      const [summaryStats, setSummaryStats] = React.useState(null);
      const [error, setError] = React.useState('');
      const [warning, setWarning] = React.useState('');
      const [now, setNow] = React.useState(Date.now());
      const [history, setHistory] = React.useState([]);
      const [historyLoading, setHistoryLoading] = React.useState(false);
      const [historyExpanded, setHistoryExpanded] = React.useState(false);
      const historyLimit = 5;
      const [source, setSource] = React.useState(() => {
        try {
          const stored = localStorage.getItem('dsh.speech-notes.source');
          return stored === 'system' || stored === 'both' ? stored : 'mic';
        } catch (_) {
          return 'mic';
        }
      });
      const [language, setLanguage] = React.useState(() => {
        try {
          return localStorage.getItem('dsh.speech-notes.language') || 'zh';
        } catch (_) {
          return 'zh';
        }
      });
      const [copied, setCopied] = React.useState('');

      const sessionIdRef = React.useRef('');
      const summaryAbortRef = React.useRef(null);
      const copyTimerRef = React.useRef(0);
      const mountedRef = React.useRef(true);

      sessionIdRef.current = sessionId;

      const applySession = React.useCallback((value) => {
        if (!value) return;
        setSession(value);
        setSessionId(value.id || '');
        setTranscript(value.transcript || '');
        setSummary(typeof value.summary === 'string' ? value.summary : '');
        setSummaryModel(value.summaryModel || '');
        if (value.phase === 'starting' || value.phase === 'recording' || value.phase === 'stopping') {
          setPhase(value.phase);
        } else if (value.phase === 'failed') {
          setPhase('failed');
        } else {
          setPhase('done');
        }
        if (value.error) setError(value.error);
        else setError('');
        setWarning(value.warning || '');
      }, []);

      const refreshHealth = React.useCallback(async () => {
        try {
          const result = await getJson('/health');
          if (!mountedRef.current) return;
          setHealth(result);
          setHealthError('');
        } catch (failure) {
          if (!mountedRef.current) return;
          setHealthError(failure && failure.message ? failure.message : String(failure));
        }
      }, []);

      const refreshHistory = React.useCallback(async () => {
        try {
          setHistoryLoading(true);
          const result = await getJson('/history');
          if (!mountedRef.current) return;
          setHistory(Array.isArray(result.sessions)
            ? result.sessions.filter((row) => row && Number(row.chars) > 0)
            : []);
        } catch (_) {
          if (!mountedRef.current) return;
          setHistory([]);
        } finally {
          if (mountedRef.current) setHistoryLoading(false);
        }
      }, []);

      const loadSession = React.useCallback(async (id) => {
        try {
          setError('');
          const result = await getJson(`/state?session=${encodeURIComponent(id)}`);
          if (!mountedRef.current) return;
          if (result.session) applySession(result.session);
        } catch (failure) {
          if (!mountedRef.current) return;
          setError(t('error.state', { message: failure && failure.message ? failure.message : String(failure) }));
        }
      }, [applySession, t]);

      React.useEffect(() => {
        mountedRef.current = true;
        void refreshHealth();
        void refreshHistory();
        let cancelled = false;
        (async () => {
          try {
            const result = await getJson('/state');
            if (cancelled || !mountedRef.current) return;
            if (result.session) applySession(result.session);
          } catch (_) {
            /* an empty state means no recording yet */
          }
        })();
        const timer = setInterval(() => {
          if (!mountedRef.current) return;
          void refreshHealth();
        }, 15000);
        return () => {
          cancelled = true;
          mountedRef.current = false;
          clearInterval(timer);
        };
      }, [applySession, refreshHealth, refreshHistory]);

      React.useEffect(() => {
        if (phase !== 'recording' && phase !== 'starting') return undefined;
        const timer = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(timer);
      }, [phase]);

      React.useEffect(() => {
        if (phase !== 'recording' && phase !== 'starting' && phase !== 'stopping') return undefined;
        let cancelled = false;
        let timer = 0;
        const tick = async () => {
          if (cancelled || !mountedRef.current) return;
          const id = sessionIdRef.current;
          try {
            const result = await getJson(id ? `/state?session=${encodeURIComponent(id)}` : '/state');
            if (cancelled || !mountedRef.current) return;
            if (result.session) {
              applySession(result.session);
              if (result.session.phase === 'done' || result.session.phase === 'failed') {
                void refreshHistory();
                return;
              }
            }
          } catch (failure) {
            if (!cancelled && mountedRef.current) {
              setError(t('error.state', { message: failure && failure.message ? failure.message : String(failure) }));
            }
          }
          if (!cancelled) timer = setTimeout(tick, 1000);
        };
        timer = setTimeout(tick, 900);
        return () => {
          cancelled = true;
          clearTimeout(timer);
        };
      }, [phase, applySession, refreshHistory, t]);

      React.useEffect(() => () => {
        mountedRef.current = false;
        summaryAbortRef.current?.abort();
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      }, []);

      const startRecording = React.useCallback(async () => {
        if (phase === 'recording' || phase === 'starting' || phase === 'stopping') return;
        setPhase('starting');
        setError('');
        setWarning('');
        setTranscript('');
        setSummary('');
        setSummaryModel('');
        setSummaryStats(null);
        setSession(null);
        setSessionId('');
        try {
          const result = await postJson('/start', { source, language });
          if (!mountedRef.current) return;
          applySession(result.session);
          void refreshHistory();
        } catch (failure) {
          if (!mountedRef.current) return;
          setPhase('idle');
          setError(t('error.start', { message: failure && failure.message ? failure.message : String(failure) }));
          void refreshHealth();
        }
      }, [phase, source, language, applySession, refreshHistory, refreshHealth, t]);

      const stopRecording = React.useCallback(async () => {
        if (phase !== 'recording' && phase !== 'starting') return;
        const id = sessionIdRef.current;
        setPhase('stopping');
        setError('');
        try {
          const result = await postJson('/stop', id ? { sessionId: id } : {});
          if (!mountedRef.current) return;
          applySession(result.session);
          setPhase(result.session && result.session.phase === 'failed' ? 'failed' : 'done');
          void refreshHistory();
        } catch (failure) {
          if (!mountedRef.current) return;
          setPhase('recording');
          setError(t('error.stop', { message: failure && failure.message ? failure.message : String(failure) }));
        }
      }, [phase, applySession, refreshHistory, t]);

      const summarize = React.useCallback(async () => {
        if (!sessionId || summarizing) return;
        if (!transcript) {
          setError(t('error.empty'));
          return;
        }
        const controller = new AbortController();
        summaryAbortRef.current = controller;
        setSummarizing(true);
        setSummary('');
        setSummaryModel('');
        setSummaryStats(null);
        setSummaryPhase(t('summary.phase.starting'));
        setError('');
        try {
          const response = await fetch(`${API}/summarize`, {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId }),
            signal: controller.signal,
          });
          if (!response.ok) {
            let message = `HTTP ${response.status}`;
            try {
              const payload = await response.json();
              if (payload && payload.error && payload.error.message) message = payload.error.message;
            } catch (_) {
              /* keep the status text */
            }
            throw new Error(message);
          }
          if (!response.body) throw new Error('本地总结服务没有返回内容');
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          const handle = (line) => {
            const trimmed = line.trim();
            if (trimmed === '') return;
            let event;
            try {
              event = JSON.parse(trimmed);
            } catch (_) {
              return;
            }
            if (!event || typeof event.type !== 'string') return;
            if (event.type === 'start') {
              setSummaryModel(event.model || '');
              setSummaryPhase(t('summary.phase.starting'));
            } else if (event.type === 'progress') {
              if (event.phase === 'extract') {
                setSummaryPhase(t('summary.phase.extract', {
                  index: String(event.index || 1),
                  total: String(event.total || 1),
                }));
              } else if (event.phase === 'final') {
                setSummaryPhase(t('summary.phase.final'));
              }
            } else if (event.type === 'chunk') {
              if (event.text) {
                setSummaryPhase('');
                setSummary((previous) => previous + event.text);
              }
            } else if (event.type === 'done') {
              setSummary(event.summary || '');
              setSummaryModel(event.model || '');
              setSummaryStats({ elapsedMs: event.elapsedMs || 0, truncated: Boolean(event.truncated) });
              setSummaryPhase('');
            } else if (event.type === 'error') {
              setError(t('error.summary', { message: event.message || 'unknown' }));
            } else if (event.type === 'cancelled') {
              setSummaryPhase('');
            }
          };
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let newline = buffer.indexOf('\n');
            while (newline !== -1) {
              handle(buffer.slice(0, newline));
              buffer = buffer.slice(newline + 1);
              newline = buffer.indexOf('\n');
            }
          }
          buffer += decoder.decode();
          handle(buffer);
        } catch (failure) {
          if (!mountedRef.current) return;
          if (!(failure && failure.name === 'AbortError')) {
            setError(t('error.summary', { message: failure && failure.message ? failure.message : String(failure) }));
          }
        } finally {
          if (mountedRef.current) {
            setSummarizing(false);
            setSummaryPhase('');
            void refreshHistory();
          }
          if (summaryAbortRef.current === controller) summaryAbortRef.current = null;
        }
      }, [sessionId, transcript, summarizing, refreshHistory, t]);

      const cancelSummary = React.useCallback(() => {
        summaryAbortRef.current?.abort();
        summaryAbortRef.current = null;
        setSummarizing(false);
        setSummaryPhase('');
        setError(t('error.cancelled'));
      }, [t]);

      const copy = React.useCallback(async (kind) => {
        const text = kind === 'summary' ? summary : transcript;
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
          setCopied(kind);
          if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
          copyTimerRef.current = setTimeout(() => setCopied(''), 1600);
        } catch (_) {
          setError(t('error.copy'));
        }
      }, [summary, transcript, t]);

      const exportNote = React.useCallback(() => {
        if (!transcript) return;
        const createdAt = session && session.createdAt ? session.createdAt : Date.now();
        const date = new Date(createdAt);
        const pad = (value) => String(value).padStart(2, '0');
        const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
        const lines = [
          `语音速记 · ${date.toLocaleString()}`,
          '',
          '## 转写文字',
          '',
          transcript,
        ];
        if (summary) lines.push('', '## 总结概述', '', summary);
        lines.push('');
        const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `speech-notes-${stamp}.md`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, [transcript, summary, session]);

      const clearPanel = React.useCallback(() => {
        if (phase === 'recording' || phase === 'starting' || phase === 'stopping') return;
        setSession(null);
        setSessionId('');
        setTranscript('');
        setSummary('');
        setSummaryModel('');
        setSummaryStats(null);
        setSummaryPhase('');
        setError('');
        setWarning('');
        setPhase('idle');
      }, [phase]);

      const selectSource = React.useCallback((value) => {
        setSource(value);
        try { localStorage.setItem('dsh.speech-notes.source', value); } catch (_) { /* optional */ }
      }, []);

      const selectLanguage = React.useCallback((value) => {
        setLanguage(value);
        try { localStorage.setItem('dsh.speech-notes.language', value); } catch (_) { /* optional */ }
      }, []);

      const v2tAvailable = Boolean(health && health.v2t && health.v2t.available);
      const summaryAvailable = Boolean(health && health.summary && health.summary.available);
      const summaryError = health && health.summary ? health.summary.error : '';
      const modelName = health && health.summary ? health.summary.model : '';
      const chunkSeconds = health && health.v2t && Number.isFinite(health.v2t.chunkSeconds)
        ? health.v2t.chunkSeconds
        : 12;
      const v2tPath = health && health.v2t ? health.v2t.path : '';

      let statusTone = 'idle';
      let statusText = t('status.checking');
      if (healthError) {
        statusTone = 'bad';
        statusText = t('status.offline');
      } else if (v2tAvailable) {
        statusTone = 'ok';
        statusText = t('status.ready');
      } else if (health) {
        statusTone = 'bad';
        statusText = t('status.missing');
      }

      const elapsedSeconds = phase === 'recording' || phase === 'starting'
        ? Math.max(0, (now - (session && session.createdAt ? session.createdAt : Date.now())) / 1000)
        : session && Number.isFinite(session.elapsedMs) ? session.elapsedMs / 1000 : 0;

      let caption = t('caption.idle');
      if (phase === 'starting') caption = t('caption.starting');
      else if (phase === 'recording') caption = t('caption.recording', { seconds: String(chunkSeconds) });
      else if (phase === 'stopping') caption = t('caption.stopping');
      else if (phase === 'done') caption = t('caption.done');
      else if (phase === 'failed') caption = t('caption.failed');

      const active = phase === 'recording' || phase === 'starting' || phase === 'stopping';
      const canSummarize = Boolean(transcript) && !summarizing && summaryAvailable && !active;
      const sourceHint = source === 'system' ? t('source.systemHint')
        : source === 'both' ? t('source.bothHint') : t('source.micHint');

      const linkText = healthError ? t('error.service') : '';

      return h('div', { className: 'dsn-root' },
        h('div', { className: 'dsn-wrap' },
          h('header', null,
            h('p', { className: 'dsn-kicker' }, t('panel.kicker')),
            h('h1', { className: 'dsn-title' }, t('panel.title')),
            h('p', { className: 'dsn-sub' }, t('panel.subtitle')),
            h('div', { className: 'dsn-status' },
              h('span', { className: `dsn-dot dsn-dot--${statusTone}` }),
              h('span', { role: 'status' }, statusText),
              h('span', { className: 'dsn-pill' }, t('pill.local')),
              v2tAvailable ? h('span', { className: 'dsn-pill dsn-pill--live' }, t('pill.live')) : null,
              summaryAvailable ? h('span', { className: 'dsn-pill' }, t('status.summaryReady', { model: modelName })) : null,
            ),
          ),
          linkText ? h('div', { className: 'dsn-error', role: 'alert' }, linkText) : null,
          health && health.summary && !summaryAvailable && !transcript && !summary
            ? h('div', { className: 'dsn-warn', role: 'status' }, t('error.summaryUnavailable', {
              message: summaryError || health.summary.model,
            }))
            : null,
          health && !v2tAvailable ? h('section', { className: 'dsn-card' },
            h('div', null,
              h('span', { className: 'dsn-label' }, t('setup.title')),
              h('p', { className: 'dsn-sub' }, t('setup.body', { path: v2tPath || '/Users/Zephyr/bin/v2t' })),
            ),
            h('p', { className: 'dsn-hint' }, t('setup.note', {
              url: health.summary ? health.summary.baseUrl : '',
              model: health.summary ? health.summary.model : '',
            })),
          ) : null,
          h('section', { className: 'dsn-card' },
            h('div', { className: 'dsn-rec-row' },
              h('button', {
                type: 'button',
                className: `dsn-record${phase === 'recording' ? ' dsn-record--stop' : ''}`,
                disabled: phase === 'starting' || phase === 'stopping'
                  || (phase !== 'recording' && !v2tAvailable),
                'aria-label': phase === 'recording' ? t('action.stop') : t('action.record'),
                title: phase === 'recording' ? t('action.stop') : t('action.record'),
                onClick: () => {
                  if (phase === 'recording') void stopRecording();
                  else void startRecording();
                },
              }, phase === 'recording' ? h(StopIcon) : h(MicIcon)),
              h('div', { className: 'dsn-meta' },
                h('div', { className: 'dsn-timer' }, formatClock(elapsedSeconds)),
                h('div', { className: 'dsn-caption' }, caption),
                h(Waveform, { active: phase === 'recording', label: t('transcript.title') }),
              ),
            ),
            h('div', { className: 'dsn-controls' },
              h('label', { className: 'dsn-field', htmlFor: 'dsn-source' },
                t('source.label'),
                h('select', {
                  id: 'dsn-source',
                  className: 'dsn-select',
                  value: source,
                  disabled: active,
                  onChange: (event) => selectSource(event.target.value),
                },
                  h('option', { value: 'mic' }, t('source.mic')),
                  h('option', { value: 'system' }, t('source.system')),
                  h('option', { value: 'both' }, t('source.both')),
                ),
              ),
              h('label', { className: 'dsn-field', htmlFor: 'dsn-language' },
                t('language.label'),
                h('select', {
                  id: 'dsn-language',
                  className: 'dsn-select',
                  value: language,
                  disabled: active,
                  onChange: (event) => selectLanguage(event.target.value),
                },
                  h('option', { value: 'auto' }, t('language.auto')),
                  h('option', { value: 'zh' }, t('language.zh')),
                  h('option', { value: 'en' }, t('language.en')),
                  h('option', { value: 'yue' }, t('language.yue')),
                  h('option', { value: 'ja' }, t('language.ja')),
                  h('option', { value: 'ko' }, t('language.ko')),
                ),
              ),
            ),
            h('p', { className: 'dsn-source-note' }, sourceHint),
            h('div', { className: 'dsn-actions' },
              h('button', {
                type: 'button', className: 'dsn-btn',
                disabled: !transcript,
                onClick: () => void copy('transcript'),
              }, copied === 'transcript' ? t('action.copied') : t('action.copy')),
              h('button', {
                type: 'button', className: 'dsn-btn',
                disabled: !transcript,
                onClick: exportNote,
              }, t('action.export')),
              h('button', {
                type: 'button', className: 'dsn-btn dsn-btn--ghost',
                disabled: active || (!transcript && !summary && !error),
                onClick: clearPanel,
              }, t('action.clear')),
            ),
          ),
          h('section', { className: 'dsn-card' },
            h('div', { className: 'dsn-transcript-head' },
              h('span', { className: 'dsn-label' }, t('transcript.title')),
              phase === 'recording' ? h('span', { className: 'dsn-pill dsn-pill--live' }, t('status.transcribing')) : null,
            ),
            transcript
              ? h('div', { className: 'dsn-transcript', role: 'textbox', 'aria-readonly': 'true', tabIndex: 0 }, transcript)
              : h('div', { className: 'dsn-transcript' },
                h('span', { className: 'dsn-placeholder' },
                  phase === 'recording' ? t('transcript.listening') : t('transcript.placeholder'))),
            h('div', { className: 'dsn-stats' },
              transcript ? h('span', null, t('stats.chars', { count: String(transcript.length) })) : null,
              session && session.createdAt ? h('span', null, t('stats.duration', { duration: formatDuration(session.elapsedMs || 0) })) : null,
              summaryStats && summaryStats.elapsedMs
                ? h('span', null, t('stats.summaryTime', { seconds: String(Math.round(summaryStats.elapsedMs / 1000)) }))
                : null,
            ),
          ),
          summary || summarizing || summaryPhase || transcript ? h('section', { className: 'dsn-card' },
            h('div', { className: 'dsn-summary-head' },
              h('span', { className: 'dsn-label' }, t('summary.title')),
              h('div', { className: 'dsn-summary-tools' },
                summarizing ? h('span', { className: 'dsn-streaming' },
                  h('span', { className: 'dsn-dot dsn-dot--busy' }),
                  summaryPhase || t('action.summarizing')) : null,
                summarizing
                  ? h('button', { type: 'button', className: 'dsn-btn dsn-btn--ghost', onClick: cancelSummary }, t('action.cancelSummary'))
                  : h('button', {
                    type: 'button',
                    className: 'dsn-btn dsn-btn--primary',
                    disabled: !canSummarize,
                    title: summaryAvailable ? '' : summaryError,
                    onClick: () => void summarize(),
                  }, summary ? t('action.regenerate') : t('action.summarize')),
                summary ? h('button', {
                  type: 'button', className: 'dsn-btn',
                  disabled: summarizing,
                  onClick: () => void copy('summary'),
                }, copied === 'summary' ? t('action.copied') : t('summary.copy')) : null,
              ),
            ),
            summary
              ? h('div', { className: 'dsn-summary dsn-markdown' }, renderMarkdown(summary))
              : h('p', { className: 'dsn-placeholder' },
                summarizing ? (summaryPhase || t('action.summarizing')) : t('summary.placeholder')),
            h('div', { className: 'dsn-stats' },
              summaryModel ? h('span', null, t('summary.model', { model: summaryModel })) : null,
              summaryStats && summaryStats.truncated ? h('span', null, t('summary.truncated')) : null,
            ),
            !summaryAvailable && summaryError
              ? h('div', { className: 'dsn-warn', role: 'status' }, t('error.summaryUnavailable', { message: summaryError }))
              : null,
          ) : null,
          error ? h('div', { className: 'dsn-error', role: 'alert' }, error) : null,
          warning ? h('div', { className: 'dsn-warn', role: 'status' }, warning) : null,
          history.length > 0 ? h('section', { className: 'dsn-card' },
            h('div', { className: 'dsn-transcript-head' },
              h('span', { className: 'dsn-label' }, t('history.title')),
              h('div', { className: 'dsn-history-tools' },
                historyLoading ? h('span', { className: 'dsn-pill' }, t('history.loading')) : null,
                history.length > historyLimit
                  ? h('button', {
                    type: 'button',
                    className: 'dsn-btn dsn-btn--ghost',
                    onClick: () => setHistoryExpanded((previous) => !previous),
                  }, historyExpanded
                    ? t('history.collapse')
                    : t('history.expand', { count: String(history.length) }))
                  : null,
              ),
            ),
            h('div', { className: 'dsn-history' },
              (historyExpanded ? history : history.slice(0, historyLimit)).map((row) => h('button', {
                key: row.id,
                type: 'button',
                className: `dsn-history-item${row.id === sessionId ? ' dsn-history-item--active' : ''}`,
                disabled: active,
                onClick: () => { if (!active) void loadSession(row.id); },
              },
                h('span', { className: 'dsn-history-time' }, formatDateTime(row.createdAt)),
                h('span', { className: 'dsn-history-body' },
                  h('span', { className: 'dsn-history-preview' }, row.preview || t('error.empty')),
                  h('span', { className: 'dsn-history-meta' },
                    h('span', null, formatBytes(row.elapsedMs)),
                    h('span', null, t('stats.chars', { count: String(row.chars || 0) })),
                    row.hasSummary ? h('span', null, t('history.summary')) : null,
                  ),
                ),
              )),
            ),
          ) : null,
          h('p', { className: 'dsn-hint' }, t('hint.local')),
          h('p', { className: 'dsn-hint' }, t('hint.live')),
          h('p', { className: 'dsn-hint' }, t('hint.sources')),
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
        order: 20,
        label: () => translate('panel.title'),
      }, SidebarIcon));
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
