/**
 * Host half of the Image Studio bundle.
 *
 * The browser only collects the idea, the feedback and the knobs. This half owns
 * the machine-local pipeline:
 *
 *   描述/反馈  →  本机 Ollama（意图理解 / 提示词 / 参数）  →  Draw Things 或 ComfyUI
 *              ←  图片 → 本地视觉模型质检 → 下一轮细化
 *
 * Every browser call goes through an authenticated exact Fetch route under
 * `/api/image-studio/...` registered on the Connection service.  Image bytes are
 * served by `GET /image` so the panel can use a plain <img src>.
 */
import { execFile } from 'node:child_process';
import { accessSync, constants, existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ROUTE_PREFIX = '/api/image-studio';
const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_DRAWTHINGS_URL = 'http://127.0.0.1:7860';
const DEFAULT_COMFY_URLS = ['http://127.0.0.1:8188', 'http://127.0.0.1:8000'];
const MAX_BODY_BYTES = 512 * 1024;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_UPLOAD_BODY_BYTES = 18 * 1024 * 1024;
const DEFAULT_DENOISE = 0.55;
const SOURCE_ID = /^s[0-9a-f]{8}$/u;

const DEFAULT_NEGATIVE = [
  'lowres', 'blurry', 'jpeg artifacts', 'watermark', 'text', 'signature',
  'extra fingers', 'deformed hands', 'bad anatomy', 'worst quality',
  'oversaturated', 'plastic skin',
].join(', ');

const SAMPLERS = [
  'DPM++ 2M Karras',
  'Euler a',
  'DPM++ SDE Karras',
  'UniPC',
  'DDIM',
  'PLMS',
  'Euler',
];

const ASPECTS = {
  '1:1': [1024, 1024],
  '4:3': [1152, 896],
  '3:4': [896, 1152],
  '16:9': [1344, 768],
  '9:16': [768, 1344],
  '3:2': [1216, 832],
  '2:3': [832, 1216],
};

const COMFY_SAMPLERS = {
  'DPM++ 2M Karras': ['dpmpp_2m', 'karras'],
  'Euler a': ['euler_ancestral', 'normal'],
  'DPM++ SDE Karras': ['dpmpp_sde', 'karras'],
  UniPC: ['uni_pc', 'normal'],
  DDIM: ['ddim', 'normal'],
  PLMS: ['plms', 'normal'],
  Euler: ['euler', 'normal'],
};

const TURBO_MODEL = /(?:turbo|z[_-]?image|schnell|lightning|lcm|flash|hyper)/iu;

const STYLE_HINTS = [
  [/电影|影感|cinematic/iu, 'cinematic still, anamorphic lens, film grain'],
  [/写实|真实|photoreal|realistic/iu, 'photorealistic, natural texture, sharp focus'],
  [/动漫|二次元|anime/iu, 'anime illustration, clean line art, vibrant colors'],
  [/插画|illustration/iu, 'detailed illustration, painterly rendering'],
  [/水彩|watercolor/iu, 'watercolor painting, soft washes, paper texture'],
  [/赛博|cyberpunk|霓虹/iu, 'cyberpunk, neon glow, futuristic city'],
  [/国风|水墨|ink/iu, 'Chinese ink painting, elegant negative space'],
  [/油画|oil paint/iu, 'oil painting, visible brush strokes, rich texture'],
  [/极简|minimal/iu, 'minimalist composition, clean background'],
  [/复古|retro|胶片/iu, 'retro film photography, analog color grading'],
  [/3d|三维|render/iu, '3d render, soft global illumination'],
  [/像素|pixel/iu, 'pixel art, crisp pixels, limited palette'],
];

const PLAN_SYSTEM = [
  '你是一位资深 AI 绘画提示词工程师，同时擅长理解用户意图。用户会用中文或英文描述想要的画面，可能只有一句话。',
  '你的任务：',
  '1. 推断用户真正想要的主体、场景、风格、构图、光线、色彩和情绪。信息不足时，做出协调、具体、可执行的选择，而不是罗列所有可能。',
  '2. 写一条英文正向提示词：具体视觉名词加有区分度的修饰；结构依次为主体与动作、外观细节、环境、光线、镜头/构图、风格与画质；40-90 个英文词。不要堆砌 "masterpiece, best quality, 8k" 这类空话。',
  '3. 写一条精简的英文负向提示词（10-20 个词组），针对常见缺陷与所选风格的常见弱点。',
  '4. 根据画幅与「用户选择的绘画风格」一并给出参数：width/height 为 64 的倍数且在 512-1536 之间；steps 24-32；sampler 从给定列表选择。参数必须匹配所选风格：写实摄影/电影摄影→cfg 4.5-5.5、steps 28-32、sampler 偏 DPM++ 2M Karras 或 DPM++ SDE Karras；动漫/插画/油画/水彩等手绘风格→cfg 5.5-7、steps 24-30；3D 渲染→cfg 6-7、steps 28-32；极简平面→cfg 5-6、steps 24-28。没有明确风格时按描述推断：写实可低、风格化可高。',
  '5. brief 各字段用简短中文（每个不超过 30 字），intent 用一句话概括用户意图；brief.style 写所选风格。',
  '6. rationale 用中文 2-3 句，解释你如何把用户描述转成这些选择，以及参数为何匹配该风格，不要复述提示词。',
  '只输出一个 JSON 对象，不要 Markdown 代码块。字段：',
  '{"brief":{"intent":"","subject":"","style":"","composition":"","lighting":"","palette":"","aspect":"1:1"},"positive":"","negative":"","params":{"width":1024,"height":1024,"steps":28,"cfg":5,"sampler":"DPM++ 2M Karras"},"rationale":"","tags":[""]}',
].join('\n');

const REFINE_SYSTEM = [
  '你是 AI 绘画的迭代导演。用户已经看到上一轮生成的图片，现在用自然语言提出修改意见。',
  '你要：',
  '1. 先准确理解反馈：它属于主体/风格/构图/光线/色彩/细节/画幅/负面元素中的哪一类；如果与原始意图冲突，以用户最新反馈为准。',
  '2. 只修改反馈要求的部分，保留上一轮提示词中未被要求改变的其它内容，不要整体重写导致画面漂移。',
  '3. 必要时调整参数：要更多细节→steps 加 4~8；太糊或不够像→cfg 加 0.5~1；过曝或太锐→cfg 减 0.5；构图或画幅变化→改 width/height。',
  '4. 输出完整的新 positive/negative（英文）与完整 params，而不是 diff；不要输出 seed。',
  '5. understood 用一句中文复述用户想要的变化；changes 用 2-4 条中文短句说明改了什么；rationale 用中文 2-3 句解释为什么这样改。',
  '6. 如果这是图生图（以上一张结果为底图继续改），额外给出 denoise（0.15-0.95）：只微调光线/细节用 0.25-0.4；换背景/局部风格用 0.55-0.75；彻底风格跃迁（如动漫→真人、素描→照片、画风完全转变）必须用 0.8-0.95——低 denoise 无法去除原画风，用户反复要求风格转换而不成功时尤其如此。',
  '7. brief 输出本轮更新后的简报（沿用原文时原样填入，不要留空）；tags 给本轮 2-4 个中文标签。',
  '只输出 JSON：',
  '{"understood":"","changes":["",""],"brief":{"intent":"","subject":"","style":"","composition":"","lighting":"","palette":"","aspect":"1:1"},"tags":["",""],"positive":"","negative":"","params":{"width":1024,"height":1024,"steps":28,"cfg":5,"sampler":"DPM++ 2M Karras"},"denoise":0.55,"rationale":""}',
].join('\n');

const IMG_PLAN_SYSTEM = [
  '你是图生图（img2img）导演。用户会给一张参考图（可能还有一句修改描述），要在保留原图核心内容的前提下生成新图。',
  '你的任务：',
  '1. 结合参考图分析理解主体、构图、光线、色彩和风格；用户没有要求改变的主体身份、姿态、构图关系与场景要保留。',
  '2. 写目标画面的英文提示词（40-90 个英文词），描述最终画面，不要写 "make it" "turn this into" 这类指令，也不要复述原图。',
  '3. 写 10-20 个词组的英文负向提示词，加入要避免的漂移与缺陷（identity change, distorted face, extra limbs, changed composition 等）。',
  '4. params 的 width/height 使用参考图尺寸（64 的倍数，512-1536）；steps 24-32；sampler 从给定列表选择；cfg 按「用户选择的绘画风格」取值：写实/摄影类 4.5-5.5，手绘与风格化类 5.5-7。',
  '5. denoise 是重绘幅度：只改光线/细节用 0.25-0.4；换背景/局部风格用 0.55-0.75；彻底风格跃迁（参考图是动漫/插画而目标画风完全不同，如真人化）必须用 0.8-0.95——低 denoise 无法去除原画风。',
  '6. brief 各字段用简短中文；rationale 用中文 2-3 句，说明保留了原图的什么、改了什么。',
  '只输出一个 JSON 对象，不要 Markdown 代码块。字段：',
  '{"brief":{"intent":"","subject":"","style":"","composition":"","lighting":"","palette":"","aspect":"1:1"},"positive":"","negative":"","params":{"width":1024,"height":1024,"steps":28,"cfg":5,"sampler":"DPM++ 2M Karras"},"denoise":0.55,"rationale":"","tags":["",""]}',
].join('\n');

const VISION_SYSTEM = [
  '你是图像质检员。请客观描述这张图：主体、构图、光影、色彩、风格，以及明显缺陷（手指、文字、畸变、脏点）。',
  '不要评价是否好看，不要客套，用中文 120 字以内。',
].join('\n');

const PREFERENCE_SYSTEM = [
  '你是审美偏好记录员。根据一张被用户认可的作品信息，提炼一条不超过 40 字的中文审美偏好，',
  '写成可复用的短语（风格/光线/色彩/构图倾向），不要包含具体主体。只输出 JSON：{"preference":""}',
].join('\n');

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

function asInt(value, fallback) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function asFloat(value, fallback) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(number, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, number));
}

