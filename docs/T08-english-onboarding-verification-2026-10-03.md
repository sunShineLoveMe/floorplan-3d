# T08 英文引导与界面收敛验收

日期：2026-10-03。接续 `feat/ui-refactor` 当前工作区，完整保留 T04 / T05 本地实现与证据。补齐现有 Help 与首屏提示，修复实际复现的术语、名称显示和键盘障碍，没有重做 UI 或新增依赖。

最终构建 `c7311da35e079840`，Chromium `154.0.8037.97`。145 项 Node 测试、157 项本次登记浏览器检查、23 项独立磁盘下载检查通过；Lint、build 和 diff 检查通过。浏览器检查包含明确标注的存储失败注入、旧数据初始化、异常和模拟触控补充，不能全部称为物理原生操作。入口：[机器汇总](verification/T08-english-onboarding/final-results.json)。仅本地未提交，未推送、合并或部署。

**外部试用未执行，实际参与者 0 人。** [T03 / T08 试用协议、英文任务卡和空白记录表](T08-user-trial-protocol.md)已准备，未联系、邀请或招募任何人。以下为开发者内部工程走查，不登记首次用户成功率、用时或满意度。

## 实际复现问题与修复

| ID / 优先级 | 场景与原生步骤 | 预期 / 实际与影响 | 实际修复 / 验收条件与证据 |
|---|---|---|---|
| T08-001 / P2 | 空设备上下文打开 Help，阅读初始 Living room 的后续步骤。 | 应说明示例可直接编辑、自己的尺寸、门窗偏移、完整家具外廓、冲突与保存。原帮助只有拖动 / 点击和快捷键，缺少完整流程与保存边界。 | 复用可重开 Help，五步说明和 Library 首屏提示；不自动展开、不强制向导、不改变工程。关闭按钮与 Escape 返回焦点。基线 [observations](verification/T08-english-onboarding/baseline-01/observations.json)，最终 [任务走查](verification/T08-english-onboarding/attempt-06/browser-results.json)。 |
| T08-002 / P2 | Library → Room 读取 New room plan，点击进入创建对话框。 | 同一入口应明确是整工程替换。实际与 Export / File 的 New project 用词不同，容易误以为添加房间。 | 统一 New project，旁边提示 Add room 扩展本层 / New project 经审查替换整个工程。已有 Create and replace / Cancel / Export current 不改写；取消保持工程和草稿。基线同上，最终 new/add/JSON cancellation 场景。 |
| T08-003 / P2 | 320 × 480 viewport，原生打开 Help。 | 内容应在 viewport 内。原帮助左边界为 −67.39 px，文字被裁切。 | 小屏固定在左右 8 px，按高度限制内部滚动；390 × 320 低高度可操作。基线 [边界数据](verification/T08-english-onboarding/baseline-01/help-bounds.json)、[截图](verification/T08-english-onboarding/baseline-01/help-320.png)，最终 [320 px](verification/T08-english-onboarding/attempt-06/help-320x568.png)、[低高度](verification/T08-english-onboarding/attempt-06/help-390x320.png)。 |
| T08-004 / P2 | 英文模式添加家具，在 Name 填“客厅”并离开字段。 | 用户名称应原样显示。实际设备值是“客厅”，输入回填、标签和可访问名称却变成 Living Room。 | `nm` 默认保留项目名称，只有明确的内置目录 / 材料才请求译名；新添加目录家具使用当时的显示名称。既有名称没有可靠来源标记，故不猜测翻译、不迁移数据。去除项目标题的精确中文字符串译名分支。en/zh × 两单位及房间 / 家具同字典名称核验通过；[Node 隔离测试](../tests/i18n.test.js)。 |
| T08-005 / P1 | 房间已含家具；从 Room 按钮打开属性，用 Tab 查找 Furniture in room 列表。 | 应能用键盘重新选择已保存家具。原列表只有 `tr.onclick`，tabIndex −1、没有交互子元素。 | 在家具列表和工程房间总览的名称单元格加入原生按钮，沿用现有 selection / 事件。原始 DOM 记录在 [fix-01](verification/T08-english-onboarding/fix-01/observations.json)；最终键盘重新选择、刷新 / 回导及三户型通过。 |
| T08-006 / P2 | Height 输入非法草稿，点击 Help，在 summary 焦点按 Ctrl/⌘+Z。 | Help 阅读不应改无关草稿。实际工程字节不变，但浏览器原生文字 Undo 将高度草稿清空。 | 非文本菜单焦点拦截 Ctrl/⌘+Z / Y / D 的浏览器默认动作；输入仍保留自身文字 Undo。`attempt-01` 保存失败截图和断言；最终 Help 下 R / Delete / Undo、Escape、语言重绘均保留草稿和工程字节。T04 高度缓存与 T05 焦点专项重新执行。 |

