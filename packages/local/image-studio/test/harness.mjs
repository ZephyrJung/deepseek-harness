/**
 * Host-side smoke test for the image-studio plugin.
 *
 * It replaces Draw Things, ComfyUI and Ollama with tiny local HTTP servers on
 * ephemeral ports, sets DSH_HOME to a throwaway directory, then exercises the
 * exact Connection Fetch routes the browser panel calls. No real model, GUI app
 * or image weights are required. Run with:
 *
 *   node test/harness.mjs
 */
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import assert from 'node:assert/strict';

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROUTE = '/api/image-studio';
const FAKE_MODEL = 'fake-qwen3vl:latest';
const FEEDBACK_MARKER = '背景太乱';
const FEEDBACK = '背景太乱，脸再小一点，光线更暖';
const DESCRIPTION = '雨夜霓虹街头漫步的橘猫，电影感，低饱和';

/* A real 1x1 transparent PNG; Draw Things and ComfyUI both hand back base64/bytes. */
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG_BYTES = Buffer.from(PNG_BASE64, 'base64');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/* Build a real, solid-colour RGBA PNG (no dependencies) so the host can read
 * the init image's dimensions from its header. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let step = 0; step < 8; step += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[n] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function makePng(width, height, tint = 0) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const row = Buffer.alloc(1 + width * 4);
  for (let x = 0; x < width; x += 1) {
    row[1 + x * 4] = 40 + tint;
    row[2 + x * 4] = 120;
    row[3 + x * 4] = 200;
    row[4 + x * 4] = 255;
  }
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const INIT_WIDTH = 512;
const INIT_HEIGHT = 640;
const INIT_PNG = makePng(INIT_WIDTH, INIT_HEIGHT);
const INIT_DATA_URL = `data:image/png;base64,${INIT_PNG.toString('base64')}`;

/* A valid PNG header followed by junk so the decoded payload exceeds 12 MB. */
const OVERSIZE_PNG = Buffer.concat([INIT_PNG, Buffer.alloc(12 * 1024 * 1024 + 1024)]);
const OVERSIZE_DATA_URL = `data:image/png;base64,${OVERSIZE_PNG.toString('base64')}`;


const BRIEF = {
  intent: '雨夜霓虹街头的橘猫',
  subject: 'a ginger cat',
  style: 'cinematic photography',
  composition: 'medium shot, subject slightly off-center',
  lighting: 'neon rim light with a warm shop glow',
  palette: 'teal and orange, low saturation',
  aspect: '3:4',
};

const PLAN_JSON = {
  brief: BRIEF,
  positive: 'FULLPLAN: a ginger cat walking on a rain-soaked neon street at night, cinematic medium shot, warm shop glow and teal reflections, low saturation film look, 35mm, detailed fur',
  negative: 'blurry, lowres, watermark, text, extra limbs',
  params: { width: 768, height: 1024, steps: 24, cfg: 5.5, sampler: 'DPM++ 2M Karras' },
  rationale: '雨夜与霓虹的冷暖对比能突出橘猫主体，低饱和让画面更电影感。',
  tags: ['电影感', '霓虹', '低饱和'],
  understood: '',
  changes: [],
  mode: 'create',
  critique: '',
  preference: '偏爱低饱和电影感，避免塑料光泽',
  denoise: 0.45,
  degraded: false,
  degradedReason: '',
};

const REFINE_JSON = {
  brief: { ...BRIEF, composition: 'medium close-up, smaller subject, cleaner background' },
  positive: 'REFINED: a ginger cat on a rain-soaked neon street, smaller subject, simplified background, warmer golden light, cinematic low saturation, 35mm, detailed fur',
  negative: 'blurry, lowres, watermark, text, extra limbs, busy background, clutter, cool cast',
  params: { width: 768, height: 1024, steps: 30, cfg: 6, sampler: 'DPM++ 2M Karras' },
  rationale: '按反馈压掉背景杂物、缩小主体，并把光线调暖。',
  tags: ['电影感', '暖光'],
  understood: '背景太乱、主体偏大、光线偏冷',
  changes: ['简化背景', '缩小主体', '暖化光线'],
  mode: 'refine',
  critique: '',
  preference: '偏爱低饱和电影感，避免塑料光泽',
  denoise: 0.5,
  degraded: false,
  degradedReason: '',
};

const CRITIQUE_JSON = {
  ...REFINE_JSON,
  critique: '主体清晰，但背景元素偏多、光线偏冷；建议简化背景并加入暖色光源。',
  observations: ['background is busy', 'lighting is cool'],
  suggestions: ['simplify background', 'warm the key light'],
};

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readRequestBody(request, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      data += chunk;
      if (data.length > limit) {
        request.destroy();
        reject(new Error('fake backend request body too large'));
      }
    });
    request.on('end', () => resolve(data));
    request.on('error', reject);
  });
}

function readRawBody(request, limit = 16 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        request.destroy();
        reject(new Error('fake backend request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

/* Pull the `image` part out of a ComfyUI /upload/image multipart body. */
function extractMultipartImage(buffer, contentType) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/iu.exec(contentType || '');
  if (!boundaryMatch) return null;
  const boundary = `--${boundaryMatch[1] || boundaryMatch[2]}`;
  const text = buffer.toString('latin1');
  const disposition = text.indexOf('name="image"');
  if (disposition === -1) return null;
  const headerEnd = text.indexOf('\r\n\r\n', disposition);
  if (headerEnd === -1) return null;
  const partEnd = text.indexOf(`\r\n${boundary}`, headerEnd + 4);
  if (partEnd === -1) return null;
  const filenameMatch = /filename="([^"]*)"/iu.exec(text.slice(disposition, headerEnd));
  return {
    bytes: buffer.subarray(headerEnd + 4, partEnd),
    filename: filenameMatch ? filenameMatch[1] : '',
    fields: text.slice(0, headerEnd),
  };
}

function sendJson(response, value, status = 200) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  response.end(body);
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

function closeServer(server) {
  if (!server) return Promise.resolve();
  return new Promise((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections?.();
  });
}

/* Wrap an async HTTP handler so a thrown error becomes a 500 instead of a hang. */
function handler(fn) {
  return (request, response) => {
    void Promise.resolve()
      .then(() => fn(request, response))
      .catch((error) => {
        if (!response.headersSent) sendJson(response, { error: String(error && error.message ? error.message : error) }, 500);
        else response.end();
      });
  };
}

/* ------------------------------------------------------------------ */
/* Fake Ollama                                                         */
/* ------------------------------------------------------------------ */

function messageHasImage(body) {
  const messages = Array.isArray(body && body.messages) ? body.messages : [];
  return messages.some((message) => message && Array.isArray(message.images) && message.images.length > 0);
}

function ollamaPayload(body) {
  if (messageHasImage(body)) return CRITIQUE_JSON;
  const text = JSON.stringify(body ?? {});
  /* Refine/feedback calls either contain the explicit marker or the host's
   * "用户反馈：" prompt prefix; both must return the changed prompt. */
  if (text.includes(FEEDBACK_MARKER) || text.includes('用户反馈：')) return REFINE_JSON;
  return PLAN_JSON;
}

/* The plan answer deliberately arrives as prose + fenced JSON to exercise the
 * "parse JSON defensively" requirement. */
function ollamaContent(body) {
  const payload = ollamaPayload(body);
  const text = `好的，我先梳理意图。\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`;
  return text;
}

