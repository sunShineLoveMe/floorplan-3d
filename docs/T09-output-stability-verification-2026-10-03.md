# T09 输出与端侧稳定性：第一批验收

日期：2026-10-03。接续分支 `feat/ui-refactor`，T04 / T05 / T08 已按用户授权本地提交为 `833a2babda4d6a237d59b254cde45b7f3aafa8e9`，未推送、合并或部署。本文对应随后实施的 T09 本地未提交改动。

2026-10-04 同步补记：用户已授权将现有 T04 / T05 / T08 提交和 T09 实现、验收证据提交并推送至 `origin/feat/ui-refactor`；实际提交号与远程结果以 Git 为准，未合并或部署。下文及机器汇总中的“未提交”是 2026-10-03 验收时的历史状态。推送前重新运行 147 项 Node 测试、ESLint 与构建，均通过，构建版本不变。自有源码空白检查通过；新增官方 Three.js 文件含 7 处上游空白提示，为保留官方文件及 SHA256 一致性，未改写 vendor 源码。

## 结果与范围

第一批补齐完整边界高清 PNG、可见 3D 房间标签和明确的 3D 故障恢复。最终构建 `f35a2cebc21e75fd`。Edge、实机手机 / 多指、不同 GPU、长期运行及 Safari 深度编辑仍待后续验收，不能将本批记为整个 T09 全部完成。

### 输出

- Export / File 提供 3200 / 4800 px 长边选择，二维与三维共用纵横比和分配上限：最大长边 4800 px、总像素不超过 1200 万。接近正方形的 4800 px 申请会降低实际分辨率，界面已有说明。
- 2D PNG 根据整个几何及可见 SVG 图层的实际 glyph 边界扩展范围，包含户型外家具和测量；不随当前平移 / 缩放裁剪。排除网格的无限范围与选择框，补背景、测量颜色和字体；画布背景填充消除边缘透明条。
- 3D PNG 提高现有渲染器的临时分辨率，保留当前相机，随后恢复显示尺寸 / 像素倍率；不导出选择辅助框。按当前可见标签的名称、面积、位置和文字样式合成房间标签；隐藏的标签不写入图片。名称 / 面积布局复用已有可见性规则，不承诺同时显示全部房间标签。
- 编码失败会显示失败提示并恢复按钮，可再次导出；页面释放时清理下载 Blob URL。打印仍使用原来的几何范围与缩放约定，未新增打印功能。

### 3D 恢复

- 固定版本 Three.js `0.160.0` 从官方 npm 包复制到 `vendor/three/`，保持既有版本与原生 ESM。保留 LICENSE、来源与 SHA256：[来源记录](../vendor/three/source.json)。不依赖外部 CDN，三套户型在阻断外网请求时成功进入 3D。
- 区分模块失败、15 秒模块加载超时、WebGL 启动失败、图形上下文丢失与场景初始化失败。显示持续的原因及 Retry 3D，取消忙碌状态并返回 2D，保留工程和 JSON 操作。
- 原始错误继续写入控制台。过期的异步加载不会在超时或页面释放后创建渲染器；重试清理失败的渲染器并释放 WebGL 上下文。浏览器可能缓存失败的 ESM 请求，持续模块失败时按界面说明先导出 JSON、再刷新。

## 验证与证据

| 验证 | 数量 / 结果 | 证据 |
| --- | --- | --- |
| Node | 147 通过 | [日志](verification/T09-output-stability/unit-tests.txt) |
| ESLint / build / 自有源码 diff | 通过；构建 `f35a2cebc21e75fd`；vendor 上游空白见同步补记 | [Lint](verification/T09-output-stability/lint.txt)、[构建](verification/T09-output-stability/build.txt) |
| Chrome 专项 | 10 场景通过 | [结果](verification/T09-output-stability/final-chromium-03/browser-results.json) |
| WebKit 专项 | 10 场景通过 | [结果](verification/T09-output-stability/final-webkit-02/browser-results.json) |
| 独立磁盘检查 | 每引擎 14 项通过 | [Chrome PNG / SVG](verification/T09-output-stability/final-chromium-03/independent-image-results.json)、[WebKit PNG / SVG](verification/T09-output-stability/final-webkit-02/independent-image-results.json) |
| T08 回归 | 42 项通过 | [结果](verification/T09-output-stability/t08-regression/browser-results.json) |
| T08 独立下载检查 | 12 项通过 | [JSON / PNG 校验](verification/T09-output-stability/independent-download-results.json) |
| T04 交互回归 | 4 项通过 | [结果](verification/T09-output-stability/t04-regression/browser-results.json) |
| Safari 27.0 本机 | 无痕窗口，真实 3D / 图片下载 / 刷新恢复 | [首轮下载检查](verification/T09-output-stability/safari-native/disk-results.json)、[最终构建二维下载](verification/T09-output-stability/safari-native-final/disk-results.json) |

