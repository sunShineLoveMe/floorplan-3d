# 北美流程问题修复与逐项复测

交付日期：2026-10-02。来源：[2026-10-01 实操审查](NA-user-flow-audit-2026-10-01.md)。基线 `feat/ui-refactor` / `6ddee8d`；验收时为接续当前工作区的本地修改，尚未提交、推送、合并或部署。原 README 修改、审查文档和证据均保留。

**12 项均已实现本轮对应修复并逐项复测。P0 交付为 PDF/图片标定参考 + 单层矩形多房间手工建模，不代表自动识图、多楼层或任意建筑轮廓已经实现。**

后续 P0 真实图纸批次见 [公开住宅图纸验收](NA-real-house-verification-2026-10-02.md)：补每侧墙厚与开放边界。下文保留首轮实现与验收边界。

## 执行顺序与结果

顺序遵循原文档修复建议：NA-001 → 002 → 004 → 003 → 005 → 006 → 007 → 008 → 009 → 010 → 012 → 011。每项修复后运行对应浏览器场景；末尾重新跑整套场景和联动检查。

| 编号 | 优先级 | 实现与复测结论 | 主要证据 |
|---|---|---|---|
| NA-001 | P0 | JSON 改为 Open project (.json)，与 PDF/PNG/JPG 图纸入口分离。PDF 可选页码；两点实测标定后内嵌栅格底图。PDF 显示、标定、刷新保留及 DWG 转换提示通过；PNG 路径在联动复测通过。 | [截图](verification/NA-fixes/NA-001.png)、[逐项结果](verification/NA-fixes/NA-001.json)、[含底图项目](verification/NA-fixes/NA-002-project.json) |
| NA-002 | P0 | 当前项目可连续追加 Living / Bedroom / Bathroom；坐标、面积、共享墙与门窗归属保留。保存/回导、刷新、撤销/重做通过；共享墙去重、另一侧不封门、非法重叠拒绝有数据测试。联动另测编辑、删除房间及撤销。 | [截图](verification/NA-fixes/NA-002.png)、[项目](verification/NA-fixes/NA-002-project.json)、[数据测试](../tests/house-editor.test.js)、[联动项目](verification/NA-fixes/integration-house.json) |
| NA-004 | P1 | 内容摘要生成统一 import map / 入口 / CSS 版本；包含懒加载模块。旧测试会话普通刷新后分类、属性和结构面板一致，加载资源同版本，几何未改变。新的服务入口要求重新验证缓存。 | [资源记录](verification/NA-fixes/NA-004-resources.json)、[截图](verification/NA-fixes/NA-004.png)、[版本脚本](../scripts/version-assets.mjs) |
| NA-003 | P1 | 无偏好入口默认 English + Feet & inches，单位/语言直接显示。新上下文、公制旧项目导入、显式中文刷新保留通过。390px 实际边界复核后修正控件裁切。 | [窄屏截图](verification/NA-fixes/NA-003-mobile.png)、[结果](verification/NA-fixes/NA-003.json) |
| NA-005 | P1 | 补 Twin / Twin XL / Full / Queen / King / California King 床垫占地与别名；避免分类名导致 bed 匹配整个 Bedroom。Queen 60×80 in 添加和 64 in 实际宽度编辑通过。卡片与属性说明不含床架。 | [截图](verification/NA-fixes/NA-005.png)、[结果](verification/NA-fixes/NA-005.json) |
| NA-006 | P1 | 四分之一圆扫掠与旋转矩形占地相交提示，画布上层红区、状态与属性定位。文档 40×30 ft / Bottom 门 / 90×36 in 沙发场景、移开、旋转、刷新复算通过。 | [挡门截图](verification/NA-fixes/NA-006-blocked.png)、[结果](verification/NA-fixes/NA-006.json)、[方向/圆弧测试](../tests/door-clearance.test.js) |
| NA-007 | P2 | 房间名/面积根据可用位置自动避让；单房间标签可隐藏并持久化。中心 Queen 名称不重叠；实际下载 PNG 与屏幕一致。联动确认修改房间尺寸/名称不会丢失隐藏偏好。 | [实际 PNG](verification/NA-fixes/NA-007-export.png)、[截图](verification/NA-fixes/NA-007.png)、[结果](verification/NA-fixes/NA-007.json) |
| NA-008 | P2 | 按边界、层高和有效画布宽高比求相机距离，3D 增加 Fit home；往返视图保留后续相机姿态。40×30 ft 首次进入、Iso、Fit home 完整入镜。多房间 3D 联动通过。 | [首次 3D](verification/NA-fixes/NA-008-initial-3d.png)、[Iso](verification/NA-fixes/NA-008-iso.png)、[窄宽比计算测试](../tests/framing.test.js)、[多房间 3D](verification/NA-fixes/integration-house-3D.png) |
| NA-009 | P2 | 新英制例值采用 12×10×8 ft，门窗采用易读英寸值；字段明确支持 ft/in。表单近似显示与真实毫米分离，修改名称后 4000.123456789 mm 仍完全保留。 | [截图](verification/NA-fixes/NA-009.png)、[结果](verification/NA-fixes/NA-009.json) |
| NA-010 | P2 | 洞口选中后仍显示添加门窗，提供 Back to this wall；保留当前墙，新洞口初值避开同墙已有洞口。Bottom 门 → Bottom 窗 → 重开面板顺序通过。 | [截图](verification/NA-fixes/NA-010.png)、[结果](verification/NA-fixes/NA-010.json) |
| NA-012 | P2 | 项目名/方案名可编辑，JSON/PNG 包含项目、方案、日期时间与 2D/3D 类型。增加 Letter/A4/A3、方向、Fit 或 1:50/60/100 打印页；超纸张拒绝。实际 JSON、2D PNG、3D PNG 与一页 Letter 1:100 PDF 通过。 | [文件名记录](verification/NA-fixes/NA-012-downloads.json)、[2D PNG](verification/NA-fixes/NA-012-2D.png)、[3D PNG](verification/NA-fixes/NA-012-3D.png)、[PDF](verification/NA-fixes/NA-012-print-100.pdf)、[物理尺寸检查](verification/NA-fixes/NA-012-pdf-check.json) |
| NA-011 | P2 | 英语或英制下隐藏无当地价格依据的 CNY/m² 估价；仅中文+公制保留明确标注的示例估算。四种语言/单位组合通过。 | [截图](verification/NA-fixes/NA-011.png)、[结果](verification/NA-fixes/NA-011.json) |

