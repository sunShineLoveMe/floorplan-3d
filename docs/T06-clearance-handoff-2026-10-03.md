# T06 交接：通道净宽与家具使用空间

交接日期：2026-10-03。项目：`/Users/chris/Documents/项目/AI家装/floorplan-3d`。

**最新状态：T06 第二批已完成，见 [家具使用空间最新验收](T06-use-zones-verification-2026-10-03.md)和[最终机器记录](verification/T06-use-zones/final-results.json)。下文“下一批”和原始基线均为历史交接内容，保留供追溯。**

**原接续状态：T06 第一批已完成。** 目标净宽路径、占地间距、显式嵌套与漫游起点修正的当前结果见 [T06 第一批验收](T06-clearance-verification-2026-10-03.md)。下一批是可调整的家具使用区。以下保留开始本批前的原始交接基线与实施要求；107 项测试及“未实施 T06”描述属于当时状态，最新构建、121 项测试、本地改动和未测范围以新验收记录为准。

## 下一步与交付目标

**下一步是 T06：在现有门扇、固定障碍物和净地面冲突提示之上，检查家具间距，以及摆入家具后的通道净宽。** 随后分批补充家具使用空间。所有能力必须共用于不同户型，每修复一项就复测该项，并回归其他布局。

目前两套全屋工程场景已通过编辑、保存、回导和输出检查，但结构连通不等于放入家具后可以通行。先完成可配置目标净宽、明确阻挡原因和定位问题的可交付批次，再扩充家具使用区；不要一开始重构整个编辑器。

本文件是接续工作的说明。交接这一轮仅新增文档和导航，没有实施 T06。

## 必须从当前本地工作区接续

| 项目 | 当前基线 |
|---|---|
| 分支 | `feat/ui-refactor` |
| 本地 HEAD / 上轮已核对的推送提交 | `ea09df0db7c17d8429d8a042f4f9f7ab0c07c075` |
| 最近验收构建 | `cd24d1281a92a43a` |
| 最近测试 | 107 项自动化测试；Jacobsen / CMU 原生浏览器各 11 项，3D 标签各 6 组 |
| 当前新增工作 | 全屋复用测试、Jacobsen 场景和 DV-007 3D 标签修复仍为本地未提交 / 未推送状态 |
| 服务 | 原 8086 服务保留；上一轮独立 8095 验收服务已停止，接续时重新核验端口 |

**直接打开上述项目目录。不要从主分支、纯 HEAD、远程克隆或新 worktree 开始，否则会遗漏最新工作。** 先检查 `git status --short`、分支和 HEAD；不要 reset、clean、stash 或覆盖现有文件。远程状态是上轮核验结果，若下一步涉及推送需重新核对。

本地待保留内容包括 `src/viewer3d/viewer.js`、资源版本 `index.html`、全屋浏览器脚本、共享审计、CMU / Jacobsen 场景、3D 标签审计、107 项测试对应的新测试、PDF 检查脚本、验收文档与产物目录。不要因未跟踪而忽略 `docs/verification/NA-whole-floor-reuse/`。

与项目无关的未跟踪文件 `aws-tokyo-wireguard.yaml` 不读取、不修改、不纳入提交。本交接不新增推送、合并或部署动作；后续这些动作以用户明确要求为准。

## 先读这些证据

1. [最近全屋复用验收](NA-whole-floor-reuse-verification-2026-10-03.md)及[最终机器结果](verification/NA-whole-floor-reuse/final-results.json)：当前状态、构建、产物摘要、原图假设和未测范围。
2. [斜切角与 Plan F 修正](NA-diagonal-cuts-verification-2026-10-03.md)：四向斜切、共享边界和 DV-006。
3. [CMU 组合验收](NA-apartment-composition-verification-2026-10-02.md)、[固定障碍物验收](NA-fixed-obstacles-verification-2026-10-02.md)：既有计算和正常嵌套的边界。
4. [原始问题清单](NA-user-flow-audit-2026-10-01.md)、[路线图](roadmap.md)、[原图素材库](../tests/fixtures/floorplans/README.md)：历史优先级、已完成任务和来源。