async function makeFakeOllama() {
  const state = { requests: [], visionCalls: 0, chatCalls: 0 };
  const server = createServer(handler(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (request.method === 'GET' && url.pathname === '/api/tags') {
      sendJson(response, {
        models: [
          {
            name: FAKE_MODEL,
            model: FAKE_MODEL,
            modified_at: '2026-10-01T00:00:00Z',
            size: 1_800_000_000,
            digest: 'sha256:fake',
            details: {
              format: 'gguf',
              family: 'qwen2vl',
              families: ['qwen2vl', 'qwen3vl'],
              parameter_size: '2.1B',
              quantization_level: 'Q4_K_M',
            },
          },
          {
            name: 'fake-planner:27b',
            model: 'fake-planner:27b',
            size: 18_000_000_000,
            details: { format: 'gguf', family: 'qwen3', families: ['qwen3'], parameter_size: '27B' },
          },
          {
            name: 'fake-embed:latest',
            model: 'fake-embed:latest',
            size: 300_000_000,
            details: { format: 'gguf', family: 'bert', families: ['bert'], parameter_size: '0.3B' },
          },
        ],
      });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/chat') {
      const raw = await readRequestBody(request);
      const body = JSON.parse(raw);
      state.requests.push(body);
      state.chatCalls += 1;
      if (messageHasImage(body)) state.visionCalls += 1;
      const content = ollamaContent(body);
      if (body && body.stream === true) {
        response.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8' });
        response.write(`${JSON.stringify({ model: FAKE_MODEL, message: { role: 'assistant', content }, done: false })}\n`);
        response.end(`${JSON.stringify({ model: FAKE_MODEL, message: { role: 'assistant', content: '' }, done: true, done_reason: 'stop', eval_count: 64 })}\n`);
        return;
      }
      sendJson(response, {
        model: FAKE_MODEL,
        created_at: '2026-10-01T00:00:00Z',
        message: { role: 'assistant', content },
        done: true,
        done_reason: 'stop',
        eval_count: 64,
        prompt_eval_count: 128,
      });
      return;
    }
    sendJson(response, { error: 'not found' }, 404);
  }));
  const port = await listen(server);
  return {
    server,
    port,
    state,
    baseUrl: `http://127.0.0.1:${port}`,
    calls: () => state.chatCalls,
  };
}

/* ------------------------------------------------------------------ */
/* Fake Draw Things (A1111 API)                                        */
/* ------------------------------------------------------------------ */

async function makeFakeDrawThings() {
  const state = { txt2imgCount: 0, requests: [], img2imgCount: 0, img2imgRequests: [], slow: false, slowMs: 4000 };
  const server = createServer(handler(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (request.method === 'GET' && url.pathname === '/sdapi/v1/sd-models') {
      sendJson(response, [
        {
          title: 'fake-model.safetensors [fakehash]',
          model_name: 'fake-model',
          hash: 'fakehash',
          sha256: 'fakehash',
          filename: '/fake/models/Stable-diffusion/fake-model.safetensors',
          config: null,
        },
      ]);
      return;
    }
    if (request.method === 'GET' && url.pathname === '/sdapi/v1/options') {
      sendJson(response, { sd_model_checkpoint: 'fake-model.safetensors [fakehash]' });
      return;
    }
    if (request.method === 'POST' && (url.pathname === '/sdapi/v1/txt2img' || url.pathname === '/sdapi/v1/img2img')) {
      const raw = await readRequestBody(request);
      const body = JSON.parse(raw);
      const img2img = url.pathname === '/sdapi/v1/img2img';
      if (img2img) {
        state.img2imgRequests.push(body);
        state.img2imgCount += 1;
      } else {
        state.requests.push(body);
        state.txt2imgCount += 1;
      }
      if (state.slow) await sleep(state.slowMs);
      if (response.writableEnded || response.destroyed) return;
      /* img2img returns a PNG with the requested dimensions so the next turn can
       * use it as a realistic init image (dimensions are read back by the host). */
      const width = img2img && Number.isInteger(Number(body.width)) && body.width >= 64 && body.width <= 2048 ? Number(body.width) : 1;
      const height = img2img && Number.isInteger(Number(body.height)) && body.height >= 64 && body.height <= 2048 ? Number(body.height) : 1;
      const image = img2img && (width > 1 || height > 1) ? makePng(width, height, state.img2imgCount * 7) : PNG_BYTES;
      sendJson(response, {
        images: [image.toString('base64')],
        parameters: body,
        info: JSON.stringify({ seed: body.seed, prompt: body.prompt }),
      });
      return;
    }
    sendJson(response, { detail: 'not found' }, 404);
  }));
  const port = await listen(server);
  return {
    server,
    port,
    state,
    baseUrl: `http://127.0.0.1:${port}`,
    lastRequest: () => state.requests[state.requests.length - 1],
    lastImg2imgRequest: () => state.img2imgRequests[state.img2imgRequests.length - 1],
  };
}

/* ------------------------------------------------------------------ */
/* Fake ComfyUI                                                        */
/* ------------------------------------------------------------------ */

async function makeFakeComfyUI() {
  const state = { promptCount: 0, prompts: [], uploadCount: 0, uploads: [] };
  const server = createServer(handler(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (request.method === 'GET' && url.pathname === '/system_stats') {
      sendJson(response, {
        system: { os: 'darwin', ram_total: 34359738368, ram_free: 17179869184 },
        devices: [{ name: 'fake-gpu', type: 'mps', vram_total: 17179869184, vram_free: 8589934592, torch_vram_total: 0, torch_vram_free: 0 }],
      });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/object_info/CheckpointLoaderSimple') {
      sendJson(response, {
        CheckpointLoaderSimple: {
          input: { required: { ckpt_name: [['fake-checkpoint.safetensors'], { tooltip: 'checkpoint' }] } },
          input_order: { required: ['ckpt_name'] },
          output: ['MODEL', 'CLIP', 'VAE'],
          output_name: ['MODEL', 'CLIP', 'VAE'],
          name: 'CheckpointLoaderSimple',
          display_name: 'Load Checkpoint',
          category: 'loaders',
          output_node: false,
        },
      });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/upload/image') {
      const raw = await readRawBody(request);
      const contentType = request.headers['content-type'] || '';
      const image = extractMultipartImage(raw, contentType);
      state.uploadCount += 1;
      const name = `fake-input-${state.uploadCount}.png`;
      state.uploads.push({
        name,
        contentType,
        raw,
        bytes: image ? image.bytes : Buffer.alloc(0),
        filename: image ? image.filename : '',
        fields: image ? image.fields : '',
      });
      sendJson(response, { name, subfolder: '', type: 'input' });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/prompt') {
      const raw = await readRequestBody(request);
      const body = JSON.parse(raw);
      state.prompts.push(body);
      state.promptCount += 1;
      const promptId = `fake-prompt-${state.promptCount}`;
      sendJson(response, { prompt_id: promptId, number: state.promptCount, node_errors: {} });
      return;
    }
    if (request.method === 'GET' && url.pathname.startsWith('/history/')) {
      const promptId = decodeURIComponent(url.pathname.slice('/history/'.length));
      sendJson(response, {
        [promptId]: {
          prompt: [],
          outputs: {
            9: { images: [{ filename: 'fake-image.png', subfolder: '', type: 'output' }] },
          },
          status: { status_str: 'success', completed: true, messages: [] },
        },
      });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/view') {
      response.writeHead(200, { 'content-type': 'image/png', 'content-length': PNG_BYTES.length });
      response.end(PNG_BYTES);
      return;
    }
    sendJson(response, { error: 'not found' }, 404);
  }));
  const port = await listen(server);
  return {
    server,
    port,
    state,
    baseUrl: `http://127.0.0.1:${port}`,
    lastPrompt: () => state.prompts[state.prompts.length - 1],
    lastUpload: () => state.uploads[state.uploads.length - 1],
  };
}

/* ------------------------------------------------------------------ */
/* Fake Cordis context / route client                                  */
/* ------------------------------------------------------------------ */

function makeContext() {
  const routes = new Map();
  const effects = [];
  const logs = [];
  const ctx = {
    logger: {
      debug: (...args) => logs.push(['debug', ...args]),
      info: (...args) => logs.push(['info', ...args]),
      warn: (...args) => logs.push(['warn', ...args]),
      error: (...args) => logs.push(['error', ...args]),
    },
    connection: {
      fetch: {
        register(route) {
          assert(!routes.has(route.path), `duplicate route ${route.path}`);
          const dispose = () => routes.delete(route.path);
          ctx.effect(() => {
            routes.set(route.path, route);
            return dispose;
          }, `route ${route.path}`);
          return dispose;
        },
      },
    },
    effect(factory, label) {
      const dispose = factory();
      effects.push({ dispose, label });
      return dispose;
    },
    dispose() {
      for (const effect of effects.splice(0).reverse()) {
        if (typeof effect.dispose === 'function') effect.dispose();
      }
    },
  };
  return { ctx, routes, effects, logs };
}

function postInit(body) {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    /* 生成轮可能持续很久：不让 Request 的默认信号在 body 消费后自动 abort，
     * 否则 host 会把长生成误判为“已取消”。 */
    signal: new AbortController().signal,
  };
}

async function call(routes, path, init = {}) {
  const url = new URL(path, 'http://127.0.0.1');
  const route = routes.get(url.pathname);
  assert(route, `missing route ${url.pathname}`);
  return route.fetch(new Request(url, init));
}

