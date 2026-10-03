# 斜切角跨户型复用与 Plan F 补充验收

2026-10-03；`feat/ui-refactor`；最终构建 `84212b2d0f37c16a`；接续 [整户组合验收](NA-apartment-composition-verification-2026-10-02.md)。

**DV-005（P1）已完成单角斜切的工程修复与跨户型复测。四个方向、不同斜率及单房间 / 多房间组合共用同一套功能。** 通用地面检查还发现原 Plan F 南侧橱柜有 3 in 占地进入半高墙，已作为 DV-006（P1）修正并复测。Jacobsen 原住宅的完整尺寸验收仍未完成；本轮局部模型的尺寸明确为测试假设。

## 可复用实现与数据兼容

在 `Rooms and openings → Edit dimensions / position → Corner notch / diagonal cut` 选择角部和 `Diagonal cut`，输入沿 X/Y 的两个切入距离及斜墙厚度。四个角的计算不依赖房屋名称、供应商、固定尺寸或测试 ID；不同距离形成不同斜率，墙厚 0 表示开放斜边界。

v2 项目沿用 `roomEditor`，在原 `notch` 中添加 `shape: "diagonal"` 和 `wallThickness`。宽 / 深仍为切角前矩形的尺寸；单房间最多一个切角。新几何以 `floorPolygons` 保存连续地面、`diagonalWalls` 保存实际墙体占地；不以包围矩形替代斜墙。不含斜切的旧项目继续生成原有几何，读取 v1 / legacy 的路径保留，无新增应用依赖。

同一套多边形计算用于房间净面积、含墙地面面积、房间相交、障碍物合法性、家具净地面越界和斜墙相交；2D、3D、剪墙预览、打印和保存回导均使用该几何。3D 碰撞使用实际斜墙多边形，避免斜墙包围矩形带来的虚假阻挡。相邻开放房间内跨分区家具按地面并集复核，不因跨房间标签而报错。

直墙门窗仍以原矩形对应侧的起点为偏移原点，不能进入被切除的直墙区间；斜边上的门窗尚未实现。切入距离、过厚斜墙、切角内柱子或失效门窗均在提交前拒绝，保留原项目。固定障碍物、旋转家具、清空家具和撤销 / 重做继续复用已有功能。

## 跨户型浏览器验收

通过原生表单建模和家具库操作，未向产品增加测试接口，也未直接写入 localStorage 生成测试方案。实际导出后刷新、导入 JSON，校验结构、家具和参考图一致。所有模型的地面 / 门扇 / 固定障碍物潜在冲突为 0；测试中先引入越界或碰撞，再核对提示、定位与修正。

以下尺寸均为 mm，净面积已扣测试柱占地。三套合成场景用于功能复用验证，不是新增真实房屋的完整验收。

| 场景 | 空间与斜切 | 家具类型 | 净面积 m² | 浏览器检查 |
|---|---|---|---:|---:|
| Jacobsen 厨房局部 | 厨房 + 餐区；左下 900 × 1200，墙厚 120 | 冰箱、橱柜占地、餐桌 | 15.05 | 10 |
| 公寓入口合成场景 | 平移原点；左上 1200 × 500，墙厚 180 | 长凳占地、柜体 | 13.97 | 12 |
| 紧凑卧室合成场景 | 右下 1200 × 700，墙厚 100 | Twin XL 床垫、旋转书桌 | 10.07 | 11 |
| 厨卫共享斜边合成场景 | 厨房左下 / 浴室右上 900 × 900，墙厚 120；另接走道 | 冰箱、洗手柜 | 14.90 | 10 |

厨房局部使用项目内 [Jacobsen 原始 PDF](../tests/fixtures/floorplans/originals/jacobsen-isw-4521/original.pdf)，SHA-256 为 `420bb3c5a38f37a8b41a2206f3d2bdc3c07e6248544cc70bcb641a62d8bf24cb`。底图使用名义 52 ft 总长作近似参照；这不能证明局部厨卫尺寸。所有局部房间、切角、墙厚、设施和门窗数据为工程假设，见 [场景数据](../tests/fixtures/north-american/diagonal-layouts.json)。机器结果保留 `sourceWholePlanAccepted: false`。

| 场景 | 可回导模型 | 2D / 3D / PDF |
|---|---|---|
| 厨房局部 | [JSON](verification/NA-diagonal-cuts/jacobsen-kitchen/project.json) | [2D](verification/NA-diagonal-cuts/jacobsen-kitchen/2d.png) · [3D](verification/NA-diagonal-cuts/jacobsen-kitchen/3d.png) · [PDF](verification/NA-diagonal-cuts/jacobsen-kitchen/print.pdf) |
| 入口 | [JSON](verification/NA-diagonal-cuts/mirrored-entry/project.json) | [2D](verification/NA-diagonal-cuts/mirrored-entry/2d.png) · [3D](verification/NA-diagonal-cuts/mirrored-entry/3d.png) · [PDF](verification/NA-diagonal-cuts/mirrored-entry/print.pdf) |
| 卧室 | [JSON](verification/NA-diagonal-cuts/compact-bedroom/project.json) | [2D](verification/NA-diagonal-cuts/compact-bedroom/2d.png) · [3D](verification/NA-diagonal-cuts/compact-bedroom/3d.png) · [PDF](verification/NA-diagonal-cuts/compact-bedroom/print.pdf) |
| 厨卫与走道 | [JSON](verification/NA-diagonal-cuts/shared-kitchen-bath/project.json) | [2D](verification/NA-diagonal-cuts/shared-kitchen-bath/2d.png) · [3D](verification/NA-diagonal-cuts/shared-kitchen-bath/3d.png) · [PDF](verification/NA-diagonal-cuts/shared-kitchen-bath/print.pdf) |

