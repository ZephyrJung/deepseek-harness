# AI作图（@local/dsh-image-studio）

DSH Web 左侧栏的 AI 作图插件，包含两种任务：

- **文生图（txt2img）**：输入中文/英文描述，生成图片。
- **图生图（img2img）**：上传一张参考图（PNG/JPEG/WebP），写清想改什么、设置重绘幅度，在保留原图核心内容的前提下生成新图。

它把本机的 **Draw Things**（A1111 API，首选）或 **ComfyUI**（HTTP API，备用）当作画布，把本机 **Ollama** 当作“懂意图的提示词工程师 + 看图评审”：先用模型理解描述/参考图并写出英文提示词与参数，出图后再根据你的自然语言反馈只改该改的部分，多轮迭代，并把“满意”沉淀成长期偏好。

图像、提示词和偏好都只在本机处理，不会上传云端。

## 功能

- **双任务切换**：面板顶部「文生图 / 图生图」切换；切换时自动载入该任务最近的会话，没有就显示空白编辑区。
- **先理解意图，再出图**：描述会先被整理成创意简报（意图、主体、风格、构图、光线、色调、画幅）、英文正向提示词、负向提示词与参数建议，面板同时给出“为什么这样画”的中文说明。
- **绘画风格选择**：输入框上方提供常见风格单选（写实摄影、电影摄影、水彩插画、国风水墨、动漫、油画、3D 渲染、极简平面、赛博朋克、像素艺术）；本地模型理解意图时会按所选风格一并调整提示词与参数（步数 / CFG / 采样器）。
- **阶段化输入**：无结果时输入卡是「画什么」，按钮为「开始创作」；生成后同一输入卡变为「继续调整」，按钮为「再次生成」。
- **每轮简报存档**：创作简报（意图/主体/风格/构图/光线/色调/画幅、标签、正向/负向提示词、参数）按轮次存档，点击「本组图」缩略图即可回看那一轮的简报与参数。
- **看图生图**：图生图会先让视觉模型看参考图，写出“保留未要求内容”的编辑型提示词，并建议重绘幅度 `denoise`。
- **多轮反馈修改**：看到图后在「继续调整」里写“背景太乱，脸再小一点，光线更暖”；下一轮只改动反馈涉及的方面，保留其余设定。图生图的反馈轮会自动以上一张输出为底图继续改，像渐进式图生图。
- **每轮可复现**：图生图每一轮都把实际使用的底图快照存下来（`kind=init`），之后回看/重生成都能对应当初的输入。
- **让模型看画面**（默认在模型支持图片时开启）：精修前把上一张图交给视觉模型做客观点评，点评会并入精修提示词。
- **设为满意**：把当前轮标记为满意，并蒸馏一条简短中文偏好；偏好会注入之后的每次规划，跨会话生效，也可以在面板里删除。
- **直接改提示词/参数**：规划结果可编辑后重新生成。
- **状态与成败反馈**：顶部 pill 显示当前引擎与意图模型；不做生成前预检，成败只在生成后的结果区反馈（成功绿框带引擎与耗时，失败红框带具体原因与指引）。

## 工作方式

### 文生图

```text
用户描述 / 反馈
      │
      ▼
Ollama（/api/chat，format=json）──► 创意简报 + 英文正向/负向提示词 + 参数 + 中文理由
      │
      ▼
Draw Things（POST /sdapi/v1/txt2img） 或 ComfyUI（EmptyLatentImage → KSampler）
      │
      ▼
PNG/JPEG 写入 $DSH_HOME/image-studio，面板通过 /image 读取
```

### 图生图

