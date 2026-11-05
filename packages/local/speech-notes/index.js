/**
 * Host half of the speech-notes bundle.
 *
 * The browser cannot record system audio or spawn processes, so this half owns
 * the machine-local pipeline:
 *
 *   v2t -live  →  transcript.txt  →  local Ollama model  →  summary
 *
 * Every browser call goes through an authenticated exact Fetch route under
 * `/api/speech-notes/...`, registered on the Connection service.  The routes
 * return plain JSON except `summarize`, which streams newline-delimited JSON so
 * the panel can show the local model's tokens while it writes the summary.
 */
import { spawn } from 'node:child_process';
import { accessSync, constants, existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const ROUTE_PREFIX = '/api/speech-notes';

const ZH_SUMMARY_SYSTEM = [
  '你是一个中文语音速记整理助手。用户会给你一段语音转写的原始文本。',
  '请只依据原文整理，不要编造原文没有的信息，也不要补充常识性内容。',
  '输出要求：',
  '1. 先用一句话概述主题（不超过 60 字），标题写成 “## 一句话概述”。',
  '2. 再用 3-7 条要点列出关键信息，保留人名、数字、时间、结论，标题写成 “## 要点”。',
  '3. 如果原文包含明确的待办、决定或下一步，单独列在 “## 待办与决定” 下；没有就写“无”。',
  '4. 使用简洁的 Markdown，不要输出与总结无关的客套话。',
].join('\n');

const ZH_EXTRACT_SYSTEM = [
  '你是一个语音速记要点提取助手。请从这段转写中提取关键信息，',
  '包括人物、数字、时间、结论、待办和决定。用简洁的条目列出，不要编造。',
].join('\n');

const ZH_MERGE_SYSTEM = [
  '你是一个语音速记整理助手。下面是一段较长录音各部分的要点。',
  '请合并去重，只依据这些要点写出最终整理结果。',
  '输出要求：一句话概述；3-7 条要点；如有明确的待办、决定或下一步则单独列出，否则写“无”。',
  '使用简洁的 Markdown，不要编造。',
].join('\n');

const DEFAULT_SUMMARY_MODEL = 'qwen3.8:27b-mlx';
const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

function asNumber(value, fallback, minimum, maximum) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(number)));
}

function asFloat(value, fallback, minimum, maximum) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

function withoutTrailingSlash(value) {
  return value.replace(/\/+$/u, '');
}

function isExecutable(path) {
  try {
    if (!existsSync(path)) return false;
    accessSync(path, constants.X_OK);
    return true;
  } catch (_) {
    return false;
  }
}

function findBinary(configured) {
  const candidates = [];
  if (configured) candidates.push(configured);
  candidates.push(
    process.env.DSH_V2T_BIN,
    '/Users/Zephyr/bin/v2t',
    join(homedir(), 'bin', 'v2t'),
    '/opt/homebrew/bin/v2t',
    '/usr/local/bin/v2t',
    '/usr/bin/v2t',
  );
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      if (!existsSync(candidate)) continue;
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch (_) {
      /* try the next candidate */
    }
  }
  /* Last resort: honour a v2t found through PATH. */
  for (const directory of String(process.env.PATH ?? '').split(':')) {
    if (!directory) continue;
    const candidate = join(directory, 'v2t');
    try {
      if (!existsSync(candidate)) continue;
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch (_) {
      /* try the next PATH entry */
    }
  }
  return '/Users/Zephyr/bin/v2t';
}

function resolveConfig(raw) {
  const config = isObject(raw) ? raw : {};
  const summary = isObject(config.summary) ? config.summary : {};
  const dataRoot = asString(config.dataDir)
    || join(asString(process.env.DSH_HOME) || join(homedir(), '.dsh'), 'speech-notes');
  return {
    binary: findBinary(asString(config.binary)),
    dataRoot,
    sessionsDir: join(dataRoot, 'sessions'),
    chunkSeconds: asNumber(config.chunkSeconds, 12, 2, 60),
    blankSeconds: asNumber(config.blankSeconds, 3, 0, 120),
    stopTimeoutMs: asNumber(config.stopTimeoutMs, 120000, 5000, 600000),
    saveAudio: config.saveAudio === true,
    summary: {
      baseUrl: withoutTrailingSlash(
        asString(summary.baseUrl, asString(process.env.DSH_OLLAMA_URL, DEFAULT_OLLAMA_URL)),
      ),
      model: asString(summary.model, asString(process.env.DSH_SUMMARY_MODEL, DEFAULT_SUMMARY_MODEL)),
      maxChars: asNumber(summary.maxChars, 12000, 1000, 60000),
      maxChunks: asNumber(summary.maxChunks, 4, 1, 12),
      numCtx: asNumber(summary.numCtx, 16384, 2048, 131072),
      numPredict: asNumber(summary.numPredict, 1400, 128, 8192),
      temperature: asFloat(summary.temperature, 0.2, 0, 2),
      timeoutMs: asNumber(summary.timeoutMs, 600000, 10000, 3600000),
    },
  };
}

