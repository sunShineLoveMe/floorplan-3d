# floorplan-3d｜房间布局与家具尺寸规划

基于 SVG 和 Three.js 的纯前端工具，支持 2D 家具布置、尺寸测量、3D 预览与漫游，以及项目 JSON 的保存和恢复。无需 npm 安装；发布前运行 `npm run build` 更新资源版本。

首发改造目标是美国英语用户的单房间布局：用真实尺寸判断家具如何摆放，以及还剩多少空间。

## 当前进度

截至 **2026-10-03**，T01 / T01.1 已完成，**T02 / T03 已在当前工作区完成**：可输入矩形房间净尺寸、添加和编辑门窗、摆家具、同步查看 2D/3D，并保存为可继续编辑的 v2 项目；兼容读取 v1 和原无版本旧文件。支持严格英尺/英寸输入、项目单位切换及全站尺寸显示。验证与未测范围见 [T03 验收记录](docs/T03-verification.md)。

当前分支为 `feat/ui-refactor`，NA-001～012 及后续 P0 两批修复已完成，提交与远程同步状态以 Git 为准。新用户默认 English / Feet & inches；支持 PDF/图片参考底图标定、单层矩形多房间与共享墙门窗、门扇冲突提示、项目化导出及打印。已将前两批修复推送至 `25faa07`；本批新增局部墙段与半高墙，见 [墙段验收](docs/NA-wall-segments-verification-2026-10-02.md)。支持每侧墙厚与开放边界，公开住宅设计图的简化手工建模见 [P0 真实图纸验收](docs/NA-real-house-verification-2026-10-02.md)；前轮逐项结果见 [北美问题修复验收](docs/NA-fixes-verification-2026-10-02.md)。未合并、未部署。

新增独立矩形固定障碍物编辑、净面积扣除和家具 / 平开门冲突复核，见 [固定障碍物验收](docs/NA-fixed-obstacles-verification-2026-10-02.md)。后续已验证 CMU 两卧的 8 空间组合流程并修复紧凑家具标签越界，见 [整户组合与标签复测](docs/NA-apartment-composition-verification-2026-10-02.md)。补充细部为测试假设，原公寓完整尺寸仍未验收；斜切角已完成四个方向、不同斜率及跨户型复用，通用地面检查补充修正 Plan F 橱柜越界，见 [斜切角与 Plan F 复测](docs/NA-diagonal-cuts-verification-2026-10-03.md)。以上已验收内容已推送至 `ea09df0`。后续 Jacobsen 12 空间 / 20 家具的全屋测试已复用同一流程，DV-007 的 3D 标签避让完成两户型复测，见 [全屋复用验收](docs/NA-whole-floor-reuse-verification-2026-10-03.md)；后续全屋复用与 T06 两批已推送至 `999181e`，原图未知尺寸继续保留。

本轮前端 UI 计划的实现项（UI-000～210）已完成，内部任务走查与回归通过；外部首次用户试用尚未执行。布局、草稿保护、搜索、视图设置与验收边界见 [UI 最终交付](docs/UI-final-delivery.md)。

T06 两批已完成占地间距、显式嵌套、目标净宽路径、可调整家具使用区与持续行走 / 摇杆碰撞复核，见 [最新验收](docs/T06-use-zones-verification-2026-10-03.md)。使用区采用显式平面规划假设；代码与验收证据已推送至 `999181e`，未合并、未部署。T07 保存、备份与恢复本批已完成实现，含保存失败重试、替换前备份 / 取消、原文恢复及同源多窗口冲突保护，见 [T07 验收](docs/T07-save-recovery-verification-2026-10-03.md)。本批代码与验收证据已推送至 `5bbc32c`，未合并、未部署。T04 第一批已完成可选高度与 2D / 3D 真实网格外廓一致性，见 [T04 验收](docs/T04-furniture-dimensions-verification-2026-10-03.md)；已本地提交 `833a2ba`，后续同步状态以 Git 为准。后续自定义类型、真实门运动与高度避让见 [路线图](docs/roadmap.md)。

T08 已补齐可关闭 / 重开的 Help、首次入口提示、New project 命名和键盘重新选择；工程名称按原文显示。内部验收及未测范围见 [T08 验收](docs/T08-english-onboarding-verification-2026-10-03.md)，[T03 / T08 试用协议](docs/T08-user-trial-protocol.md)已准备，外部试用未执行。T04 / T05 / T08 已本地提交 `833a2ba`；2026-10-04 用户授权远程同步，实际状态以 Git 为准，未合并或部署。

