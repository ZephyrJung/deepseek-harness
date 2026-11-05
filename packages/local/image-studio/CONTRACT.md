# AI作图 (AI Art) plugin — implementation contract

Working dir: `/Users/zephyr/Documents/deepseek-harness/default-workspace/image-studio`

A DSH Web UI plugin ("AI作图 / AI Art") with two tasks, **文生图 (txt2img)** and
**图生图 (img2img)**. It generates images with the machine-local **Draw Things** A1111
API (primary) or **ComfyUI** HTTP API (fallback), uses the local **Ollama** model to
understand the user's intent, write better prompts, pick parameters, look at the
result, and refine from natural-language feedback across turns.

Reference implementation to copy patterns from: `../speech-notes/`
(host routes, client module loader, locale, slot registration, test harness style).
Read `../speech-notes/index.js`, `../speech-notes/client.js`,
`../speech-notes/test/harness.mjs`, `../speech-notes/test/client-smoke.mjs`.

## Files and write ownership (do not edit another owner's files)

| Path | Owner | Notes |
| --- | --- | --- |
| `CONTRACT.md` | Lead | this file |
| `package.json`, `cordis.patch.yml`, `icon.svg` | Lead | manifest, bundle patch, icon |
| `index.js` | Lead | host: routes, LLM, backends, storage |
| `client.js` | UI | browser panel (plain JS, `window.__ModuleLoader__`) |
| `locale/zh.json`, `locale/en.json` | UI | `meta` + panel dictionaries |
| `test/client-smoke.mjs` | UI | module/locale/slot smoke test |
| `test/harness.mjs` | QA | host routes against fake DrawThings/ComfyUI/Ollama |
| `test/real-probe.mjs` | QA | manual live probe (skips gracefully when servers are down) |
| `README.md` | QA | Chinese usage/setup doc |

Do not touch `../speech-notes/` or the DSH profile. Lead installs the bundle.

## Product behaviour

1. The panel is a sidebar entry (id `image-studio`) titled **AI作图**. A task switch at
   the top selects **文生图** or **图生图**.
2. 文生图: the user types a Chinese/English description, optionally picks an aspect ratio
   and a style hint, and presses 生成.
3. 图生图: the user uploads/pastes/drops a reference image (PNG/JPEG/WebP, stored as a
   session source), sees its preview, optionally writes what should change, sets the
   change strength (denoise 0.15–0.95, default 0.55), and generates. The host sends the
   source plus prompt to Draw Things `/sdapi/v1/img2img` or a ComfyUI img2img graph
   (LoadImage → VAEEncode → KSampler). Each img2img turn stores the exact init image it
   used, so history stays reproducible.
 4. On first generation the host asks local Ollama to turn the description into a
    **creative brief** (intent, subject, style, composition, lighting, palette, aspect),
    an English positive prompt, a negative prompt and parameter suggestions; the style
    chips above the textarea pick a 绘画风格 (photoreal / cinematic / watercolor / ink /
    anime / oil / 3D / minimal / cyberpunk / pixel art), and the planner tunes the
    prompt, `brief.style` and `params` (steps/cfg/sampler) to match the chosen style;
    for 图生图
    it also looks at the source image (vision model), writes an edit-oriented prompt that
    preserves the unrequested content, and suggests a denoise strength. Then it calls the
    image backend. The panel shows the image, the enhanced prompt, the brief chips and a
    short Chinese rationale ("为什么这样画").
 5. Feedback loop: after seeing an image the composer card switches to
    “继续调整” (the same single textarea, a refine placeholder, and a
    “再次生成” button). The user writes what to change
    ("背景太乱，脸再小一点，光线更暖"). The next turn sends the
    brief, the last turns and the feedback to the model, which classifies the feedback,
    changes only what is needed, preserves the rest, adjusts parameters when the request
    is about detail/light/aspect, and regenerates. The user can also edit the prompt and
    parameters directly and regenerate. Every turn archives its own brief, tags and
    rationale; clicking a turn thumbnail in “本组图” replays that round's brief.
6. Optional "让模型看画面" (default on when the configured Ollama model supports images):
   before refining, send the latest image to the vision model for an objective critique,
   which is folded into the refinement prompt.