```text
上传/粘贴/拖入参考图 ──► POST /upload（data URL，≤12MB）
      │                         │
      │                         ▼
      │                  sources/<sourceId>.<ext>（最多保留 8 张，新的在前）
      │
      ▼
视觉模型看参考图 ──► 编辑型提示词 + denoise 建议（0.15–0.95）
      │
      ▼
Draw Things POST /sdapi/v1/img2img（init_images + denoising_strength）
或 ComfyUI POST /upload/image → LoadImage → VAEEncode → KSampler(denoise)
      │
      ▼
输出图片 + 本轮实际底图快照 <turnId>-init.<ext>
      │
      ▼
反馈轮：以上一张输出为底图，可继续修改
```

1. 首次生成时 Host 调用 Ollama 做规划（brief、positive、negative、params、rationale）；图生图还会把参考图交给视觉模型分析。
2. Host 调首选图像后端出图，图片与整轮信息一起落盘；图生图额外保存底图快照。
3. 反馈轮：Host 把简报、最近轮次和反馈交给 Ollama 分类并改写；若开启“让模型看画面”，先把最新图交给视觉模型点评。
4. 再次出图并追加轮次；历史轮次全部保留。
5. “设为满意”后蒸馏一条中文偏好，之后每次规划都会带上这些偏好。

### 图生图的底图规则

每一轮按以下顺序选择底图（`initFrom` 记录来源）：

1. 显式 `sourceId`（上传的参考图）；
2. 显式 `initTurnId`（指定某一轮的历史输出）；
3. 显式 `turnId`（指定某一轮作为父轮）；
4. 图生图会话的最近一轮输出；
5. 都没有 → `400 { code: 'need-image' }`，提示先上传参考图。

底图字节会复制为 `sessions/<id>/<turnId>-init.<ext>`，通过 `GET /image?session=&turn=&kind=init` 读取；输出参数默认沿用底图尺寸（按 64 对齐），除非你显式传了 `params`，避免规划模型悄悄改画幅。

### denoise（重绘幅度）怎么选

- 范围 `0.15–0.95`，默认 **0.55**；超范围会被夹紧（例如 9 → 0.95，0 → 0.15）。
- `0.15–0.4`：微调光线、细节、质感，主体和构图基本不变；
- `0.45–0.65`：平衡，换背景/氛围/风格但保留主体；
- `0.7–0.9`：大改，构图或风格显著变化（仍以底图为起点）。
- 不传时使用规划模型建议值，再退回 `defaults.denoise`（0.55）。

## 前置条件

- **DSH Desktop**，Node 24（插件只依赖 Node 标准库）。
- **Draw Things.app**（推荐）：打开应用 → 设置（Settings）→ **API Server** → 开启并确认端口为 **7860**（默认）。至少下载一个可用的图像模型。
- **draw-things-cli + aidraw**（推荐，免 GUI）：`brew install draw-things-cli`，再加本机 [DrawUtils](~/Documents/Projects/ZephyrScript/Go/DrawUtils) 项目的 `aidraw`（`go build -o aidraw .`）。插件检测到 aidraw 时，`drawthings-cli` 后端经它调用（无头 pty 包装与参数映射由 aidraw 统一处理），模型仍用 App 下载好的那套（默认同一个模型目录，且**绝不自动下载**）。
- **ComfyUI Desktop.app**（可选备用）：启动服务，默认端口 **8188**，Comfy Desktop 的自定义端口可能是 **8000**；在 `models/checkpoints/` 放至少一个 checkpoint。图生图会用到 ComfyUI 的 `/upload/image`（ComfyUI 自带，无需额外插件）。
- **Ollama**：`ollama serve` 运行在 `http://127.0.0.1:11434`，并已 `ollama pull` 至少一个对话模型；想要“让模型看画面/看参考图”，需要视觉模型。纯 OCR 模型（如 `glm-ocr`）不会被选为规划模型。

快速自检：

```bash
curl http://127.0.0.1:7860/sdapi/v1/options      # Draw Things 当前模型/采样器（sd-models 不存在）
curl http://127.0.0.1:8188/system_stats         # ComfyUI（Custom 端口可能是 8000）
curl http://127.0.0.1:11434/api/tags            # Ollama 模型列表
```

