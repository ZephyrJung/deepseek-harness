/**
 * Optional live probe for image-studio.
 *
 * It never starts Draw Things or ComfyUI. It only:
 *   1. probes the real local endpoints (Draw Things 7860, ComfyUI 8188/8000,
 *      Ollama 11434),
 *   2. invokes the plugin's /health route in-process for the chosen backend and
 *      model names,
 *   3. runs one real generation only when IMAGE_STUDIO_REAL=1 and at least one
 *      image backend is reachable.
 *
 * With everything down, or without IMAGE_STUDIO_REAL=1, it prints a status
 * table and exits 0 (skip, not failure). Run with:
 *
 *   node test/real-probe.mjs
 *   IMAGE_STUDIO_REAL=1 node test/real-probe.mjs
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..');

const drawthingsUrl = (process.env.DSH_IMAGE_STUDIO_DRAWTHINGS_URL || 'http://127.0.0.1:7860').replace(/\/+$/u, '');
const comfyUrls = [...new Set([
  process.env.DSH_IMAGE_STUDIO_COMFY_URL || '',
  'http://127.0.0.1:8188',
  'http://127.0.0.1:8000',
].map((value) => value.replace(/\/+$/u, '')).filter(Boolean))];
const ollamaUrl = (process.env.DSH_OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/+$/u, '');
const real = process.env.IMAGE_STUDIO_REAL === '1';

const temporaryHome = await mkdtemp(join(tmpdir(), 'dsh-image-studio-probe-'));
process.env.DSH_HOME = temporaryHome;

const timings = [];

function stamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function shortError(error) {
  if (!error) return 'unknown error';
  const text = String(error.message || error);
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

async function probeJson(pathname, label) {
  const started = Date.now();
  try {
    const response = await fetch(`${pathname}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(2500),
    });
    timings.push(`${label} ${Date.now() - started}ms`);
    if (!response.ok) return { online: false, detail: `HTTP ${response.status}` };
    return { online: true, data: await response.json() };
  } catch (error) {
    timings.push(`${label} ${Date.now() - started}ms`);
    return { online: false, detail: shortError(error) };
  }
}

function row(name, url, probe, detail) {
  return { name, url, status: probe.online ? 'ONLINE' : 'OFFLINE', detail };
}

function printTable(rows) {
  const headers = ['后端', '地址', '状态', '详情'];
  const widths = [14, 26, 9, 55];
  const line = (cells) => cells.map((cell, index) => String(cell).padEnd(widths[index])).join('  ').trimEnd();
  console.log(line(headers));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  for (const rowValue of rows) console.log(line([rowValue.name, rowValue.url, rowValue.status, rowValue.detail]));
}

/* A tiny in-process driver for the plugin's Connection Fetch routes. */
function makeContext() {
  const routes = new Map();
  const effects = [];
  const ctx = {
    logger: { info() {}, warn() {}, debug() {}, error() {} },
    connection: {
      fetch: {
        register(route) {
          const dispose = () => routes.delete(route.path);
          ctx.effect(() => {
            routes.set(route.path, route);
            return dispose;
          }, `route ${route.path}`);
          return dispose;
        },
      },
    },
    effect(factory) {
      const dispose = factory();
      effects.push(dispose);
      return dispose;
    },
    dispose() {
      for (const dispose of effects.splice(0).reverse()) {
        if (typeof dispose === 'function') dispose();
      }
    },
  };
  return { ctx, routes };
}

async function callRoute(routes, path, init = {}) {
  const url = new URL(path, 'http://127.0.0.1');
  const route = routes.get(url.pathname);
  if (!route) throw new Error(`路由未注册：${url.pathname}`);
  return route.fetch(new Request(url, init));
}

