# 四套北美住宅完整地面布局验收

日期：2026-10-02；分支：`feat/ui-refactor`。本轮接续原 NA-001 / NA-002 的完整户型目标，先完成 Plan B，再验收三个不同设计 A、C、F。前两批历史修复已推送至 `25faa07`；本记录及机器清单中的交付状态为验收完成时、提交前的快照。后续交付范围见 [本批交付记录](NA-delivery-2026-10-02.md)，远程同步状态以 Git 为准。

## 验收范围与结果

**四套图纸的单层地面布局验收完成。** 范围包含全部主要空间、衣柜、洗衣区、实体墙段和半高墙、全部 A1 门窗、通路、外轮廓面积、固定设施占地、Queen 床与家具放置，以及真实 JSON / 2D PNG / 3D PNG / PDF 输出、刷新与回导。通过实际界面逐项建模，没有向产品注入测试接口或直接写 localStorage 创建方案。

该结论针对下列四套 **A1 平面布局的手工模型**，不包括屋顶、结构构造、机电、场地及审批图纸，也不表示任意户型自动识别或施工模型验收。固定设施采用示意外包矩形；床为 60×80 in 床垫占地测试，不包括厂商床架。

| 设计 | 建模空间分区 | 平开门扇 / 推拉门 / 折叠门 | 窗 | 含测试家具的对象数 | 外轮廓面积 sq ft | 分区净面积合计 sq ft |
|---|---:|---|---:|---:|---:|---:|
| B：两卧一卫、L 形外轮廓 | 11 | 5 / 2 / 1 | 12 | 15 | 1200.00 | 1079.94 |
| A：三卧一卫 | 15 | 5 / 3 / 1 | 8 | 16 | 1200.00 | 1078.92 |
| C：两卧两卫 | 14 | 5 / 2 / 1 | 8 | 17 | 1198.75 | 1084.99 |
| F：一卧一卫 | 7 | 2 / 1 / 1 | 6 | 12 | 600.25 | 532.36 |

“空间分区”包括衣柜、洗衣区和走道，不等于卧室数量。分区净面积是所建地面多边形之和；连续补地还覆盖门槛与开放交界处的墙带，未再分配给某个房间。外轮廓含墙体，两种面积不能直接相等。C 的 34'3"×35'、F 的 28'7"×21' 分别算得 1198.75 与 600.25；标题 1200 / 600 是取整值。

## 来源与描绘依据

来源为 [San Diego County 官方住宅设计图页](https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html)。每套使用原 PDF 第 5 页 A1，源文件摘要、页码、旋转和原地址保留在各目录 `source.json`。

| 设计 | 原 PDF | 保存的 A1 |
|---|---|---|
| B | [PDS 673](https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds673_11x17.pdf) | [A1](verification/NA-complete-houses/plan-b/source-a1.pdf) |
| A | [PDS 670](https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds670_11x17.pdf) | [A1](verification/NA-complete-houses/plan-a/source-a1.pdf) |
| C | [PDS 675](https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds675_11x17.pdf) | [A1](verification/NA-complete-houses/plan-c/source-a1.pdf) |
| F | [PDS 671](https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds671_11x17.pdf) | [A1](verification/NA-complete-houses/plan-f/source-a1.pdf) |

外轮廓和墙线按标注尺寸与 PDF 矢量位置核对；模型使用图上 6 in / 4 in 墙带，部分厨卫界面为 6 in。这与上一批 6.5 in / 4.5 in 成品墙厚假设不同，不能代替实测。绘图线的坐标有舍入；少数靠近分区端点的门窗为满足 1 mm 几何间隔作毫米或英寸级调整，门窗名义宽高保留。

开放客餐厅与卧室入口的文字宽深并不是可相加的封闭矩形。模型按实际墙线建立地面，多边形绕开衣柜与洗衣区；开放空间的分区归属用于计量和编辑。F 将入口门归入 Living，因此开放客餐厅的分区宽度与原图文字矩形不逐项相等，外墙、半高墙及门窗位置按整层核对。窗头 6'8" 为本轮可编辑建模值；A1 的窗宽高与门表高度已逐项采用，未用 A1 单页确认立面窗头。

## 本轮修复和复测

