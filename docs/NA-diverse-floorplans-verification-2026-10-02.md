# 多样化户型图：参考标定与 Studio 房间流程验收

日期：2026-10-02；分支：`feat/ui-refactor`；最终构建：`7c985078a299dbb4`。接续素材库的 P0 深测，先处理 CMU Fairfax Studio，再验证无尺寸图纸的输入边界。

**参考导入和标定的两项缺陷已修复并复测。Studio 标注矩形房间的摆放、保存回导和导出流程通过；整套 Fairfax 公寓未完成模型验收。** 后者仍有柱子、多个凸入墙角及未标注的门窗、厨卫细部，不将测试矩形等同于完整原图。

## 问题、调整与复测

| 编号 | 优先级 | 复现与影响 | 调整 | 复测与证据 |
|---|---|---|---|---|
| DV-001 | P0 | 导入图纸，选择两点，不填写距离即可应用。旧字段默认 `10' 0"`，导致未确认尺寸的图纸被赋予比例 | 距离默认空白；必须填写有效正长度。提示无长度参照时先补尺寸，不能用面积或家具图片推算 | 空白、`644 sq ft`、零和负值均拒绝且项目未变化；四份无尺寸 PDF/JPG/PNG 取消后保留原方案和底图。PDF 换页清空旧距离、端点和预览倍率。见 [旧状态](verification/NA-reference-usability/before-results.json)与[新结果](verification/NA-reference-usability/browser-results.json) |
| DV-002 | P1 | CMU 原 PDF 是 450×566 位图；旧对话框缩为约 382 px 宽且无法放大，小字和端点难以操作。实测没有横向溢出 | 增加预览放大、缩小、适应；在独立区域滚动；缩放只改变显示尺寸，标定仍按原像素坐标 | 桌面 4 倍放大、滚动两点标定通过；390 px 宽下缩放、滚动、适应、实际标定和撤销通过。见 [放大标定](verification/NA-reference-usability/studio-zoom-calibration.png)、[窄屏](verification/NA-reference-usability/mobile-preview.png) |
| DV-003 | P1 | Studio 内有多个柱凸入、厨房和入口有不同边界，单个矩形或单角缺口不能直接表示完整净地面；原图没有柱宽深和全部门窗尺寸 | 作为后续完整户型问题登记；本轮保留未知，不猜测细部尺寸 | 待后续验证多处固定障碍物或矩形拆分的表达方式，以及所需尺寸录入和家具冲突提示。当前仅完成标注矩形房间流程验收 |

DV-001 的旧状态在构建 `58cd1dedbb49c3ad` 复现，选择两点后未输入距离仍写入参考图。初步判断的“预览溢出”经实际指标排除，最终 DV-002 定义为缺少放大与滚动操作。

## 图纸依据与模型范围

原图为 [CMU Fairfax 公寓官方资料页](https://www.cmu.edu/housing/our-communities/residences/fairfax.html)公开的 [Studio 示例 PDF](../tests/fixtures/floorplans/originals/cmu-fairfax-studio/original.pdf)，SHA-256：`12dbc086f2368cf36784e754fecce8ca78386d33ac743afff0561804573ba293`。单页内嵌位图，无可提取尺寸文字；应用渲染为 900×1132 像素，放大不会恢复源文件不存在的细节。

可读标注：Studio `11'8" × 19'9"`、Closet `12'9" × 5'`、Kitchen `6'8" × 16'`。本轮按图中横长、纵短的方向，将 Studio 矩形的 X/Y 分别设为 `19'9" / 11'8"`。采用约 `(194,354) → (725,354)` 的内墙端点和 `19'9"` 作近似测试标定。另一纵向可见边约 321 px，按同一比例约为 3.64 m，与标注 3.556 m 相差约 2.3%；端点读取和源图是示意图，不能据此确认实测精度。

测试净面积为 230.42 sq ft。使用 60×80 in Queen 床垫、4×2 ft 衣柜和书桌，占地均在测试矩形内且不互相重叠。将床移入测试门扫掠区时出现冲突，移开后清除。门宽 2'6"、偏移 7'6"、层高 8 ft、墙厚 4 in 为本轮测试假设；源图未给出这些精确值。柱子和其余空间未纳入此测试模型，不能用结果确认整套公寓的家具适配或采购尺寸。

无尺寸流程使用 Hillside A1、Hillside B5 JPG、Imprint A1 和 ZAG B4 PNG。它们先验证缺少长度参照时的反馈与项目保护，不制作假定比例的完整模型。

## 结果与交付物

- 新浏览器脚本 8 项检查：距离拒绝、桌面放大标定、四图无尺寸保护、PDF 换页、窄屏实际标定、房间家具与门扇、保存回导及撤销重做、3D/打印。
- 最终构建 NA-001～012 回归和全部 18 份素材导入试读；78 项单元测试、源代码 ESLint、构建和差异检查，结果见 [总清单](verification/NA-reference-usability/final-results.json)。新增 14 份素材仍不视为完整模型验收通过。
- [可回导 JSON](verification/NA-reference-usability/studio-room-project.json)、[2D PNG](verification/NA-reference-usability/studio-room-2d.png)、[3D PNG](verification/NA-reference-usability/studio-room-3d.png)、[US Letter PDF](verification/NA-reference-usability/studio-room-print.pdf)。PDF 为横向单页，100 mm 矢量比例尺已检查；[PDF 检查](verification/NA-reference-usability/pdf-results.json)不代替实体打印机量测。
- 使用独立的 8095 来源和临时 Chrome profile，未写入用户原浏览器方案。Safari、Edge、实体触屏与建筑净宽规范不在本轮范围。旧构建中间检查和脚本调试记录不替代最终结果，见 [运行说明](verification/NA-reference-usability/run-notes.md)。

下一任务按 DV-003 推进：先确定柱凸入和多处固定障碍物的可编辑表达，再用 CMU 两卧公寓验证小卧室、衣柜及门口占地；继续按优先级逐项修复并复测。本记录和机器清单中的交付状态为验收完成时、提交前的快照；后续远程同步以 Git 为准。未合并或部署。
