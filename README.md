# floorplan-3d｜房间布局与家具尺寸规划

基于 SVG 和 Three.js 的纯前端工具，支持 2D 家具布置、尺寸测量、3D 预览与漫游，以及项目 JSON 的保存和恢复。无需 npm 安装或构建。

首发改造目标是美国英语用户的单房间布局：用真实尺寸判断家具如何摆放，以及还剩多少空间。

## 当前进度

截至 **2026-09-30**，本地分支 `feat/project-data-t01` 已完成 T01 项目数据改造和 T01.1 原生 ES Modules / UI 拆分，通过 19 项 Node 测试及 Chromium 真实交互、文件与故障回归。本批成果通过 `feat/project-data-t01` 功能分支交付，未合并到主分支或公开部署。

当前界面仍默认中文、公制和示例户型。可导入完整户型 JSON；创建房间入口、英制输入和自动冲突检测尚未实现。下一项为 **T02：矩形房间与门窗编辑**；本轮未开发 T02/T03。

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
| [功能清单](docs/features.md) | 已实现的 2D、3D、项目数据与导出能力及使用边界 |
| [待办与任务优先级](docs/roadmap.md) | T00–T21 状态、P0/P1/P2 待办和建议实施顺序 |
| [使用与备份指南](docs/usage.md) | 启动、户型导入、本地保存、旧文件迁移和快捷键 |
| [开发与验证说明](docs/development.md) | 项目结构、测试命令、已验证范围和文档维护约定 |
| [架构说明](docs/architecture.md) | 模块职责、状态/事务、生命周期及后续接入点 |
| [T01.1 验收记录](docs/T01.1-verification.md) | 工作区基线、测试、浏览器证据、必要修复和未测项 |
| [T01.1 模块化任务书](docs/T01.1-modularization-plan.md) | 新窗口交接、拆分边界、实施步骤和验收要求 |
| [T01 数据设计与验收记录](docs/T01-project-data.md) | 项目格式、兼容策略、任务清单及详细验证证据 |

## 代码来源

来自 [sunShineLoveMe/floorplan-3d](https://github.com/sunShineLoveMe/floorplan-3d)，上游为 [wy51ai/floorplan-3d](https://github.com/wy51ai/floorplan-3d)。商业复用许可仍待确认，详见[开发说明](docs/development.md)。
