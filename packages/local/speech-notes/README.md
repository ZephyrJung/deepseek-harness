# 语音速记（@local/dsh-speech-notes）

左侧栏的语音速记面板。录音与转写完全交给本机 `/Users/Zephyr/bin/v2t` 的 `-live` 模式，转写结束后可调用本机 Ollama 模型生成中文总结。

## 工作方式

1. 面板点击“开始录音”后，Host 插件启动：

   ```text
   v2t -live -out <session>/transcript.txt -lang <lang> -chunk 12 -blank 3 [-r|-i]
   ```

   - 麦克风：`-r`
   - 系统声音：`-i`
   - 麦克风 + 系统声音：两个都不加（v2t 默认两路混录）

2. v2t 在 `-live` 模式下按 `-chunk` 秒切片并后台转写，文本实时追加到 `transcript.txt`。
3. 浏览器每秒轮询 `/api/speech-notes/state`，把 `transcript.txt` 的增量显示在面板里。
4. 停止时 Host 向 v2t 发送 `SIGINT`，等待它把剩余音频转写完，然后读取最终 `transcript.txt`。
5. “生成总结”调用本机 Ollama 的 `/api/chat`，流式返回 Markdown 总结；长文本会先分块提取要点再合并。

音频、转写和总结都只在本机处理，不会上传云端。

## 数据位置

```text
$DSH_HOME/speech-notes/            # 默认 ~/.dsh/speech-notes
├── runtime.json                   # 插件每次加载时写入的诊断信息
└── sessions/
    └── 20261029-090000-ab12cd34/
        ├── meta.json              # 时间、来源、语言、状态
        ├── transcript.txt         # v2t -live 实时写出的转写
        ├── summary.md             # 最近一次总结
        └── audio.wav              # 仅 saveAudio: true 时存在
```

## 配置

在 profile 的 `cordis.patch.yml` 中覆盖 `speech-notes` 行的 `config`，所有字段可选：

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `binary` | 自动查找 `/Users/Zephyr/bin/v2t`、`~/bin/v2t`、PATH | v2t 可执行文件 |
| `dataDir` | `$DSH_HOME/speech-notes` | 会话数据目录 |
| `chunkSeconds` | `12` | v2t `-chunk`，实时切片长度 |
| `blankSeconds` | `3` | v2t `-blank`，跳过长静音 |
| `stopTimeoutMs` | `120000` | 停止时等待 v2t 收尾的上限 |
| `saveAudio` | `false` | 同时保留整场 `audio.wav` |
| `summary.baseUrl` | `http://127.0.0.1:11434` | 本机 Ollama 地址 |
| `summary.model` | `qwen3.8:27b-mlx` | 总结模型 |
| `summary.maxChars` | `12000` | 单次送入模型的字符上限 |
| `summary.maxChunks` | `4` | 长文本分块上限 |
| `summary.numCtx` | `16384` | Ollama `num_ctx` |
| `summary.numPredict` | `1400` | Ollama `num_predict` |
| `summary.temperature` | `0.2` | 采样温度 |
| `summary.timeoutMs` | `600000` | 单次模型调用超时 |

示例：

```yaml
- id: speech-notes
  name: '@local/dsh-speech-notes'
  config:
    summary:
      model: qwen3.8:27b-mlx
      maxChars: 16000
```

环境变量也可作为默认值：`DSH_V2T_BIN`、`DSH_OLLAMA_URL`、`DSH_SUMMARY_MODEL`。

## Host API

全部挂在已认证的 Connection Fetch 路由下，供面板调用：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/speech-notes/health` | v2t 路径/可用性、Ollama 模型列表与可用性 |
| GET | `/api/speech-notes/state?session=<id>` | 当前会话状态、实时转写、总结 |
| POST | `/api/speech-notes/start` | `{ source, language }` 开始录音 |
| POST | `/api/speech-notes/stop` | `{ sessionId }` 停止并读取最终转写 |
| POST | `/api/speech-notes/summarize` | `{ sessionId }`，返回 NDJSON 流 |
| GET | `/api/speech-notes/history` | 最近 20 条速记 |

`summarize` 的 NDJSON 事件：`start`、`progress`、`chunk`、`done`、`error`、`cancelled`。


## 重装 DSH 后重新加载

这个插件是 profile 的本地 bundle，不依赖插件市场或云端。迁移时只需保留整个 `speech-notes` 目录（或本仓库导出的 zip/tgz）：

1. 把解压后的目录放在一个长期位置，例如 `~/Documents/dsh-plugins/speech-notes`。
2. 新装 DSH 首次启动后，打开左侧 **Plugins / 插件** 页面，选择 **安装 bundle / Install bundle**，填写该目录的绝对路径。
3. 安装并启用「语音速记」。插件管理器会自动把依赖写进 profile，并把 `@local/dsh-speech-notes` 加入 `dsh.profile.bundles`。
4. 打开语音速记面板，先用健康状态确认 v2t 路径和 Ollama 模型可用。

高级方式（Web/CLI profile）：

```bash
dsh plugin --profile <profile> add /absolute/path/to/speech-notes
```

然后确认 profile 的 `package.json` 中 `dsh.profile.bundles` 包含 `@local/dsh-speech-notes`。Desktop 的 `desktop` profile 由桌面应用管理，`dsh plugin --profile desktop` 需要先完全退出应用，并使用应用自带的命令运行时。

注意：插件包不包含历史速记。旧速记在 `~/.dsh/speech-notes/sessions/`，如需保留请单独备份。

## 测试

```bash
node test/harness.mjs        # 假 v2t + 假 Ollama，验证完整 Host 生命周期与流式总结
node test/real-summary.mjs   # 可选：用真实本机 Ollama 总结一段固定转写（不录音）
```

真实录音需要在 GUI 中点击“开始录音”；`real-summary.mjs` 不触碰麦克风，只验证本地总结链路。

## 权限与故障排查

- **麦克风**：首次录音 macOS 可能弹权限请求；若 v2t 启动即退出，面板会显示 stderr 摘要。
- **系统声音**：需要屏幕/音频录制权限。失败时改用麦克风，或用 BlackHole 等虚拟声卡把系统输出接到输入设备。
- **Ollama**：`curl http://127.0.0.1:11434/api/tags` 应列出模型；未启动时面板会提示，录音仍然可用。
- **v2t 路径**：面板健康状态会显示实际使用的路径；找不到时可在配置里写 `binary`。