NA-001～012 已有修复验收；固定物、CMU 标签、斜切角、Plan F 越界修正均已有证据，不重复当作新问题。DV-007（P2）已在共享 3D viewer 中修复投影标签遮挡，最新本地工作保留此修复。

素材库有 18 份原件，另有 B / A / C / F 四套单层手工模型。Jacobsen 和 CMU 的全屋场景使用部分原图尺寸和明确的工程假设，均保留 `sourceWholePlanAccepted: false`。**本轮工程流程通过不能宣布原住宅完整实测验收。** 未标注尺寸继续保留为未知或测试假设；多层、任意轮廓自动识别和斜边洞口仍未完整验收。

## 当前实现和缺口

| 入口 | 已有能力 / 接续注意事项 |
|---|---|
| `src/core/polygons.js` | 毫米制多边形、凹多边形分解、旋转家具占地、交集 / 差集、圆与多边形检测；优先复用 |
| `src/core/door-clearance.js` | 平开门扫掠与家具冲突；地毯有现有豁免，推拉 / 折叠 / 通道不按平开门处理 |
| `src/core/obstacle-clearance.js` | 固定物与旋转家具、门扇冲突；尚不计算高度避让 |
| `src/core/floor-clearance.js` | 家具超出净地面、进入斜墙、门扇进入斜边；不是通行净宽检查 |
| `src/data/house-editor.js` | 房间切角、墙厚、局部墙段、半高墙和门窗生成；含墙地面不能直接作为可通行区域 |
| `src/data/project-data.js` / 项目 store | 导入校验、序列化与编辑事务；新增设置需覆盖保存、回导、撤销 / 重做 |
| `src/ui/door-clearance.js` | 现有冲突状态与属性面板定位入口，可接入新提示而不另造复杂界面 |
| `src/editor2d/renderer.js` / `src/ui/property-panel.js` | 测量、选中和叠加提示的接入位置，实施前沿调用链确认 |
| `src/services/print-plan.js` | 原生打印输出，已有面积、数量、冲突信息与 100 mm 标尺 |
| `src/viewer3d/viewer.js` / `architecture.js` | 3D 标签与漫游碰撞；不能用现有漫游圆半径直接证明全屋可通行 |

`tests/helpers/audit-apartment-scenario.js` 的 `auditFloorScenario` 是共享测试审计：独立核对尺寸 / 面积 / 占地，检查家具互撞，并以 **3 in 网格检查结构连通**。该网格不含家具和人员半径，只确认每个房间至少存在可到达采样点；不要把这个结果改名成“通道净宽通过”。

其中 `allowedOverlaps` 是场景测试中的显式嵌套声明，尚不是产品功能。厨房水槽嵌在台面内不能无条件当作摆放错误，也不能因为某个家具名称含 Sink 就全局放行。

## 实施顺序

### 1. 先复现真实阻挡，再按优先级修复

导入下方三个模型，检查密集卧室、厨房台面、卫浴和洗衣区域。用已有 UI 移动 / 旋转家具制造可解释的窄通道与阻塞变体。记录问题优先级、复现步骤、对象 ID、影响、修复建议、验收条件和截图，再按 P0 → P1 → P2 实施；不要把尚未核验的风险写成已确认 bug。

特别核查漫游起点是否落在家具内。这是待测风险，尚未完成原生漫游验收；避免分析器直接用房间标签中心作为“已知可站立位置”。

### 2. 通用间距与占地规则

对实际旋转占地计算对象间距、墙 / 固定物距离和一般互撞。轴对齐包围盒只能做候选筛选，不能代替斜墙或旋转家具的最终判定。接触、重叠和低于目标间距分别表达；距离以 mm 存储，按用户选择显示 Feet/inches 或 mm。

定义并验证哪些对象阻挡通行，哪些是可覆盖地面或显式嵌套。保持现有门扇、固定物和越界检查；新增通用逻辑不能写入 Jacobsen / CMU / Plan F 的名称、品牌或 fixture ID 分支。

