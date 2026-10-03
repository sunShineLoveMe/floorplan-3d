# 验收运行说明

最终构建 `2aa67ee25a57fedc`：89 项单元测试、源代码 ESLint（零错误 / 警告）、新脚本语法和差异检查通过。三组浏览器脚本均在该构建用独立临时 Chrome profile 和 8095 来源完成，退出码为 0。

首次浏览器尝试发现真实的英尺边界浮点误判，已修复并增加实际长度解析值及相邻柱接触测试。其余中间失败来自测试脚本使用 SVG 的 innerText、未打开视图 / 文件菜单、移动端抽屉以及未等待 3D 视图切换结束；脚本已改为 textContent、真实菜单 / 抽屉操作和等待 busy 结束，最终证据仅采用完整成功运行。

可复跑命令（先在项目根目录运行本地服务器）：

```sh
npm test
npm run build
python3 scripts/serve.py --port 8095
# 在另一终端运行，PLAYWRIGHT_MODULE 可使用本机 Playwright 模块路径：
TEST_URL=http://127.0.0.1:8095/ node tests/browser-fixed-obstacles.mjs
NA_TEST_OUT=docs/verification/NA-fixed-obstacles/regression TEST_URL=http://127.0.0.1:8095/ node tests/browser-na-fixes.mjs
REFERENCE_TEST_OUT=docs/verification/NA-fixed-obstacles/reference-regression TEST_URL=http://127.0.0.1:8095/ node tests/browser-reference-usability.mjs
# PDF 检查使用 Python 的 PyMuPDF；无需增加应用依赖：
python3 scripts/check-fixed-obstacle-exports.py
```

本轮浏览器在系统 Chrome + 软件 WebGL 下执行。自建 8095 服务在验收结束后停止；已有 8086 服务保留并返回 HTTP 200，当前 HTML 包含最终构建标记。原始图纸的 18 个 SHA-256 均与来源清单一致。未执行实体打印、Safari、Edge 或实体触屏。