10 个专项场景包括 Jacobsen / CMU / Plan F 反复 2D / 3D 与工程保留、长房间 / 户型外家具 / 测量、标签开关、WebGL 构造失败、实际 `WEBGL_lose_context`、模块延迟超时、PNG 编码失败与重试、390 px 窄屏导出。故障注入明确为合成场景。Chrome 使用 SwiftShader，自动化 WebKit 不等于本机 Safari 或手机；本机 Safari 另通过 Computer Use 操作。

独立检查读取实际下载的 PNG 和栅格化消费的 SVG，核对像素预算、完全不透明背景、非空图像、SVG 与 PNG 尺寸一致、长房间全部可见 glyph 落在输出范围，以及标签开关只造成局部像素差异。它不借用生产代码计算预期边界。

Safari 本机使用独立无痕窗口 `Safari T09 native`，添加 Queen，显示房间名称 / 面积及 3D 网格，实际下载 3D `3200 × 2204` 和选择 4800 px 的 2D `3686 × 3255`。最终构建刷新后恢复该工程及 3D，另下载二维 `3200 × 2826`。该无痕下载存在稀疏 alpha 扰动（最低 252，0.0462% 像素），独立的不透明画布对照也出现同类扰动（0.1129% 像素），不是连续透明边缘。与 [WebKit 说明的无痕画布加噪机制](https://webkit.org/blog/15697/private-browsing-2-0/)一致；这是对照结果与官方说明支持的推断，不代表检查过 Safari 内部设置。测试未修改隐私保护。前两份文件来自构建 `78db820f3c1a78e0`，最终二维来自 `f35a2cebc21e75fd`；证据分别保存，不混记版本。普通浏览器原有工程未编辑。

## 中间失败与历史问题

- T08 attempt-05 曾记录 CMU / Plan F 的 3D 失败，但没有足够 console / request 证据。T09 原版本 [基线](verification/T09-output-stability/baseline-01/results.json)重复 9 次正常切换通过，未复现旧问题，不能把本批归因为已经修复该历史根因。
- 本地依赖首轮漏带 `RoundedBoxGeometry.js`，本机 Safari 显示模块失败；补齐官方文件后实际 3D 与下载成功。
- `attempt-01` 的导出按钮等待可见与合法测量 fixture、`final-chromium` 的故障提示文字断言均是验收脚本错误，已修正并保留失败目录。`attempt-02` / `webkit-01` 是早期 9 场景结果。
- `final-chromium-02` 专项通过，但独立 PNG 检查发现二维边缘透明；补齐画布背景后使用全新最终目录复测。`final-webkit` 在背景修复前启动，为中间版本，最终证据使用 `final-webkit-02`。
- 正常导出可能产生 GPU readback 性能警告；合成 WebGL 故障会产生预期 console error。最终机器记录保留 console / pageerror / requestfailed，未捕获异常为 0。

## 复测命令与后续

在项目目录运行；不要复用已有证据目录。

```bash
npm test
npm run build
python3 scripts/serve.py --port 8095
```

```bash
TEST_URL=http://127.0.0.1:8095/ T09_TEST_OUT=docs/verification/T09-output-stability-next/chrome node tests/browser-t09-output-stability.mjs
TEST_ENGINE=webkit TEST_URL=http://127.0.0.1:8095/ T09_TEST_OUT=docs/verification/T09-output-stability-next/webkit node tests/browser-t09-output-stability.mjs
/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/check-output-exports.py docs/verification/T09-output-stability-next/chrome
```

验收脚本使用本机 bundled Playwright / Pillow，未新增生产 npm 依赖。后续优先完成 Edge、Safari 深度编辑 / 导入恢复和实机移动端导出、手势与图形限制；再按路线图推进 T11 简版 A/B。外部首次用户试用仍未执行。用户 8086 服务保留，仅关闭本批自建服务与自动化上下文。
