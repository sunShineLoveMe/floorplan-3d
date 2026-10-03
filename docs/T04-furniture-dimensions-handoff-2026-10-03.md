# T04 第一批新窗口交接：家具真实外廓与高度编辑

完成导航：T04 第一批已在后续接续工作中完成本地实现与验收，见 [T04 验收](T04-furniture-dimensions-verification-2026-10-03.md)。下文保留实施前交接与基线，不作为当前未完成项。

日期：2026-10-03。本窗口只整理交接，没有实施 T04。下一窗口直接接续当前工作区，完成家具高度输入及 2D / 3D 尺寸一致性。本批不扩展到真实柜门 / 抽屉运动或垂直碰撞。

## 接续位置与已验证基线

- 项目：`/Users/chris/Documents/项目/AI家装/floorplan-3d`，分支 `feat/ui-refactor`。
- 本文创建前 HEAD：`b0b679750aa08346d34f44fd49ac3dd029e85e01`，已用 `git ls-remote` 核对与 `origin/feat/ui-refactor` 一致。T07 功能提交为 `5bbc32c91989c74206ebdbbe1bf61aff3f989c03`；`b0b6797` 同步推送状态与下一任务范围。均未合并或部署。
- 资源构建：`0a797fe1d69e03fd`。T07 最终验收：142 项自动化测试、46 项新增原生浏览器检查、150 项既有流程回归通过。回归来自多个实际资源号，不能将全部结果归为最终构建；详见 [T07 验收](T07-save-recovery-verification-2026-10-03.md)和 [机器结果](verification/T07-save-recovery/final-results.json)。
- 创建本文前只有无关未跟踪文件 `aws-tokyo-wireguard.yaml`。本文及 README / 路线图导航是随后新增的本地文档改动；下一窗口保留届时全部已跟踪、未提交和未跟踪内容，不以这里的旧快照覆盖实际状态。
- **直接接续当前工作区。** 不从主分支、纯 HEAD、远程克隆或新 worktree 重建；禁止 reset、clean、stash。先检查 Git，再读代码。
- **禁止读取、修改、提交或上传 `aws-tokyo-wireguard.yaml`。** 不清理任何用途未辨明的内容。
- 前一轮推送授权针对 T07，不自动延续到 T04。下一窗口默认完成本地可运行、可审查实现与证据；未另行授权，不提交、推送、合并或部署。
- 产品继续 English，内部尺寸 mm，沿用原生 ESM、store 事务、v2 / v1 / legacy 兼容；不新增账户、云同步、后端或无关依赖。

先读取本文、[路线图](roadmap.md)、T07 最新验收和机器结果，再按需读 [T06 使用区验收](T06-use-zones-verification-2026-10-03.md)、[T03 单位验收](T03-verification.md)、[使用指南](usage.md)。原始 T07 交接包含实施前缺口，只作历史，不重复实施已完成的保存保护。

## 本批目标与边界

用户输入厂商完整家具宽 / 深 / 高后，2D 占地和 3D 可见实体应体现同一组物理尺寸；编辑、撤销、单位切换、保存及真实 JSON 回导保留精确 mm 值。

1. 补齐家具高度输入、未指定状态和尺寸来源说明。
2. 先复现，再修正内置家具模型外包宽 / 深与声明占地不一致，以及显式高度不能正确落地 / 对应模型外包的情况。
3. 共用生产逻辑完成 Jacobsen、CMU、修正 Plan F、独立尺寸与旋转场景验收；保留使用区、结构与来源数据。

本批不做通用新家具类型 / 商家商品库、自动推断厂商尺寸、真实铰链 / 抽屉扫掠、家具间垂直避让、使用区同时使用 / 可达性或完整法规检查。这些在尺寸一致性验收后另起批次；不能因高度字段可编辑就宣称已通过高度碰撞验收。

## 当前代码现状与入口

以下为本窗口实际读取代码所得；造型外伸和落地问题是待原生复现的候选，不是本窗口已验收缺陷。

