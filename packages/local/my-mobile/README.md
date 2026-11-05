# MyMobile 手机控制

把 **MobileControl**（本机 Go 单二进制，基于 adb 的安卓镜像/控制服务）接到 DeepSeek Harness
的模型工具层。插件自身不含任何设备逻辑，只是把每个 `mobile_*` 工具映射到 MobileControl 的一个
HTTP 接口；服务按需自动拉起，插件卸载时自动关闭。

## 前提

| 项 | 说明 |
| --- | --- |
| 二进制 | `~/bin/mobilecontrol`（默认查找位置，也可在配置里指定 `binaryPath`） |
| adb | 二进制同级的 `bin/platform-tools/adb`；二进制自带查找逻辑，无需装到 PATH |
| ffmpeg | 仅网页镜像需要；截图与触控不依赖 |
| 手机 | USB 连接并已授权调试（`adb devices` 显示 `device`） |

编译与安装（在 MobileControl 仓库里执行一次即可）：

```bash
go build -trimpath -ldflags "-s -w" -o ~/bin/mobilecontrol .
mkdir -p ~/bin/bin
cp -R bin/platform-tools ~/bin/bin/ && cp bin/scrcpy-server-v1.25 ~/bin/bin/
```

## 挂载

插件位于 `~/Documents/deepseek-harness/default-workspace/my-mobile`，通过 desktop profile 的
依赖与 `dsh.profile.bundles` 登记后生效：

```yaml
# ~/.dsh/profiles/desktop/cordis.patch.yml 由 profile 的 package.json 汇总，
# 插件行本身写在 my-mobile/cordis.patch.yml：
- insert:
    - id: my-mobile
      name: '@local/dsh-my-mobile'
      config: {}
```

## 工具

| 工具 | 作用 | 对应接口 |
| --- | --- | --- |
| `mobile_status` | adb/ffmpeg 健康、设备列表、选中设备与分辨率/电量 | `GET /api/status` |
| `mobile_select` | 切换目标设备 | `POST /api/select` |
| `mobile_screenshot` | 截取当前屏幕，落盘 PNG 并返回路径 | `GET /api/screenshot` |
| `mobile_tap` | 单击坐标 | `POST /api/action` (`tap`) |
| `mobile_swipe` | 滑动 | `POST /api/action` (`swipe`) |
| `mobile_long_press` | 长按 | `POST /api/action` (`longpress`) |
| `mobile_key` | 单个按键（back/home/enter…） | `POST /api/action` (`key`) |
| `mobile_text` | 输入文本（ASCII 可靠） | `POST /api/action` (`text`) |
| `mobile_launch_app` | 按包名启动应用 | `POST /api/action` (`app`) |
| `mobile_wake` | 点亮屏幕到锁屏 | `POST /api/action` (`wake`) |
| `mobile_look` | 让本机视觉模型**读屏**：概括当前界面并给出可点元素的相对坐标 | 截图 → Ollama `/api/chat`（带图） |
| `mobile_quality` | 镜像画质预设 | `POST /api/quality` |
| `mobile_restart` | 重启本地服务与 adb 连接 | `POST /api/restart` |

`mobile_look` 是给纯文本模型补的「眼睛」：它把当前截图（缩到 720 px 宽、JPEG）交给本机
`qwen3.8:27b-mlx`，返回一句界面描述 + 最多 12 个控件（名称/角色/0~1 相对坐标）。
拿到 `fx/fy` 再换算成像素调 `mobile_tap`，就不必猜坐标了。

## 面板

插件在应用主区提供一个「手机控制台」面板（`client.js`，交互参考 MobileControl 自带网页、
样式遵循 harness 的设计令牌）：

布局分三块：左侧是手机镜像，右侧一列是操作类卡片（工作状态+指令输入、画面与设备、系统按键、
脚本录制、截图录屏、上传文件），镜像正下方是信息类卡片（执行记录、最近文件）。
窄于 1100 px 时三块改为纵向堆叠（镜像 → 操作 → 信息）。

设备型号/序列号/系统这些**只在页面顶端的状态行显示一次**，右侧和下方都不再重复。

