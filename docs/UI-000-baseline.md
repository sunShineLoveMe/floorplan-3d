# UI-000｜功能与页面基线

> 本页为该批次交付时的历史记录；当前实现、提交状态和验收边界见 [UI 最终交付](UI-final-delivery.md)。
日期：2026-10-01。对应 [UI 重构方案 v1.1](frontend-ui-refactor-plan-v1.0.md)。本任务建立改造前对照，不修改业务引擎、页面样式或项目格式。

## 工作区与运行基线

- 当前分支：`feat/ui-refactor`；起点：`6af3c7d`（T03）。开始时仅有未跟踪的 `docs/frontend-ui-refactor-plan-v1.0.md`，已完整保留。
- 原生 ES Modules + SVG 2D + Three.js r160 3D；无框架、构建器、运行时 npm 依赖。`package.json` 提供 `npm test`，无 build / typecheck / lint scripts。
- 已有服务：`http://127.0.0.1:8086/`，Python PID 20514，以 `--directory` 指向本项目。HTTP 返回的 `src/main.js` SHA256 与磁盘一致；未重启现有服务。
- 独立启动：在项目目录运行 `python3 -m http.server 8086 --bind 127.0.0.1`，已有服务时直接使用。
- 数据来源：store 为唯一项目源；长度内部保持浮点 mm；文件为 v2，支持 v1 及符合原示例约束的无版本旧文件。`roomEditor:null` 为几何快照，不具备矩形结构参数编辑能力。
- 临时选择为 `ui.sel`，支持 `furn / room / wall / opening`；菜单、侧栏和草稿不应另建业务实体。
- 本任务产物及方案尚未提交、推送或合并。完整源文件哈希与语法检查见 [source-baseline.json](verification/UI-000/source-baseline.json)。

## 真实动作与迁移映射

下表“存在”依据源码；浏览器实测范围单独列于验证记录，不把代码入口等同于全部实测通过。