静态 `aria-label` 沿用 `data-en` 风格增加独立翻译属性，语言按钮 title 随语言变化；没有引入翻译框架或名称来源数据字段。

## 英文文案与可访问性核对

实际渲染文案及可访问树保留在 [copy-inventory.json](verification/T08-english-onboarding/attempt-06/copy-inventory.json)，包含以下已执行状态，不把源码中的中文当作英文遗漏。

| 范围 | 实际核对 |
|---|---|
| 初始导航、Library / Room / Furniture、搜索与筛选 | English / imperial 默认、New project / Add room 范围、Empty search 与清空筛选；搜索 Queen 与名义床垫说明可达。 |
| Properties、结构表单、字段 / 错误 | 净宽深高、门墙方向 / 起点偏移、完整外廓、Height (optional)、中心坐标、Rotation；非法长度关联 `aria-describedby` / `aria-invalid`，草稿不入 JSON。 |
| Help、Wall snap、通道 / 使用区 | 示例可编辑；预设不含床架、未知高度留空、位置是中心；关闭 Wall snap 保留单位网格，精确中心不吸附；平面冲突与使用假设不承诺真实门运动 / 高度 / 法规。 |
| Export / File、保存、恢复与冲突 | 本浏览器 / 设备站点数据，无云副本；失败备份 / 重试、真实下载、JSON 恢复与 PDF / 图片参考图分离；损坏原文与双窗口冲突有明确下一步。 |
| 名称与语言 | 项目 / 房间 / 家具名称原样保留；目录和材料翻译。切语言不改工程字节；单位按既有显示偏好事务变更，不改物理尺寸或未知 height。旧中文项目名称保留，不按名称猜测来源。 |
| 键盘 / 焦点 | 核心桌面路径不依赖拖动；原生 Tab / Shift+Tab / Enter / 方向键，表单与菜单不泄漏模型快捷键；dialog Escape 返回入口，Help 关闭返回 summary，隐藏抽屉 inert。 |
| 布局 / 动态 | 1440 / 1024 / 390 / 320 px 与 390 × 320 低高度；Help 内滚动、入口和字段可用，无页面横向滚动。720 × 500 仅为缩小 CSS viewport 的重排补查；reduced motion 禁用动画，键盘焦点有可见 outline。 |

[补充 DOM / 颜色检查](verification/T08-english-onboarding/accessibility-01/results.json)检查 14 个当时可见字段的标签和 8 对主题颜色：正文 15.12:1、次要文字 6.17:1、muted 5.39:1、danger 6.57:1、控件边界 3.73:1。仅为主题样本，不是所有实际像素 / 图片背景或完整可访问性认证。工程检查不替代读屏。

## 内部任务走查与真实下载

至少一条完整路径从无站点数据开始：默认 Living room → 键盘编辑 Trial bedroom 为 12 × 10 × 8 ft → Top wall 门宽 3 ft / 高 7 ft / 起点偏移 2 ft → 搜索 Queen → 非法长度错误与纠正 → 完整床架 60 1/8 × 80 3/8 in，height 不指定 → 中心 42 / 50 in 复现门扇冲突 → 调整到 78 / 70 in 后门冲突消失 → 旋转 / Undo / Redo → 刷新重开 → 键盘触发 JSON 下载落盘 → 上传实际文件并点击 Continue replacement → 重新选择家具核对未知 height。