7. 设为满意 (accept): marks the turn accepted and distills one short Chinese preference
   from it; preferences are stored and injected into every later planning prompt, so the
   plugin keeps improving across sessions. Preferences can be deleted in the panel.
8. Health card shows Draw Things / ComfyUI / Ollama reachability, active backend, model
   names, plus localized setup hints when a backend is down.
9. If Ollama is unreachable the plugin still works: it falls back to the raw description,
   default parameters, and marks the turn `degraded: true` with a reason. If no image
   backend is reachable the generate call fails with a clear message and setup hint.

## Host API (all under `/api/image-studio`, registered on `ctx.connection.fetch`)

Authenticated same-origin Connection Fetch routes; JSON bodies; every response is
`{ ok: true, ... }` or `{ ok: false, error: { code, message } }`.

| Method | Path | Body / query | Result |
| --- | --- | --- | --- |
| GET | `/health` | – | `{ ok, active, backends: { drawthings, drawthings-cli, comfyui }, aidraw, llm, defaults, preferences, setup }` |
| GET | `/session` | `?id=` or `?task=txt2img\|img2img` (latest of that task when no id) | `{ ok, session }` |
| GET | `/history` | `?limit=20&task=txt2img\|img2img` | `{ ok, sessions: [summary] }` |
| POST | `/upload` | `{ dataUrl, name?, sessionId? }` | `{ ok, session, source }` (creates an img2img session when `sessionId` is absent) |
| GET | `/source` | `?session=&source=` | uploaded reference image bytes |
| POST | `/plan` | `{ task?, description, aspect?, style?, sessionId?, sourceId?, denoise? }` | `{ ok, plan, sessionId, elapsedMs }` (no image, no turn persisted) |
| POST | `/generate` | `{ task?, sessionId?, description?, positive?, negative?, params?, feedback?, turnId?, useVision?, backend?, aspect?, style?, brief?, seed?, sourceId?, initTurnId?, denoise? }` | `{ ok, session, turn }` |
| POST | `/accept` | `{ sessionId, turnId }` | `{ ok, session, preference?, preferences }` |
| POST | `/preference/delete` | `{ id }` | `{ ok, preferences }` |
| POST | `/cancel` | `{ sessionId? }` | `{ ok, cancelled }` |
| GET | `/image` | `?session=&turn=&kind=output\|init` | image bytes (`image/png` or `image/jpeg`), `cache-control: no-store` |

`/generate` can take minutes (local diffusion): it must not be killed by a 30 s route
timeout; the client shows elapsed time, a cancel button, and treats HTTP 409
`{ code: 'busy' }` as "another generation is running".

### Health shape

```json
{
  "ok": true,
  "active": "drawthings",
  "backends": {
    "drawthings": { "id": "drawthings", "reachable": true, "baseUrl": "http://127.0.0.1:7860", "models": ["..."], "error": null },
    "drawthings-cli": { "id": "drawthings-cli", "reachable": true, "installed": true, "binary": "/opt/homebrew/bin/draw-things-cli", "version": "26.1023.0", "models": [{ "id": "z_image_turbo_1.0_q8p.ckpt", "name": "Z Image Turbo 1.0" }], "model": "z_image_turbo_1.0_q8p.ckpt", "error": null },
    "comfyui": { "id": "comfyui", "reachable": false, "baseUrl": "http://127.0.0.1:8188", "checkpoints": [], "error": "fetch failed" }
  },
  "aidraw": { "available": true, "binary": "/Users/.../DrawUtils/aidraw" },
  "llm": { "reachable": true, "baseUrl": "http://127.0.0.1:11434", "model": "ahmadwaqar/mai-ui:latest", "visionModel": "ahmadwaqar/mai-ui:latest", "supportsVision": true, "models": [{ "id": "...", "vision": true }], "error": null },
  "defaults": { "width": 1024, "height": 1024, "steps": 28, "cfg": 5, "sampler": "DPM++ 2M Karras", "negative": "...", "denoise": 0.55 },
  "preferences": [{ "id": "...", "text": "偏爱低饱和电影感，避免塑料光泽" }],
  "setup": [{ "code": "drawthings-offline", "message": "启动 Draw Things 并在设置中开启 API Server（默认 7860）。" }]
}
```

