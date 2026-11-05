/**
 * MyMobile — host half.
 *
 * A thin bridge between the harness tool registry and the machine-local
 * **MobileControl** server (`~/bin/mobilecontrol`), a Go single binary that
 * mirrors and controls a USB-connected Android phone over the Android Debug
 * Bridge. Nothing device-specific is reimplemented here: every tool maps onto
 * one MobileControl HTTP endpoint.
 *
 *   GET  /api/status      device inventory, adb/ffmpeg health, selected serial
 *   POST /api/select      select the active device
 *   POST /api/quality     pick a mirror quality preset
 *   POST /api/action      tap / swipe / longpress / key / keys / text / app / wake
 *   POST /api/restart     restart the local server
 *   GET  /api/screenshot  one PNG frame of the current screen
 *
 * The server is started on demand and stopped when the plugin unloads, so the
 * tools work without the user launching the binary or the web panel first.
 *
 * Besides the model tools, this half also registers the panel routes under
 * `/api/my-mobile/...` for the web panel in `client.js`: screen preview and
 * touch mirroring, instruction parsing (local rules, one-shot model plan, or a
 * per-step vision loop), screenshots, screen recording (mirror stream
 * re-encoded by ffmpeg) and file upload (`adb push`).
 *
 * The optional semantic/vision half talks to a local Ollama model:
 *   GET  /api/my-mobile/plan/status  is Ollama up, is the model installed, has it vision
 *   POST /api/my-mobile/plan         one sentence -> validated action list (screenshot attached)
 *   POST /api/my-mobile/agent/step   live screenshot -> exactly one next action (or `done` / `pause`)
 */
import { spawn } from 'node:child_process'
import { appendFileSync, existsSync, statSync, writeFileSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomUUID } from 'node:crypto'

/** Services this bundle needs before `apply` runs. `tools` is declared so the
 *  cordis context lets us read `ctx.tools`, but it is treated as optional: when
 *  the host does not actually provide the service, tool registration is skipped
 *  gracefully and only the panel routes are mounted. */
export const inject = ['tools', 'connection']

/** Port used when neither the row config nor a running server says otherwise. */
const DEFAULT_PORT = 8765

/** Where the binary usually lives when it was installed for this user. */
const CANDIDATE_BINARIES = [
  join(homedir(), 'bin', 'mobilecontrol'),
  '/usr/local/bin/mobilecontrol',
  '/opt/homebrew/bin/mobilecontrol',
]

/** Mirror quality presets exposed by MobileControl. */
const QUALITY_IDS = ['smooth', 'standard', 'high', 'native']

/** Local Ollama endpoint used by the optional semantic instruction planner. */
const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434'

/** Planner model, matching the one the image-studio bundle already pulls. */
const DEFAULT_PLANNER_MODEL = 'qwen3.8:27b-mlx'

/** Dedicated UI-grounding model used in dual-model mode: it reads the screen
 *  and returns a list of clickable elements with pixel-accurate boxes, so the
 *  planner only has to *pick* a target instead of guessing coordinates. */
const DEFAULT_UI_MODEL = 'ahmadwaqar/mai-ui:latest'

/**
 * Normalize the loader row config into a complete option object.
 * @param raw - row config from `cordis.patch.yml` (every field optional).
 * @returns fully populated options.
 */
function resolveConfig(raw) {
  const config = raw !== null && typeof raw === 'object' ? raw : {}
  const text = (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : '')
  const number = (value, fallback) => (Number.isFinite(value) && value > 0 ? Number(value) : fallback)
  const llm = config.llm !== null && typeof config.llm === 'object' ? config.llm : {}
  return {
    binaryPath: text(config.binaryPath) || CANDIDATE_BINARIES.find((path) => existsSync(path)) || '',
    adbPath: text(config.adbPath),
    port: number(config.port, DEFAULT_PORT),
    autoStart: config.autoStart !== false,
    startTimeoutMs: number(config.startTimeoutMs, 10_000),
    requestTimeoutMs: number(config.requestTimeoutMs, 30_000),
    screenshotDir: text(config.screenshotDir) || join(homedir(), 'Pictures', 'MobileControl'),
    dataDir: text(config.dataDir) || join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'my-mobile'),
    llm: {
      enabled: llm.enabled !== false,
      baseUrl: text(llm.baseUrl) || DEFAULT_OLLAMA_URL,
      model: text(llm.model) || DEFAULT_PLANNER_MODEL,
      timeoutMs: number(llm.timeoutMs, 60_000),
      /* The planner model is multimodal; sending the current screen costs one
         JPEG (~100 KB at 720p) and buys exact tap coordinates. */
      vision: llm.vision !== false,
      imageWidth: number(llm.imageWidth, 720),
      /* 0 = no step ceiling. The loop is bounded by the model itself: it
         stops on `done`, or on `pause` when it cannot tell what the next
         action is. Counting steps was the wrong stop condition — a long
         but correct flow (open app, search, three menus deep, type) was
         cut off mid-way while a short wrong one was allowed to thrash.
         Set a positive number only if you want a hard budget. */
      maxAgentSteps: number(llm.maxAgentSteps, 0),
      /* Thinking is off by default: the chain-of-thought competes with the
         answer for `num_predict`, and on a busy screen it can consume the
         whole budget and leave `content` empty. Off is also 20x faster.
         Set `think: true` in the row config to reason before acting. */
      think: llm.think === true,
      /* Dedicated UI-grounding model for dual-model mode. Empty string turns
         the feature off; the panel can also toggle it per-run. */
      uiModel: text(llm.uiModel) || DEFAULT_UI_MODEL,
    },
  }
}

/**
 * HTTP client for one MobileControl server, including its process lifecycle.
 */
class MobileControlClient {
  /**
   * @param options - resolved plugin options, see {@link resolveConfig}.
   * @param logger - optional cordis logger used for lifecycle diagnostics.
   */
  constructor(options, logger) {
    this.options = options
    this.logger = logger
    this.child = null
    this.starting = null
    this.stderrTail = ''
  }

  /** Base URL of the local server. */
  get baseUrl() {
    return `http://127.0.0.1:${this.options.port}`
  }

  /**
   * Guarantee a reachable server: reuse a listener already on the port, or
   * spawn the binary and wait for `/api/status`.
   * @param signal - caller cancellation.
   */
  async ensure(signal) {
    if (await this.probe(signal)) return
    if (!this.options.autoStart) {
      throw new Error(`my-mobile: no MobileControl server on ${this.baseUrl} and autoStart is disabled`)
    }
    if (this.starting === null) {
      this.starting = this.spawnServer().finally(() => {
        this.starting = null
      })
    }
    await this.starting
  }

  /**
   * Spawn the binary and block until it answers, or fail with its own output.
   */
  async spawnServer() {
    const binary = this.options.binaryPath
    if (binary === '' || !existsSync(binary)) {
      throw new Error(
        'my-mobile: MobileControl binary not found. Build it with '
        + '`go build -o ~/bin/mobilecontrol .` in the MobileControl repository, '
        + 'or point config.binaryPath at the executable.',
      )
    }
    const child = spawn(binary, ['-port', String(this.options.port), '-no-browser'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    this.child = child
    this.stderrTail = ''
    const collect = (chunk) => {
      this.stderrTail = `${this.stderrTail}${String(chunk)}`.slice(-2000)
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    child.on('exit', (code) => {
      if (this.child === child) this.child = null
      if (code !== null && code !== 0) {
        this.logger?.warn?.(`my-mobile: server exited with code ${code}: ${this.stderrTail.trim()}`)
      }
    })

    const deadline = Date.now() + this.options.startTimeoutMs
    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error(`my-mobile: server exited during startup: ${this.stderrTail.trim() || `code ${child.exitCode}`}`)
      }
      if (await this.probe(undefined, 400)) return
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
    throw new Error(
      `my-mobile: server did not answer ${this.baseUrl}/api/status within `
      + `${this.options.startTimeoutMs}ms${this.stderrTail.trim() === '' ? '' : `: ${this.stderrTail.trim()}`}`,
    )
  }

  /**
   * One cheap readiness probe.
   * @param signal - caller cancellation.
   * @param timeoutMs - per-attempt budget.
   * @returns whether `/api/status` answered with JSON.
   */
  async probe(signal, timeoutMs = 1_500) {
    const budget = AbortSignal.timeout(timeoutMs)
    try {
      const response = await fetch(`${this.baseUrl}/api/status`, {
        signal: signal === undefined ? budget : AbortSignal.any([signal, budget]),
      })
      if (!response.ok) return false
      await response.json()
      return true
    } catch {
      return false
    }
  }

  /**
   * Join a caller signal with the request budget.
   * @param signal - caller cancellation.
   * @returns a signal that aborts on either.
   */
  budget(signal) {
    const timeout = AbortSignal.timeout(this.options.requestTimeoutMs)
    return signal === undefined ? timeout : AbortSignal.any([signal, timeout])
  }

  /**
   * GET a JSON endpoint.
   * @param path - absolute API path.
   * @param signal - caller cancellation.
   * @returns the parsed body.
   */
  async getJson(path, signal) {
    await this.ensure(signal)
    const response = await fetch(`${this.baseUrl}${path}`, { signal: this.budget(signal) })
    if (!response.ok) throw new Error(`my-mobile: GET ${path} failed with HTTP ${response.status}`)
    return response.json()
  }

  /**
   * POST a JSON body and surface `{ ok: false }` as an error.
   * @param path - absolute API path.
   * @param body - JSON body.
   * @param signal - caller cancellation.
   * @returns the parsed body.
   */
  async postJson(path, body, signal) {
    await this.ensure(signal)
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: this.budget(signal),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`my-mobile: POST ${path} failed with HTTP ${response.status}${detail === '' ? '' : `: ${detail.trim()}`}`)
    }
    const payload = await response.json()
    if (payload?.ok === false) throw new Error(`my-mobile: ${payload.message || `${path} was rejected`}`)
    return payload
  }

  /**
   * Device inventory plus health.
   * @param signal - caller cancellation.
   * @returns the `/api/status` document.
   */
  async status(signal) {
    return this.getJson('/api/status', signal)
  }

  /**
   * Run one input action.
   * @param body - `type` plus the fields that action reads.
   * @param signal - caller cancellation.
   */
  async action(body, signal) {
    return this.postJson('/api/action', body, signal)
  }