| 当前区域 / 入口 | 真实动作与处理位置 | 依赖状态 / 限制 | 目标位置 |
|---|---|---|---|
| 项目名称、面积摘要 | `toolbar.updateHeader` | project.name / rooms / units；名称仅展示 | ProjectBar |
| 撤销、重做 | `main.undo/redo` → store history | 取消在途手势；按 canUndo/canRedo 禁用 | ProjectBar |
| 新建房间 | `room-editor.open('new') / submit` → createRectangleProject / replaceProject | 替换整个方案；继承单位；可撤销，不是添加第二个房间 | Room → New room plan |
| 房间 / 门窗 | `actions.showStructure` | 打开右侧结构区；快照项目只显示限制说明 | Room / 对象摘要与编辑入口 |
| 房间净尺寸、名称 | `room-editor.open('room') / submit` | 仅矩形项目；家具保留绝对坐标；门窗越界拒绝 | 房间 Inspector，P0 可复用弹窗 |
| 墙选择 | `#parentWall.onchange` → actions.select | 逻辑墙 top/right/bottom/left；不是独立可编辑墙几何 | Room / Inspector |
| 门窗新增、编辑、删除 | `room-editor.open / submit / remove` | 父墙、偏移、宽高；门有 hinge/swing，窗有 sill；校验后原子提交 | Room 添加；opening Inspector |
| 门窗列表选择 | `[data-select]` → actions.select | 使用 opening ID；当前显示内部 ID | Room 列表，隐藏 ID |
| 单位 | `toolbar` change → store.mutate | 语言独立；家具尺寸聚焦、结构弹窗打开时锁定 | Settings；尺寸区当前单位常显 |
| 语言 | `main.relang / i18n.setLanguage` | 存于 huxing-lang；翻译预设名称，保留用户名称 | Settings |
| 2D / 3D | `main.setView / loadViewer` | 3D 按需加载；失败退回 2D，保留文件与数据 | 画布模式切换 |
| 选择 / 测量 / 拆墙 | `toolbar.setTool` → editor2d interactions | 选择临时态；测量进入 project.measures；矩形生成墙禁止拆除 | CanvasToolbar |
| 放大 / 缩小 / Fit / 1:60 / 1:100 | `viewport.zoomCenter / fitView / setRatio` | 现有 2D 能力；没有新增 3D Fit 算法 | 2D CanvasToolbar |
| 尺寸 / 名称 / 家具 / 网格 / 承重墙 / 贴墙吸附 | `toolbar` data-layer → store.setView | 图层存于 project.view.layers | View options；贴墙吸附常显 |
| 全高墙 / 剖切墙 | `viewer` data-cut → opt.cut / sync | 3D 显示裁切，不修改 geometry.height；漫游期间不修改裁切 | 3D View options |
| 鸟瞰 / 漫游 | `viewer.setMode` | opt.mode；桌面 pointer lock，失败有替代控制 | 3D Orbit / Walk 常显 |
| 斜视 / 俯视 | `viewer.flyTo / isoWhole / topWhole` | 沿用既有相机；不改变几何 | Camera |
| 家具显示 / 房间名 / 夜景 / 日照 | `viewer` data-t / applyLight / #sun | 3D opt 为运行态，不全都写入项目 | Visibility / Lighting |
| 家具库点击、拖放 | `furniture-library` pointer handlers → actions.addItem | 内置 LIB；2D 坐标与 3D groundAt；不是互联网商品库 | Furniture |
| 家具名称 / 宽深 / 中心 X Y / 旋转 / 颜色 | `property-panel.bindFurnPanel` → store.mutate | 宽深可编辑；没有家具高度字段；长度使用现有 length-field | Furniture Inspector |
| 旋转 90° / 复制 / 删除 | `project-actions.rotateSel / duplicateSel / deleteSel` | 仅当前家具；opening 删除注入 roomEditor.remove | Inspector / 浮动条 |
| 置顶 / 置底 | `property-panel.bindFurnPanel` | 调整家具数组顺序；不是修改垂直高度 | Inspector 对象操作 |
| 房间材料、房间内家具列表 | `property-panel.bindRoomPanel` | rooms 材料状态；关联现有选中和相机定位 | Room Inspector |
| 全屋面积 / 估价 / 拆墙统计 | `property-panel.overviewPanel` | 估价为示例 CNY/m²，不能改币种冒充真实报价 | Project details / Advanced |
| 清空家具 | `actions.clearLayout` | 两个当前入口指向同一动作；确认后清空全项目家具，保留墙、材料、测量，可撤销 | File / 项目危险操作单入口 |
| 清除测量 | `property-panel.bindOverview` | 仅 measures，和清空家具分开 | Measure 工具组 |
| 自动本地保存 | `main` store subscription → storage.save | 成功/失败有真实返回；失败 toast；当前无 Saved 徽标 | 可接真实状态，不能从点击推断 |
| JSON 导出 | `file-menu.exportProject` → serializeProject / download | v2 floorplan-project.json；不是云同步 | File / 明确项目文件导出 |
| JSON 导入 | `file-menu` #fileIn → importProject | 校验、旧文件确认/备份、异步修订保护；不是通用户型识别 | File |
| 图片导出 | `downloads.exportPNG / viewer.shot` | 2D SVG 栅格化；3D WebGL Canvas，不包含 CSS2D 标签 | File / Export image |
| 示例户型 | `file-menu` #reset → defaultState / replaceProject | 确认后整体替换，可撤销 | File，明确 Replace with sample |
| 面板开关 | `drawers.drawer / syncPaneBtns` | >1100px 两栏可独立收起；≤1100px 为单抽屉 | 新 Shell 复用动作，调整断点 |
| 全屏 | `toolbar.toggleFullscreen` | 浏览器标准/webkit API；支持情况需目标浏览器验收 | 工作区显示工具 |
| 操作帮助、比例尺、坐标、底部浮动条 | toolbar / viewport / property-panel.renderFab | 现有显示信息；快捷键在 interactions / viewer 中管理 | Help / 画布轻提示与工具 |