内部存储宽 `1527.175 mm`、深 `2041.5249999999999 mm`，与分数英寸输入的浮点计算一致，不量化为显示近似值。调整后的中心为 `(1981.2, 1778) mm`。门宽 `914.4`、高 `2133.6`、偏移 `609.6 mm`。冲突消失只表示该门扇平面检查通过，不表示实际商品可安装或全屋可达。代表性证据：[桌面任务](verification/T08-english-onboarding/attempt-06/task-desktop.png)、[非法输入](verification/T08-english-onboarding/attempt-06/invalid-length.png)、[门冲突](verification/T08-english-onboarding/attempt-06/door-conflict.png)、[实际备份](verification/T08-english-onboarding/attempt-06/task-backup.json)、[恢复](verification/T08-english-onboarding/attempt-06/task-restored.png)。

1024、390、320 px 又分别从新上下文完成房间 / 门 / 完整床架 / 错误纠正 / 冲突调整 / 保存刷新 / 实际 JSON 回导；小屏经可见 Library → Room → Room / openings，未点击隐藏的 `#editRoom`。代表性 [390 px 属性](verification/T08-english-onboarding/attempt-06/frame-390.png)、[320 px 错误](verification/T08-english-onboarding/attempt-06/error-320.png)与对应 `task-*.json`。

文件选择器使用 Playwright `setInputFiles`，不是 OS 文件对话框键盘验收；替换审查使用真实产品按钮。JSON / PNG 通过 download 事件、saveAs、failure 和磁盘解析核对；截图不代替数据检查。Jacobsen / CMU / 修正 Plan F 使用共用 UI、2D / 3D、语言 / 单位 / 草稿及刷新 / 回导；原图来源、假设与未知尺寸不变，不增加原住宅实测验收数量。

## 本批执行结果与回归选择

| 本次实际执行 | 登记项数 | 证据 |
|---|---:|---|
| T08 最终专项与内部任务 | 42 | [attempt-06](verification/T08-english-onboarding/attempt-06/browser-results.json) |
| T04 完整尺寸、网格、保存与三户型 | 30 | [t04-regression](verification/T08-english-onboarding/t04-regression/browser-results.json)，656 个网格样本包含其中，不重复计数 |
| T04 高度草稿缓存 | 4 | [height-drafts](verification/T08-english-onboarding/height-drafts/browser-results.json) |
| T04 2D / 3D picking、拖动与取消 | 4 | [height-interactions-retest](verification/T08-english-onboarding/height-interactions-retest/browser-results.json) |
| T05 焦点、手势、吸附、结构事务 | 31 | [t05-regression](verification/T08-english-onboarding/t05-regression/browser-results.json)，含明确标注的异常 / 模拟触控补充 |
| T07 保存失败、原文、替换与多窗口 | 46 | [t07-regression](verification/T08-english-onboarding/t07-regression/browser-results.json)，含存储失败注入 |
| Node | 145 | [unit-tests](verification/T08-english-onboarding/unit-tests.txt) |
| 独立磁盘 JSON / PNG 检查 | 12 + 11 | [T08 下载](verification/T08-english-onboarding/independent-download-results.json)、[T05 回归下载](verification/T08-english-onboarding/t05-independent-download-results.json) |

全部最终报告资源号为 `c7311da35e079840`。新增逻辑只加名称翻译隔离测试，界面 / 焦点用浏览器保护；没有为每段文案加重复单元测试。因改到名称显示、属性交互和菜单焦点，重跑 T04 / T05 / T07 全专项。未修改 T06 几何、使用区或漫游实现，故没有重跑 T06 完整专项；本批三户型与 T04 草稿检查覆盖使用区相关显示 / 重绘，既有 Node 几何测试仍全部执行。