  /**
   * Capture one PNG frame.
   * @param serial - target device; the server default when omitted.
   * @param signal - caller cancellation.
   * @returns the raw PNG bytes.
   */
  async screenshot(serial, signal) {
    await this.ensure(signal)
    const query = serial === undefined || serial === '' ? '' : `?serial=${encodeURIComponent(serial)}`
    const response = await fetch(`${this.baseUrl}/api/screenshot${query}`, { signal: this.budget(signal) })
    if (!response.ok) throw new Error(`my-mobile: GET /api/screenshot failed with HTTP ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50) {
      throw new Error('my-mobile: /api/screenshot did not return a PNG')
    }
    return bytes
  }

  /** Stop the server we started; a pre-existing listener is left alone. */
  dispose() {
    const child = this.child
    this.child = null
    if (child === null || child.exitCode !== null) return
    try {
      child.kill('SIGTERM')
    } catch {
      /* already gone */
    }
  }
}

/**
 * Build a JSON-Schema parameter object from a compact per-field spec.
 * A field carrying `required: true` is hoisted into the schema's `required`.
 * @param spec - field name to schema fragment.
 * @returns the object JSON Schema for the tool parameters.
 */
function objectSchema(spec) {
  const properties = {}
  const required = []
  for (const [key, fragment] of Object.entries(spec)) {
    const { required: isRequired, ...schema } = fragment
    properties[key] = schema
    if (isRequired === true) required.push(key)
  }
  return { type: 'object', properties, required, additionalProperties: false }
}

/** Schema shared by every action tool: a plain success acknowledgement. */
const ACTION_OUTPUT = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, detail: { type: 'string' } },
  required: ['ok', 'detail'],
}

/** Optional device selector accepted by every device-scoped tool. */
const SERIAL_FIELD = {
  type: 'string',
  description: 'Target device serial. Defaults to the server-selected device.',
}

/**
 * Assemble one registry tool from an action-shaped body.
 * @param definition - name, description, parameters, and the body to run.
 * @returns a tool definition accepted by `ctx.tools.register`.
 */
function actionTool(definition) {
  return {
    name: definition.name,
    description: definition.description,
    parameters: objectSchema(definition.parameters ?? {}),
    output: {
      schema: ACTION_OUTPUT,
      render: (_args, value) => [{ type: 'text', text: value.detail }],
    },
    presentCall: definition.presentCall,
    execute: async (args, exec) => {
      await definition.run(args, exec.signal)
      return { ok: true, detail: definition.detail(args) }
    },
  }
}

/**
 * Register every `mobile_*` tool on the owning context.
 * @param ctx - owning cordis context providing `ctx.tools`.
 * @param client - server client shared by all tools.
 * @returns the registered tool names, in registration order.
 */
function registerTools(ctx, client) {
  /** Register one definition, recording its name for the runtime marker. */
  const names = []
  /* `tools` is declared in `inject`, so reading `ctx.tools` is legal. The
     service itself can still be absent (it disappears across host upgrades);
     in that case skip tool registration and keep the panel routes alive. */
  const toolsService = ctx.tools
  if (toolsService === null || toolsService === undefined || typeof toolsService.register !== 'function') {
    return names
  }
  const register = (definition) => {
    names.push(definition.name)
    return toolsService.register(definition)
  }

  register({
    name: 'mobile_status',
    description:
      'Report the Android mirror state: adb and ffmpeg health, connected devices, the selected '
      + 'serial, and the selected device screen size, Android version and battery level. '
      + 'Call this first to learn which device the other mobile_* tools will act on.',
    parameters: objectSchema({}),
    output: {
      schema: {
        type: 'object',
        properties: {
          selected: { type: 'string' },
          model: { type: 'string' },
          manufacturer: { type: 'string' },
          android: { type: 'string' },
          width: { type: 'integer' },
          height: { type: 'integer' },
          battery: { type: 'integer' },
          adbOk: { type: 'boolean' },
          adbVersion: { type: 'string' },
          ffmpeg: { type: 'boolean' },
          error: { type: 'string' },
          devices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                serial: { type: 'string' },
                state: { type: 'string' },
                model: { type: 'string' },
              },
              required: ['serial', 'state', 'model'],
              additionalProperties: false,
            },
          },
        },
        required: ['selected', 'model', 'android', 'width', 'height', 'battery', 'adbOk', 'adbVersion', 'ffmpeg', 'error', 'devices'],
        additionalProperties: false,
      },
      render: (_args, value) => {
        const lines = [
          `adb: ${value.adbOk ? `ok (${value.adbVersion})` : 'unavailable'} | ffmpeg: ${value.ffmpeg ? 'ok' : 'missing'}`,
          `devices: ${value.devices.length === 0 ? 'none' : value.devices.map((d) => `${d.serial} (${d.state}${d.model === '' ? '' : `, ${d.model}`})`).join(', ')}`,
          `selected: ${value.selected === '' ? 'none' : value.selected}`,
        ]
        if (value.selected !== '') {
          lines.push(`${value.manufacturer} ${value.model} | Android ${value.android} | ${value.width}x${value.height} | battery ${value.battery}%`)
        }
        if (value.error !== '') lines.push(`warning: ${value.error}`)
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    presentCall: () => ({ card: 'generic', title: 'Mobile status' }),
    execute: async (_args, exec) => {
      const status = await client.status(exec.signal)
      const device = status.device ?? {}
      const scalar = (value, fallback) => (value === null || value === undefined ? fallback : value)
      return {
        selected: scalar(status.selected, ''),
        model: scalar(device.model, ''),
        manufacturer: scalar(device.manufacturer, ''),
        android: scalar(device.android, ''),
        width: scalar(device.width, 0),
        height: scalar(device.height, 0),
        battery: scalar(device.battery, 0),
        adbOk: status.adb?.ok === true,
        adbVersion: scalar(status.adb?.version, ''),
        ffmpeg: status.ffmpeg === true,
        error: scalar(status.error, ''),
        devices: (status.devices ?? []).map((entry) => ({
          serial: scalar(entry.serial, ''),
          state: scalar(entry.state, ''),
          model: scalar(entry.model, ''),
        })),
      }
    },
  })

  register(actionTool({
    name: 'mobile_select',
    description: 'Select which connected device the other mobile_* tools act on.',
    parameters: {
      serial: { type: 'string', required: true, description: 'Device serial, as reported by mobile_status.' },
    },
    run: (args, signal) => client.postJson('/api/select', { serial: args.serial }, signal),
    detail: (args) => `Selected device ${args.serial}.`,
    presentCall: (args) => ({ card: 'generic', title: `Select device ${args.serial}` }),
  }))

  register(actionTool({
    name: 'mobile_tap',
    description: 'Tap once at a screen coordinate, in the device pixel space reported by mobile_status.',
    parameters: {
      x: { type: 'integer', required: true, description: 'Horizontal pixel coordinate.' },
      y: { type: 'integer', required: true, description: 'Vertical pixel coordinate.' },
      serial: SERIAL_FIELD,
    },
    run: (args, signal) => client.action({ type: 'tap', x: args.x, y: args.y, serial: args.serial }, signal),
    detail: (args) => `Tapped (${args.x}, ${args.y}).`,
    presentCall: (args) => ({ card: 'generic', title: `Tap (${args.x}, ${args.y})` }),
  }))

  register(actionTool({
    name: 'mobile_swipe',
    description: 'Swipe from one coordinate to another, e.g. to scroll or dismiss.',
    parameters: {
      x1: { type: 'integer', required: true, description: 'Start X pixel.' },
      y1: { type: 'integer', required: true, description: 'Start Y pixel.' },
      x2: { type: 'integer', required: true, description: 'End X pixel.' },
      y2: { type: 'integer', required: true, description: 'End Y pixel.' },
      durationMs: { type: 'integer', description: 'Gesture duration in milliseconds; defaults to 200.' },
      serial: SERIAL_FIELD,
    },
    run: (args, signal) => client.action({
      type: 'swipe',
      x1: args.x1,
      y1: args.y1,
      x2: args.x2,
      y2: args.y2,
      ms: args.durationMs ?? 0,
      serial: args.serial,
    }, signal),
    detail: (args) => `Swiped (${args.x1}, ${args.y1}) -> (${args.x2}, ${args.y2}).`,
    presentCall: (args) => ({ card: 'generic', title: `Swipe (${args.x1}, ${args.y1}) -> (${args.x2}, ${args.y2})` }),
  }))

  register(actionTool({
    name: 'mobile_long_press',
    description: 'Press and hold one coordinate, e.g. to open a context menu.',
    parameters: {
      x: { type: 'integer', required: true, description: 'Horizontal pixel coordinate.' },
      y: { type: 'integer', required: true, description: 'Vertical pixel coordinate.' },
      durationMs: { type: 'integer', description: 'Hold duration in milliseconds; defaults to 700.' },
      serial: SERIAL_FIELD,
    },
    run: (args, signal) => client.action({
      type: 'longpress',
      x: args.x,
      y: args.y,
      ms: args.durationMs ?? 0,
      serial: args.serial,
    }, signal),
    detail: (args) => `Long-pressed (${args.x}, ${args.y}).`,
    presentCall: (args) => ({ card: 'generic', title: `Long press (${args.x}, ${args.y})` }),
  }))

  register(actionTool({
    name: 'mobile_key',
    description:
      'Send one Android key event: back, home, recents, enter, delete, volume_up, '
      + 'volume_down, power, wakeup, sleep, or menu.',
    parameters: {
      key: { type: 'string', required: true, description: 'Key name, e.g. back or home.' },
      serial: SERIAL_FIELD,
    },
    run: (args, signal) => client.action({ type: 'key', key: args.key, serial: args.serial }, signal),
    detail: (args) => `Sent key ${args.key}.`,
    presentCall: (args) => ({ card: 'generic', title: `Key ${args.key}` }),
  }))

  register(actionTool({
    name: 'mobile_text',
    description: 'Type text into the focused input. Only ASCII is reliable; use adb-level IME for CJK.',
    parameters: {
      text: { type: 'string', required: true, description: 'Text to type.' },
      serial: SERIAL_FIELD,
    },
    run: (args, signal) => client.action({ type: 'text', text: args.text, serial: args.serial }, signal),
    detail: (args) => `Typed ${args.text.length} characters.`,
    presentCall: (args) => ({ card: 'generic', title: `Type ${args.text.length} chars` }),
  }))

  register(actionTool({
    name: 'mobile_launch_app',
    description: 'Launch an installed app by package name, e.g. com.android.settings.',
    parameters: {
      package: { type: 'string', required: true, description: 'Android package name.' },
      serial: SERIAL_FIELD,
    },
    run: (args, signal) => client.action({ type: 'app', package: args.package, serial: args.serial }, signal),
    detail: (args) => `Launched ${args.package}.`,
    presentCall: (args) => ({ card: 'generic', title: `Launch ${args.package}` }),
  }))

  register(actionTool({
    name: 'mobile_wake',
    description: 'Wake the screen and show the lock screen, without unlocking.',
    parameters: { serial: SERIAL_FIELD },
    run: (args, signal) => client.action({ type: 'wake', serial: args.serial }, signal),
    detail: () => 'Screen woken.',
    presentCall: () => ({ card: 'generic', title: 'Wake screen' }),
  }))

  register(actionTool({
    name: 'mobile_quality',
    description: 'Choose the mirror stream quality preset used by the MobileControl web panel.',
    parameters: {
      quality: {
        type: 'string',
        required: true,
        enum: QUALITY_IDS,
        description: 'Preset id: smooth (540p), standard (720p), high (1080p), or native.',
      },
    },
    run: (args, signal) => client.postJson('/api/quality', { quality: args.quality }, signal),
    detail: (args) => `Mirror quality set to ${args.quality}.`,
    presentCall: (args) => ({ card: 'generic', title: `Quality ${args.quality}` }),
  }))

  register(actionTool({
    name: 'mobile_restart',
    description: 'Restart the local MobileControl server and its adb connection, e.g. when a device reconnected.',
    parameters: {},
    run: (_args, signal) => client.postJson('/api/restart', {}, signal),
    detail: () => 'MobileControl server restarted.',
    presentCall: () => ({ card: 'generic', title: 'Restart MobileControl' }),
  }))

  register({
    name: 'mobile_screenshot',
    description:
      'Capture the current device screen as a PNG and return its local file path, so it can be '
      + 'opened for inspection. Prefer this over guessing coordinates.',
    parameters: objectSchema({ serial: SERIAL_FIELD }),
    output: {
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          bytes: { type: 'integer' },
          serial: { type: 'string' },
        },
        required: ['path', 'bytes', 'serial'],
        additionalProperties: false,
      },
      render: (_args, value) => [{
        type: 'text',
        text: `Screenshot of ${value.serial === '' ? 'the selected device' : value.serial} saved to ${value.path} (${value.bytes} bytes).`,
      }],
    },
    presentCall: (args) => ({ card: 'generic', title: args.serial === undefined ? 'Screenshot' : `Screenshot ${args.serial}` }),
    execute: async (args, exec) => {
      const bytes = await client.screenshot(args.serial, exec.signal)
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const suffix = args.serial === undefined || args.serial === '' ? '' : `-${String(args.serial).replace(/[^\w.-]/g, '_')}`
      await mkdir(client.options.screenshotDir, { recursive: true })
      const path = join(client.options.screenshotDir, `mobile-${stamp}${suffix}.png`)
      await writeFile(path, bytes)
      return { path, bytes: bytes.length, serial: args.serial ?? '' }
    },
  })

  register({
    name: 'mobile_look',
    description:
      'Look at the phone screen through the local vision model and describe what is currently shown, '
      + 'including tappable or typeable elements with relative coordinates. Call this before '
      + 'mobile_tap whenever you need to know where something is on screen — it replaces guessing.',
    parameters: objectSchema({
      serial: SERIAL_FIELD,
      question: {
        type: 'string',
        description: 'Optional focus for the reading, e.g. "where is the search box" or "is a dialog open".',
      },
    }),
    output: {
      schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          app: { type: 'string' },
          elements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                role: { type: 'string' },
                fx: { type: 'number' },
                fy: { type: 'number' },
              },
              required: ['label', 'role', 'fx', 'fy'],
              additionalProperties: false,
            },
          },
          model: { type: 'string' },
          ms: { type: 'integer' },
          image: { type: 'string' },
        },
        required: ['summary', 'app', 'elements', 'model', 'ms', 'image'],
        additionalProperties: false,
      },
      render: (args, value) => {
        const lines = [`${value.summary}`]
        if (value.elements.length > 0) {
          lines.push('可点元素：')
          for (const element of value.elements) {
            lines.push(`- ${element.label}（${element.role}）· 相对坐标 ${element.fx.toFixed(2)}, ${element.fy.toFixed(2)}`)
          }
        }
        lines.push(`截图 ${value.image} · 读屏耗时 ${value.ms} ms · ${value.model}`)
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    presentCall: (args) => ({ card: 'generic', title: args.question === undefined ? 'Look at screen' : `Look: ${args.question}` }),
    execute: async (args, exec) => {
      const options = client.options
      if (!options.llm.enabled) throw new Error('语义解析已在配置中停用（llm.enabled: false）。')
      const shot = await captureForModel(options, client, args.serial, exec.signal)
      const question = typeof args.question === 'string' ? args.question.trim() : ''
      const context = [
        `屏幕尺寸：${shot.screen.width}x${shot.screen.height}`,
        `推送的截图：${shot.width}x${shot.height}（坐标按这张图量）`,
        question === '' ? '请描述当前界面。' : `请特别关注：${question}`,
      ].join('\n')
      const startedAt = Date.now()
      const reply = await chatJson(options.llm, {
        system: OBSERVE_SYSTEM,
        user: context,
        images: [shot.base64],
        numPredict: 1200,
        label: '读屏需要返回 summary 与控件列表。',
      })
      const parsed = reply.parsed
      const elements = []
      for (const raw of Array.isArray(parsed.elements) ? parsed.elements : []) {
        const fx = Number(raw?.fx ?? raw?.x)
        const fy = Number(raw?.fy ?? raw?.y)
        const label = String(raw?.label ?? raw?.text ?? '').trim().slice(0, 60)
        if (label === '' || !Number.isFinite(fx) || !Number.isFinite(fy)) continue
        elements.push({
          label,
          role: String(raw?.role ?? raw?.type ?? '').trim().slice(0, 24) || '控件',
          fx: Math.min(Math.max(fx, 0), 1),
          fy: Math.min(Math.max(fy, 0), 1),
        })
        if (elements.length >= 12) break
      }
      return {
        summary: String(parsed.summary ?? '').trim().slice(0, 400) || '（模型没有给出描述）',
        app: String(parsed.app ?? '').trim().slice(0, 40),
        elements,
        model: options.llm.model,
        ms: Date.now() - startedAt,
        image: `${shot.width}x${shot.height} JPEG ${shot.bytes} B`,
      }
    },
  })

  return names
}

/**
 * Record this mount beside the plugin data, so a running bundle can be
 * inspected without the UI (same convention as the other local bundles).
 * @param options - resolved plugin options.
 * @param client - server client, for the URL it will talk to.
 * @param tools - registered tool names.
 * @param logger - optional cordis logger.
 * @param routes - registered panel route paths.
 */
async function writeMarker(options, client, tools, logger, routes = []) {
  try {
    await mkdir(options.dataDir, { recursive: true })
    await writeFile(join(options.dataDir, 'runtime.json'), `${JSON.stringify({
      pid: process.pid,
      at: Date.now(),
      binary: options.binaryPath,
      url: client.baseUrl,
      screenshotDir: options.screenshotDir,
      tools,
      routes,
    }, null, 2)}\n`, 'utf8')
  } catch (error) {
    logger?.warn?.(`my-mobile: could not write the runtime marker: ${error?.message ?? String(error)}`)
  }
}

/* ------------------------------------------------------------------ */
/* Panel routes.                                                       */
/*                                                                     */
/* The web panel lives in `client.js`; because the harness renderer is  */
/* origin-restricted, every browser call goes through an authenticated  */
/* exact route under `/api/my-mobile/...` registered on the Connection  */
/* service (same pattern as the speech-notes bundle). The host half     */
/* proxies the MobileControl server and — for the two things the Go     */
/* binary does not cover — records the mirror stream with ffmpeg and runs    */
/* `adb push` for uploads.                                              */
/* directly, reusing the same platform-tools the binary ships with.     */
/* ------------------------------------------------------------------ */

/** Route prefix shared by every panel route. */
const PANEL_PREFIX = '/api/my-mobile'

/** Absolute path to this bundle's source directory, so recorded scripts can
 *  live next to the plugin code (survive a reinstall via the export bundle). */
const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url))

/** Where recorded automation scripts are stored: `<plugin>/scripts/*.json`. */
const SCRIPTS_DIR = join(PLUGIN_DIR, 'scripts')

/** One recorded script must not balloon into an unbounded replay. */
const SCRIPT_MAX_STEPS = 200

/** Where the bundled adb usually lives (same layout the Go binary uses). */
const ADB_CANDIDATES = [
  join(homedir(), 'bin', 'bin', 'platform-tools', 'adb'),
  '/usr/local/bin/adb',
  '/opt/homebrew/bin/adb',
]

/** Upload size cap: 64 MiB decoded, before the 4/3 base64 inflation. */
const PUSH_MAX_BYTES = 64 * 1024 * 1024

/** Longest screen recording in one take (our own cap, not the device's). */
const RECORD_MAX_SECONDS = 600

/**
 * Build a JSON response with no-store semantics.
 * @param value - JSON-serializable body.
 * @param status - HTTP status.
 */
function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/**
 * Build the shared `{ ok: false, error }` failure response.
 * @param message - human-readable reason.
 * @param status - HTTP status.
 */
function failure(message, status = 400) {
  return jsonResponse({ ok: false, error: { message } }, status)
}

/**
 * Parse a bounded JSON body.
 * @param request - route request.
 * @param limit - maximum body length in bytes.
 */
async function readJsonBody(request, limit = 64 * 1024) {
  if (request.body === null) return {}
  const text = await request.text()
  if (text.length > limit) throw new Error('请求内容过大')
  if (text.trim() === '') return {}
  const parsed = JSON.parse(text)
  return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
}

/* ------------------------------------------------------------------ */
/* Semantic planner: one natural-language sentence -> validated steps. */
/* The panel's built-in rule interpreter only matches fixed phrasings;  */
/* this half asks a local Ollama model for an action plan instead and    */
/* then re-validates every action here, so a hallucinated kind, an      */
/* out-of-screen coordinate or a made-up package name can never reach   */
/* the device.                                                          */
/* ------------------------------------------------------------------ */

/** Action kinds the planner may emit — exactly what the panel can execute. */
const PLAN_KINDS = new Set([
  'app', 'tap', 'swipe', 'longPress', 'key', 'text',
  'wake', 'screenshot', 'record', 'recordStop', 'quality', 'refresh',
])

/** Hardware keys the bridge understands. */
const PLAN_KEYS = new Set([
  'back', 'home', 'recents', 'power', 'volume_up', 'volume_down',
  'notification', 'menu', 'enter', 'delete',
])

/** Quality presets, same list MobileControl exposes. */
const PLAN_QUALITIES = new Set(QUALITY_IDS)

/** One sentence should not expand into an unbounded macro. */
const PLAN_MAX_STEPS = 12

/** Fallback screen size when the panel has not measured the device yet. */
const PLAN_FALLBACK_SCREEN = { width: 1080, height: 2340 }

/** Common app names, so a model that only knows "微信" still resolves. */
const PLAN_APP_ALIASES = {
  微信: 'com.tencent.mm',
  支付宝: 'com.eg.android.AlipayGphone',
  淘宝: 'com.taobao.taobao',
  京东: 'com.jingdong.app.mall',
  抖音: 'com.ss.android.ugc.aweme',
  快手: 'com.smile.gifmaker',
  微博: 'com.sina.weibo',
  知乎: 'com.zhihu.android',
  哔哩哔哩: 'tv.danmaku.bili',
  b站: 'tv.danmaku.bili',
  小红书: 'com.xingin.xhs',
  高德地图: 'com.autonavi.minimap',
  百度地图: 'com.baidu.BaiduMap',
  美团: 'com.sankuai.meituan',
  大众点评: 'com.dianping.v1',
  携程: 'ctrip.android.view',
  网易云音乐: 'com.netease.cloudmusic',
  qq音乐: 'com.tencent.qqmusic',
  相机: 'com.huawei.camera',
  设置: 'com.android.settings',
  图库: 'com.huawei.photos',
  相册: 'com.huawei.photos',
  浏览器: 'com.huawei.browser',
  短信: 'com.android.mms',
  电话: 'com.android.contacts',
  拨号: 'com.huawei.contacts',
  时钟: 'com.huawei.deskclock',
  日历: 'com.android.calendar',
  计算器: 'com.huawei.calculator',
  邮件: 'com.android.email',
  qq: 'com.tencent.mobileqq',
}

/* ------------------------------------------------------------------------- */
/* 指令操作（adb）模式：模型产出「结构化意图」，宿主把意图映射成固定、白名单  */
/* 化的 adb 命令。与上面的点击/看屏不同——这里不碰屏幕坐标，直接走 adb。       */
/* ------------------------------------------------------------------------- */

/** adb 意图白名单：模型 `kind` 只能取这些值。 */
const ADB_KINDS = new Set([
  'app', 'home', 'back', 'recents', 'keyevent', 'text',
  'screenshot', 'wake', 'sleep', 'volumeUp', 'volumeDown',
  'install', 'uninstall', 'clearData', 'listPackages',
])

/** 需要用户逐条确认的意图（有副作用 / 不可撤销）。 */
const ADB_DANGEROUS = new Set(['install', 'uninstall', 'clearData'])

/** 允许传给 `input keyevent` / `input keyevent --longpress` 的按键码。 */
const ADB_KEYCODES = new Set([
  '3', /* HOME */ '4', /* BACK */ '24', /* VOLUME_UP */ '25', /* VOLUME_DOWN */
  '26', /* POWER */ '82', /* MENU */ '66', /* ENTER */ '67', /* DEL */
  '187', /* RECENTS */ '84', /* SEARCH */ '61', /* TAB */
])

/**
 * 把一个 adb 意图映射成一条可执行的 adb 命令（argv 数组，不含 `adb` 本身）。
 * 返回 `{ argv, dangerous, label }`；无法映射时返回 `null`。
 * 命令是写死的白名单，不接受模型自造的自由 shell。
 * @param intent - `{ kind, ...params }` 来自模型。
 * @param serial - 目标设备序列号（为空表示唯一设备）。
 */
function adbIntentToCommand(intent, serial) {
  if (intent === null || typeof intent !== 'object') return null
  const kind = String(intent.kind ?? '').trim()
  if (!ADB_KINDS.has(kind)) return null
  const target = serial === '' ? [] : ['-s', serial]
  switch (kind) {
    case 'app': {
      const pkg = planPackage(intent.package) || planPackage(intent.name) || planPackage(intent.app)
      if (pkg === '') return null
      return {
        argv: [...target, 'shell', 'monkey', '-p', pkg, '-c', 'android.intent.category.LAUNCHER', '1'],
        dangerous: false,
        label: `打开 ${pkg}`,
      }
    }
    case 'home':
      return { argv: [...target, 'shell', 'input', 'keyevent', '3'], dangerous: false, label: '回桌面' }
    case 'back':
      return { argv: [...target, 'shell', 'input', 'keyevent', '4'], dangerous: false, label: '返回' }
    case 'recents':
      return { argv: [...target, 'shell', 'input', 'keyevent', '187'], dangerous: false, label: '多任务' }
    case 'keyevent': {
      const key = String(intent.key ?? intent.keycode ?? '').trim()
      if (!ADB_KEYCODES.has(key)) return null
      return { argv: [...target, 'shell', 'input', 'keyevent', key], dangerous: false, label: `按键 ${key}` }
    }
    case 'text': {
      const text = String(intent.text ?? intent.value ?? '').slice(0, 500)
      if (text.trim() === '') return null
      /* input text 只吃 ASCII；中文会抛错并如实回传。 */
      return { argv: [...target, 'shell', 'input', 'text', text], dangerous: false, label: `输入 ${text.slice(0, 24)}` }
    }
    case 'screenshot':
      return { argv: [...target, 'shell', 'screencap', '-p'], dangerous: false, label: '截图' }
    case 'wake':
      return { argv: [...target, 'shell', 'input', 'keyevent', '224'], dangerous: false, label: '唤醒屏幕' }
    case 'sleep':
      return { argv: [...target, 'shell', 'input', 'keyevent', '223'], dangerous: false, label: '锁屏' }
    case 'volumeUp':
      return { argv: [...target, 'shell', 'input', 'keyevent', '24'], dangerous: false, label: '音量+' }
    case 'volumeDown':
      return { argv: [...target, 'shell', 'input', 'keyevent', '25'], dangerous: false, label: '音量−' }
    case 'install': {
      /* 安装依赖先推送到设备再 pm install；这里只接受一个已在设备上的 apk 路径。 */
      const apk = String(intent.apk ?? intent.path ?? '').trim()
      if (apk === '' || /[/\\]/u.test(apk) === false) return null
      return { argv: [...target, 'shell', 'pm', 'install', '-r', apk], dangerous: true, label: `安装 ${apk}` }
    }
    case 'uninstall': {
      const pkg = planPackage(intent.package) || planPackage(intent.name) || planPackage(intent.app)
      if (pkg === '') return null
      return { argv: [...target, 'shell', 'pm', 'uninstall', pkg], dangerous: true, label: `卸载 ${pkg}` }
    }
    case 'clearData': {
      const pkg = planPackage(intent.package) || planPackage(intent.name) || planPackage(intent.app)
      if (pkg === '') return null
      return { argv: [...target, 'shell', 'pm', 'clear', pkg], dangerous: true, label: `清空 ${pkg} 数据` }
    }
    case 'listPackages': {
      const query = String(intent.filter ?? '').trim().slice(0, 60)
      const argv = query === ''
        ? [...target, 'shell', 'pm', 'list', 'packages']
        : [...target, 'shell', 'pm', 'list', 'packages', query]
      return { argv, dangerous: false, label: query === '' ? '列出已安装应用' : `查找应用：${query}` }
    }
    default:
      return null
  }
}

/**
 * 把模型的整份 adb 意图回复解析成「待执行命令」列表，逐个做白名单校验。
 * @param parsed - 模型回复的 JSON（`{ steps: [...] }` 或 `{ actions: [...] }`）。
 * @param serial - 目标设备序列号。
 * @returns `{ commands, dropped }`；commands 里每条含 `kind/say/argv/dangerous`。
 */
function normalizeAdbPlan(parsed, serial) {
  const rawSteps = Array.isArray(parsed)
    ? parsed
    : (Array.isArray(parsed?.steps) ? parsed.steps : (Array.isArray(parsed?.actions) ? parsed.actions : []))
  const commands = []
  let dropped = 0
  for (const entry of rawSteps.slice(0, PLAN_MAX_STEPS)) {
    const mapped = adbIntentToCommand(entry, serial)
    if (mapped === null) { dropped += 1; continue }
    commands.push({
      kind: String(entry.kind ?? '').trim(),
      say: String(entry.say ?? mapped.label ?? '').trim().slice(0, 80) || mapped.label,
      argv: mapped.argv,
      dangerous: mapped.dangerous,
    })
  }
  return { commands, dropped }
}

/** 指令操作（adb）模式的系统提示词。 */
const ADB_AGENT_SYSTEM = [
  '你是安卓手机「指令操作」规划器。用户给一句自然语言，你把它翻译成要执行的 adb 动作意图序列，只输出 JSON。',
  '',
  '输出格式：{"steps":[{"kind":"app","name":"微信","say":"打开微信"}]}',
  '',
  'kind 只能取以下值，参数按说明给：',
  '1. app —— 打开应用：{"kind":"app","name":"微信","say":"..."}；知道包名就给 package，不知道给 name，不要编造包名。',
  '2. home / back / recents —— 回桌面 / 返回 / 多任务：{"kind":"home"}。',
  '3. keyevent —— 按键：{"kind":"keyevent","key":"24","say":"音量+"}；key 取 3/4/24/25/26/82/66/67/187/84/61。',
  '4. text —— 输入文字：{"kind":"text","text":"你好","say":"..."}（只支持 ASCII，中文会被拒绝）。',
  '5. screenshot —— 截图：{"kind":"screenshot"}。',
  '6. wake / sleep —— 唤醒 / 锁屏：{"kind":"wake"}。',
  '7. volumeUp / volumeDown —— 音量加减。',
  '8. listPackages —— 列出/查找已安装应用：{"kind":"listPackages","filter":"银行"}。',
  '9. install / uninstall / clearData —— 安装/卸载/清数据，有副作用，会单独让用户确认：{"kind":"uninstall","name":"中原银行"}。',
  '',
  '规则：',
  '- 只输出 JSON，不要解释文字，不要 markdown 代码块。',
  '- 用户说了几件事就输出几个动作，按顺序；一步一个动作。',
  '- 优先用能一次到位、不需要点屏幕的 adb 命令（am start / input keyevent / input text / pm / screencap）。',
  '- 打开应用优先给 name 或 package，不要试图描述桌面图标位置。',
  '- 拿不准、或需要只有用户知道的信息时，输出 {"steps":[]}。',
  '- 最多 12 个动作。',
].join('\n')

/** Instructions handed to the planner model on every call. */
const PLANNER_SYSTEM = [
  '你是 Android 手机自动化规划器。把用户的一句话（可能包含多步）翻译成动作序列，只输出 JSON。',
  '',
  '输出格式：{"steps":[{"kind":"app","package":"com.tencent.mm","say":"打开微信"}]}',
  '',
  '可用动作，kind 只能取以下值：',
  '1. app —— 打开应用：{"kind":"app","package":"<Android 包名>","say":"..."}；不确定包名时用 {"kind":"app","name":"微信","say":"..."}，不要编造包名。',
  '2. tap —— 点击：{"kind":"tap","fx":0.5,"fy":0.85,"say":"点击搜索框"}；fx/fy 是 0~1 的相对坐标，左上角为 0,0。',
  '3. swipe —— 滑动：{"kind":"swipe","fx1":0.5,"fy1":0.7,"fx2":0.5,"fy2":0.3,"ms":300,"say":"上滑"}；从上往下滑是 fy1>fy2。',
  '4. longPress —— 长按：{"kind":"longPress","fx":0.5,"fy":0.5,"ms":700,"say":"长按..."}。',
  '5. key —— 按键：{"kind":"key","key":"back","say":"返回"}；key 只能是 back/home/recents/power/volume_up/volume_down/notification/menu/enter/delete。',
  '6. text —— 输入文字：{"kind":"text","text":"你好","say":"输入 你好"}；先用 tap 点中输入框再 text。',
  '7. wake —— 唤醒屏幕：{"kind":"wake","say":"点亮屏幕"}。',
  '8. screenshot —— 截图：{"kind":"screenshot","say":"截图"}。',
  '9. record —— 录屏：{"kind":"record","seconds":15,"say":"录屏 15 秒"}；seconds 取 3~600。',
  '10. recordStop —— 停止录屏：{"kind":"recordStop","say":"停止录屏"}。',
  '11. quality —— 画质：{"kind":"quality","quality":"smooth","say":"切到流畅"}；quality 取 smooth/standard/high/native。',
  '12. refresh —— 刷新画面：{"kind":"refresh","say":"刷新画面"}。',
  '',
  '规则：',
  '- 只输出 JSON，不要解释文字，不要 markdown 代码块。',
  '- 用户说了几件事就输出几个动作，按执行顺序排列；一步一个动作。',
  '- 你看不到屏幕，点击只能给保守的相对坐标（屏幕中心、顶部搜索框、底部按钮等常见位置），并在 say 里写清意图。',
  '- 需要滚动列表时输出 swipe；返回上一页用 key/back。',
  '- 最多 12 个动作；无法转成动作时输出 {"steps":[]}。',
].join('\n')

/** Appended to {@link PLANNER_SYSTEM} whenever the current screen is attached. */
const PLANNER_VISION_ADDENDUM = [
  '',
  '本次附带了一张当前屏幕截图，你能看到它。',
  '- 截图反映的是执行任何动作之前的样子，第一个动作的坐标可以直接按截图测量。',
  '- 坐标仍是 0~1 的比例：fx = 目标像素 x / 截图宽度，fy = 目标像素 y / 截图高度。',
  '- 只点截图里真实存在的目标，并在 say 里带上目标上的文字；看不到就先 swipe 滚动，或用 key/back 退出当前页。',
  '- 后面的动作会改变屏幕，那些步骤只能按常见布局推断，不要凭空描述新页面的细节。',
].join('\n')

/**
 * One-step-at-a-time prompt: the panel loops "screenshot -> one action" until
 * the model reports the goal is met. Seeing the result of each action is what
 * makes multi-page flows (search, menus) work without per-app automation.
 */
const AGENT_SYSTEM = [
  '你是安卓手机操作代理。每轮你会收到一张当前屏幕截图、用户的最终目标，以及已经执行过的动作列表。',
  '你每轮只决定「下一个动作」，让手机一步步接近目标。',
  '',
  '只输出一个 JSON 对象，三种形态之一：',
  '1. 继续操作，例如 {"kind":"tap","fx":0.5,"fy":0.32,"say":"点击搜索框"}',
  '2. 目标已达成，例如 {"done":true,"say":"图库已打开并显示照片列表"}',
  '3. 你确定不了下一步，例如 {"pause":true,"say":"搜索框下方有三个同名结果，不知道该点哪个"}',
  '',
  'kind 取值与参数：',
  '1. app —— 打开应用：{"kind":"app","package":"<包名>","say":"..."}；不确定包名时给 name，不要编造。',
  '2. tap —— 点击：{"kind":"tap","fx":0.5,"fy":0.3,"say":"点击搜索框"}。',
  '3. swipe —— 滑动：{"kind":"swipe","fx1":0.5,"fy1":0.75,"fx2":0.5,"fy2":0.3,"ms":300,"say":"上滑看更多"}。',
  '4. longPress —— 长按：{"kind":"longPress","fx":0.5,"fy":0.5,"ms":700,"say":"..."}。',
  '5. key —— 按键：{"kind":"key","key":"back","say":"返回"}，key 取 back/home/recents/power/volume_up/volume_down/notification/menu/enter/delete。',
  '6. text —— 输入文字：{"kind":"text","text":"今天的推荐","say":"输入关键词"}。',
  '7. wake / screenshot / record / recordStop / quality / refresh —— 唤醒、截图、录屏、停录、画质、刷新。',
  '',
  '硬性规则：',
  '- 坐标是 0~1 的相对比例（fx/fy），必须来自截图里你真实看到的位置，不要凭想象给坐标。',
  '- 输入文字前先用 tap 点中输入框；截图里输入框已聚焦（出现光标/键盘）时，直接 text。',
  '- 一次只做一个动作，不要在一轮里串联多步。',
  '- 不要重复「已执行动作」里做过的事，除非目标明确要求再来一次。',
  '- 目标达成后立刻输出 {"done":true,...}，不要追加多余动作。',
  '- 需要滚动才能看到的内容，先 swipe；不要对看不见的目标猜坐标。',
  '- 手指向上滑（fy1 > fy2）= 看更下面的内容；手指向下滑（fy1 < fy2）= 回到更上面的内容。',
  '- 如果上一步点进去不是你想要的页面，用 key/back 出来，改成滚动或换个入口；不要反复点同一个位置。',
  '- 如果提示「上一轮画面完全相同」，说明上一个动作没有任何效果：换方向滚动或换入口，不要重复同一动作。',
  '- 拿不准就输出 pause，不要靠猜坐标硬往前推。pause 的 say 要写清楚：当前在哪个页面、看到了什么、需要用户确认什么。',
  '- 该 pause 的情形：目标有多个候选（同名按钮、多个同名搜索结果）；需要只有用户知道的信息（账号、密码、验证码）；屏幕内容判断不出处在哪一页；下一步有副作用且该不该做取决于用户（删除、卸载、支付、发送、授权）。',
  '- 下手前先自查这件事：「我这一步作用在哪个具体对象上？」如果答案来自用户的指令原文，可以动手；如果答案是你自己从屏幕上挑的，而操作又不可撤销（卸载、删除、清空、支付、发送、退出登录），必须 pause 并列出候选让用户选。',
  '- 用户用「一个/某个/随便/找个」这类量词指向有副作用的操作时（如「删掉一个不常用的应用」），不要替他挑：pause，并给出屏幕上符合条件的具体候选及位置。',
  '- 判断标准是「猜错要不要赔」：点错一个菜单可以自己退回来，删错一个应用要用户重装。后者一律先问。',
  '- 该 done 的情形：目标确实达成了。没做完不要写成 done；做不到或不该替你决定，就写 pause。',
  '',
  '页面守卫（每一轮先做这一步）：',
  '- 下单前先回答「我现在还在用户目标的页面上吗？」如果已经从目标页面误入了别的页面（问卷变成了首页、商城、广告、下载页等），不要在这个错误页面继续点，立刻用 key/back 退回上一页，直到回到目标上下文再继续。',
  '- 宁可多 back 一次回到安全页，也不要在一个陌生的页面上「找感觉」乱点。',
  '- 如果 back 多次后仍回不到目标页面，输出 pause，说明当前在哪、回不去的原因。',
  '',
  '问卷/表单填写专项：',
  '- 只点题目本身的选项（单选圆点、多选勾选、下拉、量表刻度）和「下一题/提交/下一步」这类明确的前进按钮。',
  '- 绝不点：底部 tab、顶部返回以外的导航、广告、外部链接、「了解更多」「去看看」「领券/抽奖」等与作答无关的入口。',
  '- 遇到一屏多题，从上往下逐题作答，做完一屏再滚动或点「下一题」，不要跳题。',
  '- 客观选择题直接选；出现主观填空/评论时，不要替你编答案，输出 pause 让用户自己填。',
  '- 需要登录、手机号、验证码等本人信息时，输出 pause，不要瞎填。',
  '- 点「提交」前先确认所有必答题已作答；有必答校验提示（红字/弹窗）时按提示补答，不要跳过。',
  '- 只输出 JSON，不要解释文字，不要 markdown 代码块。',
].join('\n')

/**
 * Decision prompt for dual-model mode: a dedicated UI model has already
 * located every clickable element, so the planner must *pick* a target by its
 * element number instead of guessing coordinates. Everything else (done /
 * pause / non-tap actions) stays identical to the single-model contract.
 */
const AGENT_SYSTEM_DUAL = [
  '你是安卓手机操作代理。每轮你会收到：一张当前屏幕截图、一份「可点击元素清单」（每个元素有序号和中心坐标）、用户的最终目标，以及已执行过的动作。',
  '你每轮只决定「下一个动作」，让手机一步步接近目标。',
  '',
  '只输出一个 JSON 对象，三种形态之一：',
  '1. 点击某个清单里的元素：{"kind":"tap","element":3,"say":"点击搜索框"}（element 是清单里元素的序号，从 1 开始）',
  '2. 目标已达成：{"done":true,"say":"..."}',
  '3. 你确定不了下一步：{"pause":true,"say":"..."}',
  '',
  '其它动作（不点元素时）与单模型一致：',
  '- 滑动：{"kind":"swipe","fx1":0.5,"fy1":0.75,"fx2":0.5,"fy2":0.3,"ms":300,"say":"上滑"}',
  '- 按键：{"kind":"key","key":"back","say":"返回"}（back/home/recents/enter/delete 等）',
  '- 输入文字：{"kind":"text","text":"...","say":"输入"}',
  '- 打开应用：{"kind":"app","package":"...","say":"..."}（不确定包名给 name，别编造）',
  '- 长按：{"kind":"longPress","element":5,"ms":700,"say":"..."}',
  '',
  '硬性规则：',
  '- 要点击就优先用 element 引用清单序号，不要自己给 fx/fy 坐标；清单里没有对应目标时才允许给 fx/fy（0~1 相对比例）。',
  '- 一个目标在清单里有多个候选时，选最匹配「用户目标」语义的那个；拿不准就 pause。',
  '- 一次只做一个动作，不要串联多步。',
  '- 不要重复「已执行动作」里做过的事，除非目标明确要求再来一次。',
  '- 目标达成立刻 {"done":true,...}，不要追加多余动作。',
  '- 需要滚动才能看到的内容先 swipe；清单里没找到目标就先滚动再重新看。',
  '- 手指向上滑（fy1 > fy2）= 看更下面；手指向下滑（fy1 < fy2）= 回到更上面。',
  '- 如果上一步点进去不是你想要的页面，用 key/back 出来，改成滚动或换入口。',
  '- 如果提示「上一轮画面完全相同」，换方向滚动或换入口，不要重复同一动作。',
  '- 拿不准就输出 pause，不要靠猜坐标硬推。',
  '- 该 pause：目标有多个候选、需要只有用户知道的信息（账号/密码/验证码）、判断不出在哪一页、下一步有副作用且该不该做取决于用户。',
  '- 下手前先自查：「这一步作用在哪个具体对象上？」不可撤销的操作（卸载/删除/清空/支付/发送/退出登录）必须 pause 列出候选让用户选。',
  '',
  '页面守卫（每一轮先做）：',
  '- 先判断「我现在还在用户目标的页面上吗？」误入别的页面（问卷变成首页/商城/广告/下载页）就立刻 key/back 退回，不要在错误页面乱点；回不去就 pause。',
  '',
  '问卷/表单填写专项：',
  '- 只点题目选项和「下一题/提交」这类前进按钮；绝不点底部 tab、广告、外链、「了解更多/领券/抽奖」等无关入口。',
  '- 一屏多题从上往下逐题做，做完一屏再滚动或点「下一题」，不跳题。',
  '- 客观题直接选；主观填空、登录、验证码等需要本人信息的，pause 让用户填。',
  '- 点「提交」前确认必答题已答完，有红字/弹窗校验就补答。',
  '- 只输出 JSON，不要解释文字，不要 markdown 代码块。',
].join('\n')

/**
 * Reading-the-screen prompt, used by the `mobile_look` tool so a text-only
 * chat model can still find out what is on the phone.
 */
const OBSERVE_SYSTEM = [
  '你是安卓界面读取助手。给你一张手机截图，请描述当前界面，并列出可点击/可输入的控件。',
  '',
  '只输出 JSON：',
  '{"app":"微信","summary":"聊天列表页，顶部有搜索框和四个标签","elements":[{"label":"搜索框","role":"输入框","fx":0.5,"fy":0.09}]}',
  '',
  '规则：',
  '- summary 用一句中文概括这是什么页面、有什么关键内容。',
  '- elements 最多 12 个，只列截图里真实存在、且用户可以点或输入的控件；按从上到下排序。',
  '- fx/fy 是控件中心点的 0~1 相对比例（左上角 0,0），按截图尺寸测量。',
  '- 没有可点元素时给空数组；不要编造看不到的控件。',
  '- 只输出 JSON，不要解释文字，不要 markdown 代码块。',
].join('\n')

/**
 * Read the pixel size out of a PNG's IHDR chunk.
 * @param bytes - PNG bytes.
 * @returns `{ width, height }` or null when the buffer is not a PNG.
 */
function pngSize(bytes) {
  if (bytes.length < 24 || bytes.readUInt32BE(12) !== 0x49484452) return null
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/**
 * Downscale a PNG screenshot into the compact JPEG the vision model reads.
 * 720 px wide keeps UI text legible while cutting the payload to ~100 KB
 * (and the prompt to ~1.2k tokens) — at 1080 px the same question cost
 * twice the tokens for the same answer.
 * @param png - raw screenshot bytes.
 * @param maxWidth - target width cap in pixels.
 * @param timeoutMs - hard kill budget for ffmpeg.
 * @returns `{ jpeg, width, height, source }`.
 */
function toModelJpeg(png, maxWidth, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    const source = pngSize(png)
    if (source === null) {
      reject(new Error('截图不是合法的 PNG'))
      return
    }
    const width = Math.max(2, Math.min(Math.round(maxWidth), source.width))
    const height = Math.max(2, Math.round(((source.height * width) / source.width) / 2) * 2)
    const child = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error',
      '-f', 'image2pipe', '-i', 'pipe:0',
      '-vf', `scale=${width}:${height}`,
      '-q:v', '4',
      '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'pipe'] })
    const chunks = []
    let stderr = ''
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.stdout.on('data', (chunk) => { chunks.push(Buffer.from(chunk)) })
    child.stderr.on('data', (chunk) => { stderr += String(chunk) })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(new Error(`ffmpeg 无法执行：${error.message}`))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      const jpeg = Buffer.concat(chunks)
      if (code !== 0 || jpeg.length === 0) {
        reject(new Error(`截图压缩失败（ffmpeg 退出码 ${code}）${stderr.trim().slice(0, 160)}`))
        return
      }
      resolve({ jpeg, width, height, source })
    })
    child.stdin.end(png)
  })
}

