# T03 英制输入与尺寸一致性验收

[项目首页](../README.md) · [任务书](T03-units-and-measurements-plan.md) · [使用指南](usage.md) · [架构](architecture.md)

## 结论与工作区

2026-09-30，本地完成 T03 工程范围：严格英制/公制输入、独立项目单位事务、全站尺寸/面积、既有步长和网格、精确编辑及 v2 持久化。原生 ES Modules、SVG、Three.js 保持；未增加应用依赖、框架、后端、数据库或支付。

直接在完整当前工作区接续。分支 `feat/project-data-t01`，HEAD `680e26c53f08de4ce2dbd02dd70a65b6e603041d` 未改变。开始时 README、roadmap 的未提交改动以及未跟踪 T03 任务书均保留并继续更新。以上为工程验收时点，尚未提交、推送、合并或公开部署。验收后用户授权提交并推送当前开发分支；本次授权不包含合并 master 或部署，实际同步状态以 Git 为准。

已读取用户提供的 AGENTS 约定和 T03、T02 数据/验收、T01、T01.1、architecture、development、usage；项目及父目录没有其他 AGENTS.md。复用 Python PID 20514 的 8086 服务，已核实启动参数 `--directory /Users/chris/Documents/项目/AI家装/floorplan-3d`，没有重启或切换目录。

工程验收不代表真实用户验证：任务书建议的 5–8 人形成性试用尚未开展。

## 环境与复核入口

- macOS arm64，Chromium **149.0.7827.55**，1440×1000、390×844。
- 现有 Playwright：`/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`。
- 现有浏览器：`/Users/chris/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`。
- 全部浏览器流程采用新建非持久 context，不使用或清理用户配置目录/站点项目。3D 实际加载 Three r160 CDN 并运行 WebGL。
- 初始 `npm test` **31/31**；T03 最终 **38/38**。旧测试通过仅作为回归，T03 独立证据见下表。
- [Node 输出](verification/T03/node-tests.txt)、[ESLint 输出](verification/T03/lint.txt)、[逐文件语法和 diff 检查](verification/T03/source-checks.json)。本项目没有构建步骤。

```bash
npm test
npx --yes --package eslint eslint --config tests/eslint.config.js src
export PLAYWRIGHT_MODULE=/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright
export CHROMIUM_EXECUTABLE=/Users/chris/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell
node tests/browser-t03.cjs
node tests/browser-t03-3d.cjs
DISPLAY_UNITS=imperial TEST_OUT=docs/verification/T03/imperial-drag node tests/browser-3d-interactions.cjs
# 旧回归仍需运行；TEST_OUT 指向本轮子目录，避免覆盖历史证据
TEST_OUT=docs/verification/T03/t02 node tests/browser-t02.cjs
TEST_OUT=docs/verification/T03/storage node tests/browser-t02-storage.cjs
TEST_OUT=docs/verification/T03/doors node tests/browser-t02-doors.cjs
TEST_OUT=docs/verification/T03/legacy node tests/browser-regression.cjs
TEST_OUT=docs/verification/T03/interactions3d node tests/browser-3d-interactions.cjs
TEST_OUT=docs/verification/T03/failures node tests/browser-failures.cjs
```

## 分批结果与证据

### A：纯函数与数值

`tests/units.test.js` 直接导入无 DOM 的 units、store 和 snapping：

- 25.4 / 304.8 mm 精确单位常量；3213.1、1827.2125、774.7、2911.475、1.5875、−165.1 mm 基准。
- 显式 mm/cm/m、ft/foot/feet、in/inch/inches，组合、分数、Unicode、NBSP、负坐标；无后缀默认单位。
- 完整拒绝非法后缀、科学计数、逗号、非法分母/分子、内部符号、混合单位算式、组合进位错误；没有 parseFloat 前缀接收。
- 1/16 显示舍入、≈、分数约分、跨英尺进位、微小非零、负零、面积原值换算。
- 10,000 个确定性正负小数值在双模式下编辑往返误差均小于 1e-6 mm；原文本未修改时严格返回原 float。
- 100 次单位事务后完整项目比较仅允许更新时间不同；同单位 no-op；编辑/单位逐笔 undo/redo 和取消。
- v1/无版本旧文件已有合法 imperial 保留；无单位旧文件默认 metric，错误 internal 单位拒绝。
- 10/100 mm、6.35/25.4 mm 步长与 304.8 mm 网格；精确墙吸附保留优先级。

### B/C：输入、事务与全站接入