> 端口只是默认值。Draw Things / ComfyUI 的 HTTP 服务默认**不会**随应用登录自动开启（Draw Things 需要在设置里手动打开 API Server），面板健康卡片会明确提示。

> Draw Things 不实现 `/sdapi/v1/sd-models`；插件改为读 `/sdapi/v1/options` 的 `model` 作为“当前已加载模型”，所以只要 App 里选中了模型，健康卡片就会显示模型名而不是“读不到模型列表”。Turbo / Lightning / Z-Image 这类少步模型会自动采用 App 当前的采样器，并把步数压到 8、CFG 设为 1，避免规划模型给的 28 步/CFG 5 让它们出空图。

## 配置

在 profile 的 `cordis.patch.yml` 中覆盖 `image-studio` 行的 `config`，所有字段可选：

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `backend` | `auto` | `auto` / `drawthings` / `drawthings-cli` / `comfyui`；`auto` 依次 Draw Things → draw-things-cli → ComfyUI |
| `aidraw.binary` | 自动查找 | aidraw 可执行文件路径（查找顺序：配置 → `DSH_IMAGE_STUDIO_AIDRAW_BIN` → `/opt/homebrew/bin` → `/usr/local/bin` → DrawUtils 项目目录 → `PATH`）；找到时 `drawthings-cli` 后端经 aidraw 调用、ComfyUI 离线时自动无头拉起 |
| `aidraw.enabled` | `true` | 设为 `false` 强制回到直调 draw-things-cli 的旧路径 |
| `aidraw.timeoutMs` | `900000` | 经 aidraw 生成的等待上限（毫秒） |
| `drawthingsCli.binary` / `drawthingsCli.model` / `drawthingsCli.modelsDir` | 自动 / 自动 / App 目录 | draw-things-cli 路径、指定模型、覆盖模型目录（与 Draw Things App 共用一套模型） |
| `drawthings.baseUrl` | `http://127.0.0.1:7860` | Draw Things A1111 API 地址（文生图 `/txt2img`、图生图 `/img2img`） |
| `drawthings.model` | `''`（用服务端当前模型） | 传给 Draw Things 的模型名/checkpoint 标题 |
| `comfyui.baseUrl` | 空（自动探测 8188 → 8000） | ComfyUI 地址；留空时按 `8188`、`8000` 顺序探测 |
| `comfyui.checkpoint` | 第一个可用 checkpoint | CheckpointLoaderSimple 使用的文件名 |
| `comfyui.pollMs` | `700` | 轮询 `/history/<id>` 的间隔（毫秒，200–5000） |
| `drawthings.timeoutMs` / `comfyui.timeoutMs` | `600000` | 单次图像生成的等待上限（毫秒） |
| `llm.baseUrl` | `http://127.0.0.1:11434` | Ollama 地址 |
| `llm.model` | 自动：最小的本地对话模型（跳过 embedding/ocr/rerank） | 规划/精修所用模型。追求质量时显式指定更强的模型，例如 `qwen3.8:27b-mlx` |
| `llm.visionModel` | 自动：支持图片的模型 | 看图/看参考图所用模型；`qwen3.8:27b-mlx` 也支持图片，可同时承担规划与点评 |
| `llm.enabled` | `true` | 关闭后不做规划，直接用描述与默认参数出图（标记降级） |
| `llm.think` | `false` | 关闭 Qwen 3.5/3.8 的思考链；开启会显著变慢且容易截断 JSON |
| `llm.keepAlive` | `10m` | 传给 Ollama 的 `keep_alive`，让大模型在两轮之间不被卸载 |
| `llm.temperature` | `0.4` | 规划/精修采样温度 |
| `llm.timeoutMs` | `180000` | 单次模型调用超时（毫秒） |
| `llm.numCtx` | `8192` | Ollama `num_ctx` |
| `llm.numPredict` | `1200` | Ollama `num_predict` |
| `defaults.width` / `defaults.height` | `1024` / `1024` | 文生图未指定画幅时的默认尺寸；图生图默认跟随底图尺寸 |
| `defaults.steps` | `28` | 默认采样步数 |
| `defaults.cfg` | `5` | 默认 CFG scale |
| `defaults.sampler` | `DPM++ 2M Karras` | 默认采样器 |
| `defaults.negative` | 内置通用负向词 | 默认负向提示词 |
| `defaults.denoise` | `0.55` | 图生图默认重绘幅度（0.15–0.95） |
| `dataDir` | `$DSH_HOME/image-studio` | 会话与偏好数据目录 |
| `maxTurns` | `16` | 单个会话保留的最大轮次 |
| `historyLimit` | `20` | 历史会话列表条数上限 |
| `preferenceLimit` | `20` | 保留的偏好条数上限 |