/**
 * Capture the current screen and prepare it for the vision model.
 * @param options - resolved plugin options.
 * @param client - MobileControl client.
 * @param serial - target device; server default when omitted.
 * @param signal - caller cancellation.
 * @returns `{ base64, width, height, bytes, screen }`.
 */
async function captureForModel(options, client, serial, signal) {
  const png = await client.screenshot(serial, signal)
  const shot = await toModelJpeg(png, options.llm.imageWidth)
  return {
    base64: shot.jpeg.toString('base64'),
    width: shot.width,
    height: shot.height,
    bytes: shot.jpeg.length,
    pngBytes: png.length,
    /* Fingerprint of the exact PNG, so the next round can tell whether the
       action it just issued actually changed the screen. */
    hash: createHash('sha256').update(png).digest('hex').slice(0, 16),
    screen: shot.source,
  }
}

/**
 * Round one coordinate into a device pixel.
 * Values in [0,1] are treated as fractions, larger values as raw pixels;
 * anything outside the screen is clamped.
 * @param value - model-supplied coordinate.
 * @param size - screen width or height in pixels.
 */
function planPixel(value, size) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  const ratio = Math.abs(numeric) <= 1 ? numeric : numeric / size
  const clamped = Math.min(Math.max(ratio, 0), 1)
  return Math.round(clamped * size)
}