| 位置 | 当前能力与接续重点 |
|---|---|
| `src/data/project-data.js` | 家具已有可选 `height`；与宽深一样要求有限正数，受现有数值上限约束。没有 height 的旧文件仍有效。优先复用字段，避免新版本 / 无意义新实体；不要未经证据收紧旧文件范围。 |
| `src/ui/property-panel.js` | `furnPanel` 仅有 `fW / fD`，没有高度输入。`bindFurnPanel` 复用长度字段、事务提交、Enter / Escape 与单位锁。`renderPanel` 会重建 DOM；`fields` 草稿映射当前没有 height，新增字段必须加入并按自身保存值决定保留草稿。 |
| `src/ui/length-field.js`、`input-drafts.js`、`src/core/units.js` | 复用严格英尺 / 英寸解析、原始 mm 精度、草稿 / 焦点 / 错误状态与单位锁。先理解缺省值绑定，再实现可选高度；不能把空值误读为 0 或擅自填入造型高度。 |
| `src/viewer3d/furniture.js` | `buildFurniture` 按类型生成模型；若 height 已定义，用 Box3 的自然高度对 `g.scale.y` 缩放，再设家具中心与旋转。此处尚未统一宽深外包；床等有装饰外伸表达。先实测 Box3 与坐标原点，不直接认定当前缩放已满足落地、中心和外包约定。 |
| `src/data/catalogs.js`、`src/ui/furniture-library.js` | 预设提供类型、名称、宽深、颜色。床型是床垫占地，界面已有“不含床架”的说明；不能将预设当作厂商完整床架或给全部预设补虚构高度。 |
| `src/ui/project-actions.js`、`src/editor2d/renderer.js`、`interactions.js`、`src/core/geometry.js` | 2D 拾取、旋转、拖动 / 缩放与通行规划基于家具宽深和中心。复制使用 clone，已有字段应跟随。3D 变换不能改变这些数据或引入可见实体与占地中心偏移。 |
| `src/core/project-store.js` | T07 的 `getCommittedProject`、preview / commit / cancel、Undo / Redo 必须保留；不要让高度草稿或拖动预览进入自动保存 / JSON。 |
| `src/ui/save-recovery.js`、`project-protection.js`、`file-menu.js`、`src/services/storage.js` | 保留真实保存状态、失败重试 / 备份、替换前审查、损坏原文保护和同源窗口冲突；取消替换应保留无效高度草稿。 |
| `tests/project-data.test.js`、`project-store.test.js`、`units.test.js`、`save-recovery.test.js` | 已有字段精度、事务和保存测试，新增只覆盖真正新增的可选高度语义、异常输入与外包风险。`architecture.test.js` 主要覆盖结构，不能把它当成家具实际网格尺寸验收。 |
| `tests/helpers/project-protection.mjs`、`browser-t07-save-recovery.mjs`、`browser-t06-use-zones.mjs` | 合法 JSON 导入必须真实操作 Continue replacement；不绕过审查。复用新目录输出机制及原生流程，不覆盖历史。 |

## 实施顺序与约定

### 1. 先复现并建立尺寸基线

- 分别检查床、沙发、桌椅、柜体、电器和薄地面覆盖；按内置类型梳理模型，不只验证一个测试家具。
- 记录输入宽 / 深、height 是否存在、模型实际局部 min / max、底部位置和外包宽 / 深 / 高，比较 2D 占地。至少包含非等比尺寸、精确小数、0° / 90° / 非直角旋转。
- **测量局部外廓时排除家具整体平移和旋转。** 世界坐标 AABB 在非直角旋转后自然变大，不能直接与原始 w / d 比较。旋转后另核验模型投影与同角度占地的关系；不得只断言 scale 或 UI 文案。
- 测量实际可见网格，包括属于家具的床架、扶手、靠垫等；标签 / 选择辅助对象另行区分。截图与机器尺寸记录应同时具备。
- 复现后建立问题表（优先级、输入、复现步骤、影响、截图 / 数据、修复建议、验收条件），再改代码。

