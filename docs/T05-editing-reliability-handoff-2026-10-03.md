# T05 新窗口任务书：编辑交互可靠性

> 后续完成导航：T05 已在原工作区完成本地实现与复测，修复 7 项实际复现问题，见 [验收](T05-editing-reliability-verification-2026-10-03.md)和[机器汇总](verification/T05-editing-reliability/final-results.json)。下文保留任务书编写时的状态与原始要求；不重复实施历史缺口。当前未提交 / 未推送 / 未部署。

日期：2026-10-03。本窗口仅核对现状并编写任务书，**没有实施或原生复现 T05**。下一窗口直接接续现有工作区，完成定位、吸附、输入焦点和编辑事务的可靠性核验；对实际复现的问题做最小充分修复，交付可运行实现与验收证据。

## 1. 接续位置与当前基线

- 项目：`/Users/chris/Documents/项目/AI家装/floorplan-3d`。
- 分支：`feat/ui-refactor`。本窗口 HEAD 与 `git ls-remote origin refs/heads/feat/ui-refactor` 均核对为 `b0b679750aa08346d34f44fd49ac3dd029e85e01`。远程只有此前 T07 / 文档基线，**不含当前 T04 实现**。
- 当前存在本地未提交的 T04 生产代码、测试、全部验收证据，以及 README / 路线图 / 使用指南 / 交接文档改动。已跟踪改动包括 `index.html`、`src/main.js`、`src/ui/length-field.js`、`src/ui/property-panel.js`、`src/ui/project-protection.js`、`src/viewer3d/furniture.js`、`tests/project-data.test.js`、`tests/browser-t06-use-zones.mjs`；未跟踪 T04 脚本、网格测量 helper 和文档同样必须保留。本任务书和导航随后新增；接续时以实际 Git 状态为准。
- **直接接续当前工作区，不创建新 worktree，不从主分支、纯 HEAD 或远程克隆重建。禁止 reset、clean、stash；不清理用途未明的文件。**
- **禁止读取、修改、提交或上传 `aws-tokyo-wireguard.yaml`。** 可以查看 Git 状态中的文件名，不能读取内容。
- 默认完成本地实现与可审查交付。T07 的旧推送授权不延续；未经新授权，不提交、推送、合并或部署。
- 产品保持 English；内部尺寸 mm，继续原生 ESM、store 事务及 v2 / v1 / legacy 兼容。不得引入账户、云同步、后端、框架或无关依赖。

T04 第一批已完成：可选高度输入 / 清除回未知、精确 mm、按原件隔离的高度草稿、完整可见网格外廓及中心 / 落地适配。最终构建 `1891ea7378a262e2`，144 项自动化测试、132 项登记的原生浏览器检查、656 个网格样本 / 45 种类型通过；111 项浏览器检查属于最终构建，21 项行走 / 摇杆回归属于 `c50d00016a1f6eae`，不能合并称为全部来自最终构建。这是前批已记录结果，本窗口没有重跑。

阅读顺序：本文 → [路线图](roadmap.md) → [T04 最新验收](T04-furniture-dimensions-verification-2026-10-03.md)与[机器汇总](verification/T04-furniture-dimensions/final-results.json) → [T07 验收](T07-save-recovery-verification-2026-10-03.md)。按需读取 [T03](T03-verification.md)、[使用区验收](T06-use-zones-verification-2026-10-03.md)、[UI 交付](UI-final-delivery.md)、[使用指南](usage.md)。T04 / T07 原始交接里的实施前缺口是历史，不重复实施。

## 2. 本批目标与边界

让用户能够精确定位家具、理解并关闭墙吸附、安心编辑输入框，并在家具 / 房间 / 门窗操作中可靠地撤销、重做和取消。工程、视图、选择、字段草稿和设备保存之间的边界应一致。

本批包括：