/**
 * Resolve a package id from a raw package or a human app name.
 * @param value - `package` or `name` field from the model.
 */
function planPackage(value) {
  const raw = String(value ?? '').trim()
  if (raw === '') return ''
  if (/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/.test(raw)) return raw
  const key = raw.toLowerCase().replace(/\s+/g, '')
  const direct = PLAN_APP_ALIASES[key] ?? PLAN_APP_ALIASES[raw]
  if (direct !== undefined) return direct
  const hit = Object.keys(PLAN_APP_ALIASES).find((alias) => key.includes(alias) || alias.includes(key))
  return hit === undefined ? '' : PLAN_APP_ALIASES[hit]
}

/**
 * Validate and normalise one model-emitted action.
 * @param raw - one entry of `steps`.
 * @param screen - device size used to convert fractions into pixels.
 * @returns a executable step, or null when the action is unusable.
 */
function normalizePlanStep(raw, screen) {
  if (raw === null || typeof raw !== 'object') return null
  const kind = String(raw.kind ?? raw.type ?? raw.action ?? '').trim()
  if (!PLAN_KINDS.has(kind)) return null
  const say = String(raw.say ?? raw.label ?? raw.description ?? '').trim().slice(0, 80)
  const step = { kind, say }

  switch (kind) {
    case 'app': {
      const pkg = planPackage(raw.package) || planPackage(raw.name) || planPackage(raw.app)
      if (pkg === '') return null
      return { kind, package: pkg, say: say || `打开 ${pkg}` }
    }
    case 'tap': {
      const x = planPixel(raw.fx ?? raw.x, screen.width)
      const y = planPixel(raw.fy ?? raw.y, screen.height)
      if (x === null || y === null) return null
      return { kind, x, y, say: say || `点击 (${x}, ${y})` }
    }
    case 'longPress': {
      const x = planPixel(raw.fx ?? raw.x, screen.width)
      const y = planPixel(raw.fy ?? raw.y, screen.height)
      if (x === null || y === null) return null
      const ms = Math.min(Math.max(Number(raw.ms) || 700, 300), 3000)
      return { kind, x, y, ms, say: say || `长按 (${x}, ${y})` }
    }
    case 'swipe': {
      const x1 = planPixel(raw.fx1 ?? raw.x1, screen.width)
      const y1 = planPixel(raw.fy1 ?? raw.y1, screen.height)
      const x2 = planPixel(raw.fx2 ?? raw.x2, screen.width)
      const y2 = planPixel(raw.fy2 ?? raw.y2, screen.height)
      if (x1 === null || y1 === null || x2 === null || y2 === null) return null
      const ms = Math.min(Math.max(Number(raw.ms) || 300, 100), 2000)
      return { kind, x1, y1, x2, y2, ms, say: say || '滑动' }
    }
    case 'key': {
      const key = String(raw.key ?? '').trim()
      if (!PLAN_KEYS.has(key)) return null
      return { kind, key, say: say || `按键 ${key}` }
    }
    case 'text': {
      const text = String(raw.text ?? raw.value ?? '').slice(0, 500)
      if (text.trim() === '') return null
      return { kind, text, say: say || `输入 ${text.slice(0, 24)}` }
    }
    case 'record': {
      /* A missing or nonsensical duration falls back to 15 s; a valid but
         extreme one clamps into the 3–600 s window the recorder allows. */
      const rawSeconds = Number(raw.seconds)
      const seconds = Number.isFinite(rawSeconds) && rawSeconds > 0
        ? Math.min(Math.max(Math.round(rawSeconds), 3), 600)
        : 15
      return { kind, seconds, say: say || `录屏 ${seconds} 秒` }
    }
    case 'quality': {
      const quality = String(raw.quality ?? '').trim()
      if (!PLAN_QUALITIES.has(quality)) return null
      return { kind, quality, say: say || `画质 ${quality}` }
    }
    default:
      return { kind, say: say || kind }
  }
}

