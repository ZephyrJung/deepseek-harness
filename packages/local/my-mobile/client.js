window.__ModuleLoader__.load({
  id: '@local/dsh-my-mobile',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
    const React = require('react');
    const h = React.createElement;

    const PACKAGE = '@local/dsh-my-mobile';
    const NS = 'my-mobile';
    const API = '/api/my-mobile';

    const META = {
      zh: {
        title: 'MyMobile 手机控制',
        description: '通过本机 MobileControl 服务镜像并控制 USB 连接的安卓手机：面板里输入要求执行动作、实时画面触控、截图录屏，并把电脑上的文件推送到手机；模型侧另有 12 个 mobile_* 工具。',
      },
      en: {
        title: 'MyMobile Phone Control',
        description: 'Mirror and control a USB-connected Android phone through the local MobileControl server: run actions from plain instructions in the panel, touch the live screen, capture screenshots and recordings, and push files onto the phone; the model side exposes 12 mobile_* tools.',
      },
    };

    const zh = {
      'panel.kicker': 'MyMobile · 手机控制',
      'panel.title': '手机控制台',
      'panel.subtitle': '通过本机 MobileControl 服务镜像并控制 USB 连接的安卓手机：输入要求执行动作、截图录屏、把电脑上的文件推送到手机。',
      'pill.local': '本机处理',
      'pill.device': '设备 {serial}',
      'status.checking': '正在连接本机 MobileControl…',
      'status.ready': 'MobileControl 已就绪',
      'status.missingBinary': '未找到 ~/bin/mobilecontrol',
      'status.offline': '本机服务未连接',
      'status.noDevice': '未发现设备',
      'device.label': '设备',
      'device.empty': '未发现设备',
      'device.meta': '{manufacturer} {model} · Android {android} · {width}×{height} · 电量 {battery}%',
      'device.refresh': '刷新',
      'device.wake': '唤醒屏幕',
      'device.restart': '重连服务',
      'quality.label': '画质',
      'quality.smooth': '流畅',
      'quality.standard': '标准',
      'quality.high': '高清',
      'quality.native': '原画',
      'screen.live': '实时画面',
      'screen.liveOff': '已暂停',
      'screen.connecting': '正在连接画面…',
      'screen.waiting': '等待设备',
      'screen.waitingHint': '用 USB 线连接手机并开启「USB 调试」，连好后点下方「激活」',
      'screen.activate': '激活',
      'screen.activating': '激活中…',
      'screen.activateHint': '设备已连接但画面未启动，点此激活镜像',
      'screen.noDeviceYet': '仍未检测到设备：请确认 USB 已连好、手机已开启「USB 调试」并在弹窗里点「允许」，再点一次激活。',
      'screen.error': '画面不可用',
      'screen.fps': '{fps} fps',
      'screen.polling': '截图轮询',
      'screen.hint.tap': '点击 = 轻触',
      'screen.hint.drag': '拖拽 = 滑动',
      'screen.hint.hold': '按住 = 长按',
      'screen.hint.snapshot': '画面为截图轮询，动作后自动刷新',
      'marks.hide': '隐藏标记',
      'marks.show': '显示标记',
      'marks.toggleHint': '显示/隐藏模型识别出的元素线框',
      'marks.norm': '归一化坐标',
      'marks.px': '像素坐标',
      'instruction.label': '指令输入',
      'input.kind.hint': '选择输入框的用途',
      'input.kind.op': '手机操作',
      'input.kind.text': '文字输入',
      'input.kind.op.hint': '把这句话解析成动作并执行（打开微信、上滑、截图…）',
      'input.kind.text.hint': '把这句话原样输入到手机当前聚焦的输入框里（先点一下手机上的输入框）',
      'instruction.placeholder': '用一句话描述要做的动作，可分多步。例如：打开微信，然后上滑，再返回',
      'instruction.placeholderText': '要输入到手机的文本…',
      'instruction.run': '执行',
      'instruction.continue': '继续',
      'instruction.running': '执行中…',
      'instruction.placeholderResume': '补充一句（例如「删计算器」），或留空直接继续',
      'instruction.hint': '支持：打开 App、返回/主页/多任务、上下左右滑动、点击 x,y、输入文字、截图、录屏 N 秒、音量、清晰度。复杂任务可直接在对话里让助手用 mobile_* 工具完成。',
      'instruction.unknown': '无法理解这一步：「{step}」。试试「打开微信」「上滑」「输入 你好」「截图」等写法。',
      'instruction.logTitle': '执行记录',
      'instruction.logEmpty': '还没有执行过指令。',
      'instruction.ok': '完成',
      'instruction.fail': '失败',
      'keys.label': '系统按键',
      'keys.back': '返回',
      'keys.home': '主页',
      'keys.recents': '多任务',
      'keys.power': '电源',
      'keys.volumeUp': '音量+',
      'keys.volumeDown': '音量−',
      'keys.notification': '通知栏',
      'keys.menu': '菜单',
      'script.title': '脚本录制',
      'script.start': '开始录制',
      'script.recording': '录制中…',
      'script.recHint': '在镜像上点/滑/长按，会自动记成步骤',
      'script.stopHint': '点此停止录制',
      'script.intentPlaceholder': '意图：例如「打开微信给张三发条消息」',
      'script.draft': '按意图生成骨架',
      'script.drafting': '生成中…',
      'script.drafted': '已生成骨架 · {model}',
      'script.draftFail': '生成骨架失败',
      'script.empty': '还没有步骤：先点「开始录制」在镜像上操作，或输入意图生成骨架。',
      'script.remove': '删',
      'script.removeStep': '删除这一步',
      'script.namePlaceholder': '脚本名（如 wechat-msg）',
      'script.save': '保存脚本',
      'script.saving': '保存中…',
      'script.clear': '清空',
      'script.library': '脚本库',
      'script.replay': '回放',
      'script.replaying': '回放中…',
      'script.delete': '删除',
      'script.saved': '已保存脚本 {name}',
      'script.saveFail': '保存脚本失败',
      'script.deleted': '已删除脚本 {name}',
      'script.deleteFail': '删除脚本失败',
      'script.listFail': '读取脚本库失败',
      'script.replayStart': '开始回放 {name}（{steps} 步）',
      'script.replayStep': '第 {index} 步 · {say}',
      'script.replayDone': '脚本 {name} 回放完成',
      'script.replayFailed': '有 {failed} 步执行失败',
      'script.replayFail': '回放失败',
      'text.label': '文字输入',
      'text.placeholder': '先点手机上的输入框，再在这里输入…',
      'text.send': '发送',
      'capture.label': '截图与录屏',
      'capture.shot': '保存截图',
      'capture.shotBusy': '正在截图…',
      'capture.record': '开始录制',
      'capture.stop': '停止录制',
      'capture.recording': '录制中 · 已录 {elapsed} 秒',
      'capture.seconds': '时长（秒，3–600）',
      'capture.recent': '最近文件',
      'capture.empty': '还没有截图或录像。',
      'capture.copy': '复制路径',
      'capture.copied': '已复制',
      'capture.kindShot': '截图',
      'capture.kindVideo': '录像',
      'upload.label': '上传到手机',
      'upload.pick': '选择文件',
      'upload.destination': '保存位置',
      'upload.dest.download': 'Download 目录',
      'upload.dest.pictures': 'Pictures 目录',
      'upload.dest.movies': 'Movies 目录',
      'upload.dest.documents': 'Documents 目录',
      'upload.push': '推送到手机',
      'upload.pushing': '推送中…',
      'upload.done': '已推送到 {remote}（{bytes}）',
      'upload.tooBig': '文件超过 64 MB，请先压缩。',
      'upload.noFile': '先选择要上传的文件。',
      'upload.needDevice': '需要先连接手机。',
      'error.service': '无法连接本机 MobileControl。请确认 my-mobile 插件已启用，然后重新加载页面。',
      'error.generic': '{message}',
      'info.deviceTitle': '设备与状态',
      'info.row.model': '型号',
      'info.row.serial': '序列号',
      'info.row.android': '系统',
      'info.row.resolution': '分辨率',
      'info.row.battery': '电量',
      'info.row.screen': '画面',
      'info.row.quality': '画质',
      'info.row.recording': '录屏',
      'info.screenVideo': '实时镜像',
      'info.screenPolling': '截图轮询',
      'info.screenIdle': '未连接',
      'info.recordingOn': '录制中 {elapsed}s',
      'info.recordingOff': '空闲',
      'plan.label': '语义解析',
      'plan.toggleHint': '开：由本机 Ollama 模型理解自然语言；关：只用内置规则',
      'plan.checking': '检查模型…',
      'plan.disabled': '语义解析已停用',
      'plan.offline': '本机 Ollama 未运行',
      'plan.missing': '模型未安装：{model}',
      'plan.offHint': '语义解析已关闭',
      'plan.thinking': '模型理解中…',
      'plan.usedModel': '模型解析 · {model}',
      'plan.usedLocal': '规则解析',
      'plan.noSteps': '模型没有给出可执行的动作。',
      'plan.looking': '看屏幕…',
      'plan.visionModel': '{model} · 视觉',
      'plan.noVision': '{model} 不支持视觉，将退回文字规划',
      'plan.visionFallback': '看屏失败，回退内置规则：{message}',
      'plan.adbModel': '{model} · 指令操作',
      'mode.hint': '选择指令的解析方式',
      'mode.rules': '规则',
      'mode.vision': '看屏',
      'mode.adb': '指令操作',
      'dual.on': '双模型 ✓',
      'dual.off': '双模型',
      'dual.hint': '双模型：先用 mai-ui 精确扫描屏幕上的可点元素，再让 qwen3.8 从元素里挑目标，减少点错。更慢但更准。',
      'mode.rules.hint': '面板内置规则匹配：立刻执行，只认固定句式（打开微信、上滑、截图…）。',
      'mode.vision.hint': '本地模型每一步都先看实时截图再决定动作，多级页面也能走对；每步约 4–8 秒。',
      'mode.adb.hint': '本地模型把指令解析成 adb 意图（打开应用/按键/输入/截图/安装卸载），经有线 adb 命令直接执行，不做屏幕模拟点击；卸载、清数据等有副作用的操作会先停下等你确认。',
      'adb.confirm': '确认执行',
      'adb.confirmHint': '这条命令有副作用，确认后执行；点「确认执行」继续',
      'adb.needConfirm': '待确认：{say}（有副作用，需你确认）',
      'agent.stepLog': '第 {index} 步 · {say}',
      'agent.finished': '已完成（{steps} 步）',
      'agent.stepFail': '第 {index} 步看屏失败',
      'agent.maxSteps': '已到你设置的 {steps} 步上限，先停在这里',
      'agent.askPause': '模型不确定下一步，等你确认',
      'agent.aborted': '已手动停止',
      'agent.resumed': '从第 {steps} 步接着执行',
      'agent.thinkTag': '深思一轮',
      /* 工作状态卡：设备信息在页面顶部已经有一份，右侧只讲当前在做什么 */
      'work.title': '工作状态',
      'work.idle': '待工作',
      'work.idleHint': '输入一句话开始，或直接在镜像上点按',
      'work.planning': '解析中',
      'work.planningHint': '本地模型正在读屏，准备下一步',
      'work.executing': '工作中',
      'work.executingHint': '正在执行动作',
      'work.done': '已完成',
      'work.doneHint': '任务已结束，可以直接下达下一条',
      'work.stopped': '已暂停',
      'work.ask': '待确认',
      'work.askHint': '看一眼当前画面，确认后点继续',
      'work.askHow': '在下面写一句回答（例如「删计算器」），按「继续」就接着原来的进度走',
      'work.abort': '停止',
      'work.abortHint': '本轮请求返回后停下；停下后可以继续',
      'work.failed': '出错了',
      'work.pausedHint': '可以从当前画面接着做',
      'work.someFailed': '有 {count} 步没成功',
      'work.steps': '第 {steps} 步',
      'work.limit': '上限 {total} 步',
      'work.elapsed': '已用 {seconds}s',
      'work.resume': '继续（已走 {steps} 步）',
      'work.resumeHint': '从当前画面接着做，不用重打指令',
      'work.reset': '重置',
      'work.resetHint': '清空当前任务状态与断点，回到待工作',
      'work.resetLog': '任务已重置，回到待工作',
      'history.title': '最近提示词',
      'history.empty': '还没有执行记录',
      'history.reuse': '点击回填到输入框',
      'history.clear': '清空',
      'device.card': '画面与设备',
      'agent.loopStop': '同一个动作重复了 4 次，先停下：{say}',
      'agent.stalled': '画面连续两轮没变化，先停下：{say}',
    };

    const en = {
      'panel.kicker': 'MyMobile · Phone control',
      'panel.title': 'Phone Console',
      'panel.subtitle': 'Mirror and control a USB-connected Android phone through the local MobileControl server: run actions from plain instructions, take screenshots and recordings, and push files onto the phone.',
      'pill.local': 'On-device',
      'pill.device': 'Device {serial}',
      'status.checking': 'Connecting to local MobileControl…',
      'status.ready': 'MobileControl is ready',
      'status.missingBinary': '~/bin/mobilecontrol not found',
      'status.offline': 'Local service not connected',
      'status.noDevice': 'No device',
      'device.label': 'Devices',
      'device.empty': 'No devices found',
      'device.meta': '{manufacturer} {model} · Android {android} · {width}×{height} · battery {battery}%',
      'device.refresh': 'Refresh',
      'device.wake': 'Wake screen',
      'device.restart': 'Reconnect',
      'quality.label': 'Quality',
      'quality.smooth': 'Smooth',
      'quality.standard': 'Standard',
      'quality.high': 'High',
      'quality.native': 'Native',
      'screen.live': 'Live view',
      'screen.liveOff': 'Paused',
      'screen.connecting': 'Connecting to the mirror…',
      'screen.waiting': 'Waiting for device',
      'screen.waitingHint': 'Connect the phone over USB and enable USB debugging, then tap "Activate" below',
      'screen.activate': 'Activate',
      'screen.activating': 'Activating…',
      'screen.activateHint': 'Device is connected but the mirror has not started; tap to activate',
      'screen.noDeviceYet': 'Still no device: check the USB cable, enable USB debugging, tap "Allow" on the phone, then activate again.',
      'screen.error': 'Mirror unavailable',
      'screen.fps': '{fps} fps',
      'screen.polling': 'Screenshot polling',
      'screen.hint.tap': 'Click = tap',
      'screen.hint.drag': 'Drag = swipe',
      'screen.hint.hold': 'Hold = long press',
      'screen.hint.snapshot': 'Mirror polls screenshots; it refreshes after each action',
      'marks.hide': 'Hide marks',
      'marks.show': 'Show marks',
      'marks.toggleHint': 'Show/hide the element boxes the model recognised',
      'marks.norm': 'Normalised',
      'marks.px': 'Pixels',
      'instruction.label': 'Instructions',
      'input.kind.hint': 'What this input box does',
      'input.kind.op': 'Actions',
      'input.kind.text': 'Type text',
      'input.kind.op.hint': 'Parse this sentence into actions and run them (open WeChat, swipe up, screenshot…)',
      'input.kind.text.hint': 'Type this text straight into the field focused on the phone (tap the field there first)',
      'instruction.placeholder': 'Describe the actions in one line or several, e.g.: open WeChat, swipe up, go back',
      'instruction.placeholderText': 'Text to type on the phone…',
      'instruction.run': 'Run',
      'instruction.continue': 'Continue',
      'instruction.running': 'Running…',
      'instruction.placeholderResume': 'Answer the question (e.g. “the calculator app”), or leave empty to just continue',
      'instruction.hint': 'Supported: open app, back/home/recents, swipes, tap x,y, type text, screenshot, record N s, volume, quality. For complex tasks, just ask the assistant in chat — it has the mobile_* tools.',
      'instruction.unknown': 'Cannot understand this step: "{step}". Try "open WeChat", "swipe up", "type hello", "screenshot" and so on.',
      'instruction.logTitle': 'Run log',
      'instruction.logEmpty': 'Nothing executed yet.',
      'instruction.ok': 'Done',
      'instruction.fail': 'Failed',
      'keys.label': 'System keys',
      'keys.back': 'Back',
      'keys.home': 'Home',
      'keys.recents': 'Recents',
      'keys.power': 'Power',
      'keys.volumeUp': 'Vol +',
      'keys.volumeDown': 'Vol −',
      'keys.notification': 'Shade',
      'keys.menu': 'Menu',
      'script.title': 'Script recorder',
      'script.start': 'Start recording',
      'script.recording': 'Recording…',
      'script.recHint': 'Tap / swipe / long-press on the mirror to record steps',
      'script.stopHint': 'Click to stop recording',
      'script.intentPlaceholder': 'Intent: e.g. "open WeChat and message Zhang San"',
      'script.draft': 'Draft from intent',
      'script.drafting': 'Drafting…',
      'script.drafted': 'Draft generated · {model}',
      'script.draftFail': 'Failed to draft skeleton',
      'script.empty': 'No steps yet: tap "Start recording" and act on the mirror, or enter an intent to draft a skeleton.',
      'script.remove': 'Del',
      'script.removeStep': 'Remove this step',
      'script.namePlaceholder': 'Script name (e.g. wechat-msg)',
      'script.save': 'Save script',
      'script.saving': 'Saving…',
      'script.clear': 'Clear',
      'script.library': 'Script library',
      'script.replay': 'Replay',
      'script.replaying': 'Replaying…',
      'script.delete': 'Delete',
      'script.saved': 'Saved script {name}',
      'script.saveFail': 'Failed to save script',
      'script.deleted': 'Deleted script {name}',
      'script.deleteFail': 'Failed to delete script',
      'script.listFail': 'Failed to list scripts',
      'script.replayStart': 'Replaying {name} ({steps} steps)',
      'script.replayStep': 'Step {index} · {say}',
      'script.replayDone': 'Script {name} replayed',
      'script.replayFailed': '{failed} step(s) failed',
      'script.replayFail': 'Replay failed',
      'text.label': 'Text input',
      'text.placeholder': 'Focus an input on the phone first, then type here…',
      'text.send': 'Send',
      'capture.label': 'Screenshots & recordings',
      'capture.shot': 'Save screenshot',
      'capture.shotBusy': 'Capturing…',
      'capture.record': 'Start recording',
      'capture.stop': 'Stop recording',
      'capture.recording': 'Recording · {elapsed} s',
      'capture.seconds': 'Duration (s, 3–180)',
      'capture.recent': 'Recent files',
      'capture.empty': 'No screenshots or recordings yet.',
      'capture.copy': 'Copy path',
      'capture.copied': 'Copied',
      'capture.kindShot': 'PNG',
      'capture.kindVideo': 'MP4',
      'upload.label': 'Upload to phone',
      'upload.pick': 'Choose file',
      'upload.destination': 'Destination',
      'upload.dest.download': 'Download',
      'upload.dest.pictures': 'Pictures',
      'upload.dest.movies': 'Movies',
      'upload.dest.documents': 'Documents',
      'upload.push': 'Push to phone',
      'upload.pushing': 'Pushing…',
      'upload.done': 'Pushed to {remote} ({bytes})',
      'upload.tooBig': 'File exceeds 64 MB — compress it first.',
      'upload.noFile': 'Pick a file first.',
      'upload.needDevice': 'Connect a phone first.',
      'error.service': 'Cannot reach the local MobileControl. Make sure the my-mobile plugin is enabled and reload the page.',
      'error.generic': '{message}',
      'info.deviceTitle': 'Device & status',
      'info.row.model': 'Model',
      'info.row.serial': 'Serial',
      'info.row.android': 'Android',
      'info.row.resolution': 'Resolution',
      'info.row.battery': 'Battery',
      'info.row.screen': 'Screen',
      'info.row.quality': 'Quality',
      'info.row.recording': 'Recording',
      'info.screenVideo': 'Live mirror',
      'info.screenPolling': 'Snapshot polling',
      'info.screenIdle': 'Idle',
      'info.recordingOn': 'Recording {elapsed}s',
      'info.recordingOff': 'Idle',
      'plan.label': 'Semantic',
      'plan.toggleHint': 'On: a local Ollama model interprets plain language. Off: built-in rules only.',
      'plan.checking': 'Checking model…',
      'plan.disabled': 'Semantic parsing disabled',
      'plan.offline': 'Local Ollama is not running',
      'plan.missing': 'Model not installed: {model}',
      'plan.offHint': 'Semantic parsing off',
      'plan.thinking': 'Thinking…',
      'plan.usedModel': 'Model plan · {model}',
      'plan.usedLocal': 'Rule parsing',
      'plan.noSteps': 'The model returned no executable action.',
      'plan.looking': 'Looking…',
      'plan.visionModel': '{model} · vision',
      'plan.noVision': '{model} has no vision, falling back to text planning',
      'plan.visionFallback': 'Screen reading failed, fell back to rules: {message}',
      'plan.adbModel': '{model} · adb actions',
      'mode.hint': 'How instructions are parsed',
      'mode.rules': 'Rules',
      'mode.vision': 'Vision',
      'mode.adb': 'adb',
      'dual.on': 'Dual ✓',
      'dual.off': 'Dual',
      'dual.hint': 'Dual-model: mai-ui scans the screen for clickable elements first, then qwen3.8 picks a target from them — fewer mis-taps, slower.',
      'mode.rules.hint': 'Built-in rule matching: instant, but only fixed phrasings (open WeChat, swipe up, screenshot…).',
      'mode.vision.hint': 'The local model looks at a fresh screenshot before every action, so multi-page flows land correctly. About 4–8 s per step.',
      'mode.adb.hint': 'The local model turns the instruction into adb intents (open app, key events, type, screenshot, install/uninstall) and runs them over wired adb — no simulated taps. Side-effect commands (uninstall, clear data) pause for your confirmation first.',
      'adb.confirm': 'Confirm',
      'adb.confirmHint': 'This command has side effects — press Confirm to run it',
      'adb.needConfirm': 'Needs confirmation: {say} (has side effects)',
      'agent.stepLog': 'Step {index} · {say}',
      'agent.finished': 'Done ({steps} steps)',
      'agent.stepFail': 'Screen reading failed at step {index}',
      'agent.maxSteps': 'Stopped at the {steps}-step budget you configured',
      'agent.askPause': 'The model is unsure of the next step — waiting for you',
      'agent.aborted': 'Stopped by hand',
      'agent.resumed': 'Resuming from step {steps}',
      'agent.thinkTag': 'reasoned',
      'work.title': 'Work status',
      'work.idle': 'Idle',
      'work.idleHint': 'Type an instruction, or tap directly on the mirror',
      'work.planning': 'Thinking',
      'work.planningHint': 'The local model is reading the screen for the next step',
      'work.executing': 'Working',
      'work.executingHint': 'Running the action',
      'work.done': 'Done',
      'work.doneHint': 'Task finished — ready for the next one',
      'work.stopped': 'Paused',
      'work.ask': 'Needs you',
      'work.askHint': 'Check the current screen, then continue',
      'work.askHow': 'Answer below (e.g. “the calculator app”), then press Continue — it carries on from there',
      'work.abort': 'Stop',
      'work.abortHint': 'Stops once the current round returns; you can continue afterwards',
      'work.failed': 'Failed',
      'work.pausedHint': 'You can continue from the current screen',
      'work.someFailed': '{count} step(s) failed',
      'work.steps': 'Step {steps}',
      'work.limit': 'limit {total}',
      'work.elapsed': '{seconds}s elapsed',
      'work.resume': 'Continue ({steps} steps done)',
      'work.resumeHint': 'Keep going from the current screen without retyping',
      'work.reset': 'Reset',
      'work.resetHint': 'Clear the current task state and checkpoint, back to idle',
      'work.resetLog': 'Task reset — back to idle',
      'history.title': 'Recent prompts',
      'history.empty': 'No runs yet',
      'history.reuse': 'Click to refill the input',
      'history.clear': 'Clear',
      'device.card': 'View & device',
      'agent.loopStop': 'Paused: the same action repeated four times ({say})',
      'agent.stalled': 'Paused: the screen did not change for two rounds ({say})',
    };

    /* ------------------------------------------------------------ 工具 */

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

    function formatBytes(bytes) {
      const size = Number(bytes) || 0;
      if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
      if (size >= 1024) return `${(size / 1024).toFixed(0)} KB`;
      return `${size} B`;
    }

    function shortPath(path) {
      return String(path || '').replace(/^\/Users\/[^/]+/u, '~');
    }

    /* ------------------------------------------------------------ CSS */

    const CSS = [
      '.dmm-root{min-height:100%;height:100%;overflow:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);}',
      '.dmm-wrap{width:100%;max-width:1180px;margin:0 auto;padding:34px 40px 64px;box-sizing:border-box;}',
      '.dmm-kicker{margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);}',
      '.dmm-title{margin:0;font-size:23px;line-height:1.25;font-weight:600;letter-spacing:-.015em;}',
      '.dmm-sub{margin:9px 0 0;font-size:13px;line-height:1.65;color:var(--dsw-alias-label-secondary);}',
      '.dmm-status{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:18px;font-size:12px;color:var(--dsw-alias-label-secondary);}',
      '.dmm-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);}',
      '.dmm-dot--ok{background:var(--dsw-alias-state-success-primary);}',
      '.dmm-dot--busy{background:var(--dsw-alias-state-warn-primary);}',
      '.dmm-dot--bad{background:var(--dsw-alias-state-error-primary);}',
      '.dmm-pill{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:2px 9px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}',
      '.dmm-grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;grid-template-rows:auto auto;gap:22px 22px;align-items:start;margin-top:22px;}',
      '.dmm-stage{grid-column:1;grid-row:1;}',
      '.dmm-ops{grid-column:2;grid-row:1 / span 2;display:flex;flex-direction:column;gap:16px;}',
      '.dmm-info{grid-column:1;grid-row:2;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start;}',
      '.dmm-info--wide{grid-column:1 / -1;}',
      '.dmm-ops .dmm-card,.dmm-info .dmm-card{margin-top:0;}',
      '@media (max-width:1100px){.dmm-grid{grid-template-columns:minmax(0,1fr);} .dmm-stage,.dmm-ops,.dmm-info{grid-column:1;grid-row:auto;} .dmm-ops{margin-top:22px;}}',
      '@media (max-width:720px){.dmm-info{grid-template-columns:minmax(0,1fr);}}',
      '.dmm-infogrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 18px;}',
      '.dmm-inforow{display:flex;align-items:baseline;justify-content:space-between;gap:12px;font-size:12px;line-height:1.6;min-width:0;}',
      '.dmm-inforow span:first-child{flex:none;color:var(--dsw-alias-label-secondary);}',
      '.dmm-inforow span:last-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;}',
      '.dmm-stage{display:flex;flex-direction:column;gap:12px;padding:22px;border:1px solid var(--dsw-alias-border-l1);border-radius:16px;background:var(--dsw-alias-bg-layer-1);}',
      '.dmm-screenbox{position:relative;display:flex;align-items:center;justify-content:center;border-radius:12px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;}',
      '.dmm-screen{display:block;width:100%;height:auto;max-height:640px;object-fit:contain;border-radius:8px;box-shadow:0 0 0 1px var(--dsw-alias-border-l1);touch-action:none;cursor:crosshair;outline:none;}',
      '.dmm-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;padding:24px;background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 88%, transparent);}',
      '.dmm-overlay-title{margin:0;font-size:15px;font-weight:600;}',
      '.dmm-overlay-sub{margin:0;font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.6;}',
      '.dmm-hovertip{position:fixed;z-index:60;pointer-events:none;padding:8px 10px;border-radius:8px;background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 92%, #000);box-shadow:0 4px 16px rgba(0,0,0,.28);border:1px solid var(--dsw-alias-border-l2);font-size:11px;line-height:1.7;color:var(--dsw-alias-label-primary);white-space:nowrap;font-variant-numeric:tabular-nums;}',
      '.dmm-hovertip-title{font-weight:700;color:var(--dsw-alias-brand-primary);}',
      '.dmm-hovertip-row{color:var(--dsw-alias-label-secondary);}',
      '.dmm-hovertip-row b{color:var(--dsw-alias-label-primary);font-weight:600;}',
      '.dmm-spinner{width:22px;height:22px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);animation:dmm-spin 1s linear infinite;}',
      '@keyframes dmm-spin{to{transform:rotate(360deg);}}',
      '.dmm-metrics{display:flex;align-items:center;flex-wrap:wrap;gap:8px 14px;font-size:12px;color:var(--dsw-alias-label-secondary);}',
      '.dmm-metric b{font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;}',
      '.dmm-metric em{font-style:normal;margin-left:3px;}',
      '.dmm-sep{width:1px;height:12px;background:var(--dsw-alias-border-l1);}',
      '.dmm-hints{margin-left:auto;display:flex;flex-wrap:wrap;gap:8px 12px;font-size:11px;color:var(--dsw-alias-label-secondary);}',
      '.dmm-hints kbd{padding:1px 5px;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;background:var(--dsw-alias-bg-layer-2);font:inherit;font-size:10.5px;}',
      '.dmm-card{display:flex;flex-direction:column;gap:14px;padding:20px;border:1px solid var(--dsw-alias-border-l1);border-radius:16px;background:var(--dsw-alias-bg-layer-1);margin-top:22px;}',
      '.dmm-grid .dmm-card:first-child{margin-top:0;}',
      '.dmm-cardhead{display:flex;align-items:center;justify-content:space-between;gap:12px;}',
      '.dmm-cardtitle{margin:0;font-size:13px;font-weight:600;}',
      '.dmm-cardhead-actions{display:flex;align-items:center;gap:10px;}',
      '.dmm-muted{font-size:11px;color:var(--dsw-alias-label-secondary);}',
      /* 工作状态卡：右侧只讲「现在在做什么」，设备型号/系统等放在页面顶部 */
      '.dmm-work{display:flex;align-items:flex-start;gap:11px;}',
      '.dmm-workdot{flex:none;width:9px;height:9px;margin-top:8px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);}',
      '.dmm-workdot--busy{background:var(--dsw-alias-brand-primary);animation:dmm-pulse 1.4s ease-in-out infinite;}',
      '.dmm-workdot--ok{background:var(--dsw-alias-state-success-primary);}',
      '.dmm-workdot--warn{background:var(--dsw-alias-state-warn-primary);}',
      '.dmm-workdot--bad{background:var(--dsw-alias-state-error-primary);}',
      '@keyframes dmm-pulse{0%,100%{opacity:1;}50%{opacity:.3;}}',
      '.dmm-workbody{min-width:0;flex:1 1 auto;}',
      '.dmm-worklabel{margin:0;font-size:19px;line-height:1.25;font-weight:600;letter-spacing:-.01em;}',
      '.dmm-workdetail{margin:3px 0 0;font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
      '.dmm-workmeta{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;}',
      /* 状态区与输入区之间的一根细线：同属一张卡，但仍是两件事 */
      '.dmm-split{flex:none;height:1px;margin:2px 0 -2px;background:var(--dsw-alias-border-l1);opacity:.7;}',
      '.dmm-workbar{height:3px;border-radius:2px;background:var(--dsw-alias-border-l1);overflow:hidden;}',
      '.dmm-workbar i{display:block;height:100%;border-radius:2px;background:var(--dsw-alias-brand-primary);transition:width .35s ease;}',
      '.dmm-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}',
      '.dmm-btn{appearance:none;padding:7px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer;}',
      '.dmm-btn:hover:not(:disabled){border-color:var(--dsw-alias-border-l2);}',
      '.dmm-btn:disabled{opacity:.45;cursor:not-allowed;}',
      '.dmm-btn--primary{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);}',
      '.dmm-btn--danger{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);}',
      '.dmm-select{padding:6px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;}',
      '.dmm-select:disabled{opacity:.5;cursor:not-allowed;}',
      '.dmm-segmented{display:inline-flex;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;overflow:hidden;}',
      '.dmm-segmented button{appearance:none;padding:6px 11px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;border-right:1px solid var(--dsw-alias-border-l1);}',
      '.dmm-segmented button:last-child{border-right:none;}',
      '.dmm-segmented button.on{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);}',
      '.dmm-segmented--sm{flex:none;}',
      '.dmm-segmented--sm button{padding:4px 9px;font-size:11px;}',
      '.dmm-keygrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}',
      '.dmm-key{display:flex;flex-direction:column;align-items:center;gap:5px;padding:10px 4px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;cursor:pointer;}',
      '.dmm-key:hover:not(:disabled){border-color:var(--dsw-alias-border-l2);}',
      '.dmm-key:disabled{opacity:.4;cursor:not-allowed;}',
      /* 最近提示词历史 */
      '.dmm-history{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;max-height:240px;overflow:auto;}',
      '.dmm-history-item{display:flex;flex-direction:column;gap:2px;padding:7px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);cursor:pointer;}',
      '.dmm-history-item:hover{border-color:var(--dsw-alias-brand-primary);}',
      '.dmm-history-goal{font-size:12px;color:var(--dsw-alias-label-primary);line-height:1.5;word-break:break-all;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
      '.dmm-history-meta{font-size:10px;color:var(--dsw-alias-label-secondary);}',
      '.dmm-key svg{display:block;color:var(--dsw-alias-label-secondary);}',
      '.dmm-textarea{width:100%;box-sizing:border-box;min-height:64px;resize:vertical;padding:9px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.6;}',
      '.dmm-textarea:focus{outline:none;border-color:var(--dsw-alias-border-l2);}',
      '.dmm-textarea::placeholder{color:var(--dsw-alias-label-secondary);}',
      '.dmm-hint{margin:0;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);}',
      '.dmm-log{display:flex;flex-direction:column;gap:6px;max-height:230px;overflow:auto;}',
      '.dmm-logrow{display:flex;align-items:baseline;gap:8px;font-size:12px;line-height:1.55;}',
      '.dmm-logmark{flex:none;font-size:10.5px;font-weight:600;letter-spacing:.05em;}',
      '.dmm-logmark--ok{color:var(--dsw-alias-state-success-primary);}',
      '.dmm-logmark--bad{color:var(--dsw-alias-state-error-primary);}',
      '.dmm-logtext{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
      '.dmm-logdetail{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
      '.dmm-files{display:flex;flex-direction:column;gap:8px;}',
      '.dmm-filerow{display:flex;align-items:center;gap:8px;font-size:12px;min-width:0;}',
      '.dmm-filetag{flex:none;padding:1px 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;font-size:10.5px;color:var(--dsw-alias-label-secondary);}',
      '.dmm-filepath{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);direction:rtl;text-align:left;}',
      '.dmm-filemeta{flex:none;font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;}',
      '.dmm-file-btn{flex:none;appearance:none;padding:3px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;}',
      '.dmm-file-btn:hover{color:var(--dsw-alias-label-primary);}',
      '.dmm-input[type="file"]{font-size:11px;color:var(--dsw-alias-label-secondary);max-width:100%;}',
      '.dmm-errorline{margin:0;font-size:12px;line-height:1.6;color:var(--dsw-alias-state-error-primary);}',
      '.dmm-okline{margin:0;font-size:12px;line-height:1.6;color:var(--dsw-alias-state-success-primary);overflow-wrap:anywhere;}',
      '.dmm-number{width:90px;padding:6px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;}',
      '.dmm-input{width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;}',
      '.dmm-input:focus{outline:none;border-color:var(--dsw-alias-border-l2);}',
      '.dmm-input::placeholder{color:var(--dsw-alias-label-secondary);}',
      '.dmm-btn--ghost{background:transparent;border-color:transparent;color:var(--dsw-alias-label-secondary);}',
      '.dmm-btn--ghost:hover:not(:disabled){color:var(--dsw-alias-label-primary);}',
      '.dmm-row--tight{gap:5px;}',
      '.dmm-scriptsteps{display:flex;flex-direction:column;gap:4px;max-height:180px;overflow:auto;margin:4px 0 8px;}',
      '.dmm-scriptstep{display:flex;align-items:center;gap:8px;padding:4px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;font-size:12px;}',
      '.dmm-scriptidx{flex:none;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10.5px;font-variant-numeric:tabular-nums;}',
      '.dmm-scriptsay{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);}',
      '.dmm-scriptlist{display:flex;flex-direction:column;gap:8px;margin-top:10px;border-top:1px solid var(--dsw-alias-border-l1);padding-top:10px;}',
      '.dmm-scriptlisthead{margin:0;font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary);}',
      '.dmm-scriptitem{display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);}',
      '.dmm-scriptmeta{display:flex;flex-wrap:wrap;gap:5px 10px;align-items:baseline;}',
      '.dmm-scriptname{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);}',
      '.dmm-scriptintent{flex-basis:100%;font-size:11px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
      '.dmm-toggle{appearance:none;display:inline-flex;align-items:center;gap:7px;padding:0;border:none;background:none;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;}',
      '.dmm-toggle-track{position:relative;display:inline-block;flex:none;width:26px;height:15px;border-radius:999px;background:var(--dsw-alias-border-l2);transition:background .16s ease;}',
      '.dmm-toggle-knob{position:absolute;top:2px;left:2px;width:11px;height:11px;border-radius:50%;background:#fff;transition:transform .16s ease;}',
      '.dmm-toggle.on{color:var(--dsw-alias-brand-primary);}',
      '.dmm-toggle.on .dmm-toggle-track{background:var(--dsw-alias-brand-primary);}',
      '.dmm-toggle.on .dmm-toggle-knob{transform:translateX(11px);}',
      '.dmm-planstate{font-size:11px;line-height:1.5;}',
      '.dmm-planstate--ok{color:var(--dsw-alias-state-success-primary);}',
      '.dmm-planstate--bad{color:var(--dsw-alias-state-error-primary);}',
      '.dmm-planstate--idle{color:var(--dsw-alias-label-secondary);}',
      '.dmm-spinner--inline{width:13px;height:13px;border-width:2px;}',
    ].join('\n');

    /* ------------------------------------------------------------ App 表 */

    const APP_ALIASES = {
      '微信': 'com.tencent.mm',
      'weixin': 'com.tencent.mm',
      'wechat': 'com.tencent.mm',
      'qq': 'com.tencent.mobileqq',
      '抖音': 'com.ss.android.ugc.aweme',
      'douyin': 'com.ss.android.ugc.aweme',
      'tiktok': 'com.ss.android.ugc.aweme',
      '快手': 'com.smile.gifmaker',
      '淘宝': 'com.taobao.taobao',
      'taobao': 'com.taobao.taobao',
      '京东': 'com.jingdong.app.mall',
      'jd': 'com.jingdong.app.mall',
      '拼多多': 'com.xunmeng.pinduoduo',
      '支付宝': 'com.eg.android.AlipayGphone',
      'alipay': 'com.eg.android.AlipayGphone',
      '微博': 'com.sina.weibo',
      'weibo': 'com.sina.weibo',
      '知乎': 'com.zhihu.android',
      '小红书': 'com.xingin.xhs',
      '哔哩哔哩': 'tv.danmaku.bili',
      'b站': 'tv.danmaku.bili',
      'bilibili': 'tv.danmaku.bili',
      '网易云音乐': 'com.netease.cloudmusic',
      'qq音乐': 'com.tencent.qqmusic',
      '高德地图': 'com.autonavi.minimap',
      '百度地图': 'com.baidu.BaiduMap',
      '美团': 'com.sankuai.meituan',
      '饿了么': 'me.ele',
      '携程': 'ctrip.android.view',
      '设置': 'com.android.settings',
      'settings': 'com.android.settings',
      '相机': 'com.huawei.camera',
      'camera': 'com.huawei.camera',
      '相册': 'com.android.gallery3d',
      '图库': 'com.android.gallery3d',
      '浏览器': 'com.huawei.browser',
      'browser': 'com.huawei.browser',
      '日历': 'com.android.calendar',
      '时钟': 'com.android.deskclock',
      '计算器': 'com.android.calculator2',
      '电话': 'com.android.dialer',
      '短信': 'com.android.mms',
      '邮件': 'com.android.mail',
      '应用市场': 'com.huawei.appmarket',
      '文件管理': 'com.huawei.hidisk',
      '备忘录': 'com.android.notes',
      '天气': 'com.huawei.android.totemweather',
    };

    /* ------------------------------------------------------------ 指令解析 */

    /**
     * Split the raw instruction into discrete steps.
     * @param raw - user input.
     * @returns non-empty step strings.
     */
    function splitSteps(raw) {
      return String(raw || '')
        .replace(/然后|接着|之后|再(?=[打开返点输截录上下左右滑进])/gu, '\n')
        .split(/\r?\n|[；;。！？]/u)
        .map((step) => step.replace(/^[，,、\s]+|[，,、\s]+$/gu, '').trim())
        .filter((step) => step !== '');
    }

    /**
     * Resolve an app name to a package id.
     * @param name - user-facing app name.
     * @returns the package name, or '' when unknown.
     */
    function resolveApp(name) {
      const key = String(name || '').trim().toLowerCase();
      if (key === '') return '';
      if (/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/iu.test(key)) return key;
      if (APP_ALIASES[key]) return APP_ALIASES[key];
      const hit = Object.keys(APP_ALIASES).find((alias) => key.includes(alias) || alias.includes(key));
      return hit ? APP_ALIASES[hit] : '';
    }

    const QUALITY_WORDS = { '流畅': 'smooth', '标准': 'standard', '高清': 'high', '原画': 'native' };
    const QUALITY_WORDS_EN = { smooth: 'smooth', standard: 'standard', high: 'high', native: 'native' };

    /**
     * Parse one step into a structured command the panel can run.
     * @param step - one instruction step.
     * @returns {kind, ...args} or {kind:'unknown'}.
     */
    function parseStep(step) {
      const text = step.trim();
      let m;
      if ((m = text.match(/^(?:打开|启动|运行|開啟|open|launch)\s*(.+)$/iu))) {
        const pkg = resolveApp(m[1]);
        return pkg === '' ? { kind: 'unknown' } : { kind: 'app', package: pkg };
      }
      if ((m = text.match(/^(?:点击|轻触|按一下|点一下|tap)\s*[\(（]?\s*(\d+)\s*[,，]\s*(\d+)\s*[\)）]?$/iu))) {
        return { kind: 'tap', x: Number(m[1]), y: Number(m[2]) };
      }
      if ((m = text.match(/^(?:上|下|左|右)(?:滑|滑动|滑动一下|翻|翻页|滚动)/u))) {
        const dir = m[0][0];
        const amount = text.match(/(\d+)\s*%?\s*$/u);
        return { kind: 'swipe', dir, percent: amount ? Math.min(90, Math.max(15, Number(amount[1]))) : 55 };
      }
      if (/^输入\s*/u.test(text) || /^type\s+/iu.test(text)) {
        const payload = text.replace(/^(输入|type)\s*/iu, '').replace(/^["“']|["”']$/gu, '');
        return payload === '' ? { kind: 'unknown' } : { kind: 'text', text: payload };
      }
      if ((m = text.match(/^(?:录屏|录制|屏幕录制|record)(?:\s*(\d+)\s*秒?)?$/iu))) {
        return { kind: 'record', seconds: m[1] ? Number(m[1]) : 15 };
      }
      if (/^(停止录制|停止录屏|结束录制|stop record(ing)?)$/iu.test(text)) return { kind: 'recordStop' };
      if (/^(截图|截屏|保存截图|screenshot)$/iu.test(text)) return { kind: 'screenshot' };
      if (/^(返回|返回键|back)$/iu.test(text)) return { kind: 'key', key: 'back' };
      if (/^(主页|回主页|回到主页|桌面|回桌面|home)$/iu.test(text)) return { kind: 'key', key: 'home' };
      if (/^(多任务|最近任务|后台|任务切换|recents)$/iu.test(text)) return { kind: 'key', key: 'recents' };
      if (/^(通知栏|下拉通知栏|打开通知栏|notifications?)$/iu.test(text)) return { kind: 'key', key: 'notification' };
      if (/^(菜单|menu)$/iu.test(text)) return { kind: 'key', key: 'menu' };
      if (/^(音量增|音量\+|调大音量|增大音量|volume up)$/iu.test(text)) return { kind: 'key', key: 'volume_up' };
      if (/^(音量减|音量[-−]|调小音量|减小音量|volume down)$/iu.test(text)) return { kind: 'key', key: 'volume_down' };
      if (/^(电源|锁屏|熄屏|按电源键|power)$/iu.test(text)) return { kind: 'key', key: 'power' };
      if (/^(唤醒|亮屏|点亮屏幕|wake)$/iu.test(text)) return { kind: 'wake' };
      if (/^(回车|换行|enter)$/iu.test(text)) return { kind: 'key', key: 'enter' };
      if (/^(删除|退格|backspace|delete)$/iu.test(text)) return { kind: 'key', key: 'delete' };
      if ((m = text.match(/^(?:画质|清晰度)\s*(流畅|标准|高清|原画|smooth|standard|high|native)$/iu))) {
        const quality = QUALITY_WORDS[m[1]] || QUALITY_WORDS_EN[m[1].toLowerCase()];
        return quality ? { kind: 'quality', quality } : { kind: 'unknown' };
      }
      if (/^(刷新|刷新设备|refresh)$/iu.test(text)) return { kind: 'refresh' };
      return { kind: 'unknown' };
    }

    /* ------------------------------------------------ 指令解析模式偏好 */

    /** Legacy boolean switch, kept so an existing preference still migrates. */
    const SEMANTIC_PREF_KEY = 'my-mobile:semantic';

    /** `rules` (instant local regex) | `vision` (look + step loop) | `adb` (adb intent, no screen taps). */
    const MODE_PREF_KEY = 'my-mobile:mode';
    const MODES = ['rules', 'vision', 'adb'];

    /**
     * Read the persisted instruction mode.
     * Defaults to `vision` — the planner model is multimodal, and grounding
     * each tap in the live screenshot is what makes it land on the control.
     */
    function readModePref() {
      try {
        const stored = window.localStorage.getItem(MODE_PREF_KEY);
        if (MODES.indexOf(stored) !== -1) return stored;
        /* migrate the old on/off switch: off meant "local rules only" */
        return window.localStorage.getItem(SEMANTIC_PREF_KEY) === 'off' ? 'rules' : 'vision';
      } catch (_) {
        return 'vision';
      }
    }

    /**
     * Persist the instruction mode.
     * @param mode - one of {@link MODES}.
     */
    function writeModePref(mode) {
      try {
        window.localStorage.setItem(MODE_PREF_KEY, mode);
      } catch (_) {
        /* storage unavailable — the switch still works for this session */
      }
    }

    /** 双模型模式：mai-ui 先扫屏定位元素，qwen3.8 再从元素里挑目标。 */
    const DUAL_PREF_KEY = 'my-mobile:dual';
    function readDualPref() {
      try {
        return window.localStorage.getItem(DUAL_PREF_KEY) === 'on';
      } catch (_) {
        return false;
      }
    }
    function writeDualPref(on) {
      try {
        window.localStorage.setItem(DUAL_PREF_KEY, on ? 'on' : 'off');
      } catch (_) {
        /* storage unavailable — the toggle still works for this session */
      }
    }

    /** 最近开始执行的提示词历史（保留最近 7 次），用于查看/一键回填。 */
    const PROMPT_HISTORY_KEY = 'my-mobile:prompt-history';
    const MAX_PROMPT_HISTORY = 7;
    function loadPromptHistory() {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(PROMPT_HISTORY_KEY) || '[]');
        return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.goal === 'string') : [];
      } catch (_) {
        return [];
      }
    }
    function savePromptHistory(entries) {
      try {
        window.localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_PROMPT_HISTORY)));
      } catch (_) {
        /* storage unavailable */
      }
    }

    /* ------------------------------------------------------------ 图标 */

    function PhoneIcon({ size = 20, active }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        'aria-hidden': true,
        style: { display: 'block', opacity: active ? 1 : 0.78 },
      },
        h('rect', { x: 7, y: 2.5, width: 10, height: 19, rx: 2.6, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('path', { d: 'M10.6 5.4h2.8', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
      );
    }

    function KeyGlyph({ kind }) {
      const common = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
      switch (kind) {
        case 'back':
          return h('svg', common, h('path', { d: 'M15 5 8 12l7 7' }));
        case 'home':
          return h('svg', common, h('circle', { cx: 12, cy: 12, r: 7.5 }));
        case 'recents':
          return h('svg', common, h('rect', { x: 4.5, y: 4.5, width: 15, height: 15, rx: 2.5 }));
        case 'power':
          return h('svg', common, h('path', { d: 'M12 3.5v8' }), h('path', { d: 'M7 6.4a7.2 7.2 0 1 0 10 0' }));
        case 'volumeUp':
          return h('svg', common, h('path', { d: 'M4 10v4h4l5 4V6L8 10z' }), h('path', { d: 'M16.5 9.5a4 4 0 0 1 0 5' }));
        case 'volumeDown':
          return h('svg', common, h('path', { d: 'M4 10v4h4l5 4V6L8 10z' }), h('path', { d: 'M16.5 12h4.5' }));
        case 'notification':
          return h('svg', common, h('path', { d: 'M6 9.5a6 6 0 0 1 12 0V16l2 2.8H4L6 16z' }), h('path', { d: 'M10 21.4h4' }));
        default:
          return h('svg', common, h('path', { d: 'M4 7h16M4 12h16M4 17h16' }));
      }
    }

    /* ---------------------------------------------------------- 侧栏图标 */

    function SidebarIcon({ size = 20, active }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block', opacity: active ? 1 : 0.8 },
      },
        h('rect', { x: 6.4, y: 2.4, width: 9.2, height: 19.2, rx: 2.4, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('path', { d: 'M9.8 5.2h4.4', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        h('circle', { cx: 11, cy: 18.6, r: 1.05, fill: 'currentColor' }),
        h('path', { d: 'M17 8.4a6.4 6.4 0 0 1 1.9 4.4', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', opacity: 0.85 }),
        h('path', { d: 'M19.4 5.8a9.8 9.8 0 0 1 2.7 6.9', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', opacity: 0.6 }));
    }

    /* ------------------------------------------------------------ 面板 */

    function Panel({ t }) {
      const translate = (key, vars) => {
        let text = t(key);
        if (vars) {
          for (const [name, value] of Object.entries(vars)) {
            text = text.split(`{${name}}`).join(String(value));
          }
        }
        return text;
      };
      const tt = translate;

      const [health, setHealth] = React.useState(null);
      const [bootError, setBootError] = React.useState('');
      const [status, setStatus] = React.useState(null);
      const [statusError, setStatusError] = React.useState('');
      const [serial, setSerial] = React.useState('');
      const [quality, setQuality] = React.useState('standard');
      /* 「激活」按钮按下的进行态：设备没连上时点它，会先拉起/重启本机
         MobileControl 服务再刷新设备列表，这里给用户一个明确的反馈。 */
      const [activating, setActivating] = React.useState(false);

      const [live, setLive] = React.useState(true);
      const [mirrorNonce, setMirrorNonce] = React.useState(0);
      const [mode, setMode] = React.useState('idle'); // idle | connecting | video | polling | error
      const [modeNote, setModeNote] = React.useState('');
      const [fps, setFps] = React.useState(0);
      const [resolution, setResolution] = React.useState('');
      const [lastFrameAt, setLastFrameAt] = React.useState(0);
      /* 视觉模型扫出的可点元素（归一化 bbox），画在镜像上做标记。 */
      const [uiElements, setUiElements] = React.useState([]);
      const [showMarks, setShowMarks] = React.useState(true);
      /* 鼠标悬停在某个标记元素上时，记录该元素与鼠标位置，画坐标提示。 */
      const [hoverInfo, setHoverInfo] = React.useState(null);

      const canvasRef = React.useRef(null);
      /* 上一帧 bitmap，切换「显示/隐藏标记」时用它重画当前画面+标记。 */
      const lastBmpRef = React.useRef(null);
      /* drawBitmap 每帧都跑，标记层要从里面读最新元素与显隐，避免每帧
         重建 effect 依赖；用 ref 双写，state 只用于驱动 React 渲染按钮文案。 */
      const uiElementsRef = React.useRef([]);
      const showMarksRef = React.useRef(true);
      const wsRef = React.useRef(null);
      const pollRef = React.useRef(null);
      const frameRef = React.useRef({ pending: null, drawing: false, count: 0 });
      const pointerRef = React.useRef(null);
      const holdTimerRef = React.useRef(null);
      /* Runs have no step ceiling any more, so the loop needs a hand brake:
         the 停止 button flips this and the loop exits after the round in
         flight instead of waiting for the model to decide it is done. */
      const abortRef = React.useRef(false);

      const [instruction, setInstruction] = React.useState('');
      const [running, setRunning] = React.useState(false);
      /* A vision run that stopped early (step budget, repeated no-op, model
         error) leaves a resumable checkpoint here: same goal, same history,
         continuing from whatever the screen shows now. */
      const [resume, setResume] = React.useState(null);
      /* One place for "what is happening right now": the right column shows a
         work-status card instead of repeating the device info from the header. */
      const [work, setWork] = React.useState({ state: 'idle', say: '', steps: 0, total: 0, startedAt: 0, ms: 0 });
      const [clock, setClock] = React.useState(Date.now());
      const [log, setLog] = React.useState([]);
      const [planner, setPlanner] = React.useState(null);
      const [planning, setPlanning] = React.useState(false);
      const [parseMode, setParseMode] = React.useState(readModePref);
      /* 双模型：开启后视觉循环每轮先用 mai-ui 扫屏定位元素，再交给 qwen3.8 决策。 */
      const [dual, setDual] = React.useState(readDualPref);
      /* 最近开始执行的提示词（最多 7 条），点击可回填到输入框。 */
      const [promptHistory, setPromptHistory] = React.useState(loadPromptHistory);
      /* Two uses for the single input box: `op` parses the text into actions and
         runs them; `text` types the text straight into the focused field on the
         phone. This replaces the old separate "text input" card. */
      const [inputKind, setInputKind] = React.useState('op');
      /* 「指令操作」模式下，遇到危险命令（卸载/清数据/安装）会先停在这里等确认；
         用户点「确认执行」后带 confirmed 标记跑完剩余队列。 */
      const [adbConfirm, setAdbConfirm] = React.useState(null);
      /* Derived flags keep the execution paths readable: anything but `rules`
         asks the local model, and only `vision` attaches the screenshot. */
      const semantic = parseMode !== 'rules';
      const vision = parseMode === 'vision';

      /* 「已用 Ns」需要一秒的节拍，只在任务运行时有意义 */
      React.useEffect(() => {
        if (!running && !planning) return undefined;
        const timer = setInterval(() => setClock(Date.now()), 1000);
        return () => clearInterval(timer);
      }, [running, planning]);
      const [captures, setCaptures] = React.useState([]);
      const [captureBusy, setCaptureBusy] = React.useState(false);
      const [recordSeconds, setRecordSeconds] = React.useState(15);
      const [recording, setRecording] = React.useState(null);
      const [recordBusy, setRecordBusy] = React.useState(false);
      const [recordNote, setRecordNote] = React.useState(null);

      const [uploadFile, setUploadFile] = React.useState(null);
      const [uploadDest, setUploadDest] = React.useState('download');
      const [uploadBusy, setUploadBusy] = React.useState(false);
      const [uploadNote, setUploadNote] = React.useState(null);
      const [copiedPath, setCopiedPath] = React.useState('');

      /* ---- 脚本录制：录镜像手动操作 → JSON 动作序列，可保存/回放 ---- */
      const [scriptRec, setScriptRec] = React.useState(false);   // 是否正在录制
      const [scriptSteps, setScriptSteps] = React.useState([]);  // 当前编辑中的步骤
      const [scriptIntent, setScriptIntent] = React.useState(''); // 脚本意图（命名/说明）
      const [scriptName, setScriptName] = React.useState('');     // 保存时的脚本名
      const [scriptDrafting, setScriptDrafting] = React.useState(false); // 生成骨架中
      const [scriptBusy, setScriptBusy] = React.useState(false);  // 保存/回放中
      const [scriptList, setScriptList] = React.useState([]);     // 脚本库列表
      const [scriptReplayName, setScriptReplayName] = React.useState(''); // 正在回放的脚本
      const [scriptNote, setScriptNote] = React.useState('');

      const device = status && status.device ? status.device : null;
      const hasDevice = Boolean(device && status && status.selected);
      const width = hasDevice ? Number(device.width) || 0 : 0;
      const height = hasDevice ? Number(device.height) || 0 : 0;

      const appendLog = React.useCallback((ok, text, detail) => {
        setLog((rows) => [{ ok, text, detail: detail || '', at: Date.now() }, ...rows].slice(0, 40));
      }, []);

      /* Stop reasons live only in component state, so a run that ended last
         night cannot be explained afterwards. Mirror them into the host's
         trace file next to the per-round records. */
      const traceNote = React.useCallback((reason, extra) => {
        void postJson('/trace', { reason, ...extra }).catch(() => {});
      }, []);

      /** Draw the model's recognised element boxes straight onto the main
          canvas. Painting right after the bitmap keeps the boxes in the same
          pixel space as the frame — no CSS overlay alignment to drift. */
      const drawMarks = React.useCallback((ctx2d, width, height) => {
        if (!showMarksRef.current) return;
        const list = uiElementsRef.current;
        if (!Array.isArray(list) || list.length === 0) return;
        const accent = '#ff4d4f';
        ctx2d.lineWidth = Math.max(2, Math.round(width / 180));
        ctx2d.font = `600 ${Math.max(12, Math.round(width / 34))}px -apple-system, system-ui, sans-serif`;
        ctx2d.textBaseline = 'top';
        list.forEach((el, index) => {
          const x = el.fx * width;
          const y = el.fy * height;
          const w = (el.fw || 0) * width;
          const h = (el.fh || 0) * height;
          if (w < 4 || h < 4) return;
          ctx2d.strokeStyle = accent;
          ctx2d.strokeRect(x, y, w, h);
          const label = `${index + 1}. ${el.label || ''}`;
          const padX = 5;
          const boxH = Math.max(14, Math.round(width / 40));
          const textW = ctx2d.measureText(label).width + padX * 2;
          ctx2d.fillStyle = accent;
          ctx2d.fillRect(x, Math.max(0, y - boxH), textW, boxH);
          ctx2d.fillStyle = '#ffffff';
          ctx2d.fillText(label, x + padX, Math.max(0, y - boxH) + 2);
        });
      }, []);

      const drawBitmap = React.useCallback((bmp) => {
        const canvas = canvasRef.current;
        if (canvas === null) return;
        if (canvas.width !== bmp.width || canvas.height !== bmp.height) {
          canvas.width = bmp.width;
          canvas.height = bmp.height;
        }
        const ctx2d = canvas.getContext('2d', { alpha: false });
        ctx2d.drawImage(bmp, 0, 0);
        drawMarks(ctx2d, bmp.width, bmp.height);
        lastBmpRef.current = bmp;
        setResolution(`${bmp.width}×${bmp.height}`);
        setLastFrameAt(Date.now());
        frameRef.current.count += 1;
      }, [drawMarks]);

      const drawBytes = React.useCallback(async (buffer) => {
        try {
          const blob = new Blob([buffer], { type: 'image/png' });
          const bmp = await createImageBitmap(blob);
          drawBitmap(bmp);
          /* 不 close：lastBmpRef 还引用着它，切换「显示/隐藏标记」时要拿它
             重画；旧的会被 GC 回收，只留最后一帧。 */
        } catch (_) {
          /* 单帧失败忽略 */
        }
      }, [drawBitmap]);

      const grabOnce = React.useCallback(async (target) => {
        const query = target ? `?serial=${encodeURIComponent(target)}` : '';
        const response = await fetch(`${API}/screen${query}`, { credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload && payload.error ? payload.error.message : `HTTP ${response.status}`);
        }
        await drawBytes(await response.arrayBuffer());
      }, [drawBytes]);

      /* 标记显隐/元素变化时，把 ref 同步好并用上一帧重画（不用等下一帧）。 */
      React.useEffect(() => {
        showMarksRef.current = showMarks;
        const canvas = canvasRef.current;
        const bmp = lastBmpRef.current;
        if (canvas === null || bmp === null) return;
        try {
          const ctx2d = canvas.getContext('2d', { alpha: false });
          ctx2d.drawImage(bmp, 0, 0);
          drawMarks(ctx2d, canvas.width, canvas.height);
        } catch (_) {
          /* 帧已失效（如 ImageBitmap 被回收）时忽略，等下一帧重画。 */
        }
      }, [showMarks, uiElements, drawMarks]);

      /* --- 画面：WS 视频优先，截图轮询兜底 --- */
      React.useEffect(() => {
        setFps(0);
        frameRef.current.count = 0;
        if (!live || !hasDevice || !health) {
          setMode('idle');
          return undefined;
        }
        let cancelled = false;
        let pollTimer = null;
        setMode('connecting');
        setModeNote('');

        const startPolling = (reason) => {
          if (cancelled) return;
          setMode('polling');
          if (reason) setModeNote(reason);
          const tick = async () => {
            try {
              await grabOnce(status.selected);
              setMode((current) => (current === 'polling' ? 'polling' : current));
            } catch (error) {
              setMode('error');
              setModeNote(error.message);
              return;
            }
            if (!cancelled) pollTimer = setTimeout(tick, 1100);
          };
          void tick();
        };

        let settled = false;
        try {
          const ws = new WebSocket(`ws://127.0.0.1:${health.port}/ws/video/${encodeURIComponent(status.selected)}`);
          ws.binaryType = 'arraybuffer';
          wsRef.current = ws;
          const fallbackTimer = setTimeout(() => {
            if (!settled && !cancelled) {
              settled = true;
              try { ws.close(); } catch (_) { /* already closed */ }
              startPolling('');
            }
          }, 4500);
          ws.onmessage = (event) => {
            if (cancelled) return;
            if (typeof event.data === 'string') return; // meta JSON
            if (!settled) {
              settled = true;
              clearTimeout(fallbackTimer);
              setMode('video');
            }
            frameRef.current.pending = event.data;
            void pumpVideo();
          };
          ws.onerror = () => { /* onclose 统一处理 */ };
          ws.onclose = () => {
            clearTimeout(fallbackTimer);
            if (cancelled || wsRef.current !== ws) return;
            wsRef.current = null;
            if (!settled) {
              settled = true;
              startPolling('');
            } else {
              setMode('error');
              setModeNote(tt('status.offline'));
            }
          };
        } catch (_) {
          startPolling('');
        }

        function pumpVideo() {
          const box = frameRef.current;
          if (box.drawing) return;
          box.drawing = true;
          const step = async () => {
            while (box.pending) {
              const buffer = box.pending;
              box.pending = null;
              await drawBytes(buffer);
            }
            box.drawing = false;
          };
          void step();
        }

        return () => {
          cancelled = true;
          if (pollTimer) clearTimeout(pollTimer);
          const ws = wsRef.current;
          wsRef.current = null;
          if (ws) {
            ws.onclose = null;
            try { ws.close(); } catch (_) { /* already closed */ }
          }
        };
      }, [live, hasDevice, health && health.port, status && status.selected, mirrorNonce]);

      /* --- fps 统计 --- */
      React.useEffect(() => {
        const timer = setInterval(() => {
          const box = frameRef.current;
          setFps(mode === 'video' ? box.count : 0);
          box.count = 0;
        }, 1000);
        return () => clearInterval(timer);
      }, [mode]);

      /* --- 设备状态轮询 + 录制状态 --- */
      const refreshStatus = React.useCallback(async (silent) => {
        try {
          const payload = await getJson('/status');
          setStatus(payload.status);
          setStatusError('');
          const selected = payload.status && payload.status.selected ? payload.status.selected : '';
          setSerial((current) => (current === '' ? selected : current));
        } catch (error) {
          setStatus(null);
          setStatusError(error.message);
          if (silent !== true) appendLog(false, tt('status.offline'), error.message);
        }
      }, [appendLog]);

      React.useEffect(() => {
        let cancelled = false;
        const boot = async () => {
          try {
            const payload = await getJson('/health');
            setHealth(payload);
            await refreshStatus(true);
          } catch (error) {
            setBootError(error.message);
          }
        };
        /* 恢复上一次任务快照：面板重进后，把上次的进度（暂停/待确认/完成/出错）
           还原成可「继续」的断点，而不是当作全新会话。只恢复静止态；运行中的
           任务在页面离开时已经中断，这里恢复成已暂停，交给用户手动「继续」。 */
        const restore = async () => {
          try {
            const payload = await getJson('/task/state');
            const task = payload && payload.task ? payload.task : null;
            if (task === null || cancelled) return;
            if (task.work && typeof task.work === 'object' && task.work.state !== 'idle') {
              /* 运行中/解析中的状态在重进时统一回落为「已暂停」断点 */
              const state = task.work.state === 'running' ? 'stopped' : task.work.state;
              setWork({ ...task.work, state, ms: task.work.ms || 0 });
            }
            if (task.resume && typeof task.resume === 'object') setResume(task.resume);
            if (typeof task.instruction === 'string' && task.instruction !== '') setInstruction(task.instruction);
            if (task.inputKind === 'text' || task.inputKind === 'op') setInputKind(task.inputKind);
            if (typeof task.parseMode === 'string') setParseMode(task.parseMode);
          } catch (_) {
            /* 没有快照或读取失败都静默忽略 */
          }
        };
        void boot();
        void restore();
        const timer = setInterval(() => {
          if (!cancelled) void refreshStatus(true);
        }, 6000);
        return () => {
          cancelled = true;
          clearInterval(timer);
        };
      }, []);

      React.useEffect(() => {
        if (recording === null) return undefined;
        const timer = setInterval(async () => {
          try {
            const payload = await getJson('/record/state');
            setRecording(payload.recording);
            if (payload.recording === null && payload.last) setRecordNote(payload.last);
          } catch (_) { /* 下个周期再试 */ }
        }, 1000);
        return () => clearInterval(timer);
      }, [recording !== null]);

      /* 任务状态持久化：把「静止态」的任务进度写到宿主内存，面板重进时能恢复。
         运行中（running/planning）不写——在途循环页面一离开就中断，恢复时按
         「已暂停」断点处理；只有任务停在 idle/done/stopped/ask/error 才落快照。 */
      React.useEffect(() => {
        if (running || planning) return undefined;
        const state = work.state;
        /* idle 且无断点、无输入时无需写快照 */
        if (state === 'idle' && resume === null && instruction.trim() === '') return undefined;
        const settled = ['idle', 'done', 'stopped', 'ask', 'error'].includes(state);
        void postJson('/task/state', {
          work: settled ? work : null,
          resume,
          instruction,
          inputKind,
          parseMode,
        }).catch(() => {});
        return undefined;
      }, [work, resume, instruction, inputKind, parseMode, running, planning]);

      const loadCaptures = React.useCallback(async () => {
        try {
          const payload = await getJson('/captures');
          setCaptures(payload.captures || []);
        } catch (_) { /* 忽略 */ }
      }, []);

      React.useEffect(() => { void loadCaptures(); }, [loadCaptures]);

      /* 语义解析：查本机 Ollama 是否可达、配置的模型是否已安装 */
      const refreshPlanner = React.useCallback(async () => {
        try {
          const payload = await getJson('/plan/status');
          setPlanner(payload);
        } catch (error) {
          setPlanner({ enabled: true, reachable: false, hasModel: false, models: [], error: error.message });
        }
      }, []);

      React.useEffect(() => { void refreshPlanner(); }, [refreshPlanner]);

      const runAction = React.useCallback(async (body) => {
        await postJson('/action', body);
        if (mode === 'polling') {
          setTimeout(() => { void grabOnce(serial).catch(() => {}); }, 350);
        }
      }, [mode, grabOnce, serial]);

      /* --- 脚本录制：列表 / 骨架 / 保存 / 回放 / 删除 --- */
      const refreshScripts = React.useCallback(async () => {
        try {
          const payload = await getJson('/scripts');
          setScriptList(Array.isArray(payload.scripts) ? payload.scripts : []);
        } catch (error) {
          appendLog(false, tt('script.listFail'), error.message);
        }
      }, [appendLog]);

      React.useEffect(() => { void refreshScripts(); }, [refreshScripts]);

      /* 根据意图生成脚本骨架（复用文字规划，产出白名单动作序列）。 */
      const draftScript = async () => {
        const text = scriptIntent.trim();
        if (text === '' || scriptDrafting) return;
        setScriptDrafting(true);
        try {
          const plan = await postJson('/script/draft', { text, serial });
          const steps = Array.isArray(plan.steps) ? plan.steps : [];
          if (steps.length === 0) throw new Error(tt('plan.noSteps'));
          setScriptSteps((current) => current.concat(steps));
          appendLog(true, tt('script.drafted', { model: plan.model || '' }), `${steps.length} 步`);
        } catch (error) {
          appendLog(false, tt('script.draftFail'), error.message);
        } finally {
          setScriptDrafting(false);
        }
      };

      /* 保存当前步骤为脚本文件。 */
      const saveCurrentScript = async () => {
        const name = scriptName.trim();
        if (name === '' || scriptSteps.length === 0 || scriptBusy) return;
        setScriptBusy(true);
        try {
          const saved = await postJson('/scripts', { name, intent: scriptIntent, steps: scriptSteps });
          appendLog(true, tt('script.saved', { name: saved.name }), `${saved.steps} 步${saved.dropped > 0 ? ` · 丢弃 ${saved.dropped}` : ''}`);
          await refreshScripts();
        } catch (error) {
          appendLog(false, tt('script.saveFail'), error.message);
        } finally {
          setScriptBusy(false);
        }
      };

      /* 回放一个脚本：逐条执行它的步骤（复用 executeStep）。 */
      const replayScript = async (name) => {
        if (scriptBusy || !hasDevice) return;
        setScriptBusy(true);
        setScriptReplayName(name);
        try {
          const payload = await getJson(`/script?name=${encodeURIComponent(name)}`);
          const steps = Array.isArray(payload.script?.steps) ? payload.script.steps : [];
          if (steps.length === 0) throw new Error(tt('plan.noSteps'));
          appendLog(true, tt('script.replayStart', { name, steps: String(steps.length) }), '');
          let failed = 0;
          for (let index = 0; index < steps.length; index += 1) {
            const step = steps[index];
            const label = step.say || step.kind;
            try {
              const detail = await executeStep(label, step);
              appendLog(true, tt('script.replayStep', { index: String(index + 1), say: label }), detail);
            } catch (error) {
              failed += 1;
              appendLog(false, tt('script.replayStep', { index: String(index + 1), say: label }), error.message);
            }
            /* 打开应用要给一点时间让画面就绪。 */
            await new Promise((resolve) => setTimeout(resolve, step.kind === 'app' ? 2200 : 900));
          }
          appendLog(failed === 0, tt('script.replayDone', { name }), failed === 0 ? '' : tt('script.replayFailed', { failed: String(failed) }));
        } catch (error) {
          appendLog(false, tt('script.replayFail'), error.message);
        } finally {
          setScriptBusy(false);
          setScriptReplayName('');
        }
      };

      /* 删除一个脚本文件。 */
      const deleteOneScript = async (name) => {
        if (scriptBusy) return;
        setScriptBusy(true);
        try {
          await fetch(`${API}/scripts?name=${encodeURIComponent(name)}`, { method: 'DELETE', credentials: 'same-origin', cache: 'no-store' });
          appendLog(true, tt('script.deleted', { name }), '');
          await refreshScripts();
        } catch (error) {
          appendLog(false, tt('script.deleteFail'), error.message);
        } finally {
          setScriptBusy(false);
        }
      };

      /* 录制：把一次镜像手势转成 step 并追加（供手势回调调用）。 */
      const pushScriptStep = React.useCallback((step) => {
        setScriptSteps((current) => current.concat([step]));
      }, []);


      const canvasPoint = (event) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
          x: Math.round((event.clientX - rect.left) * scaleX),
          y: Math.round((event.clientY - rect.top) * scaleY),
        };
      };

      const onPointerDown = (event) => {
        if (!hasDevice || mode === 'error') return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = canvasPoint(event);
        pointerRef.current = { ...point, at: Date.now() };
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(async () => {
          const start = pointerRef.current;
          if (start === null) return;
          pointerRef.current = null;
          try {
            await runAction({ type: 'longpress', x: start.x, y: start.y, ms: 600, serial });
            appendLog(true, tt('screen.hint.hold'), `(${start.x}, ${start.y})`);
            if (scriptRec) pushScriptStep({ kind: 'longPress', x: start.x, y: start.y, ms: 600, say: `长按 (${start.x}, ${start.y})` });
          } catch (error) {
            appendLog(false, tt('screen.hint.hold'), error.message);
          }
        }, 650);
      };

      const onPointerMove = (event) => {
        const start = pointerRef.current;
        if (start !== null) {
          const point = canvasPoint(event);
          if (Math.abs(point.x - start.x) > 12 || Math.abs(point.y - start.y) > 12) {
            clearTimeout(holdTimerRef.current);
          }
        }
        /* 未按下时：检测鼠标是否落在某个标记元素框内，显示坐标提示。 */
        if (start === null && showMarksRef.current) {
          const point = canvasPoint(event);
          const list = uiElementsRef.current;
          const canvas = canvasRef.current;
          let hit = null;
          if (canvas !== null && Array.isArray(list)) {
            for (let i = list.length - 1; i >= 0; i -= 1) {
              const el = list[i];
              const x = el.fx * canvas.width;
              const y = el.fy * canvas.height;
              const w = (el.fw || 0) * canvas.width;
              const h = (el.fh || 0) * canvas.height;
              if (point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h) {
                hit = { index: i, label: el.label || '', x, y, w, h, cx: point.x, cy: point.y };
                break;
              }
            }
          }
          setHoverInfo(hit === null ? null : { ...hit, clientX: event.clientX, clientY: event.clientY });
        }
      };

      const onPointerLeave = () => {
        setHoverInfo(null);
      };

      const onPointerUp = async (event) => {
        clearTimeout(holdTimerRef.current);
        const start = pointerRef.current;
        pointerRef.current = null;
        if (start === null || !hasDevice) return;
        const point = canvasPoint(event);
        const dx = point.x - start.x;
        const dy = point.y - start.y;
        const held = Date.now() - start.at;
        try {
          if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
            if (held < 650) {
              await runAction({ type: 'tap', x: point.x, y: point.y, serial });
              appendLog(true, tt('screen.hint.tap'), `(${point.x}, ${point.y})`);
              if (scriptRec) pushScriptStep({ kind: 'tap', x: point.x, y: point.y, say: `点击 (${point.x}, ${point.y})` });
            }
          } else {
            await runAction({ type: 'swipe', x1: start.x, y1: start.y, x2: point.x, y2: point.y, ms: 260, serial });
            appendLog(true, tt('screen.hint.drag'), `(${start.x}, ${start.y}) → (${point.x}, ${point.y})`);
            if (scriptRec) pushScriptStep({ kind: 'swipe', x1: start.x, y1: start.y, x2: point.x, y2: point.y, ms: 260, say: `滑动 (${start.x}, ${start.y}) → (${point.x}, ${point.y})` });
          }
        } catch (error) {
          appendLog(false, tt('screen.hint.tap'), error.message);
        }
      };

      /* --- 指令执行 --- */
      const executeStep = async (step, command = parseStep(step)) => {
        switch (command.kind) {
          case 'app':
            await runAction({ type: 'app', package: command.package, serial });
            return command.package;
          case 'tap':
            await runAction({ type: 'tap', x: command.x, y: command.y, serial });
            return `tap (${command.x}, ${command.y})`;
          case 'swipe': {
            const horiz = command.dir === '左' || command.dir === '右';
            const span = (horiz ? width : height) * (command.percent / 100) || 400;
            const cx = width / 2 || 360;
            const cy = height / 2 || 800;
            const signs = { 上: [0, -1], 下: [0, 1], 左: [-1, 0], 右: [1, 0] };
            const [sx, sy] = signs[command.dir] || [0, -1];
            const x1 = Math.round(cx - sx * span / 2);
            const y1 = Math.round(cy - sy * span / 2);
            const x2 = Math.round(cx + sx * span / 2);
            const y2 = Math.round(cy + sy * span / 2);
            await runAction({ type: 'swipe', x1, y1, x2, y2, ms: 300, serial });
            return `swipe ${command.dir} ${command.percent}%`;
          }
          case 'text':
            await runAction({ type: 'text', text: command.text, serial });
            return `text "${command.text}"`;
          case 'key':
            await runAction({ type: 'key', key: command.key, serial });
            return `key ${command.key}`;
          case 'wake':
            await runAction({ type: 'wake', serial });
            return 'wake';
          case 'screenshot': {
            const payload = await postJson('/screenshot', { serial });
            setCaptures((rows) => [payload.capture, ...rows].slice(0, 8));
            return `screenshot → ${shortPath(payload.capture.path)}`;
          }
          case 'record': {
            const payload = await postJson('/record/start', { seconds: command.seconds, serial });
            setRecording({ id: payload.id, serial: payload.serial, startedAt: Date.now(), seconds: payload.seconds });
            return `record ${payload.seconds}s`;
          }
          case 'recordStop': {
            const payload = await postJson('/record/stop', {});
            setRecording(null);
            if (payload.capture) setRecordNote(payload.capture);
            return `record → ${shortPath(payload.capture && payload.capture.path)}`;
          }
          case 'quality':
            await postJson('/quality', { quality: command.quality });
            setQuality(command.quality);
            return `quality ${command.quality}`;
          case 'refresh':
            await refreshStatus(true);
            return 'refresh';
          default:
            throw new Error(tt('instruction.unknown', { step }));
        }
      };

      /**
       * Vision loop: screenshot -> one grounded action -> screenshot again.
       * Slower than a single plan (~4-8 s per step on the local model), but it
       * is the only mode that can follow a real flow (open app, tap the field
       * that is actually there, type, submit) without per-app automation.
       * @param raw - the user's instruction.
       * @param seed - optional checkpoint `{ history, lastHash, lastAction }`
       *   used by the 「继续」 button to carry on where the last run stopped.
       * @returns true when the loop ran at least one round (so no fallback).
       */
      const runAgentLoop = async (raw, seed = null) => {
        const history = Array.isArray(seed?.history) ? [...seed.history] : [];
        /* No step ceiling by default: the loop ends when the model says the
           goal is met, or says it does not know what the next action is.
           `planner.maxSteps > 0` is only for someone who wants a hard budget. */
        const limit = planner !== null && Number(planner.maxSteps) > 0 ? Number(planner.maxSteps) : Infinity;
        const budget = Number.isFinite(limit) ? limit : 0;
        let handled = false;
        /* A continuing run keeps its original start time so "elapsed" covers
           the whole task, not just the last hop. */
        const startedAt = seed !== null && Number(seed.startedAt) > 0 ? Number(seed.startedAt) : Date.now();
        setWork({ state: 'running', say: '', steps: history.length, total: budget, startedAt, ms: 0 });
        /* Loop guards: a model that keeps issuing the same no-op tap would
           otherwise burn the whole step budget (and the user's patience). */
        let lastHash = typeof seed?.lastHash === 'string' ? seed.lastHash : '';
        let lastAction = typeof seed?.lastAction === 'string' ? seed.lastAction : '';
        let repeatKey = '';
        let repeats = 0;
        let stalled = 0;
        /* Escalate to a reasoning round only when the cheap round is clearly
           stuck: same action twice, or a frame that did not change. Keeps the
           common case fast (~4 s) and pays for thinking only when needed. */
        let escalate = false;
        /* Every abnormal exit records both the visible status and a resumable
           checkpoint, so the card can say "已暂停" and offer 继续. */
        const stopHere = (state, say) => {
          setWork({ state, say, steps: history.length, total: budget, startedAt, ms: Date.now() - startedAt });
          setResume({ text: raw, history: [...history], lastHash, lastAction, startedAt });
          return true;
        };
        for (let index = 0; index < limit; index += 1) {
          /* 手动停止：等当前这一轮请求回来就退出，不打断在途请求。 */
          if (abortRef.current) {
            abortRef.current = false;
            appendLog(false, tt('agent.aborted'), '');
            traceNote('aborted', { steps: history.length });
            return stopHere('stopped', tt('agent.aborted'));
          }
          let round;
          try {
            round = await postJson('/agent/step', {
              text: raw,
              done: history,
              device: { width, height, model: device && device.model ? device.model : '' },
              serial,
              lastHash,
              lastAction,
              think: escalate,
              /* 双模型：宿主先用 mai-ui 扫屏定位元素，再让 qwen3.8 决策。 */
              uiModel: dual ? 'ahmadwaqar/mai-ui:latest' : '',
            });
          } catch (error) {
            if (!handled) {
              appendLog(false, tt('plan.usedLocal'), tt('plan.visionFallback', { message: error.message }));
              return false;
            }            appendLog(false, tt('agent.stepFail', { index: String(history.length + 1) }), error.message);
            traceNote('model-error', { step: history.length + 1, message: error.message });
            setWork({
              state: 'error',
              say: error.message,
              steps: history.length,
              total: budget,
              startedAt,
              ms: Date.now() - startedAt,
            });
            setResume({ text: raw, history: [...history], lastHash, lastAction, startedAt });
            return true;
          }
          handled = true;
          setPlanner((current) => (current === null ? current : { ...current, reachable: true, hasModel: true, vision: true }));
          /* 视觉模型扫出的元素（若走了双模型）回写到镜像标记层。 */
          const scanned = Array.isArray(round.elements) ? round.elements : [];
          uiElementsRef.current = scanned;
          setUiElements(scanned);
          if (round.done) {
            appendLog(true, tt('agent.finished', { steps: String(history.length) }), round.say || '');
            traceNote('done', { steps: history.length, say: round.say || '' });
            setWork({
              state: 'done',
              say: round.say || tt('work.doneHint'),
              steps: history.length,
              total: budget,
              startedAt,
              ms: Date.now() - startedAt,
            });
            setResume(null);
            return true;
          }
          /* The model itself asked to hand over: it can see the screen but
             cannot tell which action is right. Pause and say why, instead of
             probing with a guessed tap. */
          if (round.pause) {
            const why = String(round.say ?? '').trim() || tt('work.askHint');
            appendLog(false, tt('agent.askPause'), why);
            traceNote('ask-pause', { steps: history.length, say: why });
            return stopHere('ask', why);
          }
          const step = round.step;
          const label = step.say || step.kind;
          const ordinal = history.length + 1;
          setWork((current) => ({ ...current, state: 'running', say: label, steps: ordinal }));
          const signature = [
            step.kind,
            step.x ?? step.x1 ?? step.key ?? step.package ?? step.text ?? '',
            step.y ?? step.y2 ?? '',
          ].join(':');
          if (signature === repeatKey) repeats += 1;
          else { repeatKey = signature; repeats = 1; }
          stalled = round.unchanged === true ? stalled + 1 : 0;
          /* One more identical action, or one frozen frame, earns the next
             round a reasoning pass before the guard cuts the run. */
          escalate = repeats >= 2 || stalled >= 1;
          /* Same action four times, or a frame that stayed frozen through a
             reasoning round: the model is guessing. Stop and ask rather than
             keep spending rounds on a screen that is not moving. */
          if (repeats >= 4) {
            appendLog(false, tt('agent.loopStop', { say: label }), '');
            traceNote('repeat-ask', { steps: history.length, say: label });
            return stopHere('ask', tt('agent.loopStop', { say: label }));
          }
          if (stalled >= 2) {
            appendLog(false, tt('agent.stalled', { say: label }), '');
            traceNote('stalled-ask', { steps: history.length, say: label });
            return stopHere('ask', tt('agent.stalled', { say: label }));
          }
          let failure = '';
          try {
            const detail = await executeStep(label, step);
            appendLog(true, tt('agent.stepLog', { index: String(ordinal), say: label }), `${detail} · ${round.ms}ms${round.mode === 'thinking' ? ` · ${tt('agent.thinkTag')}` : ''}${round.image ? ` · ${round.image.width}x${round.image.height}` : ''}`);
          } catch (error) {
            failure = error.message;
            appendLog(false, tt('agent.stepLog', { index: String(ordinal), say: label }), failure);
          }
          /* Failures go into the history so the model stops retrying an action
             the device cannot perform (e.g. Chinese text without ADBKeyboard). */
          history.push({ kind: step.kind, say: label, ok: failure === '', error: failure });
          lastHash = typeof round.hash === 'string' ? round.hash : lastHash;
          lastAction = `${step.kind} · ${label}`;
          /* Launching an app needs a beat before the next screenshot is useful;
             taps and scrolls animate for well under a second. */
          await new Promise((resolve) => setTimeout(resolve, step.kind === 'app' ? 2500 : 1400));
        }
        /* Only reachable when someone set `maxAgentSteps > 0` on purpose. */
        appendLog(false, tt('agent.maxSteps', { steps: String(limit) }), '');
        traceNote('step-limit', { steps: history.length, limit });
        return stopHere('stopped', tt('agent.maxSteps', { steps: String(limit) }));
      };

      /** Carry on from the last checkpoint instead of retyping the goal. */
      const continueRun = async () => {
        if (resume === null || running) return;
        const seed = resume;
        setResume(null);
        abortRef.current = false;
        setRunning(true);
        setPlanning(true);
        try {
          appendLog(true, tt('agent.resumed', { steps: String(seed.history.length) }), '');
          await runAgentLoop(seed.text, seed);
          setInstruction('');
        } finally {
          setPlanning(false);
          setRunning(false);
        }
      };

      /* 「任务重置」：中止在途任务，清空状态/断点/输入，回到待工作。 */
      const resetTask = () => {
        abortRef.current = true;          // 若在跑，等当前轮返回即停
        setRunning(false);
        setPlanning(false);
        setResume(null);                   // 丢弃断点，不再显示「继续」
        setAdbConfirm(null);
        setInstruction('');                // 清空输入框
        setWork({ state: 'idle', say: '', steps: 0, total: 0, startedAt: 0, ms: 0 });
        uiElementsRef.current = [];        // 清掉镜像上的识别标记
        setUiElements([]);
        void postJson('/task/state', { clear: true }).catch(() => {}); // 清掉宿主快照
        appendLog(true, tt('work.resetLog'), '');
      };

      /* 「指令操作」模式：模型给 adb 意图，宿主映射成命令逐条执行；危险命令
         停下等人确认。用独立的 adbConfirm 队列，不污染看屏的 resume 断点。 */
      const runAdbFlow = async (raw, queue = null, confirmedIndex = -1) => {
        const startedAt = queue === null ? Date.now() : (Number(queue.startedAt) || Date.now());
        setRunning(true);
        setPlanning(true);
        setWork({ state: 'running', say: '', steps: 0, total: 0, startedAt, ms: 0 });
        let commands = queue === null ? null : queue.commands;
        try {
          if (commands === null) {
            const plan = await postJson('/plan/adb', { text: raw, serial });
            commands = Array.isArray(plan.commands) ? plan.commands : [];
            appendLog(true, tt('plan.usedModel', { model: plan.model || '' }), `${plan.ms}ms · ${commands.length} 条${plan.dropped > 0 ? ` · 丢弃 ${plan.dropped}` : ''}`);
            if (commands.length === 0) throw new Error(tt('plan.noSteps'));
          }
          let failed = 0;
          let lastLabel = '';
          for (let index = 0; index < commands.length; index += 1) {
            const command = commands[index];
            setWork((current) => ({ ...current, say: command.say, steps: index + 1, total: commands.length }));
            /* 危险命令先停下，等人确认；确认后带着 confirmed 标记从这条继续。 */
            if (command.dangerous && index !== confirmedIndex) {
              setAdbConfirm({ commands, index, startedAt, text: raw });
              setWork({
                state: 'ask',
                say: tt('adb.needConfirm', { say: command.say }),
                steps: index,
                total: commands.length,
                startedAt,
                ms: Date.now() - startedAt,
              });
              return;
            }
            try {
              const result = await postJson('/adb/run', {
                argv: command.argv,
                dangerous: command.dangerous,
                confirmed: command.dangerous,
                say: command.say,
              });
              if (result.pending === true) {
                /* 宿主拒绝未确认的危险命令——理论上到不了这里，但兜底停下。 */
                setAdbConfirm({ commands, index, startedAt, text: raw });
                setWork({ state: 'ask', say: tt('adb.needConfirm', { say: command.say }), steps: index, total: commands.length, startedAt, ms: Date.now() - startedAt });
                return;
              }
              appendLog(true, command.say, command.argv.slice(-4).join(' '));
              lastLabel = command.say;
            } catch (error) {
              appendLog(false, command.say, error.message);
              failed += 1;
              lastLabel = error.message;
            }
            await new Promise((resolve) => setTimeout(resolve, 400));
          }
          setAdbConfirm(null);
          setWork({
            state: failed === 0 ? 'done' : 'stopped',
            say: failed === 0 ? (lastLabel || tt('work.doneHint')) : tt('work.someFailed', { count: String(failed) }),
            steps: commands.length,
            total: commands.length,
            startedAt,
            ms: Date.now() - startedAt,
          });
          if (failed === 0) setInstruction('');
        } catch (error) {
          setAdbConfirm(null);
          setWork({ state: 'error', say: error.message, steps: 0, total: 0, startedAt, ms: Date.now() - startedAt });
        } finally {
          setPlanning(false);
          setRunning(false);
        }
      };

      /* 用户点「确认执行」：带着 confirmed 标记从危险命令那条继续。 */
      const confirmAdb = async () => {
        if (adbConfirm === null || running) return;
        const pending = adbConfirm;
        setAdbConfirm(null);
        await runAdbFlow(pending.text, { commands: pending.commands, startedAt: pending.startedAt }, pending.index);
      };

      const runInstruction = async () => {
        const raw = instruction.trim();
        if (raw === '' || running) return;
        /* 「指令操作」模式走独立的 adb 流程。 */
        if (parseMode === 'adb') {
          await runAdbFlow(raw);
          return;
        }
        /* 停在「待确认」时再打一句话，多半是在回答模型的问题（例如它问删哪个
           应用，你回「计算器」）：接着原来的进度走，别把走过的步骤丢掉重来。
           补充说明只保留最新一条，避免指令越滚越长。 */
        const pending = work.state === 'ask' && resume !== null ? resume : null;
        const goal = pending === null
          ? raw
          : `${String(pending.text).split('（用户补充：')[0]}（用户补充：${raw}）`;
        /* 记录本次开始执行的提示词（去重：与上一条完全相同则不重复记）。 */
        const entry = { goal, mode: parseMode, dual, at: Date.now() };
        setPromptHistory((prev) => {
          const trimmed = prev.length > 0 && prev[0].goal === goal ? prev : [entry, ...prev];
          const next = trimmed.slice(0, MAX_PROMPT_HISTORY);
          savePromptHistory(next);
          return next;
        });
        setResume(null);
        abortRef.current = false;
        setRunning(true);
        setPlanning(semantic);
        const startedAt = Date.now();
        /* The vision loop overwrites this with its own step budget; the plan
           and rules paths fill in their step count once they know it. */
        setWork({ state: 'running', say: '', steps: 0, total: 0, startedAt, ms: 0 });
        let entries = [];
        let agentHandled = false;
        /* How many steps failed; when non-zero we keep the typed instruction so
           the user can read the log, tweak it, and run again. */
        let failed = 0;

        try {
          /* Vision: drive it one grounded action at a time from the live
             screen. Otherwise fall back to the instant local rules. */
          if (vision) {
            agentHandled = await runAgentLoop(goal, pending === null ? null : { ...pending, text: goal });
          }
        } finally {
          setPlanning(false);
        }

        if (!agentHandled) {
          if (entries.length === 0) {
            entries = splitSteps(raw).map((step) => ({ text: step, command: parseStep(step) }));
          }
          setWork((current) => ({ ...current, state: 'running', total: entries.length }));
          let lastLabel = '';
          for (const [index, entry] of entries.entries()) {
            setWork((current) => ({ ...current, say: entry.text, steps: index + 1 }));
            try {
              const label = await executeStep(entry.text, entry.command);
              appendLog(true, entry.text, label);
              lastLabel = label;
            } catch (error) {
              appendLog(false, entry.text, error.message);
              failed += 1;
              lastLabel = error.message;
            }
            await new Promise((resolve) => setTimeout(resolve, 650));
          }
          setWork({
            state: failed === 0 ? 'done' : 'stopped',
            say: failed === 0 ? (lastLabel || tt('work.doneHint')) : tt('work.someFailed', { count: String(failed) }),
            steps: entries.length,
            total: entries.length,
            startedAt,
            ms: Date.now() - startedAt,
          });
        }
        setRunning(false);
        /* 有失败步时保留原指令，方便用户看清后改一改再执行。 */
        if (failed === 0) setInstruction('');
      };

      const pressKey = async (key, label) => {
        try {
          await runAction({ type: 'key', key, serial });
          appendLog(true, label, `key ${key}`);
        } catch (error) {
          appendLog(false, label, error.message);
        }
      };

      const sendText = async () => {
        const payload = instruction.trim();
        if (payload === '' || running) return;
        setRunning(true);
        try {
          await runAction({ type: 'text', text: payload, serial });
          appendLog(true, tt('text.send'), payload);
          /* 只有发送成功才清空，失败时把文字留着让用户改或重试。 */
          setInstruction('');
        } catch (error) {
          appendLog(false, tt('text.send'), error.message);
        } finally {
          setRunning(false);
        }
      };

      const takeScreenshot = async () => {
        if (captureBusy) return;
        setCaptureBusy(true);
        try {
          const payload = await postJson('/screenshot', { serial });
          setCaptures((rows) => [payload.capture, ...rows].slice(0, 8));
          appendLog(true, tt('capture.shot'), shortPath(payload.capture.path));
        } catch (error) {
          appendLog(false, tt('capture.shot'), error.message);
        }
        setCaptureBusy(false);
      };

      const startRecording = async () => {
        if (recordBusy || recording !== null) return;
        setRecordBusy(true);
        setRecordNote(null);
        try {
          const payload = await postJson('/record/start', { seconds: recordSeconds, serial });
          setRecording({ id: payload.id, serial: payload.serial, startedAt: Date.now(), seconds: payload.seconds });
          appendLog(true, tt('capture.record'), `${payload.seconds}s · ${payload.serial}`);
        } catch (error) {
          appendLog(false, tt('capture.record'), error.message);
        }
        setRecordBusy(false);
      };

      const stopRecording = async () => {
        if (recordBusy || recording === null) return;
        setRecordBusy(true);
        try {
          const payload = await postJson('/record/stop', {});
          setRecording(null);
          if (payload.capture) {
            setRecordNote(payload.capture);
            appendLog(true, tt('capture.stop'), shortPath(payload.capture.path));
          }
          await loadCaptures();
        } catch (error) {
          appendLog(false, tt('capture.stop'), error.message);
        }
        setRecordBusy(false);
      };

      const pushFile = async () => {
        if (uploadBusy) return;
        if (uploadFile === null) {
          setUploadNote({ ok: false, text: tt('upload.noFile') });
          return;
        }
        if (uploadFile.size > 64 * 1024 * 1024) {
          setUploadNote({ ok: false, text: tt('upload.tooBig') });
          return;
        }
        setUploadBusy(true);
        setUploadNote(null);
        try {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('读取文件失败'));
            reader.readAsDataURL(uploadFile);
          });
          const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
          const payload = await postJson('/push', { name: uploadFile.name, data: base64, destination: uploadDest, serial });
          setUploadNote({ ok: true, text: tt('upload.done', { remote: payload.pushed.remote, bytes: formatBytes(payload.pushed.bytes) }) });
          appendLog(true, tt('upload.push'), `${uploadFile.name} → ${payload.pushed.remote}`);
          setUploadFile(null);
        } catch (error) {
          setUploadNote({ ok: false, text: error.message });
          appendLog(false, tt('upload.push'), error.message);
        }
        setUploadBusy(false);
      };

      const copyPath = async (path) => {
        try {
          await navigator.clipboard.writeText(path);
          setCopiedPath(path);
          setTimeout(() => setCopiedPath(''), 1600);
        } catch (_) { /* 剪贴板不可用时忽略 */ }
      };

      const changeQuality = async (next) => {
        setQuality(next);
        try {
          await postJson('/quality', { quality: next });
          appendLog(true, tt('quality.label'), next);
          if (mode === 'video') setMirrorNonce((value) => value + 1); // 服务端会重启编码器，重开视频流
        } catch (error) {
          appendLog(false, tt('quality.label'), error.message);
        }
      };

      const selectDevice = async (next) => {
        setSerial(next);
        try {
          await postJson('/select', { serial: next });
          await refreshStatus(true);
        } catch (error) {
          appendLog(false, tt('device.label'), error.message);
        }
      };

      /* 设备没连上时镜像区显示「激活」按钮；用户插好线点一下：
         1) 先强制拉起/重启本机 MobileControl 服务（懒启动的服务可能没起，
            或已经僵死，这一步等价于「重连服务」按钮，能把它救活）；
         2) 再刷新设备列表；
         3) 检测到设备就 bump mirrorNonce 强制重连镜像，没检测到就明确
            记一条日志告诉用户「仍未检测到设备」。全程非静默，失败必有反馈。 */
      const activateDevice = async () => {
        if (activating) return;
        setActivating(true);
        try {
          await postJson('/restart', {});
          const payload = await getJson('/status');
          const selected = payload && payload.status && payload.status.selected
            ? payload.status.selected
            : '';
          setStatus(payload.status);
          setStatusError('');
          if (selected !== '') {
            setSerial((current) => (current === '' ? selected : current));
            setMirrorNonce((value) => value + 1); // 强制画面 effect 重跑去连镜像
            appendLog(true, tt('screen.activate'), selected);
          } else {
            appendLog(false, tt('screen.activate'), tt('screen.noDeviceYet'));
          }
        } catch (error) {
          appendLog(false, tt('screen.activate'), error && error.message ? error.message : String(error));
          /* 即使 restart 失败，也再刷一次状态，尽力拿到设备 */
          await refreshStatus(true).catch(() => {});
        } finally {
          setActivating(false);
        }
      };

      const statusPill = (() => {
        if (bootError !== '') return { dot: 'bad', text: tt('status.offline') };
        if (health === null) return { dot: 'busy', text: tt('status.checking') };
        if (health.binary === false) return { dot: 'bad', text: tt('status.missingBinary') };
        if (statusError !== '') return { dot: 'bad', text: tt('status.offline') };
        if (!hasDevice) return { dot: 'busy', text: tt('status.noDevice') };
        return { dot: 'ok', text: tt('status.ready') };
      })();

      const elapsed = recording === null ? 0 : Math.max(0, Math.round((Date.now() - recording.startedAt) / 1000));

      const hasFrame = mode === 'video' || mode === 'polling';

      const overlay = (() => {
        if (hasFrame) return null;
        const title = !hasDevice
          ? tt('screen.waiting')
          : (mode === 'error' ? tt('screen.error') : tt('screen.connecting'));
        const sub = !hasDevice
          ? tt('screen.waitingHint')
          : (mode === 'error' ? modeNote : modeNote);
        /* 设备没连上时，别让镜子一直转圈干等：给一个「激活」按钮，
           用户插好线之后点一下，立即重启本机服务、刷新设备列表并把画面拉起来。 */
        const activateBtn = !hasDevice
          ? h('button', {
            className: 'dmm-btn dmm-btn--primary',
            disabled: activating,
            onClick: activateDevice,
          }, activating ? tt('screen.activating') : tt('screen.activate'))
          : null;
        return h('div', { className: 'dmm-overlay' },
          mode !== 'error' && hasDevice ? h('div', { className: 'dmm-spinner' }) : null,
          h('p', { className: 'dmm-overlay-title' }, title),
          sub ? h('p', { className: 'dmm-overlay-sub' }, sub) : null,
          activateBtn,
        );
      })();

      /* 悬停在标记元素上时，显示该元素的坐标提示（跟随鼠标）。 */
      const hoverTip = hoverInfo === null ? null : (() => {
        const canvas = canvasRef.current;
        const W = canvas ? canvas.width : 0;
        const H = canvas ? canvas.height : 0;
        const cx = hoverInfo.cx;
        const cy = hoverInfo.cy;
        return h('div', {
          className: 'dmm-hovertip',
          style: { left: `${hoverInfo.clientX + 14}px`, top: `${hoverInfo.clientY + 14}px` },
        },
          h('div', { className: 'dmm-hovertip-title' }, `${hoverInfo.index + 1}. ${hoverInfo.label}`),
          h('div', { className: 'dmm-hovertip-row' },
            tt('marks.norm'), ': ',
            `fx=${(cx / Math.max(W, 1)).toFixed(3)} fy=${(cy / Math.max(H, 1)).toFixed(3)}`,
          ),
          h('div', { className: 'dmm-hovertip-row' },
            tt('marks.px'), ': ',
            `${cx}, ${cy}`,
          ),
        );
      })();

      const planState = (() => {
        if (planner === null) return { tone: 'idle', text: tt('plan.checking') };
        if (planner.enabled === false) return { tone: 'idle', text: tt('plan.disabled') };
        if (planner.reachable !== true) return { tone: 'bad', text: tt('plan.offline') };
        if (planner.hasModel !== true) return { tone: 'bad', text: tt('plan.missing', { model: planner.model || '' }) };
        if (!semantic) return { tone: 'idle', text: tt('plan.offHint') };
        if (parseMode === 'adb') return { tone: 'ok', text: tt('plan.adbModel', { model: planner.model || '' }) };
        if (vision && planner.vision === true) return { tone: 'ok', text: tt('plan.visionModel', { model: planner.model || '' }) };
        if (vision) return { tone: 'bad', text: tt('plan.noVision', { model: planner.model || '' }) };
        return { tone: 'ok', text: tt('plan.visionModel', { model: planner.model || '' }) };
      })();

      /* 工作状态：待工作 → 解析中 → 工作中 → 已完成 / 待确认 / 已暂停 / 出错。
         它替代了右侧原来那份设备信息（顶部状态行已经有一份）。 */
      const workView = (() => {
        if (planning && work.steps === 0) return { tone: 'busy', label: tt('work.planning'), detail: work.say || tt('work.planningHint') };
        if (running) return { tone: 'busy', label: tt('work.executing'), detail: work.say || tt('work.executingHint') };
        if (work.state === 'done') return { tone: 'ok', label: tt('work.done'), detail: work.say || tt('work.doneHint') };
        if (work.state === 'error') return { tone: 'bad', label: tt('work.failed'), detail: work.say };
        /* 模型自己说拿不准，或护栏判断它在猜：都停在原地等人看一眼。 */
        if (work.state === 'ask') return { tone: 'warn', label: tt('work.ask'), detail: work.say || tt('work.askHint') };
        if (work.state === 'stopped' || resume !== null) {
          return { tone: 'warn', label: tt('work.stopped'), detail: work.say || tt('work.pausedHint') };
        }
        return { tone: 'idle', label: tt('work.idle'), detail: tt('work.idleHint') };
      })();

      const workElapsed = work.startedAt === 0
        ? 0
        : Math.max(0, Math.round(((running || planning ? clock : work.startedAt + work.ms) - work.startedAt) / 1000));
      const workPercent = work.total > 0 ? Math.min(100, Math.round((work.steps / work.total) * 100)) : 0;
      const workSteps = work.total > 0
        ? tt('work.steps', { steps: String(work.steps) })
        : (work.steps > 0 ? tt('work.steps', { steps: String(work.steps) }) : '');
      const workLimit = work.total > 1 && work.state !== 'done' ? tt('work.limit', { total: String(work.total) }) : '';

      return h('div', { className: 'dmm-root' },
        h('div', { className: 'dmm-wrap' },
          h('p', { className: 'dmm-kicker' }, tt('panel.kicker')),
          h('h1', { className: 'dmm-title' }, tt('panel.title')),
          h('p', { className: 'dmm-sub' }, tt('panel.subtitle')),
          h('div', { className: 'dmm-status' },
            h('span', { className: `dmm-dot dmm-dot--${statusPill.dot}` }),
            h('span', null, statusPill.text),
            hasDevice ? h('span', { className: 'dmm-pill' }, tt('pill.device', { serial: status.selected })) : null,
            h('span', { className: 'dmm-pill' }, tt('pill.local')),
            bootError !== '' ? h('span', { className: 'dmm-errorline' }, bootError) : null,
          ),

          h('div', { className: 'dmm-grid' },
            /* ---------------- 左侧：屏幕 ---------------- */
            h('div', { className: 'dmm-stage' },
              h('div', {
                className: 'dmm-screenbox',
                style: hasFrame ? null : { minHeight: 320 },
              },
                h('canvas', {
                  ref: canvasRef,
                  className: 'dmm-screen',
                  width: 360,
                  height: 800,
                  tabIndex: 0,
                  style: hasFrame ? null : { display: 'none' },
                  onPointerDown,
                  onPointerMove,
                  onPointerUp,
                  onPointerLeave,
                }),
                overlay,
                hoverTip,
              ),
              h('div', { className: 'dmm-metrics' },
                h('span', { className: 'dmm-metric' },
                  h('b', null, mode === 'video' ? String(fps) : (mode === 'polling' ? '1' : '0')),
                  h('em', null, 'fps'),
                ),
                h('span', { className: 'dmm-sep' }),
                h('span', { className: 'dmm-metric' }, h('b', null, resolution || '—')),
                h('span', { className: 'dmm-sep' }),
                h('span', { className: 'dmm-metric' },
                  h('b', null, mode === 'video' ? '实时镜像' : (mode === 'polling' ? tt('screen.polling') : '—')),
                ),
                h('span', { className: 'dmm-hints' },
                  h('span', null, h('kbd', null, tt('screen.hint.tap'))),
                  h('span', null, h('kbd', null, tt('screen.hint.drag'))),
                  h('span', null, h('kbd', null, tt('screen.hint.hold'))),
                ),
              ),
              h('div', { className: 'dmm-row' },
                h('button', {
                  className: `dmm-btn${live ? ' dmm-btn--primary' : ''}`,
                  disabled: !hasDevice,
                  onClick: () => setLive((value) => !value),
                }, live ? tt('screen.live') : tt('screen.liveOff')),
                h('button', {
                  className: 'dmm-btn',
                  disabled: !hasDevice,
                  onClick: () => { void grabOnce(serial).catch((error) => appendLog(false, tt('screen.live'), error.message)); },
                }, tt('device.refresh')),
                h('button', {
                  className: 'dmm-btn',
                  disabled: !hasDevice || uiElements.length === 0,
                  title: tt('marks.toggleHint'),
                  onClick: () => setShowMarks((value) => !value),
                }, showMarks ? tt('marks.hide') : tt('marks.show')),
              ),
              mode === 'polling' ? h('p', { className: 'dmm-hint' }, tt('screen.hint.snapshot')) : null,
            ),

            /* ---------------- 右侧：操作 ---------------- */
            h('div', { className: 'dmm-ops' },
              /* 工作状态与指令输入合成一张卡：模型要确认时，用户的「回复」就是
                 在这里再写一句话，状态和输入框本来就不该分成两块。运行中主按钮
                 不可用，停下后同一个位置出现「继续」。 */
              h('section', { className: 'dmm-card dmm-card--work' },
                h('div', { className: 'dmm-cardhead' },
                  h('h3', { className: 'dmm-cardtitle' }, tt('work.title')),
                  h('span', { className: 'dmm-cardhead-actions' },
                    h('button', {
                      className: 'dmm-btn dmm-btn--ghost',
                      type: 'button',
                      title: tt('work.resetHint'),
                      onClick: resetTask,
                    }, tt('work.reset')),
                    running || planning ? h('span', { className: 'dmm-spinner dmm-spinner--inline' }) : null,
                  ),
                ),
                h('div', { className: 'dmm-work' },
                  h('span', { className: `dmm-workdot dmm-workdot--${workView.tone}` }),
                  h('div', { className: 'dmm-workbody' },
                    h('p', { className: 'dmm-worklabel' }, workView.label),
                    h('p', { className: 'dmm-workdetail' }, workView.detail),
                  ),
                ),
                work.total > 0 && work.steps > 0 && workView.tone === 'busy'
                  ? h('div', { className: 'dmm-workbar' }, h('i', { style: { width: `${workPercent}%` } }))
                  : null,
                workSteps === '' && workElapsed === 0
                  ? null
                  : h('div', { className: 'dmm-workmeta' },
                    workSteps === '' ? null : h('span', null, workSteps),
                    workLimit === '' ? null : h('span', null, workLimit),
                    workElapsed === 0 ? null : h('span', null, tt('work.elapsed', { seconds: String(workElapsed) })),
                  ),
                h('div', { className: 'dmm-split' }),
                h('div', { className: 'dmm-row' },
                  h('span', { className: 'dmm-muted' }, tt('instruction.label')),
                  h('span', { className: 'dmm-segmented dmm-segmented--sm', role: 'group', title: tt('input.kind.hint') },
                    ['op', 'text'].map((id) => h('button', {
                      key: id,
                      type: 'button',
                      className: inputKind === id ? 'on' : '',
                      'aria-pressed': inputKind === id ? 'true' : 'false',
                      title: tt(`input.kind.${id}.hint`),
                      onClick: () => { setInputKind(id); setAdbConfirm(null); },
                    }, tt(`input.kind.${id}`))),
                  ),
                ),
                h('textarea', {
                  className: 'dmm-textarea',
                  value: instruction,
                  placeholder: resume !== null
                    ? tt('instruction.placeholderResume')
                    : (inputKind === 'text' ? tt('instruction.placeholderText') : tt('instruction.placeholder')),
                  onChange: (event) => setInstruction(event.target.value),
                  onKeyDown: (event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                      event.preventDefault();
                      if (inputKind === 'text') void sendText();
                      else void runInstruction();
                    } else if (event.key === 'Enter' && !event.shiftKey && inputKind === 'text') {
                      event.preventDefault();
                      void sendText();
                    }
                  },
                }),
                h('div', { className: 'dmm-row' },
                  h('button', {
                    className: 'dmm-btn dmm-btn--primary',
                    disabled: running || planning || !hasDevice || (adbConfirm === null && instruction.trim() === '' && (inputKind === 'op' ? resume === null : true)),
                    title: inputKind === 'text' ? '' : (adbConfirm !== null ? tt('adb.confirmHint') : (resume !== null ? tt('work.resumeHint') : '')),
                    onClick: () => {
                      /* 危险命令待确认：先确认这条，再走剩余队列 */
                      if (adbConfirm !== null) { void confirmAdb(); return; }
                      /* 文字输入模式直接把文本送进手机；操作模式区分「补充条件」和「原样继续」 */
                      if (inputKind === 'text') { void sendText(); return; }
                      if (instruction.trim() !== '') void runInstruction();
                      else if (resume !== null) void continueRun();
                    },
                  }, running || planning
                    ? (inputKind === 'text' ? tt('instruction.running') : (vision ? tt('plan.looking') : tt('plan.thinking')))
                    : (inputKind === 'text'
                      ? tt('text.send')
                      : (adbConfirm !== null
                        ? tt('adb.confirm')
                        : (resume !== null ? tt('instruction.continue') : tt('instruction.run'))))),
                  running || planning ? h('span', { className: 'dmm-spinner dmm-spinner--inline' }) : null,
                  running || planning
                    ? h('button', {
                      className: 'dmm-btn',
                      type: 'button',
                      title: tt('work.abortHint'),
                      onClick: () => {
                        abortRef.current = true;
                        appendLog(false, tt('work.abort'), tt('work.abortHint'));
                      },
                    }, tt('work.abort'))
                    : null,
                  inputKind === 'op' ? h('span', { className: `dmm-planstate dmm-planstate--${planState.tone}` }, planState.text) : null,
                ),
                inputKind === 'text'
                  ? h('p', { className: 'dmm-hint' }, tt('input.kind.text.hint'))
                  : h('div', { className: 'dmm-row' },
                    h('span', { className: 'dmm-segmented dmm-segmented--sm', role: 'group', title: tt('mode.hint') },
                      MODES.map((id) => h('button', {
                        key: id,
                        type: 'button',
                        className: parseMode === id ? 'on' : '',
                        'aria-pressed': parseMode === id ? 'true' : 'false',
                        title: tt(`mode.${id}.hint`),
                        onClick: () => { setParseMode(id); writeModePref(id); if (id !== 'adb') setAdbConfirm(null); },
                      }, tt(`mode.${id}`))),
                    ),
                    parseMode === 'vision'
                      ? h('button', {
                        className: `dmm-btn${dual ? ' dmm-btn--primary' : ' dmm-btn--ghost'}`,
                        type: 'button',
                        title: tt('dual.hint'),
                        onClick: () => { const next = !dual; setDual(next); writeDualPref(next); },
                      }, dual ? tt('dual.on') : tt('dual.off'))
                      : null,
                    h('p', { className: 'dmm-hint' }, adbConfirm !== null ? tt('adb.confirmHint') : (work.state === 'ask' ? tt('work.askHow') : tt(`mode.${parseMode}.hint`))),
                  ),
              ),

              /* 最近提示词：保留最近 7 次开始执行时的指令，点击回填。 */
              promptHistory.length === 0
                ? null
                : h('section', { className: 'dmm-card' },
                  h('div', { className: 'dmm-cardhead' },
                    h('h3', { className: 'dmm-cardtitle' }, tt('history.title')),
                    h('button', {
                      className: 'dmm-btn dmm-btn--ghost',
                      type: 'button',
                      title: tt('history.clear'),
                      onClick: () => { setPromptHistory([]); savePromptHistory([]); },
                    }, tt('history.clear')),
                  ),
                  h('ul', { className: 'dmm-history' },
                    promptHistory.map((item, index) => {
                      const modeLabel = tt(`mode.${item.mode === 'adb' ? 'adb' : (item.mode === 'rules' ? 'rules' : 'vision')}`);
                      const dualTag = item.dual ? tt('dual.on') : '';
                      const time = new Date(item.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                      return h('li', {
                        key: `${item.at}-${index}`,
                        className: 'dmm-history-item',
                        title: tt('history.reuse'),
                        onClick: () => { setInstruction(item.goal); setInputKind('op'); },
                      },
                        h('span', { className: 'dmm-history-goal' }, item.goal),
                        h('span', { className: 'dmm-history-meta' }, `${modeLabel}${dualTag ? ` · ${dualTag}` : ''} · ${time}`),
                      );
                    }),
                  ),
                ),

              h('section', { className: 'dmm-card' },
                h('div', { className: 'dmm-cardhead' },
                  h('h3', { className: 'dmm-cardtitle' }, tt('device.card')),
                  !status || !status.devices || status.devices.length <= 1
                    ? null
                    : h('span', { className: 'dmm-muted' }, String(status.devices.length)),
                ),
                /* 只有多台设备时才需要选择；单机时这行是纯重复 */
                !status || !status.devices || status.devices.length <= 1
                  ? null
                  : h('select', {
                    className: 'dmm-select',
                    value: serial,
                    onChange: (event) => { void selectDevice(event.target.value); },
                  },
                    status.devices.map((entry) => h('option', { key: entry.serial, value: entry.serial },
                      `${entry.serial}${entry.model ? ` · ${entry.model}` : ''}`)),
                  ),
                h('div', { className: 'dmm-row' },
                  h('span', { className: 'dmm-muted' }, tt('quality.label')),
                  h('span', { className: 'dmm-segmented' },
                    ['smooth', 'standard', 'high', 'native'].map((id) => h('button', {
                      key: id,
                      className: quality === id ? 'on' : '',
                      onClick: () => { void changeQuality(id); },
                    }, tt(`quality.${id}`))),
                  ),
                ),
                h('div', { className: 'dmm-row' },
                  h('button', { className: 'dmm-btn', disabled: !hasDevice, onClick: () => { void pressKey('wakeup', tt('device.wake')); } }, tt('device.wake')),
                  h('button', {
                    className: 'dmm-btn',
                    onClick: async () => {
                      try {
                        await postJson('/restart', {});
                        appendLog(true, tt('device.restart'), '');
                        await refreshStatus(true);
                      } catch (error) {
                        appendLog(false, tt('device.restart'), error.message);
                      }
                    },
                  }, tt('device.restart')),
                ),
              ),

              h('section', { className: 'dmm-card' },
                h('h3', { className: 'dmm-cardtitle' }, tt('keys.label')),
                h('div', { className: 'dmm-keygrid' },
                  [
                    ['back', 'keys.back'],
                    ['home', 'keys.home'],
                    ['recents', 'keys.recents'],
                    ['power', 'keys.power'],
                    ['volume_up', 'keys.volumeUp'],
                    ['volume_down', 'keys.volumeDown'],
                    ['notification', 'keys.notification'],
                    ['menu', 'keys.menu'],
                  ].map(([key, labelKey]) => h('button', {
                    key,
                    className: 'dmm-key',
                    disabled: !hasDevice,
                    onClick: () => { void pressKey(key, tt(labelKey)); },
                  },
                  h(KeyGlyph, { kind: key === 'volume_up' ? 'volumeUp' : (key === 'volume_down' ? 'volumeDown' : key) }),
                  h('span', null, tt(labelKey)),
                  )),
                ),
              ),

              h('section', { className: 'dmm-card dmm-card--script' },
                h('div', { className: 'dmm-cardhead' },
                  h('h3', { className: 'dmm-cardtitle' }, tt('script.title')),
                  scriptRec ? h('span', { className: 'dmm-spinner dmm-spinner--inline' }) : null,
                ),
                /* 录制开关 + 意图 → 骨架 */
                h('div', { className: 'dmm-row' },
                  h('button', {
                    className: `dmm-btn${scriptRec ? ' dmm-btn--danger' : ''}`,
                    disabled: !hasDevice,
                    title: scriptRec ? tt('script.stopHint') : tt('script.recHint'),
                    onClick: () => setScriptRec((current) => !current),
                  }, scriptRec ? tt('script.recording') : tt('script.start')),
                  scriptRec ? h('span', { className: 'dmm-muted' }, tt('script.recHint')) : null,
                ),
                h('input', {
                  className: 'dmm-input',
                  value: scriptIntent,
                  placeholder: tt('script.intentPlaceholder'),
                  onChange: (event) => setScriptIntent(event.target.value),
                }),
                h('div', { className: 'dmm-row' },
                  h('button', {
                    className: 'dmm-btn',
                    disabled: scriptDrafting || scriptIntent.trim() === '',
                    onClick: () => { void draftScript(); },
                  }, scriptDrafting ? tt('script.drafting') : tt('script.draft')),
                ),
                /* 当前步骤列表 */
                scriptSteps.length === 0
                  ? h('p', { className: 'dmm-hint' }, tt('script.empty'))
                  : h('div', { className: 'dmm-scriptsteps' },
                    scriptSteps.map((step, index) => h('div', { key: index, className: 'dmm-scriptstep' },
                      h('span', { className: 'dmm-scriptidx' }, String(index + 1)),
                      h('span', { className: 'dmm-scriptsay' }, step.say || step.kind),
                      h('button', {
                        className: 'dmm-btn dmm-btn--ghost',
                        title: tt('script.removeStep'),
                        onClick: () => setScriptSteps((current) => current.filter((_, i) => i !== index)),
                      }, tt('script.remove')),
                    )),
                  ),
                /* 保存区 */
                h('div', { className: 'dmm-row' },
                  h('input', {
                    className: 'dmm-input',
                    value: scriptName,
                    placeholder: tt('script.namePlaceholder'),
                    onChange: (event) => setScriptName(event.target.value),
                  }),
                  h('button', {
                    className: 'dmm-btn dmm-btn--primary',
                    disabled: scriptBusy || scriptName.trim() === '' || scriptSteps.length === 0,
                    onClick: () => { void saveCurrentScript(); },
                  }, scriptBusy && scriptReplayName === '' ? tt('script.saving') : tt('script.save')),
                  h('button', {
                    className: 'dmm-btn',
                    disabled: scriptSteps.length === 0,
                    onClick: () => { setScriptSteps([]); setScriptIntent(''); setScriptName(''); },
                  }, tt('script.clear')),
                ),
                /* 脚本库 */
                scriptList.length === 0
                  ? null
                  : h('div', { className: 'dmm-scriptlist' },
                    h('p', { className: 'dmm-scriptlisthead' }, tt('script.library')),
                    scriptList.map((row) => h('div', { key: row.name, className: 'dmm-scriptitem' },
                      h('div', { className: 'dmm-scriptmeta' },
                        h('span', { className: 'dmm-scriptname' }, row.name),
                        h('span', { className: 'dmm-muted' }, `${row.steps} 步`),
                        row.intent === '' ? null : h('span', { className: 'dmm-scriptintent' }, row.intent),
                      ),
                      h('div', { className: 'dmm-row dmm-row--tight' },
                        h('button', {
                          className: 'dmm-btn',
                          disabled: scriptBusy || !hasDevice,
                          onClick: () => { void replayScript(row.name); },
                        }, scriptReplayName === row.name ? tt('script.replaying') : tt('script.replay')),
                        h('button', {
                          className: 'dmm-btn dmm-btn--ghost',
                          disabled: scriptBusy,
                          onClick: () => { void deleteOneScript(row.name); },
                        }, tt('script.delete')),
                      ),
                    )),
                  ),
              ),

              h('section', { className: 'dmm-card' },
                h('h3', { className: 'dmm-cardtitle' }, tt('capture.label')),
                h('div', { className: 'dmm-row' },
                  h('button', { className: 'dmm-btn', disabled: !hasDevice || captureBusy, onClick: () => { void takeScreenshot(); } },
                    captureBusy ? tt('capture.shotBusy') : tt('capture.shot')),
                  h('input', {
                    className: 'dmm-number',
                    type: 'number',
                    min: 3,
                    max: 600,
                    value: recordSeconds,
                    title: tt('capture.seconds'),
                    onChange: (event) => setRecordSeconds(Math.min(600, Math.max(3, Math.round(Number(event.target.value) || 15)))),
                  }),
                  recording === null
                    ? h('button', { className: 'dmm-btn', disabled: !hasDevice || recordBusy, onClick: () => { void startRecording(); } }, tt('capture.record'))
                    : h('button', { className: 'dmm-btn dmm-btn--danger', disabled: recordBusy, onClick: () => { void stopRecording(); } },
                      tt('capture.recording', { elapsed: String(elapsed) })),
                ),
              ),

              h('section', { className: 'dmm-card' },
                h('h3', { className: 'dmm-cardtitle' }, tt('upload.label')),
                h('input', {
                  className: 'dmm-input',
                  type: 'file',
                  onChange: (event) => setUploadFile(event.target.files && event.target.files[0] ? event.target.files[0] : null),
                }),
                h('div', { className: 'dmm-row' },
                  h('span', { className: 'dmm-muted' }, tt('upload.destination')),
                  h('select', {
                    className: 'dmm-select',
                    value: uploadDest,
                    onChange: (event) => setUploadDest(event.target.value),
                  },
                    ['download', 'pictures', 'movies', 'documents'].map((id) => h('option', { key: id, value: id }, tt(`upload.dest.${id}`)))),
                ),
                h('div', { className: 'dmm-row' },
                  h('button', {
                    className: 'dmm-btn dmm-btn--primary',
                    disabled: uploadBusy || uploadFile === null || !hasDevice,
                    onClick: () => { void pushFile(); },
                  }, uploadBusy ? tt('upload.pushing') : tt('upload.push')),
                  uploadFile !== null ? h('span', { className: 'dmm-muted' }, `${uploadFile.name} · ${formatBytes(uploadFile.size)}`) : null,
                ),
              ),
            ),

            /* ---------------- 下方：日志与信息 ---------------- */
            h('div', { className: 'dmm-info' },
              h('section', { className: 'dmm-card dmm-info--wide' },
                h('div', { className: 'dmm-cardhead' },
                  h('h3', { className: 'dmm-cardtitle' }, tt('instruction.logTitle')),
                  log.length === 0 ? null : h('span', { className: 'dmm-muted' }, String(log.length)),
                ),
                log.length === 0
                  ? h('p', { className: 'dmm-hint' }, tt('instruction.logEmpty'))
                  : h('div', { className: 'dmm-log' },
                    log.map((row) => h('div', { className: 'dmm-logrow', key: row.at },
                      h('span', { className: `dmm-logmark dmm-logmark--${row.ok ? 'ok' : 'bad'}` }, row.ok ? tt('instruction.ok') : tt('instruction.fail')),
                      h('span', { className: 'dmm-logtext' }, row.text),
                      row.detail !== '' ? h('span', { className: 'dmm-logdetail' }, row.detail) : null,
                    )),
                  ),
              ),

              h('section', { className: 'dmm-card dmm-info--wide' },
                h('div', { className: 'dmm-cardhead' },
                  h('h3', { className: 'dmm-cardtitle' }, tt('capture.recent')),
                  captures.length === 0 ? null : h('span', { className: 'dmm-muted' }, String(captures.length)),
                ),
                recordNote !== null
                  ? h('p', { className: recordNote.ok ? 'dmm-okline' : 'dmm-errorline' },
                    recordNote.ok ? shortPath(recordNote.path) : recordNote.error)
                  : null,
                uploadNote !== null
                  ? h('p', { className: uploadNote.ok ? 'dmm-okline' : 'dmm-errorline' }, uploadNote.text)
                  : null,
                captures.length === 0
                  ? h('p', { className: 'dmm-hint' }, tt('capture.empty'))
                  : h('div', { className: 'dmm-files' },
                    captures.map((row) => h('div', { className: 'dmm-filerow', key: row.path },
                      h('span', { className: 'dmm-filetag' }, row.path.endsWith('.mp4') ? tt('capture.kindVideo') : tt('capture.kindShot')),
                      h('span', { className: 'dmm-filepath', title: row.path }, shortPath(row.path)),
                      h('span', { className: 'dmm-filemeta' }, formatBytes(row.bytes)),
                      h('button', { className: 'dmm-file-btn', onClick: () => { void copyPath(row.path); } },
                        copiedPath === row.path ? tt('capture.copied') : tt('capture.copy')),
                    )),
                  ),
              ),
            ),
          ),
        ),
      );
    }

    /* ------------------------------------------------------------ 装载 */

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
        order: 21,
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
    exports.__meta = META;
    exports.__dictionaries = { zh, en };
    return module.exports;
  },
});
