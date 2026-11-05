/**
 * Host half of the writing-drill bundle.
 *
 * The browser only needs to talk to the local Ollama model, so this half owns
 * the two model calls:
 *
 *   prompt  →  a writing exercise (subject + optional genre constraint)
 *   grade   →  score the passage, give professional writing advice, and say
 *              whether it has reached a high enough standard to stop.
 *
 * Every browser call goes through an authenticated exact Fetch route under
 * `/api/writing-drill/...`, registered on the Connection service.  Both
 * prompt and grade stream newline-delimited JSON so the panel can show the
 * local model's tokens as it writes.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ROUTE_PREFIX = '/api/writing-drill';

const PROMPT_SYSTEM = [
  '你是一位资深的写作教练。你会给学员出一道写作片段练习的题目。',
  '你只能输出题目本身，不要寒暄，不要解释你的出题思路。',
  '输出要求：',
  '1. 第一行写「## 主题」，紧接着用一两句话给出本次练习的主题。',
  '2. 再写「## 要求」，列出 2-4 条具体的写作要求（如角度、写法、篇幅方向、要避免的问题）。',
  '3. 如果用户指定了体裁，题目必须限定在该体裁内；如果指定了主题类型，题目必须落在该类型内。',
  '4. 题目要具体、可下笔，避免过于空泛。',
].join('\n');

const GRADE_SYSTEM = [
  '你是一位专业、严格但建设性的写作指导老师。你会阅读学生的习作并给出评判。',
  '评判维度包括：主题与立意、结构与逻辑、语言与表达、细节与感染力、是否符合体裁要求。',
  '请用简洁的 Markdown 输出，结构固定如下：',
  '## 评分',
  '给出一个 0-10 的分数（可以保留一位小数），并写一句总评。',
  '## 亮点',
  '列出 1-3 条值得肯定的地方。',
  '## 建议',
  '列出 2-4 条具体、可操作的改进建议，每条都要指向文中的具体问题。',
  '## 结论',
  '最后单独写一行，格式为：达标判断：是 或 达标判断：否。',
  '当且仅当习作在立意、结构、语言、细节各方面都达到较高水准时，才判断为「是」。',
  '不要客套，不要重复，直接给判断和理由。',
].join('\n');

const DEFAULT_MODEL = 'qwen3.8:27b-mlx';
const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';

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

function resolveConfig(raw) {
  const config = isObject(raw) ? raw : {};
  return {
    baseUrl: withoutTrailingSlash(
      asString(config.baseUrl, asString(process.env.DSH_OLLAMA_URL, DEFAULT_BASE_URL)),
    ),
    model: asString(config.model, asString(process.env.DSH_WRITING_MODEL, DEFAULT_MODEL)),
    passScore: asFloat(config.passScore, 8.0, 0, 10),
    temperature: asFloat(config.temperature, 0.7, 0, 2),
    numCtx: asNumber(config.numCtx, 16384, 2048, 131072),
    numPredict: asNumber(config.numPredict, 1600, 128, 8192),
    timeoutMs: asNumber(config.timeoutMs, 600000, 10000, 3600000),
    dataRoot: asString(config.dataDir)
      || join(asString(process.env.DSH_HOME) || join(homedir(), '.dsh'), 'writing-drill'),
  };
}

function tail(value, limit) {
  const text = String(value);
  return text.length <= limit ? text : text.slice(text.length - limit);
}

function readJsonBody(request, limit = 256 * 1024) {
  return request.text().then((text) => {
    if (text.length > limit) throw new Error('请求内容过大');
    if (text.trim() === '') return {};
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (_) {
      throw new Error('请求内容不是有效的 JSON');
    }
    return isObject(parsed) ? parsed : {};
  });
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

function isAbortError(error) {
  return Boolean(error && (error.name === 'AbortError' || error.code === 'ABORT_ERR'));
}

async function callOllama(config, messages, options) {
  const { signal, onToken, numPredict } = options;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, config.timeoutMs);
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
      response = await fetch(`${config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: true,
          think: false,
          options: {
            temperature: config.temperature,
            num_ctx: config.numCtx,
            num_predict: numPredict,
          },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) throw new Error(`本地模型超过 ${Math.round(config.timeoutMs / 1000)} 秒没有响应`);
      if (isAbortError(error) && signal.aborted) throw error;
      throw new Error(`无法连接本地 Ollama（${config.baseUrl}）：${error && error.message ? error.message : String(error)}`);
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
    if (text.trim() === '') throw new Error('本地模型没有生成内容');
    return text.trim();
  } catch (error) {
    if (timedOut) throw new Error(`本地模型超过 ${Math.round(config.timeoutMs / 1000)} 秒没有完成`);
    throw error;
  } finally {
    release();
  }
}

/** Extract a 0-10 score and a pass/fail verdict from the model's grade text. */
function parseVerdict(text) {
  const scoreMatch = text.match(/(\d+(?:\.\d+)?)\s*\/\s*10/u)
    || text.match(/分数[：:\s]*(\d+(?:\.\d+)?)/u)
    || text.match(/(\d+(?:\.\d+)?)\s*分/u);
  let score = null;
  if (scoreMatch) {
    const parsed = Number(scoreMatch[1]);
    if (Number.isFinite(parsed)) score = Math.min(10, Math.max(0, parsed));
  }
  const verdictMatch = text.match(/达标判断[：:\s]*(\S+)/u);
  let passed = null;
  if (verdictMatch) {
    const token = verdictMatch[1];
    passed = /^(是|yes|true|pass|通过|达标)$/iu.test(token);
  }
  return { score, passed };
}