### 2. 可选高度与输入可靠性

- 未指定 height 的旧家具继续保持字段缺省；打开面板、换单位、改名称或导出不能自动写入默认高度。
- 用户可以明确设置高度，并有明确恢复“未指定”的操作 / 规则；未指定时造型高度是视觉示例，不是实测值。清除高度与输入无效 0 / 负数不是同一动作。
- 复用现有长度解析与 mm 范围，不对薄地毯 / 坐垫套用不合理的宽深最小值。不要未经范围核验把 height 强制限制到房高，以免破坏旧数据；本批没有完整垂直碰撞判断。
- 保持有效提交、无效草稿、焦点 / 光标、Enter / Escape、单位锁及 Undo / Redo。修改另一项使用区、复制 / 删除 / 撤销或重新渲染时，无关的高度草稿不能丢失。
- 床垫示例与用户输入的完整床架外廓继续区分，不按名称推断尺寸 / 高度来源。

### 3. 统一模型外廓

- 模型声明宽深与 2D 占地对齐；显式 height 对应真实模型外包高度。明确局部几何原点、中心和落地基准；验证模型 min Y，而不是仅总高度。
- 先确定最小充分方案：可复用的外廓适配或类型几何修正。不要逐户型补丁，也不要为尺寸一致性重写全部造型。
- 缺省高度保持示例语义；设置高度后不写入派生 Box3、缩放矩阵或测量缓存。对导入文件中已有 height 复用相同处理。
- 输入较小尺寸时核验负几何尺寸 / 半径、NaN、材料和视觉退化；若旧合同允许但当前造型不能可靠表达，明确处理，不静默更改保存值。
- 改造后核验家具标签、拾取、选中框、旋转中心、PNG 与漫游，不破坏 T06 的平面净宽 / 使用区假设。

### 4. 共用场景复测

使用已有实际下载工程作为场景来源，另存本批版本：

- [Jacobsen](verification/T07-save-recovery/final/jacobsen-roundtrip.json)
- [CMU](verification/T07-save-recovery/final/cmu-roundtrip.json)
- [修正 Plan F](verification/T07-save-recovery/final/plan-f-roundtrip.json)

这些工程包含此前的使用区、底图和结构数据。原图未知高度继续未知；测试者输入的高度必须标明为验证参数 / 假设，不能改成实测来源。不同户型共用同一生产逻辑，不按名称或 fixture ID 硬编码。

## 最低验收矩阵

| 场景 | 通过条件 |
|---|---|
| 旧项目 height 缺省、已有精确 height | 打开 / 关闭面板、改名称和单位不会新增或量化 height；v2 / v1 / legacy 兼容。 |
| 高度输入、取消 / 清除、无效草稿 | 英制 / 公制均可正确提交；0 / 负数 / 无法解析值拒绝；无效草稿保留与单位锁有效；Escape 恢复保存值；清除回缺省可撤销。 |
| 典型类型、非等比与小尺寸 | 实际网格局部外包对应声明宽深 / 显式高度，底部 / 中心符合约定；无负尺寸、NaN、截断或明显退化。数值容差按浮点误差定义并记录，不能掩盖毫米级误差。 |
| 0° / 90° / 非直角旋转 | 测量坐标系正确；投影与同角度占地一致，2D / 3D 选中和拖动中心一致；标签不发生新遮挡或越界。 |
| 复制、Undo / Redo、切换 2D / 3D | height 和外廓参数独立复制；历史精确恢复；切换不会新增高度或改变摆位。 |
| T07 正常 / 失败保存、替换取消 | height 已提交修订准确保存；失败时能真实下载内存；备份不含草稿 / 预览；取消替换保留高度草稿；重试后刷新正确恢复。 |
| 实际 JSON 下载 / 上传、PNG | 捕获真实下载并读取 / 校验，再通过产品审查回导；height、浮点尺寸、单位、使用区、来源、底图、结构全部保留；2D / 3D PNG 正常。 |
| 三户型与 390 px | 高度和单位入口可达、无横向溢出；平面规划、标签与漫游没有回归；未知原图尺寸保持原说明。 |

