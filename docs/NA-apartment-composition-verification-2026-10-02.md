# CMU 整户组合流程与 DV-004 标签复测

2026-10-02；`feat/ui-refactor`；最终构建 `a105f6dde4ed890c`；接续 [DV-003 固定障碍物验收](NA-fixed-obstacles-verification-2026-10-02.md)。

**整户组合的编辑、保存、回导、2D / 3D / 打印流程通过；DV-004 家具名称越出占地的问题已修复。CMU 原公寓的完整尺寸验收仍未完成。** 本轮是明确包含假设的组合测试模型，不是原图的精确复原。原有四套 San Diego 单层手工模型的验收范围保持不变。

## 整户组合范围

采用项目内 [CMU Fairfax 两卧原始 PDF](../tests/fixtures/floorplans/originals/cmu-fairfax-two-bedroom/original.pdf)，SHA-256 为 `bdef8e9000ff1a9a0f857aa584f0a7fdfa8e095f4a36637a943301530bb60e76`。未改写或重新下载原图。标定使用小卧室 `10 ft 10 in`，只作近似图纸参照。

| 空间 | 模型室内矩形尺寸 | 尺寸依据 |
|---|---|---|
| Bedroom Two | 10'10" × 8'6" | 原图房间标注 |
| Kitchen | 6'0" × 9'0" | 原图矩形标注；缺口另列为假设 |
| Living | 19'9" × 10'0" | 原图房间标注 |
| Bedroom One | 13'2" × 11'3" | 原图房间标注 |
| Kitchen circulation | 2'7" × 9'0" | 测试假设 |
| Closet | 2'0" × 3'0" | 测试假设 |
| Hall | 6'3" × 4'0" | 测试假设 |
| Bathroom | 6'3" × 6'11" | 测试假设 |

所有房间原点、相邻偏移、厨房缺口、7 处柱 / 墙凸入的尺寸与高度、墙厚和层高、12 处门窗的位置与尺寸 / 开合方式、14 件家具及摆位均为测试选择。未知项目单列于 [场景 fixture](../tests/fixtures/north-american/cmu-two-bedroom-scenario.json) 和 [浏览器结果](verification/NA-apartment-composition/browser-results.json)，机器结果保留 `sourceWholeApartmentAccepted: false`。

使用原生界面建立 8 个空间、7 处固定占地、4 扇平开门、1 扇折叠门、1 个通道与 6 扇窗；布置 Twin XL、Queen、书桌、衣柜、厨卫设施等 14 件家具。场景净面积为 **575.91 sq ft**，含墙地面面积 **639.24 sq ft**，这两个数值属于测试模型，不是原公寓实测面积。

独立审计核对每个空间的矩形 / 缺口 / 固定占地面积、旋转家具的四角、家具之间的 SAT 相交、家具和固定结构 / 平开门冲突；结果均通过。另以 3 in 网格检查墙体、窗和固定结构下 8 个空间的结构连通性。此网格检查未加入家具、人形半径或通道净宽，不代替实际漫游和通行验收。

衣柜扩大进入厨房时拒绝修改且完整模型不变；折叠门切换通道、撤销 / 重做、刷新和 JSON 回导均保持预期几何。390 px 窄屏下开合方式表单可操作且对话框无横向溢出。

## DV-004：紧凑家具名称越界

P2；在旧构建 `2aa67ee25a57fedc` 导入上一批小卧室模型，`Twin XL · mattress footprint` 单行文字实际字形宽约 2264 mm，床垫宽仅 965.2 mm。见 [修复前结果](verification/NA-apartment-composition/label-before.json) 和 [画面](verification/NA-apartment-composition/label-before.png)。

家具名称改为最多三行，长词 / 超长名称按占地空间省略；实际 SVG 字形边界在挂载后测量，结合家具旋转角度缩放到占地内，并保持文字正向。完整名称保留在项目数据、属性字段、SVG `title` 和可访问名称中；家具尺寸、位置和冲突数据不变。房间标签的避让计算使用相同的紧凑标签估计范围。

浏览器按 0° / 45° / 90° 分别测试原 Twin XL 名称、500 字符英文名称和 220 字符中文名称，共 9 组。独立测量实际字形的四角并转换到家具局部坐标，全部落在占地内；完整名称保持原样。见 [修复后结果](verification/NA-apartment-composition/label-after.json) 与 [画面](verification/NA-apartment-composition/label-after.png)。整户模型 13 个可见家具标签亦通过边界检查；窄于 380 mm 的衣柜沿用原有不显示名称的规则。