function snap(value) {
  return clamp(Math.round(value / 64) * 64, 256, 2048);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function withoutTrailingSlash(value) {
  return String(value).replace(/\/+$/u, '');
}

function findExecutable(configured, name, fallbacks) {
  const candidates = [];
  if (configured) candidates.push(configured);
  if (process.env.DSH_DRAWTHINGS_CLI_BIN) candidates.push(process.env.DSH_DRAWTHINGS_CLI_BIN);
  candidates.push(...fallbacks);
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
  for (const directory of String(process.env.PATH ?? '').split(':')) {
    if (!directory) continue;
    const candidate = join(directory, name);
    try {
      if (!existsSync(candidate)) continue;
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch (_) {
      /* try the next PATH entry */
    }
  }
  return '';
}

/* aidraw 是本机文生图统一 CLI（DrawUtils 项目），也是本插件唯一的本地 CLI 对接点：
 * 它自己处理 draw-things-cli 的查找与调用、参数映射、无头适配与超时。
 * 查找顺序：显式配置 → 环境变量 → Homebrew → DrawUtils 项目目录 → PATH。 */
function findAidrawBinary(configured) {
  const candidates = [
    configured,
    process.env.DSH_IMAGE_STUDIO_AIDRAW_BIN,
    '/Users/zephyr/bin/aidraw',
    '/opt/homebrew/bin/aidraw',
    '/usr/local/bin/aidraw',
    join(homedir(), 'bin', 'aidraw'),
    join(homedir(), 'Documents/Projects/ZephyrScript/Go/DrawUtils/aidraw'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      if (!existsSync(candidate)) continue;
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch (_) {
      /* try the next candidate */
    }
  }
  for (const directory of String(process.env.PATH ?? '').split(':')) {
    if (!directory) continue;
    const candidate = join(directory, 'aidraw');
    try {
      if (!existsSync(candidate)) continue;
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch (_) {
      /* try the next PATH entry */
    }
  }
  return '';
}

function cleanText(value, limit = 2000) {
  let text = typeof value === 'string' ? value : '';
  text = text.replace(/^```[a-z]*\s*/iu, '').replace(/```$/u, '');
  text = text.replace(/^\s*["'“”]|["'“”]\s*$/gu, '');
  text = text.replace(/\s+/gu, ' ').trim();
  return text.length > limit ? text.slice(0, limit) : text;
}

function cleanMultiline(value, limit = 800) {
  const text = typeof value === 'string' ? value.replace(/\r\n?/gu, '\n').replace(/\n{3,}/gu, '\n\n').trim() : '';
  return text.length > limit ? text.slice(0, limit) : text;
}

function sleep(ms, signal) {
  return new Promise((resolvePromise, reject) => {
    if (signal && signal.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolvePromise();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(abortError());
    }
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
}

function abortError() {
  const error = new Error('aborted');
  error.name = 'AbortError';
  return error;
}

function isAbort(error) {
  return Boolean(error) && (error.name === 'AbortError' || /aborted|abort/iu.test(String(error.message || '')));
}

class PluginError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = 'PluginError';
    this.code = code;
    this.status = status;
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function ok(payload = {}) {
  return jsonResponse({ ok: true, ...payload });
}

function failure(code, message, status = 400) {
  return jsonResponse({ ok: false, error: { code, message } }, status);
}

function shortError(error) {
  if (!error) return 'unknown error';
  if (isAbort(error)) return 'timeout';
  const message = String(error.message || error);
  return message.length > 240 ? `${message.slice(0, 240)}…` : message;
}

async function fetchWithTimeout(url, options, timeoutMs, signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signals = [controller.signal];
  if (signal) signals.push(signal);
  const combined = AbortSignal.any(signals);
  try {
    return await fetch(url, { ...options, signal: combined });
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

async function readJsonBody(request, limit = MAX_BODY_BYTES) {
  const text = await request.text();
  if (text.length > limit) throw new PluginError('bad-request', '请求体过大。', 413);
  if (!text.trim()) return {};
  let body;
  try {
    body = JSON.parse(text);
  } catch (_) {
    throw new PluginError('bad-request', '请求体不是合法 JSON。', 400);
  }
  if (!isObject(body)) throw new PluginError('bad-request', '请求体必须是 JSON 对象。', 400);
  return body;
}

function parseJsonLoose(text) {
  if (typeof text !== 'string') return null;
  let value = text.trim();
  value = value.replace(/^```(?:json)?\s*/iu, '').replace(/```$/u, '').trim();
  try {
    return JSON.parse(value);
  } catch (_) {
    /* fall through to brace extraction */
  }
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(value.slice(start, end + 1));
    } catch (_) {
      return null;
    }
  }
  return null;
}

function aspectSize(aspect) {
  const pair = ASPECTS[aspect];
  return pair ? { width: pair[0], height: pair[1] } : null;
}

function aspectKey(value) {
  if (typeof value === 'string' && ASPECTS[value]) return value;
  return '';
}

function pickSampler(value) {
  const wanted = asString(value).toLowerCase();
  if (wanted === '') return 'DPM++ 2M Karras';
  const exact = SAMPLERS.find((name) => name.toLowerCase() === wanted);
  if (exact) return exact;
  const partial = SAMPLERS.find((name) => wanted.includes(name.toLowerCase()) || name.toLowerCase().includes(wanted));
  return partial || 'DPM++ 2M Karras';
}

function normalizeParams(raw, base, aspect) {
  const source = isObject(raw) ? raw : {};
  const fallback = isObject(base) ? base : {};
  const preset = aspectSize(aspect);
  const hasSize = Number.isFinite(Number(source.width)) || Number.isFinite(Number(source.height));
  const width = snap(asInt(source.width, preset && !hasSize ? preset.width : asInt(fallback.width, 1024)));
  const height = snap(asInt(source.height, preset && !hasSize ? preset.height : asInt(fallback.height, 1024)));
  const steps = clamp(asInt(source.steps, asInt(fallback.steps, 28)), 4, 60);
  const cfg = round1(clamp(asFloat(source.cfg, asFloat(fallback.cfg, 5)), 1, 20));
  const sampler = pickSampler(source.sampler ?? fallback.sampler);
  return { width, height, steps, cfg, sampler };
}

function normalizeBrief(raw, fallback = {}) {
  const source = isObject(raw) ? raw : {};
  const field = (key) => cleanText(source[key], 80) || cleanText(fallback[key], 80);
  const aspect = aspectKey(source.aspect) || aspectKey(fallback.aspect) || '1:1';
  return {
    intent: field('intent'),
    subject: field('subject'),
    style: field('style'),
    composition: field('composition'),
    lighting: field('lighting'),
    palette: field('palette'),
    aspect,
  };
}

function normalizeTags(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, 24))
    .filter(Boolean)
    .slice(0, 8);
}

function fallbackPlan({ description, previous, defaults, aspect, reason, negative }) {
  let positive = asString(previous && previous.positive);
  if (positive === '') {
    positive = cleanText(description, 900);
    const hints = [];
    for (const [pattern, hint] of STYLE_HINTS) {
      if (pattern.test(positive) && !hints.includes(hint)) hints.push(hint);
    }
    positive = [positive, ...hints, 'detailed composition, natural lighting, high quality'].join(', ');
  }
  const params = normalizeParams(previous && previous.params, {
    ...defaults,
    width: previous && previous.params ? previous.params.width : defaults.width,
    height: previous && previous.params ? previous.params.height : defaults.height,
  }, aspect);
  return {
    brief: normalizeBrief(previous && previous.brief, { aspect }),
    positive,
    negative: asString(negative || (previous && previous.negative), defaults.negative),
    params,
    denoise: normalizeDenoise(previous && previous.denoise),
    rationale: `本地 Ollama 暂时不可用（${reason}），本轮直接使用${previous ? '上一轮' : '你的原始描述'}作为提示词，参数取默认值。你可以在面板里手动润色提示词后重新生成。`,
    tags: [],
    understood: previous ? '保留上一轮画面，等待本地模型恢复后再按反馈调整。' : '',
    changes: [],
    degraded: true,
    degradedReason: reason,
  };
}

function coercePlan(raw, { description, defaults, aspect, fallbackBrief }) {
  const source = isObject(raw) ? raw : {};
  const brief = normalizeBrief(source.brief, { ...fallbackBrief, aspect: aspectKey(source.brief && source.brief.aspect) || fallbackBrief.aspect || aspect });
  const requestedAspect = aspectKey(aspect);
  if (requestedAspect) brief.aspect = requestedAspect;
  const positive = cleanText(source.positive, 1200);
  const negative = cleanText(source.negative, 600);
  const params = normalizeParams(source.params, defaults, brief.aspect);
  return {
    brief,
    positive,
    negative: negative || defaults.negative,
    params,
    denoise: Number.isFinite(Number(source.denoise)) ? normalizeDenoise(source.denoise) : null,
    rationale: cleanMultiline(source.rationale, 600),
    tags: normalizeTags(source.tags),
    understood: cleanText(source.understood, 200),
    changes: Array.isArray(source.changes) ? source.changes.map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 5) : [],
    degraded: false,
    degradedReason: '',
  };
}

function validatePlan(plan) {
  if (!plan || asString(plan.positive) === '') {
    throw new PluginError('plan-invalid', '本地模型没有给出可用的提示词。');
  }
  return plan;
}

function decodeImage(value) {
  let text = asString(value);
  let mime = '';
  const match = /^data:([^;]+);base64,(.*)$/su.exec(text);
  if (match) {
    mime = match[1];
    text = match[2];
  }
  const buffer = Buffer.from(text, 'base64');
  return { buffer, mime: mime || sniffMime(buffer) };
}

function sniffMime(buffer) {
  if (!buffer || buffer.length < 12) return 'image/png';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
    && buffer.length >= 12 && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
  return 'image/png';
}

function extensionFor(mime) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'png';
}

function imageDimensions(buffer) {
  if (!buffer || buffer.length < 24) return null;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
    && buffer.toString('ascii', 12, 16) === 'IHDR') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      let marker = buffer[offset + 1];
      while (marker === 0xff) {
        offset += 1;
        marker = buffer[offset + 1];
      }
      if (marker === 0xd8 || marker === 0x01) {
        offset += 2;
        continue;
      }
      if (marker === 0xd9 || marker === 0xda) break;
      const size = buffer.readUInt16BE(offset + 2);
      if (size < 2) break;
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof && offset + 9 <= buffer.length) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + size;
    }
    return null;
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
    && buffer.toString('ascii', 8, 12) === 'WEBP' && buffer.length >= 30
    && buffer.toString('ascii', 12, 16) === 'VP8X') {
    return {
      width: 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)),
      height: 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)),
    };
  }
  return null;
}

function normalizeDenoise(value, fallback = DEFAULT_DENOISE) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(clamp(number, 0.15, 0.95) * 100) / 100;
}

function randomSeed() {
  return Math.floor(Math.random() * 2147483000);
}

function formatStamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

const SESSION_ID = /^\d{8}-\d{6}-[a-f0-9]{8}$/u;
const TURN_ID = /^t\d{1,3}$/u;

function isSessionId(value) {
  return typeof value === 'string' && SESSION_ID.test(value);
}

function isTurnId(value) {
  return typeof value === 'string' && TURN_ID.test(value);
}

function isSourceId(value) {
  return typeof value === 'string' && SOURCE_ID.test(value);
}

function withoutInternalTurn(turn) {
  const copy = { ...turn };
  delete copy.file;
  delete copy.initFile;
  return copy;
}

/* 旧后端值归一：aidraw / drawthings-cli / drawthings-http → drawthings；comfyui → comfy。 */
function normalizeBackendValue(value) {
  if (value === 'aidraw' || value === 'drawthings-cli') return 'drawthings';
  if (value === 'comfyui') return 'comfy';
  return value;
}

function resolveConfig(raw) {
  const config = isObject(raw) ? raw : {};
  const drawthings = isObject(config.drawthings) ? config.drawthings : {};
  const comfyui = isObject(config.comfyui) ? config.comfyui : {};
  const cli = isObject(config.drawthingsCli) ? config.drawthingsCli : {};
  const aidraw = isObject(config.aidraw) ? config.aidraw : {};
  const llm = isObject(config.llm) ? config.llm : {};
  const defaults = isObject(config.defaults) ? config.defaults : {};
  const home = asString(process.env.DSH_HOME) || join(homedir(), '.dsh');
  const backend = ['auto', 'drawthings', 'comfy'].includes(config.backend) ? normalizeBackendValue(config.backend) : 'auto';
  const defaultWidth = snap(asInt(defaults.width, 1024));
  const defaultHeight = snap(asInt(defaults.height, 1024));
  return {
    backend,
    dataDir: asString(config.dataDir) || join(home, 'image-studio'),
    aidraw: {
      enabled: aidraw.enabled !== false,
      binary: aidraw.enabled === false ? '' : findAidrawBinary(asString(aidraw.binary)),
      timeoutMs: clamp(asInt(aidraw.timeoutMs, 900000), 60000, 3600000),
      comfyStartTimeoutMs: clamp(asInt(aidraw.comfyStartTimeoutMs, 180000), 30000, 900000),
    },
    drawthings: {
      baseUrl: withoutTrailingSlash(asString(drawthings.baseUrl, asString(process.env.DSH_IMAGE_STUDIO_DRAWTHINGS_URL, DEFAULT_DRAWTHINGS_URL))),
      model: asString(drawthings.model),
      timeoutMs: clamp(asInt(drawthings.timeoutMs, 600000), 30000, 3600000),
    },
    comfyui: {
      baseUrl: withoutTrailingSlash(asString(comfyui.baseUrl, asString(process.env.DSH_IMAGE_STUDIO_COMFY_URL))),
      checkpoint: asString(comfyui.checkpoint),
      pollMs: clamp(asInt(comfyui.pollMs, 700), 200, 5000),
      timeoutMs: clamp(asInt(comfyui.timeoutMs, 600000), 30000, 3600000),
    },
    drawthingsCli: {
      binary: asString(cli.binary),
      model: asString(cli.model),
      modelsDir: asString(cli.modelsDir),
    },
    llm: {
      enabled: llm.enabled !== false,
      baseUrl: withoutTrailingSlash(asString(llm.baseUrl, asString(process.env.DSH_OLLAMA_URL, DEFAULT_OLLAMA_URL))),
      model: asString(llm.model, asString(process.env.DSH_IMAGE_STUDIO_LLM_MODEL)),
      visionModel: asString(llm.visionModel),
      temperature: clamp(asFloat(llm.temperature, 0.4), 0, 2),
      timeoutMs: clamp(asInt(llm.timeoutMs, 180000), 5000, 3600000),
      numCtx: clamp(asInt(llm.numCtx, 8192), 2048, 131072),
      numPredict: clamp(asInt(llm.numPredict, 1200), 128, 8192),
      /* Qwen 3.5/3.8 run a long reasoning trace unless told not to; prompt
         planning wants the final JSON, not the thoughts. */
      think: llm.think === true,
      keepAlive: asString(llm.keepAlive, '10m'),
    },
    defaults: {
      width: defaultWidth,
      height: defaultHeight,
      steps: clamp(asInt(defaults.steps, 28), 4, 60),
      cfg: round1(clamp(asFloat(defaults.cfg, 5), 1, 20)),
      sampler: pickSampler(defaults.sampler),
      negative: asString(defaults.negative, DEFAULT_NEGATIVE),
      denoise: normalizeDenoise(defaults.denoise),
    },
    maxTurns: clamp(asInt(config.maxTurns, 16), 2, 60),
    historyLimit: clamp(asInt(config.historyLimit, 20), 1, 100),
    preferenceLimit: clamp(asInt(config.preferenceLimit, 20), 1, 100),
  };
}