### 3. 摆入家具后的通道净宽

提供可调整的规划目标净宽，明确起点、终点和门状态。分析实际净地面并集、墙 / 固定物、家具以及与门型相符的阻挡。需要适当的偏移 / 扫掠几何或经验证的保守采样，不能由两个家具的最短距离推出全屋都可通行。

若使用网格，明确分辨率、边界容差与保守规则，验证细长障碍物及窄斜缝，不将离散采样结果称为精确最小净宽。起终点无可站立位置、空间断开或数据不足时给出阻塞 / 未知结果，不强行判为通过。路径不能穿过封闭墙、家具或无宽度的边界接触。

目标值属于用户的规划偏好；不要把未经核验的 30 in / 36 in 等值称为北美法规要求。如需引用法规或标准，另行查阅适用地区的现行官方来源，并注明适用范围。

### 4. 家具使用空间与交互

在通行批次稳定后，补充床侧、座椅、柜门或电器操作区。只采用显式、可调整的使用区假设与方向；现有家具占地没有足够数据确定所有开门方式和高度关系，未覆盖部分保留为未测。

界面复用现有状态 / 属性面板和 2D 定位，展示对象、测量值、目标和原因。移动、旋转、改尺寸、删除、导入、单位切换、撤销 / 重做后自动更新；390 px 窄屏仍可阅读和定位。分析不自动移动家具、不修改用户几何。

衍生检查结果通常无需持久化；若保存目标净宽或使用区参数，采用可校验的可选字段，兼容现有 v2 / v1 / legacy 数据与事务，不为本任务进行无关 schema 重构。

## 跨户型复测矩阵

| 场景 | 输入与重点 |
|---|---|
| Jacobsen：12 空间 / 20 家具 | [最新 JSON](verification/NA-whole-floor-reuse/jacobsen/complete-project.json)、[场景参数](../tests/fixtures/north-american/jacobsen-whole-floor-scenario.json)；狭长动线、两处切角、密集厨卫、台面 / 水槽嵌套 |
| CMU：8 空间 / 14 家具 / 7 固定物 | [最新 JSON](verification/NA-whole-floor-reuse/cmu/complete-project.json)、[场景参数](../tests/fixtures/north-american/cmu-two-bedroom-scenario.json)；柱 / 墙垛、缺角、开放分区、卧室狭缝 |
| 修正后的 Plan F：7 空间 / 12 家具 | [修正 JSON](verification/NA-diagonal-cuts/plan-f-correction/project.json)；局部墙段、半高墙和厨房柜体。历史 `NA-complete-houses/plan-f/complete-project.json` 保留原摆位，不作为修正基线 |
| 四向斜切与不同斜率 | [斜切参数](../tests/fixtures/north-american/diagonal-layouts.json)；共享边界、斜墙真实距离、平移后的坐标、旋转家具，排除包围盒误报 |
| 既有 B / A / C 与兼容数据 | 单层模型、矩形 / 缺角房间、旧版导入、门扇和固定物提示不退化 |

Jacobsen / CMU 场景参数中长度以 feet、墙厚以 inches 表达，由测试 helper 转换成 mm；斜切参数文件使用 mm。不要混用。

增加有独立期望的几何边界测试：目标净宽 ±1 mm、接触与真实重叠、45° / 90° 旋转、斜向窄通道、细长障碍物、窄门、不可达终点、无可站立起点，以及开放分区内跨房间家具。复测门型状态、正常嵌套和使用区假设。

原模型不必全部得到零条新提示：若发现真实窄通道，记录具体位置和限制；不要只为清零修改阈值或隐藏家具。若调整假设摆位，另存修正模型，记录改动并保留来源和其他尺寸。

## 验证命令与产物隔离

在项目目录执行基础检查；107 是交接基线，合理新增测试后数量可增加：

```bash
cd '/Users/chris/Documents/项目/AI家装/floorplan-3d'
git status --short
git branch --show-current
git rev-parse HEAD
npm test
npm run build
git diff --check
```

已有外部工具路径如下，接续时先确认存在，不把验收依赖加入应用：