1. 数值定位与指针 / 键盘移动的精度和一致性；输入中心 X / Y 不被拖动网格或墙吸附擅自量化。
2. Wall snap 开 / 关的实际行为及 2D / 3D 复用，包含旋转家具、缩放和窄屏入口。
3. 输入焦点、对话框、菜单和抽屉对全局快捷键的隔离；保留 T04 高度草稿规则。
4. 家具移动 / 旋转 / 缩放，以及新建 / 添加 / 修改 / 删除房间与门窗的事务、无操作、失败、取消、Undo / Redo。
5. 预览、取消、单位 / 视图切换与 T07 已提交保存 / JSON 导出的交叉复测。

本批不做 T11 的多方案 A/B、通用自定义家具、真实柜门 / 抽屉运动、垂直避让、任意多边形、AI 识别、支付、云分享或完整法规检查。Safari / Edge、实机触屏属于 T09 后续；可以保留模拟触控验证，但不能称为实机通过。

**已通过的能力优先复用。本批不是新增一套编辑系统；若专项复现均通过，可以交付验收结论和证据，不为形式修改生产代码。**

## 3. 当前调用链与代码入口

以下来自本窗口读取源码，未进行原生复现；候选风险不能作为已确认缺陷。

| 入口 | 已有能力 / 本批核验点 |
|---|---|
| `src/main.js` | 组装 store / editor / viewer / panel；Undo 先取消当前 2D / 3D 手势；视图切换、工程替换也调用取消。核验事件顺序与选择失效处理。T04 已向工程保护注入 `discardDrafts`，恢复替换回调也调用 `panel.resetDrafts()`；保持取消审查不清草稿。 |
| `src/ui/property-panel.js` | 已有中心 `fX / fY`、宽深 `fW / fD`、可选 `fH`、旋转、复制 / 删除；有效 change 通过 mutate 提交。按字段保存值恢复当前对象草稿；高度另有按工程 / 家具 / 单位隔离的内存缓存。不要用旧 UI 文档中的“一切对象切换均丢草稿”覆盖 T04 的高度行为。 |
| `src/ui/length-field.js`、`input-drafts.js`、`src/core/units.js` | 严格输入、原值精度保留、可选字段缺省、反馈 / 错误、光标恢复。核验原始非网格坐标、负坐标、Enter / Escape / blur 和单位锁。 |
| `src/editor2d/snapping.js` | `snapMove` 先按单位网格对中心取整，再按 `ui.layers.wallSnap` 决定墙边对齐；`snapPoint` 是测量点吸附，当前独立于 Wall snap。不要把两种语义混为一谈。 |
| `src/ui/project-actions.js` | `snapRects` 取未拆除墙和窗矩形；添加家具会 pushOut；复制 clone 原件并移动中心、重建使用区 ID；删除改选择。核验相关行为，不悄悄将新增家具避墙当作拖动吸附开关。 |
| `src/editor2d/interactions.js` | 家具指针手势 begin → preview → commit / cancel；轻点阈值、第二指触发取消、pointercancel、window blur、Esc 和快捷键已有处理。拖动缩放当前最小 100 mm，而面板宽深最小 50 mm，属于待核验差异。键盘就在本文件，**没有单独的 keyboard.js**。 |
| `src/viewer3d/viewer.js` | 已选家具在 Orbit 中可沿地面拖动；复用 `snapMove`，预览只移动模型中心，结束 commit / cancel；取消重建家具；window blur / Escape 已有入口。核验 OrbitControls 恢复、指针捕获与实际 WebGL 画面。 |
| `src/ui/toolbar.js`、`drawers.js` | Wall snap、单位选择、工具切换、菜单 / 抽屉 Escape 和焦点返回。窄屏切换后应检查真实 pane 可见性，不能只相信桌面遗留 aria-expanded；不要用 evaluate 点击掩盖控件不可达。 |
| `src/ui/room-editor.js`、`src/data/room-editor.js`、`house-editor.js` | 房间与门窗数值表单；校验后生成几何再 replaceProject。家具与测量保留绝对坐标，非法开口阻止提交；房间删除包含所属门窗。核验一个 Apply 一笔历史，关联数据原子恢复。 |
| `src/core/project-store.js`、`src/core/editor-state.js` | begin / preview / commit / cancel、完整快照 Undo / Redo、getCommittedProject；选择 / 工具 / 视口主要是运行态。不要把辅助状态塞进项目格式，或让取消生成假历史。 |
| `src/ui/save-recovery.js`、`project-protection.js`、`services/storage.js`、`project-files.js` | 已提交保存、失败备份、替换审查和同源冲突已完成。移动预览与无效输入不进入设备 / JSON；保留替换取消与原文恢复保护。 |