function isVisionModel(name) {
  return /(?:^|[/:_-])(vl|vision|llava|moondream|minicpm-v)(?:$|[/:_.-])/iu.test(name)
    || /(qwen\d(?:\.\d)?-?vl|qwen-vl|llava|moondream|minicpm-v)/iu.test(name);
}

function isChatModel(name) {
  return !/(embed|embedding|ocr|rerank|bge|nomic|minilm|e5-|gte-)/iu.test(name);
}

function pickModelName(models, configured, wantVision) {
  if (configured) {
    const hit = models.find((model) => model.id === configured)
      || models.find((model) => model.id.startsWith(configured))
      || models.find((model) => model.id.split(':')[0] === configured.split(':')[0]);
    return hit ? hit.id : configured;
  }
  const pool = models.filter((model) => isChatModel(model.id));
  const vision = pool.filter((model) => model.vision);
  const list = wantVision && vision.length > 0 ? vision : pool;
  const sorted = [...list].sort((left, right) => {
    const sizeDiff = (left.size || 0) - (right.size || 0);
    if (sizeDiff !== 0) return sizeDiff;
    return left.id.localeCompare(right.id);
  });
  return sorted.length > 0 ? sorted[0].id : '';
}

export const inject = ['connection'];

export function apply(ctx, rawConfig) {
  const config = resolveConfig(rawConfig);
  const sessionsDir = join(config.dataDir, 'sessions');
  const preferencesFile = join(config.dataDir, 'preferences.json');
  const settingsFile = join(config.dataDir, 'settings.json');
  const sessionCache = new Map();

  let healthCache = { at: 0, value: null };
  let comfyResolved = '';
  let activeJob = null;
  let preferencesCache = null;
  let selectedBackend = '';
  let settingsLoaded = false;

  async function loadSettings() {
    if (settingsLoaded) return;
    settingsLoaded = true;
    try {
      const value = JSON.parse(await readFile(settingsFile, 'utf8'));
      if (isObject(value) && ['auto', 'drawthings', 'comfy'].includes(normalizeBackendValue(value.backend))) {
        selectedBackend = normalizeBackendValue(value.backend);
      }
    } catch (_) {
      /* no saved selection yet */
    }
  }

  async function saveSettings() {
    await mkdir(config.dataDir, { recursive: true });
    const tmp = join(config.dataDir, `.settings-${randomUUID()}.tmp`);
    await writeFile(tmp, `${JSON.stringify({ backend: selectedBackend }, null, 2)}\n`, 'utf8');
    await rename(tmp, settingsFile);
  }

  function effectiveBackend() {
    return selectedBackend || config.backend;
  }

  ctx.logger?.info?.(`image-studio: data=${config.dataDir}, backend=${config.backend}`);

  /* ---------------------------------------------------------------- storage */

  function safeSessionDir(id) {
    if (!isSessionId(id)) throw new PluginError('bad-request', '会话 id 不合法。', 400);
    const dir = resolve(sessionsDir, id);
    const rel = relative(sessionsDir, dir);
    if (rel === '' || rel.startsWith('..') || rel.includes(`..${sep}`)) {
      throw new PluginError('bad-request', '会话路径不合法。', 400);
    }
    return dir;
  }

  function newSession(description, task = 'txt2img') {
    const now = Date.now();
    const id = `${formatStamp(new Date(now))}-${randomBytes(4).toString('hex')}`;
    return {
      id,
      createdAt: now,
      updatedAt: now,
      title: cleanText(description, 60) || (task === 'img2img' ? '参考图作品' : '未命名作品'),
      task: task === 'img2img' ? 'img2img' : 'txt2img',
      brief: normalizeBrief(null, { aspect: '1:1' }),
      sources: [],
      preferencesUsed: [],
      turns: [],
    };
  }

  async function saveSession(session) {
    const dir = safeSessionDir(session.id);
    await mkdir(dir, { recursive: true });
    const tmp = join(dir, `.session-${randomUUID()}.tmp`);
    await writeFile(tmp, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
    await rename(tmp, join(dir, 'session.json'));
    sessionCache.set(session.id, session);
  }

  async function loadSession(id) {
    if (!isSessionId(id)) return null;
    if (sessionCache.has(id)) return sessionCache.get(id);
    try {
      const text = await readFile(join(safeSessionDir(id), 'session.json'), 'utf8');
      const session = JSON.parse(text);
      if (!session || session.id !== id || !Array.isArray(session.turns)) return null;
      /* Sessions written before the img2img split have no task field. */
      session.task = session.task === 'img2img' ? 'img2img' : 'txt2img';
      if (!Array.isArray(session.sources)) session.sources = [];
      sessionCache.set(id, session);
      return session;
    } catch (error) {
      if (error && error.code === 'ENOENT') return null;
      if (error instanceof PluginError) throw error;
      ctx.logger?.warn?.(`image-studio: read session ${id}: ${shortError(error)}`);
      return null;
    }
  }

  async function latestSessionId(task = '') {
    try {
      const entries = await readdir(sessionsDir, { withFileTypes: true });
      const ids = entries
        .filter((entry) => entry.isDirectory() && isSessionId(entry.name))
        .map((entry) => entry.name)
        .sort()
        .reverse();
      for (const id of ids) {
        if (task === '') return id;
        const session = await loadSession(id);
        if (session && session.task === task) return id;
      }
      return '';
    } catch (_) {
      return '';
    }
  }

  function publicSource(session, source) {
    const { file, ...rest } = source;
    return {
      ...rest,
      url: `${ROUTE_PREFIX}/source?session=${encodeURIComponent(session.id)}&source=${encodeURIComponent(source.id)}`,
    };
  }

  function publicTurn(session, turn) {
    const base = `${ROUTE_PREFIX}/image?session=${encodeURIComponent(session.id)}&turn=${encodeURIComponent(turn.id)}`;
    return {
      ...withoutInternalTurn(turn),
      imageUrl: base,
      ...(turn.initFile ? { initImageUrl: `${base}&kind=init` } : {}),
    };
  }

  function publicSession(session) {
    return {
      ...session,
      task: session.task === 'img2img' ? 'img2img' : 'txt2img',
      brief: session.brief || normalizeBrief(null),
      sources: (session.sources || []).map((source) => publicSource(session, source)),
      preferencesUsed: session.preferencesUsed || [],
      turns: (session.turns || []).map((turn) => publicTurn(session, turn)),
    };
  }

  function sessionSummary(session) {
    const coverTurn = session.turns && session.turns.length > 0 ? session.turns[session.turns.length - 1] : null;
    return {
      id: session.id,
      title: session.title,
      task: session.task === 'img2img' ? 'img2img' : 'txt2img',
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      turns: Array.isArray(session.turns) ? session.turns.length : 0,
      backend: session.backend || '',
      brief: session.brief || normalizeBrief(null),
      cover: coverTurn
        ? { turnId: coverTurn.id, imageUrl: `${ROUTE_PREFIX}/image?session=${encodeURIComponent(session.id)}&turn=${encodeURIComponent(coverTurn.id)}` }
        : null,
    };
  }

  async function history(limit, task = '') {
    let entries;
    try {
      entries = await readdir(sessionsDir, { withFileTypes: true });
    } catch (_) {
      return [];
    }
    const ids = entries
      .filter((entry) => entry.isDirectory() && isSessionId(entry.name))
      .map((entry) => entry.name)
      .sort()
      .reverse();
    const rows = [];
    for (const id of ids) {
      if (rows.length >= limit) break;
      const session = await loadSession(id);
      if (!session) continue;
      if (task !== '' && session.task !== task) continue;
      rows.push(sessionSummary(session));
    }
    return rows;
  }

  async function loadPreferences() {
    if (preferencesCache) return preferencesCache;
    try {
      const parsed = JSON.parse(await readFile(preferencesFile, 'utf8'));
      preferencesCache = Array.isArray(parsed && parsed.preferences)
        ? parsed.preferences.filter((item) => item && typeof item.text === 'string').slice(0, config.preferenceLimit)
        : [];
    } catch (_) {
      preferencesCache = [];
    }
    return preferencesCache;
  }

  async function savePreferences(list) {
    preferencesCache = list.slice(0, config.preferenceLimit);
    await mkdir(config.dataDir, { recursive: true });
    const tmp = join(config.dataDir, `.preferences-${randomUUID()}.tmp`);
    await writeFile(tmp, `${JSON.stringify({ preferences: preferencesCache }, null, 2)}\n`, 'utf8');
    await rename(tmp, preferencesFile);
  }

  async function appendPreference(text, sessionId) {
    const value = cleanText(text, 80);
    if (value === '') return null;
    const list = [...(await loadPreferences())];
    const existing = list.find((item) => item.text === value);
    if (existing) return existing;
    const preference = { id: randomUUID().slice(0, 8), text: value, at: Date.now(), sessionId };
    list.unshift(preference);
    await savePreferences(list);
    return preference;
  }

  /* ------------------------------------------------------------------ ollama */

  let modelCache = { at: 0, value: null };
  const modelInfoCache = new Map();

  /* The tags payload hides modality for some builds (`qwen3.8:27b-mlx` reports
     an empty family), so ask /api/show once per model for its capabilities. */
  async function describeModel(id) {
    const hit = modelInfoCache.get(id);
    if (hit && Date.now() - hit.at < 300000) return hit;
    let capabilities = [];
    try {
      const response = await fetchWithTimeout(`${config.llm.baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: id }),
      }, 2500);
      if (response.ok) {
        const data = await readJson(response);
        capabilities = Array.isArray(data && data.capabilities)
          ? data.capabilities.map((item) => String(item))
          : [];
      }
    } catch (_) {
      /* capability discovery is optional; the name heuristic still applies */
    }
    const result = { at: Date.now(), capabilities };
    modelInfoCache.set(id, result);
    return result;
  }

  async function listModels(force = false) {
    if (!config.llm.enabled) throw new PluginError('llm-disabled', '本地 Ollama 已在配置中停用。');
    if (!force && modelCache.value && Date.now() - modelCache.at < 20000) return modelCache.value;
    const response = await fetchWithTimeout(`${config.llm.baseUrl}/api/tags`, {
      headers: { accept: 'application/json' },
    }, 4000);
    if (!response.ok) throw new PluginError('llm-error', `Ollama 返回 HTTP ${response.status}`);
    const data = await readJson(response);
    const base = Array.isArray(data && data.models)
      ? data.models.map((model) => {
        const name = asString(model && model.name);
        const details = model && model.details;
        const family = [
          asString(details && details.family),
          Array.isArray(details && details.families) ? details.families.join(' ') : '',
        ].filter(Boolean).join(' ');
        return {
          id: name,
          size: asInt(model && model.size, 0),
          vision: isVisionModel(name) || isVisionModel(family),
          family,
        };
      }).filter((model) => model.id !== '').slice(0, 24)
      : [];
    const models = await Promise.all(base.map(async (model) => {
      const info = await describeModel(model.id);
      return {
        ...model,
        capabilities: info.capabilities,
        vision: model.vision || info.capabilities.includes('vision'),
      };
    }));
    modelCache = { at: Date.now(), value: models };
    return models;
  }

  async function resolveModels() {
    const models = await listModels();
    const model = pickModelName(models, config.llm.model, false);
    const textEntry = models.find((item) => item.id === model);
    /* An explicitly configured planner that can see should also critique,
       unless the user asked for a separate vision model. */
    const visionModel = config.llm.visionModel
      ? pickModelName(models, config.llm.visionModel, true)
      : (textEntry && textEntry.vision ? model : pickModelName(models, '', true));
    const visionEntry = models.find((item) => item.id === visionModel);
    return {
      models,
      model,
      visionModel,
      supportsVision: Boolean(visionEntry && visionEntry.vision),
    };
  }

  async function chat({ messages, model, signal, formatJson = false, timeoutMs }) {
    if (!config.llm.enabled) throw new PluginError('llm-disabled', '本地 Ollama 已在配置中停用。');
    const chosen = asString(model) || (await resolveModels()).model;
    if (chosen === '') throw new PluginError('llm-no-model', '本机 Ollama 没有可用的对话模型。');
    const body = {
      model: chosen,
      messages,
      stream: false,
      think: config.llm.think,
      keep_alive: config.llm.keepAlive,
      options: {
        temperature: config.llm.temperature,
        num_ctx: config.llm.numCtx,
        num_predict: config.llm.numPredict,
      },
    };
    if (formatJson) body.format = 'json';
    const response = await fetchWithTimeout(`${config.llm.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }, timeoutMs || config.llm.timeoutMs, signal);
    if (!response.ok) {
      const detail = shortError(await response.text());
      throw new PluginError('llm-error', `Ollama 返回 HTTP ${response.status}${detail ? `：${detail}` : ''}`);
    }
    const data = await readJson(response);
    const content = data && data.message && typeof data.message.content === 'string' ? data.message.content : '';
    if (content.trim() === '') throw new PluginError('llm-empty', '本地模型没有返回内容。');
    return content;
  }

  /*
   * Small local models sometimes wrap the JSON in prose or cut it short at the
   * token budget. One strict retry is cheap next to a degraded image, and it
   * keeps the refinement loop reliable without configuring a bigger model.
   */
  async function chatJsonObject({ messages, signal, timeoutMs, validate }) {
    let lastText = '';
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const request = attempt === 0
        ? messages
        : [...messages, {
          role: 'user',
          content: '上一次回答不是可用的 JSON：可能不是合法 JSON，或缺少必填字段。请只输出完整合法的 JSON 对象，positive 必须是非空英文提示词，params 必须完整，不要任何解释或代码块。',
        }];
      lastText = await chat({ messages: request, signal, formatJson: true, timeoutMs });
      const parsed = parseJsonLoose(lastText);
      if (isObject(parsed) && (typeof validate !== 'function' || validate(parsed))) return parsed;
    }
    ctx.logger?.warn?.(`image-studio: unusable model JSON: ${cleanText(lastText, 200)}`);
    throw new PluginError('llm-json', '本地模型没有给出可用的提示词 JSON。');
  }

  async function planFromDescription({ description, aspect, style, preferences, signal, engineInfo = '' }) {
    const defaults = config.defaults;
    const messages = [
      { role: 'system', content: PLAN_SYSTEM },
      {
        role: 'user',
        content: [
          `用户描述：${description}`,
          aspect ? `画幅：${aspect}` : '',
          style ? `用户选择的绘画风格：${style}（提示词、brief.style 与 params 参数都要与该风格匹配）` : '',
          engineInfo || '',
          `可选采样器：${SAMPLERS.join(' / ')}`,
          preferences.length > 0
            ? `用户长期偏好（参考，不要违背当前描述）：\n${preferences.map((item) => `- ${item.text}`).join('\n')}`
            : '',
          `默认参数：${JSON.stringify(defaults)}`,
          '请输出 JSON。',
        ].filter(Boolean).join('\n'),
      },
    ];
    const parsed = await chatJsonObject({
      messages,
      signal,
      validate: (value) => cleanText(value.positive, 1200) !== '',
    });
    const plan = coercePlan(parsed, {
      description,
      defaults,
      aspect,
      fallbackBrief: normalizeBrief(null, { aspect: aspectKey(aspect) || '1:1' }),
    });
    return validatePlan(plan);
  }

  async function planFromImage({ description, analysis, init, aspect, style, preferences, signal, engineInfo = '' }) {
    const defaults = config.defaults;
    const initSize = init && init.width > 0 && init.height > 0
      ? `${init.width}×${init.height}`
      : `${defaults.width}×${defaults.height}`;
    const messages = [
      { role: 'system', content: IMG_PLAN_SYSTEM },
      {
        role: 'user',
        content: [
          analysis ? `参考图分析（本地视觉模型）：${analysis}` : '参考图分析：未能获取，请只依据尺寸和用户描述。',
          `参考图尺寸：${initSize}`,
          `修改描述：${description || '（没有额外描述：在不改变主体、构图和身份的前提下提升质感、光线和细节）'}`,
          aspect ? `目标画幅：${aspect}` : '',
          style ? `用户选择的绘画风格：${style}（提示词、brief.style 与 params 参数都要与该风格匹配）` : '',
          engineInfo || '',
          `可选采样器：${SAMPLERS.join(' / ')}`,
          preferences.length > 0
            ? `用户长期偏好（参考，不要违背当前修改要求）：\n${preferences.map((item) => `- ${item.text}`).join('\n')}`
            : '',
          `默认参数：${JSON.stringify(defaults)}`,
          '请输出 JSON。',
        ].filter(Boolean).join('\n'),
      },
    ];
    const parsed = await chatJsonObject({
      messages,
      signal,
      validate: (value) => cleanText(value.positive, 1200) !== '',
    });
    const plan = coercePlan(parsed, {
      description,
      defaults,
      aspect,
      fallbackBrief: normalizeBrief(null, { aspect: aspectKey(aspect) || '1:1' }),
    });
    if (init && init.width > 0 && init.height > 0) {
      /* img2img keeps the reference frame; the planner only proposes content. */
      plan.params.width = snap(init.width);
      plan.params.height = snap(init.height);
      plan.brief.aspect = aspectKey(aspect) || plan.brief.aspect;
    }
    plan.denoise = normalizeDenoise(plan.denoise, 0.55);
    return validatePlan(plan);
  }

  async function refinePlan({ session, previous, feedback, critique, aspect, preferences, signal, engineInfo = '' }) {
    const defaults = config.defaults;
    const previousInfo = {
      positive: previous.positive,
      negative: previous.negative,
      params: previous.params,
      rationale: previous.rationale,
      denoise: previous.denoise,
    };
    const messages = [
      { role: 'system', content: REFINE_SYSTEM },
      {
        role: 'user',
        content: [
          `原始意图：${JSON.stringify(session.brief || {})}`,
          `上一轮：${JSON.stringify(previousInfo)}`,
          `用户反馈：${feedback}`,
          session.task === 'img2img'
            ? '本轮是图生图：以上一张输出为底图继续修改；如需要，请在 JSON 中给出 denoise（0.15-0.95，风格跃迁必须 0.8 以上）。'
            : '',
          critique ? `图像质检（本地视觉模型）：${critique}` : '',
          engineInfo || '',
          preferences.length > 0
            ? `用户长期偏好（参考，不要违背当前反馈）：\n${preferences.map((item) => `- ${item.text}`).join('\n')}`
            : '',
          `可选采样器：${SAMPLERS.join(' / ')}`,
          `默认参数：${JSON.stringify(defaults)}`,
          '请输出完整的新提示词和参数 JSON。',
        ].filter(Boolean).join('\n'),
      },
    ];
    const parsed = await chatJsonObject({
      messages,
      signal,
      validate: (value) => cleanText(value.positive, 1200) !== '',
    });
    const negative = cleanText(parsed.negative, 600) || previous.negative;
    const params = normalizeParams(parsed.params, previous.params, aspect || session.brief.aspect);
    /* A small local model often "fixes" the frame while editing light or detail.
       Keep the previous frame unless the feedback actually talks about framing. */
    if (!/(?:画幅|构图|横图|竖图|宽幅|方形|比例|裁切|aspect|composition|portrait|landscape|square|wide|tall|crop)/iu.test(feedback)) {
      params.width = previous.params.width;
      params.height = previous.params.height;
    }
    const plan = {
      /* 每轮简报独立存档：优先模型本轮输出，旧会话无 per-turn 存档时回落上一轮/会话级。 */
      brief: normalizeBrief(parsed.brief, previous.brief || session.brief),
      positive: cleanText(parsed.positive, 1200),
      negative,
      params,
      denoise: Number.isFinite(Number(parsed.denoise))
        ? normalizeDenoise(parsed.denoise, previous.denoise)
        : normalizeDenoise(previous.denoise),
      rationale: cleanMultiline(parsed.rationale, 600),
      tags: normalizeTags(parsed.tags),
      understood: cleanText(parsed.understood, 200),
      changes: Array.isArray(parsed.changes) ? parsed.changes.map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 5) : [],
      degraded: false,
      degradedReason: '',
    };
    return validatePlan(plan);
  }

  async function critiqueBuffer(buffer, signal) {
    const models = await resolveModels();
    if (!models.supportsVision) throw new PluginError('vision-unavailable', '当前本地模型不支持看图。');
    const content = await chat({
      messages: [
        { role: 'system', content: VISION_SYSTEM },
        { role: 'user', content: '请客观描述并指出这张图的瑕疵。', images: [buffer.toString('base64')] },
      ],
      model: models.visionModel,
      signal,
      timeoutMs: Math.min(config.llm.timeoutMs, 120000),
    });
    return cleanMultiline(content, 700);
  }

  async function critiqueImage(session, turn, signal) {
    try {
      const buffer = await readFile(join(safeSessionDir(session.id), turn.file));
      return await critiqueBuffer(buffer, signal);
    } catch (error) {
      if (error instanceof PluginError) throw error;
      return '';
    }
  }

  async function distillPreference(session, turn) {
    try {
      const content = await chat({
        messages: [
          { role: 'system', content: PREFERENCE_SYSTEM },
          {
            role: 'user',
            content: JSON.stringify({
              brief: session.brief,
              positive: turn.positive,
              rationale: turn.rationale,
              feedback: turn.feedback,
            }),
          },
        ],
        formatJson: true,
        timeoutMs: Math.min(config.llm.timeoutMs, 45000),
      });
      const parsed = parseJsonLoose(content);
      const text = cleanText(parsed && parsed.preference, 80);
      if (text !== '') return text;
    } catch (_) {
      /* fall through to a deterministic summary */
    }
    const brief = session.brief || {};
    const words = [brief.style, brief.lighting, brief.palette].map((item) => cleanText(item, 30)).filter(Boolean);
    if (words.length > 0) return cleanText(words.join('；'), 80);
    return cleanText(turn.positive, 80);
  }

  /* ---------------------------------------------------------------- backends */

  async function runAidraw(args, timeoutMs, signal) {
    if (!config.aidraw.binary) {
      throw new PluginError('aidraw-missing', '没有找到 aidraw 可执行文件：在 DrawUtils 项目里 `go build -o aidraw .`，或用配置 aidraw.binary 指定路径。', 502);
    }
    const env = { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ''}` };
    const started = Date.now();
    try {
      const result = await execFileAsync(config.aidraw.binary, args, {
        timeout: timeoutMs,
        maxBuffer: 16 * 1024 * 1024,
        signal,
        env,
      });
      if (args.includes('generate')) {
        ctx.logger?.info?.(`image-studio: aidraw 生成完成，耗时 ${Date.now() - started}ms`);
      }
      return result;
    } catch (error) {
      if (isAbort(error) || (signal && signal.aborted)) throw abortError();
      const detail = shortError(error && (error.stderr || error.message || error));
      ctx.logger?.error?.(`image-studio: aidraw 调用失败（${Date.now() - started}ms）：${detail}`);
      throw new PluginError('aidraw-error', `aidraw 执行失败：${detail}`, 502);
    }
  }

  /* aidraw 是本插件唯一的本地出图对接点：drawthings 引擎免 GUI 直出，
   * comfy 引擎走 ComfyUI HTTP API（服务离线时由 aidraw 自动无头拉起）。
   * 插件不再直接感知 draw-things-cli / ComfyUI 进程的存在。 */
  async function probeAidrawDrawthings() {
    const result = {
      id: 'drawthings',
      engine: 'aidraw',
      reachable: false,
      installed: Boolean(config.aidraw.binary),
      version: '',
      models: [],
      model: config.drawthingsCli.model,
      error: null,
    };
    if (!result.installed) {
      result.error = 'not-installed';
      return result;
    }
    try {
      const version = await runAidraw(['--version'], 15000);
      result.version = cleanText(version.stdout, 80) || 'unknown';
      const args = ['-e', 'drawthings', '--list-models'];
      if (config.drawthingsCli.modelsDir) args.push('--models-dir', config.drawthingsCli.modelsDir);
      if (config.drawthingsCli.binary) args.push('--dt-cli', config.drawthingsCli.binary);
      const listed = await runAidraw(args, 90000);
      const rows = String(listed.stdout || '').split('\n');
      const models = [];
      for (const line of rows) {
        const match = /^\s*(\S+\.(?:ckpt|safetensors))\s+(.+?)\s{2,}.*\byes\b/iu.exec(line);
        if (match) models.push({ id: match[1], name: cleanText(match[2], 80) });
      }
      result.models = models;
      const preferred = config.drawthingsCli.model
        || (models.find((item) => !/(video|wan|ltx|longcat|avatar|audio)/iu.test(item.id)) || models[0] || {}).id
        || '';
      result.model = preferred;
      if (models.length === 0) {
        result.error = 'no-model';
      } else if (preferred === '') {
        result.error = 'no-model';
      } else {
        result.reachable = true;
      }
    } catch (error) {
      result.error = shortError(error);
    }
    return result;
  }

  async function probeAidrawComfy() {
    const result = {
      id: 'comfy',
      engine: 'aidraw',
      reachable: false,
      installed: Boolean(config.aidraw.binary),
      version: '',
      checkpoints: [],
      baseUrl: '',
      error: null,
    };
    if (!result.installed) {
      result.error = 'not-installed';
      return result;
    }
    /* 只读探测（不开服务）：在线与否决定单选标记；选 comfy 生成时若离线，
       会经 aidraw 自动无头拉起（ensureComfyRunning）。 */
    try {
      const probe = await probeComfyUI();
      result.reachable = probe.reachable;
      result.checkpoints = probe.checkpoints || [];
      result.baseUrl = probe.baseUrl;
      if (!probe.reachable) {
        result.error = 'comfy-offline';
      } else if (result.checkpoints.length === 0) {
        result.error = 'no-checkpoint';
      }
    } catch (error) {
      result.error = shortError(error);
    }
    return result;
  }

  async function probeComfyUI() {
    const prefer = config.comfyui.baseUrl;
    const candidates = prefer ? [prefer] : DEFAULT_COMFY_URLS;
    for (const baseUrl of candidates) {
      const result = { id: 'comfyui', reachable: false, baseUrl, checkpoints: [], error: null };
      try {
        const response = await fetchWithTimeout(`${baseUrl}/system_stats`, {
          headers: { accept: 'application/json' },
        }, 1800);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        result.reachable = true;
        comfyResolved = baseUrl;
        try {
          const infoResponse = await fetchWithTimeout(`${baseUrl}/object_info/CheckpointLoaderSimple`, {
            headers: { accept: 'application/json' },
          }, 2500);
          if (infoResponse.ok) {
            const info = await readJson(infoResponse);
            const required = info && info.CheckpointLoaderSimple && info.CheckpointLoaderSimple.input
              && info.CheckpointLoaderSimple.input.required;
            const names = required && required.ckpt_name && Array.isArray(required.ckpt_name[0])
              ? required.ckpt_name[0]
              : [];
            result.checkpoints = names.map((name) => String(name)).slice(0, 80);
          }
        } catch (_) {
          /* checkpoint list is optional */
        }
        return result;
      } catch (error) {
        result.error = shortError(error);
        if (prefer) return result;
      }
    }
    return { id: 'comfyui', reachable: false, baseUrl: prefer || DEFAULT_COMFY_URLS[0], checkpoints: [], error: 'fetch failed' };
  }

  async function probeLlm() {
    const result = {
      reachable: false,
      baseUrl: config.llm.baseUrl,
      model: config.llm.model,
      visionModel: config.llm.visionModel,
      supportsVision: false,
      models: [],
      error: null,
    };
    if (!config.llm.enabled) {
      result.error = 'disabled';
      return result;
    }
    try {
      await listModels(true);
      const resolved = await resolveModels();
      result.reachable = true;
      result.model = resolved.model;
      result.visionModel = resolved.visionModel;
      result.supportsVision = resolved.supportsVision;
      result.models = resolved.models.slice(0, 40).map((item) => ({ id: item.id, vision: item.vision }));
    } catch (error) {
      result.error = shortError(error);
    }
    return result;
  }

  async function getHealth(force = false) {
    if (!force && healthCache.value && Date.now() - healthCache.at < 8000) return healthCache.value;
    await loadSettings();
    const [drawthings, comfy, llm, preferences] = await Promise.all([
      probeAidrawDrawthings(),
      probeAidrawComfy(),
      probeLlm(),
      loadPreferences(),
    ]);
    const backends = { drawthings, comfy };
    const selected = effectiveBackend();
    let active = null;
    if (selected === 'drawthings' || selected === 'comfy') {
      active = backends[selected].reachable ? selected : null;
    } else if (drawthings.reachable) {
      active = 'drawthings';
    } else if (comfy.reachable) {
      active = 'comfy';
    }
    const value = {
      active,
      selected,
      preferred: config.backend,
      backends,
      aidraw: {
        available: Boolean(config.aidraw.binary),
        binary: config.aidraw.binary,
      },
      llm,
      defaults: {
        width: config.defaults.width,
        height: config.defaults.height,
        steps: config.defaults.steps,
        cfg: config.defaults.cfg,
        sampler: config.defaults.sampler,
        negative: config.defaults.negative,
        denoise: config.defaults.denoise,
      },
      preferences: preferences.map((item) => ({ id: item.id, text: item.text })),
    };
    healthCache = { at: Date.now(), value };
    return value;
  }

  async function pickBackend(preferred) {
    await loadSettings();
    const allowed = ['drawthings', 'comfy'];
    /* 旧值映射：aidraw / drawthings-cli → drawthings；comfyui → comfy。 */
    let normalized = preferred === 'aidraw' || preferred === 'drawthings-cli' ? 'drawthings'
      : preferred === 'comfyui' ? 'comfy'
        : preferred;
    const wanted = allowed.includes(normalized) ? normalized : effectiveBackend();
    const health = await getHealth();
    if (wanted !== 'auto') {
      if (!health.backends[wanted].reachable) {
        /* comfy 离线不算失败：生成时 aidraw 会自动无头拉起服务，交给生成流程处理。 */
        if (wanted === 'comfy' && health.backends.comfy.installed) return 'comfy';
        throw new PluginError('backend-offline', engineUnavailableMessage(wanted, health.backends[wanted]), 502);
      }
      return wanted;
    }
    if (health.backends.drawthings.reachable) return 'drawthings';
    if (health.backends.comfy.reachable) return 'comfy';
    if (health.backends.comfy.installed) return 'comfy';
    throw new PluginError(
      'backend-offline',
      '没有可用的出图引擎：请确认 aidraw 命令（~/bin/aidraw）与本地模型就绪。',
      502,
    );
  }

  /* 引擎生成失败时的可读指引（替代裸 error code）。 */
  function engineUnavailableMessage(engine, info) {
    const name = engine === 'comfy' ? 'Comfy' : 'Draw Things';
    if (!info || !info.installed) {
      return `${name} 引擎需要 aidraw 命令：未找到 ~/bin/aidraw，请从 DrawUtils 项目构建（go build -o aidraw .）后放入 PATH。`;
    }
    if (engine === 'drawthings') {
      if (info.error === 'no-model') {
        return `${name} 引擎没有本地模型：请把模型文件（.ckpt/.safetensors）放入模型目录（当前配置 drawthingsCli.modelsDir）。`;
      }
      return `${name} 引擎不可用：${info.error || '请运行 aidraw -e drawthings --list-models 检查。'}`;
    }
    if (info.error === 'comfy-offline') {
      return `${name} 引擎需要 ComfyUI 服务：自动无头拉起未成功，请确认本机已安装 ComfyUI/Comfy Desktop。`;
    }
    if (info.error === 'no-checkpoint') {
      return `${name} 引擎没有 checkpoint：请在 ComfyUI 的 models/checkpoints 放入模型文件。`;
    }
    return `${name} 引擎不可用：${info.error || '请运行 aidraw -e comfy --list-models 检查。'}`;
  }

  /* aidraw 后端：插件唯一的本地 CLI 对接点。aidraw 负责参数映射、无头适配与
   * 子进程超时；模型目录与 draw-things-cli 路径经 --models-dir / --dt-cli 透传。 */
  async function aidrawGenerate({ plan, seed, signal, task = 'txt2img', init = null, denoise = DEFAULT_DENOISE }) {
    let health = await getHealth();
    /* 模型为空不直接报错：可能是缓存的探测结果过期/超时，强制重探一次。 */
    if (!health.backends.drawthings.model && config.aidraw.binary) {
      healthCache = { at: 0, value: null };
      health = await getHealth(true);
    }
    const drawthingsBackend = health.backends.drawthings;
    if (!config.aidraw.binary) {
      throw new PluginError('aidraw-missing', '没有找到 aidraw：在 DrawUtils 项目里执行 `go build -o aidraw .`，或用配置 aidraw.binary 指定路径。', 502);
    }
    const model = config.drawthingsCli.model || drawthingsBackend.model || '';
    if (model === '') {
      throw new PluginError('aidraw-no-model', 'aidraw 没有可用模型：把模型文件（.ckpt/.safetensors）放入模型目录，或用配置 drawthingsCli.modelsDir 指定目录。', 502);
    }
    const dir = join(config.dataDir, '.tmp');
    await mkdir(dir, { recursive: true });
    const id = randomUUID();
    const output = join(dir, `cli-${id}.png`);
    const input = task === 'img2img' && init
      ? join(dir, `cli-init-${id}.${extensionFor(init.mime)}`)
      : '';
    const args = [
      '-e', 'drawthings',
      '--model', model,
      '--prompt', plan.positive,
      '--negative-prompt', plan.negative || '',
      '--width', String(plan.params.width),
      '--height', String(plan.params.height),
      '--seed', String(seed),
      '--output', output,
    ];
    if (config.drawthingsCli.modelsDir) args.push('--models-dir', config.drawthingsCli.modelsDir);
    if (config.drawthingsCli.binary) args.push('--dt-cli', config.drawthingsCli.binary);
    if (TURBO_MODEL.test(model)) {
      args.push('--steps', '8', '--cfg', '1');
    } else {
      args.push('--steps', String(plan.params.steps), '--cfg', String(plan.params.cfg));
    }
    if (input) {
      await writeFile(input, init.buffer);
      args.push('--image', input, '--strength', String(normalizeDenoise(denoise)));
    }
    /* `--` 后的参数由 aidraw 原样透传给底层 CLI（--no-download-missing
     * 保证绝不自动下载模型，只用已就位的本地模型）。 */
    args.push('--', '--local', '--no-download-missing');
    const started = Date.now();
    try {
      await runAidraw(args, config.aidraw.timeoutMs, signal);
      const buffer = await readFile(output);
      if (buffer.length < 8) throw new PluginError('aidraw-empty', 'aidraw 没有写出图片。', 502);
      return {
        buffer,
        mime: sniffMime(buffer),
        seed,
        elapsedMs: Date.now() - started,
        backend: 'drawthings',
        model,
      };
    } catch (error) {
      if (error instanceof PluginError) throw error;
      if (isAbort(error) || (signal && signal.aborted)) throw abortError();
      const detail = shortError(error && (error.stderr || error.message || error));
      /* 常见失败给出可操作指引，其余透传 aidraw 的原始错误。 */
      let hint = '';
      if (/no tensors returned/iu.test(detail)) {
        hint = '（draw-things-cli 模型文件缺失：请确认模型目录里的 .ckpt 完整后重试）';
      } else if (/timeout|timed out/iu.test(detail)) {
        hint = '（生成超时：可调大 aidraw.timeoutMs 或降低步数/尺寸）';
      }
      throw new PluginError('aidraw-error', `Draw Things 生成失败：${detail}${hint}`, 502);
    } finally {
      await rm(output, { force: true }).catch(() => {});
      if (input) await rm(input, { force: true }).catch(() => {});
    }
  }

  async function uploadComfyImage(baseUrl, init, signal) {
    const filename = `image-studio-${Date.now()}-${randomBytes(4).toString('hex')}.${extensionFor(init.mime)}`;
    const form = new FormData();
    form.append('image', new Blob([init.buffer], { type: init.mime || 'image/png' }), filename);
    form.append('overwrite', 'true');
    form.append('type', 'input');
    const response = await fetchWithTimeout(`${baseUrl}/upload/image`, {
      method: 'POST',
      body: form,
    }, 60000, signal);
    if (!response.ok) {
      const detail = shortError(await response.text());
      throw new PluginError('comfy-upload-error', `ComfyUI 上传参考图失败（HTTP ${response.status}）${detail ? `：${detail}` : ''}`, 502);
    }
    const data = await readJson(response);
    const name = data && data.name ? String(data.name) : filename;
    const subfolder = data && data.subfolder ? String(data.subfolder) : '';
    return subfolder ? `${subfolder}/${name}` : name;
  }

  /* comfy 引擎：先经 aidraw 确保服务在线（离线时无头拉起），再走 HTTP API。
   * aidraw 负责 ComfyUI 的探测、无头启动与就绪等待；插件只管工作流。 */
  async function ensureComfyRunning(signal) {
    const probe = await probeComfyUI();
    if (probe.reachable) return true;
    if (!config.aidraw.binary) return false;
    const baseUrl = probe.baseUrl || DEFAULT_COMFY_URLS[0];
    try {
      const args = ['-e', 'comfy', '--list-models', '--comfy-url', baseUrl];
      await runAidraw(args, config.aidraw.comfyStartTimeoutMs, signal);
    } catch (error) {
      if (error instanceof PluginError) throw error;
      throw new PluginError('comfy-start-error', `经 aidraw 拉起 ComfyUI 失败：${shortError(error)}`, 502);
    }
    const reprobe = await probeComfyUI();
    if (reprobe.reachable) {
      healthCache = { at: 0, value: null };
      return true;
    }
    return false;
  }

  async function comfyGenerate({ plan, seed, signal, task = 'txt2img', init = null, denoise = DEFAULT_DENOISE }) {
    if (!config.aidraw.binary) {
      throw new PluginError('aidraw-missing', '没有找到 aidraw 命令：请从 DrawUtils 构建并放入 PATH。', 502);
    }
    if (!(await ensureComfyRunning(signal))) {
      throw new PluginError('comfy-offline', 'ComfyUI 服务未能启动（经 aidraw 无头拉起失败）：请确认本机已安装 ComfyUI/Comfy Desktop。', 502);
    }
    const health = await getHealth();
    const baseUrl = comfyResolved || health.backends.comfy.baseUrl || DEFAULT_COMFY_URLS[0];
    const checkpoints = health.backends.comfy.checkpoints;
    const checkpoint = config.comfyui.checkpoint || checkpoints[0] || '';
    if (checkpoint === '') {
      throw new PluginError('comfy-no-checkpoint', 'ComfyUI 没有可用的 checkpoint：请在 ComfyUI 的 models/checkpoints 里放一个模型。', 502);
    }
    const [samplerName, scheduler] = COMFY_SAMPLERS[plan.params.sampler] || ['dpmpp_2m', 'karras'];
    let graph;
    if (task === 'img2img' && init) {
      const imageName = await uploadComfyImage(baseUrl, init, signal);
      graph = {
        1: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: checkpoint } },
        2: { class_type: 'CLIPTextEncode', inputs: { text: plan.positive, clip: ['1', 1] } },
        3: { class_type: 'CLIPTextEncode', inputs: { text: plan.negative, clip: ['1', 1] } },
        4: { class_type: 'LoadImage', inputs: { image: imageName } },
        5: { class_type: 'VAEEncode', inputs: { pixels: ['4', 0], vae: ['1', 2] } },
        6: {
          class_type: 'KSampler',
          inputs: {
            seed,
            steps: plan.params.steps,
            cfg: plan.params.cfg,
            sampler_name: samplerName,
            scheduler,
            denoise: normalizeDenoise(denoise),
            model: ['1', 0],
            positive: ['2', 0],
            negative: ['3', 0],
            latent_image: ['5', 0],
          },
        },
        7: { class_type: 'VAEDecode', inputs: { samples: ['6', 0], vae: ['1', 2] } },
        8: { class_type: 'SaveImage', inputs: { filename_prefix: 'image-studio', images: ['7', 0] } },
      };
    } else {
      graph = {
        1: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: checkpoint } },
        2: { class_type: 'CLIPTextEncode', inputs: { text: plan.positive, clip: ['1', 1] } },
        3: { class_type: 'CLIPTextEncode', inputs: { text: plan.negative, clip: ['1', 1] } },
        4: { class_type: 'EmptyLatentImage', inputs: { width: plan.params.width, height: plan.params.height, batch_size: 1 } },
        5: {
          class_type: 'KSampler',
          inputs: {
            seed,
            steps: plan.params.steps,
            cfg: plan.params.cfg,
            sampler_name: samplerName,
            scheduler,
            denoise: 1,
            model: ['1', 0],
            positive: ['2', 0],
            negative: ['3', 0],
            latent_image: ['4', 0],
          },
        },
        6: { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
        7: { class_type: 'SaveImage', inputs: { filename_prefix: 'image-studio', images: ['6', 0] } },
      };
    }
    const started = Date.now();
    const queued = await fetchWithTimeout(`${baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: graph, client_id: randomUUID() }),
    }, 30000, signal);
    const queuedData = await readJson(queued);
    if (!queued.ok) {
      throw new PluginError('comfy-error', `ComfyUI 拒绝了工作流（HTTP ${queued.status}）：${JSON.stringify(queuedData).slice(0, 300)}`, 502);
    }
    if (queuedData && queuedData.error) {
      throw new PluginError('comfy-error', `ComfyUI 拒绝了工作流：${JSON.stringify(queuedData.error).slice(0, 300)}`, 502);
    }
    const promptId = queuedData && queuedData.prompt_id;
    if (!promptId) throw new PluginError('comfy-error', 'ComfyUI 没有返回 prompt_id。', 502);
    let imageInfo = null;
    const deadline = started + config.comfyui.timeoutMs;
    while (Date.now() < deadline) {
      await sleep(config.comfyui.pollMs, signal);
      let entry = null;
      try {
        const response = await fetchWithTimeout(`${baseUrl}/history/${encodeURIComponent(promptId)}`, {
          headers: { accept: 'application/json' },
        }, 15000, signal);
        const data = await readJson(response);
        entry = data && data[promptId];
      } catch (error) {
        if (isAbort(error) && signal && signal.aborted) throw error;
        continue;
      }
      if (!entry) continue;
      if (entry.status && entry.status.status_str === 'error') {
        throw new PluginError('comfy-error', 'ComfyUI 执行工作流时出错，请查看 ComfyUI 控制台。', 502);
      }
      const outputs = entry.outputs || {};
      for (const output of Object.values(outputs)) {
        if (output && Array.isArray(output.images) && output.images.length > 0) {
          imageInfo = output.images[0];
          break;
        }
      }
      if (imageInfo) break;
    }
    if (!imageInfo) throw new PluginError('comfy-timeout', '等待 ComfyUI 生成超时。', 504);
    const params = new URLSearchParams({
      filename: imageInfo.filename || '',
      subfolder: imageInfo.subfolder || '',
      type: imageInfo.type || 'output',
    });
    const imageResponse = await fetchWithTimeout(`${baseUrl}/view?${params.toString()}`, {}, 60000, signal);
    if (!imageResponse.ok) throw new PluginError('comfy-error', `读取 ComfyUI 图片失败（HTTP ${imageResponse.status}）。`, 502);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    if (buffer.length < 8) throw new PluginError('comfy-empty', 'ComfyUI 返回的图片数据为空。', 502);
    return {
      buffer,
      mime: sniffMime(buffer),
      seed,
      elapsedMs: Date.now() - started,
      backend: 'comfy',
      model: checkpoint,
    };
  }

  async function generateImage({ plan, seed, backend, signal, task = 'txt2img', init = null, denoise = DEFAULT_DENOISE }) {
    if (backend === 'comfy') return comfyGenerate({ plan, seed, signal, task, init, denoise });
    return aidrawGenerate({ plan, seed, signal, task, init, denoise });
  }

  /* --------------------------------------------------------------- workflows */

  /* 告知规划模型当前出图引擎的能力限制：turbo 类模型 cfg 恒为 1、负向提示词
     不生效，风格控制必须全部写进正向提示词。 */
  function engineCapabilityNote(health) {
    const backends = health && health.backends ? health.backends : {};
    const drawthings = backends.drawthings || {};
    const model = config.drawthingsCli.model || drawthings.model || '';
    if (model && TURBO_MODEL.test(model)) {
      return `出图引擎能力说明：当前使用 ${model}（turbo 类模型），cfg 恒为 1、步数恒为 8，负向提示词不生效。请把所有风格要求与排斥项写进正向提示词（如 photorealistic / anime 等明确风格词前置并重复强调），不要依赖负向提示词，也不要建议调 cfg/步数/采样器（引擎会忽略）。`;
    }
    return `出图引擎能力说明：当前出图模型 ${model || '未知'}，负向提示词生效。`;
  }

  function applyAidrawPreset(plan, health) {
    const model = config.drawthingsCli.model
      || (health.backends.drawthings && health.backends.drawthings.model)
      || '';
    if (TURBO_MODEL.test(model)) {
      plan.params.steps = 8;
      plan.params.cfg = 1;
    }
    /* aidraw only exposes steps/cfg; sampler comes from the model preset. */
    plan.params.sampler = 'CLI 推荐';
  }

  async function preparePlan({ session, previous, body, signal, preferences, task = 'txt2img', init = null }) {
    const description = asString(body.description);
    const feedback = asString(body.feedback);
    const aspect = aspectKey(body.aspect) || (session && session.brief && session.brief.aspect) || '1:1';
    const style = cleanText(body.style, 60);
    const useVision = body.useVision !== false;

    if (asString(body.positive) !== '') {
      const params = normalizeParams(body.params, previous ? previous.params : config.defaults, aspect);
      return {
        plan: {
          brief: (previous && previous.brief) || (session && session.brief) || normalizeBrief(null, { aspect }),
          positive: cleanText(body.positive, 1200),
          negative: cleanText(body.negative, 600) || (previous && previous.negative) || config.defaults.negative,
          params,
          denoise: normalizeDenoise(body.denoise, previous && previous.denoise ? previous.denoise : config.defaults.denoise),
          rationale: '使用当前预览中的提示词与参数生成。',
          tags: [],
          understood: '',
          changes: [],
          degraded: false,
          degradedReason: '',
        },
        critique: '',
        feedback,
        mode: 'manual',
      };
    }

    const health = await getHealth();
    if (session && !session.brief) session.brief = normalizeBrief(null, { aspect });
    /* 告知规划模型当前出图引擎的实际能力（如 turbo 模型 cfg 恒为 1、负向提示词
       不生效），避免模型写一堆无效负向词去对抗风格。 */
    const engineInfo = engineCapabilityNote(health);
    let sourceAnalysis = '';
    if (task === 'img2img' && init && !previous
      && health.llm.reachable && health.llm.supportsVision) {
      try {
        sourceAnalysis = await critiqueBuffer(init.buffer, signal);
      } catch (_) {
        /* the plan still works from the description and dimensions */
      }
    }

    if (feedback !== '' && previous) {
      let critique = '';
      if (useVision && health.llm.reachable && health.llm.supportsVision) {
        try {
          critique = await critiqueImage(session, previous, signal);
        } catch (_) {
          /* the picture still refines without a critique */
        }
      }
      if (!health.llm.reachable) {
        const plan = fallbackPlan({
          description: session.brief.intent,
          previous,
          defaults: config.defaults,
          aspect,
          reason: health.llm.error || 'Ollama 未连接',
          negative: config.defaults.negative,
        });
        return { plan, critique, feedback, mode: 'refine' };
      }
      try {
        const plan = await refinePlan({ session, previous, feedback, critique, aspect, preferences, signal, engineInfo });
        return { plan, critique, feedback, mode: 'refine' };
      } catch (error) {
        if (isAbort(error)) throw error;
        const plan = fallbackPlan({
          description: session.brief.intent,
          previous,
          defaults: config.defaults,
          aspect,
          reason: shortError(error),
          negative: config.defaults.negative,
        });
        return { plan, critique, feedback, mode: 'refine' };
      }
    }

    if (previous && feedback === '' && description === '') {
      const plan = {
        brief: (previous && previous.brief) || session.brief,
        positive: previous.positive,
        negative: previous.negative,
        params: normalizeParams(previous.params, previous.params, aspect),
        denoise: normalizeDenoise(previous.denoise),
        rationale: '沿用上一轮的提示词和参数，只换一个随机种子，得到构图相近的不同版本。',
        tags: [],
        understood: '同一提示词再生成一版。',
        changes: [],
        degraded: false,
        degradedReason: '',
      };
      return { plan, critique: '', feedback: '', mode: 'variation' };
    }

    const effectiveDescription = feedback !== '' ? [description, feedback].filter(Boolean).join('；') : description;
    const fallbackDescription = effectiveDescription
      || (task === 'img2img' ? 'refined details, natural lighting, high quality' : '');
    const finishFallback = (reason) => {
      const plan = fallbackPlan({
        description: fallbackDescription,
        previous: null,
        defaults: config.defaults,
        aspect,
        reason,
        negative: config.defaults.negative,
      });
      if (task === 'img2img' && init && init.width > 0 && init.height > 0) {
        plan.params.width = snap(init.width);
        plan.params.height = snap(init.height);
        plan.denoise = normalizeDenoise(body.denoise, 0.45);
      }
      return plan;
    };
    if (!health.llm.reachable) {
      return { plan: finishFallback(health.llm.error || 'Ollama 未连接'), critique: '', feedback, mode: 'create' };
    }
    try {
      const plan = task === 'img2img'
        ? await planFromImage({
          description: effectiveDescription,
          analysis: sourceAnalysis,
          init,
          aspect,
          style,
          preferences,
          signal,
          engineInfo,
        })
        : await planFromDescription({ description: effectiveDescription, aspect, style, preferences, signal, engineInfo });
      return { plan, critique: '', feedback, mode: 'create' };
    } catch (error) {
      if (isAbort(error)) throw error;
      return { plan: finishFallback(shortError(error)), critique: '', feedback, mode: 'create' };
    }
  }

  /*
   * Draw Things validates that width/height equal the init image exactly, and
   * its diffusion pipeline can trap on odd sizes. Reference uploads are often
   * arbitrary (e.g. 500x843), so resize the init image to the 64-grid before it
   * reaches a backend. macOS ships sips; this host is a macOS desktop app.
   */
  async function normalizeInitFrame(init) {
    const width = snap(init.width);
    const height = snap(init.height);
    if (width === init.width && height === init.height) return init;
    if (process.platform !== 'darwin') return init;
    const dir = join(config.dataDir, '.tmp');
    await mkdir(dir, { recursive: true });
    const id = randomUUID();
    const input = join(dir, `init-${id}.${extensionFor(init.mime)}`);
    const output = join(dir, `init-${id}.png`);
    try {
      await writeFile(input, init.buffer);
      await execFileAsync('/usr/bin/sips', [
        '-z', String(height), String(width),
        '-s', 'format', 'png',
        input, '--out', output,
      ], { timeout: 60000 });
      const buffer = await readFile(output);
      const size = imageDimensions(buffer);
      if (!size || size.width !== width || size.height !== height) {
        throw new Error(`sips returned ${size ? `${size.width}x${size.height}` : 'no size'}`);
      }
      return { ...init, buffer, mime: 'image/png', width, height, resizedFrom: `${init.width}x${init.height}` };
    } catch (error) {
      throw new PluginError(
        'init-resize-failed',
        `参考图 ${init.width}x${init.height} 需要调整为 ${width}x${height} 才能稳定出图，但自动调整失败：${shortError(error)}。请先在上传前裁成 64 的倍数。`,
        500,
      );
    } finally {
      await rm(input, { force: true }).catch(() => {});
      await rm(output, { force: true }).catch(() => {});
    }
  }

  function sessionFilePath(session, file) {
    const dir = safeSessionDir(session.id);
    const filePath = resolve(dir, String(file));
    const rel = relative(dir, filePath);
    if (rel === '' || rel.startsWith('..') || rel.includes(`..${sep}`)) {
      throw new PluginError('bad-request', '文件路径不合法。', 400);
    }
    return filePath;
  }

  async function resolveInit({ session, body, previous }) {
    const sourceId = asString(body.sourceId);
    if (sourceId !== '') {
      if (!isSourceId(sourceId)) throw new PluginError('bad-request', '参考图 id 不合法。', 400);
      const source = (session.sources || []).find((item) => item.id === sourceId);
      if (!source) throw new PluginError('not-found', '没有找到这张参考图。', 404);
      const buffer = await readFile(sessionFilePath(session, source.file));
      const size = imageDimensions(buffer);
      return {
        buffer,
        mime: source.mime || sniffMime(buffer),
        from: `source:${source.id}`,
        width: size ? size.width : (source.width || 0),
        height: size ? size.height : (source.height || 0),
      };
    }
    let initTurn = previous;
    const initTurnId = asString(body.initTurnId);
    if (initTurnId !== '') {
      if (!isTurnId(initTurnId)) throw new PluginError('bad-request', 'initTurnId 不合法。', 400);
      initTurn = session.turns.find((turn) => turn.id === initTurnId) || null;
      if (!initTurn) throw new PluginError('not-found', '没有找到作为底图的那一轮。', 404);
    }
    if (!initTurn) return null;
    const buffer = await readFile(sessionFilePath(session, initTurn.file));
    const size = imageDimensions(buffer);
    return {
      buffer,
      mime: initTurn.mime || sniffMime(buffer),
      from: `turn:${initTurn.id}`,
      width: size ? size.width : (initTurn.params && initTurn.params.width) || 0,
      height: size ? size.height : (initTurn.params && initTurn.params.height) || 0,
    };
  }

  async function createTurn({ session, prepared, backend, seed, signal, task = 'txt2img', init = null, denoise = DEFAULT_DENOISE }) {
    const plan = prepared.plan;
    const image = await generateImage({ plan, seed, backend, signal, task, init, denoise });
    const index = session.turns.length + 1;
    const turnId = `t${index}`;
    const dir = safeSessionDir(session.id);
    await mkdir(dir, { recursive: true });
    const file = `${turnId}.${extensionFor(image.mime)}`;
    await writeFile(join(dir, file), image.buffer);
    let initFile = null;
    if (task === 'img2img' && init) {
      initFile = `${turnId}-init.${extensionFor(init.mime)}`;
      await writeFile(join(dir, initFile), init.buffer);
    }
    const turn = {
      id: turnId,
      index,
      createdAt: Date.now(),
      task,
      mode: prepared.mode,
      feedback: prepared.feedback,
      understood: plan.understood || '',
      changes: plan.changes || [],
      brief: plan.brief || null,
      tags: plan.tags || [],
      positive: plan.positive,
      negative: plan.negative,
      params: plan.params,
      denoise: task === 'img2img' ? denoise : null,
      ...(initFile ? {
        initFile,
        initFrom: init.from,
        initWidth: init.width || plan.params.width,
        initHeight: init.height || plan.params.height,
      } : {}),
      rationale: plan.rationale || '',
      critique: prepared.critique || '',
      backend: image.backend,
      model: image.model || '',
      seed: image.seed,
      file,
      mime: image.mime,
      elapsedMs: image.elapsedMs,
      degraded: plan.degraded === true,
      degradedReason: plan.degradedReason || '',
      accepted: false,
    };
    session.turns.push(turn);
    if (prepared.mode === 'create') {
      session.brief = plan.brief || session.brief;
      const intent = cleanText(plan.brief && plan.brief.intent, 60);
      if (intent !== '' && (!session.title || session.title === '未命名作品' || session.title === '参考图作品')) {
        session.title = intent;
      }
    }
    session.updatedAt = Date.now();
    session.backend = image.backend;
    await saveSession(session);
    return { turn: publicTurn(session, turn), session: publicSession(session) };
  }

  async function runGeneration(body, signal) {
    if (activeJob) {
      throw new PluginError('busy', '已有一张图在生成，请等它完成或先取消。', 409);
    }
    const job = { sessionId: asString(body.sessionId), controller: new AbortController(), startedAt: Date.now() };
    const jobSignal = AbortSignal.any([signal, job.controller.signal]);
    activeJob = job;
    try {
      let session = null;
      if (asString(body.sessionId) !== '') {
        session = await loadSession(asString(body.sessionId));
        if (!session) throw new PluginError('not-found', '没有找到这个会话。', 404);
      }
      const description = asString(body.description);
      const feedback = asString(body.feedback);
      const positive = asString(body.positive);
      const requestedTask = body.task === 'img2img' ? 'img2img' : body.task === 'txt2img' ? 'txt2img' : '';
      const hasImageInput = asString(body.sourceId) !== '' || asString(body.initTurnId) !== '';
      if (requestedTask === 'txt2img' && hasImageInput) {
        throw new PluginError('bad-request', '文生图不接受参考图；请切换到图生图。', 400);
      }
      if (!session) {
        const task = requestedTask || (hasImageInput ? 'img2img' : 'txt2img');
        if (task === 'txt2img' && description === '' && positive === '') {
          throw new PluginError('bad-request', '请先写一段画面描述。', 400);
        }
        session = newSession(description || (task === 'img2img' ? '参考图作品' : '手动提示词作品'), task);
        session.brief = normalizeBrief(null, { aspect: aspectKey(body.aspect) || '1:1' });
      } else if (requestedTask !== '' && requestedTask !== session.task) {
        throw new PluginError('task-mismatch', '当前会话的作图类型与之不符，请新建会话。', 400);
      } else if (hasImageInput && session.task !== 'img2img') {
        throw new PluginError('task-mismatch', '文生图会话不接受参考图，请切换到图生图。', 400);
      }
      const task = session.task;
      if (isObject(body.brief)) {
        /* The panel may have already shown a reviewed plan: keep its brief so a
           manual or regenerated turn still carries the same understood intent. */
        session.brief = normalizeBrief(body.brief, {
          ...session.brief,
          aspect: aspectKey(body.aspect) || session.brief.aspect || '1:1',
        });
      }
      if (session.turns.length >= config.maxTurns) {
        throw new PluginError('max-turns', `这个会话已有 ${session.turns.length} 轮，请新建会话继续。`, 400);
      }
      const previous = asString(body.turnId) !== ''
        ? session.turns.find((turn) => turn.id === asString(body.turnId)) || null
        : (session.turns.length > 0 ? session.turns[session.turns.length - 1] : null);
      if (asString(body.turnId) !== '' && !previous) {
        throw new PluginError('not-found', '没有找到这一轮图片。', 404);
      }
      let init = null;
      if (task === 'img2img') {
        init = await resolveInit({ session, body, previous });
        if (!init) {
          throw new PluginError('need-image', '图生图需要先上传一张参考图。', 400);
        }
        init = await normalizeInitFrame(init);
      }
      const preferences = await loadPreferences();
      session.preferencesUsed = preferences.map((item) => item.text);
      const prepared = await preparePlan({ session, previous, body, signal: jobSignal, preferences, task, init });
      const aspect = aspectKey(body.aspect) || session.brief.aspect || '1:1';
      const explicitParams = isObject(body.params) && Object.keys(body.params).length > 0;
      if (explicitParams) {
        prepared.plan.params = normalizeParams(body.params, prepared.plan.params, aspect);
      }
      if (task === 'img2img' && init.width > 0 && init.height > 0) {
        /* Draw Things rejects an img2img request whose width/height do not match
           the init image exactly, including odd (non-64) sizes from uploads. */
        prepared.plan.params.width = init.width;
        prepared.plan.params.height = init.height;
      }
      if (asString(body.negative) !== '') {
        prepared.plan.negative = cleanText(body.negative, 600);
      }
      const denoise = task === 'img2img'
        ? normalizeDenoise(body.denoise, normalizeDenoise(prepared.plan.denoise, config.defaults.denoise))
        : null;
      prepared.plan.denoise = denoise;
      const backend = await pickBackend(body.backend);
      const backendHealth = await getHealth();
      applyAidrawPreset(prepared.plan, backendHealth);
      const seed = Number.isFinite(Number(body.seed)) ? Math.trunc(Number(body.seed)) : (body.params && Number.isFinite(Number(body.params.seed)) ? Math.trunc(Number(body.params.seed)) : randomSeed());
      const result = await createTurn({ session, prepared, backend, seed, signal: jobSignal, task, init, denoise: denoise ?? config.defaults.denoise });
      return result;
    } finally {
      if (activeJob === job) activeJob = null;
    }
  }

  /* ------------------------------------------------------------------ routes */

  const routes = [
    {
      path: `${ROUTE_PREFIX}/health`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => ok(await getHealth(true)),
    },
    {
      path: `${ROUTE_PREFIX}/upload`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request, MAX_UPLOAD_BODY_BYTES);
          const dataUrl = asString(body.dataUrl);
          const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([\s\S]+)$/u.exec(dataUrl);
          if (!match) throw new PluginError('bad-request', '参考图必须是 PNG/JPEG/WebP 的 base64 data URL。', 400);
          const buffer = Buffer.from(match[2], 'base64');
          if (buffer.length < 32) throw new PluginError('bad-request', '参考图数据为空。', 400);
          if (buffer.length > MAX_UPLOAD_BYTES) {
            throw new PluginError('upload-too-large', '参考图不能超过 12 MB。', 413);
          }
          const mime = sniffMime(buffer);
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime)) {
            throw new PluginError('bad-request', '只支持 PNG/JPEG/WebP 参考图。', 400);
          }
          let session = null;
          const sessionId = asString(body.sessionId);
          if (sessionId !== '') {
            session = await loadSession(sessionId);
            if (!session) return failure('not-found', '没有找到这个会话。', 404);
            if (session.task !== 'img2img') {
              return failure('task-mismatch', '当前会话是文生图，不能添加参考图。', 400);
            }
          } else {
            session = newSession(cleanText(body.name, 60) || '参考图作品', 'img2img');
            session.brief = normalizeBrief(null, { aspect: '1:1' });
          }
          await mkdir(safeSessionDir(session.id), { recursive: true });
          const sourceId = `s${randomBytes(4).toString('hex')}`;
          const sourceDir = join(safeSessionDir(session.id), 'sources');
          await mkdir(sourceDir, { recursive: true });
          const file = `sources/${sourceId}.${extensionFor(mime)}`;
          await writeFile(join(safeSessionDir(session.id), file), buffer);
          const size = imageDimensions(buffer);
          if (!size || size.width < 1 || size.height < 1) {
            throw new PluginError('bad-request', '无法读取参考图尺寸，请换成 PNG/JPEG 图片。', 400);
          }
          const source = {
            id: sourceId,
            file,
            mime,
            width: size.width,
            height: size.height,
            name: cleanText(body.name, 80) || '参考图',
            createdAt: Date.now(),
          };
          session.sources = [source, ...(session.sources || [])];
          const removed = session.sources.splice(8);
          for (const old of removed) {
            try {
              await rm(join(safeSessionDir(session.id), old.file), { force: true });
            } catch (_) {
              /* a vanished source file must not fail the upload */
            }
          }
          session.updatedAt = Date.now();
          await saveSession(session);
          return ok({ session: publicSession(session), source: publicSource(session, source) });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      path: `${ROUTE_PREFIX}/source`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const url = new URL(request.url);
          const sessionId = asString(url.searchParams.get('session'));
          const sourceId = asString(url.searchParams.get('source'));
          if (!isSessionId(sessionId) || !isSourceId(sourceId)) {
            return failure('bad-request', '参考图参数不合法。', 400);
          }
          const session = await loadSession(sessionId);
          if (!session) return failure('not-found', '没有找到这个会话。', 404);
          const source = (session.sources || []).find((item) => item.id === sourceId);
          if (!source) return failure('not-found', '没有找到这张参考图。', 404);
          const dir = safeSessionDir(sessionId);
          const filePath = resolve(dir, source.file);
          const rel = relative(dir, filePath);
          if (rel === '' || rel.startsWith('..') || rel.includes(`..${sep}`)) {
            return failure('bad-request', '参考图路径不合法。', 400);
          }
          const buffer = await readFile(filePath);
          return new Response(buffer, {
            status: 200,
            headers: {
              'content-type': source.mime || sniffMime(buffer),
              'content-length': String(buffer.length),
              'cache-control': 'no-store',
            },
          });
        } catch (error) {
          if (error && error.code === 'ENOENT') return failure('not-found', '参考图文件不存在。', 404);
          return toFailure(error);
        }
      },
    },
    {
      path: `${ROUTE_PREFIX}/backend`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request);
          const backend = normalizeBackendValue(asString(body.backend));
          if (!['auto', 'drawthings', 'comfy'].includes(backend)) {
            return failure('bad-request', '未知的出图引擎（可选 drawthings / comfy）。', 400);
          }
          await loadSettings();
          selectedBackend = backend === 'auto' ? '' : backend;
          await saveSettings();
          healthCache = { at: 0, value: null };
          return ok({ selected: effectiveBackend(), health: await getHealth(true) });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      path: `${ROUTE_PREFIX}/session`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const url = new URL(request.url);
        const taskFilter = url.searchParams.get('task') === 'img2img'
          ? 'img2img'
          : url.searchParams.get('task') === 'txt2img' ? 'txt2img' : '';
        let id = asString(url.searchParams.get('session') || url.searchParams.get('id') || '');
        if (id === '') id = await latestSessionId(taskFilter);
        if (id === '') return ok({ session: null });
        const session = await loadSession(id);
        if (!session) return failure('not-found', '没有找到这个会话。', 404);
        return ok({ session: publicSession(session) });
      },
    },
    {
      path: `${ROUTE_PREFIX}/history`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const url = new URL(request.url);
        const limit = clamp(asInt(url.searchParams.get('limit'), config.historyLimit), 1, 50);
        const taskFilter = url.searchParams.get('task') === 'img2img'
          ? 'img2img'
          : url.searchParams.get('task') === 'txt2img' ? 'txt2img' : '';
        return ok({ sessions: await history(limit, taskFilter) });
      },
    },
    {
      path: `${ROUTE_PREFIX}/plan`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request);
          const task = body.task === 'img2img' || asString(body.sourceId) !== '' ? 'img2img' : 'txt2img';
          const description = asString(body.description);
          if (task === 'txt2img' && description === '') {
            return failure('bad-request', '请先写一段画面描述。', 400);
          }
          const preferences = await loadPreferences();
          const aspect = aspectKey(body.aspect) || '1:1';
          let session = null;
          if (asString(body.sessionId) !== '') {
            session = await loadSession(asString(body.sessionId));
            if (!session) return failure('not-found', '没有找到这个会话。', 404);
          }
          let init = null;
          if (task === 'img2img') {
            if (!session) return failure('bad-request', '请先上传参考图。', 400);
            const previous = session.turns.length > 0 ? session.turns[session.turns.length - 1] : null;
            init = await resolveInit({ session, body, previous });
            if (!init) return failure('bad-request', '请先上传参考图。', 400);
          }
          const started = Date.now();
          const signal = AbortSignal.timeout(config.llm.timeoutMs);
          const health = await getHealth();
          const engineInfo = engineCapabilityNote(health);
          let analysis = '';
          if (task === 'img2img' && init && health.llm.reachable && health.llm.supportsVision) {
            try {
              analysis = await critiqueBuffer(init.buffer, signal);
            } catch (_) {
              /* optional */
            }
          }
          const fallback = (reason) => {
            const plan = fallbackPlan({
              description: description || (task === 'img2img' ? 'refined details, natural lighting, high quality' : ''),
              previous: null,
              defaults: config.defaults,
              aspect,
              reason: shortError(reason),
              negative: config.defaults.negative,
            });
            if (task === 'img2img' && init) {
              plan.params.width = snap(init.width || config.defaults.width);
              plan.params.height = snap(init.height || config.defaults.height);
              plan.denoise = normalizeDenoise(body.denoise, 0.45);
            }
            return plan;
          };
          try {
            const plan = task === 'img2img'
              ? await planFromImage({
                description,
                analysis,
                init,
                aspect,
                style: cleanText(body.style, 60),
                preferences,
                signal,
                engineInfo,
              })
              : await planFromDescription({
                description,
                aspect,
                style: cleanText(body.style, 60),
                preferences,
                signal,
                engineInfo,
              });
            if (Number.isFinite(Number(body.denoise))) {
              plan.denoise = normalizeDenoise(body.denoise, plan.denoise ?? config.defaults.denoise);
            }
            return ok({ plan, sessionId: session ? session.id : null, elapsedMs: Date.now() - started });
          } catch (error) {
            return ok({ plan: fallback(error), sessionId: session ? session.id : null, elapsedMs: Date.now() - started });
          }
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      path: `${ROUTE_PREFIX}/generate`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request);
          const result = await runGeneration(body, request.signal);
          return ok(result);
        } catch (error) {
          if (isAbort(error)) return failure('cancelled', '已取消这一轮生成。', 499);
          return toFailure(error);
        }
      },
    },
    {
      path: `${ROUTE_PREFIX}/accept`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request);
          const session = await loadSession(asString(body.sessionId));
          if (!session) return failure('not-found', '没有找到这个会话。', 404);
          const turn = session.turns.find((item) => item.id === asString(body.turnId));
          if (!turn) return failure('not-found', '没有找到这一轮图片。', 404);
          turn.accepted = true;
          session.updatedAt = Date.now();
          const text = await distillPreference(session, turn);
          const preference = await appendPreference(text, session.id);
          await saveSession(session);
          return ok({ session: publicSession(session), preference: preference || null, preferences: await loadPreferences() });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      path: `${ROUTE_PREFIX}/preference/delete`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request);
          const id = asString(body.id);
          const list = (await loadPreferences()).filter((item) => item.id !== id);
          await savePreferences(list);
          return ok({ preferences: list });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      path: `${ROUTE_PREFIX}/cancel`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async () => {
        if (!activeJob) return ok({ cancelled: false });
        const job = activeJob;
        job.controller.abort();
        return ok({ cancelled: true, sessionId: job.sessionId || null });
      },
    },
    {
      path: `${ROUTE_PREFIX}/image`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const url = new URL(request.url);
          const sessionId = asString(url.searchParams.get('session'));
          const turnId = asString(url.searchParams.get('turn'));
          const kind = asString(url.searchParams.get('kind'), 'output');
          if (!isSessionId(sessionId) || !isTurnId(turnId) || !['output', 'init'].includes(kind)) {
            return failure('bad-request', '图片参数不合法。', 400);
          }
          const session = await loadSession(sessionId);
          if (!session) return failure('not-found', '没有找到这个会话。', 404);
          const turn = session.turns.find((item) => item.id === turnId);
          const file = turn ? (kind === 'init' ? turn.initFile : turn.file) : '';
          if (!turn || !file) return failure('not-found', '没有找到这一轮图片。', 404);
          const dir = safeSessionDir(sessionId);
          const filePath = resolve(dir, file);
          const rel = relative(dir, filePath);
          if (rel === '' || rel.startsWith('..') || rel.includes(`..${sep}`)) {
            return failure('bad-request', '图片路径不合法。', 400);
          }
          const buffer = await readFile(filePath);
          return new Response(buffer, {
            status: 200,
            headers: {
              'content-type': kind === 'init' ? sniffMime(buffer) : (turn.mime || sniffMime(buffer)),
              'content-length': String(buffer.length),
              'cache-control': 'no-store',
            },
          });
        } catch (error) {
          if (error && error.code === 'ENOENT') return failure('not-found', '图片文件不存在。', 404);
          return toFailure(error);
        }
      },
    },
  ];

  function toFailure(error) {
    if (error instanceof PluginError) return failure(error.code, error.message, error.status);
    ctx.logger?.warn?.(`image-studio: ${shortError(error)}`);
    return failure('internal', shortError(error), 500);
  }

  for (const route of routes) {
    ctx.connection.fetch.register(route);
  }

  const markerFile = join(config.dataDir, 'runtime.json');
  void mkdir(config.dataDir, { recursive: true })
    .then(() => writeFile(markerFile, `${JSON.stringify({
      pid: process.pid,
      at: Date.now(),
      backend: config.backend,
      selectedBackend,
      dataDir: config.dataDir,
      drawthingsCli: { binary: config.drawthingsCli.binary, model: config.drawthingsCli.model },
      llm: { baseUrl: config.llm.baseUrl, model: config.llm.model, visionModel: config.llm.visionModel },
      drawthings: config.drawthings.baseUrl,
      comfyui: config.comfyui.baseUrl || DEFAULT_COMFY_URLS,
      routes: routes.map((route) => route.path),
    }, null, 2)}\n`, 'utf8'))
    .catch((error) => {
      ctx.logger?.warn?.(`image-studio: could not write runtime marker: ${shortError(error)}`);
    });

  ctx.effect(() => () => {
    if (activeJob) {
      try {
        activeJob.controller.abort();
      } catch (_) {
        /* already aborted */
      }
    }
    activeJob = null;
    healthCache = { at: 0, value: null };
    modelCache = { at: 0, value: null };
    modelInfoCache.clear();
    sessionCache.clear();
    preferencesCache = null;
    comfyResolved = '';
  }, 'image-studio: abort generation and clear caches on unload');
}