/**
 * Turn the model's reply into executable steps, dropping everything invalid.
 * @param payload - parsed JSON from the model.
 * @param screen - device size.
 */
function normalizePlan(payload, screen) {
  const rawSteps = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload?.steps) ? payload.steps : (Array.isArray(payload?.actions) ? payload.actions : []))
  return rawSteps
    .slice(0, PLAN_MAX_STEPS * 2)
    .map((entry) => normalizePlanStep(entry, screen))
    .filter((entry) => entry !== null)
    .slice(0, PLAN_MAX_STEPS)
}

/**
 * A script filename is a slug plus `.json`; anything else is rejected.
 * @param name - script name, with or without the `.json` suffix.
 * @returns the absolute path inside `SCRIPTS_DIR`.
 */
function scriptFile(name) {
  const slug = String(name ?? '').trim().replace(/\.json$/u, '')
  if (slug === '' || slug.length > 80 || !/^[\w\u4e00-\u9fa5-]+$/u.test(slug)) {
    throw new Error('脚本名只能含字母/数字/下划线/中文/连字符，且不超过 80 个字符。')
  }
  return join(SCRIPTS_DIR, `${slug}.json`)
}

/**
 * Normalise one recorded action so only the whitelisted kinds survive, and
 * drop every field the executor does not understand (keeps files small and
 * replay-safe). Fractions are already resolved to pixels by normalizePlanStep.
 * @param raw - one entry of a recorded script's `steps`.
 * @returns a compact executable step, or null when invalid.
 */
function normalizeScriptStep(raw) {
  if (raw === null || typeof raw !== 'object') return null
  const step = normalizePlanStep(raw, PLAN_FALLBACK_SCREEN)
  if (step === null) return null
  const out = { kind: step.kind }
  if (step.say) out.say = step.say
  if (step.x !== undefined) out.x = step.x
  if (step.y !== undefined) out.y = step.y
  if (step.x1 !== undefined) out.x1 = step.x1
  if (step.y1 !== undefined) out.y1 = step.y1
  if (step.x2 !== undefined) out.x2 = step.x2
  if (step.y2 !== undefined) out.y2 = step.y2
  if (step.ms !== undefined) out.ms = step.ms
  if (step.package !== undefined) out.package = step.package
  if (step.key !== undefined) out.key = step.key
  if (step.text !== undefined) out.text = step.text
  if (step.quality !== undefined) out.quality = step.quality
  if (step.seconds !== undefined) out.seconds = step.seconds
  return out
}

/**
 * Pull the first JSON object out of a model reply (some builds still wrap it
 * in prose or a fenced block even with `format: json`).
 * @param content - raw assistant text.
 */
function parsePlanJson(content) {
  const text = String(content ?? '').trim()
  if (text === '') return null
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end <= start) return null
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

/**
 * `fetch` with a hard timeout, returning the decoded JSON body.
 * @param url - absolute URL.
 * @param init - fetch options.
 * @param timeoutMs - abort budget.
 */
async function fetchJsonWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const body = await response.text()
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}${body.trim() === '' ? '' : `：${body.trim().slice(0, 200)}`}`)
    }
    return body.trim() === '' ? null : JSON.parse(body)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Run one structured (JSON) turn against the local model.
 *
 * The planner is a *thinking* model: `capabilities` includes `thinking`, so
 * every reply starts with a chain-of-thought that counts against
 * `num_predict`. On a busy screen (search results, long lists) the reasoning
 * alone can run past the budget, and Ollama then returns
 * `done_reason: "length"` with an **empty** `content` — the answer never
 * starts. A single empty reply used to abort the whole panel loop mid-task,
 * which is exactly "it found the app and then stopped".
 *
 * So: reasoning is off by default (also ~20x faster: 1 s vs 27–44 s per
 * step), and if the reply is still empty or unparseable we retry once with
 * reasoning enabled and a much larger budget, then salvage JSON out of the
 * reasoning block as a last resort.
 *
 * @param llm - resolved `options.llm`.
 * @param request - `{ system, user, images?, numPredict?, label? }`.
 * @returns `{ parsed, content, thinking, doneReason, evalCount, ms, mode }`.
 */
async function chatJson(llm, request) {
  const images = Array.isArray(request.images) ? request.images : []
  const numPredict = Number.isFinite(request.numPredict) && request.numPredict > 0 ? Number(request.numPredict) : 1200
  /* `think` can be forced per call: the panel escalates a stuck round
     (same action repeating, screen not changing) to a reasoning round. */
  const think = typeof request.think === 'boolean' ? request.think : llm.think
  const attempts = [
    { think, numPredict },
    { think: !think, numPredict: Math.max(numPredict * 3, 3000) },
  ]
  const startedAt = Date.now()
  let last = { doneReason: '', evalCount: 0, content: '', thinking: '' }
  let lastError = null

  for (const attempt of attempts) {
    try {
      const payload = await fetchJsonWithTimeout(`${llm.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: llm.model,
          stream: false,
          format: 'json',
          keep_alive: '10m',
          think: attempt.think,
          options: { temperature: 0.1, num_ctx: 8192, num_predict: attempt.numPredict },
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user, ...(images.length === 0 ? {} : { images }) },
          ],
        }),
      }, llm.timeoutMs)

      const content = typeof payload?.message?.content === 'string' ? payload.message.content : ''
      const thinking = typeof payload?.message?.thinking === 'string' ? payload.message.thinking : ''
      last = {
        doneReason: String(payload?.done_reason ?? ''),
        evalCount: Number(payload?.eval_count) || 0,
        content,
        thinking,
      }
      const parsed = parsePlanJson(content)
      if (parsed !== null) {
        return { ...last, parsed, ms: Date.now() - startedAt, mode: attempt.think ? 'thinking' : 'direct' }
      }
      /* Salvage: some builds emit the JSON inside the reasoning block. */
      const fromThinking = parsePlanJson(thinking)
      if (fromThinking !== null) {
        return { ...last, parsed: fromThinking, ms: Date.now() - startedAt, mode: 'salvaged' }
      }
    } catch (error) {
      lastError = error
    }
  }

  const reason = last.content.trim() === ''
    ? (last.doneReason === 'length'
      ? `回复被截断：思考链用完了输出预算（done_reason=length，已生成 ${last.evalCount} token），正文一个字都没输出`
      : '回复为空')
    : '回复不是合法 JSON'
  const hint = lastError !== null ? `（另有一次请求失败：${lastError.message}）` : ''
  throw new Error(`本地模型没给出可用的动作：${reason}${hint}。${request.label ?? ''}`)
}

/**
 * One plain (non-JSON-forced) turn against an arbitrary Ollama model.
 * Used for the UI-grounding model, which returns a line-oriented list rather
 * than strict JSON. Returns the raw `message.content` string.
 * @param llm - resolved `options.llm` (only `baseUrl`/`timeoutMs` are reused).
 * @param model - model name to call (e.g. the dedicated UI model).
 * @param request - `{ system?, user, images?, numPredict? }`.
 */
