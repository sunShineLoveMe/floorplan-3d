# 开发与验证说明

[项目首页](../README.md) · [架构说明](architecture.md) · [T02 验收](T02-verification.md)

## 运行与目录

```bash
npm run build
npm start
```

已有本项目服务时直接访问。通过 HTTP 打开；`npm run build` 是无依赖资源版本生成，不引入打包器。改动模块、HTML 或 CSS 后运行该命令，避免同来源缓存混用。`npm start` 使用 HTTP/1.1 长连接与 128 连接监听队列，对资源设 `no-cache, must-revalidate`；生产静态托管也应对 HTML 设重新验证。不要通过 `file://` 打开 ESM。Three.js r160 保持 jsDelivr import map，首次进入 3D 时按需加载；加载失败不阻断 2D 和文件操作。

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

## NA-001～012 修复验证

当前 `npm test` 为 78 项，`node --check` 与配置内 ESLint 通过。逐项浏览器场景保留在 `tests/browser-na-fixes.mjs` 和 `tests/na-fixes/`。

```bash
npm run build
# 另一个终端运行 npm start；也可使用现有来源
PLAYWRIGHT_MODULE=/absolute/path/to/node_modules/playwright TEST_URL=http://127.0.0.1:8086/ node tests/browser-na-fixes.mjs
```

默认使用本机 Chrome 的独立临时 profile，缓存与项目存储跨场景保留，来源不写入用户原 Chrome profile。可用 `CHROMIUM_EXECUTABLE` 指定浏览器，`NA_TEST_PROFILE` 指定专用测试 profile。脚本按优先级顺序运行 NA-001～012；单项参数只用于有对应准备状态的复测。全套跑完后可加参数 `Integration` 执行多房间联动复测。证据输出到 `docs/verification/NA-fixes/`，可用 `NA_TEST_OUT` 指定独立证据目录，保留此前验收结果。

PDF.js 5.6.205 的 ESM/worker 与 Apache-2.0 许可在 `vendor/pdfjs/`；仅在导入 PDF 时加载。Three.js 仍通过原 CDN 按需加载。新数据字段约定、逐项验收与限制见 [本轮验收](NA-fixes-verification-2026-10-02.md)。


## P0 公开住宅图纸复测

```bash
# 使用独立来源与临时 Chrome profile；source.json 记录原 PDF 来源与 SHA-256
python3 scripts/serve.py --port 8095 > /tmp/floorplan-real-house-server.log 2>&1
PLAYWRIGHT_MODULE=/absolute/path/to/node_modules/playwright TEST_URL=http://127.0.0.1:8095/ node tests/browser-real-house.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/node_modules/playwright TEST_URL=http://127.0.0.1:8095/ NA_TEST_OUT=docs/verification/NA-real-house/regression node tests/browser-na-fixes.mjs
```

`tests/browser-real-house.mjs` 使用 `docs/verification/NA-real-house/san-diego-plan-b.pdf`，下载来源和摘要见同目录 `source.json`。测试通过实际 DOM 表单建立简化九区模型，不向产品增加测试接口。`wallWidths` 是 House 各矩形空间的可选字段，键为 `top/right/bottom/left`，省略侧默认 120 mm；范围 0–1000 mm，0 为整侧开放，且不能拥有洞口。旧单矩形仍采用原固定墙厚数据；编辑为非默认墙厚时转为 House，ID、家具、底图等保留。详细范围见 [验收记录](NA-real-house-verification-2026-10-02.md)。

本地服务初始化回归：`PLAYWRIGHT_MODULE=/absolute/path/to/node_modules/playwright TEST_URL=http://127.0.0.1:8095/ node tests/browser-local-reload.mjs`，连续 100 次导航并检查请求失败。服务器日志建议重定向文件，避免终端输出缓冲影响长批次。


### 局部墙段与半高墙

`House.rooms[].wallSegments` 为可选对象，键同四侧。省略某侧表示该侧按 `wallWidths` 生成整面全高墙；空数组表示本侧无墙段；每段为 `{offset, length, height}`，均为浮点毫米。段长至少 1 mm，高度 100 mm 至本层净高，不能越界或重叠，每侧最多 20 段、每层总计 300 段。门窗只能位于一个连续全高墙段内并距两端至少 1 mm。共享边界取两侧物理墙体的并集，重叠处取较高墙；不自动改写邻室。

