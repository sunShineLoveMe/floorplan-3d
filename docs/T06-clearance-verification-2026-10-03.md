# T06 第一批：占地间距与目标净宽路径

**后续状态：第二批使用区与持续原生漫游已完成，见 [最新验收](T06-use-zones-verification-2026-10-03.md)。以下保留第一批历史结果和当时未测范围，不修改既有证据。**

日期：2026-10-03。工作区：`feat/ui-refactor`，接续 HEAD `ea09df0db7c17d8429d8a042f4f9f7ab0c07c075` 及上一轮全部本地内容。本批未提交、未推送、未合并、未部署。

本批实现家具实际旋转占地间距、显式嵌套 / 地面覆盖规则、可保存的规划目标净宽、选定空间之间的连续圆形扫掠路径检查与 2D 定位。修复漫游从家具内部开始的问题。**T06 尚未全部完成：床侧、座椅、柜门与电器操作区留给下一批。**

## 已核验问题与处理

| ID / 优先级 | 复现、影响与证据 | 修复与验收条件 |
|---|---|---|
| T06-001 / P1 | 导入 Jacobsen 最新工程 JSON：已有三类冲突为 0，但 Queen 与 Master desk 最短占地间距只有 289.56 mm；台面 / 水槽重叠未在产品中声明。修正 Plan F 同样存在水槽与台面嵌套。见 [原始模型截图](verification/T06-clearance/jacobsen-before.png)、[独立场景审计](verification/T06-clearance/baseline-audit.json)。既有功能未包含一般占地间距，因此作为已确认缺口，而不是原功能回归缺陷。 | 新增真实旋转矩形最短距离，区分接触、重叠和低于目标的局部间距；隔墙间距排除。显式指定父对象，仅在完全包含且不存在嵌套链时豁免这一对，外层继续阻挡通行。无户型 / 名称分支。原生 UI 声明、撤销 / 重做、保存回导通过。 |
| T06-002 / P1 | 既有 3 in 审计只证明结构连通。独立两空间模型放入 1000 × 200 mm 横向家具后仍有结构通路，但不能以 500 mm 净宽通过；家具无挡门 / 固定物冲突不足以证明通行。见 [阻塞模型](verification/T06-clearance/blocked-test-project.json)、[阻塞截图](verification/T06-clearance/no-route.png)。 | 属性面板提供目标、起终空间、门状态假设；有家具与无家具分别计算。找到的每条连续路径满足目标半径，不将未找到称为精确阻断结论。真实改尺寸 / 移动 / 删除与撤销 / 重做立即更新。 |
| T06-003 / P1 | Jacobsen 保存的漫游起点 `[1524,2133.6]` 位于 `fmursdbz330`（Queen）内；Plan F 起点 `[1701.8,579.12]` 位于 `fmuqkqcaz25`（Closet storage）内。旧 `setMode('walk')` 直接采用该点，`blocked()` 不包含家具。见 [修复前模型与截图](verification/T06-clearance/plan-f-before.png)。 | 进入漫游时以 220 mm 半径寻找净地面内、避开墙 / 固定物 / 家具 / 当前门叶的位置，优先原空间；无可用点时拒绝进入。补充家具旋转占地碰撞。三场景实际 WebGL 进入漫游，位置独立复核，原 `geometry.walkStart` 与模型摆位保持不变。持续键盘行走 / 触屏摇杆碰撞尚未原生端到端验收。 |
| T06-004 / P2 | 新增通道摘要继承全站 `summary {white-space:nowrap}`，390 px 下属性面板宽 303 px、内容宽 309 px。 | 摘要换行、面板留白、窄屏单列表单。复测内容宽等于可见宽，控件与定位可达。见 [390 px 截图](verification/T06-clearance/mobile-390.png)。 |

问题对象 ID 属于验收模型记录，生产代码不引用这些 ID。原始截图保留原模型，阻塞变体仅存入新目录，最后还原源家具摆位。

## 计算与交互约定

- 内部为 mm。默认 900 mm 是可调整的规划偏好，不是法规值。输入范围 100–3000 mm；英尺 / 英寸显示不改保存精度。
- 净地面采用房间多边形与有效门 / 通道洞口并集，不使用含墙 floor slab 判定可通行。直墙、半高墙、斜墙与固定物均阻挡平面通行。旋转矩形使用真实边，不用包围盒代替最终判定。
- 网格为 50 mm，最多 120,000 个采样点。候选点以目标的一半为圆半径，节点与每段连接分别检验外边界 / 实体障碍距离；不允许穿过细长障碍物、窄斜缝、断开的地面或无宽度的角部接触。边界仅使用 0.000001 mm 数值容差，无人为放宽。并集边界拆分使用 0.001 mm 外向探针；更细的地面细节不作精确测量承诺。
- 起终点为所选空间内距标签最近的可站立网格点；标签中心不直接当作可站立点。只验证这两个具体点之间的路径，不能证明整个房间或全部空间均可达。相同采样点无行走段，会明确说明。
- 结果为 `route-found`、`no-route`、`no-standing-point`、`unknown`。后两种缺失路径 / 点可能受离散采样影响；缺失空间、非法轮廓、超出预算不强行通过。附近对象为候选原因，不宣称已找到唯一阻塞物。
- `open`：平开门按 40 mm 门叶，推拉门假设完全退开；`closed`：封住平开 / 推拉洞口。折叠门堆叠尺寸未知，两种状态均保守封住该洞口。通道始终开放。规划门状态与 3D 的实时开关相互独立。
- 地毯默认可跨越，其余默认实体；可显式调整 `solid / ground`。该规则仅用于平面规划，不证明高度避让。嵌套不改变占地或其他对象规则，父对象删除 / 不再包含时显示无效声明。
- 衍生结果不保存；可选 `project.clearance` 保存目标 / 起终空间 / 门假设，可选 `furniture.clearance` 保存占地规则 / 父对象。验证和 store 事务兼容既有 v2 / v1 / legacy，撤销、重做、刷新、JSON 回导与单位切换均已覆盖。
- 入口为 **Properties → Passage & spacing**；家具属性可声明占地规则与嵌套、查看最近墙 / 固定物距离。定位显示 2D 路径 / 端点或选中家具，不自动修改摆位。打印包含目标、空间、门假设、结果与采样限制。