async function chatModelRaw(llm, model, request) {
  const images = Array.isArray(request.images) ? request.images : []
  const numPredict = Number.isFinite(request.numPredict) && request.numPredict > 0 ? Number(request.numPredict) : 1200
  const payload = await fetchJsonWithTimeout(`${llm.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      keep_alive: '10m',
      options: { temperature: 0.2, num_ctx: 8192, num_predict: numPredict },
      messages: [
        ...(request.system ? [{ role: 'system', content: request.system }] : []),
        { role: 'user', content: request.user, ...(images.length === 0 ? {} : { images }) },
      ],
    }),
  }, llm.timeoutMs)
  return typeof payload?.message?.content === 'string' ? payload.message.content : ''
}

/**
 * Ask the dedicated UI-grounding model to list the clickable elements on the
 * current screen. Returns normalised `{ label, fx, fy, fw, fh }` entries
 * (fx/fy are the box top-left, fw/fh the box size, all 0–1 fractions of the
 * image), or an empty array on any failure — dual-model mode then falls back
 * to the single-model path gracefully. A box lets the panel draw a marker
 * rectangle over the mirror; a centre-only hit gets a small default box so it
 * still renders.
 * @param llm - resolved `options.llm` (baseUrl/timeoutMs reused).
 * @param uiModel - UI-grounding model name.
 * @param image - `{ base64, width, height }` from `captureForModel`.
 */
async function scanUiElements(llm, uiModel, image) {
  const text = await chatModelRaw(llm, uiModel, {
    system: '你是手机 UI 元素检测器。列出截图里所有可以点击/输入的控件及其边界框。',
    user: '列出这张手机截图里所有可以点击的 UI 元素，每个元素一行，格式严格为：label|x1|y1|x2|y2（x1,y1 是边界框左上角像素坐标，x2,y2 是右下角像素坐标）。只列真实存在的元素，按从上到下排序，不要解释，不要多余文字。',
    images: [image.base64],
    numPredict: 2000,
  })
  const width = Number(image.width) > 0 ? Number(image.width) : 720
  const height = Number(image.height) > 0 ? Number(image.height) : 1600
  const clamp01 = (value) => Math.min(Math.max(Number(value) || 0, 0), 1)
  const elements = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (line === '') continue
    /* Preferred `label|x1|y1|x2|y2`, fallback `label|x|y` (centre). */
    const pipe = line.split('|').map((part) => part.trim())
    if (pipe.length >= 5) {
      const x1 = Number(pipe[1]); const y1 = Number(pipe[2])
      const x2 = Number(pipe[3]); const y2 = Number(pipe[4])
      if ([x1, y1, x2, y2].every(Number.isFinite)) {
        const left = Math.min(x1, x2); const top = Math.min(y1, y2)
        const right = Math.max(x1, x2); const bottom = Math.max(y1, y2)
        elements.push({
          label: pipe[0].slice(0, 40),
          fx: clamp01(left / width),
          fy: clamp01(top / height),
          fw: clamp01((right - left) / width),
          fh: clamp01((bottom - top) / height),
        })
        continue
      }
    }
    if (pipe.length >= 3) {
      const x = Number(pipe[1]); const y = Number(pipe[2])
      if (Number.isFinite(x) && Number.isFinite(y)) {
        elements.push({
          label: pipe[0].slice(0, 40),
          fx: clamp01(x / width),
          fy: clamp01(y / height),
          fw: 0, fh: 0,
        })
        continue
      }
    }
    const comma = line.split(/[,，]/u).map((part) => part.trim())
    if (comma.length >= 5) {
      const x1 = Number(comma[1]); const y1 = Number(comma[2])
      const x2 = Number(comma[3]); const y2 = Number(comma[4])
      if ([x1, y1, x2, y2].every(Number.isFinite)) {
        const left = Math.min(x1, x2); const top = Math.min(y1, y2)
        const right = Math.max(x1, x2); const bottom = Math.max(y1, y2)
        elements.push({
          label: comma[0].slice(0, 40),
          fx: clamp01(left / width),
          fy: clamp01(top / height),
          fw: clamp01((right - left) / width),
          fh: clamp01((bottom - top) / height),
        })
      }
    } else if (comma.length >= 3) {
      const x = Number(comma[1]); const y = Number(comma[2])
      if (Number.isFinite(x) && Number.isFinite(y)) {
        elements.push({
          label: comma[0].slice(0, 40),
          fx: clamp01(x / width),
          fy: clamp01(y / height),
          fw: 0, fh: 0,
        })
      }
    }
  }
  /* Drop duplicates by (label, rounded box) and give centre-only hits a
     small default box so the mirror marker still draws a visible rectangle. */
  const seen = new Set()
  return elements.filter((entry) => {
    if (entry.fw <= 0 || entry.fh <= 0) {
      entry.fw = Math.min(0.18, Math.max(0.08, 180 / width))
      entry.fh = Math.min(0.08, Math.max(0.04, 96 / height))
      entry.fx = Math.min(Math.max(entry.fx - entry.fw / 2, 0), 1 - entry.fw)
      entry.fy = Math.min(Math.max(entry.fy - entry.fh / 2, 0), 1 - entry.fh)
    }
    const key = `${entry.label}|${Math.round(entry.fx * 1000)}|${Math.round(entry.fy * 1000)}|${Math.round(entry.fw * 1000)}|${Math.round(entry.fh * 1000)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Append one line per vision round to `<dataDir>/agent-trace.jsonl`.
 *
 * The panel's execution log only lives in React state, so a run that stopped
 * last night leaves nothing to inspect — which is exactly the situation where
 * "why did it stop?" gets asked. This file answers it:每轮的动作、耗时、是否
 * 走了深思、以及失败原因（含 done_reason / token 数）。
 * Rotated at 512 KB, and every failure is swallowed: tracing must never break
 * a run.
 *
 * @param dataDir - plugin data directory (`~/.dsh/my-mobile`).
 * @param record - anything JSON-serialisable.
 */
function traceRound(dataDir, record) {
  try {
    const path = join(dataDir, 'agent-trace.jsonl')
    if (existsSync(path) && statSync(path).size > 512 * 1024) writeFileSync(path, '')
    appendFileSync(path, `${JSON.stringify({ at: new Date().toISOString(), ...record })}\n`)
  } catch {
    /* tracing is best-effort */
  }
}

/**
 * Ask the local planner model for an action plan.
 * When `llm.vision` is on and the device is reachable, the current screen is
 * attached to the request, so the first action can be grounded in what is
 * actually on screen instead of a guessed layout.
 * @param options - resolved plugin options (`options.llm`).
 * @param client - MobileControl client, used for the screenshot.
 * @param input - instruction text, device info and an optional `vision` flag.
 * @returns validated steps plus model metadata.
 */
async function planInstruction(options, client, input) {
  const llm = options.llm
  if (!llm.enabled) throw new Error('语义解析已在配置中停用（llm.enabled: false）。')
  const text = String(input.text ?? '').trim()
  if (text === '') throw new Error('指令为空。')
  const width = Number(input.device?.width) > 0 ? Number(input.device.width) : PLAN_FALLBACK_SCREEN.width
  const height = Number(input.device?.height) > 0 ? Number(input.device.height) : PLAN_FALLBACK_SCREEN.height
  const screen = { width, height }

  /* A failed screenshot must not fail the plan: fall back to text-only. */
  let shot = null
  let visionError = ''
  if (llm.vision && input.vision !== false) {
    try {
      shot = await captureForModel(options, client, input.serial)
    } catch (error) {
      visionError = error?.message ?? String(error)
    }
  }

  const context = [
    `屏幕尺寸：${width}x${height}（像素，左上角为 0,0）`,
    shot === null ? '' : `截图：${shot.width}x${shot.height}（就是你看到的这张图，比例与整屏一致）`,
    input.device?.model ? `设备：${input.device.model}` : '',
    input.serial ? `序列号：${input.serial}` : '',
    `用户指令：${text}`,
  ].filter((line) => line !== '').join('\n')

  const startedAt = Date.now()
  const reply = await chatJson(llm, {
    system: shot === null ? PLANNER_SYSTEM : `${PLANNER_SYSTEM}\n${PLANNER_VISION_ADDENDUM}`,
    user: context,
    images: shot === null ? [] : [shot.base64],
    numPredict: 900,
    label: '一句话规划需要完整输出动作列表。',
  })
  const parsed = reply.parsed
  const steps = normalizePlan(parsed, screen)
  return {
    steps,
    model: llm.model,
    ms: Date.now() - startedAt,
    screen,
    vision: shot !== null,
    image: shot === null ? null : { width: shot.width, height: shot.height, bytes: shot.bytes },
    visionError,
  }
}

/**
 * 「指令操作」模式：让模型把一句话翻译成 adb 动作意图，宿主映射成白名单命令。
 * 与 planInstruction 的区别是——这里不产出点击坐标，只产出 adb 命令。
 * @param options - resolved plugin options (`options.llm`)。
 * @param client - MobileControl client（用于解析 adb 路径/设备）。
 * @param input - `{ text, serial }`。
 * @returns `{ commands, dropped, model, ms }`；每条 command 含 `kind/say/argv/dangerous`。
 */
async function planAdbInstruction(options, client, input) {
  const llm = options.llm
  if (!llm.enabled) throw new Error('语义解析已在配置中停用（llm.enabled: false）。')
  const text = String(input.text ?? '').trim()
  if (text === '') throw new Error('指令为空。')
  const serial = String(input.serial ?? '').trim()

  const context = [
    serial !== '' ? `序列号：${serial}` : '（唯一设备，无需序列号）',
    `用户指令：${text}`,
  ].filter((line) => line !== '').join('\n')

  const startedAt = Date.now()
  const reply = await chatJson(llm, {
    system: ADB_AGENT_SYSTEM,
    user: context,
    images: [],
    numPredict: 900,
    label: '指令操作需要输出 adb 动作意图列表。',
  })
  const { commands, dropped } = normalizeAdbPlan(reply.parsed, serial)
  return {
    commands,
    dropped,
    model: llm.model,
    ms: Date.now() - startedAt,
  }
}

/**
 * Ask the model for exactly one next action, given the live screen.
 * The panel calls this in a loop: each round is one screenshot plus one
 * action, so multi-page flows (search, sub-menus, lists) stay grounded.
 * @param options - resolved plugin options.
 * @param client - MobileControl client.
 * @param input - `{ text, done: [{kind, say}], device, serial }`.
 * @returns `{ done, pause, step, say, ms, screen, image }`.
 */
async function agentStep(options, client, input) {
  const llm = options.llm
  if (!llm.enabled) throw new Error('语义解析已在配置中停用（llm.enabled: false）。')
  if (!llm.vision) throw new Error('看屏操作已在配置中停用（llm.vision: false）。')
  const text = String(input.text ?? '').trim()
  if (text === '') throw new Error('指令为空。')
  const width = Number(input.device?.width) > 0 ? Number(input.device.width) : PLAN_FALLBACK_SCREEN.width
  const height = Number(input.device?.height) > 0 ? Number(input.device.height) : PLAN_FALLBACK_SCREEN.height
  const screen = { width, height }

  /* The run length is no longer capped, so the prompt keeps only a recent
     window of the history — a 40-step run would otherwise resend 40 lines
     and, worse, let early steps crowd out the current screen. */
  const all = Array.isArray(input.done) ? input.done : []
  const done = all.slice(-20)
  const failed = done.some((entry) => entry?.ok === false)
  const skipped = all.length - done.length
  const history = done.length === 0
    ? '（还没有执行任何动作，这是第一步）'
    : (skipped > 0 ? `（共 ${all.length} 个动作，以下是最近 ${done.length} 个）\n` : '') + done.map((entry, index) => {
      const say = String(entry?.say ?? entry?.kind ?? '').slice(0, 60)
      return entry?.ok === false
        ? `${index + 1}. ${say} —— 执行失败：${String(entry?.error ?? '').slice(0, 90)}`
        : `${index + 1}. ${say}`
    }).join('\n')

  const shot = await captureForModel(options, client, input.serial)
  /* Telling the model "nothing changed" is what breaks tap/back loops: a
     no-op action looks identical to a successful one in a single frame. */
  const unchanged = typeof input.lastHash === 'string' && input.lastHash !== '' && input.lastHash === shot.hash
  const lastAction = String(input.lastAction ?? '').trim().slice(0, 100)

  /* Dual-model mode: a dedicated UI model scans the screen first, so the
     planner picks a target by element number instead of guessing coordinates.
     Falls back to the single-model path when the scan returns nothing. */
  const uiModel = typeof input.uiModel === 'string' && input.uiModel.trim() !== '' ? input.uiModel.trim() : ''
  let uiElements = []
  if (uiModel !== '') {
    try {
      uiElements = await scanUiElements(llm, uiModel, { base64: shot.base64, width: shot.width, height: shot.height })
    } catch {
      uiElements = []
    }
  }
  const dual = uiModel !== '' && uiElements.length > 0
  const uiList = uiElements
    .map((entry, index) => `${index + 1}. ${entry.label}（中心 fx=${(entry.fx + entry.fw / 2).toFixed(3)}, fy=${(entry.fy + entry.fh / 2).toFixed(3)}）`)
    .join('\n')

  const context = [
    `屏幕尺寸：${width}x${height}（像素，左上角为 0,0）`,
    `截图：${shot.width}x${shot.height}（就是当前屏幕，坐标按这张图量）`,
    input.device?.model ? `设备：${input.device.model}` : '',
    `用户目标：${text}`,
    `已执行动作：\n${history}`,
    dual ? `可点击元素清单（${uiElements.length} 个）：\n${uiList}` : '',
    failed ? '带「执行失败」的动作没有生效：不要原样重试，换一种做法（滚动找入口、换按键、或换个页面路径）。' : '',
    lastAction === '' ? '' : `上一步动作：${lastAction}`,
    unchanged
      ? '上一轮画面完全相同：上一步很可能没有生效（或已经到顶/到底）。不要重复同一个动作，改成换方向滚动、换入口，或判定目标已达成。'
      : '',
    '现在请给出下一个动作（或 done）。',
  ].filter((line) => line !== '').join('\n')

  const startedAt = Date.now()
  let reply
  try {
    reply = await chatJson(llm, {
      system: dual ? AGENT_SYSTEM_DUAL : AGENT_SYSTEM,
      user: context,
      images: [shot.base64],
      numPredict: 1200,
      think: input.think === true,
      label: '看屏每轮只输出一个动作，正文通常只有几十个 token。',
    })
  } catch (error) {
    traceRound(options.dataDir, {
      round: done.length + 1,
      ok: false,
      think: input.think === true,
      error: error?.message ?? String(error),
    })
    throw error
  }
  traceRound(options.dataDir, {
    round: done.length + 1,
    ok: true,
    think: input.think === true,
    mode: reply.mode,
    ms: Date.now() - startedAt,
    unchanged,
    done: reply.parsed?.done === true,
    pause: reply.parsed?.pause === true,
    action: reply.parsed?.kind ?? (reply.parsed?.pause === true ? 'pause' : 'done'),
    say: String(reply.parsed?.say ?? '').slice(0, 80),
  })
  const parsed = reply.parsed
  const image = { width: shot.width, height: shot.height, bytes: shot.bytes }
  /* The model declaring "I cannot tell what comes next" is the stop
     condition: guessing a coordinate is how a run goes wrong quietly. */
  if (parsed.pause === true || parsed.ask === true || String(parsed.kind ?? '').trim() === 'pause') {
    return {
      pause: true,
      done: false,
      step: null,
      say: String(parsed.say ?? parsed.reason ?? '').trim().slice(0, 240),
      ms: Date.now() - startedAt,
      screen,
      image,
      elements: uiElements,
      hash: shot.hash,
      unchanged,
      mode: reply.mode,
    }
  }
  if (parsed.done === true || String(parsed.kind ?? '').trim() === 'done') {
    return {
      done: true,
      step: null,
      say: String(parsed.say ?? parsed.reason ?? '').trim().slice(0, 200),
      ms: Date.now() - startedAt,
      screen,
      image,
      elements: uiElements,
      hash: shot.hash,
      unchanged,
      mode: reply.mode,
    }
  }
  /* Dual-model: the planner references a numbered element instead of raw
     coordinates. Resolve it to a precise tap/longPress here, so the action
     that reaches the device carries the UI model's exact pixel. */
  const normalized = { ...parsed }
  if (dual) {
    const elementIndex = Number(parsed.element)
    if (Number.isFinite(elementIndex) && elementIndex >= 1 && elementIndex <= uiElements.length) {
      const hit = uiElements[elementIndex - 1]
      /* The UI model reports the box top-left + size; tap the box centre. */
      normalized.fx = hit.fx + hit.fw / 2
      normalized.fy = hit.fy + hit.fh / 2
      if (!normalized.say) normalized.say = `点击 ${hit.label || `元素${elementIndex}`}`
    }
  }
  const step = normalizePlanStep(normalized, screen)
  if (step === null) {
    throw new Error(`模型给出的动作不在允许范围内：${JSON.stringify(parsed).slice(0, 160)}`)
  }
  return {
    done: false,
    step,
    say: step.say,
    ms: Date.now() - startedAt,
    screen,
    image,
    elements: uiElements,
    hash: shot.hash,
    unchanged,
    mode: reply.mode,
  }
}

/** Cached `/api/show` capabilities, so the panel's status poll stays cheap. */
const capabilityCache = new Map()

/**
 * Ask Ollama which modalities a model supports (`vision`, `tools`, ...).
 * @param llm - resolved `options.llm`.
 * @param timeoutMs - request budget.
 * @returns capability names, or an empty list when the probe fails.
 */
async function modelCapabilities(llm, timeoutMs = 4000) {
  const key = `${llm.baseUrl}|${llm.model}`
  const cached = capabilityCache.get(key)
  if (cached !== undefined && Date.now() - cached.at < 300_000) return cached.list
  try {
    const payload = await fetchJsonWithTimeout(`${llm.baseUrl}/api/show`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: llm.model }),
    }, timeoutMs)
    const list = Array.isArray(payload?.capabilities)
      ? payload.capabilities.map((entry) => String(entry)).filter((entry) => entry !== '')
      : []
    capabilityCache.set(key, { at: Date.now(), list })
    return list
  } catch (_) {
    return []
  }
}