## 验证和可回导成果

| 验证 | 结果 |
|---|---|
| Node 单元测试 | 94 / 94，通过来源、面积、无效组合保护、标签和既有功能检查 |
| 整户原生界面流程 | 10 / 10 |
| 家具标签名称 / 旋转组合 | 9 / 9 |
| NA-001～012 回归 | 12 / 12 |
| 参考图导入与标定回归 | 8 / 8 |
| 固定结构回归 | 8 / 8，包含既有 B / A / C / F 四套模型的逐一回导与几何完全一致检查 |
| 生产源代码 ESLint、语法、构建、差异检查 | 通过，Lint 无错误或警告 |
| 原图完整性 | 18 份 SHA-256 与来源清单一致 |
| 实际打印 PDF | 两份均为单页，面积、数量及 100 mm 比例尺检查通过，并已渲染查看 |

各浏览器组均使用最终构建 `a105f6dde4ed890c`，独立 8095 服务和临时 Chrome profile。北美回归脚本的单项结果本身不含 build，因此运行记录另行保存运行前后的页面构建标识。见 [总结果与证据哈希](verification/NA-apartment-composition/final-results.json)。上批原始验收成果未被覆盖。

- 整户场景实际下载：[项目 JSON](verification/NA-apartment-composition/complete-project.json)、[2D PNG](verification/NA-apartment-composition/complete-2d.png)、[3D PNG](verification/NA-apartment-composition/complete-3d.png)、[A3 PDF](verification/NA-apartment-composition/complete-print.pdf)、[PDF 渲染](verification/NA-apartment-composition/complete-print-render.png)。JSON 包含可编辑房间、固定结构、门窗、家具及标定底图。
- 紧凑卧室实际打印：[US Letter PDF](verification/NA-apartment-composition/compact-bedroom-print.pdf)、[PDF 渲染](verification/NA-apartment-composition/compact-bedroom-print-render.png)。换行后的 Twin XL 完整名称可从 PDF 提取。
- [PDF 检查结果](verification/NA-apartment-composition/pdf-results.json)：A3 横向约 1191.12 × 841.92 pt，US Letter 横向 792 × 612 pt；100 mm 比例尺均为 283.5 pt。未测试实体打印机。
- 重跑脚本：`tests/browser-apartment-composition.mjs`、`tests/browser-compact-labels.mjs`、`scripts/check-apartment-exports.py`。浏览器脚本通过 `TEST_URL`、`PLAYWRIGHT_MODULE` 指定运行环境；PDF 检查使用外部 PyMuPDF 环境，不增加应用依赖。

## 下一任务与交付状态

DV-003 的整户组合工程流程已验证，DV-004 已关闭；CMU 未知细部尺寸继续保留为未知。新增素材 14 份仍不能全部标为完整户型验收。Safari / Edge、实机触屏、人形净宽、任意多边形和多层不在本轮范围。

**下一项为 DV-005（P1）：Jacobsen ISW-4521 的斜向厨房边界。** [原图预览](../tests/fixtures/floorplans/previews/jacobsen-isw-4521/page-1.png) 显示厨房与浴室之间下部有斜向结构边界；当前 `Rooms and openings` 只提供矩形、轴向墙段和矩形角缺口，不能忠实表达该边界。用矩形替代会改变净地面和厨卫占地，不能据此完成原图验收。下一批应先建立最小斜向边界复现，明确编辑与数据兼容方案，再同步验证 2D / 3D、面积、冲突、保存回导及导出。验收条件是无需家具假扮墙体、不改变既有矩形模型，且斜向结构在各视图和回导后保持一致。

Jacobsen 图中的 `13'4" × 52'` 和房间尺寸注明近似；厨卫细部尺寸仍需单列未知。此任务登记来自当前源码和保存原图的检查，不表示已实现斜墙支持。

此前标定批次已推送的提交为 `a54283f`。当前固定障碍物、组合验收和标签修复仍在本地工作区，尚未提交、推送、合并或部署；原有非本任务文件保持原样。


## 2026-10-03 后续复测

DV-005 单角斜切已完成跨户型复用，CMU 8 空间和标签回归在新构建继续通过；原图未知尺寸的范围不变。通用净地面检查发现并修正 Plan F 旧模型的橱柜越界，详见 [斜切角与 Plan F 补充验收](NA-diagonal-cuts-verification-2026-10-03.md)。上述构建与验收数据为本记录当时快照，后续结果保存在独立目录。