### Session shape

```json
{
  "id": "20261030-083000-ab12cd34",
  "createdAt": 1760000000000,
  "updatedAt": 1760000000000,
  "title": "雨夜霓虹街头的橘猫",
  "task": "txt2img",
  "brief": { "intent": "...", "subject": "...", "style": "...", "composition": "...", "lighting": "...", "palette": "...", "aspect": "3:4" },
  "sources": [{ "id": "s1a2b3c4", "file": "sources/s1a2b3c4.png", "mime": "image/png", "width": 768, "height": 1024, "name": "cat.png", "createdAt": 1760000000000 }],
  "preferencesUsed": ["..."],
  "turns": [
    {
      "id": "t1", "index": 1, "createdAt": 1760000000001,
      "mode": "create", "task": "txt2img", "feedback": "", "understood": "", "changes": [],
      "positive": "...", "negative": "...",
      "params": { "width": 1024, "height": 1360, "steps": 28, "cfg": 5, "sampler": "DPM++ 2M Karras" },
      "rationale": "...", "critique": "",
      "backend": "drawthings", "model": "...", "seed": 123456,
      "imageUrl": "/api/image-studio/image?session=<id>&turn=t1",
      "denoise": 0.55, "initFrom": "source:s1a2b3c4",
      "initImageUrl": "/api/image-studio/image?session=<id>&turn=t1&kind=init",
      "mime": "image/png", "elapsedMs": 41234,
      "degraded": false, "degradedReason": "",
      "accepted": false
    }
  ]
}
```

Session summary for `/history`: `{ id, title, task, createdAt, updatedAt, turns, backend, cover: { imageUrl, turnId } | null, brief }`.

### Upload

- Decode `dataUrl` (base64), accept `image/png`, `image/jpeg`, `image/webp`, max 12 MB decoded.
- Store under `sessions/<id>/sources/<sourceId>.<ext>`; append `{id, file, mime, width, height, name, createdAt}` to `session.sources` (keep at most 8, newest first).
- A new session is created with `task: 'img2img'`; the title comes from the file name or "参考图 …".
- Response `source.url` is `/api/image-studio/source?session=<id>&source=<sid>`.
- `GET /source` validates both ids and serves only files under the session's `sources/` directory.

### img2img turn rules

- The init image is chosen in this order: explicit `sourceId`; `initTurnId`; `turnId`;
  the latest turn's output when the session is img2img; otherwise error `need-image`
  (400).
- The bytes used are copied to `sessions/<id>/<turnId>-init.<ext>` and referenced by
  `initFile`; `initFrom` records `source:<id>` or `turn:<id>`.
- `denoise` defaults to the plan's suggested value, then 0.55; clamp 0.15–0.95.
- Output `params.width/height` default to the init image's dimensions (snapped to 64)
  unless the user explicitly provided params; never let the planner silently change the
  frame of an img2img turn.
- Refine/variation in an img2img session keeps using the latest output as the next init
  image, so a feedback loop behaves like progressive img2img.

### `/plan` result

```json
{
  "brief": { "intent": "...", "subject": "...", "style": "...", "composition": "...", "lighting": "...", "palette": "...", "aspect": "3:4" },
  "positive": "...", "negative": "...",
  "params": { "width": 1024, "height": 1360, "steps": 28, "cfg": 5, "sampler": "DPM++ 2M Karras" },
  "rationale": "...", "tags": ["电影感", "低饱和"],
  "denoise": 0.55,
  "degraded": false, "degradedReason": ""
}
```

## UI requirements (client.js)