/**
 * Check whether the configured planner model is installed in Ollama.
 * @param options - resolved plugin options.
 * @returns `{ reachable, hasModel, models, vision }`.
 */
async function checkPlanner(options, timeoutMs = 4000) {
  const llm = options.llm
  if (!llm.enabled) return { enabled: false, reachable: false, hasModel: false, models: [], vision: false }
  try {
    const payload = await fetchJsonWithTimeout(`${llm.baseUrl}/api/tags`, {
      headers: { accept: 'application/json' },
    }, timeoutMs)
    const models = Array.isArray(payload?.models)
      ? payload.models.map((entry) => String(entry?.name ?? '')).filter((name) => name !== '')
      : []
    const wanted = llm.model
    const base = wanted.includes(':') ? wanted : `${wanted}:`
    const hasModel = models.some((name) => name === wanted || name === `${wanted}:latest` || name.startsWith(base))
    const vision = hasModel ? (await modelCapabilities(llm, timeoutMs)).includes('vision') : false
    return { enabled: true, reachable: true, hasModel, models, vision }
  } catch (_) {
    return { enabled: true, reachable: false, hasModel: false, models: [], vision: false }
  }
}

/**
 * Resolve the adb executable: explicit config, `ADB_PATH`, the bundled
 * platform-tools beside `~/bin/mobilecontrol`, then `PATH`.
 * @param configured - value from `config.adbPath`.
 */
function resolveAdbPath(configured) {
  if (configured !== '' && existsSync(configured)) return configured
  const fromEnv = process.env.ADB_PATH
  if (typeof fromEnv === 'string' && fromEnv !== '' && existsSync(fromEnv)) return fromEnv
  const found = ADB_CANDIDATES.find((path) => existsSync(path))
  return found ?? 'adb'
}

/**
 * Run one adb command and capture its output.
 * @param adb - adb executable path.
 * @param args - argument vector (without the `adb` itself).
 * @param timeoutMs - hard kill budget.
 * @returns stdout when the command exits zero.
 */
function runAdb(adb, args, timeoutMs = 60_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(adb, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.stdout.on('data', (chunk) => { stdout += String(chunk) })
    child.stderr.on('data', (chunk) => { stderr += String(chunk) })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(new Error(`adb 无法执行（${adb}）：${error.message}`))
    })
    child.on('exit', (code, signal) => {
      clearTimeout(timer)
      if (signal === 'SIGKILL') reject(new Error(`adb 命令超时：${args.join(' ')}`))
      else if (code === 0) resolve(stdout)
      else reject(new Error((stderr.trim() !== '' ? stderr : stdout || `adb 退出码 ${code}`).trim()))
    })
  })
}

/**
 * Turn a user-supplied filename into a safe remote basename.
 * @param name - raw filename from the browser.
 */
function sanitizeFileName(name) {
  const base = String(name ?? '').split(/[/\\]/u).pop() ?? ''
  const cleaned = base.replace(/[\u0000-\u001f]/gu, '').trim()
  return cleaned === '' ? `upload-${Date.now()}` : cleaned.slice(0, 180)
}

/**
 * Register the panel routes on the Connection service and wire the recorder.
 * @param ctx - owning cordis context providing `ctx.connection`.
 * @param client - MobileControl server client.
 * @param options - resolved plugin options.
 * @returns the registered route paths.
 */