已有测试：`tests/project-store.test.js`、`units.test.js`、`room-editor.test.js`；原生 T04、T07、T06 脚本可复用。较旧的 `browser-t02*.cjs`、`browser-t03*.cjs`、`browser-ui-final.cjs`、`browser-3d-interactions.cjs` 有直接上传后立即断言的流程；**先检查并补真实 Continue replacement 审查，不能原样跑出超时后认定为产品缺陷，也不能绕过保护。**

## 4. 实施顺序与检查清单

### A. 先复现，再建立问题表

建立新目录 `docs/verification/T05-editing-reliability/`。记录当前 Git、资源号、浏览器版本、场景输入和每次尝试；保留失败。原生检查至少包含一个独立精确坐标场景和 Jacobsen / CMU / 修正 Plan F。

候选检查编号如下，只是待核验，不预设必须改代码：

| 编号 | 场景 / 待核验风险 | 确认问题后优先级 |
|---|---|---|
| T05-C01 | 中心 X / Y 输入精确小数、负值或非网格值后，失焦、单位 / 视图切换、拾取或 Undo 是否发生量化、偏移或字段串值 | 数据变化 P1 |
| T05-C02 | Wall snap 关闭仍有单位网格；开关是否可达、行为与说明一致；旋转 / 缩放后是否错误吸墙或抖动 | 不可控移动 P1；说明 / 入口 P2 |
| T05-C03 | 小家具拖动尺寸手柄时 100 mm 下限与面板 50 mm 下限是否造成不必要跳变；单次旋转缩放中锚点是否稳定 | 真实跳变 P1 |
| T05-C04 | 拖动中 Esc、pointercancel、失焦、指针捕获丢失、第二指、切工具 / 2D / 3D 后，是否残留事务或鼠标释放后继续移动 | P1 |
| T05-C05 | 焦点在输入框 / 搜索 / select / contenteditable 或对话框时，Delete、Backspace、R、方向键、Cmd/Ctrl+D / Z 等是否误改工程 | P1 |
| T05-C06 | 一次轻点 / 无改动字段 / 无效 Apply / Cancel 是否产生假历史；一次拖动或表单提交是否要多次 Undo 才能完整恢复 | P1 |
| T05-C07 | 新建 / 添加 / 修改 / 删除房间及门窗的 Undo / Redo 是否留下孤立关联、失效选择、错误底图 / 单位或静默丢家具 | P1 |
| T05-C08 | 预览期间显示偏好变化、保存失败备份、替换取消是否写入预览或丢无关高度草稿 | P1 |

缺陷表必须包含：优先级、输入、原生复现步骤、预期 / 实际、影响、截图 / 机器数据、建议、验收条件。能复现才分配实际缺陷 ID，并按 P0 → P1 → P2 分批修复 / 复测。源码缺少某个监听或存在两个最小值，仅是候选证据。

### B. 明确吸附与精度契约