T09 第一批已补齐 3D 故障提示 / 重试、完整边界高清 PNG 和 3D 房间标签，见 [T09 验收](docs/T09-output-stability-verification-2026-10-03.md)。该批实现与证据随当前分支归档，提交及远程同步状态以 Git 为准；Edge 与实机移动端仍待验收。

2026-10-07 后端 BE-01 开发基础已实现：`server/` 使用 Hono / Better Auth / D1 / 私有 R2，Google OAuth client 和开发 Worker 已配置；回调及未登录拒绝通过，后端 26/26。真实 Google A/B 登录、远程保存及 CPU 验收尚未完成，BE-02 未开始。配置与证据见 [开发环境配置](docs/backend-cloudflare-configuration-2026-10-07.md) / [OAuth 接续报告](docs/verification/backend-cloudflare/BE-01/2026-10-07-oauth-01/report.md)。

## 快速启动

在项目目录运行，需要 Python 3：

```bash
npm run build
npm start
```

访问 [http://127.0.0.1:8086/](http://127.0.0.1:8086/)。若本项目服务已启动，直接访问即可。Three.js r160 已随应用本地提供，3D 不依赖外部 CDN。

克隆方式、端口调整及所需文件见[使用指南](docs/usage.md)。

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [Cloudflare 后端开发环境配置](docs/backend-cloudflare-configuration-2026-10-07.md) | Worker / D1 / 私有 R2 / Google OAuth / Secrets；配置、验收证据和剩余出口 |
| [Cloudflare 后端任务清单](docs/backend-task-checklist-cloudflare-2026-10-07.md) | BE-01～04 实施顺序与验收门槛；BE-01 真实环境出口待完成 |
| [T09 输出与稳定性验收](docs/T09-output-stability-verification-2026-10-03.md) | 高清完整图片、故障恢复、Chrome / WebKit 与 Safari 本机下载；未测边界 |
| [T08 验收](docs/T08-english-onboarding-verification-2026-10-03.md) / [试用协议](docs/T08-user-trial-protocol.md) | 可重开帮助、英文术语、名称与键盘修复、内部走查；外部试用未执行 |
| [T05 编辑可靠性验收](docs/T05-editing-reliability-verification-2026-10-03.md) | 7 项交互问题修复、精确中心、墙吸附、焦点、手势取消和结构历史；本地交付 |
| [T05 原始任务书](docs/T05-editing-reliability-handoff-2026-10-03.md) | 接续约束、检查矩阵与实施前记录 |
| [T04 第一批交接](docs/T04-furniture-dimensions-handoff-2026-10-03.md) | 家具可选高度、实际外廓、2D / 3D 尺寸一致性与跨户型验收 |
| [T07 验收](docs/T07-save-recovery-verification-2026-10-03.md) | 保存、真实下载、失败恢复、替换保护及双窗口验收 |
| [T07 原始交接](docs/T07-save-recovery-handoff-2026-10-03.md) | 实施前基线、目标与完成导航 |
| [UI 最终交付](docs/UI-final-delivery.md) | UI-060～210 结果、43 组浏览器检查、内部走查与未执行项 |
| [P0 墙段与半高墙验收](docs/NA-wall-segments-verification-2026-10-02.md) | 局部通道、共享墙合并、半高墙、逐项复测与后续任务 |
| [户型原始图纸测试素材库](tests/fixtures/floorplans/README.md) | 18 份原始 PDF/JPG/PNG、可搜索预览、实际场景来源及后续深入测试顺序 |
| [多样化图纸标定与 Studio 房间验收](docs/NA-diverse-floorplans-verification-2026-10-02.md) | 必填长度、预览缩放、无尺寸保护、房间摆放和真实导出；完整公寓仍待验收 |
| [整户组合与紧凑标签复测](docs/NA-apartment-composition-verification-2026-10-02.md) | CMU 8 空间组合、DV-004 修复、回导与打印；测试假设及后续斜切角复测 |
| [全屋组合复用与 3D 标签复测](docs/NA-whole-floor-reuse-verification-2026-10-03.md) | Jacobsen 12 空间 / CMU 8 空间共用流程、DV-007、107 项测试与完整实测范围限制 |
| [T06 第二批验收](docs/T06-use-zones-verification-2026-10-03.md) | 显式家具使用区、原生持续键盘 / 摇杆碰撞、独立几何 / PDF、跨户型与未测范围 |
| [T06 第一批验收](docs/T06-clearance-verification-2026-10-03.md) | 占地间距、规划路径、漫游起点、跨户型证据与下一批使用区 |
| [T06 新窗口交接](docs/T06-clearance-handoff-2026-10-03.md) | 原始接续基线、实施顺序、跨户型复测矩阵与最新验收导航 |
| [斜切角跨户型复用与 Plan F 补充验收](docs/NA-diagonal-cuts-verification-2026-10-03.md) | 四角 / 不同斜率、共享边界、通用越界提示、DV-005 / DV-006 和实际导出 |
| [四套完整户型验收](docs/NA-complete-houses-verification-2026-10-02.md) | B 完整验收及 A/C/F 三图复测、可回导模型和真实导出 |
| [P0 真实图纸验收](docs/NA-real-house-verification-2026-10-02.md) | 公开住宅 PDF、开放空间与墙厚修复、简化模型和剩余能力缺口 |
| [北美问题修复验收](docs/NA-fixes-verification-2026-10-02.md) | 12 项修复、逐项复测、实际 JSON/PNG/PDF 与未测范围 |
| [北美用户全流程审查与问题清单](docs/NA-user-flow-audit-2026-10-01.md) | 12 项问题的 P0/P1/P2 优先级、复现步骤、影响、验收条件与实操截图 |
| [UI 重构方案 v1.1](docs/frontend-ui-refactor-plan-v1.0.md) | 编辑器视觉、布局、交互样稿与分批实施任务 |
| [UI-000 功能与页面基线](docs/UI-000-baseline.md) | 当前入口映射、可导入回归场景、基线截图及已知问题 |
| [UI-005 关键交互样稿](docs/UI-005-interaction-draft.md) | 五种选中状态、1440/1280 布局、可交互预览与窄屏抽屉规则 |
| [UI-050 上下文属性](docs/UI-050-properties.md) | 按对象展示属性、折叠统计与编辑回归 |
| [UI-040 左侧资源面板](docs/UI-040-resources.md) | 公共房间列表、家具卡片与交互验证 |
| [UI-030 项目栏与菜单](docs/UI-030-project-bar.md) | 项目操作、设置、视图菜单和回归证据 |
| [UI-020 编辑器布局](docs/UI-020-workspace-layout.md) | 固定顶栏、独立面板、稳定画布与抽屉验证 |
| [UI-010 设计 Token 与控件](docs/UI-010-design-system.md) | 已接入生产样式的视觉规范、状态样例、回归证据与阶段限制 |
| [功能清单](docs/features.md) | 已实现的 2D、3D、项目数据与导出能力及使用边界 |
| [待办与任务优先级](docs/roadmap.md) | T00–T21 状态、P0/P1/P2 待办和建议实施顺序 |
| [使用与备份指南](docs/usage.md) | 启动、户型导入、本地保存、旧文件迁移和快捷键 |
| [开发与验证说明](docs/development.md) | 项目结构、测试命令、已验证范围和文档维护约定 |
| [架构说明](docs/architecture.md) | 模块职责、状态/事务、生命周期及后续接入点 |
| [T03 英制输入与尺寸一致性任务书](docs/T03-units-and-measurements-plan.md) | 官方资料调研、输入与精度规则、全站接入范围、验收矩阵及新窗口指令 |
| [T03 验收记录](docs/T03-verification.md) | 数值、事务、浏览器回归与实际下载证据、未测项 |
| [T02 验收记录](docs/T02-verification.md) | 本地交付状态、自动化/浏览器证据、未测范围 |
| [T02 v2 数据约定](docs/T02-project-data.md) | 矩形参数、父墙、几何生成、校验及兼容保存 |
| [T02 矩形房间与门窗任务书](docs/T02-room-and-openings-plan.md) | 真实房间 MVP、数据兼容、实施批次、验收标准与新聊天开发指令 |
| [T01.1 验收记录](docs/T01.1-verification.md) | 工作区基线、测试、浏览器证据、必要修复和未测项 |
| [T01.1 模块化任务书](docs/T01.1-modularization-plan.md) | 新窗口交接、拆分边界、实施步骤和验收要求 |
| [T01 数据设计与验收记录](docs/T01-project-data.md) | 项目格式、兼容策略、任务清单及详细验证证据 |

## 代码来源

来自 [sunShineLoveMe/floorplan-3d](https://github.com/sunShineLoveMe/floorplan-3d)，上游为 [wy51ai/floorplan-3d](https://github.com/wy51ai/floorplan-3d)。商业复用许可仍待确认，详见[开发说明](docs/development.md)。