环境变量也可作为默认值：`DSH_OLLAMA_URL`、`DSH_IMAGE_STUDIO_DRAWTHINGS_URL`、`DSH_IMAGE_STUDIO_COMFY_URL`、`DSH_IMAGE_STUDIO_LLM_MODEL`。

示例：

```yaml
- id: image-studio
  name: '@local/dsh-image-studio'
  config:
    backend: auto
    drawthings:
      baseUrl: http://127.0.0.1:7860
      model: ''
    comfyui:
      baseUrl: http://127.0.0.1:8188
      checkpoint: ''
    llm:
      baseUrl: http://127.0.0.1:11434
      model: qwen3.8:27b-mlx
      visionModel: qwen3.8:27b-mlx
      think: false
      keepAlive: 10m
    defaults:
      width: 1024
      height: 1024
      steps: 28
      cfg: 5
      sampler: DPM++ 2M Karras
      denoise: 0.55
```

### 意图模型怎么选

在本机（M 系列、Ollama 0.40）用本插件的同一套规划提示词实测：

| 模型 | 规划一次 | 看图点评 | 结论 |
| --- | --- | --- | --- |
| `ahmadwaqar/mai-ui:latest`（qwen3vl 2.1B） | ~7 秒 | ~7 秒 | 快，但偏 UI/界面理解；复杂反馈偶尔漏改或 JSON 截断，适合做低配兜底 |
| `qwen3.8:27b-mlx`（27.8B nvfp4） | ~14 秒 | ~5 秒 | **推荐**；同时支持图片，提示词更具体、反馈命中更准，画幅不会被乱改 |
| `qwen3.8-27b-defiance:latest`（27.3B Q6_K） | ~43 秒 | 不支持 | 质量相近但慢三倍，且没有视觉能力 |

切到 27B 时务必保留 `think: false`：Qwen 3.5/3.8 默认会先生成一大段思考，再写 JSON，慢且容易在 `num_predict` 处截断。

## Host API

全部挂在已认证的同源 Connection Fetch 路由 `/api/image-studio` 下，JSON 请求体；响应固定为 `{ ok: true, ... }` 或 `{ ok: false, error: { code, message } }`。

