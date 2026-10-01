# 前端 UI 重构最终交付｜UI-060～210

日期：2026-10-01。分支 `feat/ui-refactor`。第一批 UI-000～050 已提交并推送为 `dbd55d3`；最终实现以本分支后续提交为准。不合并 `master`，不部署。

本轮计划的实现项全部完成，沿用现有毫米数据、项目格式和编辑算法。UI-095 完成内部任务走查，**外部试用者测试未执行**；不得把自动化验收称为真实用户验证。

## 任务结果

| 任务 | 已交付内容 |
|---|---|
| UI-060 | 画布上方 2D Layout / 3D View，直接 Orbit / Walk；选择、测量、缩放、Fit view 与贴墙吸附位于画布附近；详细说明收进 Help；拖家具到工具/菜单不会误放置 |
| UI-070 | 英文导航、字段和反馈统一；Primary Bedroom/Bath、中性床型；保留用户中文名称和项目单位；摘要近似值不回写；人民币估价仍为高级详情中的示例价格 |
| UI-080 | 真实本机保存成功/失败状态、异步切换/导入/PNG 加载状态；单一清空全部家具入口、取消/撤销；窄屏文件菜单可查当前项目名与设备保存状态；ARIA 状态、焦点返回；同对象草稿/光标/错误保留，切换对象不串草稿；尺寸错误未解决前保留单位锁定 |
| UI-090 | 38 项 Node 测试、43 组浏览器检查、源码哈希/语法/空白检查、相同基线文件的前后截图和实际 JSON/PNG 导入导出 |
| UI-095 | 内部执行“新房间→添加家具→修改尺寸→测量→导出并恢复”；记录卡点并修复菜单、草稿、工具命中与窄屏；外部用户试用未执行 |
| UI-110 | 当前家具库本地名称/分类/类型搜索，分类下拉、清空筛选与无结果状态；搜索与筛选不改原目录，不调用外部服务 |
| UI-120 | 60 张卡片共用现有内联 SVG，等比例预览和统一留白；长名称可换行，窄面板一列；无网络图片依赖，未知符号已有矩形备用绘制；无常驻缩略图 WebGL 场景 |
| UI-130 | 家具尺寸、位置、朝向/外观分组；房间和洞口保留现有可靠单位输入/校验；门窗明确所选墙起点墙角到洞口起边的基准；空值/错误保留且不写入模型 |
| UI-140 | 320～1440px 与低高度布局、关闭抽屉并返回焦点、隐藏内容 inert；允许浏览器缩放；点击放置和数值编辑作为已有非拖动入口；模拟触控漫游可退出 |
| UI-150 | View options 中相机、墙体显示、对象显示和照明分组；Night 和 Sun 各自对应真实效果；切换视图后保留设置；3D 设置不在 2D 显示 |
| UI-160 | 实际 PNG/JSON、导入和示例恢复入口统一；真实读取/图片生成状态；PNG 编码或加载失败不报成功，可继续使用/导出 JSON；不加入云存储或付费功能 |
| UI-210 | 150ms 的控件/菜单反馈；不对侧栏尺寸做命中位置不同步的动画；prefers-reduced-motion 关闭 CSS 动效并缩短原 3D 过渡 |

## 核心实现

- 右栏只在相关模型、语言或选择变化时重绘。同一对象/单位上下文中，字段对应真实值未被修改时恢复未提交草稿、焦点和选择区；已修改的字段采用新的模型值。对象、项目或单位上下文变化时不恢复旧草稿。
- 用户切换语言不会触发模型修改。单位显示改变仍使用原解析和格式化工具。`src/core`、`src/data` 和 `src/editor2d` 的受保护源码与 UI-000 哈希一致，见 [source-checks.json](verification/UI-final/source-checks.json)。
- 保存标签由实际 `storage.save()` 结果驱动；首次加载只说明 Device storage only。下载提示只说明“文件已生成，下载已启动”，不声称文件已写入用户磁盘。
- 原有几何快照、旧文件迁移、错误恢复备份与 Three.js 按需加载保留。没有新增 npm 依赖，`package.json` 未变。