仅自定义墙段项目生成与 `walls` 一一对应的 `geometry.wallHeights`，以及共享通道的 `geometry.passages` 地面连接矩形；无自定义墙段的旧项目几何保持原结构。导入时仍重新生成并逐字段验证，不能通过修改几何绕过源参数。2D 使用既有 `low` 墙样式，3D 使用毫米高度并受剖切上限约束，原模板 `low` 默认 1 m 保持兼容。

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/node_modules/playwright TEST_URL=http://127.0.0.1:8095/ node tests/browser-wall-segments.mjs
```

实际表单、公开住宅底图续建、JSON/PNG 和窄屏结果见 [墙段验收](NA-wall-segments-verification-2026-10-02.md)。


### 完整地面布局数据与四图验收

- `House.floorSlab?: boolean`：新矩形转 House 时为 true。生成互不重叠的 `geometry.floorSlabs`，覆盖矩形空间的外包墙带并集；旧 House 省略该字段时不新增几何字段，保持兼容。
- `House.rooms[].notch?: {corner, width, depth}`：corner 为 `top-left/top-right/bottom-left/bottom-right`，宽深使用毫米，须留至少 1 mm 的连通地面。只扣净地面，不自动添加内凹墙；使用已有墙段与独立衣柜 / 洗衣空间表达内凹边界。重叠净地面及侵入地面的墙体拒绝提交。
- 门对象的 `mode` 可省略（旧平开门），或为 `swing/sliding/bifold/passage`。仅 swing 保留 hinge；swing/bifold 保留 swing；其他模式拒绝铰链与开启方向。推拉 / 折叠 / 开放模式允许 offset 0 及贴合父墙端点，普通平开门 / 窗保留 1 mm 几何间隔。
- `pairedWith?: openingId` 仅为平开门使用。House 需引用另一空间中的平开门；生成时须确实共洞口且朝相反方向。删除门或房间会清理关联，普通重复洞口继续拒绝。
- Sliding / Bi-fold 生成到 `geometry.slides`，新数据包含 style，折叠数据另含 swing；Open passage 生成到 `geometry.lintels`，含 passage 标记。旧滑动门几何省略 style 时仍使用原玻璃模型；新推拉门采用实心门板。导入仍按源参数重建核对，不能直接改几何绕过验证。
- 单层完整证据位于 `docs/verification/NA-complete-houses`；独立的英尺源清单位于 `tests/fixtures/north-american`。辅助核算不依赖生成器的面积值：核对原图外轮廓、多边形分区、门窗清单、3 in 地面连通、家具及平开/静态折叠占地。

```bash
npm test
npm run build
PLAYWRIGHT_MODULE=/absolute/path/to/node_modules/playwright TEST_URL=http://127.0.0.1:8095/ node tests/browser-complete-houses.mjs plan-b
# 依次用 plan-a、plan-c、plan-f 复测；每套从真实 PDF 与表单建立模型。
PLAYWRIGHT_MODULE=/absolute/path/to/node_modules/playwright TEST_URL=http://127.0.0.1:8095/ node tests/browser-house-review.mjs
```

打印文件另用可选的 QA 环境验证，无需向产品添加依赖：安装 PyMuPDF 后运行 `python tests/verify-house-pdfs.py`，检查单页 A3、100 mm 比例尺并生成 PDF 页渲染。仍须人工查看渲染文件；该检查不代替实体打印机量测。

同一套脚本复测应保存最终构建号，失败文件按早期运行保留，不能用旧构建的 passed 文件替代当前结果。完整证据矩阵见 [四套验收](NA-complete-houses-verification-2026-10-02.md)。


### 可重复使用的原图素材库

`tests/fixtures/floorplans` 保存四套官方完整 PDF 和 14 份新增场景资料。格式、页码、来源、SHA-256 和当前验收状态以 `manifest.json` 为准；预览目录与后续深测顺序见 [素材库说明](../tests/fixtures/floorplans/README.md)。

可选 Python QA 脚本 `scripts/floorplan-corpus.py` 使用 PyMuPDF；默认核对本地原件，`--download-missing --render` 仅补充缺失原件并生成选定页预览。`tests/browser-floorplan-corpus.mjs` 用实际菜单和图纸导入界面读取原文件，检查页码、渲染、取消后项目不变及目录筛选；不做伪造尺寸标定，不等同于完整模型验收。未新增产品运行依赖。
