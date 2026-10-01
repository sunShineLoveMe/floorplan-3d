# floorplan-3d｜房间布局与家具尺寸规划

基于 SVG 和 Three.js 的纯前端工具，支持 2D 家具布置、尺寸测量、3D 预览与漫游，以及项目 JSON 的保存和恢复。无需 npm 安装或构建。

首发改造目标是美国英语用户的单房间布局：用真实尺寸判断家具如何摆放，以及还剩多少空间。

## 当前进度

截至 **2026-10-01**，T01 / T01.1 已完成，**T02 / T03 已在当前工作区完成**：可输入矩形房间净尺寸、添加和编辑门窗、摆家具、同步查看 2D/3D，并保存为可继续编辑的 v2 项目；兼容读取 v1 和原无版本旧文件。支持严格英尺/英寸输入、项目单位切换及全站尺寸显示。验证与未测范围见 [T03 验收记录](docs/T03-verification.md)。

UI 开发分支为 `feat/ui-refactor`（由 T03 分支接续），主分支为 `master`；提交、远程同步与合并状态以 Git 为准。未公开部署。界面默认中文、公制；支持独立切换 English 和 Feet & inches；自动冲突检测尚未开发。T03 在开发分支交付；提交和远程同步状态以 Git 为准，未合并到 master 或公开部署。

本轮前端 UI 计划的实现项（UI-000～210）已完成，内部任务走查与回归通过；外部首次用户试用尚未执行。布局、草稿保护、搜索、视图设置与验收边界见 [UI 最终交付](docs/UI-final-delivery.md)。

## 快速启动

在项目目录运行，需要 Python 3：

```bash
python3 -m http.server 8086 --bind 127.0.0.1
```

访问 [http://127.0.0.1:8086/](http://127.0.0.1:8086/)。若本项目服务已启动，直接访问即可。Three.js 通过 CDN 加载，首次加载 3D 需要网络。

克隆方式、端口调整及所需文件见[使用指南](docs/usage.md)。

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [UI 最终交付](docs/UI-final-delivery.md) | UI-060～210 结果、43 组浏览器检查、内部走查与未执行项 |
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