async function getJson(routes, path, init) {
  const response = await call(routes, path, init);
  const text = await response.text();
  assert.equal(response.status, 200, `${path} -> ${response.status}: ${text}`);
  return JSON.parse(text);
}

async function postJson(routes, path, body) {
  return getJson(routes, path, postInit(body));
}

async function expectJsonError(routes, path, init, statuses, label) {
  const response = await call(routes, path, init);
  const text = await response.text();
  assert(statuses.includes(response.status), `${label}: expected ${statuses.join('/')}, got ${response.status}: ${text}`);
  let body;
  try {
    body = JSON.parse(text);
  } catch (_) {
    assert.fail(`${label}: response is not JSON: ${text.slice(0, 300)}`);
  }
  assert.equal(body.ok, false, `${label}: ok must be false`);
  assert(body.error && typeof body.error === 'object', `${label}: missing error object`);
  assert.equal(typeof body.error.code, 'string', `${label}: error.code must be a string`);
  assert.equal(typeof body.error.message, 'string', `${label}: error.message must be a string`);
  return body;
}

function assertSaneParams(params, label) {
  assert(params && typeof params === 'object' && !Array.isArray(params), `${label}: missing params`);
  for (const key of ['width', 'height']) {
    assert(Number.isInteger(params[key]) && params[key] >= 256 && params[key] <= 2048, `${label}.${key} out of range: ${params[key]}`);
  }
  assert(Number.isInteger(params.steps) && params.steps >= 1 && params.steps <= 100, `${label}.steps out of range: ${params.steps}`);
  assert(typeof params.cfg === 'number' && params.cfg >= 0 && params.cfg <= 30, `${label}.cfg out of range: ${params.cfg}`);
  assert(typeof params.sampler === 'string' && params.sampler.length > 0, `${label}.sampler missing`);
}

function assertSeed(seed, label) {
  assert(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff, `${label}: seed is not a sane integer: ${seed}`);
}