## 跨户型结果

| 模型 | 原始默认 900 mm 检查 | 本批显式 600 mm 检查 | 独立路径最小实体距离 |
|---|---|---|---:|
| Jacobsen：12 空间 / 20 家具 | 首空间至末空间，末端无可站立采样点 | Central circulation → Living 找到路径 | 300.803 mm |
| CMU：8 空间 / 14 家具 / 7 固定物 | Bedroom Two → Bathroom 未找到路径 | Living → Hall 找到路径 | 305.007 mm |
| 修正 Plan F：7 空间 / 12 家具 | 首空间衣柜无可站立采样点 | Living → Dining 找到路径 | 300.956 mm |

600 mm 是测试者显式选择的目标，**不用于宣称模型符合任何通行规范，也没有以改阈值消除原模型限制**。两类结果和选择空间均记录在 [浏览器机器结果](verification/T06-clearance/browser-results.json)。600 mm 所对应的验证圆半径为 300 mm；这里的实体距离是这条已找到路径的核验值，不是户型的精确最大可通行宽度。

每个场景均通过真实属性操作把一件家具移动 / 扩大到终点空间，确认 `no-standing-point`；随后按事务撤销 / 重做并恢复原摆位。独立开放分区模型覆盖 `no-route`、地面覆盖声明、删除及恢复。B / A / C 另复测同一生产分析器、实体家具中心阻挡与模型不变，见 [结果](verification/T06-clearance/abc-results.json)。四向斜切、不同斜率、开放共享边、固定物和旧兼容项目继续通过回归。

## 验证证据

| 验证 | 结果 / 产物 |
|---|---|
| 自动化测试 | 121 / 121（原 107 + 本批 14）；[测试输出](verification/T06-clearance/unit-tests.txt) |
| 新功能原生浏览器 | 三户型与独立阻塞 / 窄屏模型；[检查清单](verification/T06-clearance/browser-results.json) |
| 独立几何核验 | Shapely 直接核对整条折线路径与地面并集外边界、墙、固定物、家具和门假设的最短距离；[独立结果](verification/T06-clearance/independent-results.json) |
| 全屋原有流程 | Jacobsen / CMU 各 11 项，3D 标签各 6 组；新目录 `whole-jacobsen` / `whole-cmu`，原保存 / 编辑 / 导入 / 图纸校准 / 模式切换 / PNG / PDF / 窄屏流程保留 |
| 既有回归 | NA-001～012、四套斜切 43 项、固定物 8 项、Plan F 越界修正 7 项；各自产物与日志位于新目录 |
| 实际输出 | 三份配置后 JSON、2D / WebGL 3D PNG、A3 PDF；另两份全屋流程 A3 PDF。独立核对单页、纸张、文字、无页脚裁剪和 100 mm 标尺 |
| 静态与构建 | source ESLint、JS / Python 语法、`git diff --check`、资源构建；最终资源版本及各回归运行版本见 [最终记录](verification/T06-clearance/final-results.json) |
| 原件与历史资料 | 初始摘要与最终核对覆盖上一轮全屋、斜切、组合、固定物及图纸素材全部文件；[初始摘要](verification/T06-clearance/prior-hashes.json)与最终记录 |

原生环境为 macOS Chrome headless / Playwright，WebGL 采用 SwiftShader；桌面 1440 × 1000 与窄屏 390 × 844。检查仅启动自己的 8095 服务并在结束停止，原 8086 服务保留。Shapely / PyMuPDF 位于 `/tmp/floorplan-audit-tools` 验收环境，不加入应用依赖。

可复测命令：

```bash
npm test
npm run build
node /Users/chris/.npm/_npx/515228b7c8d004a2/node_modules/eslint/bin/eslint.js src --config tests/eslint.config.js
PLAYWRIGHT_MODULE=/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright TEST_URL=http://127.0.0.1:8095/ T06_TEST_OUT=docs/verification/T06-clearance-next node tests/browser-t06-clearance.mjs
/tmp/floorplan-audit-tools/bin/python scripts/check-passage-exports.py docs/verification/T06-clearance-next
git diff --check
```

再次执行请选择新产物目录。全屋旧脚本需分别指定 `COMPOSITION_TEST_OUT`；独立 PDF 脚本需要这些完整输出，不覆盖旧证据。

## 下一批与未测范围

下一批补充显式、可调整方向和尺寸的床侧 / 座椅 / 柜门 / 电器使用区，继续共用于各户型；不得从家具名称自动推断高度与开门方式。本批未验收这些使用区、斜边洞口、多层、完整法规或无障碍标准、任意复杂大模型的精确最小净宽、3D 实时门状态与规划分析联动、持续原生行走 / 摇杆阻挡、Safari / Edge / 实机移动端或物理打印机。

原始图纸未知尺寸、工程假设及 `sourceWholePlanAccepted: false` 继续保留。本批不新增原住宅完整实测验收数量。未读取、未修改、未纳入无关文件 `aws-tokyo-wireguard.yaml`。