## 验证结果

使用 Chromium 149.0.7827.55 独立非持久化 context。常规回归不读写用户浏览器配置。

| 验证 | 通过数 | 证据 |
|---|---:|---|
| Node | 38 | [unit-tests.log](verification/UI-final/unit-tests.log) |
| 控件、尺寸、焦点与 Token 对比度 | 5 组 | [control-results.json](verification/UI-final/controls/control-results.json) |
| 原编辑基线与 13 张截图 | 7 组 | [baseline-results.json](verification/UI-final/baseline/baseline-results.json) |
| T03 主流程，实际下载/上传 | 9 组 | [browser-results.json](verification/UI-final/t03-regression/browser-results.json) |
| 剩余 UI 综合验收 | 9 组 | [final-ui-results.json](verification/UI-final/final-ui-results.json) |
| CDN/WebGL/指针锁/旧数据/存储/生命周期故障路径 | 7 组 | [failure-path-results.json](verification/UI-final/failures/failure-path-results.json) |
| 存储、非法导入、PNG 编码/图片加载失败 | 4 组 | [error-results.json](verification/UI-final/errors/error-results.json) |
| 模拟触控放置/编辑与漫游退出 | 2 组 | [touch-results.json](verification/UI-final/touch/touch-results.json) |

合计 43 组浏览器检查，包含严格业务数据比较、100 次单位往返、真实指针拖动/取消/缩放、撤销重做和 WebGL canvas 实例身份检查。最后的综合任务比较项目全部业务数据，仅忽略主动改变的 view 和 updatedAt；没有放宽几何数值断言。

当前项目无构建、类型检查或 Lint 脚本；实际执行已有 Node 测试及所有 src JS / 浏览器测试脚本的 `node --check`、`git diff --check`。

验证期间，8086 和临时 8091 服务均曾出现浏览器初始页面等待超时，尚未定位偶发原因。故障脚本补充 pageerror、requestfailed 和失败时 DOM 状态诊断后，最终 7 组故障检查全部通过；不将换端口视为问题修复。最终完整证据来自相同工作区的临时 8091 服务。性能对照另外使用原 T03 提交的临时只读快照与 8092 服务，测试结束停止两个临时服务，保留用户原 8086 服务。

### 验收矩阵

| 方案场景 | 对应证据与结果 |
|---|---|
| T01～05：旧项目、添加、移动旋转尺寸、门窗、撤销重做 | T03 + 编辑基线，通过 |
| T06～08：视图、面板、单位与数据不漂移 | T03 + 综合验收，通过；canvas 实例复用 |
| T09：输入期间快捷键不操作场景 | 现有 T03 输入/错误检查 + 综合草稿/光标检查，通过 |
| T10：清空取消与确认范围 | 综合验收，通过，撤销恢复家具 |
| T11：保存、导出、重开和读取 | 真实 JSON/PNG 下载、v1/旧文件导入、刷新，通过 |
| T12～14：英文、1280/1440、长名称和列表 | 综合验收、原 UI-030 长名称证据及目录滚动对照，通过 |
| T15：存储/资源失败 | 7 组故障路径 + 4 组错误注入，通过 |
| T16～17：搜索、分类、抽屉焦点 | 综合验收 + 模拟触控，通过 |
| T18：200% 缩放 | 640×400 CSS 视口的等效重排通过；真实浏览器菜单缩放与系统高对比度未执行 |
| T19：减少动态效果 | CSS 动效关闭、真实 2D/3D 切换和数据比较通过 |
| T20：无关更新保留输入 | 语言、面板、显示层更新后草稿/错误/焦点/光标保留；对象切换不串值，通过 |
| T21：浮层与拖放边界 | 点击设置不会测量；拖目录家具到画布工具不添加；Escape 后可继续操作，通过 |
| T22：公共房间列表 | 进入 3D 前已有 2 个基线房间按钮（房间+全屋）；3D 后保持，通过 |