function tail(value, limit) {
  const text = String(value);
  return text.length <= limit ? text : text.slice(text.length - limit);
}

function cleanTranscript(text) {
  return String(text)
    .replace(/^\uFEFF/u, '')
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .filter((line) => !/^\s*\[(?:BLANK_AUDIO|BLANK|SILENCE|MUSIC|SOUND|INAUDIBLE|NOISE|空白)\]\s*$/iu.test(line))
    .join('\n')
    .replace(/\uFFFD+$/u, '')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}

function stamp(value = new Date()) {
  const pad = (part) => String(part).padStart(2, '0');
  return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}-`
    + `${pad(value.getHours())}${pad(value.getMinutes())}${pad(value.getSeconds())}`;
}

function sessionDirectoryName() {
  return `${stamp()}-${randomUUID().slice(0, 8)}`;
}

function validateSessionId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9-]{1,80}$/u.test(value) ? value : '';
}

async function readJsonBody(request, limit = 64 * 1024) {
  if (request.body === null) return {};
  const text = await request.text();
  if (text.length > limit) throw new Error('请求内容过大');
  if (text.trim() === '') return {};
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    throw new Error('请求内容不是有效的 JSON');
  }
  return isObject(parsed) ? parsed : {};
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function failure(message, status = 400) {
  return jsonResponse({ ok: false, error: { message } }, status);
}

function splitTranscript(text, maxChars) {
  const chunks = [];
  let current = '';
  const push = () => {
    if (current.trim() !== '') chunks.push(current.trim());
    current = '';
  };
  const parts = String(text).split(/\n{2,}/u);
  for (const part of parts) {
    if (part.length <= maxChars) {
      if (current.length + part.length + 2 > maxChars) push();
      current += (current === '' ? '' : '\n\n') + part;
      continue;
    }
    push();
    const sentences = part.split(/(?<=[。！？!?；;])/u);
    for (const sentence of sentences) {
      if (sentence.length > maxChars) {
        for (let at = 0; at < sentence.length; at += maxChars) {
          chunks.push(sentence.slice(at, at + maxChars));
        }
        continue;
      }
      if (current.length + sentence.length > maxChars) push();
      current += sentence;
    }
  }
  push();
  return chunks;
}

function isAbortError(error) {
  return Boolean(error && (error.name === 'AbortError' || error.code === 'ABORT_ERR'));
}

async function waitForExit(session, timeoutMs) {
  if (!session.child || session.endedAt !== 0) return true;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      session.child?.off('exit', onExit);
      resolve(value);
    };
    const onExit = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    session.child.once('exit', onExit);
    if (session.endedAt !== 0) finish(true);
  });
}

async function callOllama(options) {
  const { config, messages, signal, numPredict, onToken } = options;
  const summary = config.summary;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, summary.timeoutMs);
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  else signal.addEventListener('abort', abort, { once: true });
  const release = () => {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  };
  try {
    let response;
    try {
      response = await fetch(`${summary.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: summary.model,
          messages,
          stream: true,
          think: false,
          options: {
            temperature: summary.temperature,
            num_ctx: summary.numCtx,
            num_predict: numPredict,
          },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) throw new Error(`本地模型超过 ${Math.round(summary.timeoutMs / 1000)} 秒没有响应`);
      if (isAbortError(error) && signal.aborted) throw error;
      throw new Error(`无法连接本地 Ollama（${summary.baseUrl}）：${error && error.message ? error.message : String(error)}`);
    }
    if (!response.ok) {
      const detail = tail(await response.text().catch(() => ''), 400).trim();
      throw new Error(`本地模型返回 HTTP ${String(response.status)}${detail ? `：${detail}` : ''}`);
    }
    if (response.body === null) throw new Error('本地模型没有返回内容');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    let evalCount = 0;
    let doneReason = '';
    const consume = (line) => {
      const trimmed = line.trim();
      if (trimmed === '') return;
      let message;
      try {
        message = JSON.parse(trimmed);
      } catch (_) {
        return;
      }
      if (message && typeof message.error === 'string' && message.error !== '') {
        throw new Error(`本地模型错误：${message.error}`);
      }
      const piece = message && message.message && typeof message.message.content === 'string'
        ? message.message.content
        : '';
      if (piece !== '') {
        text += piece;
        if (onToken) onToken(piece);
      }
      if (message && typeof message.eval_count === 'number') evalCount = message.eval_count;
      if (message && typeof message.done_reason === 'string') doneReason = message.done_reason;
    };
    try {
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
    } finally {
      reader.releaseLock();
    }
    if (text.trim() === '') throw new Error('本地模型没有生成任何总结内容');
    return { text: text.trim(), evalCount, doneReason };
  } catch (error) {
    if (timedOut) throw new Error(`本地模型超过 ${Math.round(summary.timeoutMs / 1000)} 秒没有完成总结`);
    throw error;
  } finally {
    release();
  }
}