async function postJson(routes, path, body) {
  const response = await callRoute(routes, path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch (_) { /* keep raw text below */ }
  return { response, payload, text };
}

let context = null;
let exitCode = 0;
try {
  console.log('Image Studio 真实后端探测（不会启动任何 GUI 应用）');
  console.log('');

  const [drawthings, comfy8188, comfy8000, ollama] = await Promise.all([
    probeJson(`${drawthingsUrl}/sdapi/v1/options`, 'drawthings'),
    probeJson(`${comfyUrls[0]}/system_stats`, `comfy ${comfyUrls[0]}`),
    probeJson(`${comfyUrls[1]}/system_stats`, `comfy ${comfyUrls[1]}`),
    probeJson(`${ollamaUrl}/api/tags`, 'ollama'),
  ]);

  const rows = [
    row(
      'Draw Things',
      drawthingsUrl,
      drawthings,
      drawthings.online
        ? (() => {
          const data = drawthings.data && typeof drawthings.data === 'object' ? drawthings.data : {};
          const model = data.model || data.sd_model_checkpoint || '';
          return model ? `${model}（当前模型）` : '可连接，但未读到当前模型';
        })()
        : drawthings.detail,
    ),
    row(
      'ComfyUI',
      comfyUrls[0],
      comfy8188,
      comfy8188.online ? '可连接' : comfy8188.detail,
    ),
    row(
      'ComfyUI',
      comfyUrls[1],
      comfy8000,
      comfy8000.online ? '可连接' : comfy8000.detail,
    ),
    row(
      'Ollama',
      ollamaUrl,
      ollama,
      ollama.online
        ? `${Array.isArray(ollama.data && ollama.data.models) ? ollama.data.models.length : 0} 个模型`
        : ollama.detail,
    ),
  ];
  printTable(rows);
  if (ollama.online) {
    const names = (ollama.data.models || []).map((model) => model && model.name).filter(Boolean);
    console.log(`Ollama 模型：${names.slice(0, 8).join(', ')}${names.length > 8 ? ' …' : ''}`);
  }
  console.log('');

  const host = await import(join(packageDir, 'index.js'));
  if (typeof host.apply !== 'function') throw new Error('index.js 没有导出 apply(ctx, config)');
  context = makeContext();
  host.apply(context.ctx, {
    backend: 'auto',
    drawthings: { baseUrl: drawthingsUrl },
    ...(process.env.DSH_IMAGE_STUDIO_COMFY_URL ? { comfyui: { baseUrl: process.env.DSH_IMAGE_STUDIO_COMFY_URL.replace(/\/+$/u, '') } } : {}),
    llm: { baseUrl: ollamaUrl },
  });

  const healthResponse = await callRoute(context.routes, '/api/image-studio/health');
  const healthText = await healthResponse.text();
  let health = null;
  try { health = JSON.parse(healthText); } catch (_) { /* reported below */ }
  if (healthResponse.status !== 200 || !health || health.ok !== true) {
    throw new Error(`/health 失败（HTTP ${healthResponse.status}）：${healthText.slice(0, 300)}`);
  }

  console.log('插件健康状态：');
  console.log(`  当前后端     : ${health.active || '无'}`);
  console.log(`  Draw Things  : ${health.backends.drawthings.reachable ? '在线' : '离线'} — ${health.backends.drawthings.error || `${health.backends.drawthings.models.length} 个模型`}`);
  console.log(`  ComfyUI      : ${health.backends.comfyui.reachable ? '在线' : '离线'} — ${health.backends.comfyui.error || `${health.backends.comfyui.checkpoints.length} 个 checkpoint`}`);
  console.log(`  Ollama       : ${health.llm.reachable ? '在线' : '离线'} — ${health.llm.error || `模型 ${health.llm.model}${health.llm.visionModel ? ` / 视觉 ${health.llm.visionModel}` : ''}`}`);
  if (health.setup.length > 0) {
    console.log('  设置提示：');
    for (const hint of health.setup) console.log(`    - [${hint.code}] ${hint.message}`);
  }
  console.log('');

  const imageBackendOnline = health.backends.drawthings.reachable || health.backends.comfyui.reachable;
  if (!real) {
    console.log('SKIP 未执行真实生成：默认只做只读探测。');
    console.log('确认后端与模型就绪后，用下面的命令生成一张测试图：');
    console.log('  IMAGE_STUDIO_REAL=1 node test/real-probe.mjs');
    console.log('');
    console.log('如果后端离线：');
    console.log('  - Draw Things：打开 App → 设置 → API Server 开启（默认 7860）。');
    console.log('  - ComfyUI：启动服务（Desktop 默认 8000，独立版默认 8188），并准备 checkpoint。');
    console.log('  - Ollama：确认 ollama serve 在 11434 运行，并已 pull 视觉/对话模型。');
    exitCode = 0;
  } else if (!imageBackendOnline) {
    console.log('SKIP 未执行真实生成：没有可达的图像后端。');
    console.log('请先启动 Draw Things（设置里开启 API Server，默认 7860）或 ComfyUI（8000/8188），再设置 IMAGE_STUDIO_REAL=1 重试。');
    exitCode = 0;
  } else {
    const description = '一只在雨夜霓虹街头漫步的橘猫，电影感，低饱和';
    console.log(`开始真实生成（${health.active || 'auto'}）：${description}`);
    console.log('本地扩散模型可能需要数十秒到数分钟，请耐心等待…');
    const started = Date.now();
    const generated = await postJson(context.routes, '/api/image-studio/generate', {
      description,
      aspect: '3:4',
      ...(health.active ? { backend: health.active } : {}),
    });
    if (generated.response.status !== 200 || !generated.payload || generated.payload.ok !== true) {
      throw new Error(`生成失败（HTTP ${generated.response.status}）：${generated.text.slice(0, 500)}`);
    }
    const { session, turn } = generated.payload;
    const elapsedSeconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log('');
    console.log(`生成成功：${elapsedSeconds}s`);
    console.log(`  会话        : ${session.id}`);
    console.log(`  轮次        : ${turn.id}（${turn.mode}，${turn.backend}）`);
    console.log(`  种子        : ${turn.seed}`);
    console.log(`  参数        : ${turn.params.width}x${turn.params.height}, steps ${turn.params.steps}, cfg ${turn.params.cfg}, ${turn.params.sampler}`);
    console.log(`  降级        : ${turn.degraded ? `是（${turn.degradedReason}）` : '否'}`);
    console.log(`  正向提示词  : ${turn.positive}`);
    if (turn.critique) console.log(`  视觉点评    : ${turn.critique.slice(0, 200)}`);

    const imageResponse = await callRoute(
      context.routes,
      `/api/image-studio/image?session=${encodeURIComponent(session.id)}&turn=${encodeURIComponent(turn.id)}`,
    );
    if (imageResponse.status !== 200) throw new Error(`读取生成图片失败（HTTP ${imageResponse.status}）`);
    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    const mime = imageResponse.headers.get('content-type') || 'image/png';
    const extension = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
    const imagePath = join(tmpdir(), `image-studio-real-${stamp()}.${extension}`);
    await writeFile(imagePath, bytes);
    console.log(`  图片        : ${imagePath}（${bytes.length} 字节）`);
    exitCode = 0;
  }
} catch (error) {
  console.error('FAIL 真实探测失败：');
  console.error(error && error.stack ? error.stack : error);
  exitCode = 1;
} finally {
  try { context?.ctx.dispose(); } catch (_) { /* already disposed */ }
  await rm(temporaryHome, { recursive: true, force: true });
  if (exitCode !== 0) process.exitCode = exitCode;
}