function formatTurn(turn) {
  return `turn ${turn && turn.id} (${turn && turn.mode})`;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const root = await mkdtemp(join(tmpdir(), 'dsh-image-studio-test-'));
const dshHome = join(root, 'dsh-home');
process.env.DSH_HOME = dshHome;

let ollama;
let drawthings;
let comfyui;
let context;
let legacyContext;

/* ------------------------------------------------------------------ */
/* Fake draw-things-cli + fake aidraw (headless backends)              */
/* ------------------------------------------------------------------ */

const fakeBinDir = join(root, 'bin');
await mkdir(fakeBinDir, { recursive: true });
const dtCliPng = join(root, 'dt-cli.png');
await writeFile(dtCliPng, makePng(512, 512, 9));
const aidrawPng = join(root, 'aidraw.png');
await writeFile(aidrawPng, makePng(640, 640, 11));
const aidrawLog = join(root, 'aidraw-calls.log');
const aidrawSlowFlag = join(root, 'aidraw-slow.flag');
let aidrawSlow = false;

const fakeDtCli = join(fakeBinDir, 'draw-things-cli');
await writeFile(fakeDtCli, [
  '#!/bin/sh',
  'cmd="$1"',
  'case "$cmd" in',
  '  --version)',
  '    echo "fake-dt-cli 26.1023.0"',
  '    exit 0;;',
  '  models)',
  '    cat <<\'MODELS\'',
  'Models directory: /fake/models',
  'MODEL                       NAME                     SOURCE    DOWNLOADED  HUGGING_FACE',
  '--------------------------  -----------------------  --------  ----------  ------------------------',
  'fake-z-image-turbo.ckpt     Fake Z Image Turbo       official  yes         -',
  'MODELS',
  '    exit 0;;',
  '  generate)',
  '    out=""',
  '    prev=""',
  '    for arg in "$@"; do',
  '      case "$prev" in --output|-o) out="$arg";; esac',
  '      prev="$arg"',
  '    done',
  `    [ -n "$out" ] && cp "${dtCliPng}" "$out"`,
  '    exit 0;;',
  'esac',
  'exit 0',
].join('\n'), { mode: 0o755 });

const fakeAidraw = join(fakeBinDir, 'aidraw');
await writeFile(fakeAidraw, [
  '#!/bin/sh',
  `echo "$*" >> "${aidrawLog}"`,
  'engine=""',
  'out=""',
  'prev=""',
  'for arg in "$@"; do',
  '  if [ "$prev" = "-e" ]; then engine="$arg"; fi',
  '  case "$prev" in -o|--output) out="$arg";; esac',
  '  prev="$arg"',
  'done',
  'if [ "$1" = "--version" ]; then',
  '  echo "aidraw 0.1.0"',
  '  exit 0',
  'fi',
  'if [ "$engine" = "drawthings" ] && echo "$*" | grep -q "list-models"; then',
  '  cat <<\'MODELS\'',
  'Models directory: /fake/models',
  'MODEL                       NAME                     SOURCE    DOWNLOADED  HUGGING_FACE',
  '--------------------------  -----------------------  --------  ----------  ------------------------',
  'fake-z-image-turbo.ckpt     Fake Z Image Turbo       official  yes         -',
  'MODELS',
  '  exit 0',
  'fi',
  'if [ -n "$out" ]; then',
  `  if [ -f "${aidrawSlowFlag}" ]; then sleep 4; fi`,
  `  cp "${aidrawPng}" "$out"`,
  'fi',
  'exit 0',
].join('\n'), { mode: 0o755 });

async function readAidrawCalls() {
  try {
    return (await readFile(aidrawLog, 'utf8')).split('\n').filter(Boolean);
  } catch (_) {
    return [];
  }
}

try {
  ollama = await makeFakeOllama();
  drawthings = await makeFakeDrawThings();
  comfyui = await makeFakeComfyUI();

  const host = await import(join(packageDir, 'index.js'));
  assert.equal(typeof host.apply, 'function', 'index.js must export apply(ctx, config)');
  assert(Array.isArray(host.inject), 'index.js must export inject');

  context = makeContext();
  host.apply(context.ctx, {
    backend: 'auto',
    drawthings: { baseUrl: drawthings.baseUrl },
    drawthingsCli: { binary: fakeDtCli, model: 'fake-z-image-turbo.ckpt' },
    aidraw: { binary: fakeAidraw },
    comfyui: { baseUrl: comfyui.baseUrl, pollMs: 100 },
    llm: {
      baseUrl: ollama.baseUrl,
      model: FAKE_MODEL,
      visionModel: FAKE_MODEL,
      temperature: 0.2,
      timeoutMs: 5000,
    },
    defaults: { width: 768, height: 768, steps: 20, cfg: 5, sampler: 'DPM++ 2M Karras' },
    maxTurns: 8,
    historyLimit: 20,
    preferenceLimit: 20,
  });
  const routes = context.routes;

  const expectedRoutes = [
    `${ROUTE}/health`,
    `${ROUTE}/session`,
    `${ROUTE}/history`,
    `${ROUTE}/upload`,
    `${ROUTE}/source`,
    `${ROUTE}/plan`,
    `${ROUTE}/generate`,
    `${ROUTE}/accept`,
    `${ROUTE}/preference/delete`,
    `${ROUTE}/cancel`,
    `${ROUTE}/image`,
    `${ROUTE}/backend`,
  ];
  for (const path of expectedRoutes) assert(routes.has(path), `route not registered: ${path}`);

  async function imageBytes(path) {
    const response = await call(routes, path);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(response.status, 200, `${path} -> ${response.status}`);
    return { response, bytes };
  }

  /* ---------- health: both engines + Ollama reachable ---------- */
  const health = await getJson(routes, `${ROUTE}/health`);
  assert.equal(health.ok, true);
  assert.equal(health.active, 'drawthings', 'auto mode should pick the drawthings engine when it is ready');
  assert.equal(health.backends.drawthings.reachable, true, `drawthings engine should be reachable via aidraw: ${JSON.stringify(health.backends.drawthings)}`);
  assert.equal(health.backends.drawthings.engine, 'aidraw');
  assert(Array.isArray(health.backends.drawthings.models) && health.backends.drawthings.models.length > 0, 'drawthings engine models missing');
  assert.equal(health.backends.comfy.reachable, true);
  assert.equal(health.backends.comfy.baseUrl, comfyui.baseUrl);
  assert(Array.isArray(health.backends.comfy.checkpoints) && health.backends.comfy.checkpoints.length > 0, 'comfy engine checkpoints missing');
  assert.equal(health.llm.reachable, true);
  assert.equal(health.llm.baseUrl, ollama.baseUrl);
  assert.equal(health.llm.model, FAKE_MODEL);
  assert.equal(health.llm.supportsVision, true, 'explicit vision model should be reported as vision-capable');
  assert(Array.isArray(health.llm.models), 'llm.models must be an array');
  assertSaneParams(health.defaults, 'health.defaults');
  assert.equal(health.defaults.width, 768);
  assert.equal(health.defaults.steps, 20);
  assert.equal(health.defaults.denoise, 0.55, 'health.defaults.denoise should default to 0.55');
  assert(Array.isArray(health.preferences) && health.preferences.length === 0, 'fresh install must have no preferences');
  assert(health.setup === undefined, 'health must not carry a setup precheck block (the panel shows no setup banner)');

  /* ---------- /plan: understanding only, nothing persisted ---------- */
  const planResponse = await postJson(routes, `${ROUTE}/plan`, { description: DESCRIPTION, aspect: '3:4', style: '电影感' });
  assert.equal(planResponse.ok, true);
  assert('sessionId' in planResponse, '/plan result must carry sessionId');
  const plan = planResponse.plan;
  assert(plan && typeof plan === 'object', '/plan result missing plan');
  assert.equal(plan.degraded, false, plan.degradedReason);
  assert(plan.brief && typeof plan.brief === 'object', 'plan.brief missing');
  assert.equal(typeof plan.brief.intent, 'string');
  assert(plan.brief.intent.length > 0);
  assert.equal(plan.brief.aspect, '3:4');
  assert.match(plan.positive, /FULLPLAN/, 'planning should use the model prompt');
  assert(plan.positive !== DESCRIPTION);
  assert.equal(typeof plan.negative, 'string');
  assert(plan.negative.length > 0);
  assertSaneParams(plan.params, 'plan.params');
  assert.equal(typeof plan.rationale, 'string');
  assert(plan.rationale.length > 0);
  assert(Array.isArray(plan.tags), 'plan.tags must be an array');
  const historyAfterPlan = await getJson(routes, `${ROUTE}/history`);
  assert.equal(historyAfterPlan.sessions.length, 0, '/plan must not persist a session');

  /* ---------- /generate create via Draw Things ---------- */
  const createResponse = await postJson(routes, `${ROUTE}/generate`, { description: DESCRIPTION, aspect: '3:4', style: '电影感' });
  assert.equal(createResponse.ok, true);
  const sessionId = createResponse.session.id;
  const turn1 = createResponse.turn;
  assert.match(sessionId, /^[A-Za-z0-9-]{4,80}$/u, `unexpected session id: ${sessionId}`);
  assert.equal(createResponse.session.id, sessionId);
  assert.equal(createResponse.session.task, 'txt2img');
  assert.equal(createResponse.session.turns.length, 1);
  assert.equal(turn1.index, 1);
  assert.equal(turn1.mode, 'create');
  assert.equal(turn1.task, 'txt2img');
  assert.equal(turn1.backend, 'drawthings');
  assert.equal(turn1.degraded, false, turn1.degradedReason);
  assert(turn1.positive.length > 0 && turn1.positive !== DESCRIPTION, 'create must use an enhanced prompt, not the raw description');
  assert.match(turn1.positive, /FULLPLAN/, 'create prompt should come from the plan');
  assert.equal(typeof turn1.negative, 'string');
  assert(turn1.negative.length > 0);
  assertSaneParams(turn1.params, 'turn1.params');
  assertSeed(turn1.seed, 'turn1');
  assert.equal(turn1.imageUrl, `${ROUTE}/image?session=${sessionId}&turn=${turn1.id}`);
  assert.equal(turn1.mime, 'image/png');
  assert.equal(turn1.accepted, false);
  assert(createResponse.session.title && createResponse.session.title.length > 0, 'session title missing');
  assert.equal(typeof createResponse.session.brief, 'object');

  /* The exact params handed to aidraw must match the stored turn. */
  const createCall = (await readAidrawCalls()).at(-1) || '';
  assert(createCall.includes('-e drawthings'), 'aidraw did not receive a drawthings generate');
  assert(createCall.includes(`--seed ${turn1.seed}`), 'aidraw seed must equal the turn seed');

  /* Image bytes are served from the no-store image route. */
  const image1 = await call(routes, `${ROUTE}/image?session=${encodeURIComponent(sessionId)}&turn=${encodeURIComponent(turn1.id)}`);
  assert.equal(image1.status, 200);
  assert.match(image1.headers.get('content-type') || '', /^image\/(png|jpeg)/);
  assert.equal(image1.headers.get('cache-control'), 'no-store');
  const bytes1 = Buffer.from(await image1.arrayBuffer());
  assert(bytes1.length > 32, `image bytes too short: ${bytes1.length}`);
  assert.deepEqual(bytes1.subarray(0, 8), PNG_SIGNATURE, 'image route did not return a PNG');

  /* Files land under $DSH_HOME/image-studio as documented. */
  const dataRoot = join(dshHome, 'image-studio');
  const sessionDir = join(dataRoot, 'sessions', sessionId);
  await stat(sessionDir).catch(() => assert.fail(`session directory missing: ${sessionDir}`));
  const storedSession = JSON.parse(await readFile(join(sessionDir, 'session.json'), 'utf8'));
  assert.equal(storedSession.id, sessionId);
  assert.equal(storedSession.turns.length, 1);
  const sessionFiles = await readdir(sessionDir);
  assert(sessionFiles.some((name) => /^(?:t|turn-?)0*1\.(?:png|jpe?g)$/iu.test(name)), `turn image file missing: ${sessionFiles.join(', ')}`);

  /* ---------- /generate refine with feedback + vision critique ---------- */
  const visionCallsBefore = ollama.state.visionCalls;
  const refineResponse = await postJson(routes, `${ROUTE}/generate`, { sessionId, feedback: FEEDBACK, useVision: true });
  assert.equal(refineResponse.ok, true);
  const turn2 = refineResponse.turn;
  const session2 = refineResponse.session;
  assert.equal(session2.id, sessionId);
  assert.equal(session2.turns.length, 2, 'refine must append a second turn');
  assert.equal(turn2.index, 2);
  assert.equal(turn2.mode, 'refine');
  assert.equal(turn2.task, 'txt2img');
  assert.equal(turn2.feedback, FEEDBACK);
  assert.notEqual(turn2.positive, turn1.positive, 'refine must change the positive prompt');
  assertSaneParams(turn2.params, 'turn2.params');
  assertSeed(turn2.seed, 'turn2');
  assert.equal(turn2.degraded, false, turn2.degradedReason);
  assert(turn2.critique && turn2.critique.trim().length > 0, 'vision critique was not folded into the turn');
  assert(ollama.state.visionCalls > visionCallsBefore, 'the vision model was never called for the refine turn');
  assert.equal(session2.turns[0].id, turn1.id, 'previous turn was not retained');
  assert.equal(session2.turns[0].positive, turn1.positive, 'previous turn prompt changed');
  assert.equal(session2.turns[0].accepted, false);

  /* Every turn keeps its own brief so the panel can replay history per round. */
  assert(turn1.brief && typeof turn1.brief === 'object' && turn1.brief.intent.length > 0, 'turn1 must archive its own brief');
  assert(turn2.brief && typeof turn2.brief === 'object' && turn2.brief.composition !== turn1.brief.composition,
    'each turn must archive the brief it was generated with, not a shared one');
  assert(Array.isArray(turn1.tags) && turn1.tags.length > 0, 'turn1 must archive its plan tags');
  assert(Array.isArray(turn2.tags), 'turn2 must archive its plan tags');
  const refineCall = (await readAidrawCalls()).at(-1) || '';
  assert(refineCall.includes('-e drawthings'), 'aidraw must receive the refined generate');

  const image2 = await call(routes, `${ROUTE}/image?session=${encodeURIComponent(sessionId)}&turn=${encodeURIComponent(turn2.id)}`);
  assert.equal(image2.status, 200);
  const bytes2 = Buffer.from(await image2.arrayBuffer());
  assert.deepEqual(bytes2.subarray(0, 8), PNG_SIGNATURE);
  const image1Again = await call(routes, `${ROUTE}/image?session=${encodeURIComponent(sessionId)}&turn=${encodeURIComponent(turn1.id)}`);
  assert.equal(image1Again.status, 200, 'first turn image must still be served after refine');

  /* ---------- /accept: mark accepted + distill a preference ---------- */
  const acceptResponse = await postJson(routes, `${ROUTE}/accept`, { sessionId, turnId: turn2.id });
  assert.equal(acceptResponse.ok, true);
  assert(acceptResponse.preference && typeof acceptResponse.preference === 'object', 'accept must return a distilled preference');
  assert.equal(typeof acceptResponse.preference.id, 'string');
  assert(acceptResponse.preference.text.length > 0, 'preference text is empty');
  const acceptedTurn = acceptResponse.session.turns.find((turn) => turn.id === turn2.id);
  assert(acceptedTurn && acceptedTurn.accepted === true, 'turn was not marked accepted');

  let healthWithPreference = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    healthWithPreference = await getJson(routes, `${ROUTE}/health`);
    if (healthWithPreference.preferences.some((item) => item.id === acceptResponse.preference.id)) break;
    await sleep(200);
  }
  assert(
    healthWithPreference.preferences.some((item) => item.id === acceptResponse.preference.id),
    'accepted preference did not appear in /health',
  );

  /* ---------- /history + /session ---------- */
  const history = await getJson(routes, `${ROUTE}/history?limit=20`);
  assert(Array.isArray(history.sessions));
  const summaryRow = history.sessions.find((row) => row.id === sessionId);
  assert(summaryRow, 'session missing from /history');
  const summaryTurns = Array.isArray(summaryRow.turns) ? summaryRow.turns.length : summaryRow.turns;
  assert.equal(summaryTurns, 2);
  assert.equal(summaryRow.backend, 'drawthings');
  assert.equal(summaryRow.task, 'txt2img');
  assert(summaryRow.cover && typeof summaryRow.cover.imageUrl === 'string', 'history summary cover missing');
  assert(summaryRow.brief && typeof summaryRow.brief === 'object', 'history summary brief missing');

  const sessionById = await getJson(routes, `${ROUTE}/session?id=${encodeURIComponent(sessionId)}`);
  assert.equal(sessionById.session.id, sessionId);
  assert.equal(sessionById.session.turns.length, 2);
  assert.equal(sessionById.session.turns[1].id, turn2.id);
  assert.equal(sessionById.session.turns[0].brief.intent, turn1.brief.intent, 'session replay must expose the archived per-turn brief');
  assert.equal(sessionById.session.turns[1].brief.composition, turn2.brief.composition, 'session replay must expose the archived per-turn brief');

  const latestSession = await getJson(routes, `${ROUTE}/session`);
  assert.equal(latestSession.session.id, sessionId);

  /* ---------- preference delete ---------- */
  const deleted = await postJson(routes, `${ROUTE}/preference/delete`, { id: acceptResponse.preference.id });
  assert.equal(deleted.ok, true);
  assert(Array.isArray(deleted.preferences));
  assert(!deleted.preferences.some((item) => item.id === acceptResponse.preference.id), 'deleted preference is still listed');
  const preferencesFile = JSON.parse(await readFile(join(dataRoot, 'preferences.json'), 'utf8'));
  const storedPreferences = Array.isArray(preferencesFile) ? preferencesFile : (preferencesFile.preferences ?? []);
  assert(!storedPreferences.some((item) => item.id === acceptResponse.preference.id), 'preference still persisted on disk');

  /* ---------- 图生图: /upload -> /source -> img2img create ---------- */
  const uploadResponse = await postJson(routes, `${ROUTE}/upload`, { dataUrl: INIT_DATA_URL, name: 'cat.png' });
  assert.equal(uploadResponse.ok, true);
  const imgSession = uploadResponse.session;
  const imgSource = uploadResponse.source;
  const imgSessionId = imgSession.id;
  assert.equal(imgSession.task, 'img2img');
  assert.equal(imgSession.turns.length, 0);
  assert(Array.isArray(imgSession.sources) && imgSession.sources.length === 1, 'upload must append one source');
  assert.equal(imgSource.id, imgSession.sources[0].id);
  assert.equal(imgSource.mime, 'image/png');
  assert.equal(imgSource.width, INIT_WIDTH, 'source width must be read from the PNG header');
  assert.equal(imgSource.height, INIT_HEIGHT, 'source height must be read from the PNG header');
  assert.equal(imgSource.url, `${ROUTE}/source?session=${imgSessionId}&source=${imgSource.id}`);
  assert.equal(imgSource.name, 'cat.png');
  assert(imgSession.title && imgSession.title.length > 0, 'img2img session title missing');

  const sourceResponse = await call(routes, imgSource.url);
  assert.equal(sourceResponse.status, 200);
  assert.match(sourceResponse.headers.get('content-type') || '', /^image\/png/);
  const sourceBytes = Buffer.from(await sourceResponse.arrayBuffer());
  assert.deepEqual(sourceBytes, INIT_PNG, 'GET /source must return the exact uploaded bytes');

  const storedImgSession = JSON.parse(await readFile(join(dataRoot, 'sessions', imgSessionId, 'session.json'), 'utf8'));
  assert.equal(storedImgSession.task, 'img2img');
  assert.equal(storedImgSession.sources.length, 1);
  assert.match(storedImgSession.sources[0].file, /^sources\/[^/]+\.(?:png|jpe?g|webp)$/iu, 'source file must live under sources/');
  await stat(join(dataRoot, 'sessions', imgSessionId, storedImgSession.sources[0].file)).catch(
    () => assert.fail('uploaded source file missing on disk'),
  );

  const imgVisionBefore = ollama.state.visionCalls;
  const imgCreate = await postJson(routes, `${ROUTE}/generate`, {
    task: 'img2img',
    sessionId: imgSessionId,
    sourceId: imgSource.id,
    description: '换成黄昏光线，保留猫的姿势',
    denoise: 0.6,
  });
  assert.equal(imgCreate.ok, true);
  assert.equal(imgCreate.session.id, imgSessionId);
  assert.equal(imgCreate.session.turns.length, 1);
  const imgTurn1 = imgCreate.turn;
  assert.equal(imgTurn1.index, 1);
  assert.equal(imgTurn1.task, 'img2img');
  assert.equal(imgTurn1.mode, 'create');
  assert.equal(imgTurn1.denoise, 0.6);
  assert.equal(imgTurn1.initFrom, `source:${imgSource.id}`);
  assert.equal(imgTurn1.initImageUrl, `${ROUTE}/image?session=${imgSessionId}&turn=${imgTurn1.id}&kind=init`);
  assert.equal(imgTurn1.backend, 'drawthings');
  assertSaneParams(imgTurn1.params, 'imgTurn1.params');
  assert.equal(imgTurn1.params.width, INIT_WIDTH, 'img2img frame must follow the init image, not the planner');
  assert.equal(imgTurn1.params.height, INIT_HEIGHT, 'img2img frame must follow the init image, not the planner');
  assertSeed(imgTurn1.seed, 'imgTurn1');
  assert(ollama.state.visionCalls > imgVisionBefore, 'img2img planning should look at the source image');

  /* img2img 现在经 aidraw：断言 --image 与 --strength 出现在调用行中。 */
  const imgCreateCall = (await readAidrawCalls()).at(-1) || '';
  assert(imgCreateCall.includes('-e drawthings') && imgCreateCall.includes('--image'), 'aidraw did not receive an img2img generate');
  assert(imgCreateCall.includes(`--strength ${imgTurn1.denoise}`), 'aidraw img2img strength must carry the denoise value');
  assert(imgCreateCall.includes(`--seed ${imgTurn1.seed}`));

  const imgOutput1 = await imageBytes(`${ROUTE}/image?session=${encodeURIComponent(imgSessionId)}&turn=${encodeURIComponent(imgTurn1.id)}`);
  assert.match(imgOutput1.response.headers.get('content-type') || '', /^image\/(png|jpeg)/);
  assert.deepEqual(imgOutput1.bytes.subarray(0, 8), PNG_SIGNATURE);
  const imgInit1 = await imageBytes(`${ROUTE}/image?session=${encodeURIComponent(imgSessionId)}&turn=${encodeURIComponent(imgTurn1.id)}&kind=init`);
  assert.deepEqual(imgInit1.bytes, INIT_PNG, 'kind=init must serve the exact init image used');
  assert.equal(imgInit1.response.headers.get('cache-control'), 'no-store');

  /* img2img refine with feedback, no sourceId: previous output becomes the init image. */
  const imgRefine = await postJson(routes, `${ROUTE}/generate`, { sessionId: imgSessionId, feedback: '天空换成紫色，其它别动' });
  assert.equal(imgRefine.ok, true);
  assert.equal(imgRefine.session.turns.length, 2);
  const imgTurn2 = imgRefine.turn;
  assert.equal(imgTurn2.index, 2);
  assert.equal(imgTurn2.task, 'img2img');
  assert.equal(imgTurn2.mode, 'refine');
  assert.equal(imgTurn2.initFrom, `turn:${imgTurn1.id}`, 'img2img refine must chain from the latest output');
  assert(imgTurn2.denoise >= 0.15 && imgTurn2.denoise <= 0.95, `refine denoise out of range: ${imgTurn2.denoise}`);
  assert.notEqual(imgTurn2.positive, imgTurn1.positive, 'img2img refine must change the prompt');
  assertSaneParams(imgTurn2.params, 'imgTurn2.params');
  const imgInit2 = await imageBytes(`${ROUTE}/image?session=${encodeURIComponent(imgSessionId)}&turn=${encodeURIComponent(imgTurn2.id)}&kind=init`);
  assert.deepEqual(imgInit2.bytes, imgOutput1.bytes, 'refine init must be the previous turn output');
  const imgRefineCall = (await readAidrawCalls()).at(-1) || '';
  assert(imgRefineCall.includes('--image') && imgRefineCall.includes(`--strength ${imgTurn2.denoise}`), 'refine must go through aidraw img2img');

  /* Explicit initTurnId pins an older output instead of the latest one. */
  const pinned = await postJson(routes, `${ROUTE}/generate`, {
    sessionId: imgSessionId,
    initTurnId: imgTurn1.id,
    description: '用第一版再画一版，构图相同',
    denoise: 0.4,
  });
  assert.equal(pinned.ok, true);
  const imgTurn3 = pinned.turn;
  assert.equal(imgTurn3.task, 'img2img');
  assert.equal(imgTurn3.initFrom, `turn:${imgTurn1.id}`);
  assert.equal(imgTurn3.denoise, 0.4);
  const pinnedInit = await imageBytes(`${ROUTE}/image?session=${encodeURIComponent(imgSessionId)}&turn=${encodeURIComponent(imgTurn3.id)}&kind=init`);
  assert.deepEqual(pinnedInit.bytes, imgOutput1.bytes, 'explicit initTurnId must pin that turn output');

  /* denoise is clamped to 0.15–0.95 on the stored turn and on the backend call. */
  const highDenoise = await postJson(routes, `${ROUTE}/generate`, {
    task: 'img2img',
    sessionId: imgSessionId,
    sourceId: imgSource.id,
    description: '大幅改动',
    denoise: 9,
  });
  assert.equal(highDenoise.ok, true);
  assert.equal(highDenoise.turn.denoise, 0.95, 'denoise above 0.95 must clamp to 0.95');
  assert((await readAidrawCalls()).at(-1).includes('--strength 0.95'), 'clamped 0.95 must reach aidraw');
  const lowDenoise = await postJson(routes, `${ROUTE}/generate`, {
    task: 'img2img',
    sessionId: imgSessionId,
    sourceId: imgSource.id,
    description: '轻微调整',
    denoise: 0,
  });
  assert.equal(lowDenoise.ok, true);
  assert.equal(lowDenoise.turn.denoise, 0.15, 'denoise below 0.15 must clamp to 0.15');
  assert((await readAidrawCalls()).at(-1).includes('--strength 0.15'), 'clamped 0.15 must reach aidraw');

  /* ComfyUI img2img: multipart /upload/image + LoadImage → VAEEncode → KSampler(denoise). */
  const comfyUploadsBefore = comfyui.state.uploadCount;
  const comfyImg = await postJson(routes, `${ROUTE}/generate`, {
    task: 'img2img',
    sessionId: imgSessionId,
    sourceId: imgSource.id,
    description: '改成水彩风格',
    denoise: 0.7,
    backend: 'comfy',
  });
  assert.equal(comfyImg.ok, true);
  assert.equal(comfyImg.turn.backend, 'comfy');
  assert.equal(comfyImg.turn.task, 'img2img');
  assert.equal(comfyui.state.uploadCount, comfyUploadsBefore + 1, 'ComfyUI did not receive POST /upload/image');
  const comfyUpload = comfyui.lastUpload();
  assert.match(comfyUpload.contentType, /^multipart\/form-data;.*boundary=/iu);
  assert.deepEqual(comfyUpload.bytes, INIT_PNG, 'ComfyUI upload must contain the exact init bytes');
  const uploadText = comfyUpload.raw.toString('latin1');
  assert.match(uploadText, /name="overwrite"/u);
  assert.match(uploadText, /name="type"/u);
  assert.match(uploadText, /input/u);
  const comfyImgGraphBody = comfyui.lastPrompt();
  const comfyImgGraph = comfyImgGraphBody.prompt || comfyImgGraphBody;
  const comfyImgGraphText = JSON.stringify(comfyImgGraph);
  for (const nodeClass of ['CheckpointLoaderSimple', 'CLIPTextEncode', 'LoadImage', 'VAEEncode', 'KSampler', 'VAEDecode', 'SaveImage']) {
    assert(comfyImgGraphText.includes(nodeClass), `ComfyUI img2img graph is missing ${nodeClass}`);
  }
  assert(!comfyImgGraphText.includes('EmptyLatentImage'), 'ComfyUI img2img graph must not use EmptyLatentImage');
  const imgNodes = Object.values(comfyImgGraph);
  const loadImageNode = imgNodes.find((node) => node && node.class_type === 'LoadImage');
  assert(loadImageNode, 'ComfyUI img2img graph has no LoadImage node');
  assert(String(loadImageNode.inputs.image).includes(comfyUpload.name), 'LoadImage must reference the uploaded file');
  const imgKsampler = imgNodes.find((node) => node && node.class_type === 'KSampler');
  assert(imgKsampler, 'ComfyUI img2img graph has no KSampler node');
  assert.equal(imgKsampler.inputs.denoise, 0.7, 'ComfyUI KSampler denoise must match the turn');
  const comfyImgOutput = await imageBytes(`${ROUTE}/image?session=${encodeURIComponent(imgSessionId)}&turn=${encodeURIComponent(comfyImg.turn.id)}`);
  assert.deepEqual(comfyImgOutput.bytes.subarray(0, 8), PNG_SIGNATURE);

  /* ---------- task filters on /session and /history ---------- */
  const txtLatest = await getJson(routes, `${ROUTE}/session?task=txt2img`);
  assert.equal(txtLatest.session.id, sessionId, '/session?task=txt2img should return the txt2img session');
  const imgLatest = await getJson(routes, `${ROUTE}/session?task=img2img`);
  assert.equal(imgLatest.session.id, imgSessionId, '/session?task=img2img should return the img2img session');
  const txtHistory = await getJson(routes, `${ROUTE}/history?task=txt2img&limit=20`);
  assert(txtHistory.sessions.every((row) => row.task === 'txt2img'), 'history?task=txt2img leaked another task');
  assert(txtHistory.sessions.some((row) => row.id === sessionId));
  assert(!txtHistory.sessions.some((row) => row.id === imgSessionId), 'img2img session leaked into txt2img history');
  const imgHistory = await getJson(routes, `${ROUTE}/history?task=img2img&limit=20`);
  assert(imgHistory.sessions.every((row) => row.task === 'img2img'), 'history?task=img2img leaked another task');
  assert(imgHistory.sessions.some((row) => row.id === imgSessionId));
  assert(!imgHistory.sessions.some((row) => row.id === sessionId), 'txt2img session leaked into img2img history');

  /* ---------- img2img / upload validation ---------- */
  const needImage = await expectJsonError(
    routes,
    `${ROUTE}/generate`,
    postInit({ task: 'img2img', description: '没有参考图也想图生图' }),
    [400],
    'img2img without any init image',
  );
  assert.equal(needImage.error.code, 'need-image', 'missing init image should report code need-image');
  await expectJsonError(
    routes,
    `${ROUTE}/generate`,
    postInit({ task: 'img2img', sessionId: imgSessionId, sourceId: 'missing-source', description: '来源不存在' }),
    [400, 404],
    'img2img with unknown sourceId',
  );
  await expectJsonError(
    routes,
    `${ROUTE}/upload`,
    postInit({ dataUrl: 'data:text/plain;base64,aGVsbG8=' }),
    [400],
    'upload of a non-image data URL',
  );
  await expectJsonError(
    routes,
    `${ROUTE}/upload`,
    postInit({ dataUrl: 'not-a-data-url' }),
    [400],
    'upload of an invalid data URL',
  );
  await expectJsonError(
    routes,
    `${ROUTE}/upload`,
    postInit({ dataUrl: OVERSIZE_DATA_URL }),
    [400, 413],
    'upload larger than 12 MB',
  );
  await expectJsonError(
    routes,
    `${ROUTE}/source?session=${encodeURIComponent('../../etc')}&source=${encodeURIComponent('../passwd')}`,
    {},
    [400, 404],
    'source traversal ids',
  );
  await expectJsonError(
    routes,
    `${ROUTE}/source?session=${encodeURIComponent(imgSessionId)}&source=${encodeURIComponent('missing-source')}`,
    {},
    [400, 404],
    'source with unknown id',
  );
  await expectJsonError(
    routes,
    `${ROUTE}/image?session=${encodeURIComponent(imgSessionId)}&turn=${encodeURIComponent('../../etc/passwd')}&kind=init`,
    {},
    [400, 404],
    'image kind=init traversal turn id',
  );
  await expectJsonError(
    routes,
    `${ROUTE}/image?session=${encodeURIComponent(sessionId)}&turn=${encodeURIComponent(turn1.id)}&kind=init`,
    {},
    [400, 404],
    'kind=init on a txt2img turn',
  );
  await expectJsonError(
    routes,
    `${ROUTE}/upload`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not json' },
    [400],
    'malformed upload JSON',
  );

  /* ---------- drawthings engine via aidraw: full arg mapping ---------- */
  const cliHealth = await getJson(routes, `${ROUTE}/health`);
  assert.equal(cliHealth.backends.drawthings.reachable, true, 'drawthings engine must probe reachable via aidraw');
  assert.equal(cliHealth.backends.drawthings.model, 'fake-z-image-turbo.ckpt');
  assert.equal(cliHealth.backends.drawthings.engine, 'aidraw');
  assert.equal(cliHealth.aidraw.available, true, 'health must report aidraw availability');
  assert.equal(cliHealth.aidraw.binary, fakeAidraw);

  const cliCallsBefore = (await readAidrawCalls()).length;
  const cliResponse = await postJson(routes, `${ROUTE}/generate`, {
    description: 'aidraw 后端直出测试',
    backend: 'drawthings',
    seed: 77,
  });
  assert.equal(cliResponse.ok, true);
  assert.equal(cliResponse.turn.backend, 'drawthings');
  assert.equal(cliResponse.turn.model, 'fake-z-image-turbo.ckpt');
  assertSeed(cliResponse.turn.seed);
  const cliImage = await call(routes, `${ROUTE}/image?session=${encodeURIComponent(cliResponse.session.id)}&turn=${encodeURIComponent(cliResponse.turn.id)}`);
  assert.equal(cliImage.status, 200);
  assert.deepEqual(Buffer.from(await cliImage.arrayBuffer()).subarray(0, 8), PNG_SIGNATURE);

  const cliCalls = (await readAidrawCalls()).slice(cliCallsBefore);
  assert.equal(cliCalls.length, 1, `expected exactly one aidraw invocation, got ${cliCalls.length}`);
  const cliArgs = cliCalls[0].split(' ');
  /* 提示词含空格：日志按空格切开后无法整体还原，改为断言 flag 后紧跟首词 + 完整命令行包含。 */
  const argOf = (flag) => {
    const at = cliArgs.indexOf(flag);
    return at >= 0 ? cliArgs[at + 1] : undefined;
  };
  const cliCall = cliCalls[0];
  assert.equal(argOf('-e'), 'drawthings', 'aidraw must be invoked with -e drawthings');
  assert.equal(argOf('--model'), 'fake-z-image-turbo.ckpt');
  assert(cliCall.includes(`--prompt ${cliResponse.turn.positive}`), `aidraw call must carry the turn prompt: ${cliCall.slice(0, 200)}`);
  assert.equal(argOf('--seed'), String(cliResponse.turn.seed));
  assert(argOf('--output') && argOf('--output').endsWith('.png'), 'aidraw must write to a .png output');
  /* Turbo-family model: steps 8 / cfg 1 must be mapped through aidraw. */
  assert.equal(argOf('--steps'), '8');
  assert.equal(argOf('--cfg'), '1');
  assert.equal(argOf('--dt-cli'), fakeDtCli, 'aidraw must be pointed at the configured draw-things-cli');
  const ddIndex = cliArgs.indexOf('--');
  assert(ddIndex > 0, 'aidraw passthrough separator missing');
  const passthrough = cliArgs.slice(ddIndex + 1);
  assert(passthrough.includes('--local'), 'passthrough must include --local');
  assert(passthrough.includes('--no-download-missing'), 'passthrough must include --no-download-missing (never download models)');
  /* 提示词含空格导致按空格切分后 flag 数不可精确计数；改为断言 `--` 之后的尾部即透传参数。 */
  assert(cliCall.endsWith('-- --local --no-download-missing'), `the aidraw invocation must end with the passthrough flags: ...${cliCall.slice(-80)}`);

  /* ---------- drawthings engine img2img via aidraw: --image + --strength ---------- */
  const cliImgResponse = await postJson(routes, `${ROUTE}/generate`, {
    task: 'img2img',
    sourceId: imgSource.id,
    sessionId: imgSessionId,
    description: '把猫改成橘猫',
    denoise: 0.4,
    backend: 'drawthings',
  });
  assert.equal(cliImgResponse.ok, true);
  assert.equal(cliImgResponse.turn.backend, 'drawthings');
  const cliImgCalls = (await readAidrawCalls()).slice(cliCallsBefore + 1);
  assert.equal(cliImgCalls.length, 1, 'expected one aidraw call for the img2img turn');
  const cliImgArgs = cliImgCalls[0].split(' ');
  const imgAt = cliImgArgs.indexOf('--image');
  assert(imgAt > 0, 'aidraw img2img must pass --image');
  assert(/\.(?:png|jpe?g|webp)$/iu.test(cliImgArgs[imgAt + 1]), 'aidraw --image must point at a real image file');
  const strengthAt = cliImgArgs.indexOf('--strength');
  assert(strengthAt > 0, 'aidraw img2img must pass --strength');
  assert.equal(cliImgArgs[strengthAt + 1], '0.4', '--strength must carry the denoise value');
  const cliInitImage = await call(routes, `${ROUTE}/image?session=${encodeURIComponent(imgSessionId)}&turn=${encodeURIComponent(cliImgResponse.turn.id)}&kind=init`);
  assert.equal(cliInitImage.status, 200, 'cli img2img turn must keep the init snapshot');

  /* ---------- explicit ComfyUI backend ---------- */
  const comfyBefore = comfyui.state.promptCount;
  const comfyResponse = await postJson(routes, `${ROUTE}/generate`, { description: '窗边晒太阳的猫，水彩风格', backend: 'comfy' });
  assert.equal(comfyResponse.ok, true);
  assert.equal(comfyResponse.turn.backend, 'comfy');
  assert.equal(comfyui.state.promptCount, comfyBefore + 1, 'ComfyUI did not receive /prompt');
  const graphText = JSON.stringify(comfyui.lastPrompt());
  for (const nodeClass of ['CheckpointLoaderSimple', 'CLIPTextEncode', 'EmptyLatentImage', 'KSampler', 'VAEDecode', 'SaveImage']) {
    assert(graphText.includes(nodeClass), `ComfyUI graph is missing ${nodeClass}`);
  }
  assert(graphText.includes('fake-checkpoint.safetensors'), 'ComfyUI graph did not use the discovered checkpoint');
  assert.equal(comfyResponse.turn.mime, 'image/png');
  const comfyImage = await call(routes, `${ROUTE}/image?session=${encodeURIComponent(comfyResponse.session.id)}&turn=${encodeURIComponent(comfyResponse.turn.id)}`);
  assert.equal(comfyImage.status, 200);
  assert.deepEqual(Buffer.from(await comfyImage.arrayBuffer()).subarray(0, 8), PNG_SIGNATURE);

  /* ---------- missing aidraw → clear error, no silent fallback ---------- */
  const legacyHealthHost = await import(join(packageDir, 'index.js'));
  legacyContext = makeContext();
  legacyHealthHost.apply(legacyContext.ctx, {
    backend: 'drawthings',
    drawthingsCli: { binary: fakeDtCli, model: 'fake-z-image-turbo.ckpt' },
    aidraw: { enabled: false },
    comfyui: { baseUrl: 'http://127.0.0.1:1' },
    llm: { enabled: false },
    dataDir: join(root, 'legacy-home'),
  });
  const legacyCalls = (await readAidrawCalls()).length;
  const legacyError = await expectJsonError(legacyContext.routes, `${ROUTE}/generate`, postInit({ description: '没有 aidraw 的情形', seed: 8 }), [502], 'generate without aidraw');
  assert(['aidraw-missing', 'backend-offline'].includes(legacyError.error.code), `expected a clear no-aidraw failure, got ${JSON.stringify(legacyError.error)}`);
  assert(/aidraw|not-installed|不可用/u.test(legacyError.error.message), 'failure message must point at the missing aidraw command');
  assert.equal((await readAidrawCalls()).length, legacyCalls, 'aidraw must not be invoked when it is disabled');

  /* ---------- degraded path: Ollama dies, generation still succeeds ---------- */
  const chatCallsBeforeShutdown = ollama.calls();
  await closeServer(ollama.server);
  ollama = null;
  await sleep(150);
  const degradedResponse = await postJson(routes, `${ROUTE}/generate`, { description: '降级路径测试：没有 Ollama 也要能出图' });
  assert.equal(degradedResponse.ok, true, 'LLM failure must not turn into a 500');
  const degradedTurn = degradedResponse.turn;
  assert.equal(degradedTurn.degraded, true, 'turn must be flagged degraded when Ollama is down');
  assert(typeof degradedTurn.degradedReason === 'string' && degradedTurn.degradedReason.length > 0, 'degradedReason missing');
  assert(degradedTurn.positive && degradedTurn.positive.length > 0, 'degraded generation has no prompt');
  assert.equal(degradedTurn.backend, 'drawthings');
  const degradedImage = await call(routes, `${ROUTE}/image?session=${encodeURIComponent(degradedResponse.session.id)}&turn=${encodeURIComponent(degradedTurn.id)}`);
  assert.equal(degradedImage.status, 200, 'degraded generation produced no image');
  assert.deepEqual(Buffer.from(await degradedImage.arrayBuffer()).subarray(0, 8), PNG_SIGNATURE);

  /* ---------- busy 409 + /cancel releases the generation lock ---------- */
  await writeFile(aidrawSlowFlag, 'slow\n');
  aidrawSlow = true;
  const aidrawCallsBeforeSlow = (await readAidrawCalls()).length;
  const slowRequest = call(routes, `${ROUTE}/generate`, postInit({ description: '慢速生成测试' }))
    .then((response) => ({ response }), (error) => ({ error }));
  const startedAt = Date.now();
  while ((await readAidrawCalls()).length <= aidrawCallsBeforeSlow && Date.now() - startedAt < 10000) {
    await sleep(50);
  }
  assert((await readAidrawCalls()).length > aidrawCallsBeforeSlow, 'slow generation never reached aidraw');

  const busyResponse = await call(routes, `${ROUTE}/generate`, postInit({ description: '并发请求应该被拒绝' }));
  const busyText = await busyResponse.text();
  assert.equal(busyResponse.status, 409, `second concurrent generate should be 409, got ${busyResponse.status}: ${busyText}`);
  let busyBody;
  try { busyBody = JSON.parse(busyText); } catch (_) { assert.fail(`busy response is not JSON: ${busyText}`); }
  assert.equal(busyBody.ok, false);
  assert.equal(busyBody.error.code, 'busy');

  const cancelResponse = await postJson(routes, `${ROUTE}/cancel`, {});
  assert.equal(cancelResponse.ok, true);
  assert.equal(cancelResponse.cancelled, true, 'cancel should report an aborted generation');

  const slowOutcome = await Promise.race([
    slowRequest,
    sleep(15000).then(() => {
      throw new Error('slow generation did not settle within 15s after /cancel');
    }),
  ]);
  if (slowOutcome.error) {
    /* A route may reject the aborted fetch instead of returning a JSON error. */
    assert.equal(slowOutcome.error.name, 'AbortError', `slow generation failed unexpectedly: ${slowOutcome.error}`);
  } else {
    const slowResult = slowOutcome.response;
    const slowText = await slowResult.text();
    assert.notEqual(slowResult.status, 409, 'the aborted generation must not report busy');
    let slowBody = null;
    try { slowBody = slowText === '' ? null : JSON.parse(slowText); } catch (_) { /* response body may be empty */ }
    if (slowResult.status === 200) {
      assert(slowBody && slowBody.ok === true, `cancelled generate returned 200 without ok: ${slowText.slice(0, 300)}`);
    } else {
      assert(slowBody && slowBody.ok === false && slowBody.error && typeof slowBody.error.code === 'string', `cancelled generate returned ${slowResult.status}: ${slowText.slice(0, 300)}`);
    }
  }

  aidrawSlow = false;
  await rm(aidrawSlowFlag, { force: true }).catch(() => {});
  const afterCancel = await postJson(routes, `${ROUTE}/generate`, { description: '取消后重新生成' });
  assert.equal(afterCancel.ok, true, 'generation lock was not released after /cancel');
  assert.deepEqual(Buffer.from(await (await call(routes, `${ROUTE}/image?session=${encodeURIComponent(afterCancel.session.id)}&turn=${encodeURIComponent(afterCancel.turn.id)}`)).arrayBuffer()).subarray(0, 8), PNG_SIGNATURE);

  const idleCancel = await postJson(routes, `${ROUTE}/cancel`, {});
  assert.equal(idleCancel.ok, true);
  assert.equal(typeof idleCancel.cancelled, 'boolean');

  /* ---------- invalid input / traversal handling ---------- */
  await expectJsonError(
    routes,
    `${ROUTE}/plan`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not json' },
    [400],
    'malformed JSON body',
  );
  const emptyPlanError = await expectJsonError(routes, `${ROUTE}/plan`, postInit({}), [400], 'plan without description');
  assert.equal(emptyPlanError.error.code, 'bad-request');
  const emptyGenerateError = await expectJsonError(routes, `${ROUTE}/generate`, postInit({}), [400], 'generate without input');
  assert.equal(emptyGenerateError.error.code, 'bad-request');

  await expectJsonError(
    routes,
    `${ROUTE}/session?id=${encodeURIComponent('../../etc/passwd')}`,
    {},
    [400, 404],
    'session traversal id',
  );
  await expectJsonError(
    routes,
    `${ROUTE}/image?session=${encodeURIComponent('../../etc')}&turn=${encodeURIComponent('../passwd')}`,
    {},
    [400, 404],
    'image traversal id',
  );
  await expectJsonError(
    routes,
    `${ROUTE}/image?session=${encodeURIComponent(sessionId)}&turn=${encodeURIComponent('../../etc/passwd')}`,
    {},
    [400, 404],
    'image traversal turn id',
  );
  await expectJsonError(
    routes,
    `${ROUTE}/image?session=${encodeURIComponent(sessionId)}&turn=missing-turn`,
    {},
    [400, 404],
    'image for unknown turn',
  );
  await expectJsonError(
    routes,
    `${ROUTE}/accept`,
    postInit({ sessionId: 'no-such-session', turnId: turn1.id }),
    [404],
    'accept unknown session',
  );

  /* ---------- unload: routes and effects are cleaned up ---------- */
  assert.equal(context.routes.size, expectedRoutes.length);
  context.ctx.dispose();
  assert.equal(context.routes.size, 0, 'routes were not disposed on unload');
  assert.equal(context.effects.length, 0, 'effects were not disposed on unload');
  assert(ollama === null);

  console.log(`PASS image-studio host harness (${expectedRoutes.length} routes, fake Ollama calls: ${chatCallsBeforeShutdown}, fake Draw Things txt2img: ${drawthings.state.txt2imgCount}, img2img: ${drawthings.state.img2imgCount}, fake ComfyUI prompts: ${comfyui.state.promptCount}, uploads: ${comfyui.state.uploadCount}, fake aidraw calls: ${(await readAidrawCalls()).length})`);
} catch (error) {
  console.error('FAIL image-studio host harness');
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
} finally {
  try { context?.ctx.dispose(); } catch (_) { /* already torn down */ }
  try { legacyContext?.ctx.dispose(); } catch (_) { /* already torn down */ }
  await closeServer(ollama?.server);
  await closeServer(drawthings?.server);
  await closeServer(comfyui?.server);
  await rm(root, { recursive: true, force: true });
}