/**
 * Mount the speech-notes Host routes.
 * @param ctx - owning Cordis context.
 * @param rawConfig - row config from cordis.patch.yml (all fields optional).
 */
export const inject = ['connection'];

export function apply(ctx, rawConfig) {
  const config = resolveConfig(rawConfig);
  const sessions = new Map();
  let activeId = '';
  let healthCache = { at: 0, value: null };

  ctx.logger?.info?.(`speech-notes: v2t=${config.binary}, data=${config.sessionsDir}`);

  const metaPath = (session) => join(session.directory, 'meta.json');
  const transcriptPath = (session) => join(session.directory, 'transcript.txt');
  const summaryPath = (session) => join(session.directory, 'summary.md');
  const audioPath = (session) => join(session.directory, 'audio.wav');

  async function persistMeta(session) {
    const meta = {
      id: session.id,
      createdAt: session.createdAt,
      endedAt: session.endedAt || 0,
      language: session.language,
      source: session.source,
      phase: session.phase,
      exitCode: session.exitCode,
      error: session.error || '',
      warning: session.warning || '',
      summaryModel: session.summaryModel || '',
      summaryAt: session.summaryAt || 0,
      audioSaved: config.saveAudio,
    };
    await mkdir(session.directory, { recursive: true });
    await writeFile(metaPath(session), `${JSON.stringify(meta, null, 2)}\n`, 'utf8').catch(() => undefined);
  }

  async function readTranscriptOf(session) {
    try {
      return cleanTranscript(await readFile(transcriptPath(session), 'utf8'));
    } catch (_) {
      return '';
    }
  }

  async function readSummaryOf(session) {
    try {
      return (await readFile(summaryPath(session), 'utf8')).trim();
    } catch (_) {
      return '';
    }
  }

  function elapsedOf(session) {
    if (!session.createdAt) return 0;
    const end = session.endedAt || Date.now();
    return Math.max(0, end - session.createdAt);
  }

  async function publicSession(session) {
    if (!session) return null;
    const transcript = await readTranscriptOf(session);
    const summary = session.summary || await readSummaryOf(session);
    return {
      id: session.id,
      phase: session.phase,
      source: session.source,
      language: session.language,
      createdAt: session.createdAt,
      endedAt: session.endedAt || 0,
      elapsedMs: elapsedOf(session),
      transcript,
      chars: transcript.length,
      summary,
      summaryModel: session.summaryModel || config.summary.model,
      summaryAt: session.summaryAt || 0,
      error: session.error || '',
      warning: session.warning || '',
      exitCode: session.exitCode,
      audioSaved: config.saveAudio,
    };
  }

  async function sessionDirectory(id) {
    return join(config.sessionsDir, validateSessionId(id));
  }

  async function loadSessionFromDisk(id) {
    const safe = validateSessionId(id);
    if (safe === '') return null;
    const directory = await sessionDirectory(safe);
    try {
      await stat(directory);
    } catch (_) {
      return null;
    }
    let meta = {};
    try {
      meta = JSON.parse(await readFile(join(directory, 'meta.json'), 'utf8'));
    } catch (_) {
      /* tolerate a session directory without metadata */
    }
    const session = {
      id: safe,
      directory,
      createdAt: Number(meta.createdAt) || 0,
      endedAt: Number(meta.endedAt) || 0,
      language: asString(meta.language, config.language || 'zh'),
      source: asString(meta.source, 'mic'),
      phase: asString(meta.phase, 'done'),
      exitCode: Number.isFinite(meta.exitCode) ? meta.exitCode : 0,
      error: asString(meta.error),
      warning: asString(meta.warning),
      summaryModel: asString(meta.summaryModel),
      summaryAt: Number(meta.summaryAt) || 0,
      summary: '',
      child: null,
      stderrTail: '',
      stdoutTail: '',
    };
    if (['starting', 'recording', 'stopping'].includes(session.phase)) {
      /* The process cannot survive a Host restart, so an on-disk active phase is stale. */
      const transcript = await readTranscriptOf(session);
      session.phase = transcript === '' ? 'failed' : 'done';
      session.warning = session.warning || '录音进程已结束（可能是 DSH 重启或页面关闭）。';
      session.endedAt = session.endedAt || Date.now();
    }
    return session;
  }

  async function latestSessionFromDisk() {
    let entries;
    try {
      entries = await readdir(config.sessionsDir, { withFileTypes: true });
    } catch (_) {
      return null;
    }
    const names = entries.filter((entry) => entry.isDirectory() && validateSessionId(entry.name)).map((entry) => entry.name);
    names.sort().reverse();
    for (const name of names) {
      const session = await loadSessionFromDisk(name);
      if (session) return session;
    }
    return null;
  }

  function currentSession() {
    if (activeId !== '') {
      const active = sessions.get(activeId);
      if (active) return active;
    }
    return null;
  }

  async function finishSession(session, reason) {
    if (session.endedAt !== 0 && reason !== 'stop') return;
    session.endedAt = Date.now();
    if (session.phase !== 'failed') {
      session.phase = session.exitCode !== undefined && session.exitCode !== 0 && reason !== 'stop'
        ? 'failed'
        : 'done';
    }
    if (reason === 'stop' && session.phase !== 'failed') session.phase = 'done';
    if (activeId === session.id) activeId = '';
    const transcript = await readTranscriptOf(session);
    if (session.phase === 'failed' && transcript !== '') {
      /* A failed run can still have produced usable text; keep it visible. */
      session.warning = session.warning || '录音进程异常结束，转写可能不完整。';
    }
    await persistMeta(session);
  }

  function attachOutput(session) {
    const child = session.child;
    if (!child) return;
    child.stdout?.on('data', (chunk) => {
      session.stdoutTail = tail(`${session.stdoutTail}${String(chunk)}`, 4000);
    });
    child.stderr?.on('data', (chunk) => {
      session.stderrTail = tail(`${session.stderrTail}${String(chunk)}`, 4000);
    });
    child.on('error', (error) => {
      session.error = `无法启动 v2t：${error && error.message ? error.message : String(error)}`;
      session.phase = 'failed';
      session.endedAt = Date.now();
      if (activeId === session.id) activeId = '';
      void persistMeta(session);
    });
    child.on('exit', (code, signal) => {
      session.exitCode = typeof code === 'number' ? code : (signal ? 1 : 0);
      session.exitSignal = signal || '';
      if (session.endedAt === 0) {
        const aborted = session.phase === 'stopping' || signal === 'SIGINT' || signal === 'SIGTERM';
        if (aborted) {
          session.phase = 'done';
        } else if (code === 0) {
          session.phase = 'done';
        } else {
          session.phase = 'failed';
          const detail = tail(session.stderrTail || session.stdoutTail, 1200).trim();
          session.error = detail || `v2t 退出码 ${String(code)}`;
        }
      }
      session.endedAt = session.endedAt || Date.now();
      if (activeId === session.id && (session.phase === 'done' || session.phase === 'failed')) {
        activeId = '';
      }
      void persistMeta(session);
    });
  }

  async function startSession(input) {
    const source = input.source === 'system' ? 'system' : input.source === 'both' ? 'both' : 'mic';
    const requestedLanguage = asString(input.language, config.language || 'zh');
    const language = ['auto', 'zh', 'en', 'yue', 'ja', 'ko'].includes(requestedLanguage) ? requestedLanguage : 'zh';
    const existing = currentSession();
    if (existing && ['starting', 'recording', 'stopping'].includes(existing.phase)) {
      throw new Error('已经有一段录音正在进行，请先停止它。');
    }
    if (!existsSync(config.binary)) {
      throw new Error(`未找到 v2t：${config.binary}`);
    }
    if (!isExecutable(config.binary)) {
      throw new Error(`v2t 不可执行：${config.binary}`);
    }
    await mkdir(config.sessionsDir, { recursive: true });
    const directory = join(config.sessionsDir, sessionDirectoryName());
    await mkdir(directory, { recursive: true });
    const session = {
      id: directory.slice(config.sessionsDir.length + 1),
      directory,
      createdAt: Date.now(),
      endedAt: 0,
      language,
      source,
      phase: 'starting',
      exitCode: 0,
      error: '',
      warning: '',
      summary: '',
      summaryModel: '',
      summaryAt: 0,
      child: null,
      stderrTail: '',
      stdoutTail: '',
    };
    const args = [
      '-live',
      '-out', transcriptPath(session),
      '-lang', language,
      '-chunk', String(config.chunkSeconds),
      '-blank', String(config.blankSeconds),
    ];
    if (source === 'mic') args.push('-r');
    else if (source === 'system') args.push('-i');
    if (config.saveAudio) args.push('-save-audio', audioPath(session));
    const child = spawn(config.binary, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
    session.child = child;
    attachOutput(session);
    sessions.set(session.id, session);
    activeId = session.id;
    await persistMeta(session);
    /*
     * v2t may fail immediately (no microphone permission, bad device, missing
     * model).  Wait briefly so the panel gets an actionable error instead of a
     * session that silently dies on the next poll.
     */
    await new Promise((resolve) => setTimeout(resolve, 700));
    if (session.phase === 'failed' || session.endedAt !== 0) {
      const detail = session.error || tail(session.stderrTail || session.stdoutTail, 1200).trim();
      throw new Error(detail || 'v2t 启动后立即退出。');
    }
    session.phase = 'recording';
    await persistMeta(session);
    return session;
  }

  async function stopSession(session) {
    if (!session) throw new Error('没有可以停止的录音。');
    if (['done', 'failed'].includes(session.phase)) {
      await persistMeta(session);
      return session;
    }
    session.phase = 'stopping';
    session.endedAt = 0;
    const child = session.child;
    if (child && child.exitCode === null && child.signalCode === null) {
      try {
        child.kill('SIGINT');
      } catch (_) {
        /* the process may have exited between the check and the signal */
      }
      const closed = await waitForExit(session, config.stopTimeoutMs);
      if (!closed) {
        session.warning = `v2t 超过 ${Math.round(config.stopTimeoutMs / 1000)} 秒没有结束，已强制停止，转写可能不完整。`;
        try { child.kill('SIGTERM'); } catch (_) { /* already gone */ }
        const terminated = await waitForExit(session, 5000);
        if (!terminated) {
          try { child.kill('SIGKILL'); } catch (_) { /* already gone */ }
          await waitForExit(session, 2000);
        }
      }
    }
    session.endedAt = session.endedAt || Date.now();
    session.phase = 'done';
    if (activeId === session.id) activeId = '';
    await finishSession(session, 'stop');
    return session;
  }

  async function health() {
    const now = Date.now();
    if (healthCache.value && now - healthCache.at < 5000) return healthCache.value;
    let summaryAvailable = false;
    let models = [];
    let summaryError = '';
    try {
      const response = await fetch(`${config.summary.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(1600),
      });
      if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
      const payload = await response.json();
      models = Array.isArray(payload && payload.models)
        ? payload.models.map((item) => item && item.name).filter((name) => typeof name === 'string' && name !== '')
        : [];
      summaryAvailable = models.some((name) => name === config.summary.model || name === `${config.summary.model}:latest`);
      if (!summaryAvailable) {
        summaryError = models.length === 0
          ? '本机 Ollama 没有安装任何模型。'
          : `没有找到模型 ${config.summary.model}；可用：${models.slice(0, 6).join(', ')}`;
      }
    } catch (error) {
      summaryError = `无法连接本地 Ollama（${config.summary.baseUrl}）：${error && error.message ? error.message : String(error)}`;
    }
    const value = {
      ok: true,
      v2t: {
        path: config.binary,
        available: isExecutable(config.binary),
        chunkSeconds: config.chunkSeconds,
        dataDir: config.sessionsDir,
      },
      summary: {
        baseUrl: config.summary.baseUrl,
        model: config.summary.model,
        available: summaryAvailable,
        models,
        error: summaryError,
      },
      active: activeId,
    };
    healthCache = { at: now, value };
    return value;
  }

  function summaryResponse(session, request) {
    const encoder = new TextEncoder();
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (request.signal.aborted) controller.abort();
    else request.signal.addEventListener('abort', onAbort, { once: true });

    const stream = new ReadableStream({
      start(emitStream) {
        let closed = false;
        const send = (payload) => {
          if (closed) return;
          try {
            emitStream.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
          } catch (_) {
            closed = true;
          }
        };
        const close = () => {
          if (closed) return;
          closed = true;
          try { emitStream.close(); } catch (_) { /* already closed */ }
          request.signal.removeEventListener('abort', onAbort);
        };

        void (async () => {
          const started = Date.now();
          try {
            const transcript = await readTranscriptOf(session);
            if (transcript === '') throw new Error('这段录音还没有可总结的转写文字。');
            const chunks = transcript.length <= config.summary.maxChars
              ? [transcript]
              : splitTranscript(transcript, config.summary.maxChars);
            const limited = chunks.length > config.summary.maxChunks;
            const usedChunks = limited ? chunks.slice(0, config.summary.maxChunks) : chunks;
            send({
              type: 'start',
              model: config.summary.model,
              chars: transcript.length,
              chunks: usedChunks.length,
              truncated: limited,
            });
            let notes = '';
            if (usedChunks.length === 1) {
              const result = await callOllama({
                config,
                signal: controller.signal,
                numPredict: config.summary.numPredict,
                messages: [
                  { role: 'system', content: ZH_SUMMARY_SYSTEM },
                  { role: 'user', content: `以下是语音转写原文：\n\n${usedChunks[0]}` },
                ],
                onToken: (text) => send({ type: 'chunk', text }),
              });
              notes = result.text;
            } else {
              const partials = [];
              for (let index = 0; index < usedChunks.length; index += 1) {
                if (controller.signal.aborted) throw Object.assign(new Error('总结已取消'), { name: 'AbortError' });
                send({ type: 'progress', phase: 'extract', index: index + 1, total: usedChunks.length });
                const result = await callOllama({
                  config,
                  signal: controller.signal,
                  numPredict: Math.min(700, config.summary.numPredict),
                  messages: [
                    { role: 'system', content: ZH_EXTRACT_SYSTEM },
                    { role: 'user', content: `第 ${String(index + 1)} 部分转写：\n\n${usedChunks[index]}` },
                  ],
                });
                partials.push(`### 第 ${String(index + 1)} 部分\n${result.text}`);
              }
              if (limited) {
                partials.push(`（原转写较长，只总结了前 ${String(usedChunks.length)} 个部分。）`);
              }
              send({ type: 'progress', phase: 'final', index: usedChunks.length, total: usedChunks.length });
              const result = await callOllama({
                config,
                signal: controller.signal,
                numPredict: config.summary.numPredict,
                messages: [
                  { role: 'system', content: ZH_MERGE_SYSTEM },
                  { role: 'user', content: `以下是各部分的要点：\n\n${partials.join('\n\n')}` },
                ],
                onToken: (text) => send({ type: 'chunk', text }),
              });
              notes = result.text;
            }
            const summary = notes.trim();
            if (summary === '') throw new Error('本地模型没有生成总结内容。');
            session.summary = summary;
            session.summaryModel = config.summary.model;
            session.summaryAt = Date.now();
            await mkdir(session.directory, { recursive: true });
            await writeFile(summaryPath(session), `${summary}\n`, 'utf8');
            await persistMeta(session);
            send({
              type: 'done',
              summary,
              model: config.summary.model,
              elapsedMs: Date.now() - started,
              truncated: limited,
            });
          } catch (error) {
            if (isAbortError(error) || controller.signal.aborted) {
              send({ type: 'cancelled' });
            } else {
              send({ type: 'error', message: error && error.message ? error.message : String(error) });
            }
          } finally {
            close();
          }
        })();
      },
      cancel() {
        controller.abort();
      },
    });

    return new Response(stream, {
      headers: {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'cache-control': 'no-store',
        'x-accel-buffering': 'no',
      },
    });
  }

  async function history() {
    let entries;
    try {
      entries = await readdir(config.sessionsDir, { withFileTypes: true });
    } catch (_) {
      return [];
    }
    const names = entries
      .filter((entry) => entry.isDirectory() && validateSessionId(entry.name))
      .map((entry) => entry.name)
      .sort()
      .reverse()
      .slice(0, 20);
    const rows = [];
    for (const name of names) {
      const session = await loadSessionFromDisk(name);
      if (!session) continue;
      const transcript = await readTranscriptOf(session);
      const summary = await readSummaryOf(session);
      rows.push({
        id: session.id,
        createdAt: session.createdAt,
        endedAt: session.endedAt,
        elapsedMs: Math.max(0, (session.endedAt || session.createdAt) - session.createdAt),
        language: session.language,
        source: session.source,
        chars: transcript.length,
        preview: transcript.replace(/\s+/gu, ' ').slice(0, 80),
        hasSummary: summary !== '',
      });
    }
    return rows;
  }

  const routes = [
    {
      path: `${ROUTE_PREFIX}/health`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => jsonResponse(await health()),
    },
    {
      path: `${ROUTE_PREFIX}/state`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const id = validateSessionId(new URL(request.url).searchParams.get('session') || '');
        let session = null;
        if (id !== '') {
          session = sessions.get(id) || await loadSessionFromDisk(id);
        } else {
          session = currentSession() || await latestSessionFromDisk();
        }
        if (!session) return jsonResponse({ ok: true, session: null });
        return jsonResponse({ ok: true, session: await publicSession(session) });
      },
    },
    {
      path: `${ROUTE_PREFIX}/start`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request);
          const session = await startSession(body);
          return jsonResponse({ ok: true, session: await publicSession(session) });
        } catch (error) {
          return failure(error && error.message ? error.message : String(error), 409);
        }
      },
    },
    {
      path: `${ROUTE_PREFIX}/stop`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request);
          const id = validateSessionId(body.sessionId || '');
          const session = (id !== '' ? sessions.get(id) : currentSession()) || (id !== '' ? await loadSessionFromDisk(id) : null);
          if (!session) return failure('没有找到这段录音。', 404);
          const stopped = await stopSession(session);
          return jsonResponse({ ok: true, session: await publicSession(stopped) });
        } catch (error) {
          return failure(error && error.message ? error.message : String(error), 500);
        }
      },
    },
    {
      path: `${ROUTE_PREFIX}/summarize`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request);
          const id = validateSessionId(body.sessionId || '');
          const session = (id !== '' ? sessions.get(id) : currentSession()) || (id !== '' ? await loadSessionFromDisk(id) : null);
          if (!session) return failure('没有找到这段录音。', 404);
          return summaryResponse(session, request);
        } catch (error) {
          return failure(error && error.message ? error.message : String(error), 500);
        }
      },
    },
    {
      path: `${ROUTE_PREFIX}/history`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => jsonResponse({ ok: true, sessions: await history() }),
    },
  ];

  const writeRuntimeMarker = async () => {
    await mkdir(config.dataRoot, { recursive: true });
    await writeFile(join(config.dataRoot, 'runtime.json'), `${JSON.stringify({
      pid: process.pid,
      code: 'v2t-live-v4',
      registeredAt: Date.now(),
      binary: config.binary,
      sessionsDir: config.sessionsDir,
      routes: routes.map((route) => route.path),
    }, null, 2)}\n`, 'utf8');
  };

  for (const route of routes) {
    ctx.connection.fetch.register(route);
  }
  void writeRuntimeMarker().catch((error) => {
    ctx.logger?.warn?.(`speech-notes: could not write runtime marker: ${error && error.message ? error.message : String(error)}`);
  });

  ctx.effect(() => () => {
    for (const session of sessions.values()) {
      if (session.child && session.child.exitCode === null && session.child.signalCode === null) {
        try { session.child.kill('SIGINT'); } catch (_) { /* already gone */ }
      }
    }
    healthCache = { at: 0, value: null };
  }, 'speech-notes: stop local recording on unload');
}