### 截图与性能记录

前后对照使用 [UI-000](UI-000-baseline.md) 相同项目/视口和最终 [基线截图](verification/UI-final/baseline/)。当前截图：[家具属性 1440](verification/UI-final/baseline/furniture-selected-1440.png)、[3D 房间](verification/UI-final/baseline/room-3d-1440.png)、[390 画布](verification/UI-final/editor-390.png)、[英文 3D 窄屏](verification/UI-final/english-3d-390.png)、[视图设置](verification/UI-final/view-options-3d.png)、[触控漫游](verification/UI-final/touch/touch-walk.png)、[保存失败](verification/UI-final/errors/save-failure.png)。

[性能对照原始值](verification/UI-final/performance-results.json)：1280×800，同设备、原 T03 快照与当前工作区各 3 个交替 session，每次 10 次同步语言/目录刷新。两版本均为 60 张卡片、46 件示例家具、2D 下 0 个 WebGL canvas；目录可独立滚动。

| 本地测量均值 | 改造前 | 当前 |
|---|---:|---:|
| 目录就绪时的 performance.now | 84.77ms | 100.40ms |
| 同步语言/目录刷新 CPU 时间 | 7.50ms | 7.89ms |

这是小样本 headless 记录，不是稳定性能承诺，不证明速度提升或 FPS 不变；没有实测低性能硬件上的帧率。

## UI-095 内部任务走查

| 任务 | 入口与实际观察 |
|---|---|
| 新建测量房间 | Room → New room plan；弹窗说明替换、备份与可撤销；T03 实际创建 12×10×8ft |
| 放入并调整家具 | Furniture 点击、拖入或键盘添加；Properties 改宽深和位置，T03 实际 60×80in |
| 找门窗 | Room / Openings → 选墙 → Door / Window；属性只列当前洞口，弹窗显示起点基准 |
| 测量剩余距离 | Canvas 的 Measure，点击两点后保存测量；Select 退出；T03 有真实测量记录 |
| 切换视图与保存恢复 | 2D Layout / 3D View、Export / File；下载 JSON 后刷新/重新导入保持毫米值 |

内部发现并修复：旧顶栏换行；菜单 Escape 无效；房间列表依赖 Three；语言刷新丢失草稿；Night 移入新分组后旧选择器未绑定；画布工具覆盖旧测试点击坐标；英文窄屏顶栏导出裁切（补充按钮边界断言）。修复后仍用真实入口与严格数据断言，不强制点击不可见控件。

**尚未执行**：3～5 位首次使用者的试用、Safari/Firefox/Edge、真实触屏/低性能硬件、真实浏览器 200% 菜单缩放和全应用无障碍审计。这些不是可在本地自动化中伪造的结果。本轮完成内部验收，不声称已获外部用户验证或 WCAG 认证。

非拖动入口包括家具点击放置、数值尺寸/位置/旋转与按钮操作、两点测量、门窗表单；相机自由旋转、全局平移和触控漫游摇杆仍依赖原有手势/方向输入，未实现全套单指针无拖动替代界面。

## 复现

```bash
export PLAYWRIGHT_MODULE=/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright
export CHROMIUM_EXECUTABLE=/Users/chris/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell
npm test
TEST_OUT=docs/verification/UI-final node tests/browser-ui-final.cjs
TEST_OUT=docs/verification/UI-final/t03-regression node tests/browser-t03.cjs
TEST_OUT=docs/verification/UI-final/baseline node tests/browser-ui-baseline.cjs
TEST_OUT=docs/verification/UI-final/controls node tests/browser-ui-controls.cjs
TEST_OUT=docs/verification/UI-final/failures node tests/browser-failures.cjs
node tests/browser-ui-errors.cjs
node tests/browser-ui-touch.cjs
```

性能脚本需要额外的只读原 T03 静态服务 8092 和当前静态服务 8091，见 `tests/browser-ui-performance.cjs`。普通使用仍访问 8086。