function streamResponse(requestSignal, handler) {
  const encoder = new TextEncoder();
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (requestSignal.aborted) controller.abort();
  else requestSignal.addEventListener('abort', onAbort, { once: true });

  const stream = new ReadableStream({
    start(emit) {
      let closed = false;
      const send = (payload) => {
        if (closed) return;
        try {
          emit.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        } catch (_) {
          closed = true;
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try { emit.close(); } catch (_) { /* already closed */ }
        requestSignal.removeEventListener('abort', onAbort);
      };
      void (async () => {
        try {
          await handler(controller.signal, send);
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

export const inject = ['connection'];

/* ---- 会话历史持久化：把每轮「题目→习作→评分→评价」落到 dataRoot/session.json ---- */

const SESSION_FILE = 'session.json';
const SESSION_MAX_ROUNDS = 500;

function newSession() {
  return { version: 1, createdAt: Date.now(), rounds: [] };
}

async function readSession(dataRoot) {
  try {
    const text = await readFile(join(dataRoot, SESSION_FILE), 'utf8');
    const parsed = JSON.parse(text);
    if (isObject(parsed) && Array.isArray(parsed.rounds)) {
      return {
        version: 1,
        createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
        rounds: parsed.rounds
          .filter((round) => isObject(round) && typeof round.id === 'string')
          .slice(-SESSION_MAX_ROUNDS),
      };
    }
    return newSession();
  } catch (_) {
    return newSession();
  }
}

async function writeSession(dataRoot, session) {
  await mkdir(dataRoot, { recursive: true });
  await writeFile(join(dataRoot, SESSION_FILE), `${JSON.stringify(session, null, 2)}\n`, 'utf8');
}

export function apply(ctx, rawConfig) {
  const config = resolveConfig(rawConfig);
  ctx.logger?.info?.(`writing-drill: model=${config.model}, baseUrl=${config.baseUrl}`);

  let healthCache = { at: 0, value: null };

  /* 会话历史：进程内缓存 + 磁盘持久化，写操作串行化避免并发写坏文件。 */
  let session = null;
  let sessionLoaded = false;
  let sessionWriteQueue = Promise.resolve();

  async function ensureSession() {
    if (!sessionLoaded) {
      session = await readSession(config.dataRoot);
      sessionLoaded = true;
    }
    return session;
  }

  function appendRound(round) {
    sessionWriteQueue = sessionWriteQueue.then(async () => {
      const current = await ensureSession();
      current.rounds.push(round);
      if (current.rounds.length > SESSION_MAX_ROUNDS) {
        current.rounds = current.rounds.slice(-SESSION_MAX_ROUNDS);
      }
      await writeSession(config.dataRoot, current);
    });
    return sessionWriteQueue;
  }

  function clearSession() {
    sessionWriteQueue = sessionWriteQueue.then(async () => {
      session = newSession();
      await writeSession(config.dataRoot, session);
    });
    return sessionWriteQueue;
  }

  async function health() {
    const now = Date.now();
    if (healthCache.value && now - healthCache.at < 5000) return healthCache.value;
    let available = false;
    let models = [];
    let error = '';
    try {
      const response = await fetch(`${config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(1600),
      });
      if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
      const payload = await response.json();
      models = Array.isArray(payload && payload.models)
        ? payload.models.map((item) => item && item.name).filter((name) => typeof name === 'string' && name !== '')
        : [];
      available = models.some((name) => name === config.model || name === `${config.model}:latest`);
      if (!available) {
        error = models.length === 0
          ? '本机 Ollama 没有安装任何模型。'
          : `没有找到模型 ${config.model}；可用：${models.slice(0, 6).join(', ')}`;
      }
    } catch (e) {
      error = `无法连接本地 Ollama（${config.baseUrl}）：${e && e.message ? e.message : String(e)}`;
    }
    const value = {
      ok: true,
      baseUrl: config.baseUrl,
      model: config.model,
      available,
      models,
      error,
      passScore: config.passScore,
    };
    healthCache = { at: now, value };
    return value;
  }

  async function runPrompt(signal, params, send) {
    const theme = asString(params.theme);
    const genre = asString(params.genre);
    const constraints = [];
    if (theme !== '') constraints.push(`主题类型要求：${theme}`);
    if (genre !== '') constraints.push(`体裁要求：${genre}`);
    const userLine = constraints.length > 0
      ? `请出题。${constraints.join('；')}。`
      : '请出题。';

    send({ type: 'start', model: config.model });
    const prompt = await callOllama(
      config,
      [
        { role: 'system', content: PROMPT_SYSTEM },
        { role: 'user', content: userLine },
      ],
      { signal, numPredict: config.numPredict, onToken: (text) => send({ type: 'chunk', text }) },
    );
    send({ type: 'done', prompt, model: config.model, theme, genre });
  }

  async function runGrade(signal, params, send) {
    const prompt = asString(params.prompt);
    const passage = asString(params.passage);
    const genre = asString(params.genre);
    if (prompt === '') throw new Error('缺少本次练习的题目。');
    if (passage === '') throw new Error('请先写下你的习作再提交评判。');

    const genreNote = genre !== '' ? `（本次练习的体裁要求：${genre}）` : '';
    const userContent = [
      `本次练习的题目${genreNote}：`,
      prompt,
      '',
      '以下是我的习作：',
      passage,
    ].join('\n');

    send({ type: 'start', model: config.model, chars: passage.length });
    const grade = await callOllama(
      config,
      [
        { role: 'system', content: GRADE_SYSTEM },
        { role: 'user', content: userContent },
      ],
      { signal, numPredict: config.numPredict, onToken: (text) => send({ type: 'chunk', text }) },
    );
    const verdict = parseVerdict(grade);
    const score = verdict.score !== null ? verdict.score : null;
    const passed = verdict.passed !== null
      ? verdict.passed
      : (score !== null && score >= config.passScore);
    const round = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      at: Date.now(),
      theme: asString(params.theme),
      genre,
      prompt,
      passage,
      grade,
      score,
      passed,
      passScore: config.passScore,
      model: config.model,
    };
    /* 每轮评判完成即落盘，保证「内容+评分+评价」可追溯；不阻塞流式返回。 */
    void appendRound(round).catch((error) => {
      ctx.logger?.warn?.(`writing-drill: append round failed: ${error && error.message ? error.message : String(error)}`);
    });
    send({ type: 'done', grade, score, passed, passScore: config.passScore, model: config.model, round });
  }

  const routes = [
    {
      path: `${ROUTE_PREFIX}/session`,
      methods: ['GET', 'DELETE'],
      requestBody: 'buffered',
      fetch: async (request) => {
        if (request.method === 'DELETE') {
          await clearSession();
          return jsonResponse({ ok: true, session: newSession() });
        }
        const current = await ensureSession();
        return jsonResponse({ ok: true, session: current });
      },
    },
    {
      path: `${ROUTE_PREFIX}/health`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => jsonResponse(await health()),
    },
    {
      path: `${ROUTE_PREFIX}/prompt`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const body = await readJsonBody(request);
        return streamResponse(request.signal, (signal, send) => runPrompt(
          signal,
          { theme: asString(body.theme), genre: asString(body.genre) },
          send,
        ));
      },
    },
    {
      path: `${ROUTE_PREFIX}/grade`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const body = await readJsonBody(request);
        return streamResponse(request.signal, (signal, send) => runGrade(
          signal,
          {
            prompt: asString(body.prompt),
            passage: asString(body.passage),
            genre: asString(body.genre),
          },
          send,
        ));
      },
    },
  ];

  const writeRuntimeMarker = async () => {
    await mkdir(config.dataRoot, { recursive: true });
    await writeFile(join(config.dataRoot, 'runtime.json'), `${JSON.stringify({
      pid: process.pid,
      code: 'writing-drill-v1',
      registeredAt: Date.now(),
      model: config.model,
      baseUrl: config.baseUrl,
      routes: routes.map((route) => route.path),
    }, null, 2)}\n`, 'utf8');
  };

  for (const route of routes) {
    ctx.connection.fetch.register(route);
  }
  void writeRuntimeMarker().catch((error) => {
    ctx.logger?.warn?.(`writing-drill: could not write runtime marker: ${error && error.message ? error.message : String(error)}`);
  });

  ctx.effect(() => () => {
    healthCache = { at: 0, value: null };
  }, 'writing-drill: clear health cache on unload');
}

/* Exported for the smoke test only. */
export const __test = { parseVerdict };