function registerPanelRoutes(ctx, client, options) {
  const adb = resolveAdbPath(options.adbPath)
  const capturesDir = options.screenshotDir
  const recordingsDir = join(capturesDir, 'Recordings')
  const uploadTmpDir = join(options.dataDir, 'uploads')

  /** One in-flight screen recording, or null. */
  let recording = null
  /** Finished recordings, newest last, capped in memory. */
  const recordingLog = []

  /**
   * Latest task-state snapshot the panel handed over, so a re-entered panel can
   * restore the previous run's progress. Kept in host memory only: it survives
   * a panel reload, but not a host restart. `null` means "nothing to restore".
   * Only *settled* states (paused / needs-you / done / failed) are stored — a
   * run that was still executing when the panel went away is left as a
   * resumable checkpoint, never auto-resumed.
   */
  let panelTaskState = null

  /**
   * Resolve which device a panel request targets.
   * @param body - request body that may carry `serial`.
   * @returns the selected device serial.
   */
  async function pickSerial(body) {
    const wanted = typeof body.serial === 'string' && body.serial.trim() !== '' ? body.serial.trim() : ''
    if (wanted !== '') return wanted
    const status = await client.status()
    if (typeof status.selected === 'string' && status.selected !== '') return status.selected
    throw new Error('没有已连接的设备：请用 USB 线连接手机并开启 USB 调试。')
  }

  /**
   * Capture one PNG to disk and return its metadata.
   * @param serial - device serial or ''.
   */
  async function captureScreenshot(serial) {
    const bytes = await client.screenshot(serial === '' ? undefined : serial)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const suffix = serial === '' ? '' : `-${String(serial).replace(/[^\w.-]/gu, '_')}`
    await mkdir(capturesDir, { recursive: true })
    const path = join(capturesDir, `mobile-${stamp}${suffix}.png`)
    await writeFile(path, bytes)
    return { path, bytes: bytes.length, at: Date.now() }
  }

  /**
   * Finish a recording: close the mirror socket, flush ffmpeg and report the
   * file. Recording re-encodes the MobileControl mirror stream
   * (`ws://…/ws/video/{serial}`, JPEG frames) with ffmpeg, so it also works on
   * devices whose adb lacks the `screenrecord` binary.
   * @param entry - active recording entry.
   */
  async function finishRecording(entry) {
    if (entry.finishing) return
    entry.finishing = true
    clearTimeout(entry.timer)
    try {
      entry.ws.close()
    } catch {
      /* already closed */
    }
    const outcome = await new Promise((resolve) => {
      const bail = setTimeout(() => resolve('timeout'), 15_000)
      entry.ffmpeg.once('exit', () => {
        clearTimeout(bail)
        resolve('exit')
      })
      entry.ffmpeg.once('error', () => {
        clearTimeout(bail)
        resolve('error')
      })
      try {
        entry.ffmpeg.stdin.end()
      } catch {
        /* stdin already closed */
      }
    })
    let result
    if (outcome === 'timeout') {
      entry.ffmpeg.kill('SIGKILL')
      result = { ok: false, path: entry.local, bytes: 0, at: Date.now(), error: '录制收尾超时，文件可能不完整。' }
    } else {
      try {
        const info = await stat(entry.local)
        result = { ok: true, path: entry.local, bytes: info.size, at: Date.now(), error: '' }
      } catch (error) {
        result = {
          ok: false,
          path: entry.local,
          bytes: 0,
          at: Date.now(),
          error: `录制失败：${entry.errTail.trim() !== '' ? entry.errTail.trim() : error.message}`,
        }
      }
    }
    entry.done = result
    recordingLog.push(result)
    if (recordingLog.length > 20) recordingLog.shift()
    if (recording === entry) recording = null
  }

  /** Stop the active recording early (used by the route and by unloading). */
  function stopRecording() {
    if (recording === null || recording.finishing) return
    void finishRecording(recording)
  }

  /**
   * Record the MobileControl mirror stream for a while and encode it to MP4.
   * @param body - `{ seconds, serial? }`.
   */
  async function startRecording(body) {
    if (recording !== null) throw new Error('已经在录制中，请先停止。')
    if (typeof globalThis.WebSocket !== 'function') {
      throw new Error('当前运行时没有 WebSocket 支持，无法录制镜像画面。')
    }
    const serial = await pickSerial(body)
    const seconds = Math.min(RECORD_MAX_SECONDS, Math.max(3, Math.round(Number(body.seconds) || 15)))
    await mkdir(recordingsDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const local = join(recordingsDir, `mobile-${stamp}.mp4`)
    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', '20', '-i', '-',
      '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-y', local,
    ], { stdio: ['pipe', 'ignore', 'pipe'] })
    const entry = {
      id: stamp, serial, local, seconds,
      startedAt: Date.now(), ws: null, ffmpeg,
      timer: null, finishing: false, done: null, errTail: '',
    }
    ffmpeg.stderr.on('data', (chunk) => {
      entry.errTail = `${entry.errTail}${String(chunk)}`.slice(-800)
    })
    recording = entry
    const ws = new WebSocket(`ws://127.0.0.1:${client.options.port}/ws/video/${encodeURIComponent(serial)}`)
    ws.binaryType = 'arraybuffer'
    ws.onmessage = (event) => {
      if (typeof event.data === 'string' || entry.finishing) return
      try {
        entry.ffmpeg.stdin.write(Buffer.from(event.data))
      } catch {
        /* ffmpeg already exited; finishRecording reports the failure */
      }
    }
    ws.onclose = () => {
      if (!entry.finishing) void finishRecording(entry)
    }
    entry.ws = ws
    entry.timer = setTimeout(() => {
      void finishRecording(entry)
    }, seconds * 1000 + 1_500)
    return { id: stamp, seconds, serial }
  }

  /**
   * Upload one file from the panel to the phone via `adb push`.
   * @param body - `{ name, data (base64), destination? }`.
   */
  async function pushToDevice(body) {
    const name = sanitizeFileName(body.name)
    const data = typeof body.data === 'string' && body.data !== '' ? body.data : ''
    if (data === '') throw new Error('没有收到文件内容。')
    const buffer = Buffer.from(data, 'base64')
    if (buffer.length === 0) throw new Error('文件内容为空。')
    if (buffer.length > PUSH_MAX_BYTES) throw new Error('文件超过 64 MB，请先压缩或换小一点的文件。')
    const destinations = {
      download: '/sdcard/Download',
      pictures: '/sdcard/Pictures',
      movies: '/sdcard/Movies',
      documents: '/sdcard/Documents',
    }
    const destination = destinations[body.destination] ?? destinations.download
    const remote = `${destination}/${name}`
    const serial = await pickSerial(body)
    const stamp = randomUUID()
    await mkdir(uploadTmpDir, { recursive: true })
    const tmp = join(uploadTmpDir, `${stamp}-${name}`)
    await writeFile(tmp, buffer)
    try {
      await runAdb(adb, ['-s', serial, 'push', tmp, remote], 600_000)
    } finally {
      await rm(tmp, { force: true }).catch(() => {})
    }
    return { remote, bytes: buffer.length, serial }
  }

  /**
   * List the most recent screenshots saved by tools or the panel.
   */
  async function recentCaptures() {
    try {
      const entries = await readdir(capturesDir, { withFileTypes: true })
      const rows = []
      for (const entry of entries) {
        if (!entry.isFile() || !/^mobile-.*\.png$/u.test(entry.name)) continue
        const full = join(capturesDir, entry.name)
        const info = await stat(full)
        rows.push({ path: full, name: entry.name, bytes: info.size, at: info.mtimeMs })
      }
      return rows.sort((a, b) => b.at - a.at).slice(0, 8)
    } catch {
      return []
    }
  }

  /* ------------------------------------------------------------------ */
  /* Recorded automation scripts: JSON action sequences the user records */
  /* by hand on the mirror, optionally seeded by a model draft, and can  */
  /* replay verbatim. Stored next to the plugin source so a reinstall    */
  /* (the export bundle) carries them along.                            */
  /* ------------------------------------------------------------------ */

  /** List every recorded script as a light summary (no step payloads). */
  async function listScripts() {
    try {
      await mkdir(SCRIPTS_DIR, { recursive: true })
      const entries = await readdir(SCRIPTS_DIR, { withFileTypes: true })
      const rows = []
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.json')) continue
        const full = join(SCRIPTS_DIR, entry.name)
        try {
          const doc = JSON.parse(await readFile(full, 'utf8'))
          const info = await stat(full)
          rows.push({
            name: entry.name.replace(/\.json$/u, ''),
            intent: String(doc.intent ?? '').slice(0, 120),
            steps: Array.isArray(doc.steps) ? doc.steps.length : 0,
            at: info.mtimeMs,
          })
        } catch {
          /* a broken script file is skipped, not fatal */
        }
      }
      return rows.sort((a, b) => b.at - a.at)
    } catch {
      return []
    }
  }

  /** Read one script back for editing / replay. */
  async function readScript(name) {
    const full = scriptFile(name)
    const raw = await readFile(full, 'utf8')
    return JSON.parse(raw)
  }

  /** Persist a script, validating every step against the action whitelist. */
  async function saveScript(name, doc) {
    const steps = Array.isArray(doc?.steps) ? doc.steps : []
    if (steps.length === 0) throw new Error('脚本没有任何动作，先录制或生成几步。')
    if (steps.length > SCRIPT_MAX_STEPS) throw new Error(`脚本最多 ${SCRIPT_MAX_STEPS} 步，当前 ${steps.length} 步。`)
    const normalized = steps.map(normalizeScriptStep).filter((entry) => entry !== null)
    const dropped = steps.length - normalized.length
    if (normalized.length === 0) throw new Error('脚本里没有可执行的动作（全部被白名单拒绝）。')
    await mkdir(SCRIPTS_DIR, { recursive: true })
    const full = scriptFile(name)
    const doc2 = {
      intent: String(doc?.intent ?? '').trim().slice(0, 500),
      savedAt: Date.now(),
      steps: normalized,
    }
    await writeFile(full, JSON.stringify(doc2, null, 2) + '\n', 'utf8')
    return { name: name.replace(/\.json$/u, ''), steps: normalized.length, dropped }
  }

  /** Remove one recorded script. */
  async function deleteScript(name) {
    const full = scriptFile(name)
    await rm(full, { force: true })
    return { name: name.replace(/\.json$/u, '') }
  }

  const routes = [
    {
      path: `${PANEL_PREFIX}/health`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => jsonResponse({
        ok: true,
        url: client.baseUrl,
        binary: options.binaryPath !== '',
        adb,
        port: options.port,
      }),
    },
    {
      path: `${PANEL_PREFIX}/status`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          return jsonResponse({ ok: true, status: await client.status(request.signal) })
        } catch (error) {
          return failure(error?.message ?? String(error), 502)
        }
      },
    },
    {
      path: `${PANEL_PREFIX}/select`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request)
          await client.postJson('/api/select', { serial: String(body.serial ?? '') })
          return jsonResponse({ ok: true })
        } catch (error) {
          return failure(error?.message ?? String(error), 502)
        }
      },
    },
    {
      path: `${PANEL_PREFIX}/quality`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request)
          await client.postJson('/api/quality', { quality: String(body.quality ?? '') })
          return jsonResponse({ ok: true })
        } catch (error) {
          return failure(error?.message ?? String(error), 502)
        }
      },
    },
    {
      path: `${PANEL_PREFIX}/action`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request)
          const payload = await client.action(body)
          return jsonResponse({ ok: true, payload })
        } catch (error) {
          return failure(error?.message ?? String(error), 502)
        }
      },
    },
    {
      path: `${PANEL_PREFIX}/restart`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async () => {
        try {
          await client.postJson('/api/restart', {})
          return jsonResponse({ ok: true })
        } catch (error) {
          return failure(error?.message ?? String(error), 502)
        }
      },
    },
    {
      path: `${PANEL_PREFIX}/screen`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const serial = new URL(request.url).searchParams.get('serial') ?? ''
          await client.ensure(request.signal)
          const query = serial === '' ? '' : `?serial=${encodeURIComponent(serial)}`
          const response = await fetch(`${client.baseUrl}/api/screenshot${query}`, { signal: client.budget(request.signal) })
          if (!response.ok) throw new Error(`截图失败（HTTP ${response.status}）`)
          const bytes = Buffer.from(await response.arrayBuffer())
          if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50) throw new Error('返回的不是 PNG 图片')
          return new Response(bytes, {
            status: 200,
            headers: { 'content-type': 'image/png', 'cache-control': 'no-store' },
          })
        } catch (error) {
          return failure(error?.message ?? String(error), 502)
        }
      },
    },
    {
      path: `${PANEL_PREFIX}/screenshot`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request)
          const serial = typeof body.serial === 'string' ? body.serial : ''
          const saved = await captureScreenshot(serial)
          return jsonResponse({ ok: true, capture: saved })
        } catch (error) {
          return failure(error?.message ?? String(error), 502)
        }
      },
    },
    {
      path: `${PANEL_PREFIX}/captures`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => jsonResponse({ ok: true, captures: await recentCaptures() }),
    },
    {
      path: `${PANEL_PREFIX}/record/start`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request)
          const started = await startRecording(body)
          return jsonResponse({ ok: true, ...started })
        } catch (error) {
          return failure(error?.message ?? String(error), 409)
        }
      },
    },
    {
      path: `${PANEL_PREFIX}/record/state`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => jsonResponse({
        ok: true,
        recording: recording === null ? null : {
          id: recording.id,
          serial: recording.serial,
          startedAt: recording.startedAt,
          seconds: recording.seconds,
        },
        last: recordingLog.length > 0 ? recordingLog[recordingLog.length - 1] : null,
      }),
    },
    {
      path: `${PANEL_PREFIX}/record/stop`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async () => {
        try {
          if (recording === null) throw new Error('当前没有正在进行的录制。')
          const entry = recording
          stopRecording()
          await finishRecording(entry)
          if (entry.done.ok !== true) throw new Error(entry.done.error)
          return jsonResponse({ ok: true, capture: entry.done })
        } catch (error) {
          return failure(error?.message ?? String(error), 409)
        }
      },
    },
    {
      path: `${PANEL_PREFIX}/push`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request, Math.ceil(PUSH_MAX_BYTES * 1.4) + 16_384)
          const pushed = await pushToDevice(body)
          return jsonResponse({ ok: true, pushed })
        } catch (error) {
          return failure(error?.message ?? String(error), 400)
        }
      },
    },
    {
      path: `${PANEL_PREFIX}/plan/status`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => {
        const state = await checkPlanner(options)
        return jsonResponse({
          ok: true,
          ...state,
          model: options.llm.model,
          baseUrl: options.llm.baseUrl,
          visionEnabled: options.llm.vision,
          imageWidth: options.llm.imageWidth,
          maxSteps: options.llm.maxAgentSteps,
          think: options.llm.think,
        })
      },
    },
    {
      path: `${PANEL_PREFIX}/plan`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request, 16 * 1024)
          const plan = await planInstruction(options, client, body)
          return jsonResponse({ ok: true, ...plan })
        } catch (error) {
          return failure(error?.message ?? String(error), 502)
        }
      },
    },
    {
      path: `${PANEL_PREFIX}/plan/adb`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request, 16 * 1024)
          const plan = await planAdbInstruction(options, client, body)
          return jsonResponse({ ok: true, ...plan })
        } catch (error) {
          return failure(error?.message ?? String(error), 502)
        }
      },
    },
    {
      /* 执行一条已解析的 adb 命令。危险命令（卸载/清数据/安装）要求调用方
         显式带 `confirmed: true`，否则拒绝——由面板在确认后才补上该标记。 */
      path: `${PANEL_PREFIX}/adb/run`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request, 16 * 1024)
          const argv = Array.isArray(body.argv) ? body.argv.map((entry) => String(entry)) : []
          if (argv.length === 0 || argv.some((entry) => /[\r\n]/u.test(entry))) {
            throw new Error('无效的 adb 命令。')
          }
          const dangerous = body.dangerous === true
          if (dangerous && body.confirmed !== true) {
            return jsonResponse({ ok: true, pending: true, dangerous: true, say: body.say ?? '' })
          }
          const stdout = await runAdb(adb, argv, options.requestTimeoutMs)
          return jsonResponse({ ok: true, pending: false, stdout: String(stdout).slice(0, 2000) })
        } catch (error) {
          return failure(error?.message ?? String(error), 502)
        }
      },
    },
    {
      path: `${PANEL_PREFIX}/agent/step`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request, 32 * 1024)
          const result = await agentStep(options, client, body)
          return jsonResponse({ ok: true, ...result })
        } catch (error) {
          return failure(error?.message ?? String(error), 502)
        }
      },
    },
    {
      /* The panel knows *why* a run stopped (step budget, repeated action,
         frozen screen); the host does not. Record it next to the rounds so the
         trace reads as a story instead of a list of taps. */
      path: `${PANEL_PREFIX}/trace`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request, 8 * 1024)
          traceRound(options.dataDir, { source: 'panel', ...body })
        } catch {
          /* a lost trace note must not surface as a panel error */
        }
        return jsonResponse({ ok: true })
      },
    },
    {
      /* The panel persists its task-state snapshot here so a re-entered panel
         can pick up where the last run left off. One route serves both verbs:
         GET returns the stored snapshot (or ok:false when there is none), POST
         overwrites it (or clears it when the panel reports an idle/cleared
         state). Memory-only by design. */
      path: `${PANEL_PREFIX}/task/state`,
      methods: ['GET', 'POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          if (request.method === 'GET') {
            return jsonResponse(panelTaskState === null
              ? { ok: true, task: null }
              : { ok: true, task: panelTaskState })
          }
          const body = await readJsonBody(request, 256 * 1024)
          if (body == null || typeof body !== 'object' || body.clear === true) {
            panelTaskState = null
          } else {
            panelTaskState = {
              work: body.work ?? null,
              resume: body.resume ?? null,
              instruction: typeof body.instruction === 'string' ? body.instruction : '',
              inputKind: typeof body.inputKind === 'string' ? body.inputKind : 'op',
              parseMode: typeof body.parseMode === 'string' ? body.parseMode : 'rules',
              at: Date.now(),
            }
          }
          return jsonResponse({ ok: true })
        } catch (error) {
          return failure(error?.message ?? String(error), 502)
        }
      },
    },
    {
      /* List / save / delete recorded automation scripts. A single exact-Fetch
         route serves all three verbs — the host rejects duplicate paths, so the
         three operations share one registration and dispatch on the method. */
      path: `${PANEL_PREFIX}/scripts`,
      methods: ['GET', 'POST', 'DELETE'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          if (request.method === 'GET') {
            return jsonResponse({ ok: true, scripts: await listScripts() })
          }
          if (request.method === 'DELETE') {
            const name = new URL(request.url).searchParams.get('name') ?? ''
            const removed = await deleteScript(name)
            return jsonResponse({ ok: true, ...removed })
          }
          const body = await readJsonBody(request, 512 * 1024)
          const saved = await saveScript(body.name, body)
          return jsonResponse({ ok: true, ...saved })
        } catch (error) {
          return failure(error?.message ?? String(error), 400)
        }
      },
    },
    {
      /* Draft a script skeleton from an intent (reuses the text planner, which
         returns whitelisted PLAN_KINDS steps the panel can already execute). */
      path: `${PANEL_PREFIX}/script/draft`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request, 16 * 1024)
          const plan = await planInstruction(options, client, body)
          return jsonResponse({ ok: true, steps: plan.steps, model: plan.model, ms: plan.ms })
        } catch (error) {
          return failure(error?.message ?? String(error), 502)
        }
      },
    },
    {
      /* Fetch one script's full step payload for replay / editing. */
      path: `${PANEL_PREFIX}/script`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const name = new URL(request.url).searchParams.get('name') ?? ''
          const doc = await readScript(name)
          return jsonResponse({ ok: true, script: doc })
        } catch (error) {
          return failure(error?.message ?? String(error), 404)
        }
      },
    },
  ]

  for (const route of routes) {
    ctx.connection.fetch.register(route)
  }
  return { paths: routes.map((route) => route.path), stopRecording }
}

/**
 * Pure planner helpers, exported so `test/plan-smoke.mjs` can exercise the
 * validation rules without a model or a device.
 */
export const __planner = {
  resolveConfig,
  agentStep,
  normalizePlan,
  normalizePlanStep,
  parsePlanJson,
  planPixel,
  planPackage,
  toModelJpeg,
  pngSize,
  chatJson,
  chatModelRaw,
  scanUiElements,
  AGENT_SYSTEM,
  AGENT_SYSTEM_DUAL,
  PLANNER_VISION_ADDENDUM,
  PLAN_KINDS,
  PLAN_KEYS,
  PLAN_QUALITIES,
  PLAN_MAX_STEPS,
  adbIntentToCommand,
  normalizeAdbPlan,
  planAdbInstruction,
  ADB_KINDS,
  ADB_DANGEROUS,
  normalizeScriptStep,
  scriptFile,
  SCRIPTS_DIR,
  SCRIPT_MAX_STEPS,
}

/**
 * Mount the MyMobile bundle.
 * @param ctx - owning cordis context.
 * @param rawConfig - row config from `cordis.patch.yml` (all fields optional).
 */
export function apply(ctx, rawConfig) {
  const options = resolveConfig(rawConfig)
  const client = new MobileControlClient(options, ctx.logger)
  const tools = registerTools(ctx, client)
  const panel = registerPanelRoutes(ctx, client, options)
  ctx.logger?.info?.(`my-mobile: ${tools.length} mobile_* tools, ${panel.paths.length} panel routes, binary=${options.binaryPath || '<not found>'}, url=${client.baseUrl}, planner=${options.llm.enabled ? options.llm.model : 'off'}`)
  void writeMarker(options, client, tools, ctx.logger, panel.paths)
  ctx.effect(() => () => {
    panel.stopRecording()
    client.dispose()
  }, 'my-mobile: stop the MobileControl server started by this plugin')
}