| 方法 | 路径 | 请求 | 返回 |
| --- | --- | --- | --- |
| GET | `/health` | – | 当前后端、各后端连通性、LLM、默认参数（含 `denoise`）、偏好、设置提示 |
| GET | `/session` | `?id=`（也接受 `?session=`；省略时取最近会话）；`?task=txt2img\|img2img` 取该任务最近会话 | 会话详情（含 `task`、`sources`、全部轮次） |
| GET | `/history` | `?limit=20&task=txt2img\|img2img` | 最近会话摘要列表（含 `task`） |
| POST | `/upload` | `{ dataUrl, name?, sessionId? }` | `{ session, source }`；不带 `sessionId` 时新建图生图会话 |
| GET | `/source` | `?session=&source=` | 上传的参考图字节（`image/png`/`jpeg`/`webp`，`cache-control: no-store`） |
| POST | `/plan` | `{ task?, description, aspect?, style?, sessionId?, sourceId?, denoise? }` | 创意简报、提示词、参数、`denoise` 与理由（不落盘、不出图） |
| POST | `/generate` | `{ task?, sessionId?, description?, positive?, negative?, params?, feedback?, turnId?, useVision?, backend?, aspect?, style?, brief?, seed?, sourceId?, initTurnId?, denoise? }` | 新会话或新轮次 |
| POST | `/accept` | `{ sessionId, turnId }` | 标记满意，返回会话、偏好与偏好列表 |
| POST | `/preference/delete` | `{ id }` | 删除一条偏好并返回剩余列表 |
| POST | `/cancel` | `{ sessionId? }` | 取消正在进行的生成 |
| GET | `/image` | `?session=&turn=&kind=output\|init` | 图片字节（输出图或该轮底图快照，`cache-control: no-store`） |

- 生成可能持续数分钟：路由不受 30 秒超时限制；面板显示已用时间并提供取消按钮。若已有生成在跑，再次 `POST /generate` 返回 HTTP **409** `{ code: 'busy' }`。
- 图生图缺少底图时 `POST /generate` 返回 `400 { code: 'need-image' }`；`task` 与现有会话类型不符返回 `task-mismatch`。
- 请求体缺失/非法、`session`/`turn`/`source` 含路径穿越等非法 id 会被拒绝为 `400`（`bad-request`）或 `404`，绝不会读取数据目录以外的文件。
- `/upload` 只接受 PNG/JPEG/WebP 的 base64 data URL，解码后最大 12 MB；超出返回 413（`upload-too-large`）。

## 数据目录

```text
$DSH_HOME/image-studio/                 # 默认 ~/.dsh/image-studio
├── sessions/
│   └── 20261030-083000-ab12cd34/
│       ├── session.json                # 会话（task/brief/sources/轮次/接受状态）
│       ├── sources/
│       │   └── s1a2b3c4.png            # 图生图上传的参考图（最多 8 张）
│       ├── t1.png                      # 第 1 轮输出图（文件名 = 轮次 id）
│       ├── t1-init.png                 # 第 1 轮实际使用的底图快照（仅 img2img）
│       ├── t2.png
│       └── t2-init.png
├── preferences.json                    # 跨会话偏好（id + text）
└── runtime.json                        # 最近一次加载的诊断信息（pid、路由、后端地址）
```

- JSON 采用临时文件 + rename 原子写入；图片文件名就是轮次 id（`t1.png`、`t2.png`）。
- 图生图每一轮都会复制一份底图快照（`<turnId>-init.<ext>`），因此历史可复现，删除会话目录会一起清理。
- 删除某个会话目录即可清理该会话；偏好可在面板里删除。

## 降级行为

- **Ollama 不可用 / 超时 / 返回无法解析**：生成请求**不会 500**。插件退回原始描述（图生图用兜底提示词 + 底图尺寸）+ 默认参数直接出图，本轮标记 `degraded: true` 并在 `degradedReason` 写明原因；图片照常返回。
- **视觉模型不可用**：跳过“让模型看画面/看参考图”，图生图仍按描述、底图尺寸和默认 `denoise` 出图。
- **图生图缺少底图**：返回 `400 { code: 'need-image' }`，提示先上传参考图；不会静默退化成文生图。
- **首选后端不可用**：`auto` 模式自动尝试另一个图像后端；面板健康卡片显示失败原因。
- **所有图像后端都不可用**：`POST /generate` 返回清晰的中文错误与设置提示（HTTP 错误 + `{ ok:false, error }`）。
- **取消**：正在进行的生成会被中止并释放并发锁，之后可以立即重新生成；已完成的轮次不受影响。

## 测试