**工作状态与指令输入是同一张卡**：模型要用户确认时，用户的回答就是在指令框里再写一句话，
所以状态和输入框不分开。卡内从上到下是：待工作 → 解析中 → 工作中（第 N 步 + 已用时长）
→ 已完成 / 待确认 / 已暂停 / 出错，一根细分隔线，然后是模式切换、指令框和主按钮。
待确认是模型自己说「不知道该点哪里」，附带它的理由和候选。

主按钮只有一个，位置固定：空闲时叫**执行**，停下留下断点时叫**继续**——此时框里写了字就是
补充条件（它问删哪个应用，你答「计算器」），不写就是原样接着走。运行中主按钮换成「执行中…」
并在旁边出现「停止」（当前这一轮请求返回后生效）。
设备选择只在接入多台手机时出现，单机时不占地方。

- **实时画面**：优先连接 MobileControl 的 `ws://…/ws/video/{serial}` 镜像流（JPEG 帧）；
  跨端口 WebSocket 被拦截时自动退回「截图轮询」（每 1.1 s 拉一帧）。
- **触控映射**：在画面上点击/拖拽/长按，按设备分辨率换算成 `tap`/`swipe`/`longpress` 下发，
  轮询模式下动作后自动刷新画面。
- **指令输入**：用一句话描述要做的事，指令框上方那行有三档解析方式（选择记在 localStorage）：

  | 档位 | 谁来解析 | 特点 |
  | --- | --- | --- |
  | 规则 | 面板本地正则（`splitSteps` + `parseStep` + `APP_ALIASES`） | 瞬间、不联网，只认固定句式 |
  | 模型 | 本机 Ollama 一次规划 `POST /api/my-mobile/plan` | 整句 → 动作序列一次执行；看不到屏幕 |
  | 看屏 | 本机视觉模型逐步执行 `POST /api/my-mobile/agent/step` | 每步先看实时截图再决定动作，多级页面也能走对 |

  「看屏」是默认档：宿主截当前画面 → 缩到 720 px 宽 JPEG（约 100 KB / 1.2k token）→ 交给
  `qwen3.8:27b-mlx`（`capabilities` 含 `vision`）→ 只返回**一个**动作 → 执行 → 再截图。
  **不按步数收工**：一轮任务只有三种结束方式——模型回 `{"done":true}`（目标达成）、
  回 `{"pause":true,"say":"…"}`（它不知道该点哪里，把判断交回给你）、或你按「停止」。

  两档模型解析都不盲目信任模型输出：每一步都过白名单与范围校验（kind 枚举、相对坐标换算并
  夹紧到屏幕、包名/按键/画质白名单、录屏 3–600 s、文本 ≤500 字），不合法的动作直接丢弃。
  模型未运行、超时（默认 60 s）或返回非 JSON 时**自动回退**上一档，并在执行记录里写明原因。

  该模型是 thinking 模型，思考链同样计入 `num_predict`：预算给小了，思考会把它吃光，
  Ollama 会返回 `done_reason: "length"` 且 `content` 为空——回答一个字都没开始。所以
  `llm.think` 默认 **false**（每步约 4 s，开启思考要 27–44 s），一旦回复为空或不是 JSON，
  宿主会自动重试一次（开启思考、预算提到 3000），再不行就从思考块里抢救 JSON；仍失败才报错，
  错误里写明截断原因和消耗的 token 数。

  看屏模式另有三道护栏：上一轮画面哈希与当前相同就明确告诉模型「上一步没生效」、
  同一动作连续 4 次即停、连续两轮画面无变化即停——后两者说明模型在猜，会先升级一轮深思
  （`think: true`）再试，仍不动就停成「待确认」。停不等于失败：任何结束都留下断点，主按钮变成
  「继续」，步数和用时留在状态行里。停在「待确认」时直接再打一句话就是补充条件（例如它问要删
  哪个应用，你回「计算器」），面板会把这句话接在原目标后面继续跑，不用重打整条指令。
  执行失败的动作（例如中文输入不支持）也会写进下发给模型的历史里，让它换路径而不是重试。