构建 / Lint / diff 日志与只含 `index.html` / `src` / `styles` 的源码指纹在证据目录。使用隔离 Chrome headless / SwiftShader、新建 8095 服务，无生产依赖安装。

## 失败与中间记录

所有目录保留，不覆盖历史证据：`baseline-01` 为原始文案 / 名称 / Help 边界；`fix-01` 为第一轮修复复查及键盘列表发现。

- `attempt-01`：Help Ctrl/⌘+Z 使草稿被浏览器文字 Undo 清空是真实产品问题；其他失败为脚本误将 roving inactive tab 当 Tab 目标、把原生 JSON alert 当 toast、未引用数字开头的 CSS 属性选择值。没有计为通过。
- `attempt-02`：脚本严格比较浮点深度、未先切回 Furniture 导致搜索不可见；修正断言为浮点容差并按真实 tab 操作。
- `attempt-03`：39 项中间专项通过，尚未新增三档宽度完整任务。
- `attempt-04`：两条小屏任务刷新后等待隐藏家具卡片“可见”，属于准备状态判断错误；修正为等待库 DOM 完成，实际后续动作仍走可见入口。
- `attempt-05`：CMU / Plan F 的 3D 初始化失败，截图有既有 “3D could not load” 降级提示；`height-interactions` 也在 3D 等待超时。确切根因未确认，不归因为本批 UI 修复，也不算通过。`attempt-06`、独立 3D 检查和 `height-interactions-retest` 恢复通过，没有修改生产 3D 加载逻辑。不能从最终通过推断所有网络 / GPU 环境稳定。

`final-02` 是指向本批 `t05-regression` 的相对符号链接，仅适配既有独立下载检查器；没有复制或覆盖 T05 历史目录。

## 复测命令

在项目根目录、自建空闲端口与独立证据目录运行：

```bash
npm test
npm run build
node /Users/chris/.npm/_npx/515228b7c8d004a2/node_modules/eslint/bin/eslint.js src --config tests/eslint.config.js
python3 scripts/serve.py --port 8095
TEST_URL=http://127.0.0.1:8095/ T08_TEST_OUT=docs/verification/T08-english-onboarding-next/attempt-01 node tests/browser-t08-english-onboarding.mjs
/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/check-onboarding-exports.py docs/verification/T08-english-onboarding-next/attempt-01
git diff --check
```

T08 脚本支持 `TEST_URL` / `T08_TEST_OUT` / `PLAYWRIGHT_MODULE`，拒绝复用已有输出目录；T04 / T05 / T07 使用其既有输出变量，本次命令见机器汇总。独立 PNG 检查使用含 Pillow 的 bundled Python，不要求系统 Python 安装新依赖。没有独立 npm lint 或 TypeScript 任务。

## 未测范围与收尾

外部参与者试用、Safari / Edge、实机手机 / 物理多指 / GPU、读屏、系统高对比度和长期使用未执行；720 px viewport 不能当作 200% 浏览器缩放。对比度样本不代表完整认证。T09 高清 / 完整尺寸 PNG、3D CSS 标签导出未实施，只回归当前 PNG。

T07 严格同时写入竞争、设备数据清除后的恢复，T06 真实门铰链 / 抽屉运动、垂直避让、同时使用及法规边界继续未验证。没有新账户、云保存、后端、A/B 或支付。公开原图的未知与假设保持原文，未验证商业复用许可。

本地 / 远程 `feat/ui-refactor` HEAD 仍为 `b0b679750aa08346d34f44fd49ac3dd029e85e01`。禁止文件未读取或修改；原始未提交和未跟踪内容全部保留。已关闭本次浏览器上下文和自建 8095 服务，用户 8086 保留。

## 后续本机 Computer Use 补充

2026-10-03 应用户要求复用 8086，完成本机 Chrome 无痕窗口 UI 操作，包括实际 200% 页面缩放、JSON 下载 / 恢复及 3D 目视检查。详情：[Computer Use 验证](T08-computer-use-verification-2026-10-03.md)。该补充不加入上述自动化检查计数；此时测试窗口和用户 8086 服务保持打开。