```bash
cd image-studio
node test/harness.mjs        # 假 Draw Things + 假 ComfyUI + 假 Ollama，覆盖 txt2img 与 img2img 全链路
node test/client-smoke.mjs   # 客户端模块 / 插槽 / locale 键完整性（UI 负责）
node test/real-probe.mjs     # 可选：探测真实本机后端；默认跳过，不启动任何 GUI
```

- 假后端不依赖 Draw Things/ComfyUI 是否安装、也没有模型权重要求，可在任何机器上跑；harness 会验证 `/upload` → `/source` → Draw Things `/img2img`（`init_images` + `denoising_strength`）→ 反馈轮以最新输出为底图 → `kind=init` 快照，以及 ComfyUI 的 multipart 上传与 `LoadImage → VAEEncode → KSampler(denoise)` 图。
- `real-probe.mjs` 只做只读探测和一次真实文生图（需显式开启）：

  ```bash
  IMAGE_STUDIO_REAL=1 node test/real-probe.mjs
  ```

  未设置该变量或没有可达图像后端时，打印探测表格与操作提示后以 **0** 退出（跳过，不算失败）。真实生成会写入临时目录并在终端打印图片路径。

## 不想开 Draw Things 窗口？

Draw Things 的 HTTP API 由 **App 进程内置**，没有独立的「只启动服务」二进制；窗口可以隐藏，但生成器仍跑在 App 里。

- **隐藏窗口启动**：`open -gj -a "Draw Things"` 会在后台启动并隐藏窗口（API Server 仍需在设置里开启）。App 崩溃时服务也会一起消失。
- **真正的无窗口方案**（插件已内置，`backend` 留 `auto` 即自动回退）：
  1. `drawthings-cli` 后端：官方 `draw-things-cli`（`brew install draw-things-cli`）逐次生成，不需要 GUI，模型目录与 App 共用；检测到 aidraw 时经 aidraw 调用（无头 pty、参数映射、超时统一处理，且不自动下载模型）。
  2. ComfyUI 后端：纯 Python HTTP 服务（需在 `models/checkpoints/` 准备模型并先启动服务）。
- Draw Things HTTP 与 CLI 两个后端用的是同一套 App 下载的模型；ComfyUI 需要自己的 checkpoint。

## 故障排查


