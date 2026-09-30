# 开发与验证说明

[项目首页](../README.md) · [架构说明](architecture.md) · [T01.1 验收](T01.1-verification.md)

## 运行与目录

```bash
python3 -m http.server 8086 --bind 127.0.0.1
```

已有本项目服务时直接访问。通过 HTTP 打开，不依赖构建器；不要通过 `file://` 打开 ESM。Three.js r160 保持 jsDelivr import map，首次进入 3D 时按需加载；加载失败不阻断 2D 和文件操作。

```text
index.html                  静态骨架、import map、入口
styles/app.css              原样式及响应式规则
src/main.js                 依赖组装、订阅、视图模式与生命周期
src/core/                   项目 store、临时编辑状态、纯几何函数
src/data/                   项目格式、默认项目、模板、目录
src/services/               存储、项目文件、浏览器下载
src/editor2d/               SVG 渲染、图例、视口、吸附、指针与键盘
src/viewer3d/               场景、建筑、家具、材质、相机及资源管理
src/ui/                     工具栏、面板、家具库、抽屉、文件菜单、语言
project-data.js             兼容路径的 ESM 转导出
sample-template.js          兼容路径的 ESM 转导出
package.json                type: module；无 npm 依赖
tests/*.test.js            Node 数据、事务、读写和生命周期测试
tests/browser-*.cjs        可选的真实 Chromium 回归脚本
tests/fixtures/            独立卧室和未来版本 JSON
docs/verification/T01.1/   基线/结果截图、真实下载及机器可读结果
```

## 自动化验证

支持 `node:test` 的 Node.js 即可，无需 `npm install`：

```bash
npm test
# 等价于 node --test tests/*.test.js
```

当前 **19 项通过**：保留原 8 项数据覆盖，另覆盖事务预览/取消、一次操作一次历史、导入几何撤销/重做、订阅卸载、旧文件取消/备份顺序、存储及恢复备份失败、待加载 3D 偏好、生命周期清理。

语法检查用 `node --check` 对 `src/`、根 ESM 入口和测试脚本逐个执行。`git diff --check` 检查跟踪文件空白错误；未跟踪新文件也需检查。可选 lint：

```bash
npx --yes --package eslint eslint --config tests/eslint.config.js src
```

ESLint 仅为一次性的开发检查，不是应用运行依赖。配置检查未定义标识符和未使用变量。

## 浏览器回归

已有 Playwright 与 Chromium 时，设置它们的安装路径即可，不向项目添加依赖或强制下载浏览器：

```bash
export PLAYWRIGHT_MODULE=/absolute/path/to/node_modules/playwright
export CHROMIUM_EXECUTABLE=/absolute/path/to/chromium
# 可选：export TEST_URL=http://127.0.0.1:8086
node tests/browser-regression.cjs
node tests/browser-3d-interactions.cjs
node tests/browser-failures.cjs
```

这些脚本使用**新建、非持久化的浏览器 context**，不读写用户的浏览器配置目录和原站点存储。主回归使用 `docs/verification/T01.1/baseline-project.json` 和 `legacy-project.json` 对照；结果输出同目录。故障注入只发生在测试 context 中。可选 `tests/browser-comparison.cjs` 接受 `BASELINE_DIR`（完整工作区备份的解压目录），启动临时本地服务做同机前后观察，结束后停止该服务。

已验证 Chromium 149.0.7827.55（macOS arm64，1440×1000，另测 390×844 窄视口）。结果包括真实文件上传/下载、2D/3D 交互、模式恢复、迁移/坏文件保护和主动注入的 CDN/WebGL/存储失败。PNG 已实际解码及目视检查。

尚未验收 Safari、Edge、真实手机/iPad、真实触屏手势及不同 GPU/长时间运行；没有把窄视口模拟当成触屏实机通过。详见[验收矩阵与证据](T01.1-verification.md)。

## 开发边界与文档维护

本轮只完成 T01.1，不包含 T02 房间/门窗编辑或 T03 英制输入。业务操作通过 store，纯数据与状态模块不得引入 DOM 或 Three.js；组件间通过入口注入操作。资源生命周期和后续接入点见[架构说明](architecture.md)。

README 保留概览、启动与导航；功能变化更新 `features.md`；任务状态更新 `roadmap.md`；用户操作更新 `usage.md`；每项任务保留独立设计与验收记录。T01 原验收记录保留其历史时点。

## 代码来源与许可状态

当前项目来自 [sunShineLoveMe/floorplan-3d](https://github.com/sunShineLoveMe/floorplan-3d)，该仓库 fork 自 [wy51ai/floorplan-3d](https://github.com/wy51ai/floorplan-3d)。本地检出版本未发现明确的项目许可证，商业复用授权仍待确认。
