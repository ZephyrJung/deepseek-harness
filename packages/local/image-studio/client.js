window.__ModuleLoader__.load({
  id: '@local/dsh-image-studio',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
    const React = require('react');
    const h = React.createElement;

    const PACKAGE = '@local/dsh-image-studio';
    const NS = 'image-studio';
    const API = '/api/image-studio';

    const META = {
      zh: {
        title: 'AI作图',
        description: '本机文生图与图生图工作室：用描述或参考图出图，本机 Ollama 理解意图、改写提示词，并根据反馈持续调整。',
      },
      en: {
        title: 'AI Art',
        description: 'Text-to-image and image-to-image studio: render locally with Draw Things or ComfyUI while a local Ollama model plans prompts and refines from feedback.',
      },
    };

    const zh = {
      'sidebar.label': 'AI作图',
      'panel.kicker': '本机 AI 作图',
      'panel.title': 'AI作图',
      'panel.subtitle': '从一个描述生成画面，或上传参考图只改需要改的地方；本机 Ollama 先理解意图并改写提示词，aidraw 负责出图。',
      'pill.checking': '检查本机服务…',
      'pill.llm': '意图模型 {model}',
      'pill.llmOffline': '意图模型离线',
      'pill.vision': '可看图',
      'pill.local': '本机处理',
      'backend.drawthings': 'Draw Things',
      'backend.comfy': 'Comfy',
      'backend.none': '无可用引擎',
      'engine.title': '出图引擎',
      'engine.hint': '选择引擎后点生成；成败会在结果区反馈。',
      'engine.drawthings': 'Draw Things',
      'engine.comfy': 'Comfy',
      'engine.selected': '当前引擎',
      'engine.success': '已用 {engine} 生成，耗时 {seconds}。',
      'engine.failed': '{message}',
      'health.refresh': '刷新状态',
      'composer.title': '画什么',
      'composer.titleRefine': '继续调整',
      'composer.label': '画面描述',
      'composer.placeholder': '例如：雨夜的霓虹街头，一只橘猫蹲在便利店门口，电影感，低饱和，路边有水洼反光。',
      'composer.aspect': '比例',
      'composer.style': '风格',
      'composer.styleNote': '风格「{style}」会作为风格倾向交给模型，不会写进你的描述。',
      'style.changeFeedback': '整体画面改成「{style}」风格，其余保持不变。',
      'composer.generate': '开始创作',
      'composer.newCreation': '新图创作',
      'composer.plan': '先理解意图',
      'composer.planning': '理解中…',
      'composer.hint': '第一次生成会先整理创作简报，再输出图片；生成过程中可以随时取消。',
      'task.label': '任务',
      'task.txt2img': '文生图',
      'task.img2img': '图生图',
      'task.loading': '正在载入会话…',
      'img2img.composer': '参考图与改动',
      'img2img.drop': '拖入参考图，或点击选择',
      'img2img.paste': '也可以直接粘贴一张截图',
      'img2img.formats': '支持 PNG / JPEG / WebP，最大 12 MB',
      'img2img.uploading': '正在上传参考图…',
      'img2img.replace': '更换参考图',
      'img2img.remove': '移除参考图',
      'img2img.useLatest': '用最新结果作参考',
      'img2img.latestName': '最新结果',
      'img2img.reference': '参考图',
      'img2img.needImage': '请先上传一张参考图，或载入一个图生图会话。',
      'img2img.continueSession': '当前会话会以上一轮结果作为参考继续生成。',
      'img2img.optionalDesc': '可选：说明想改什么',
      'img2img.optionalDescPlaceholder': '例如：把背景换成清晨的海边，人物保持不动，光线更柔和。',
      'img2img.hint': '上传参考图后，只写需要改的地方；生成过程可以随时取消。',
      'denoise.label': '改动强度',
      'denoise.tune': '微调',
      'denoise.balance': '平衡',
      'denoise.overhaul': '大改',
      'denoise.hint': '数值越小越接近参考图，越大改动越多。',
      'aspect.auto': '自动',
      'aspect.square': '1:1 方形',
      'aspect.landscape': '4:3 横构图',
      'aspect.portrait': '3:4 竖构图',
      'aspect.wide': '16:9 宽幅',
      'aspect.tall': '9:16 竖幅',
      'style.none': '默认',
      'style.photo': '电影摄影',
      'style.photoreal': '写实摄影',
      'style.watercolor': '水彩插画',
      'style.ink': '国风水墨',
      'style.anime': '动漫',
      'style.oil': '油画',
      'style.render3d': '3D 渲染',
      'style.minimal': '极简平面',
      'style.cyberpunk': '赛博朋克',
      'style.pixelart': '像素艺术',
      'status.generating': '正在绘制',
      'status.planning': '正在理解意图',
      'status.elapsed': '已用 {seconds}',
      'status.busy': '另一个生成任务正在进行',
      'action.cancel': '取消生成',
      'action.cancelling': '正在取消…',
      'action.save': '保存图片',
      'action.saving': '保存中…',
      'action.copyPrompt': '复制提示词',
      'action.copied': '已复制',
      'action.accept': '设为满意',
      'action.accepted': '已设为满意',
      'action.openImage': '打开原图',
      'action.refresh': '刷新',
      'action.usePlan': '按这份简报生成',
      'action.dismiss': '知道了',
      'brief.title': '创作简报',
      'brief.planned': '意图理解 · 尚未生成',
      'brief.current': '第 {index} 轮',
      'brief.intent': '意图',
      'brief.subject': '主体',
      'brief.style': '风格',
      'brief.composition': '构图',
      'brief.lighting': '光线',
      'brief.palette': '色调',
      'brief.aspect': '比例',
      'brief.tags': '标签',
      'brief.positive': '正向提示词',
      'brief.negative': '负向提示词',
      'brief.params': '参数',
      'brief.width': '宽',
      'brief.height': '高',
      'brief.steps': '步数',
      'brief.cfg': 'CFG',
      'brief.sampler': '采样器',
      'brief.rationale': '为什么这样画',
      'brief.critique': '模型看到的画面',
      'brief.changes': '这轮改动',
      'brief.planDegraded': '本机模型不可用，已用原始描述和默认参数：{reason}',
      'brief.turnDegraded': '这一轮没有经过模型改写：{reason}',
      'result.title': '生成结果',
      'result.placeholder': '生成后图片会显示在这里，可以保存、复制提示词，或设为满意让插件记住你的偏好。',
      'result.generating': '正在绘制，本机扩散可能要几十秒…',
      'result.backend': '后端',
      'result.model': '模型',
      'result.seed': '种子',
      'result.size': '尺寸',
      'result.elapsed': '耗时',
      'result.turn': '第 {index} 轮',
      'result.accepted': '已设为满意',
      'result.degraded': '降级生成',
      'result.init': '参考图',
      'result.output': '生成图',
      'result.denoise': '改动强度',
      'result.initFrom': '参考来源',
      'initFrom.source': '源图 {id}',
      'initFrom.turn': '上一轮 {id}',
      'feedback.last': '上一轮反馈：{text}',
      'feedback.placeholder': '例如：背景太乱，脸再小一点，光线更暖。只改你提到的部分，其余保持不变。',
      'feedback.regenerate': '再次生成',
      'feedback.hint': '没有填写反馈时，会按上面编辑过的提示词和参数重新生成。',
      'turns.title': '本组图',
      'turns.count': '{count} 张',
      'turns.acceptedCount': '{count} 张满意',
      'turns.view': '查看第 {index} 轮',
      'turns.empty': '还没有生成记录。',
      'prefs.title': '学到的偏好',
      'prefs.empty': '把某一轮设为满意后，这里会出现一条长期偏好，之后每次理解意图都会带上。',
      'prefs.delete': '删除偏好',
      'prefs.count': '{count} 条',
      'prefs.note': '偏好会注入之后所有会话的创作提示词。',
      'history.title': '最近会话',
      'history.empty': '还没有历史会话。',
      'history.loading': '加载中…',
      'history.turns': '{count} 轮',
      'history.active': '当前',
      'error.service': '无法连接 image-studio 插件服务。请确认插件已启用，然后刷新页面。',
      'error.session': '读取会话失败：{message}',
      'error.plan': '理解意图失败：{message}',
      'error.busy': '另一个生成任务正在进行，等它结束或取消后再试。',
      'error.cancel': '取消失败：{message}',
      'error.accept': '设为满意失败：{message}',
      'error.preference': '删除偏好失败：{message}',
      'error.save': '保存图片失败：{message}',
      'error.copy': '复制失败，请手动选择文字。',
      'error.needDescription': '请先写一段画面描述。',
      'error.cancelled': '这一轮生成已取消。',
      'error.fileType': '只支持 PNG、JPEG 或 WebP 图片。',
      'error.fileSize': '图片不能超过 12 MB。',
      'error.readFile': '读取图片失败，请重试。',
      'error.upload': '上传参考图失败：{message}',
      'notice.accepted': '已设为满意。',
      'notice.acceptedPref': '已设为满意，并提炼出偏好：{text}',
      'notice.preferenceDeleted': '偏好已删除。',
      'notice.copied': '提示词已复制。',
      'notice.cancelled': '已取消生成。',
      'notice.planReady': '意图理解好了，确认简报后可以生成。',
      'notice.uploaded': '参考图已上传：{name}',
      'footer.local': '描述、提示词、参考图和图片只在本机插件与 Ollama / Draw Things / ComfyUI 之间流动。',
      'footer.slow': '本机扩散可能要几十秒到几分钟；期间面板会显示耗时，随时可以取消。',
      'footer.save': '保存图片会进入当前浏览器下载目录，同时留在这一轮的会话记录里。',
      'footer.preferences': '设为满意会把这轮的审美倾向记成长期偏好，可以在右侧删除。',
    };

    const en = {
      'sidebar.label': 'AI Art',
      'panel.kicker': 'On-device AI art',
      'panel.title': 'AI Art',
      'panel.subtitle': 'Generate from a description, or upload a reference and change only what you need. A local Ollama model shapes the prompts while aidraw renders.',
      'pill.checking': 'Checking local services…',
      'pill.llm': 'Planner {model}',
      'pill.llmOffline': 'Planner offline',
      'pill.vision': 'Vision',
      'pill.local': 'On-device',
      'backend.drawthings': 'Draw Things',
      'backend.comfy': 'Comfy',
      'backend.none': 'No renderer',
      'engine.title': 'Render engine',
      'engine.hint': 'Pick an engine and generate; the result area reports success or failure.',
      'engine.drawthings': 'Draw Things',
      'engine.comfy': 'Comfy',
      'engine.selected': 'Active engine',
      'engine.success': 'Generated with {engine} in {seconds}.',
      'engine.failed': '{message}',
      'health.refresh': 'Refresh status',
      'composer.title': 'What to draw',
      'composer.titleRefine': 'Continue refining',
      'composer.label': 'Scene description',
      'composer.placeholder': 'e.g. a ginger cat sitting outside a convenience store on a rainy neon street, cinematic, low saturation, puddles reflecting the signs.',
      'composer.aspect': 'Aspect',
      'composer.style': 'Style',
      'composer.styleNote': 'The “{style}” style is sent to the model as a style hint, not inside your description.',
      'style.changeFeedback': 'Change the whole image to the “{style}” style and keep everything else.',
      'composer.generate': 'Start creating',
      'composer.newCreation': 'New creation',
      'composer.plan': 'Understand first',
      'composer.planning': 'Understanding…',
      'composer.hint': 'The first render starts with a creative brief, then outputs the image; you can cancel at any time.',
      'task.label': 'Task',
      'task.txt2img': 'Text to image',
      'task.img2img': 'Image to image',
      'task.loading': 'Loading session…',
      'img2img.composer': 'Reference & changes',
      'img2img.drop': 'Drop a reference image, or click to choose',
      'img2img.paste': 'You can also paste a screenshot',
      'img2img.formats': 'PNG / JPEG / WebP, up to 12 MB',
      'img2img.uploading': 'Uploading reference…',
      'img2img.replace': 'Replace reference',
      'img2img.remove': 'Remove reference',
      'img2img.useLatest': 'Use latest result',
      'img2img.latestName': 'Latest result',
      'img2img.reference': 'Reference',
      'img2img.needImage': 'Upload a reference image, or load an image-to-image session first.',
      'img2img.continueSession': 'New turns continue from the latest result in this session.',
      'img2img.optionalDesc': 'Optional: what should change',
      'img2img.optionalDescPlaceholder': 'e.g. replace the background with a seaside morning, keep the person unchanged, softer light.',
      'img2img.hint': 'After uploading a reference, describe only what should change; you can cancel anytime.',
      'denoise.label': 'Change strength',
      'denoise.tune': 'Subtle',
      'denoise.balance': 'Balanced',
      'denoise.overhaul': 'Overhaul',
      'denoise.hint': 'Lower stays closer to the reference; higher changes more.',
      'aspect.auto': 'Auto',
      'aspect.square': '1:1 square',
      'aspect.landscape': '4:3 landscape',
      'aspect.portrait': '3:4 portrait',
      'aspect.wide': '16:9 wide',
      'aspect.tall': '9:16 tall',
      'style.none': 'Default',
      'style.photo': 'Cinematic photo',
      'style.photoreal': 'Photorealistic',
      'style.watercolor': 'Watercolor',
      'style.ink': 'Ink wash',
      'style.anime': 'Anime',
      'style.oil': 'Oil painting',
      'style.render3d': '3D render',
      'style.minimal': 'Minimal flat',
      'style.cyberpunk': 'Cyberpunk',
      'style.pixelart': 'Pixel art',
      'status.generating': 'Rendering',
      'status.planning': 'Understanding intent',
      'status.elapsed': '{seconds} elapsed',
      'status.busy': 'Another generation is running',
      'action.cancel': 'Cancel generation',
      'action.cancelling': 'Cancelling…',
      'action.save': 'Save image',
      'action.saving': 'Saving…',
      'action.copyPrompt': 'Copy prompt',
      'action.copied': 'Copied',
      'action.accept': 'Mark satisfied',
      'action.accepted': 'Marked satisfied',
      'action.openImage': 'Open full size',
      'action.refresh': 'Refresh',
      'action.usePlan': 'Generate from this brief',
      'action.dismiss': 'Dismiss',
      'brief.title': 'Creative brief',
      'brief.planned': 'Intent ready · not rendered',
      'brief.current': 'Turn {index}',
      'brief.intent': 'Intent',
      'brief.subject': 'Subject',
      'brief.style': 'Style',
      'brief.composition': 'Composition',
      'brief.lighting': 'Lighting',
      'brief.palette': 'Palette',
      'brief.aspect': 'Aspect',
      'brief.tags': 'Tags',
      'brief.positive': 'Positive prompt',
      'brief.negative': 'Negative prompt',
      'brief.params': 'Parameters',
      'brief.width': 'Width',
      'brief.height': 'Height',
      'brief.steps': 'Steps',
      'brief.cfg': 'CFG',
      'brief.sampler': 'Sampler',
      'brief.rationale': 'Why this works',
      'brief.critique': 'What the model saw',
      'brief.changes': 'Changes this turn',
      'brief.planDegraded': 'The local model was unavailable; using your description and default parameters: {reason}',
      'brief.turnDegraded': 'This turn skipped model rewriting: {reason}',
      'result.title': 'Result',
      'result.placeholder': 'Your image appears here. Save it, copy the prompt, or mark it satisfied so the studio learns your taste.',
      'result.generating': 'Rendering locally; diffusion may take a few dozen seconds…',
      'result.backend': 'Backend',
      'result.model': 'Model',
      'result.seed': 'Seed',
      'result.size': 'Size',
      'result.elapsed': 'Time',
      'result.turn': 'Turn {index}',
      'result.accepted': 'Satisfied',
      'result.degraded': 'Degraded',
      'result.init': 'Reference',
      'result.output': 'Result',
      'result.denoise': 'Strength',
      'result.initFrom': 'Init from',
      'initFrom.source': 'Source {id}',
      'initFrom.turn': 'Previous turn {id}',
      'feedback.last': 'Feedback last turn: {text}',
      'feedback.placeholder': 'e.g. the background is too busy, make the face smaller, warmer light. Change only what I mention and keep the rest.',
      'feedback.regenerate': 'Generate again',
      'feedback.hint': 'With no feedback text, the edited prompts and parameters above are used to render again.',
      'turns.title': 'This series',
      'turns.count': '{count} images',
      'turns.acceptedCount': '{count} satisfied',
      'turns.view': 'View turn {index}',
      'turns.empty': 'No renders yet.',
      'prefs.title': 'Learned preferences',
      'prefs.empty': 'Mark a turn satisfied and one long-term preference appears here, included in every later plan.',
      'prefs.delete': 'Delete preference',
      'prefs.count': '{count}',
      'prefs.note': 'Preferences are injected into every later session.',
      'history.title': 'Recent sessions',
      'history.empty': 'No sessions yet.',
      'history.loading': 'Loading…',
      'history.turns': '{count} turns',
      'history.active': 'Current',
      'error.service': 'Cannot reach the image-studio plugin service. Make sure the plugin is enabled, then reload the page.',
      'error.session': 'Could not load the session: {message}',
      'error.plan': 'Could not understand the intent: {message}',
      'error.busy': 'Another generation is already running. Wait for it to finish or cancel it, then retry.',
      'error.cancel': 'Could not cancel: {message}',
      'error.accept': 'Could not mark satisfied: {message}',
      'error.preference': 'Could not delete the preference: {message}',
      'error.save': 'Could not save the image: {message}',
      'error.copy': 'Copy failed. Select the text manually.',
      'error.needDescription': 'Write a scene description first.',
      'error.cancelled': 'This generation was cancelled.',
      'error.fileType': 'Only PNG, JPEG or WebP images are supported.',
      'error.fileSize': 'The image must be 12 MB or smaller.',
      'error.readFile': 'Could not read the image. Try again.',
      'error.upload': 'Could not upload the reference: {message}',
      'notice.accepted': 'Marked satisfied.',
      'notice.acceptedPref': 'Marked satisfied and distilled a preference: {text}',
      'notice.preferenceDeleted': 'Preference deleted.',
      'notice.copied': 'Prompt copied.',
      'notice.cancelled': 'Generation cancelled.',
      'notice.planReady': 'Intent ready. Check the brief, then generate.',
      'notice.uploaded': 'Reference uploaded: {name}',
      'footer.local': 'Descriptions, prompts, reference images and outputs only move between this local plugin and Ollama / Draw Things / ComfyUI.',
      'footer.slow': 'Local diffusion can take tens of seconds to minutes; elapsed time is shown and you can cancel anytime.',
      'footer.save': 'Saved images go to the browser download folder and stay with the turn in the session record.',
      'footer.preferences': 'Marking satisfied turns this taste into a long-term preference you can delete on the right.',
    };

    const CSS = [
      '.dsi-root{--dsi-fg:var(--dsw-alias-label-primary);--dsi-fg2:var(--dsw-alias-label-secondary);--dsi-bg:var(--dsw-alias-bg-base);--dsi-card:var(--dsw-alias-bg-layer-1);--dsi-card2:var(--dsw-alias-bg-layer-2);--dsi-border:var(--dsw-alias-border-l1);--dsi-border2:var(--dsw-alias-border-l2);--dsi-accent:var(--dsw-alias-brand-primary);--dsi-ok:var(--dsw-alias-state-success-primary);--dsi-warn:var(--dsw-alias-state-warn-primary);--dsi-bad:var(--dsw-alias-state-error-primary);--dsi-idle:var(--dsw-alias-state-idle-primary);height:100%;min-height:100%;overflow:auto;box-sizing:border-box;background:var(--dsi-bg);color:var(--dsi-fg);}',
      '.dsi-root *{box-sizing:border-box;}',
      '.dsi-shell{width:100%;max-width:1080px;margin:0 auto;padding:30px 32px 64px;box-sizing:border-box;}',
      '.dsi-header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;flex-wrap:wrap;}',
      '.dsi-kicker{margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--dsi-fg2);}',
      '.dsi-title{margin:0;font-size:23px;line-height:1.25;font-weight:600;letter-spacing:-.015em;}',
      '.dsi-sub{margin:9px 0 0;max-width:660px;font-size:13px;line-height:1.65;color:var(--dsi-fg2);}',
      '.dsi-pills{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:7px;max-width:520px;}',
      '.dsi-pill{display:inline-flex;align-items:center;gap:6px;max-width:270px;padding:2px 9px;border:1px solid var(--dsi-border);border-radius:999px;background:transparent;font-size:11px;line-height:16px;color:var(--dsi-fg2);white-space:nowrap;}',
      '.dsi-pill>span{min-width:0;}',
      '.dsi-pill>span:not(.dsi-dot){overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.dsi-pill b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsi-fg);font-weight:600;}',
      '.dsi-pill--ok{border-color:var(--dsi-border);}',
      '.dsi-pill--bad{border-color:var(--dsi-bad);}',
      '.dsi-pill-tag{padding:0 5px;border-radius:4px;background:var(--dsi-card2);font-size:9.5px;line-height:14px;color:var(--dsi-fg2);}',
      '.dsi-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dsi-idle);}',
      '.dsi-dot--ok{background:var(--dsi-ok);}',
      '.dsi-dot--bad{background:var(--dsi-bad);}',
      '.dsi-dot--warn{background:var(--dsi-warn);}',
      '.dsi-icon-btn{appearance:none;display:inline-grid;place-items:center;width:28px;height:28px;padding:0;border:1px solid var(--dsi-border);border-radius:8px;background:var(--dsi-card2);color:var(--dsi-fg2);cursor:pointer;}',
      '.dsi-icon-btn:hover:not(:disabled){border-color:var(--dsi-border2);color:var(--dsi-fg);}',
      '.dsi-icon-btn:disabled{opacity:.45;cursor:not-allowed;}',
      '.dsi-icon-btn--spin svg{animation:dsi-spin .9s linear infinite;}',
      '.dsi-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:22px;align-items:start;}',
      '.dsi-main,.dsi-side{display:flex;flex-direction:column;min-width:0;}',
      '.dsi-card{display:flex;flex-direction:column;gap:16px;min-width:0;margin-top:22px;padding:22px;border:1px solid var(--dsi-border);border-radius:16px;background:var(--dsi-card);}',
      '.dsi-card--tight{gap:10px;}',
      '.dsi-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;min-width:0;}',
      '.dsi-card-head-main{display:flex;align-items:center;gap:8px;min-width:0;}',
      '.dsi-h2{margin:0;font-size:13px;font-weight:600;letter-spacing:.01em;}',
      '.dsi-label{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsi-fg2);}',
      '.dsi-subtle{font-size:11.5px;line-height:1.5;color:var(--dsi-fg2);}',
      '.dsi-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:7px 12px;border:1px solid var(--dsi-border);border-radius:9px;background:var(--dsi-card2);color:var(--dsi-fg);font:inherit;font-size:12px;line-height:18px;cursor:pointer;}',
      '.dsi-btn:hover:not(:disabled){border-color:var(--dsi-border2);}',
      '.dsi-btn:disabled{opacity:.45;cursor:not-allowed;}',
      '.dsi-btn--primary{border-color:var(--dsi-accent);color:var(--dsi-accent);}',
      '.dsi-btn--primary:hover:not(:disabled){border-color:var(--dsi-accent);background:var(--dsi-card2);}',
      '.dsi-btn--ghost{background:transparent;}',
      '.dsi-btn--ghost:hover:not(:disabled){border-color:var(--dsi-border2);}',
      '.dsi-btn--danger{border-color:var(--dsi-bad);background:transparent;color:var(--dsi-bad);}',
      '.dsi-btn--danger:hover:not(:disabled){border-color:var(--dsi-bad);background:var(--dsi-card2);}',
      '.dsi-btn--sm{padding:5px 9px;font-size:11.5px;line-height:16px;}',
      '.dsi-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px;}',
      '.dsi-row{display:flex;align-items:flex-start;gap:12px;min-width:0;}',
      '.dsi-field-label{flex:none;width:42px;padding-top:4px;font-size:12px;line-height:18px;color:var(--dsi-fg2);}',
      '.dsi-chips{display:flex;flex-wrap:wrap;gap:6px;min-width:0;}',
      '.dsi-chip{appearance:none;padding:4px 10px;border:1px solid var(--dsi-border);border-radius:999px;background:transparent;color:var(--dsi-fg2);font:inherit;font-size:11.5px;line-height:18px;white-space:nowrap;cursor:pointer;}',
      '.dsi-chip:hover:not(:disabled){border-color:var(--dsi-border2);color:var(--dsi-fg);}',
      '.dsi-chip--on{border-color:var(--dsi-accent);background:var(--dsi-card2);color:var(--dsi-accent);}',
      '.dsi-chip:disabled{opacity:.5;cursor:not-allowed;}',
      '.dsi-textarea,.dsi-input{width:100%;padding:9px 11px;border:1px solid var(--dsi-border);border-radius:8px;background:var(--dsi-card2);color:var(--dsi-fg);caret-color:var(--dsi-accent);font:inherit;font-size:13px;line-height:1.65;resize:vertical;}',
      '.dsi-textarea::placeholder,.dsi-input::placeholder{color:var(--dsi-fg2);opacity:1;}',
      '.dsi-textarea:focus,.dsi-input:focus{outline:none;border-color:var(--dsi-accent);}',
      '.dsi-textarea:disabled,.dsi-input:disabled{opacity:.55;cursor:not-allowed;}',
      '.dsi-textarea--prompt{min-height:78px;font-size:12.5px;}',
      '.dsi-textarea--negative{min-height:56px;font-size:12.5px;}',
      '.dsi-live{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font-size:12px;color:var(--dsi-fg2);}',
      '.dsi-spinner{flex:none;width:14px;height:14px;border:2px solid var(--dsi-border);border-top-color:var(--dsi-accent);border-radius:50%;animation:dsi-spin .8s linear infinite;}',
      '.dsi-time{font-variant-numeric:tabular-nums;font-weight:600;color:var(--dsi-fg);}',
      '.dsi-hint{margin:0;font-size:11.5px;line-height:1.6;color:var(--dsi-fg2);}',
      /* 「继续调整」内嵌区块：不再单独成卡，作为提示词/画什么区域的延续，
         顶上一条细线 + 标题代替卡片边界，视觉上同属一块。 */
      '.dsi-refine-context{display:flex;flex-wrap:wrap;gap:8px;font-size:11px;margin-bottom:4px;}',
      '.dsi-refine-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;min-width:0;}',
      '.dsi-brief-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:8px;}',
      '.dsi-brief-item{min-width:0;padding:9px 11px;border:1px solid var(--dsi-border);border-radius:9px;background:var(--dsi-card2);}',
      '.dsi-brief-item em{display:block;margin-bottom:3px;font-style:normal;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsi-fg2);}',
      '.dsi-brief-item span{display:block;font-size:12px;line-height:1.55;color:var(--dsi-fg);overflow-wrap:anywhere;}',
      '.dsi-rationale{padding:10px 13px;border-left:2px solid var(--dsi-accent);border-radius:0 8px 8px 0;font-size:12px;line-height:1.7;overflow-wrap:anywhere;}',
      '.dsi-rationale b{display:block;margin-bottom:2px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsi-fg2);font-weight:600;}',
      '.dsi-critique{padding:10px 13px;border-left:2px solid var(--dsi-border2);border-radius:0 8px 8px 0;font-size:12px;line-height:1.7;overflow-wrap:anywhere;}',
      '.dsi-critique b{display:block;margin-bottom:2px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsi-fg2);font-weight:600;}',
      '.dsi-params{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px 10px;}',
      '.dsi-param{display:flex;flex-direction:column;gap:3px;min-width:0;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--dsi-fg2);}',
      '.dsi-param .dsi-input{width:70px;padding:5px 7px;font-size:11.5px;}',
      '.dsi-param--wide .dsi-input{width:156px;}',
      '.dsi-frame{position:relative;display:flex;align-items:center;justify-content:center;min-height:220px;border:1px solid var(--dsi-border);border-radius:12px;overflow:hidden;background:var(--dsi-card2);}',
      '.dsi-image{display:block;width:auto;height:auto;max-width:100%;max-height:64vh;object-fit:contain;}',
      '.dsi-frame-empty{max-width:530px;padding:34px 24px;text-align:center;font-size:13px;line-height:1.7;color:var(--dsi-fg2);}',
      '.dsi-skeleton{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;width:100%;min-height:270px;padding:40px 20px;background:var(--dsi-card2);font-size:12.5px;line-height:1.6;color:var(--dsi-fg2);text-align:center;}',
      '.dsi-meta{display:flex;flex-wrap:wrap;gap:5px 14px;font-size:11px;line-height:1.6;color:var(--dsi-fg2);}',
      '.dsi-meta b{color:var(--dsi-fg);font-weight:500;}',
      '.dsi-accepted{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border:1px solid var(--dsi-ok);border-radius:999px;background:transparent;font-size:11px;line-height:16px;color:var(--dsi-ok);}',
      '.dsi-thumbs{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 4px;}',
      '.dsi-thumb{position:relative;flex:none;width:84px;height:84px;padding:0;border:1px solid var(--dsi-border);border-radius:10px;overflow:hidden;background:var(--dsi-card2);cursor:pointer;}',
      '.dsi-thumb:hover:not(:disabled){border-color:var(--dsi-border2);}',
      '.dsi-thumb img{display:block;width:100%;height:100%;object-fit:cover;}',
      '.dsi-thumb--active{border-color:var(--dsi-accent);}',
      '.dsi-thumb-badge{position:absolute;left:4px;bottom:4px;padding:0 5px;border:1px solid var(--dsi-border);border-radius:4px;background:var(--dsi-card);font-size:9.5px;line-height:15px;color:var(--dsi-fg);}',
      '.dsi-thumb-ok{position:absolute;right:4px;top:4px;width:16px;height:16px;border:1px solid var(--dsi-ok);border-radius:50%;background:var(--dsi-card);color:var(--dsi-ok);font-size:10px;line-height:15px;text-align:center;font-weight:700;}',
      '.dsi-toggle{appearance:none;display:inline-flex;align-items:center;gap:9px;padding:0;border:none;background:none;color:var(--dsi-fg);font:inherit;font-size:12px;line-height:20px;cursor:pointer;text-align:left;}',
      '.dsi-toggle:disabled{opacity:.55;cursor:not-allowed;}',
      '.dsi-switch{position:relative;flex:none;width:34px;height:19px;border:1px solid var(--dsi-border2);border-radius:999px;background:var(--dsi-card2);transition:background .12s ease;}',
      '.dsi-switch::after{content:"";position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:var(--dsi-fg);transition:transform .12s ease;}',
      '.dsi-switch--on{border-color:var(--dsi-accent);background:var(--dsi-accent);}',
      '.dsi-switch--on::after{background:var(--dsi-bg);transform:translateX(15px);}',
      '.dsi-pref-chips{display:flex;flex-direction:column;gap:6px;}',
      '.dsi-pref{display:flex;align-items:flex-start;gap:6px;padding:7px 9px;border:1px solid var(--dsi-border);border-radius:8px;background:var(--dsi-card2);font-size:11.5px;line-height:1.55;}',
      '.dsi-pref span{flex:1;min-width:0;overflow-wrap:anywhere;}',
      '.dsi-pref-del{appearance:none;flex:none;width:18px;height:18px;padding:0;border:none;border-radius:4px;background:transparent;color:var(--dsi-fg2);font:inherit;font-size:13px;line-height:16px;cursor:pointer;}',
      '.dsi-pref-del:hover{background:var(--dsi-card);color:var(--dsi-bad);}',
      '.dsi-sessions{display:flex;flex-direction:column;gap:2px;max-height:330px;overflow-y:auto;}',
      '.dsi-session{display:flex;align-items:center;gap:9px;width:100%;padding:6px;border:1px solid transparent;border-radius:9px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;}',
      '.dsi-session:hover:not(:disabled){background:var(--dsi-card2);}',
      '.dsi-session:disabled{opacity:.55;cursor:not-allowed;}',
      '.dsi-session--active{border-color:var(--dsi-accent);background:var(--dsi-card2);}',
      '.dsi-session-cover{flex:none;width:36px;height:36px;border:1px solid var(--dsi-border);border-radius:8px;object-fit:cover;background:var(--dsi-card2);}',
      '.dsi-session-body{flex:1;min-width:0;}',
      '.dsi-session-title{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:1.4;}',
      '.dsi-session-meta{display:block;margin-top:2px;font-size:10.5px;line-height:1.5;color:var(--dsi-fg2);}',
      '.dsi-health-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--dsi-border);font-size:11.5px;line-height:1.5;}',
      '.dsi-health-row:first-of-type{border-top:none;}',
      '.dsi-health-name{flex:none;width:82px;color:var(--dsi-fg2);}',
      '.dsi-health-val{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsi-fg);}',
      '.dsi-engine-options{display:flex;flex-direction:column;gap:8px;}',
      '.dsi-engine-option{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border:1px solid var(--dsi-border);border-radius:10px;background:transparent;color:var(--dsi-fg);cursor:pointer;text-align:left;font-size:12px;line-height:1.4;transition:border-color .15s ease;}',
      '.dsi-engine-option:hover:not(:disabled){border-color:var(--dsi-fg2);}',
      '.dsi-engine-name{font-weight:600;flex:none;}',
      '.dsi-engine-check{margin-left:auto;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;flex:none;border-radius:50%;background:color-mix(in srgb,#22c55e 18%,transparent);color:#22c55e;}',
      '.dsi-banner{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-top:14px;padding:10px 12px;border:1px solid var(--dsi-border);border-radius:10px;background:transparent;font-size:12px;line-height:1.6;color:var(--dsi-fg);}',
      '.dsi-banner-body{flex:1;min-width:0;}',
      '.dsi-banner-title{margin-bottom:2px;font-weight:600;}',
      '.dsi-banner ul{margin:4px 0 0;padding-left:18px;}',
      '.dsi-banner li{margin:2px 0;overflow-wrap:anywhere;}',
      '.dsi-banner--error{border-color:var(--dsi-bad);color:var(--dsi-bad);}',
      '.dsi-banner--warn{border-color:var(--dsi-warn);color:var(--dsi-fg);}',
      '.dsi-banner--ok{border-color:var(--dsi-ok);color:var(--dsi-fg);}',
      '.dsi-footer{margin-top:18px;padding:0 2px;}',
      '.dsi-footer p{margin:0 0 5px;font-size:11.5px;line-height:1.6;color:var(--dsi-fg2);}',
      '.dsi-footer p:last-child{margin-bottom:0;}',
      '.dsi-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:18px;}',
      '.dsi-tabs{display:inline-flex;align-items:center;gap:2px;padding:3px;border:1px solid var(--dsi-border);border-radius:10px;background:transparent;}',
      '.dsi-tab{appearance:none;display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--dsi-fg2);font:inherit;font-size:12px;line-height:18px;cursor:pointer;}',
      '.dsi-tab:hover:not(:disabled){color:var(--dsi-fg);}',
      '.dsi-tab--on{border-color:var(--dsi-accent);background:var(--dsi-card2);color:var(--dsi-accent);}',
      '.dsi-tab:disabled{opacity:.5;cursor:not-allowed;}',
      '.dsi-file-input{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}',
      '.dsi-upload{appearance:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;width:100%;min-height:150px;padding:20px 18px;border:1px dashed var(--dsi-border2);border-radius:12px;background:transparent;color:var(--dsi-fg);font:inherit;text-align:center;cursor:pointer;}',
      '.dsi-upload:hover:not(:disabled){border-color:var(--dsi-accent);}',
      '.dsi-upload--drag{border-color:var(--dsi-accent);background:var(--dsi-card2);}',
      '.dsi-upload--busy{opacity:.7;cursor:progress;}',
      '.dsi-upload:disabled{opacity:.5;cursor:not-allowed;}',
      '.dsi-upload-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:10px;background:var(--dsi-card2);color:var(--dsi-accent);}',
      '.dsi-upload-title{font-size:12.5px;font-weight:600;line-height:1.5;}',
      '.dsi-upload-hint{font-size:11.5px;line-height:1.5;color:var(--dsi-fg2);}',
      '.dsi-ref{display:flex;align-items:center;gap:12px;padding:10px;border:1px solid var(--dsi-border);border-radius:12px;background:var(--dsi-card2);min-width:0;}',
      '.dsi-ref-thumb{flex:none;width:84px;height:84px;border:1px solid var(--dsi-border);border-radius:8px;object-fit:cover;background:var(--dsi-card);}',
      '.dsi-ref-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;}',
      '.dsi-ref-name{font-size:12.5px;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.dsi-ref-meta{font-size:11px;line-height:1.5;color:var(--dsi-fg2);font-variant-numeric:tabular-nums;}',
      '.dsi-ref-actions{display:flex;flex-direction:column;gap:6px;flex:none;}',
      '.dsi-denoise{display:flex;flex-direction:column;gap:6px;}',
      '.dsi-denoise-head{display:flex;align-items:center;justify-content:space-between;gap:10px;}',
      '.dsi-denoise-value{font-size:11.5px;font-weight:600;color:var(--dsi-fg);font-variant-numeric:tabular-nums;}',
      '.dsi-range{width:100%;height:20px;margin:0;accent-color:var(--dsi-accent);cursor:pointer;}',
      '.dsi-range:disabled{opacity:.5;cursor:not-allowed;}',
      '.dsi-denoise-ticks{display:flex;justify-content:space-between;font-size:10.5px;line-height:1.4;color:var(--dsi-fg2);}',
      '.dsi-denoise-tick--on{color:var(--dsi-accent);font-weight:600;}',
      '.dsi-field{display:flex;flex-direction:column;gap:6px;min-width:0;}',
      '.dsi-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}',
      '.dsi-figure{display:flex;flex-direction:column;min-width:0;margin:0;border:1px solid var(--dsi-border);border-radius:10px;overflow:hidden;background:var(--dsi-card2);}',
      '.dsi-figure-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px;border-bottom:1px solid var(--dsi-border);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsi-fg2);}',
      '.dsi-figure-image{display:block;width:auto;height:auto;max-width:100%;max-height:54vh;margin:0 auto;object-fit:contain;background:var(--dsi-card2);}',
      '.dsi-figure-skeleton{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;min-height:240px;padding:24px 16px;background:var(--dsi-card2);font-size:11.5px;line-height:1.6;color:var(--dsi-fg2);text-align:center;}',
      '.dsi-task-badge{display:inline-flex;align-items:center;padding:0 5px;border:1px solid var(--dsi-border);border-radius:4px;font-size:9.5px;line-height:14px;color:var(--dsi-fg2);vertical-align:1px;}',
      '.dsi-task-badge--img{border-color:var(--dsi-accent);color:var(--dsi-accent);}',
      '@keyframes dsi-spin{to{transform:rotate(360deg);}}',
      '@media (max-width:980px){.dsi-layout{grid-template-columns:minmax(0,1fr);gap:0;}.dsi-shell{padding:24px 20px 56px;}.dsi-pills{justify-content:flex-start;max-width:none;}}',
      '@media (max-width:620px){.dsi-shell{padding:20px 16px 48px;}.dsi-card{padding:16px;}.dsi-row{flex-direction:column;gap:6px;}.dsi-field-label{width:auto;padding-top:0;}.dsi-title{font-size:21px;}.dsi-param--wide .dsi-input{width:120px;}.dsi-pair{grid-template-columns:minmax(0,1fr);}.dsi-ref{flex-wrap:wrap;}.dsi-ref-actions{flex-direction:row;}}',
      '@media (prefers-reduced-motion:reduce){.dsi-spinner,.dsi-icon-btn--spin svg{animation:none;}}',
    ].join('\n');

    const DEFAULT_PARAMS = {
      width: 1024,
      height: 1024,
      steps: 28,
      cfg: 5,
      sampler: 'DPM++ 2M Karras',
    };

    const BRIEF_FIELDS = ['intent', 'subject', 'style', 'composition', 'lighting', 'palette', 'aspect'];

    const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

    function normaliseTask(value) {
      return value === 'img2img' ? 'img2img' : 'txt2img';
    }

    function normaliseDenoise(value, fallback = 0.55) {
      const number = Number(value);
      const base = Number.isFinite(number) ? number : Number(fallback);
      const safe = Number.isFinite(base) ? base : 0.55;
      return Math.round(Math.min(0.95, Math.max(0.15, safe)) * 100) / 100;
    }

    function emptyDraft() {
      return {
        positive: '',
        negative: '',
        params: normaliseParams(DEFAULT_PARAMS),
      };
    }

    function sourceUrl(sessionId, sourceId) {
      return `${API}/source?session=${encodeURIComponent(sessionId || '')}&source=${encodeURIComponent(sourceId || '')}`;
    }

    function referenceFromTurn(value, turn) {
      if (!turn || !turn.initImageUrl) return null;
      const initFrom = typeof turn.initFrom === 'string' ? turn.initFrom : '';
      const separator = initFrom.indexOf(':');
      const kind = separator === -1 ? '' : initFrom.slice(0, separator);
      const id = separator === -1 ? '' : initFrom.slice(separator + 1);
      const sources = value && Array.isArray(value.sources) ? value.sources : [];
      const source = kind === 'source' ? sources.find((row) => row && row.id === id) : null;
      return {
        kind: kind === 'turn' ? 'turn' : 'source',
        id,
        url: turn.initImageUrl,
        width: source && source.width ? source.width : turn.params && turn.params.width ? turn.params.width : null,
        height: source && source.height ? source.height : turn.params && turn.params.height ? turn.params.height : null,
        name: source && source.name ? source.name : '',
        mime: source && source.mime ? source.mime : '',
        fresh: false,
      };
    }

    function referenceFromSession(value, turn) {
      if (!value || normaliseTask(value.task) !== 'img2img') return null;
      if (turn && turn.initImageUrl) return referenceFromTurn(value, turn);
      const sources = Array.isArray(value.sources) ? value.sources : [];
      if (sources.length > 0) {
        const source = sources[0];
        return {
          kind: 'source',
          id: source.id,
          url: sourceUrl(value.id, source.id),
          width: source.width || null,
          height: source.height || null,
          name: source.name || '',
          mime: source.mime || '',
          fresh: true,
        };
      }
      return null;
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        if (typeof FileReader === 'undefined') {
          reject(new Error('FileReader unavailable'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('read failed'));
        reader.readAsDataURL(file);
      });
    }

    function formatClock(seconds) {
      const total = Math.max(0, Math.floor(Number(seconds) || 0));
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const rest = String(total % 60).padStart(2, '0');
      if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${rest}`;
      return `${String(minutes).padStart(2, '0')}:${rest}`;
    }

    function formatSeconds(seconds) {
      const total = Math.max(0, Math.floor(Number(seconds) || 0));
      return total < 60 ? `${total}s` : formatClock(total);
    }

    function formatDuration(ms) {
      const value = Number(ms);
      if (!Number.isFinite(value) || value <= 0) return formatSeconds(0);
      return formatSeconds(value / 1000);
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

    function clampNumber(value, fallback, min, max) {
      const number = Number(value);
      if (!Number.isFinite(number)) return fallback;
      return Math.min(max, Math.max(min, number));
    }

    function snapDimension(value, fallback) {
      const rounded = Math.round(clampNumber(value, fallback, 256, 2048) / 8) * 8;
      return Math.min(2048, Math.max(256, rounded));
    }

    function pickSampler(value, fallback) {
      if (typeof value === 'string' && value.trim() !== '') return value.trim();
      if (typeof fallback === 'string' && fallback.trim() !== '') return fallback.trim();
      return DEFAULT_PARAMS.sampler;
    }

    function normaliseParams(value, fallback) {
      const base = Object.assign({}, DEFAULT_PARAMS, fallback || {});
      const source = value && typeof value === 'object' ? value : {};
      return {
        width: snapDimension(source.width, base.width),
        height: snapDimension(source.height, base.height),
        steps: Math.round(clampNumber(source.steps, clampNumber(base.steps, 28, 1, 150), 1, 150)),
        cfg: Math.round(clampNumber(source.cfg, clampNumber(base.cfg, 5, 0, 30), 0, 30) * 10) / 10,
        sampler: pickSampler(source.sampler, base.sampler),
      };
    }

    function paramsEqual(left, right) {
      if (!left || !right) return false;
      const a = normaliseParams(left);
      const b = normaliseParams(right);
      return a.width === b.width
        && a.height === b.height
        && a.steps === b.steps
        && a.cfg === b.cfg
        && a.sampler === b.sampler;
    }

    function messageOf(failure) {
      if (!failure) return 'unknown';
      if (typeof failure === 'string') return failure;
      return failure.message ? failure.message : String(failure);
    }

    function httpError(response, payload) {
      const detail = payload && payload.error;
      const error = new Error(detail && detail.message ? detail.message : `HTTP ${response.status}`);
      error.status = response.status;
      error.code = detail && detail.code ? detail.code : '';
      return error;
    }

    async function readJson(response) {
      let payload = null;
      try {
        payload = await response.json();
      } catch (_) {
        payload = null;
      }
      if (!response.ok || !payload || payload.ok === false) throw httpError(response, payload);
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

    function Icon({ size = 15, children }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block', flex: 'none' },
      }, children);
    }

    function SparkIcon({ size = 15 }) {
      return h(Icon, { size },
        h('path', { d: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' }),
        h('path', { d: 'M18.6 15.4l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z', fill: 'currentColor' }));
    }

    function BrainIcon({ size = 15 }) {
      return h(Icon, { size },
        h('path', { d: 'M9.2 5.2a3 3 0 0 0-3 3 2.8 2.8 0 0 0-.7 5.4 3 3 0 0 0 5.4 2.6V6.6a2.2 2.2 0 0 0-1.7-1.4z', stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round' }),
        h('path', { d: 'M14.8 5.2a3 3 0 0 1 3 3 2.8 2.8 0 0 1 .7 5.4 3 3 0 0 1-5.4 2.6V6.6a2.2 2.2 0 0 1 1.7-1.4z', stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round' }),
        h('path', { d: 'M12 16.5V20', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }));
    }

    function RefreshIcon({ size = 14 }) {
      return h(Icon, { size },
        h('path', { d: 'M19.2 12a7.2 7.2 0 1 1-2.1-5.1', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }),
        h('path', { d: 'M19.5 4.4v4.2h-4.2', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }));
    }

    function SaveIcon({ size = 14 }) {
      return h(Icon, { size },
        h('path', { d: 'M12 3.8v10.4', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }),
        h('path', { d: 'M7.8 10.2L12 14.4l4.2-4.2', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M4.6 16.6v2.1c0 .8.6 1.4 1.4 1.4h12c.8 0 1.4-.6 1.4-1.4v-2.1', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }));
    }

    function CopyIcon({ size = 14 }) {
      return h(Icon, { size },
        h('rect', { x: 8.4, y: 8.4, width: 11, height: 11, rx: 2, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('path', { d: 'M15.6 8.4V6.6c0-1-.8-1.8-1.8-1.8H6.4c-1 0-1.8.8-1.8 1.8v7.4c0 1 .8 1.8 1.8 1.8h1.8', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }));
    }

    function CheckIcon({ size = 14 }) {
      return h(Icon, { size },
        h('path', { d: 'M4.8 12.4l4.5 4.5L19.4 6.8', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }));
    }

    function StopIcon({ size = 14 }) {
      return h(Icon, { size },
        h('rect', { x: 6.5, y: 6.5, width: 11, height: 11, rx: 2.2, fill: 'currentColor' }));
    }

    function EyeIcon({ size = 14 }) {
      return h(Icon, { size },
        h('path', { d: 'M2.8 12s3.5-6 9.2-6 9.2 6 9.2 6-3.5 6-9.2 6-9.2-6-9.2-6z', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' }),
        h('circle', { cx: 12, cy: 12, r: 2.6, stroke: 'currentColor', strokeWidth: 1.6 }));
    }

    function ImageIcon({ size = 14 }) {
      return h(Icon, { size },
        h('rect', { x: 3.4, y: 4.2, width: 17.2, height: 15.6, rx: 2.4, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('circle', { cx: 8.8, cy: 9.4, r: 1.6, fill: 'currentColor' }),
        h('path', { d: 'M4.4 17l4.9-4.9 3.7 3.6 2.7-2.6 3.9 3.9', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }));
    }

    function SidebarIcon({ size = 20, active }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block', opacity: active ? 1 : 0.8 },
      },
        h('rect', { x: 2.8, y: 4, width: 18.4, height: 16, rx: 3, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('circle', { cx: 8.2, cy: 9.4, r: 1.7, fill: 'currentColor' }),
        h('path', { d: 'M4.4 17.4l5.2-5.2 3.6 3.5 2.8-2.7 3.6 3.6', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M19.2 2.2l.75 1.95 1.95.75-1.95.75-.75 1.95-.75-1.95-1.95-.75 1.95-.75z', fill: 'currentColor' }));
    }

    function Panel({ t }) {
      const [health, setHealth] = React.useState(null);
      const [healthError, setHealthError] = React.useState('');
      const [healthLoading, setHealthLoading] = React.useState(false);
      const [engineChoice, setEngineChoice] = React.useState('');
      const [task, setTask] = React.useState('txt2img');
      const [txtDescription, setTxtDescription] = React.useState('');
      const [imgDescription, setImgDescription] = React.useState('');
      const [aspect, setAspect] = React.useState('');
      const [txtStyle, setTxtStyle] = React.useState('');
      const [imgStyle, setImgStyle] = React.useState('');
      const [denoise, setDenoise] = React.useState(0.55);
      const [reference, setReference] = React.useState(null);
      const [uploading, setUploading] = React.useState(false);
      const [dragActive, setDragActive] = React.useState(false);
      const [taskLoading, setTaskLoading] = React.useState(false);
      const [plan, setPlan] = React.useState(null);
      const [planning, setPlanning] = React.useState(false);
      const [session, setSession] = React.useState(null);
      const [activeTurnId, setActiveTurnId] = React.useState('');
      const [draft, setDraft] = React.useState({
        positive: '',
        negative: '',
        params: normaliseParams(DEFAULT_PARAMS),
      });
      const [feedback, setFeedback] = React.useState('');
      const [useVision, setUseVision] = React.useState(true);
      const [generating, setGenerating] = React.useState(false);
      const [cancelling, setCancelling] = React.useState(false);
      const [startedAt, setStartedAt] = React.useState(0);
      const [now, setNow] = React.useState(Date.now());
      const [error, setError] = React.useState('');
      const [notice, setNotice] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [preferences, setPreferences] = React.useState([]);
      const [history, setHistory] = React.useState([]);
      const [historyLoading, setHistoryLoading] = React.useState(false);
      const [saving, setSaving] = React.useState(false);
      const [copied, setCopied] = React.useState(false);
      const [loadingSession, setLoadingSession] = React.useState(false);

      const mountedRef = React.useRef(true);
      const activeTurnIdRef = React.useRef('');
      const generationRef = React.useRef(null);
      const copyTimerRef = React.useRef(0);
      const sessionLoadRef = React.useRef(0);
      const fileInputRef = React.useRef(null);
      /* denoise 滑块是「用户手动覆盖」：未拖动时不发送，让服务端采纳模型建议的
         重绘幅度（如风格跃迁时模型给的 0.85），拖动后才以用户值为准。 */
      const denoiseDirtyRef = React.useRef(false);

      const defaults = health && health.defaults && typeof health.defaults === 'object'
        ? health.defaults
        : DEFAULT_PARAMS;
      const defaultsRef = React.useRef(defaults);
      defaultsRef.current = defaults;

      const isImgTask = task === 'img2img';
      const description = isImgTask ? imgDescription : txtDescription;
      const style = isImgTask ? imgStyle : txtStyle;
      const busyLock = generating || planning;
      const composerLocked = busyLock || uploading || taskLoading;

      const applySession = React.useCallback((value, focusTurnId) => {
        if (!value || typeof value !== 'object') return;
        const nextTask = normaliseTask(value.task);
        setTask(nextTask);
        setSession(value);
        const rows = Array.isArray(value.turns) ? value.turns : [];
        const lastTurn = rows.length > 0 ? rows[rows.length - 1] : null;
        let focus = focusTurnId || '';
        if (!focus && activeTurnIdRef.current && rows.some((row) => row.id === activeTurnIdRef.current)) {
          focus = activeTurnIdRef.current;
        }
        if (!focus && lastTurn) focus = lastTurn.id;
        setActiveTurnId(focus);
        activeTurnIdRef.current = focus;
        const target = focus ? rows.find((row) => row.id === focus) : null;
        if (target) {
          setDraft({
            positive: target.positive || '',
            negative: target.negative || '',
            params: normaliseParams(target.params, defaultsRef.current),
          });
        }
        if (nextTask === 'img2img') {
          const denoiseValue = target && target.denoise !== undefined && target.denoise !== null
            ? target.denoise
            : defaultsRef.current.denoise;
          setDenoise(normaliseDenoise(denoiseValue));
          denoiseDirtyRef.current = false;
          setReference(referenceFromSession(value, target));
        } else {
          setReference(null);
        }
      }, []);

      const refreshHealth = React.useCallback(async () => {
        setHealthLoading(true);
        try {
          const result = await getJson('/health');
          if (!mountedRef.current) return;
          setHealth(result);
          setHealthError('');
          setPreferences(Array.isArray(result.preferences)
            ? result.preferences.filter((row) => row && row.id)
            : []);
        } catch (failure) {
          if (!mountedRef.current) return;
          setHealthError(messageOf(failure));
        } finally {
          if (mountedRef.current) setHealthLoading(false);
        }
      }, []);

      /* 选择出图引擎（drawthings / comfy）：立即检测可用性并标绿；
       * 选择会保存到服务端，生成时按它路由。 */
      const pickEngine = React.useCallback(async (engine) => {
        setEngineChoice(engine);
        setHealthLoading(true);
        try {
          const result = await postJson('/backend', { backend: engine });
          if (!mountedRef.current) return;
          if (result && result.ok && result.health) {
            setHealth(result.health);
          }
        } catch (_) {
          /* 保存失败不打断选择，生成时仍会按引擎路由 */
        } finally {
          if (mountedRef.current) setHealthLoading(false);
        }
      }, []);

      const refreshHistory = React.useCallback(async () => {
        setHistoryLoading(true);
        try {
          const result = await getJson('/history?limit=20');
          if (!mountedRef.current) return;
          setHistory(Array.isArray(result.sessions) ? result.sessions.filter((row) => row && row.id) : []);
        } catch (_) {
          if (!mountedRef.current) return;
          setHistory([]);
        } finally {
          if (mountedRef.current) setHistoryLoading(false);
        }
      }, []);

      const loadTaskSession = React.useCallback(async (nextTask) => {
        const token = sessionLoadRef.current + 1;
        sessionLoadRef.current = token;
        setTaskLoading(true);
        try {
          const result = await getJson(`/session?task=${nextTask}`);
          if (token !== sessionLoadRef.current || !mountedRef.current) return;
          if (result.session) {
            applySession(result.session);
          } else {
            setSession(null);
            setActiveTurnId('');
            activeTurnIdRef.current = '';
            setDraft(emptyDraft());
            setPlan(null);
            setReference(null);
            if (nextTask === 'img2img') setDenoise(normaliseDenoise(defaultsRef.current.denoise));
          }
        } catch (failure) {
          if (token !== sessionLoadRef.current || !mountedRef.current) return;
          setSession(null);
          setActiveTurnId('');
          activeTurnIdRef.current = '';
          setDraft(emptyDraft());
          setReference(null);
          setError(t('error.session', { message: messageOf(failure) }));
        } finally {
          if (token === sessionLoadRef.current && mountedRef.current) setTaskLoading(false);
        }
      }, [applySession, t]);

      const switchTask = React.useCallback((nextTask) => {
        if (nextTask === task || busyLock || uploading || taskLoading) return;
        setTask(nextTask);
        setPlan(null);
        setFeedback('');
        setError('');
        setNotice('');
        setSession(null);
        setActiveTurnId('');
        activeTurnIdRef.current = '';
        setDraft(emptyDraft());
        setReference(null);
        setDragActive(false);
        setBusy(false);
        if (nextTask === 'img2img') setDenoise(normaliseDenoise(defaultsRef.current.denoise));
        void loadTaskSession(nextTask);
      }, [task, busyLock, uploading, taskLoading, loadTaskSession]);

      const uploadReference = React.useCallback(async (file) => {
        if (!file || uploading || busyLock) return;
        const mime = typeof file.type === 'string' ? file.type.toLowerCase() : '';
        if (mime !== 'image/png' && mime !== 'image/jpeg' && mime !== 'image/jpg' && mime !== 'image/webp') {
          setError(t('error.fileType'));
          return;
        }
        if (Number(file.size) > MAX_IMAGE_BYTES) {
          setError(t('error.fileSize'));
          return;
        }
        setUploading(true);
        setError('');
        setNotice('');
        sessionLoadRef.current += 1;
        setTaskLoading(false);
        try {
          let dataUrl = '';
          try {
            dataUrl = await readFileAsDataUrl(file);
          } catch (_) {
            if (mountedRef.current) setError(t('error.readFile'));
            return;
          }
          const body = { dataUrl, name: file.name || 'reference' };
          if (session && normaliseTask(session.task) === 'img2img') body.sessionId = session.id;
          const result = await postJson('/upload', body);
          if (!mountedRef.current) return;
          setTask('img2img');
          if (result.session) applySession(result.session);
          setDenoise(normaliseDenoise(denoise));
          setPlan(null);
          setFeedback('');
          setActiveTurnId('');
          activeTurnIdRef.current = '';
          setDraft(emptyDraft());
          if (result.source) {
            const source = result.source;
            setReference({
              kind: 'source',
              id: source.id,
              url: source.url || sourceUrl(result.session && result.session.id, source.id),
              width: source.width || null,
              height: source.height || null,
              name: source.name || file.name || '',
              mime: source.mime || mime,
              fresh: true,
            });
          }
          setNotice(t('notice.uploaded', { name: (result.source && result.source.name) || file.name || '—' }));
          void refreshHistory();
        } catch (failure) {
          if (!mountedRef.current) return;
          setError(t('error.upload', { message: messageOf(failure) }));
        } finally {
          if (mountedRef.current) setUploading(false);
        }
      }, [uploading, busyLock, session, denoise, applySession, refreshHistory, t]);

      const handleFilePick = (event) => {
        const input = event && event.target;
        const file = input && input.files && input.files[0];
        if (input) input.value = '';
        if (file) void uploadReference(file);
      };

      const handleDrop = (event) => {
        event.preventDefault();
        setDragActive(false);
        if (task !== 'img2img' || composerLocked) return;
        const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
        if (file) void uploadReference(file);
      };

      const handleDragOver = (event) => {
        if (task !== 'img2img' || composerLocked) return;
        event.preventDefault();
        setDragActive(true);
      };

      const handleDragLeave = () => {
        setDragActive(false);
      };

      const handlePaste = (event) => {
        if (task !== 'img2img' || composerLocked) return;
        const clipboard = event.clipboardData;
        if (!clipboard) return;
        let file = null;
        const items = clipboard.items ? Array.from(clipboard.items) : [];
        for (const item of items) {
          if (item && item.kind === 'file' && typeof item.type === 'string' && item.type.indexOf('image/') === 0) {
            file = item.getAsFile();
            if (file) break;
          }
        }
        if (!file && clipboard.files && clipboard.files.length > 0) file = clipboard.files[0];
        if (!file) return;
        event.preventDefault();
        void uploadReference(file);
      };

      const removeReference = () => {
        setReference(null);
        setPlan(null);
      };

      const useLatestReference = () => {
        if (!session || normaliseTask(session.task) !== 'img2img') return;
        const rows = Array.isArray(session.turns) ? session.turns : [];
        const latest = rows.length > 0 ? rows[rows.length - 1] : null;
        if (!latest || !latest.imageUrl) return;
        setReference({
          kind: 'turn',
          id: latest.id,
          url: latest.imageUrl,
          width: latest.params && latest.params.width ? latest.params.width : null,
          height: latest.params && latest.params.height ? latest.params.height : null,
          name: '',
          mime: latest.mime || '',
          fresh: false,
        });
        setPlan(null);
      };

      React.useEffect(() => {
        mountedRef.current = true;
        void refreshHealth();
        void refreshHistory();
        let disposed = false;
        (async () => {
          try {
            const result = await getJson('/session?task=txt2img');
            if (disposed || !mountedRef.current) return;
            if (result.session) applySession(result.session);
          } catch (_) {
            /* no previous session is fine */
          }
        })();
        const timer = setInterval(() => {
          if (mountedRef.current) void refreshHealth();
        }, 20000);
        return () => {
          disposed = true;
          mountedRef.current = false;
          clearInterval(timer);
          if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        };
      }, [applySession, refreshHealth, refreshHistory]);

      React.useEffect(() => {
        if (!generating) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(timer);
      }, [generating]);

      React.useEffect(() => {
        if (!notice) return undefined;
        const timer = setTimeout(() => setNotice(''), 6000);
        return () => clearTimeout(timer);
      }, [notice]);

      const turns = session && Array.isArray(session.turns) ? session.turns : [];
      const currentTurn = turns.find((turn) => turn.id === activeTurnId) || null;
      /* 简报按轮存档：有 plan 用 plan，否则优先当前轮次自带的 brief/tags，旧会话回落 session.brief。 */
      const brief = plan ? plan.brief : currentTurn && currentTurn.brief ? currentTurn.brief : currentTurn && session ? session.brief : null;
      const rationale = plan ? plan.rationale : currentTurn ? currentTurn.rationale : '';
      const tags = plan && Array.isArray(plan.tags)
        ? plan.tags
        : currentTurn && Array.isArray(currentTurn.tags)
          ? currentTurn.tags
          : [];
      const degraded = plan && plan.degraded
        ? { scope: 'plan', reason: plan.degradedReason || '' }
        : currentTurn && currentTurn.degraded
          ? { scope: 'turn', reason: currentTurn.degradedReason || '' }
          : null;

      const backends = health && health.backends ? health.backends : {};
      const drawthings = backends.drawthings || null;
      const comfy = backends.comfy || null;
      const activeBackend = health && typeof health.active === 'string' ? health.active : '';
      /* 引擎选择以面板为准：未选择时跟随服务端 active；选择后与后端核对并标绿。 */
      const chosenEngine = engineChoice || (activeBackend === 'comfy' || activeBackend === 'drawthings' ? activeBackend : '');
      const backendName = chosenEngine === 'comfy'
        ? t('backend.comfy')
        : chosenEngine === 'drawthings'
          ? t('backend.drawthings')
          : t('backend.none');
      const llm = health && health.llm ? health.llm : null;
      const supportsVision = Boolean(llm && llm.reachable && llm.supportsVision);
      const visionOn = useVision && supportsVision;

      const aspectOptions = [
        { id: '', label: t('aspect.auto') },
        { id: '1:1', label: t('aspect.square') },
        { id: '4:3', label: t('aspect.landscape') },
        { id: '3:4', label: t('aspect.portrait') },
        { id: '16:9', label: t('aspect.wide') },
        { id: '9:16', label: t('aspect.tall') },
      ];
      const styleOptions = [
        { id: '', label: t('style.none') },
        { id: 'photoreal', label: t('style.photoreal') },
        { id: 'photo', label: t('style.photo') },
        { id: 'watercolor', label: t('style.watercolor') },
        { id: 'ink', label: t('style.ink') },
        { id: 'anime', label: t('style.anime') },
        { id: 'oil', label: t('style.oil') },
        { id: 'render3d', label: t('style.render3d') },
        { id: 'minimal', label: t('style.minimal') },
        { id: 'cyberpunk', label: t('style.cyberpunk') },
        { id: 'pixelart', label: t('style.pixelart') },
      ];
      const styleLabel = styleOptions.find((option) => option.id === style);
      const promptDirty = currentTurn
        ? draft.positive !== (currentTurn.positive || '')
          || draft.negative !== (currentTurn.negative || '')
          || !paramsEqual(draft.params, currentTurn.params)
        : false;
      const elapsedSeconds = generating && startedAt
        ? Math.max(0, (now - startedAt) / 1000)
        : 0;

      const pickAspect = (value) => {
        setAspect(value);
        if (plan) {
          setPlan(null);
        }
      };

      const pickStyle = (value) => {
        if (isImgTask) setImgStyle(value);
        else setTxtStyle(value);
        if (plan) {
          setPlan(null);
        }
        /* 调整阶段选风格 = 直接写入换风格反馈，用户可再编辑；「默认」不写反馈。 */
        if (currentTurn) {
          const picked = styleOptions.find((option) => option.id === value);
          if (picked && picked.id) setFeedback(t('style.changeFeedback', { style: picked.label }));
        }
      };

      /* 回到全新的「画什么」状态：清空当前会话与草稿（风格/比例选择保留，方便延续口味）。 */
      const startFreshCreation = () => {
        setSession(null);
        setActiveTurnId('');
        activeTurnIdRef.current = '';
        setPlan(null);
        setFeedback('');
        setTxtDescription('');
        setImgDescription('');
        setReference(null);
        setDraft({ positive: '', negative: '', params: normaliseParams(DEFAULT_PARAMS) });
        setError('');
        setNotice('');
      };

      const changeDescription = (value) => {
        if (isImgTask) setImgDescription(value);
        else setTxtDescription(value);
        if (plan) {
          setPlan(null);
        }
      };

      const updateParams = (key, value) => {
        setDraft((previous) => ({
          ...previous,
          params: Object.assign({}, previous.params, { [key]: value }),
        }));
      };

      const requestPlan = React.useCallback(async () => {
        const text = description.trim();
        if (busyLock || uploading) return;
        const imgSession = Boolean(session && normaliseTask(session.task) === 'img2img');
        if (isImgTask && !reference && (!imgSession || turns.length === 0)) {
          setError(t('img2img.needImage'));
          return;
        }
        if (!text && !isImgTask) {
          setError(t('error.needDescription'));
          return;
        }
        setPlanning(true);
        setError('');
        setNotice('');
        setBusy(false);
        try {
          const body = { description: text };
          if (isImgTask) {
            body.task = 'img2img';
            /* 仅用户拖过滑块才覆盖，否则让规划模型建议重绘幅度。 */
            if (denoiseDirtyRef.current) body.denoise = normaliseDenoise(denoise);
            if (imgSession) body.sessionId = session.id;
            if (reference && reference.kind === 'source' && reference.id) body.sourceId = reference.id;
          } else if (aspect) {
            body.aspect = aspect;
          }
          const styleValue = styleLabel && styleLabel.id ? styleLabel.label : '';
          if (styleValue) body.style = styleValue;
          const result = await postJson('/plan', body);
          if (!mountedRef.current) return;
          const value = result.plan && typeof result.plan === 'object' ? result.plan : {};
          setPlan(value);
          if (!isImgTask) setSession(null);
          setActiveTurnId('');
          activeTurnIdRef.current = '';
          setDraft({
            positive: value.positive || '',
            negative: value.negative || '',
            params: normaliseParams(value.params, defaults),
          });
          if (isImgTask && value.denoise !== undefined && value.denoise !== null) {
            setDenoise(normaliseDenoise(value.denoise, denoise));
          }
          setFeedback('');
          setNotice(t('notice.planReady'));
        } catch (failure) {
          if (!mountedRef.current) return;
          if (failure && failure.code === 'busy') {
            setBusy(true);
          } else {
            setError(t('error.plan', { message: messageOf(failure) }));
          }
          void refreshHealth();
        } finally {
          if (mountedRef.current) setPlanning(false);
        }
      }, [description, aspect, style, styleLabel, busyLock, uploading, isImgTask, session, reference, denoise, turns.length, defaults, refreshHealth, t]);

      const runGeneration = React.useCallback(async (payload) => {
        if (generating) return;
        const token = {};
        generationRef.current = token;
        setGenerating(true);
        setCancelling(false);
        setBusy(false);
        setError('');
        setNotice('');
        const startedAt = Date.now();
        setStartedAt(startedAt);
        setNow(startedAt);
        try {
          const result = await postJson('/generate', payload);
          if (generationRef.current !== token || !mountedRef.current) return;
          if (result.session) {
            applySession(result.session, result.turn && result.turn.id ? result.turn.id : '');
          }
          if (result.turn) setFeedback('');
          setPlan(null);
          /* 成败在结果区反馈：成功带引擎与耗时。 */
          const usedEngine = result.turn && result.turn.backend === 'comfy' ? t('engine.comfy') : t('engine.drawthings');
          const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
          setNotice(t('engine.success', { engine: usedEngine, seconds: `${seconds}s` }));
          void refreshHistory();
          void refreshHealth();
        } catch (failure) {
          if (generationRef.current !== token || !mountedRef.current) return;
          const code = failure && failure.code;
          if (code === 'cancelled' || code === 'canceled') {
            setNotice(t('error.cancelled'));
            void refreshHistory();
          } else if (code === 'busy') {
            setBusy(true);
            void refreshHistory();
          } else {
            /* 失败信息由服务端给出（含引擎名与指引），这里只负责展示。 */
            setError(t('engine.failed', { message: messageOf(failure) }));
          }
          void refreshHealth();
        } finally {
          if (generationRef.current === token) {
            generationRef.current = null;
            if (mountedRef.current) {
              setGenerating(false);
              setCancelling(false);
            }
          }
        }
      }, [generating, chosenEngine, applySession, refreshHistory, refreshHealth, t]);

      const generateFresh = React.useCallback(() => {
        if (generating || planning || isImgTask) return;
        if (!description.trim() && !(plan && draft.positive.trim())) {
          setError(t('error.needDescription'));
          return;
        }
        const planAspect = plan && plan.brief && typeof plan.brief.aspect === 'string' && plan.brief.aspect
          ? plan.brief.aspect
          : aspect;
        const planStyle = plan && plan.brief && typeof plan.brief.style === 'string'
          ? plan.brief.style.trim()
          : '';
        const styleValue = planStyle || (styleLabel && styleLabel.id ? styleLabel.label : '');
        const payload = {};
        if (chosenEngine) payload.backend = chosenEngine;
        if (description.trim()) payload.description = description.trim();
        if (planAspect) payload.aspect = planAspect;
        if (styleValue) payload.style = styleValue;
        if (plan) {
          payload.params = normaliseParams(draft.params, defaults);
          payload.positive = draft.positive;
          payload.negative = draft.negative;
          if (plan.brief && typeof plan.brief === 'object') payload.brief = plan.brief;
        }
        void runGeneration(payload);
      }, [generating, planning, isImgTask, description, plan, aspect, styleLabel, draft, defaults, chosenEngine, runGeneration, t]);

      const generateImg2img = React.useCallback(() => {
        if (busyLock || uploading) return;
        const imgSession = Boolean(session && normaliseTask(session.task) === 'img2img');
        const rows = session && Array.isArray(session.turns) ? session.turns : [];
        const freshSource = reference && reference.kind === 'source' && reference.fresh && reference.id;
        if (!freshSource && !(imgSession && rows.length > 0)) {
          setError(t('img2img.needImage'));
          return;
        }
        const planStyle = plan && plan.brief && typeof plan.brief.style === 'string'
          ? plan.brief.style.trim()
          : '';
        const styleValue = planStyle || (styleLabel && styleLabel.id ? styleLabel.label : '');
        const payload = { task: 'img2img' };
        /* 仅用户拖过滑块才覆盖，否则让规划模型建议重绘幅度（风格跃迁时会给高值）。 */
        if (denoiseDirtyRef.current) payload.denoise = normaliseDenoise(denoise);
        if (chosenEngine) payload.backend = chosenEngine;
        if (imgSession) payload.sessionId = session.id;
        if (freshSource) payload.sourceId = reference.id;
        if (description.trim()) payload.description = description.trim();
        if (styleValue) payload.style = styleValue;
        if (plan) {
          payload.positive = draft.positive;
          payload.negative = draft.negative;
          if (plan.brief && typeof plan.brief === 'object') payload.brief = plan.brief;
        }
        void runGeneration(payload);
      }, [busyLock, uploading, session, reference, denoise, description, styleLabel, plan, draft, chosenEngine, runGeneration, t]);

      const refine = React.useCallback(() => {
        if (!currentTurn || !session || generating || planning) return;
        const text = feedback.trim();
        const payload = {
          sessionId: session.id,
          turnId: currentTurn.id,
          feedback: text,
        };
        if (chosenEngine) payload.backend = chosenEngine;
        if (promptDirty || !text) {
          payload.positive = draft.positive;
          payload.negative = draft.negative;
          if (!session || normaliseTask(session.task) !== 'img2img') {
            payload.params = normaliseParams(draft.params, defaults);
          }
        }
        if (session && normaliseTask(session.task) === 'img2img' && denoiseDirtyRef.current) {
          payload.denoise = normaliseDenoise(denoise);
        }
        if (supportsVision) payload.useVision = Boolean(useVision);
        void runGeneration(payload);
      }, [currentTurn, session, generating, planning, feedback, promptDirty, draft, defaults, denoise, chosenEngine, supportsVision, useVision, runGeneration, t]);

      /* 阶段化输入框的调整路径：内容就是「画什么」框当前文字（feedback 状态）；
         无反馈且未改提示词时直接按现有提示词换种子重 roll（variation）。 */
      const refineFromComposer = refine;

      const cancelGeneration = React.useCallback(async () => {
        if (!generating || cancelling) return;
        setCancelling(true);
        try {
          await postJson('/cancel', session && session.id ? { sessionId: session.id } : {});
          generationRef.current = null;
          if (!mountedRef.current) return;
          setGenerating(false);
          setCancelling(false);
          setNotice(t('notice.cancelled'));
          void refreshHistory();
        } catch (failure) {
          if (!mountedRef.current) return;
          setCancelling(false);
          setError(t('error.cancel', { message: messageOf(failure) }));
        }
      }, [generating, cancelling, session, refreshHistory, t]);

      const acceptTurn = React.useCallback(async () => {
        if (!session || !currentTurn || currentTurn.accepted || busyLock) return;
        setError('');
        setNotice('');
        try {
          const result = await postJson('/accept', { sessionId: session.id, turnId: currentTurn.id });
          if (!mountedRef.current) return;
          if (result.session) applySession(result.session, currentTurn.id);
          if (Array.isArray(result.preferences)) {
            setPreferences(result.preferences.filter((row) => row && row.id));
          }
          if (result.preference && result.preference.text) {
            setNotice(t('notice.acceptedPref', { text: result.preference.text }));
          } else {
            setNotice(t('notice.accepted'));
          }
          void refreshHealth();
          void refreshHistory();
        } catch (failure) {
          if (!mountedRef.current) return;
          setError(t('error.accept', { message: messageOf(failure) }));
        }
      }, [session, currentTurn, busyLock, applySession, refreshHealth, refreshHistory, t]);

      const deletePreference = React.useCallback(async (id) => {
        if (!id) return;
        setError('');
        try {
          const result = await postJson('/preference/delete', { id });
          if (!mountedRef.current) return;
          setPreferences(Array.isArray(result.preferences) ? result.preferences : []);
          setNotice(t('notice.preferenceDeleted'));
        } catch (failure) {
          if (!mountedRef.current) return;
          setError(t('error.preference', { message: messageOf(failure) }));
        }
      }, [t]);

      const copyPrompt = React.useCallback(async () => {
        const positive = draft.positive.trim();
        if (!positive) return;
        const text = draft.negative.trim() ? `${positive}\n\n${draft.negative.trim()}` : positive;
        try {
          if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
            throw new Error('clipboard unavailable');
          }
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setNotice(t('notice.copied'));
          if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
          copyTimerRef.current = setTimeout(() => setCopied(false), 1600);
        } catch (_) {
          setError(t('error.copy'));
        }
      }, [draft, t]);

      const saveImage = React.useCallback(async () => {
        if (!currentTurn || !currentTurn.imageUrl || saving) return;
        setSaving(true);
        setError('');
        try {
          const response = await fetch(currentTurn.imageUrl, {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          const mime = (currentTurn.mime || blob.type || 'image/png').toLowerCase();
          const extension = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
          const objectUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = objectUrl;
          link.download = `image-studio-${session && session.id ? session.id : 'session'}-${currentTurn.id || 'turn'}.${extension}`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        } catch (failure) {
          if (!mountedRef.current) return;
          setError(t('error.save', { message: messageOf(failure) }));
        } finally {
          if (mountedRef.current) setSaving(false);
        }
      }, [currentTurn, saving, session, t]);

      const selectTurn = React.useCallback((turn) => {
        if (!turn) return;
        setActiveTurnId(turn.id);
        activeTurnIdRef.current = turn.id;
        setDraft({
          positive: turn.positive || '',
          negative: turn.negative || '',
          params: normaliseParams(turn.params, defaultsRef.current),
        });
        if (session && normaliseTask(session.task) === 'img2img') {
          setDenoise(normaliseDenoise(turn.denoise, defaultsRef.current.denoise));
          setReference(referenceFromTurn(session, turn));
        }
        setPlan(null);
        setFeedback('');
        setError('');
        setNotice('');
      }, [session]);

      const loadSession = React.useCallback(async (id) => {
        if (!id || busyLock) return;
        sessionLoadRef.current += 1;
        setTaskLoading(false);
        setLoadingSession(true);
        setError('');
        setNotice('');
        try {
          const result = await getJson(`/session?id=${encodeURIComponent(id)}`);
          if (!mountedRef.current) return;
          if (result.session) {
            applySession(result.session);
            setPlan(null);
            setFeedback('');
            setAspect('');
            setTxtStyle('');
            setImgStyle('');
          }
        } catch (failure) {
          if (!mountedRef.current) return;
          setError(t('error.session', { message: messageOf(failure) }));
        } finally {
          if (mountedRef.current) setLoadingSession(false);
        }
      }, [busyLock, applySession, t]);

      const imgSession = Boolean(session && normaliseTask(session.task) === 'img2img');
      const imgHasLatest = Boolean(imgSession && turns.length > 0);
      const freshSource = Boolean(reference && reference.kind === 'source' && reference.fresh && reference.id);
      const canGenerateImg = !composerLocked && (freshSource || imgHasLatest);
      const canPlan = !composerLocked && Boolean(description.trim())
        && (!isImgTask || Boolean(reference || imgHasLatest));
      const canFreshGenerate = !composerLocked && !isImgTask && Boolean(description.trim() || (plan && draft.positive.trim()));
      const canUsePlan = isImgTask ? canGenerateImg : canFreshGenerate;
      const canRefine = Boolean(currentTurn && session && !composerLocked && (feedback.trim() || promptDirty));
      const showPlanCard = Boolean(plan || currentTurn);
      const turnIndex = currentTurn && Number.isFinite(Number(currentTurn.index)) ? String(currentTurn.index) : '';

      /* 引擎 pill 只显示名称，不做就绪染色：成败由生成后的结果区反馈。 */
      let backendPill = h('span', { className: 'dsi-pill' },
        h('span', { className: 'dsi-dot' }),
        h('span', null, t('pill.checking')));
      if (health) {
        backendPill = h('span', { className: 'dsi-pill' },
          h('span', { className: 'dsi-dot dsi-dot--ok' }),
          h('b', null, backendName));
      }

      let llmPill = h('span', { className: 'dsi-pill' },
        h('span', { className: 'dsi-dot' }),
        h('span', null, t('pill.checking')));
      if (health) {
        const reachable = Boolean(llm && llm.reachable);
        llmPill = h('span', { className: `dsi-pill ${reachable ? 'dsi-pill--ok' : 'dsi-pill--bad'}` },
          h('span', { className: `dsi-dot ${reachable ? 'dsi-dot--ok' : 'dsi-dot--bad'}` }),
          h('span', null, reachable && llm && llm.model
            ? t('pill.llm', { model: llm.model })
            : t('pill.llmOffline')),
          reachable && supportsVision ? h('span', { className: 'dsi-pill-tag' }, t('pill.vision')) : null);
      }

      const banners = [];
      if (healthError) {
        banners.push(h('div', { className: 'dsi-banner dsi-banner--error', role: 'alert', key: 'health' },
          h('div', { className: 'dsi-banner-body' },
            h('div', null, t('error.service')),
            h('div', { className: 'dsi-subtle' }, healthError)),
          h('button', {
            type: 'button',
            className: 'dsi-btn dsi-btn--sm',
            disabled: healthLoading,
            onClick: () => void refreshHealth(),
          }, t('action.refresh'))));
      }
      if (busy) {
        banners.push(h('div', { className: 'dsi-banner dsi-banner--warn', role: 'status', key: 'busy' },
          h('div', { className: 'dsi-banner-body' },
            h('div', { className: 'dsi-banner-title' }, t('status.busy')),
            t('error.busy')),
          h('button', {
            type: 'button',
            className: 'dsi-btn dsi-btn--sm',
            onClick: () => setBusy(false),
          }, t('action.dismiss'))));
      }
      if (error) {
        banners.push(h('div', { className: 'dsi-banner dsi-banner--error', role: 'alert', key: 'error' },
          h('div', { className: 'dsi-banner-body' }, error)));
      }
      if (notice) {
        banners.push(h('div', { className: 'dsi-banner dsi-banner--ok', role: 'status', key: 'notice' },
          h('div', { className: 'dsi-banner-body' }, notice)));
      }

      const styleRow = h('div', { className: 'dsi-row' },
        h('span', { className: 'dsi-field-label' }, t('composer.style')),
        h('div', { className: 'dsi-chips' }, styleOptions.map((option) => h('button', {
          key: option.id || 'none',
          type: 'button',
          className: `dsi-chip${style === option.id ? ' dsi-chip--on' : ''}`,
          'aria-pressed': style === option.id,
          disabled: composerLocked,
          onClick: () => pickStyle(option.id),
        }, option.label))));
      const styleNote = styleLabel && styleLabel.id
        ? h('p', { className: 'dsi-hint' }, t('composer.styleNote', { style: styleLabel.label }))
        : null;
      const composerStatus = generating
        ? h('div', { className: 'dsi-live', role: 'status' },
          h('span', { className: 'dsi-spinner' }),
          h('span', null, t('status.generating')),
          h('span', { className: 'dsi-time' }, t('status.elapsed', { seconds: formatSeconds(elapsedSeconds) })),
          h('button', {
            type: 'button',
            className: 'dsi-btn dsi-btn--sm dsi-btn--danger',
            disabled: cancelling,
            onClick: () => void cancelGeneration(),
          }, h(StopIcon), cancelling ? t('action.cancelling') : t('action.cancel')))
        : planning
          ? h('div', { className: 'dsi-live', role: 'status' },
            h('span', { className: 'dsi-spinner' }),
            h('span', null, t('status.planning')))
          : null;

      const fileInput = h('input', {
        className: 'dsi-file-input',
        type: 'file',
        accept: 'image/png,image/jpeg,image/webp',
        ref: fileInputRef,
        onChange: handleFilePick,
        tabIndex: -1,
        'aria-hidden': true,
      });

      let referenceBlock = null;
      if (reference) {
        const dimensions = reference.width && reference.height ? `${reference.width}×${reference.height}` : '';
        const referenceName = reference.kind === 'turn'
          ? t('img2img.latestName')
          : reference.name || t('img2img.reference');
        referenceBlock = h('div', {
          className: 'dsi-ref',
          onDragOver: handleDragOver,
          onDragLeave: handleDragLeave,
          onDrop: handleDrop,
        },
          h('img', { className: 'dsi-ref-thumb', src: reference.url, alt: referenceName, loading: 'lazy' }),
          h('div', { className: 'dsi-ref-body' },
            h('div', { className: 'dsi-ref-name' }, referenceName),
            dimensions ? h('div', { className: 'dsi-ref-meta' }, dimensions) : null,
            uploading
              ? h('div', { className: 'dsi-live' }, h('span', { className: 'dsi-spinner' }), h('span', null, t('img2img.uploading')))
              : null),
          h('div', { className: 'dsi-ref-actions' },
            h('button', {
              type: 'button',
              className: 'dsi-btn dsi-btn--sm dsi-btn--ghost',
              disabled: composerLocked,
              onClick: () => { if (fileInputRef.current) fileInputRef.current.click(); },
            }, t('img2img.replace')),
            h('button', {
              type: 'button',
              className: 'dsi-btn dsi-btn--sm dsi-btn--ghost',
              disabled: composerLocked,
              onClick: removeReference,
            }, t('img2img.remove'))));
      } else {
        referenceBlock = h('button', {
          type: 'button',
          className: `dsi-upload${dragActive ? ' dsi-upload--drag' : ''}${uploading ? ' dsi-upload--busy' : ''}`,
          disabled: composerLocked,
          'aria-label': t('img2img.drop'),
          onClick: () => { if (fileInputRef.current) fileInputRef.current.click(); },
          onDragOver: handleDragOver,
          onDragLeave: handleDragLeave,
          onDrop: handleDrop,
        },
          h('span', { className: 'dsi-upload-icon' }, h(ImageIcon, { size: 22 })),
          h('span', { className: 'dsi-upload-title' }, uploading ? t('img2img.uploading') : t('img2img.drop')),
          h('span', { className: 'dsi-upload-hint' }, t('img2img.paste')),
          h('span', { className: 'dsi-upload-hint' }, t('img2img.formats')));
      }

      const denoiseValue = normaliseDenoise(denoise);
      const denoiseBlock = h('div', { className: 'dsi-denoise' },
        h('div', { className: 'dsi-denoise-head' },
          h('span', { className: 'dsi-label' }, t('denoise.label')),
          h('span', { className: 'dsi-denoise-value' }, denoiseValue.toFixed(2))),
        h('input', {
          className: 'dsi-range',
          type: 'range',
          min: 0.15,
          max: 0.95,
          step: 0.01,
          value: denoiseValue,
          disabled: composerLocked,
          'aria-label': t('denoise.label'),
          onChange: (event) => {
            setDenoise(normaliseDenoise(event.target.value));
            denoiseDirtyRef.current = true;
          },
        }),
        h('div', { className: 'dsi-denoise-ticks' },
          h('span', { className: denoiseValue < 0.4 ? 'dsi-denoise-tick--on' : '' }, t('denoise.tune')),
          h('span', { className: denoiseValue >= 0.4 && denoiseValue < 0.7 ? 'dsi-denoise-tick--on' : '' }, t('denoise.balance')),
          h('span', { className: denoiseValue >= 0.7 ? 'dsi-denoise-tick--on' : '' }, t('denoise.overhaul'))),
        h('p', { className: 'dsi-hint' }, t('denoise.hint')));

      /* 单一「画什么」输入框按阶段变形：无结果时是新描述；有结果轮次时变成
         反馈框（占位/按钮/语义随之切换），不再单独列出「继续调整」区。 */
      const inRefineStage = Boolean(currentTurn);
      /* 生成后「再次生成」始终可用：填了反馈走精修，空着则换种子重 roll。 */
      const canRefineFromComposer = inRefineStage && !composerLocked;
      const refineContext = inRefineStage
        ? h('div', { className: 'dsi-refine-context' },
          currentTurn.feedback ? h('span', { className: 'dsi-subtle' }, t('feedback.last', { text: currentTurn.feedback })) : null,
          Array.isArray(currentTurn.changes) && currentTurn.changes.length > 0
            ? h('span', { className: 'dsi-subtle' }, `${t('brief.changes')}: ${currentTurn.changes.filter((c) => typeof c === 'string' && c.trim() !== '').slice(0, 3).join('、')}`)
            : null)
        : null;

      /* 单一输入框按阶段变形：无结果时是新描述；有结果轮次时变成反馈框（标题改
         「继续调整」、按钮变「再次生成」）；风格选择始终显示，调整阶段点风格 = 写入换风格反馈。 */
      const txtComposer = h('section', { className: 'dsi-card dsi-composer' },
        h('div', { className: 'dsi-card-head' },
          h('h2', { className: 'dsi-h2' }, inRefineStage ? t('composer.titleRefine') : t('composer.title')),
          inRefineStage
            ? h('button', {
              type: 'button',
              className: 'dsi-btn dsi-btn--sm dsi-btn--ghost',
              disabled: composerLocked,
              onClick: startFreshCreation,
            }, h(SparkIcon), t('composer.newCreation'))
            : null),
        refineContext,
        styleRow,
        styleNote,
        h('textarea', {
          className: 'dsi-textarea',
          rows: 4,
          id: 'dsi-description',
          value: inRefineStage ? feedback : description,
          disabled: composerLocked,
          placeholder: inRefineStage ? t('feedback.placeholder') : t('composer.placeholder'),
          'aria-label': t('composer.label'),
          onChange: (event) => (inRefineStage ? setFeedback(event.target.value) : changeDescription(event.target.value)),
        }),
        inRefineStage
          ? null
          : h('div', { className: 'dsi-row' },
            h('span', { className: 'dsi-field-label' }, t('composer.aspect')),
            h('div', { className: 'dsi-chips' }, aspectOptions.map((option) => h('button', {
              key: option.id || 'auto',
              type: 'button',
              className: `dsi-chip${aspect === option.id ? ' dsi-chip--on' : ''}`,
              'aria-pressed': aspect === option.id,
              disabled: composerLocked,
              onClick: () => pickAspect(option.id),
            }, option.label)))),
        h('div', { className: 'dsi-actions' },
          inRefineStage
            ? h('button', {
              type: 'button',
              className: 'dsi-btn dsi-btn--primary',
              disabled: !canRefineFromComposer,
              onClick: refineFromComposer,
            }, h(SparkIcon), t('feedback.regenerate'))
            : h('button', {
              type: 'button',
              className: 'dsi-btn dsi-btn--primary',
              disabled: !canFreshGenerate,
              onClick: generateFresh,
              title: canFreshGenerate ? '' : t('error.needDescription'),
            }, h(SparkIcon), t('composer.generate')),
          inRefineStage ? null : h('button', {
            type: 'button',
            className: 'dsi-btn dsi-btn--ghost',
            disabled: !canPlan,
            onClick: () => void requestPlan(),
          }, h(BrainIcon), planning ? t('composer.planning') : t('composer.plan'))),
        composerStatus,
        h('p', { className: 'dsi-hint' }, inRefineStage ? t('feedback.hint') : t('composer.hint')));

      const imgComposer = h('section', { className: 'dsi-card dsi-composer' },
        h('div', { className: 'dsi-card-head' },
          h('h2', { className: 'dsi-h2' }, inRefineStage ? t('composer.titleRefine') : t('img2img.composer'))),
        fileInput,
        referenceBlock,
        imgHasLatest
          ? h('div', { className: 'dsi-actions' },
            h('button', {
              type: 'button',
              className: 'dsi-btn dsi-btn--sm dsi-btn--ghost',
              disabled: composerLocked,
              onClick: useLatestReference,
            }, h(RefreshIcon), t('img2img.useLatest')))
          : null,
        imgHasLatest && !freshSource
          ? h('p', { className: 'dsi-hint' }, t('img2img.continueSession'))
          : null,
        denoiseBlock,
        styleRow,
        styleNote,
        h('div', { className: 'dsi-field' },
          h('label', { className: 'dsi-label', htmlFor: 'dsi-img-description' },
            inRefineStage ? t('composer.titleRefine') : t('img2img.optionalDesc')),
          h('textarea', {
            className: 'dsi-textarea',
            rows: 3,
            id: 'dsi-img-description',
            value: inRefineStage ? feedback : description,
            disabled: composerLocked,
            placeholder: inRefineStage ? t('feedback.placeholder') : t('img2img.optionalDescPlaceholder'),
            onChange: (event) => (inRefineStage ? setFeedback(event.target.value) : changeDescription(event.target.value)),
          })),
        h('div', { className: 'dsi-actions' },
          inRefineStage
            ? h('button', {
              type: 'button',
              className: 'dsi-btn dsi-btn--primary',
              disabled: !canRefineFromComposer,
              onClick: refineFromComposer,
            }, h(SparkIcon), t('feedback.regenerate'))
            : h('button', {
              type: 'button',
              className: 'dsi-btn dsi-btn--primary',
              disabled: !canGenerateImg,
              onClick: generateImg2img,
              title: canGenerateImg ? '' : t('img2img.needImage'),
            }, h(SparkIcon), t('composer.generate')),
          inRefineStage ? null : h('button', {
            type: 'button',
            className: 'dsi-btn dsi-btn--ghost',
            disabled: !canPlan,
            onClick: () => void requestPlan(),
          }, h(BrainIcon), planning ? t('composer.planning') : t('composer.plan'))),
        composerStatus,
        h('p', { className: 'dsi-hint' }, inRefineStage ? t('feedback.hint') : t('img2img.hint')));

      const composerCard = isImgTask ? imgComposer : txtComposer;

      let briefCard = null;
      if (showPlanCard) {
        const briefLabels = {
          intent: t('brief.intent'),
          subject: t('brief.subject'),
          style: t('brief.style'),
          composition: t('brief.composition'),
          lighting: t('brief.lighting'),
          palette: t('brief.palette'),
          aspect: t('brief.aspect'),
        };
        const briefItems = BRIEF_FIELDS
          .filter((field) => brief && brief[field] !== undefined && brief[field] !== null && String(brief[field]).trim() !== '')
          .map((field) => h('div', { className: 'dsi-brief-item', key: field },
            h('em', null, briefLabels[field]),
            h('span', null, String(brief[field]))));
        briefCard = h('section', { className: 'dsi-card dsi-brief' },
          h('div', { className: 'dsi-card-head' },
            h('div', { className: 'dsi-card-head-main' },
              h('h2', { className: 'dsi-h2' }, t('brief.title')),
              h('span', { className: 'dsi-pill' }, plan
                ? t('brief.planned')
                : t('brief.current', { index: turnIndex || '1' }))),
            session && session.title ? h('span', { className: 'dsi-subtle' }, session.title) : null),
          degraded
            ? h('div', { className: 'dsi-banner dsi-banner--warn', role: 'status', style: { marginTop: 0 } },
              degraded.scope === 'plan'
                ? t('brief.planDegraded', { reason: degraded.reason || '—' })
                : t('brief.turnDegraded', { reason: degraded.reason || '—' }))
            : null,
          briefItems.length > 0 ? h('div', { className: 'dsi-brief-grid' }, briefItems) : null,
          tags.length > 0 ? h('div', { className: 'dsi-chips' },
            h('span', { className: 'dsi-label' }, t('brief.tags')),
            tags.map((tag, index) => h('span', { className: 'dsi-chip', key: `${tag}-${index}` }, String(tag)))) : null,
          rationale ? h('div', { className: 'dsi-rationale' },
            h('b', null, t('brief.rationale')),
            String(rationale)) : null,
          h('div', null,
            h('label', { className: 'dsi-label', htmlFor: 'dsi-positive' }, t('brief.positive')),
            h('textarea', {
              id: 'dsi-positive',
              className: 'dsi-textarea dsi-textarea--prompt',
              rows: 3,
              value: draft.positive,
              disabled: busyLock,
              onChange: (event) => setDraft((previous) => ({ ...previous, positive: event.target.value })),
            })),
          h('div', null,
            h('label', { className: 'dsi-label', htmlFor: 'dsi-negative' }, t('brief.negative')),
            h('textarea', {
              id: 'dsi-negative',
              className: 'dsi-textarea dsi-textarea--negative',
              rows: 2,
              value: draft.negative,
              disabled: busyLock,
              onChange: (event) => setDraft((previous) => ({ ...previous, negative: event.target.value })),
            })),
          !isImgTask
            ? h('div', null,
              h('span', { className: 'dsi-label' }, t('brief.params')),
                          h('div', { className: 'dsi-params', style: { marginTop: 6 } },
                            h('label', { className: 'dsi-param' }, t('brief.width'),
                              h('input', {
                                className: 'dsi-input',
                                type: 'number',
                                min: 256,
                                max: 2048,
                                step: 8,
                                value: draft.params.width,
                                disabled: busyLock,
                                onChange: (event) => updateParams('width', event.target.value),
                              })),
                            h('label', { className: 'dsi-param' }, t('brief.height'),
                              h('input', {
                                className: 'dsi-input',
                                type: 'number',
                                min: 256,
                                max: 2048,
                                step: 8,
                                value: draft.params.height,
                                disabled: busyLock,
                                onChange: (event) => updateParams('height', event.target.value),
                              })),
                            h('label', { className: 'dsi-param' }, t('brief.steps'),
                              h('input', {
                                className: 'dsi-input',
                                type: 'number',
                                min: 1,
                                max: 150,
                                step: 1,
                                value: draft.params.steps,
                                disabled: busyLock,
                                onChange: (event) => updateParams('steps', event.target.value),
                              })),
                            h('label', { className: 'dsi-param' }, t('brief.cfg'),
                              h('input', {
                                className: 'dsi-input',
                                type: 'number',
                                min: 0,
                                max: 30,
                                step: 0.5,
                                value: draft.params.cfg,
                                disabled: busyLock,
                                onChange: (event) => updateParams('cfg', event.target.value),
                              })),
                            h('label', { className: 'dsi-param dsi-param--wide' }, t('brief.sampler'),
                              h('input', {
                                className: 'dsi-input',
                                type: 'text',
                                value: draft.params.sampler,
                                disabled: busyLock,
                                onChange: (event) => updateParams('sampler', event.target.value),
                              }))))
            : null,
          plan
            ? h('div', { className: 'dsi-actions' },
              h('button', {
                type: 'button',
                className: 'dsi-btn dsi-btn--primary',
                disabled: !canUsePlan,
                onClick: isImgTask ? generateImg2img : generateFresh,
              }, h(SparkIcon), t('action.usePlan')))
            : null);
      }

      let resultCard = null;
      if (currentTurn || generating || plan) {
        const turn = currentTurn;
        const imageUrl = turn && turn.imageUrl ? turn.imageUrl : '';
        const isImgTurn = Boolean(turn && (normaliseTask(turn.task) === 'img2img'
          || (session && normaliseTask(session.task) === 'img2img')) && turn.initImageUrl);
        const initFromLabel = (value) => {
          const text = typeof value === 'string' ? value : '';
          if (text.indexOf('source:') === 0) return t('initFrom.source', { id: text.slice(7) });
          if (text.indexOf('turn:') === 0) return t('initFrom.turn', { id: text.slice(5) });
          return text;
        };
        const metaItems = [];
        if (turn) {
          if (turn.backend) metaItems.push(h('span', { key: 'backend' }, `${t('result.backend')} `, h('b', null, turn.backend === 'comfy' ? t('backend.comfy') : t('backend.drawthings'))));
          if (turn.model) metaItems.push(h('span', { key: 'model' }, `${t('result.model')} `, h('b', null, turn.model)));
          if (turn.seed !== undefined && turn.seed !== null) metaItems.push(h('span', { key: 'seed' }, `${t('result.seed')} `, h('b', null, String(turn.seed))));
          if (turn.params) metaItems.push(h('span', { key: 'size' }, `${t('result.size')} `, h('b', null, `${turn.params.width}×${turn.params.height}`)));
          if (Number.isFinite(Number(turn.denoise))) {
            metaItems.push(h('span', { key: 'denoise' }, `${t('result.denoise')} `, h('b', null, normaliseDenoise(turn.denoise).toFixed(2))));
          }
          if (turn.initFrom) {
            metaItems.push(h('span', { key: 'initFrom' }, `${t('result.initFrom')} `, h('b', null, initFromLabel(turn.initFrom))));
          }
          if (Number.isFinite(Number(turn.elapsedMs)) && Number(turn.elapsedMs) > 0) {
            metaItems.push(h('span', { key: 'elapsed' }, `${t('result.elapsed')} `, h('b', null, formatDuration(turn.elapsedMs))));
          }
        }
        const figureHead = (label) => h('figcaption', { className: 'dsi-figure-head' }, h('span', null, label));
        const outputFigure = h('figure', { className: 'dsi-figure dsi-figure--output' },
          figureHead(t('result.output')),
          imageUrl
            ? h('img', {
              className: 'dsi-figure-image',
              src: imageUrl,
              alt: session && session.title ? session.title : t('result.output'),
              decoding: 'async',
            })
            : h('div', { className: 'dsi-figure-skeleton' },
              h('span', { className: 'dsi-spinner' }),
              h('span', null, t('result.generating')),
              h('span', { className: 'dsi-time' }, t('status.elapsed', { seconds: formatSeconds(elapsedSeconds) })),
              h('button', {
                type: 'button',
                className: 'dsi-btn dsi-btn--sm dsi-btn--danger',
                disabled: cancelling,
                onClick: () => void cancelGeneration(),
              }, h(StopIcon), cancelling ? t('action.cancelling') : t('action.cancel'))));
        const initFigure = isImgTurn
          ? h('figure', { className: 'dsi-figure dsi-figure--init' },
            figureHead(t('result.init')),
            h('img', {
              className: 'dsi-figure-image',
              src: turn.initImageUrl,
              alt: t('result.init'),
              decoding: 'async',
            }))
          : null;
        const pendingInit = !turn && generating && isImgTask && reference && reference.url;
        let frame;
        if (isImgTurn) {
          frame = h('div', { className: 'dsi-pair' }, initFigure, outputFigure);
        } else if (pendingInit) {
          frame = h('div', { className: 'dsi-pair' },
            h('figure', { className: 'dsi-figure dsi-figure--init' },
              figureHead(t('result.init')),
              h('img', { className: 'dsi-figure-image', src: reference.url, alt: t('img2img.reference'), decoding: 'async' })),
            outputFigure);
        } else {
          frame = h('div', { className: 'dsi-frame' },
            imageUrl
              ? h('img', {
                className: 'dsi-image',
                src: imageUrl,
                alt: session && session.title ? session.title : t('result.title'),
                decoding: 'async',
              })
              : generating
                ? h('div', { className: 'dsi-skeleton' },
                  h('span', { className: 'dsi-spinner' }),
                  h('span', null, t('result.generating')),
                  h('span', { className: 'dsi-time' }, t('status.elapsed', { seconds: formatSeconds(elapsedSeconds) })),
                  h('button', {
                    type: 'button',
                    className: 'dsi-btn dsi-btn--danger',
                    disabled: cancelling,
                    onClick: () => void cancelGeneration(),
                  }, h(StopIcon), cancelling ? t('action.cancelling') : t('action.cancel')))
                : h('div', { className: 'dsi-frame-empty' }, t('result.placeholder')));
        }
        resultCard = h('section', { className: 'dsi-card dsi-result' },
          h('div', { className: 'dsi-card-head' },
            h('div', { className: 'dsi-card-head-main' },
              h('h2', { className: 'dsi-h2' }, t('result.title')),
              turn && turn.accepted ? h('span', { className: 'dsi-accepted' }, h(CheckIcon), t('result.accepted')) : null,
              turn && turn.degraded ? h('span', { className: 'dsi-pill dsi-pill--bad' }, t('result.degraded')) : null),
            turn && turn.index ? h('span', { className: 'dsi-pill' }, t('result.turn', { index: String(turn.index) })) : null),
          frame,
          metaItems.length > 0 ? h('div', { className: 'dsi-meta' }, metaItems) : null,
          turn && turn.critique
            ? h('div', { className: 'dsi-critique' },
              h('b', null, t('brief.critique')),
              String(turn.critique))
            : null,
          h('div', { className: 'dsi-actions' },
            h('button', {
              type: 'button',
              className: 'dsi-btn',
              disabled: !turn || !imageUrl || saving,
              onClick: () => void saveImage(),
            }, h(SaveIcon), saving ? t('action.saving') : t('action.save')),
            h('button', {
              type: 'button',
              className: 'dsi-btn',
              disabled: !draft.positive,
              onClick: () => void copyPrompt(),
            }, h(CopyIcon), copied ? t('action.copied') : t('action.copyPrompt')),
            h('button', {
              type: 'button',
              className: 'dsi-btn',
              disabled: !turn || Boolean(turn.accepted) || busyLock,
              onClick: () => void acceptTurn(),
            }, h(CheckIcon), turn && turn.accepted ? t('action.accepted') : t('action.accept')),
            turn && imageUrl
              ? h('a', {
                className: 'dsi-btn dsi-btn--ghost',
                href: imageUrl,
                target: '_blank',
                rel: 'noreferrer',
              }, h(ImageIcon), t('action.openImage'))
              : null,
            generating
              ? h('button', {
                type: 'button',
                className: 'dsi-btn dsi-btn--danger',
                disabled: cancelling,
                onClick: () => void cancelGeneration(),
              }, h(StopIcon), cancelling ? t('action.cancelling') : t('action.cancel'))
              : null));
      }

      const turnsCard = turns.length > 0
        ? h('section', { className: 'dsi-card dsi-turns' },
          h('div', { className: 'dsi-card-head' },
            h('div', { className: 'dsi-card-head-main' },
              h('h2', { className: 'dsi-h2' }, t('turns.title')),
              h('span', { className: 'dsi-pill' }, t('turns.count', { count: String(turns.length) })),
              turns.some((turn) => turn.accepted)
                ? h('span', { className: 'dsi-pill dsi-pill--ok' }, t('turns.acceptedCount', { count: String(turns.filter((turn) => turn.accepted).length) }))
                : null),
            h('button', {
              type: 'button',
              className: 'dsi-icon-btn',
              title: t('health.refresh'),
              'aria-label': t('health.refresh'),
              disabled: healthLoading,
              onClick: () => void refreshHealth(),
            }, h(RefreshIcon))),
          h('div', { className: 'dsi-thumbs' }, turns.map((turn) => h('button', {
            key: turn.id,
            type: 'button',
            className: `dsi-thumb${turn.id === activeTurnId ? ' dsi-thumb--active' : ''}`,
            title: t('turns.view', { index: String(turn.index || 1) }),
            'aria-label': t('turns.view', { index: String(turn.index || 1) }),
            disabled: composerLocked,
            onClick: () => selectTurn(turn),
          },
            turn.imageUrl ? h('img', { src: turn.imageUrl, alt: `${t('result.title')} ${turn.index || ''}`, loading: 'lazy' }) : null,
            h('span', { className: 'dsi-thumb-badge' }, `#${turn.index || 1}`),
            turn.accepted ? h('span', { className: 'dsi-thumb-ok' }, '✓') : null))))
        : h('section', { className: 'dsi-card dsi-turns' },
          h('div', { className: 'dsi-card-head' },
            h('div', { className: 'dsi-card-head-main' },
              h('h2', { className: 'dsi-h2' }, t('turns.title')),
              h('span', { className: 'dsi-pill' }, t('turns.count', { count: '0' })))),
          h('p', { className: 'dsi-hint' }, t('turns.empty')));

      /* 出图引擎单选卡：纯选择，不做预检标注；成败只在生成后的结果区反馈。 */
      const engineCard = h('section', { className: 'dsi-card dsi-card--tight dsi-engine' },
        h('div', { className: 'dsi-card-head' },
          h('div', { className: 'dsi-card-head-main' },
            h('h2', { className: 'dsi-h2' }, t('engine.title'))),
          h('button', {
            type: 'button',
            className: `dsi-icon-btn${healthLoading ? ' dsi-icon-btn--spin' : ''}`,
            title: t('health.refresh'),
            'aria-label': t('health.refresh'),
            disabled: healthLoading,
            onClick: () => void refreshHealth(),
          }, h(RefreshIcon))),
        h('div', { className: 'dsi-engine-options', role: 'radiogroup', 'aria-label': t('engine.title') },
          ['drawthings', 'comfy'].map((engine) => {
            const selected = chosenEngine === engine;
            return h('button', {
              key: engine,
              type: 'button',
              className: 'dsi-engine-option',
              role: 'radio',
              'aria-checked': selected ? 'true' : 'false',
              disabled: composerLocked,
              onClick: () => void pickEngine(engine),
            },
            h('span', { className: 'dsi-engine-name' }, engine === 'comfy' ? t('engine.comfy') : t('engine.drawthings')),
            selected ? h('span', { className: 'dsi-engine-check', title: t('engine.selected') }, h(CheckIcon)) : null);
          })),
        h('p', { className: 'dsi-hint' }, t('engine.hint')));

      const preferencesCard = h('section', { className: 'dsi-card dsi-card--tight dsi-prefs' },
        h('div', { className: 'dsi-card-head' },
          h('div', { className: 'dsi-card-head-main' },
            h('h2', { className: 'dsi-h2' }, t('prefs.title')),
            h('span', { className: 'dsi-pill' }, t('prefs.count', { count: String(preferences.length) })))),
        preferences.length > 0
          ? h('div', { className: 'dsi-pref-chips' }, preferences.map((row) => h('div', { className: 'dsi-pref', key: row.id },
            h('span', null, String(row.text)),
            h('button', {
              type: 'button',
              className: 'dsi-pref-del',
              title: t('prefs.delete'),
              'aria-label': t('prefs.delete'),
              onClick: () => void deletePreference(row.id),
            }, '×'))))
          : h('p', { className: 'dsi-hint' }, t('prefs.empty')),
        h('p', { className: 'dsi-hint' }, t('prefs.note')));

      const sessionsCard = h('section', { className: 'dsi-card dsi-card--tight dsi-history' },
        h('div', { className: 'dsi-card-head' },
          h('h2', { className: 'dsi-h2' }, t('history.title')),
          h('button', {
            type: 'button',
            className: `dsi-icon-btn${historyLoading ? ' dsi-icon-btn--spin' : ''}`,
            title: t('health.refresh'),
            'aria-label': t('health.refresh'),
            disabled: historyLoading,
            onClick: () => void refreshHistory(),
          }, h(RefreshIcon))),
        historyLoading && history.length === 0 ? h('p', { className: 'dsi-hint' }, t('history.loading')) : null,
        history.length > 0
          ? h('div', { className: 'dsi-sessions' }, history.map((row) => h('button', {
            key: row.id,
            type: 'button',
            className: `dsi-session${session && session.id === row.id ? ' dsi-session--active' : ''}`,
            disabled: composerLocked || loadingSession,
            onClick: () => void loadSession(row.id),
          },
            row.cover && row.cover.imageUrl
              ? h('img', { className: 'dsi-session-cover', src: row.cover.imageUrl, alt: '', loading: 'lazy' })
              : h('span', { className: 'dsi-session-cover' }),
            h('span', { className: 'dsi-session-body' },
              h('span', { className: 'dsi-session-title' }, row.title || row.id),
              h('span', { className: 'dsi-session-meta' },
                h('span', { className: `dsi-task-badge${normaliseTask(row.task) === 'img2img' ? ' dsi-task-badge--img' : ''}` },
                  normaliseTask(row.task) === 'img2img' ? t('task.img2img') : t('task.txt2img')),
                ` · ${formatDateTime(row.updatedAt || row.createdAt)}`,
                row.turns !== undefined ? ` · ${t('history.turns', { count: String(row.turns) })}` : '',
                session && session.id === row.id ? ` · ${t('history.active')}` : '')))))
          : !historyLoading ? h('p', { className: 'dsi-hint' }, t('history.empty')) : null);

      const taskTabs = h('div', { className: 'dsi-toolbar' },
        h('div', { className: 'dsi-tabs', role: 'tablist', 'aria-label': t('task.label') },
          h('button', {
            type: 'button',
            role: 'tab',
            'aria-selected': !isImgTask,
            className: `dsi-tab${!isImgTask ? ' dsi-tab--on' : ''}`,
            disabled: composerLocked || taskLoading,
            onClick: () => switchTask('txt2img'),
          }, h(SparkIcon, { size: 14 }), t('task.txt2img')),
          h('button', {
            type: 'button',
            role: 'tab',
            'aria-selected': isImgTask,
            className: `dsi-tab${isImgTask ? ' dsi-tab--on' : ''}`,
            disabled: composerLocked || taskLoading,
            onClick: () => switchTask('img2img'),
          }, h(ImageIcon, { size: 14 }), t('task.img2img'))),
        taskLoading
          ? h('span', { className: 'dsi-pill' }, h('span', { className: 'dsi-spinner' }), t('task.loading'))
          : null);

      const footer = h('footer', { className: 'dsi-footer' },
        h('p', null, t('footer.local')),
        h('p', null, t('footer.slow')),
        h('p', null, t('footer.save')),
        h('p', null, t('footer.preferences')));

      return h('div', { className: 'dsi-root', 'aria-busy': generating ? 'true' : 'false', onPaste: handlePaste },
        h('div', { className: 'dsi-shell' },
          h('header', { className: 'dsi-header' },
            h('div', null,
              h('p', { className: 'dsi-kicker' },
                t('panel.kicker')),
              h('h1', { className: 'dsi-title' }, t('panel.title')),
              h('p', { className: 'dsi-sub' }, t('panel.subtitle')),
              taskTabs),
            h('div', { className: 'dsi-pills' },
              h('span', { className: 'dsi-pill' }, t('pill.local')),
              backendPill, llmPill,
              h('button', {
                type: 'button',
                className: `dsi-icon-btn${healthLoading ? ' dsi-icon-btn--spin' : ''}`,
                title: t('health.refresh'),
                'aria-label': t('health.refresh'),
                disabled: healthLoading,
                onClick: () => void refreshHealth(),
              }, h(RefreshIcon)))),
          banners.length > 0 ? h('div', null, banners) : null,
          h('div', { className: 'dsi-layout' },
            h('main', { className: 'dsi-main' },
              composerCard,
              briefCard,
              resultCard,
              turnsCard),
            h('aside', { className: 'dsi-side' },
              engineCard,
              preferencesCard,
              sessionsCard)),
          footer));
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
        order: 30,
        label: () => translate('sidebar.label'),
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