| 问题 | 调整 | 已完成复测 |
|---|---|---|
| 衣柜推拉门和洗衣区折叠门缺失 | 数值门表单增加 Swing / Sliding / Bi-fold / Open passage；区分铰链字段，折叠门保留内外方向 | 四侧洞口、共享墙切除、贴合端点、模式切换、2D 可选符号、3D 门板、保存回读 |
| 矩形卧室 / 厨房无法绕开衣柜与洗衣区 | 增加一个可编辑角部缺口，生成 L 形净地面；衣柜和洗衣区仍为独立空间 | 四个角、面积扣除、重叠和墙体侵入拒绝、无效输入不修改方案、撤销重做 |
| 同一边界局部开放仍按整面墙厚要求留缝 | 相邻间距按实际重叠的墙段判断 | 空段贴合通过，占用段不足间距拒绝；Plan B Hall / Living 连通 |
| 开放交界的墙带和门槛出现地面缺口 | 新 House 使用连续外包地面，并铺在净地面和墙体下方 | 外轮廓面积独立核算、地面矩形不重复、2D 补地及 3D 连续地面 |
| A1 中对向门扇被当成重复洞口拒绝 | 可显式关联同洞口、相向的另一扇平开门 | 普通重复仍拒绝；错误配对不写入；删除配对对象清理引用，撤销恢复 |
| 整层尺寸和面积难以核对 | 全屋显示外围尺寸及整体外包宽深，属性与打印区分净分区面积和含墙外轮廓 | 全屋尺寸完整进入 PNG/PDF；内部尺寸由房间编辑和属性核对 |
| 全屋打印比例尺挤到第二页 | 图面高度为标题、图例与比例尺增加页内预留 | 四套 A3 单页 PDF 栅格复查及 100 mm 矢量长度核对 |
| 门类型字段隐藏失效 | 修正表单 `hidden` 与 flex 样式冲突 | 推拉门隐藏铰链及开启方向；折叠门保留方向；390 px 表单无横向溢出 |

每套均核对所有空间可从首个空间到达，窗口仍阻挡步行；独立 3 in 网格验证的是地面连通，不代表人体净宽或无障碍规范。全部家具与平开门扫掠无冲突，折叠门两侧开启门板占地另作静态复核；产品的自动提示仍只覆盖平开门扫掠，折叠门当前为静态显示。

## 最终验证版本

- 单元测试 78 / 78，通过源代码 ESLint、87 个项目 JavaScript 文件语法检查和 `git diff --check`。
- 四套从原图建模的浏览器验证共 36 项，构建为 `3db3caeb96d1c51c`；最后只修复打印页内预留和页脚间距，生成构建 `58cd1dedbb49c3ad`。
- 在最终构建重新回导四套真实下载的 JSON，独立核对空间、面积、门窗、地面连通与开门占地；完成 6 项复查，重新查看原图叠加及完整 3D。
- 最终构建的 NA-001 至 NA-012 浏览器回归全部通过，无页面异常；四份 PDF 全部重新导出，均为 A3 横向单页，100 mm 比例尺的矢量长度为 283.5 pt，逐页渲染检查无裁切或分页。
- 原有 8086 服务保留且运行最终构建；本轮独立的 8095 验证服务已关闭。

## 可复查交付物

| 设计 | 可回导项目 | 2D | 3D 剖切复查 | 打印 PDF | 原图叠加 |
|---|---|---|---|---|---|
| B | [JSON](verification/NA-complete-houses/plan-b/complete-project.json) | [PNG](verification/NA-complete-houses/plan-b/complete-2d.png) | [图](verification/NA-complete-houses/plan-b/review-cutaway.png) | [PDF](verification/NA-complete-houses/plan-b/complete-print.pdf) | [图](verification/NA-complete-houses/plan-b/source-overlay.png) |
| A | [JSON](verification/NA-complete-houses/plan-a/complete-project.json) | [PNG](verification/NA-complete-houses/plan-a/complete-2d.png) | [图](verification/NA-complete-houses/plan-a/review-cutaway.png) | [PDF](verification/NA-complete-houses/plan-a/complete-print.pdf) | [图](verification/NA-complete-houses/plan-a/source-overlay.png) |
| C | [JSON](verification/NA-complete-houses/plan-c/complete-project.json) | [PNG](verification/NA-complete-houses/plan-c/complete-2d.png) | [图](verification/NA-complete-houses/plan-c/review-cutaway.png) | [PDF](verification/NA-complete-houses/plan-c/complete-print.pdf) | [图](verification/NA-complete-houses/plan-c/source-overlay.png) |
| F | [JSON](verification/NA-complete-houses/plan-f/complete-project.json) | [PNG](verification/NA-complete-houses/plan-f/complete-2d.png) | [图](verification/NA-complete-houses/plan-f/review-cutaway.png) | [PDF](verification/NA-complete-houses/plan-f/complete-print.pdf) | [图](verification/NA-complete-houses/plan-f/source-overlay.png) |

完整 3D PNG、屏幕截图、窄屏门类型表单、PDF 页渲染及逐项 `browser-results.json` 位于相应目录。PNG 来源于真实下载；PDF 来自应用真实打印预览，另逐页栅格检查，尚未用实体打印机量测比例尺。

最终测试、构建、回归、源文件和交付物摘要见 [总验收清单](verification/NA-complete-houses/final-results.json)。旧批记录与早期失败文件保留；结论以最终构建和 `passed: true` 清单为准。

## 当前产品边界

本轮把原图需要的单层房屋地面布局完成，包含矩形组合、一个角部缺口和局部墙段。仍不支持自由多边形、多缺口房间、多楼层、自动识图、一般家具互撞和通道净宽自动审查。Safari、Edge 与真实触屏设备不在本轮本机 Chrome 验收范围。