- 数值中心输入是精确定位入口，保留用户提交的 mm，不能自动贴墙 / 吸网格。
- 保留当前 Wall snap 的“墙边吸附”语义：关闭墙吸附后，普通指针移动仍使用现有单位网格（Metric 10 mm / Imperial 1/4 in）。明确可见说明，不能叫完全自由拖动。
- 不未经需求新增全局网格开关或第二套吸附策略。若确有无法定位的问题，先修复数值定位与现有关闭入口；需要可逆的更细操作时再做最小充分方案并记录理由。
- 2D / 3D 共用生产 `snapMove`。检查缩放对屏幕容差的影响及 0° / 90° / 非直角旋转；未支持的斜墙 / 固定物精确吸附不能假称已支持。开启吸附不意味着家具合法摆放或无碰撞。
- 缩放应依据手势开始快照和明确锚点计算；核验连续 move 和一次同终点 move 的结果，防止帧数依赖累积偏移。若统一最小值，先核对旧数据、面板和小尺寸家具；不静默改旧文件。

### C. 修复事务与焦点边界

- 一次有效字段提交、一段完成的家具拖动、一次表单 Apply 各形成对应的一笔历史；无改变、无效输入、轻点、取消不增加假历史。键盘长按按现有重复事件规则核验，不无理由改成新的历史聚合系统。
- 指针取消应恢复精确开始快照和可见画面，不只恢复 localStorage；释放后不继续移动，下一次手势可以正常开始，3D OrbitControls 正常恢复。
- 全局快捷键只在编辑画布上下文生效；输入中的文字编辑 Undo 保持本地输入语义。模态中不改底层家具。Escape 按当前字段 / 对话框 / 菜单 / 抽屉 / 手势上下文处理，不能同时误删、提交或清掉无关选择。
- 保留字段有效提交、无效草稿、焦点 / 光标、错误状态和单位锁；副本只继承已提交 height。原件的无关高度草稿在复制 / 删除后撤销、重新选中时应仍可恢复；确认替换才丢弃剩余草稿。
- 结构变更先校验后整笔提交；新建工程保留既有底图 / 单位规则，非法门窗不自动删除；Undo / Redo 恢复稳定 ID、开口、几何、固定物、使用区、来源与精确尺寸。

## 5. 最低验收矩阵

| 场景 | 通过条件 |
|---|---|
| 精确定位 / 单位 | metric 和 imperial 均输入带明确单位的小数、负坐标；未改字段保留原始浮点。提交、取消、名称编辑、单位切换、保存 / 刷新 / 实际回导不量化；界面说明坐标是家具中心。 |
| 墙吸附开 / 关 | 通过可见 UI 切换；关闭仅留下单位网格，不贴墙；开启按声明容差对齐。两种单位、不同缩放、0° / 90° / 37°，2D / 3D 共用行为。数值输入仍能落非网格坐标。 |
| 选择 / 无操作 | 轻点、重选、未改长度 Enter / blur、取消表单不会改工程、位姿、height 或插入 Undo；开关 / 偏好按现有持久化契约核验，不强行全部排除历史。 |
| 指针移动 / 旋转 / 缩放 | 实际命中家具 / 手柄，保持中心或正确锚点；非等比尺寸及小尺寸不跳变。完成后一次 Undo 精确恢复、Redo 精确回到终点；height 与 useZones 等无关参数保持。 |
| 手势异常结束 | Esc、pointercancel、blur、第二指、工具 / 视图切换恢复已提交数据和可见对象，设备 / JSON 无预览；lostpointercapture 先复现真实序列，释放不产生二次提交；下一手势可用。 |
| 键盘与焦点 | 外部方向键 / Shift、R、复制删除与历史按约定工作；名称 / 坐标 / 尺寸 / height / 搜索 / select / 模态聚焦时只编辑对应内容，不触发底层模型动作。测量与漫游快捷键互不串用。 |
| 草稿重绘 | 无关使用区、名称、偏好、历史通知不丢当前未改字段草稿 / 光标；T04 原件高度缓存不串给其他家具；取消工程替换保留，确认替换丢弃。 |
| 单矩形房间 / 门窗 | 新建、宽深高编辑、开口新增 / 修改 / 删除，各一次完整 Undo / Redo；无效 / 未改 / 取消无假历史。门窗超父墙 / 房高时拒绝且无部分保存。 |
| 全屋结构 / 关联 | 房间添加 / 移动 / 删除、所属开口与固定物整笔恢复；家具绝对坐标、精确 height、使用区、来源与底图保留；选择不引用已不存在的对象。 |
| T07 交叉行为 | 真实已提交自动保存；拖动预览期间导出不含预览；失败时实际下载提交修订，重试 / 刷新正确；替换前审查取消保留草稿。已有损坏原文 / 同源冲突保护不退化。 |
| 三户型复用 | Jacobsen、CMU、Plan F 用同一生产逻辑完成精确定位、吸附、原生手势 / 历史、结构表单和真实 JSON 下载 / 继续审查回导；原图未知尺寸和来源说明保持。 |
| 390 px / 导出 | 坐标、height、墙吸附、Undo / Redo 和门窗表单可达；无横向溢出。实际 2D / 3D PNG正常，标签 / 全屋取景不回归；模拟触控不冒充实机。 |