| 现象 | 原因与处理 |
| --- | --- |
| 健康卡片 Draw Things 显示离线 | Draw Things 默认不开启 HTTP 服务：打开 App → 设置 → API Server → 开启，确认端口为 7860；`curl http://127.0.0.1:7860/sdapi/v1/options` 应返回 JSON。 |
| 提示“读不到模型列表” | 旧版插件才会这样判断。现在读 `/options.model`；若仍为空，确认 Draw Things 里已真正加载模型（不是只下载），并在 App 里生成一张图看是否正常。 |
| Draw Things 422「init_images height doesn't match …」 | 旧版会把参考图尺寸按 64 对齐（例如 843→832），与底图不一致；新版图生图直接发送参考图的实际宽高，并在 422 时重试为不传尺寸、让后端按底图取帧。刷新页面/重启插件后重试。 |
| Draw Things 返回 0 张图 / 422 | 422 通常是请求带了该版本不认识的字段；插件已按 Draw Things schema 发送。0 张图多是当前模型不支持的采样器或步数组合：插件会跟随 App 当前采样器，Turbo 模型自动 8 步/CFG 1，仍失败时换一个 App 里能正常出图的采样器再试。 |
| 健康卡片 ComfyUI 显示离线 | 确认 ComfyUI Desktop 服务已启动，端口是 8188 还是 8000；在配置里显式写 `comfyui.baseUrl` 可跳过自动探测。 |
| 有后端却报“没有可用模型 / checkpoint” | Draw Things 里先下载并选中一个图像模型；ComfyUI 需要在 `models/checkpoints/` 放 checkpoint，或在配置里指定 `comfyui.checkpoint`。没有权重时无法出图。 |
| drawthings-cli 报 “no tensors returned” | draw-things-cli 的模型文件实际缺失：`models list` 报的 DOWNLOADED 是元数据，不代表文件在磁盘上（CLI 报错极误导——采样进度条会正常走完才报错）。到 Draw Things App 里重新下载模型后即可；`ls ~/Library/Containers/com.liuliu.draw-things/Data/Documents/Models/` 应能看到 `.ckpt` 文件。 |
| 图生图上传失败 | 只接受 PNG/JPEG/WebP 的 base64 data URL，且解码后不超过 12MB；确认图片没有损坏，换个格式（如导出 PNG）再试。 |
| 图生图报 ComfyUI 上传失败 | `POST /upload/image` 需要服务端可写输入目录；检查 ComfyUI 控制台与版本，或临时把 `backend` 设为 `drawthings` 走 A1111 `/img2img`。 |
| 图生图和原图几乎一样 | `denoise` 太低：微调用 0.25–0.4，换背景/风格用 0.55–0.75，大改用 0.8–0.95；也可以把改动写得更具体。 |
| 图生图改得面目全非 | `denoise` 太高：降到 0.25–0.5，并在描述里强调“保留主体/构图/人物身份”。 |
| 图生图一直提示 need-image | 当前会话没有底图：先上传参考图，或切换到已有轮次的图生图会话；文生图会话不能直接加参考图（会返回 task-mismatch）。 |
| 提示词规划很慢 | 先确认 `llm.think: false`：Qwen 3.5/3.8 默认会先生成思考链，慢且容易截断 JSON。27B 首次加载约 10–20 秒，`keepAlive: 10m` 内保持热；需要更快可把 `llm.model` 换回 `ahmadwaqar/mai-ui:latest`（2.1B）。 |
| 生成很久没有结果 | 本机扩散模型在高分辨率/多步数下可能数分钟，属正常；面板会显示已用时间，可点取消。降低 `defaults.steps`、尺寸或换更小的模型可加速。 |
| 一直提示 busy | 说明上一轮仍在生成：等待完成或点取消；若页面关闭导致失去状态，`POST /cancel` 或重载插件可释放。 |
| 图片 404 / 无法显示 | 对应会话、轮次或参考图可能已被删除；刷新 `/history` 与 `/health`。图片只从 `$DSH_HOME/image-studio` 内部读取，不会跨目录。 |
| 偏好没有生效 | `preferences.json` 可能被手动清空或达到 `preferenceLimit`；在面板偏好卡片确认，必要时重新“设为满意”。 |

## 安装 / 启用

> 当前这台机器的 `desktop` profile 已由维护者安装并启用本插件（`@local/dsh-image-studio` 已写入依赖与 `dsh.profile.bundles`）。如果左侧栏还没有「AI作图」，刷新页面（Cmd+R）即可；插件管理器里也能看到它。

这个插件是 profile 的本地 bundle，不依赖插件市场或云端：

1. 把 `image-studio` 整个目录放在长期位置，例如 `~/Documents/dsh-plugins/image-studio`。
2. 打开 DSH Desktop 左侧 **Plugins / 插件** 页面，选择 **安装 bundle / Install bundle**，填写该目录的绝对路径（或由维护者安装）。
3. 安装并启用「AI作图」；插件管理器会把 `@local/dsh-image-studio` 写入 profile 的 `dsh.profile.bundles`。
4. 打开面板，先看健康卡片确认图像后端与 Ollama 状态，再选择「文生图」或「图生图」开始。

CLI profile 可以用 `dsh plugin --profile <profile> add /absolute/path/to/image-studio` 登记依赖，但还要把 `@local/dsh-image-studio` 加入该 profile 的 `dsh.profile.bundles`；Desktop 的 `desktop` profile 由桌面应用管理，建议直接用插件页面安装。

注意：插件包不包含历史会话与偏好。它们位于 `$DSH_HOME/image-studio/`，迁移或重装前请自行备份。

> AI生成