```bash
node /Users/chris/.npm/_npx/515228b7c8d004a2/node_modules/eslint/bin/eslint.js src --config tests/eslint.config.js
```

如需独立浏览器验收，确认端口空闲后运行 `python3 scripts/serve.py --port 8095`，结束只停止自己启动的服务，保留用户 8086 服务。以下示例使用**新目录**：

```bash
PLAYWRIGHT_MODULE=/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright TEST_URL=http://127.0.0.1:8095/ COMPOSITION_FIXTURE=jacobsen-whole-floor-scenario COMPOSITION_TEST_OUT=docs/verification/T06-clearance/jacobsen node tests/browser-apartment-composition.mjs
PLAYWRIGHT_MODULE=/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright TEST_URL=http://127.0.0.1:8095/ COMPOSITION_FIXTURE=cmu-two-bedroom-scenario COMPOSITION_TEST_OUT=docs/verification/T06-clearance/cmu node tests/browser-apartment-composition.mjs
/tmp/floorplan-audit-tools/bin/python scripts/check-whole-floor-exports.py docs/verification/T06-clearance
```

浏览器脚本需按新功能增加实际 UI 操作与独立断言；上述命令只覆盖已有全屋流程，不会自动验收 T06。PDF 检查需有两套完整输出，外部 Python 路径可能随环境变化。标尺应按 `Calibration ruler: 100 mm` 文字定位，不假定狭长户型页脚总在页面底部。

既有回归脚本为 `browser-na-fixes.mjs`、`browser-diagonal-cuts.mjs`、`browser-plan-f-clearance.mjs`、`browser-fixed-obstacles.mjs`、`browser-reference-usability.mjs`、`browser-compact-labels.mjs`。各自使用 `NA_TEST_OUT`、`DIAGONAL_TEST_OUT`、`PLAN_F_TEST_OUT`、`OBSTACLE_TEST_OUT`、`REFERENCE_TEST_OUT`、`COMPOSITION_TEST_OUT`，全部指向新验收目录下的独立子目录。

不要直接照抄旧验收文档的默认输出路径重新运行：可能覆盖已归档证据。保留原有产物摘要、18 份原图及来源不变。新结果记录构建、测试环境、实际 JSON / PNG / PDF、修改前后截图、检查结果和未测项。

## 每批完成条件

- 已复现的问题按优先级修复，并给出针对该问题的失败 / 修正后证据。
- 同一生产逻辑至少覆盖 Jacobsen、CMU、修正 Plan F，斜切 / 开放分区边界另有回归。
- 有家具阻塞与结构连通的结果分开；间距、目标净宽与使用区假设可解释、可定位。
- 实际操作验证新增提示、消除提示、撤销 / 重做、刷新保存、JSON 回导和单位切换；保留 2D / 3D 与实际打印输出。
- 相关测试、Lint、语法和构建通过；原图 / 历史证据摘要保持不变。不能执行的验证说明原因。
- 更新路线图与验收记录，明确本地 / 远程状态及原住宅实测仍未完成的范围，交付可运行的一批改动。

## 给新窗口的启动提示

```text
请读取 /Users/chris/Documents/项目/AI家装/floorplan-3d/docs/T06-clearance-handoff-2026-10-03.md，接续 T06 通道净宽与家具使用空间任务。
直接使用 /Users/chris/Documents/项目/AI家装/floorplan-3d 当前本地工作区，先核验分支与未提交 / 未跟踪内容，保留最新全屋测试和 DV-007 修复，不从远程或纯 HEAD 重建。
先理解共享几何和现有提示，再复现问题；按 P0 → P1 → P2 修复，每完成一项即复测。必须复用同一能力覆盖 Jacobsen、CMU、修正 Plan F 和斜切边界，不编写户型专用生产逻辑。
保留原图未知尺寸和验收范围，使用新的产物目录，不覆盖历史证据。自主完成可交付批次，报告已测 / 未测及本地状态；未另行授权时不推送、合并或部署。
默认简体中文沟通，产品保持英文与英制优先，内部尺寸使用 mm。
```