验证用原生指针 / 键盘 / 表单操作。DOM 合成事件可作为补充异常序列，但必须标明，不把它当真实指针捕获或触屏验收。需要真实几何或显示判断时，不只断言按钮、scale 或保存字段。

场景直接使用 T04 的实际下载工程，另存 T05 版本：

- [Jacobsen](verification/T04-furniture-dimensions/final-02/jacobsen-roundtrip.json)
- [CMU](verification/T04-furniture-dimensions/final-02/cmu-roundtrip.json)
- [修正 Plan F](verification/T04-furniture-dimensions/final-02/plan-f-roundtrip.json)
- [独立精确尺寸 / 高度场景](verification/T04-furniture-dimensions/final-02/independent-true.json)

三户型新加的命名家具及其 height 是 T04 验证参数，不是原图实测。不要更改原始 fixture / 历史 JSON。全项目比较只排除本次确实主动改变的 `updatedAt` / view 项，不能笼统排除家具 / 几何 / 来源；取消与无操作对已提交数据应做完整比较。

## 6. 运行、证据与交付

本窗口核对 8086 仍监听，T04 的临时 8095 已关闭。下一窗口重新检查；保留 8086，不操作用户常用浏览器工程，只在新建隔离上下文测试。若 8095 已被占用，选择空闲端口，不停止其他进程。

```bash
cd /Users/chris/Documents/项目/AI家装/floorplan-3d
git status --short
git branch --show-current
git log -3 --oneline
git ls-remote origin refs/heads/feat/ui-refactor
npm test
npm run build
node /Users/chris/.npm/_npx/515228b7c8d004a2/node_modules/eslint/bin/eslint.js src --config tests/eslint.config.js
git diff --check
python3 scripts/serve.py --port 8095
```

外部运行库路径以现场确认结果为准。Playwright 已有可用路径 `/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`。新增 `tests/browser-t05-editing-reliability.mjs`，支持 `TEST_URL` 与 `T05_TEST_OUT`，每次使用新目录。复用 `tests/helpers/project-protection.mjs` 的 `uploadProject`；实际 download 要 waitForEvent、saveAs、failure 检查、读取内容，再实际上传经审查回导。

按改动选必要回归；至少保留 T04 核心 / 草稿 / 原生交互及 T07 与 T06 对应交叉行为。若改到共用 store、保存或结构生成，扩大相应回归。不能只跑 architecture / 字段赋值测试代替原生验收，也不无理由重跑所有旧脚本。