涉及 3D 实体改变时，既有高度占位 / 模型外包差异不可仅用截图或 UI 文案代替测量。新增自动化测试需检测真实模型 / 契约风险，不只重复赋值实现。

## 运行、证据与交付

新证据目录使用 `docs/verification/T04-furniture-dimensions/`，保留所有失败尝试。新增 `docs/T04-furniture-dimensions-verification-2026-10-03.md`（跨日用实际日期），包含问题表、修复前后尺寸、测量坐标系、真实下载 / 回导、实际构建号、数量、截图与未测范围；更新 README、路线图和本文完成导航。

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
```

外部运行库路径需现场确认。现有 8086 服务本窗口仍在监听，应保留；本轮 T07 的 8095 临时服务已停止。下一窗口检查端口空闲后可启动自己的服务：

```bash
python3 scripts/serve.py --port 8095
```

不同端口有不同 localStorage。存储验收使用隔离浏览器上下文，不操作用户常用浏览器里的真实工程。结束只关闭自己创建的上下文 / 服务，不停止 8086。

复用原生脚本时设置新输出目录，例如：

```bash
TEST_URL=http://127.0.0.1:8095/ T07_TEST_OUT=docs/verification/T04-furniture-dimensions/t07-regression node tests/browser-t07-save-recovery.mjs
PLAYWRIGHT_MODULE=/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright TEST_URL=http://127.0.0.1:8095/ USE_ZONE_TEST_OUT=docs/verification/T04-furniture-dimensions/use-zones-regression node tests/browser-t06-use-zones.mjs
```

T07 当前脚本按本轮字段 / 流程写成，若 T04 有必要改变高度 UI 或下载字段，先调整真实操作与有效断言；不得绕过替换保护或用旧结果充作新结果。3D 标签、全屋、PNG / PDF、持续漫游脚本及其输出环境变量参阅 T07 / T06 验收，按实际模型影响选择必要回归，不无理由重复整个矩阵。

已有未测范围继续保留：Safari / Edge、实机触屏、物理打印机、严格同时写入竞争、真实运动 / 高度避让 / 同时使用、法规合规。`sourceWholePlanAccepted: false` 和未知原图尺寸保留。本批交付默认本地可运行 / 可审查，不推送或部署。

## 可直接粘贴到新窗口

```text
继续 floorplan-3d 的 T04 第一批：家具真实外廓与高度编辑。
项目目录：/Users/chris/Documents/项目/AI家装/floorplan-3d
先读 docs/T04-furniture-dimensions-handoff-2026-10-03.md、docs/roadmap.md、T07 最新验收和机器结果，再检查 Git 与实际调用链。
直接接续 feat/ui-refactor 当前工作区，保留全部未提交、未跟踪内容；不从主分支、纯 HEAD、远程克隆或新 worktree 重建，不 reset、clean、stash。
先原生复现高度 UI 缺口与各类家具模型实际外包宽/深/高、落地和旋转的差异，再完善可选 height 编辑与 2D/3D 尺寸一致性。旧项目缺省 height 仍保留未知，不能自动补实测值；复用 mm、英制/公制输入、草稿、事务、撤销与 T07 保存保护。
共用生产逻辑复测 Jacobsen、CMU、修正 Plan F 和独立非等比/旋转尺寸；实际下载并回导，保留使用区、底图、结构、来源和精确尺寸。新增验收目录，保留失败与历史证据，更新验收与导航。
本批不做真实柜门/抽屉运动、垂直碰撞、自动推断厂商尺寸、账户或云同步。先自主完成可运行、可审查的一批，不提交、推送、合并或部署，除非用户另行授权。
不读取、修改或提交 aws-tokyo-wireguard.yaml。默认简体中文沟通；产品保持英文。
```