- Same module shape as `speech-notes/client.js`: `window.__ModuleLoader__.load({ id: '@local/dsh-image-studio', factory(require) { ... } })`, React via `require('react')`, `exports.inject = ['connection','slots','locale']`, `exports.apply`.
- Register a `sidebar.panellist` icon (SVG component, `label` = AI作图) and the `main` panel with `{ name: 'main', key: 'image-studio', locale: 'image-studio' }`.
- Header shows the **AI作图** title and a two-tab task switch **文生图 / 图生图**. The active task decides which composer is shown; switching task loads the latest session of that task (or a blank composer).
- 图生图 composer: drag/drop, paste, or file picker; preview with dimensions and a remove/replace action; optional "use the latest result as reference"; denoise slider 0.15–0.95 with labels 微调 / 平衡 / 大改; optional description and style chips; 生成. Uploading posts `/upload` and keeps the returned `sourceId` + `sessionId`.
- Result card for img2img shows the init image and the output side by side (or an A/B toggle), and the meta line includes the denoise value. Feedback/refine works the same as txt2img and uses the latest output as the next init image.
- Inject one `<style data-dsh-plugin="@local/dsh-image-studio">` in `apply` via `ctx.effect`, removed on dispose. Prefix classes `dsi-`. Prefer host theme tokens (`--dsw-alias-*`) **with dark fallbacks**, because the speech-notes panel is dark-only; look good in both themes.
- Layout: header (kicker/title/subtitle + backend/LLM pills + health refresh); composer card (style chips **above** the textarea, textarea, aspect chips, 开始创作 button, "先理解意图" secondary action; after the first render the same card becomes 继续调整 with a refine placeholder and a 再次生成 button — no quick-feedback chips); brief card (chips + editable positive/negative prompt + params row + rationale; shows the archived brief of the turn selected in 本组图); result card (image, meta line, actions 保存图片/复制提示词/设为满意/取消); turn history strip (thumbnails, active state, click to view); preferences card (chips with delete); recent sessions list; setup/error banners; footer hints.
- All visible text through locale keys, both `zh` and `en` complete. `meta.title`/`meta.description` in `locale/*.json`.
- Network: `fetch(`${API}${path}`, { credentials: 'same-origin', cache: 'no-store' })`; `API = '/api/image-studio'`. Poll `/health` on mount and after failures. For generate: disable composer, show elapsed seconds counter + cancel (`POST /cancel`), then render returned session/turn. Never block on a stuck request without the cancel button.
- No HTML strings injected; React elements only. No `dangerouslySetInnerHTML`. Markdown not required.
- Keep component free of side effects except `apply`-registered style/locale/slots.
- `test/client-smoke.mjs` mirrors speech-notes: executes `client.js` in `vm` with a stub React + module loader, asserts factory/apply/inject, both slots registered, all `t('key')` used exist in both dictionaries, and `meta` fields present.

## Host behaviour details

