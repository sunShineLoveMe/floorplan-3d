# P0 局部墙段与半高隔墙验收

日期：2026-10-02。接续 `feat/ui-refactor`。按用户“先推送，然后继续任务”的授权，已先将前两批修复及原工作区资料提交为 `25faa07`，推送到 `origin/feat/ui-refactor`，并核对远程 SHA 与本地一致。此记录为墙段验收时的快照；后续交付范围见 [本批交付记录](NA-delivery-2026-10-02.md)，远程同步状态以 Git 为准。

**本批补齐 NA-002 的局部墙段和半高隔墙，可保留隔断并在指定区间留出通道。完整住宅图纸仍需继续补洞口类型及衣柜、洗衣区域，不能以本批模型作为全屋验收结果。**

优先级依据 [原审查](NA-user-flow-audit-2026-10-01.md) 与 [第二批剩余 P0](NA-real-house-verification-2026-10-02.md)。文档问题描述作为修复依据，实际执行范围由用户请求确定。

## 逐项调整与复测

| 顺序 / 优先级 | 问题与影响 | 完成的调整 | 复测证据 |
|---|---|---|---|
| 1 / P0 NA-002 | 整侧开放会删掉应保留的隔墙，无法表达局部通道 | 每侧按距起点、长度、高度编辑多个墙段，间隙形成通道；共享墙合并两侧，补齐净空间之间的通道地面 | 两个 12×10 ft 空间，两侧墙各保留 3 ft，中间 4 ft 通道；数据、实际 SVG、3D 建筑生成器均确认无阻挡 |
| 2 / P0 NA-002 | 厨房半高隔墙无法表达，只能整墙或整侧删除 | 墙段高度低于层高即半高墙，2D 使用浅色低墙样式，3D 精确按毫米高度生成并受剖切上限约束 | 公开 Plan B 的餐厨边界，9 ft 6 in 简化墙段、4 ft 测试高度；JSON、撤销/重做、3D PNG 与剖切 |
| 3 / 表单联动 | 编辑房间可能丢失墙段，降高或缩小可能让源参数失效 | 保留墙段；改层高时全高段随层高变化，固定半高段保留；越界、重叠、低墙内门窗整次拒绝；墙厚设 0 清除本侧墙段 | 非法编辑前后整个项目一致、改名保留、缩房拒绝、零墙厚及撤销 |
| 4 / 窄屏可用性 | 墙段工具栏与“应用”栏同时固定，遮挡长表单字段 | 墙段工具栏随表单滚动，仅保留底部表单操作栏；墙段容器限制最小宽度 | 390×844 高度字段真实点击、修改、应用及撤销；无横向溢出 |

## 操作和数据约定

Room / Openings → 当前房间 → Choose wall → Edit segments / pony wall。起点方向与所选墙说明一致，长度支持现有严格英制、公制输入。可以添加/移除墙段、恢复整面全高墙或移除本侧全部墙段；表单取消不写入项目，应用可撤销。

共享边界沿用两侧物理墙体并集：单侧移除或降低墙段不会自动改写邻室；要形成通道或降低整段共享墙，两侧必须对应调整。重叠处取较高墙，避免房间顺序使低墙覆盖完整隔墙。通道自动补地面，避免墙体移除后地板留缝。

`House.rooms[].wallSegments` 是可选源参数对象，键为 `top/right/bottom/left`，每段 `{offset, length, height}` 为浮点毫米。省略侧为整面全高墙，空数组为本侧无墙；段长至少 1 mm，高度 100 mm 至本层净高，不能越界或重叠，每侧最多 20 段、每层最多 300 段。墙厚仍继承本侧 `wallWidths`。整面全高墙恢复时移除该侧自定义配置。

门窗仅能位于连续全高墙段内，距两端至少 1 mm；半高墙内洞口、跨越墙段间隙的门窗不在本批支持范围。已有洞口阻止非法降高、删段或改为开放。此为编辑器几何约束。

自定义墙段项目包含与 `geometry.walls` 对齐的 `wallHeights`，以及共享通道的 `passages` 地面连接矩形；无自定义配置的旧项目保持原生成结构。JSON 导入仍从源参数重新生成并校验全部几何，篡改高度不能绕过校验。

## 样本与验收边界

继续使用第二批的 [公开 Plan B PDF](verification/NA-real-house/san-diego-plan-b.pdf) 第 5 页 A1，以及其已标定、九区手工模型。原图明确标注 `PONY WALL 4'-0" MAX HEIGHT`，本次取其最大值 4 ft 验证高度；9 ft 6 in 来自餐厅净深，按整条餐厨边界简化建模，并未确认原墙段端点的测绘精度。

墙厚沿用第二批的内墙 4.5 in / 外墙 6.5 in 测试假设。家具、原卧室门窗和 PDF 底图均保留。没有完整描绘衣柜、洗衣区和全部门窗，面积仍按手工矩形空间的净边界求和，通道补面不单列计入面积。完整尺寸、连通及全屋面积核对待后续完成。

## 验证结果与产物

**最终版本 `73707f19f6ed9794`：53/53 自动化测试、15/15 墙段浏览器检查、前轮 NA-001～012 的 12/12 回归，以及 80 个 JavaScript 模块语法检查、Lint、文档链接和差异检查均通过。** [总结果](verification/NA-wall-segments/final-results.json)、[回归日志](verification/NA-wall-segments/regression.log)、[Lint](verification/NA-wall-segments/lint.log)、[语法](verification/NA-wall-segments/syntax.log)。

实际打印回归下载 [1:100 PDF](verification/NA-wall-segments/regression/NA-012-print-100.pdf)，已检查浏览器标尺长度并渲染查看；实体打印尺量未执行。

- 可回导的 [局部通道项目](verification/NA-wall-segments/partial-project.json)、[餐厨半高墙项目](verification/NA-wall-segments/plan-b-pony-project.json)。
- 实际下载的 [通道 2D PNG](verification/NA-wall-segments/partial-2d.png)、[住宅 2D PNG](verification/NA-wall-segments/plan-b-pony-2d.png)、[住宅 3D PNG](verification/NA-wall-segments/plan-b-pony-3d.png)。
- [桌面通道](verification/NA-wall-segments/partial-shared-wall.png)、[3D 页面](verification/NA-wall-segments/plan-b-pony-3d-screen.png)、[剖切](verification/NA-wall-segments/plan-b-pony-cutaway.png)、[窄屏字段](verification/NA-wall-segments/mobile-segment-fields.png)。
- [实际表单浏览器脚本](../tests/browser-wall-segments.mjs)、[结果](verification/NA-wall-segments/browser-results.json)、[日志](verification/NA-wall-segments/browser.log)、[数据与实际建筑生成器测试](verification/NA-wall-segments/unit-tests.log)。

浏览器使用独立临时 Chrome profile 和本机临时服务，未写入用户日常浏览器存储。表单、墙选项和视图采用实际 UI，文件上传及隐藏导出按钮由脚本操作；未向产品添加测试接口。原 8086 服务保留并补验 HTTP 200，8095 临时服务已关闭。早期测试的浮点精确相等及隐藏/动态控件定位已修正，调试日志保留在 `verification/NA-wall-segments/debug/`，不作为通过证据。

下一 P0：推拉/折叠洞口与衣柜、洗衣区域，再对同一 A1 进行完整连通、净尺寸、面积及门窗定位核对。多边形房间、多楼层、自动识图、Safari/Firefox、实体打印尺量、真实触屏及外部首次用户试用尚未验收。