- **截图与录屏**：截图保存到 `screenshotDir`；录屏把 MobileControl 镜像流
  （`ws://…/ws/video/{serial}` 的 JPEG 帧）用 ffmpeg 重编码为 MP4（3–600 s，可提前停止），
  成片保存在 `screenshotDir/Recordings`——不依赖设备端的 `screenrecord`
  （部分国产 ROM 的 adb 里没有这个二进制）。
- **上传到手机**：选择本地文件（≤64 MB）后 `adb push` 到 Download/Pictures/Movies/Documents。
- **脚本录制**：把「在镜像上的手动操作」录成一份可回放的 JSON 动作序列。点「开始录制」后，
  在镜像上点/滑/长按，每一步都会记成 `{kind, x, y, …}`；也可以先在意图框写一句话（如「打开微信
  给张三发消息」）点「按意图生成骨架」，让本地模型先产出大致步骤，再手动录制补细节、删多余步。
  脚本存在 `<插件目录>/scripts/*.json`（与插件代码同目录，重装导出时一起带走），面板里有脚本库：
  列表、回放（逐条执行、失败步照记不中断）、删除。脚本步骤在保存时同样过白名单校验，非法动作丢弃。

面板路由都走 harness 同源的 `/api/my-mobile/...`（注册在 Connection 服务上），宿主侧代理
MobileControl 并直接调用随二进制附带的 adb；浏览器不直连 8765 端口（视频流是唯一的例外，
失败自动降级）。

## 配置

全部字段可省略，默认值见 `cordis.patch.yml` 注释：`binaryPath`、`port`（8765）、`autoStart`、
`startTimeoutMs`、`requestTimeoutMs`、`screenshotDir`（`~/Pictures/MobileControl`）、
`adbPath`（面板录屏/上传用，留空时依次尝试 `ADB_PATH`、`~/bin/bin/platform-tools/adb`、PATH）。
语义解析另有一组 `llm`：`enabled`（true）、`baseUrl`（`http://127.0.0.1:11434`）、
`model`（`qwen3.8:27b-mlx`）、`timeoutMs`（60000）、`vision`（true，关掉则只做文字规划）、
`imageWidth`（720，下发给模型的截图宽度）、`maxAgentSteps`（0，看屏模式步数上限；0 = 不限，
只有模型自己 done / pause 才停）、
`think`（false，每步是否先思考；开慢 6–10 倍）。

运行轨迹写在 `<dataDir>/agent-trace.jsonl`（默认 `~/.dsh/my-mobile/`）：每轮一行
（动作、耗时、是否深思、是否为 done/pause），加上面板上报的停止原因（模型 done / 模型 pause /
手动停止 / 动作重复 / 画面未变 / 模型报错），512 KB 后清空。排查「为什么停在这一步」直接看这个文件。

## 已知限制

- 截图工具返回的是**文件路径**而非内联图片（面板里直接显示画面，不受影响）。
- `mobile_text` 与面板的「文字输入」都走 adb `input text`，中文等非 ASCII 字符不可用
  （MobileControl 会直接报错而不是发乱码）。要输入中文需在手机上安装并启用 ADBKeyboard
  一类支持 `ADB_INPUT_TEXT` 广播的输入法；本机测试设备只装了搜狗/华为输入法，所以看屏模式
  遇到中文输入会失败，模型会改用英文关键词或滚动查找。
- 实时镜像依赖 MobileControl 的 WebSocket；被 CSP 拦截时自动退回截图轮询（约 1 fps）。
- 录屏画面来自镜像流，息屏时没有帧；单段上限 600 s（插件自身限制）。
- 上传单文件上限 64 MB（base64 经宿主中转）。
- 仅支持 USB 连接（无线 adb 未验证）。
- 模型耗时：单步规划常驻时约 4–8 s（含截图 + 视觉编码），冷启动首次约 8–9 s；
  超时或不可用会自动回退，不会卡住面板。
- 看屏模式的每步只能看到「执行前」的画面，且依赖相对坐标：目标是动画中间态、
  或界面元素极小（<20 px）时仍可能点偏，需要你在镜像上补一下。