- Config (all optional, read from the row's `config`):
  `backend: 'auto'|'drawthings'|'drawthings-cli'|'comfyui'`; `drawthings.baseUrl` (7860), `drawthings.model`;
  `comfyui.baseUrl` (probe `8188` then `8000` when auto), `comfyui.checkpoint` (first
  available), `comfyui.pollMs`; `llm.baseUrl` (11434), `llm.model` (auto: smallest local
  chat model, skip embedding/ocr/rerank), `llm.visionModel` (auto: vision-capable model, detected from the model name or Ollama `details.family`),
  `llm.enabled`, `llm.temperature`, `llm.timeoutMs`, `llm.numCtx`, `llm.numPredict`, `llm.think`, `llm.keepAlive`; `drawthings.timeoutMs`, `comfyui.timeoutMs`;
  `drawthingsCli.binary`/`.model`/`.modelsDir`/`.timeoutMs`;
  `aidraw.binary` (auto-discovered: config → `DSH_IMAGE_STUDIO_AIDRAW_BIN` →
  `/opt/homebrew/bin` → `/usr/local/bin` → DrawUtils project dir → `PATH`),
  `aidraw.enabled` (`false` disables and falls back to calling draw-things-cli directly),
  `aidraw.timeoutMs` (900000);
  `defaults.*`; `dataDir`;
  `maxTurns`, `historyLimit`, `preferenceLimit`.
- drawthings-cli backend: resolves the model from `models list --downloaded-only`
  (same model directory as the Draw Things app). When `aidraw.binary` is found the
  generation is delegated to `aidraw -e drawthings --model … --prompt … --seed …
  --output <tmp> [--image <tmp> --strength <denoise>] -- --local
  --no-download-missing` — aidraw owns headless pty wrapping, flag mapping and the
  child timeout; `--no-download-missing` guarantees no model downloads. Without aidraw
  the plugin spawns `draw-things-cli` directly under `/usr/bin/script -q /dev/null`
  (the CLI needs a TTY on stdin in headless hosts). Turbo-family models force
  `--steps 8 --cfg 1`.
- Draw Things: `POST /sdapi/v1/txt2img` with A1111 fields (`prompt`, `negative_prompt`,
  `width`, `height`, `steps`, `cfg_scale`, `sampler_name`, `seed`, `batch_size`, `n_iter`);
  `POST /sdapi/v1/img2img` adds `init_images: [base64]` and `denoising_strength`.
  Response `images[0]` is base64 (may include a data URL prefix). Health via
  `GET /sdapi/v1/sd-models` (fallback `/sdapi/v1/options`).
- ComfyUI txt2img: CheckpointLoaderSimple → 2×CLIPTextEncode → EmptyLatentImage →
  KSampler → VAEDecode → SaveImage. img2img: upload the init bytes to
  `POST /upload/image` (multipart `image`, `overwrite=true`, `type=input`), then
  CheckpointLoaderSimple → LoadImage → VAEEncode → KSampler(denoise) → VAEDecode →
  SaveImage. `POST /prompt`, poll `/history/<id>`, download with `/view`; health
  `/system_stats`, checkpoints `/object_info/CheckpointLoaderSimple`.
- Image dimensions are read from PNG/JPEG/WebP headers; unknown formats fall back to the
  requested params.
- Ollama: `POST /api/chat` with `stream: false`, `format: 'json'` for planning/refine,
  images array for vision. Parse JSON defensively (fences, prose around JSON). If it
  fails, fall back and set degradation flags — never return a 500 for an LLM failure.
- Persistence under `$DSH_HOME/image-studio`: `sessions/<id>/session.json`,
  `<turnId>.<ext>` images (e.g. `t1.png`), `preferences.json`. Validate ids and never serve paths outside
  the data dir. Atomic writes (tmp + rename) for JSON.
- `ctx.effect` cleanup aborts in-flight generations and clears caches on unload.
- Reject unknown/malformed bodies with `{ ok:false, error:{ code:'bad-request', message } }`.
- Generation concurrency: one at a time; second call → HTTP 409 `{ code:'busy' }`.

## Defaults / model choices on this machine

- Ollama models observed: `qwen3.8:27b-mlx` (27.8B nvfp4, vision, recommended; ~12 s
  planning / ~5 s critique with `think:false`), `ahmadwaqar/mai-ui:latest` (qwen3vl 2.1B,
  vision, fast fallback), `qwen3.8-27b-defiance:latest` (no vision, slow), `glm-ocr`
  (exclude). Auto-selection still prefers the smallest chat model; this profile pins the
  27B in `llm.model`/`llm.visionModel`.
- Draw Things default API port 7860; Comfy Desktop custom port may be 8000.

## Verification expected

- `node test/harness.mjs` — fake Draw Things + fake ComfyUI + fake Ollama + fake
  draw-things-cli + fake aidraw; covers health,
  plan, generate (create), refine with feedback (prompt changes, previous turn retained),
  image route bytes, accept → preference, history, degraded path when Ollama is down,
  busy/cancel behaviour, **upload → source bytes → img2img create → refine uses the
  latest output → init image served**, ComfyUI upload/LoadImage/VAEEncode graph, denoise
  clamping, img2img validation errors, and **drawthings-cli generation routed through
  aidraw (args asserted, turbo steps/cfg, `--no-download-missing` passthrough, img2img
  `--image`/`--strength`) plus the legacy direct draw-things-cli path when aidraw is
  disabled**.
- `node test/client-smoke.mjs` — client module loads, slots + locale keys complete.
- `node test/real-probe.mjs` — optional; reports live backend/LLM status and a real
  generation only when configured, exits 0 with a skip message otherwise.
- Node 24, plain ESM, no dependencies outside the Node standard library.

## Install (Lead)

Bundle `@local/dsh-image-studio` is installed into the `desktop` profile by the Lead
after tests pass. Do not edit `~/.dsh/profiles/desktop/*` yourself.

> AI生成
