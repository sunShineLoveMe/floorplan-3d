# 开发与验证说明

[项目首页](../README.md) · [架构说明](architecture.md) · [T02 验收](T02-verification.md)

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
src/data/                   v2格式、v1迁移、矩形参数/几何、默认项目、模板、目录
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
docs/verification/T01.1/   保留历史基线和验收证据
docs/verification/T02/     当前结果、真实下载及机器可读记录
```

## 自动化验证

支持 `node:test` 的 Node.js 即可，无需 `npm install`：

```bash
npm test
# 等价于 node --test tests/*.test.js
```

T02 时点 **31 项 Node 测试通过**：保留原19项行为覆盖，新增矩形几何、16门方向、原子编辑/撤销、v2一致性、v1迁移、存储优先级与失败保护等测试。`architecture.test.js` 用轻量 Three 依赖替身直接运行真实建筑生成器，覆盖1152组门窗/剖切边界并拒绝非正BoxGeometry；这不能替代浏览器 WebGL 验收。

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
node tests/browser-t02.cjs
node tests/browser-t02-storage.cjs
node tests/browser-t02-doors.cjs
```

这些脚本使用**新建、非持久化的浏览器 context**，不读写用户的浏览器配置目录和原站点存储。主回归使用 `docs/verification/T01.1/baseline-project.json` 和 `legacy-project.json` 对照；结果默认输出 `docs/verification/T02/legacy-regression/`，支持 `TEST_OUT` 覆盖；基线读取仍固定为历史目录。T02 新流程输出 `docs/verification/T02/`，新门开合证据输出其 `doors/` 子目录。故障注入只发生在测试 context 中。可选 `tests/browser-comparison.cjs` 接受 `BASELINE_DIR`（完整工作区备份的解压目录），启动临时本地服务做同机前后观察，结束后停止该服务。

已验证 Chromium 149.0.7827.55（macOS arm64，1440×1000，另测 390×844 窄视口）。结果包括真实文件上传/下载、2D/3D 交互、模式恢复、迁移/坏文件保护和主动注入的 CDN/WebGL/存储失败。PNG 已实际解码及目视检查。

尚未验收 Safari、Edge、真实手机/iPad、真实触屏手势及不同 GPU/长时间运行；没有把窄视口模拟当成触屏实机通过。详见[验收矩阵与证据](T02-verification.md)。

## 开发边界与文档维护

当前工作区完成 T03 英制输入与全站尺寸接入，见 [T03 验收](T03-verification.md)。业务操作通过 store，纯数据与状态模块不得引入 DOM 或 Three.js；组件间通过入口注入操作。资源生命周期和后续接入点见[架构说明](architecture.md)。

README 保留概览、启动与导航；功能变化更新 `features.md`；任务状态更新 `roadmap.md`；用户操作更新 `usage.md`；每项任务保留独立设计与验收记录。T01 原验收记录保留其历史时点。

## 代码来源与许可状态

当前项目来自 [sunShineLoveMe/floorplan-3d](https://github.com/sunShineLoveMe/floorplan-3d)，该仓库 fork 自 [wy51ai/floorplan-3d](https://github.com/wy51ai/floorplan-3d)。本地检出版本未发现明确的项目许可证，商业复用授权仍待确认。

## T03 复核

`npm test` 当前 38 项；增加严格语法、数值基准、10,000 组双模式编辑往返、100 次切换、精确吸附和事务测试。无需构建或新增 npm 依赖。

沿用上面的 Playwright/Chromium 环境变量：

```bash
node tests/browser-t03.cjs
node tests/browser-t03-3d.cjs
DISPLAY_UNITS=imperial TEST_OUT=docs/verification/T03/imperial-drag node tests/browser-3d-interactions.cjs
```

T02/旧回归脚本用 `TEST_OUT=docs/verification/T03/<suite>` 保存本轮证据，避免覆盖历史结果。T03 主流程覆盖真实下载和刷新，3D 专项在门动画稳定后比较切换单位前后画布，保留严格像素相等断言。`DISPLAY_UNITS` 仅控制测试设置；英制网格测试先关闭精确墙吸附，再验证 6.35 mm。

项目没有生产测试桥接或新全局状态。实际环境、异常修正、逐项矩阵见 [T03 验收](T03-verification.md)。