```bash
TEST_URL=http://127.0.0.1:8095/ T05_TEST_OUT=docs/verification/T05-editing-reliability/attempt-01 node tests/browser-t05-editing-reliability.mjs
TEST_URL=http://127.0.0.1:8095/ T04_TEST_OUT=docs/verification/T05-editing-reliability/t04-regression node tests/browser-t04-furniture-dimensions.mjs
DRAFT_TEST_OUT=docs/verification/T05-editing-reliability/height-drafts node tests/browser-t04-drafts.mjs
T04_INTERACTION_OUT=docs/verification/T05-editing-reliability/height-interactions node tests/browser-t04-interactions.mjs
TEST_URL=http://127.0.0.1:8095/ T07_TEST_OUT=docs/verification/T05-editing-reliability/t07-regression node tests/browser-t07-save-recovery.mjs
PLAYWRIGHT_MODULE=/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright TEST_URL=http://127.0.0.1:8095/ USE_ZONE_TEST_OUT=docs/verification/T05-editing-reliability/use-zones-regression node tests/browser-t06-use-zones.mjs
```

上述 T05 脚本尚待编写。T04 drafts / interactions 目前 URL 固定 8095，场景固定 T04 final-02；若服务端口不同，先补 URL 配置，不能声称环境变量已覆盖。保持现有默认和历史证据路径。

交付：

1. `docs/T05-editing-reliability-verification-2026-10-03.md`（跨日按实际日期）及 `docs/verification/T05-editing-reliability/final-results.json`。
2. 已复现问题表、修复前后、实际构建 / 浏览器版本、检查数量、测试 / Lint / build / diff 日志、截图、真实 JSON / PNG 下载和异常序列类别；保留每次失败，不把多个资源号都标成最终构建。
3. 更新 README、路线图、使用指南及本文完成导航。若无生产缺陷，明确“专项核验通过、无需实现改动”，不虚构修复。
4. 结束只关闭自己创建的浏览器 / 服务；保留当前未提交工作、全部旧证据及 8086。报告未提交 / 未推送 / 未部署状态。

保持未测范围：Safari / Edge、实机触屏、不同 GPU、物理打印、严格同时写入竞争，以及真实门运动 / 安装标高 / 垂直避让 / 同时使用 / 法规；工程流程不代替原住宅完整实测验收。

## 7. 新窗口可直接粘贴

```text
继续 floorplan-3d 的 T05：编辑交互可靠性。
项目：/Users/chris/Documents/项目/AI家装/floorplan-3d
先读 docs/T05-editing-reliability-handoff-2026-10-03.md、docs/roadmap.md、T04 最新验收和机器汇总、T07 验收，再核对当前 Git 与实际调用链。
直接接续 feat/ui-refactor 当前工作区，保留全部未提交 T04 代码、测试、证据、文档及其他未跟踪内容；不从主分支、纯 HEAD、远程克隆或新 worktree 重建，不 reset、clean、stash。
先原生复现精确数值定位、Wall snap 开关、键盘/输入焦点、家具移动旋转缩放的取消与 Undo/Redo、新建/添加/编辑/删除房间和门窗的事务一致性。源码候选不是已确认缺陷；已有能力优先复用，有问题才做最小充分修复。
保留 mm 浮点、英制/公制解析、T04 可选 height 和原件高度草稿、完整网格外廓、T07 已提交保存及替换保护。墙吸附关闭后仍有现有单位网格；数值中心输入应精确保留，不擅自吸附。
同一生产逻辑验证独立精确场景、Jacobsen、CMU、修正 Plan F，实际下载并审查回导 JSON、导出 PNG，保留底图/结构/来源/使用区和未知原图尺寸。新建 T05 验收目录保留失败，完成本地可运行、可审查实现及文档导航。
本批不扩展到方案 A/B、通用新家具、真实门运动、垂直避让、AI、账户或云同步。不提交、推送、合并或部署，除非用户另行授权。不读取、修改或提交 aws-tokyo-wireguard.yaml。
隔离上下文验证；保留 8086，仅关闭自己创建的浏览器和服务。默认简体中文沟通，产品保持英文。
```