| 表面/场景 | 验证结果与证据 |
| --- | --- |
| 新房间 | UI 从已有项目切英制，创建 12×10 ft、8 ft 高；内部 3657.6×3048、2438.4 mm，面积 120.00 sq ft；继承单位。 [主流程](verification/T03/browser-results.json) |
| 表单与错误 | 未修改应用不改变保存字节；5'12" 给出 6 ft/72 in 修正；字段 aria-describedby/aria-invalid、预览、示例与范围；全局单位禁用且说明原因；Escape 取消 |
| 门窗 | 门宽 30 1/2 in → 774.7 mm；合法窗、铰链单独修改不改变尺寸。原 T02 16 种方向/重叠/越界/过高/删除回归保留。 [T02 当前结果](verification/T03/t02/browser-t02-results.json) |
| 家具 | 60×80 in → 1524×2032 mm；−0'6.5" 坐标；多位小数毫米；仅改名称和 focus/blur 保持尺寸；非法分数、负宽、0、低于最小值和超过上限都不写模型 |
| 精度与历史 | UI 连续切换 100 次深比较所有字段；1/64 in 输入保留；尺寸→切换→连续 undo/redo 按笔恢复 |
| 2D 交互 | 真鼠标拖动、resize、键盘普通/Shift、Escape、pointercancel、拖动中途切换视图取消、撤销和保存测量；英制常规网格 6.35 mm。精确贴墙由纯函数与旧浏览器交互回归验证 |
| 长度显示 | 尺寸链、选中家具、测量、坐标/hover、房间开间/进深/周长/墙高、洞口列表、家具目录、添加/拆墙消息接统一 formatter；固有家具名称不改写 |
| 面积与报价 | 总面积、房间、家具占地、材料、墙面和 3D 标签/列表用原始 m² 转换；报价仍按原 m² 和人民币/平方米计算，明确标签 |
| 网格/比例尺 | 英制 304.8/152.4 mm 主/次网格；尺寸步长与显示精度分开；切换即时刷新比例尺，不 fit 或改变物体 |
| 3D 普通切换 | 实际 WebGL；单位变化更新 room list/CSS2D 标签，切换前后 Canvas 严格像素相等。[3D 截图](verification/T03/imperial-3d.png) |
| 3D 门状态 | 门关闭并等待画布稳定后切 Metric/Imperial，Canvas 严格相等；900/top/start/inward 与 1200/bottom/end/outward 均真实点门、重开残差 0。[结果](verification/T03/doors-imperial/results.json) |
| 3D 英制拖动 | 单独在关闭贴墙吸附时验证 6.35 mm 网格，真实拖动、撤销/重做、Escape、返回 2D；精确墙吸附另保留原公制路径。[结果](verification/T03/imperial-drag/3d-interaction-results.json) |
| 中英文/窄屏 | 单位与语言独立，390×844 的入口、表单、预览、错误与取消/应用可用。[英文错误](verification/T03/narrow-error.png) |

### D：文件、兼容、故障与实际图片

- [真实下载 v2 imperial JSON](verification/T03/imperial-project.json)：准确毫米、单位偏好、几何和对象保留；刷新及真实文件输入重导入后数据相等。
- [真实下载 3200×2817 PNG](verification/T03/imperial-2d.png.download.png)：已解码并目视检查，12'/10' 尺寸线、分数测量、120.00 sq ft 均可读，无边缘裁切。保留 [2D 页面截图](verification/T03/imperial-2d.png)。原有房间名称与家具名称可能重叠，不属于自动标签避让实现。
- [旧主回归 22 项](verification/T03/legacy/browser-results.json)：示例、v1 夹具、旧格式确认/取消/原文下载备份、未来/坏文件拒绝、刷新、导入撤销、2D/3D PNG 和销毁。
- 额外通过真实无版本文件备份/导入和 v1 imperial 上传，已有英制偏好及家具毫米值不丢失。[主流程](verification/T03/browser-results.json)
- [存储专项 4 项](verification/T03/storage/storage-browser-results.json)：v1 源键不改、迁移写入失败仍可用、坏 v2 不回退且 recovery 失败不覆盖、迟到读取不覆盖新编辑。
- [故障专项 7 项](verification/T03/failures/failure-path-results.json)：CDN、WebGL 初始化、鼠标锁定拒绝、原文 recovery、quota、等待加载时 3D 偏好、销毁资源。模拟故障的错误日志与正常流程未捕获异常分开。
- 原 3D [交互](verification/T03/interactions3d/3d-interaction-results.json)及 [T02 门](verification/T03/doors/results.json)也重新执行；不沿用上次验收结果。

## 回归时发现与处理

1. 原家具面板整数化/静默 clamp 会丢失精度；已改为独立严格长度字段，保存原文本与原始毫米。范围拒绝并反馈，不自动更正。
2. 初版接入审计发现添加家具 toast 仍输出裸毫米数，已统一格式化；状态栏缓存最后坐标，在单位切换时立即刷新。
3. 新浏览器脚本最初误用未公开的 `application.actions`、未给数值开头的 CSS 属性值加引号；改为实际 SVG 选择及正确选择器。失败截图保留，仅最终结果文件代表通过。
4. 旧脚本可能在静态按钮已出现、ESM 尚未初始化时点击。增加家具库/渲染完成等待；存储脚本增加 TEST_OUT 目录创建。未删除原断言。
5. 门动画按渐近插值更新，固定延迟下 Canvas 仍可能变化。专项等待相邻画布稳定后再切换；严格像素相等断言保留。没有改生产门动画或放宽几何精度。
6. 英制网格初测没有关闭精确贴墙，出现非网格落点。测试改为关闭贴墙后检查步长，同时保留精确吸附独立覆盖。
7. 保存失败 toast 由既有零延时任务发布，立即断言可能读到前一提示；测试等待实际失败提示，再验证旧保存字节没有覆盖。

## 未测项与边界

- 未测 Safari、Edge、真实手机/iPad 键盘与触屏/双指、不同 GPU、长时间运行、超大项目压力和运行中 WebGL context 丢失。390px 是桌面模拟。
- 未邀请真实英制用户试用；无输入成功率、完成时间或付费结论。任务书第 12 节仍待执行。
- 3D PNG 沿用 WebGL Canvas 导出，不含 CSS2D 房间标签；不宣称完整带尺寸 3D 交付图。
- 未逐项人工核验全部家具模型/商品外包尺寸、全部尺寸极值的视觉可读性、任意长名称/极短尺寸链的排版。代表性房间 PNG 已目视检查；小窗口可缩放查看。
- 门真实射线点击/画布验证为两种代表配置；16 组合由 T02 表单/SVG 和原建筑单测覆盖。
- 原材料估算继续为人民币/平方米；目录固有名称如“1.8m”不替换。新项目默认仍公制，语言默认规则未改。
- 单矩形、固定 120 mm 墙厚继续沿用 T02；未开发 T04、T06、T08、自动避让/碰撞、支付或新导出排版。