没有账号、云同步、付费报告、自定义家具创建、多房间几何搭建、自动冲突检测或 AI 布局接口。家具高度并非当前可编辑能力。不能由新样稿添加这些功能的假入口。

## 最小回归场景与截图

[baseline-project.json](verification/UI-000/baseline-project.json) 是可实际导入的 v2 文件：4,000 × 3,000 × 2,800 mm 房间，英制显示，床、书桌、椅子三种家具，上墙 900mm 门与右墙 1,200mm 窗。固定 ID 便于后续对照。它是测试场景，不是用户真实方案或推荐布置。

导入经过文件上传，输出 [exported-project.json](verification/UI-000/exported-project.json) 经过浏览器真实下载。对比忽略替换时合法更新的 updatedAt；几何、家具、房间、门窗与测量严格 deepEqual，不放宽数值误差。

| 基线状态 | 证据 |
|---|---|
| 默认中文示例 | [sample-zh-1440.png](verification/UI-000/sample-zh-1440.png) |
| 英文无选择，1440×900 | [room-empty-selection-1440.png](verification/UI-000/room-empty-selection-1440.png) |
| 房间属性 | [room-properties-1440.png](verification/UI-000/room-properties-1440.png) |
| 选中家具 | [furniture-selected-1440.png](verification/UI-000/furniture-selected-1440.png) |
| 门 / 窗表单 | [door-dialog-1440.png](verification/UI-000/door-dialog-1440.png) / [window-dialog-1440.png](verification/UI-000/window-dialog-1440.png) |
| 新建替换提示 | [new-plan-replace-dialog-1440.png](verification/UI-000/new-plan-replace-dialog-1440.png) |
| 文件菜单 | [file-menu-1440.png](verification/UI-000/file-menu-1440.png) |
| 1280×800 / 1024×768 抽屉 | [room-1280.png](verification/UI-000/room-1280.png) / [drawer-1024.png](verification/UI-000/drawer-1024.png) |
| 3D 全高墙 / 剖切墙 | [room-3d-1440.png](verification/UI-000/room-3d-1440.png) / [room-3d-cut-walls-1440.png](verification/UI-000/room-3d-cut-walls-1440.png) |

3D 图片采用默认相机，未为截图强行改变算法。后续对照应使用同一数据、视口和相机模式。测试运行中的 toast、运行时动画不算业务状态变化。

## 已有问题与实施风险

| 编号 | 证据及结论 | 后续任务 |
|---|---|---|
| B01 | 1440 与 1280 宽度顶栏均高 96px；1024 宽度高 137.5px，功能实际换行。前两者画布宽分别 904 / 744px，无整页横向溢出 | UI-020 / 030 |
| B02 | 结构区始终占右栏上半部，选中家具后属性排在下方；部分字段需滚动寻找。选择不是缺失，而是呈现混杂 | UI-040 / 050 |
| B03 | 英文界面门窗列表显示 opening ID，默认面板保留人民币估价；家具名称仍含公制规格，卡片英制分数多行 | UI-070 |
| B04 | 浏览器实测首次 2D 房间列表按钮为 0，进入 3D 后为 2（房间 + 全屋）；列表依赖 viewer.buildLabels，点击主要改变相机 | UI-040 / 公共房间列表 |
| B05 | 文件菜单打开后按 Esc，details.open 仍为 true；当前无 Esc 收起处理 | UI-080 |
| B06 | 家具宽度输入非法草稿 `61 inx` 后触发真实语言按钮处理，输入重绘为原尺寸 `59.05511811`，几何不变；错误草稿未保留。此为程序触发 click 的刷新复现，不代表普通点击已完整验收 | UI-050 / 080；见 baseline-results.json |
| B07 | 全高近侧墙实际遮挡家具，已有剖切按钮可用；优先改善入口，不新增遮挡算法 | UI-060 |
| B08 | 1440 缩窄到 1280 时保留原缩放，顶部尺寸标注出现裁切；命中与数据没有因此失效。不能把所有 resize 自动 Fit 当作修复方案 | UI-020；明确视口保持策略 |
| R01 | 家具库 dropPoint 只排除已有抽屉与特定浮层，新工具条必须扩展事件边界 | UI-060；代码风险，尚未新增浮层 |
| R02 | 新布局若整块重绘属性 DOM，草稿、焦点和光标可能丢失；不能复制项目实体规避 | UI-050；B06 已复现一种刷新路径 |