NA-004：复测中实际遇到旧模块缓存使结构面板停留在旧实现，普通资源重新验证后得到新实现。新策略针对整套资源一致性；原审查 8086 会话的历史根因没有完整抓包，不能断言所有混用均由同一缓存层引起。换端口仅用于隔离测试存储，不作为修复方案。

## 总体验证

- `npm test`：**44/44 通过**，包含原 38 项、共享墙与门窗、门扇旋转占地、相机投影、打印物理尺寸/文件名、底图标定与数据校验。[日志](verification/NA-fixes/final-unit-tests.log)
- 12 个浏览器场景按顺序全量重跑通过。[日志](verification/NA-fixes/final-browser.log) 场景由 Playwright 驱动真实本机 Chrome DOM 交互、文件上传和下载；不是外部首次用户实操审查。
- 独立联动检查：多房间+底图恢复、标签隐藏后修改房间、所属窗新增、非法洞口不改数据、3D、PNG 底图、删除房间同步移除门窗及撤销、坏 JSON 保留项目、390px、原 8086 同版本资源。[日志](verification/NA-fixes/integration-browser.log)、[窄屏](verification/NA-fixes/integration-mobile.png)
- 语法和 ESLint（0 error / 0 warning）通过；Lint 配置补充浏览器原生 `Event` / `getComputedStyle` 全局声明。[语法](verification/NA-fixes/final-syntax.log)、[Lint](verification/NA-fixes/final-lint.log)
- `git diff --check` 通过；资源版本脚本重复执行摘要稳定。原 8086 服务继续保留；8094 为独立测试来源，测试完成关闭。测试 profile 与用户 Chrome/站点存储独立。
- PDF 核对：1 页 Letter 横向，792×612 pt。PDF 矢量里 40 ft 在 1:100 下为 121.917 mm（预期 121.920 mm），校验尺约 100.012 mm；误差来自浏览器打印绘制取整。PDF 目视没有裁切。[检查脚本](../scripts/check-print-pdf.mjs)

复测命令见 [开发说明](development.md#na-001012-修复验证)。使用流程见 [使用指南](usage.md)。无需安装项目运行依赖；PDF.js ESM/worker 与 Apache-2.0 许可随 `vendor/pdfjs/` 保留。床垫示例依据 [Sealy 美国尺寸指南](https://www.sealy.com/sealy-living/the-ultimate-mattress-size-guide/) 的名义尺寸；[实际产品尺寸](https://help.sealy.com/hc/en-us/articles/4419596498455-What-are-the-mattress-dimensions)可有差异，不能作为床架或商品外廓认证。

## 数据与实现边界

- 仍导出 v2。旧 v1/v2 单矩形/无版本示例继续读取；新增 `roomEditor.kind=house`、`referencePlan`、房间 `labelHidden` 需要本轮应用版本。早期 v2 接收器不能完整编辑本轮扩展数据。
- House 数据保存矩形房间 `id/x/y/width/depth`，本层 `height` 和固定 `wallThickness=120`；洞口保存 `roomId`、`roomId--side` 父墙。几何必须与生成结果一致，墙的实体并集去重，洞口对共享墙两侧统一切除。房间名/地面/标签偏好仍在 `rooms`。新增房间保留原项目 ID、家具、测量和底图。
- 底图保留所选页的栅格图，不内嵌 PDF 原文件。两点定义比例，第一点对齐项目原点，图纸轴向保持不旋转；倾斜扫描、任意轮廓、自动描墙、DWG/DXF 原生解析和多楼层均未实现。
- House 支持最多 50 房间/200 洞口；净空间共享墙需手工保留 120 mm。房间高度为本层统一高度，未支持独立局部吊顶。快照示例不自动改为可编辑房间。
- 文件上限 20 MB，栅格最长边 2400 px，内嵌图最大约 4 MB；浏览器存储配额可能低于项目大小，保存失败时导出 JSON。没有账户、云同步和多个布局数据集；方案名不等于 A/B 切换。
- 门扇检查是平面占地与扫掠相交的**潜在冲突提示**；不覆盖离地高度、柔性物体、一般家具互撞、通道净宽或建筑规范。地毯跳过。
- 标签避让是布局启发式；极拥挤场景可以隐藏指定房间标签，未覆盖所有复杂多边形/超长文字排版。
- 3D PNG 保持 WebGL Canvas 截图，不含 CSS2D 房间名；2D PNG/打印保留对应可见图层。指定纸张比例需要用户在打印驱动中使用 100% / Actual size，真实打印机、实纸尺量尚未执行。
- Chrome 桌面与 390px 窄视口已验证；Safari/Firefox/Edge、真实移动触屏、不同 GPU、超大真实图纸、长时间使用与外部用户形成性测试未验证。
