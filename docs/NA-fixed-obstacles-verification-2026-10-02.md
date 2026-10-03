# DV-003 固定障碍物编辑与复测

2026-10-02；`feat/ui-refactor`；最终构建 `2aa67ee25a57fedc`。

**已完成多处矩形柱 / 墙体凸入的独立编辑、净面积扣除、家具和平开门冲突提示，并通过复测。CMU 两套公寓的完整户型仍未验收。** 原图未提供柱宽深、全部门窗及厨卫细部尺寸；下列房间模型明确使用测试假设，不作为原公寓的精确复原。

## 问题与调整

DV-003（P1）：单角缺口不足以表达多个柱凸入，用家具代替柱子会在清空布置时丢失结构，也不能正确扣除净面积。本轮新增 `Rooms and openings → Fixed obstacles`，按房间分别新增、编辑和删除。宽、深默认空白，须输入长度；X/Y 从房间室内左上角量到障碍物左上角，高度为 100 mm 至本层净高。支持最多 20 个 / 房间、300 个 / 层。

固定结构独立于家具，在隐藏或清空家具后保留。2D / 3D 和漫游碰撞使用同一占地；低障碍物按输入高度生成，切面限制可见高度。房间列表、属性、总面积、材料面积、悬停、房间标签与打印统一扣除固定占地；外轮廓和含墙地面面积不变。房间标签锚点与初始漫游位置避开固定占地。

家具采用旋转矩形相交判断；平开门使用实际四分之一圆扫掠区。发生冲突时标红，属性按钮定位对应房间，修改后自动复核。此检查为平面占地，不计算高度避让；推拉与折叠门的运动扫掠不在本轮范围。

禁止越界、进入角部缺口、相互重叠、覆盖全部地面及超高；缩小房间不会裁掉柱子，而是拒绝整份草稿。既有 v2 文件没有障碍物时，生成几何保持原样；新增数据仍保存为 v2 可编辑项目。浏览器复测发现英尺换算的浮点误差使贴墙柱被拒绝，已对房间边界和相邻柱接触应用已有的微小几何容差，并保留针对实际解析值的回归测试。

## 图纸和测试假设

来源均为项目内保存的 CMU Fairfax 官方原始 PDF，未重新抓取或改写原文件：

| 案例 | 图中标注房间 X × Y | 本轮测试假设 | 扣除后的净面积 |
|---|---|---|---:|
| [Studio 原图](../tests/fixtures/floorplans/originals/cmu-fairfax-studio/original.pdf) | 19'9" × 11'8" | 三个 12×12 in 固定占地：两个 8 ft 高柱，一个 4 ft 高凸入；Queen、4×2 ft 衣柜和书桌 | 227.42 sq ft |
| [两卧原图](../tests/fixtures/floorplans/originals/cmu-fairfax-two-bedroom/original.pdf)，Bedroom Two | 10'10" × 8'6" | 两个 12×12 in、8 ft 高柱；Twin XL 床垫及 3×2 ft 衣柜 | 90.08 sq ft |

两例层高 8 ft、各侧墙厚 4 in；测试门宽 2'6"、高 6'8"，Studio 门距上墙起点 7'6"，小卧室 7 ft。柱子位置、门所在墙和这些细部数值均为测试假设，不能用来认证完整原图。小卧室中的衣柜为家具摆放案例，不是原图独立衣柜空间的复原。

Studio 沿用此前标注矩形的近似标定。两卧 PDF 在导入界面按整页预览约 `(589,178) → (794,178)`（1600×1036 预览坐标）选小卧室上边，输入 `10 ft 10 in`；保存的是实际渲染像素与对应比例。该图为示意图，未确认实测精度。原文件 SHA-256 见 [原图来源清单](../tests/fixtures/floorplans/manifest.json)。

## 复测结果与证据

- 89 项单元测试通过：来源校验、缺口与面积、旋转碰撞、门扇、边界精度、JSON 回导、标签、3D 高度与漫游碰撞等。
- [新增浏览器检查](verification/NA-fixed-obstacles/browser-results.json) 8 项通过：空尺寸拒绝、多个柱、无效编辑原子保护、门扇和家具冲突与纠正、隐藏 / 清空家具、删除撤销重做、回导 / 刷新、390 px 表单、两个真实来源的房间导出，以及四套既有完整户型逐一回导且几何完全一致。
- NA-001～012 回归通过；参考导入与缩放标定 8 项回归通过，均采用同一最终构建。ESLint 无错误或警告，构建和差异检查通过。见 [总结果](verification/NA-fixed-obstacles/final-results.json)。
- 实际下载：[Studio JSON](verification/NA-fixed-obstacles/studio-project.json)、[2D](verification/NA-fixed-obstacles/studio-2d.png)、[3D](verification/NA-fixed-obstacles/studio-3d.png)、[PDF](verification/NA-fixed-obstacles/studio-print.pdf)；[小卧室 JSON](verification/NA-fixed-obstacles/bedroom-two-project.json)、[2D](verification/NA-fixed-obstacles/bedroom-two-2d.png)、[3D](verification/NA-fixed-obstacles/bedroom-two-3d.png)、[PDF](verification/NA-fixed-obstacles/bedroom-two-print.pdf)。
- 两份 PDF 已渲染检查，为单页 US Letter 横向，面积和障碍物数量与导出的 JSON 一致，100 mm 比例尺为 283.5 pt。见 [PDF 检查](verification/NA-fixed-obstacles/pdf-results.json)。未测试实体打印机。

使用独立 8095 服务和临时 Chrome profile，未写入用户原浏览器方案。Safari、Edge、实体触屏、任意多边形、多角缺口、悬空构件及高度避让不在本轮验收范围。原有四套完整户型的验收范围没有扩大；新增 14 份素材仍不算完整户型验收。

## 后续问题和交付状态

DV-003 的矩形固定障碍物工程子项已通过；剩余整户组合和未知细部尺寸仍待验证。下一步扩展 CMU 两卧的房间 / 衣柜 / 通道组合，按明确尺寸建模并列出未知，再推进 Jacobsen 狭长住宅的完整布局。无法从原图确认的尺寸不以猜测补成“已验收”。

DV-004（P2）：小卧室的 2D / 打印中，`Twin XL · mattress footprint` 字符串超过床占地宽度，左侧少量越过房间边界；家具尺寸与碰撞结果正确，标签可读性仍需改进。证据见小卧室 2D / PDF。这一显示问题单独登记，下一批按优先级修复并复测，不以本轮结构验收代替标签验收。

此前标定修复已推送到 `origin/feat/ui-refactor`，提交 `a54283f`。本轮固定障碍物改动和证据保留在当前本地工作区，尚未提交、推送、合并或部署。原有非本任务文件保持原样。

### 后续复测登记

后续构建 `a105f6dde4ed890c` 已完成 CMU 两卧的 8 空间组合工程流程，DV-004 家具标签越界已修复；未知细部仍为测试假设，原公寓完整尺寸仍未验收。见 [整户组合与标签复测](NA-apartment-composition-verification-2026-10-02.md)。上文及 `NA-fixed-obstacles` 目录保留本批当时的构建和结果快照；后续回归另存于 `NA-apartment-composition`。