这些问题均存在于改造前，未在本任务修复，也不算本任务新增缺陷。

## 验证记录与复现

浏览器使用隔离、非持久化 context，不访问用户 Chrome 配置或已有站点存储。Chromium 149.0.7827.55，macOS arm64，headless，真实 WebGL；这不等同于 Safari 或真实触控验收。

```bash
export PLAYWRIGHT_MODULE=/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright
export CHROMIUM_EXECUTABLE=/Users/chris/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell
npm test
node tests/browser-ui-baseline.cjs
TEST_OUT=docs/verification/UI-000/t03-regression node tests/browser-t03.cjs
TEST_OUT=docs/verification/UI-000/failures node tests/browser-failures.cjs
```

- 38 项 Node 测试通过：[unit-tests.log](verification/UI-000/unit-tests.log)。现有 src 与新增捕获脚本语法检查通过，见 source-baseline.json。
- 7 组基线验证通过，13 张截图，无 pageerror：[baseline-results.json](verification/UI-000/baseline-results.json)。包含导入、家具字段/历史、面板切换后命中、门窗/新建取消、单位往返、JSON 下载/刷新、3D 剖切与返回。
- T03 主回归 9 组检查通过，无 pageerror：[browser-results.json](verification/UI-000/t03-regression/browser-results.json)。含 100 次单位切换、严格输入/单位锁定、拖放/缩放手柄/测量、取消手势、旧文件与 v1 实际导入、JSON 和 PNG 实际下载、WebGL 单位切换像素一致及 390px 错误表单。
- 故障回归 7 项在独立临时服务 `http://127.0.0.1:8091/` 上全部通过，见 [failure-path-results.json](verification/UI-000/failures/failure-path-results.json) 与 [failures.log](verification/UI-000/failures.log)：CDN / WebGL 失败、pointer lock 拒绝、坏存储备份、配额失败、3D 偏好恢复及销毁。8086 上多次出现间歇性启动超时，原因未确定，不能将其写成已修复应用缺陷；各尝试日志保留。重跑另暴露旧脚本在 DOMContentLoaded 后立即读取尚未写入的 v2 数据，已添加等待条件，产品代码未改。8091 临时服务验收后停止，8086 原服务保留。
- 未执行：Safari、Edge、Firefox、真实手机/iPad、真实触屏、浏览器 200% 缩放、长会话/GPU 横向对比、真实用户试用及全部相机/全屏组合。没有构建和类型检查配置，标为 N/A；本任务未改变业务源代码，未另下载 lint 工具。

## 交付边界与下一任务

UI-000 的分支核查、动作映射、回归文件、截图和已知问题记录已建立。新增 `tests/browser-ui-baseline.cjs` 是旧 UI 的证据捕获脚本，不是生产测试桥接；后续 UI 迁移后应更新选择器或建立对应新版本脚本，不把旧选择器失效当成业务回归。

下一任务为 **UI-005：关键交互样稿与状态确认**，先处理无选择、家具、门窗以及 1280/1440px 布局，再进入设计 Token 和实际布局实现。