## DV-006：Plan F 橱柜进入半高墙

旧 [Plan F 模型](verification/NA-complete-houses/plan-f/complete-project.json) 的 `Kitchen south counter` 中心 Y 为 9 ft、深为 2 ft 6 in，底端到 3124.2 mm；厨房净地面底端为 3048 mm。多出的 76.2 mm 位于 1219.2 mm 高的半高墙占地内。旧门扇检查未发现此问题，新的通用地面检查提示越界，见 [修正前截图](verification/NA-diagonal-cuts/plan-f-correction/before-warning.png)。

通过属性界面将橱柜中心 Y 改为 8 ft 9 in，向上移动 3 in；同步更新 `tests/fixtures/north-american/plan-f.json` 的摆位。7 个空间、房间编辑参数、全部结构几何及另外 11 件家具保持原样；水槽仍在台面占地内。撤销重新出现提示，重做恢复正确位置。该模型的地面、门扇和固定障碍物潜在冲突全部为 0。家具间一般互撞和高度避让尚不在此检查范围。

最新验收模型见 [JSON](verification/NA-diagonal-cuts/plan-f-correction/project.json)、[2D](verification/NA-diagonal-cuts/plan-f-correction/2d.png)、[3D](verification/NA-diagonal-cuts/plan-f-correction/3d.png)、[A3 PDF](verification/NA-diagonal-cuts/plan-f-correction/print.pdf) 和 [7 项浏览器检查](verification/NA-diagonal-cuts/plan-f-correction/browser-results.json)。原图及旧验收产物保留；旧模型的家具摆位结论以本次补充记录为准。打印页对所有可编辑户型显示地面 / 边界冲突数，矩形户型同样适用。

## 最终验证

| 验证 | 结果 |
|---|---|
| Node 自动化测试 | 104 / 104；含四角 × 三组斜率 × 两组平移的 24 个独立面积检查，以及旧项目兼容与 Plan F 修正 |
| 3D 几何 / 碰撞 | 四角 × 三个剪墙高度；实际多边形顶点、墙高与碰撞坐标验证，圆形碰撞不按包围盒判断 |
| 新斜切场景 | 43 项原生浏览器检查；WebGL、真实 JSON / PNG / PDF、390 px 表单、异常拒绝与撤销 |
| Plan F 补充验收 | 7 项原生浏览器检查 |
| 原 NA-001～012 | 12 / 12，最终构建前后相同 |
| CMU 8 空间组合 | 10 项；仍标记原公寓完整尺寸未验收 |
| 固定障碍物 | 8 项；B / A / C / F 四个旧项目结构几何回导不变 |
| 参考图标定 | 8 项；缺少距离拒绝、缩放与取消保护 |
| 紧凑家具标签 | 9 组名称 / 旋转，实际 SVG 字形边界通过 |
| PDF 独立核对 | 四套 Letter + Plan F / CMU 两份 A3 + 卧室 Letter；页数、纸张、面积、对象数、冲突图例与 100 mm 标尺 |
| 静态与资源检查 | source ESLint、JS 语法、`git diff --check`、构建资源一致性 |
| 原始资料与历史证据 | 18 份原图 SHA-256 不变；前两轮 73 + 90 个产物摘要不变 |

机器记录见 [浏览器汇总](verification/NA-diagonal-cuts/browser-results.json)、[最终构建运行记录](verification/NA-diagonal-cuts/run-results.json)、[PDF 核对](verification/NA-diagonal-cuts/pdf-results.json) 和 [最终清单](verification/NA-diagonal-cuts/final-results.json)。最初测试脚本选错家具库分组，已根据画面纠正并增加实际家具类型断言；旧 NA-004 对提示文案的断言改为检查结构控件与版本一致性。最终结果仅来自全部通过的当前构建。

## 范围与后续任务

本批支持每房间一个三角形斜切角及原有矩形角缺口，未实现任意多边形、多缺口、斜边洞口、楼梯与多层。门扇 / 家具占地提示不等于通道净宽、可达性、无障碍规范或高度避让验收；3D 碰撞的自动检查也不替代完整人员漫游。未执行 Safari / Edge、真实移动设备与实体打印机复测。

下一步继续 Jacobsen 全屋组合，逐项区分原图标注、近似参照、待实测尺寸与测试假设，并沿用本轮通用功能复测不同房间组合。对缺少尺寸的原图先保留未知，不能将合成模型计作原住宅完整验收。素材库仍为 18 份原图、4 套已有单层手工模型（Plan F 有本次补充）、14 份待完整验收资料。

本批为本地工作区改动，未提交、未推送、未合并、未部署。原 8086 服务继续保留；验证使用独立 8095 服务和浏览器 profile。


## 同日后续

本记录范围已推送至 `ea09df0`。此后新增 Jacobsen 全屋工程测试，并完成 DV-007 的通用 3D 标签避让与两户型复测，见 [全屋复用验收](NA-whole-floor-reuse-verification-2026-10-03.md)。原完整实测验收的范围限制继续保留，本记录产物与摘要不变。
