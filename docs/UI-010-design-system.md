# UI-010｜设计 Token 与基础控件

日期：2026-10-01。分支：`feat/ui-refactor`。依据 [UI 方案](frontend-ui-refactor-plan-v1.0.md)、[UI-000 基线](UI-000-baseline.md) 和 [UI-005 样稿](UI-005-interaction-draft.md)。本批次已接入真实编辑器；仍保留旧布局，下一批重组工作区。

## 已完成的改动

| 文件 | 职责 |
|---|---|
| [styles/tokens.css](../styles/tokens.css) | 浅色、中性背景、深绿强调、文字/边界/危险色、字体、间距、圆角、尺寸与阴影变量；兼容旧变量名 |
| [styles/controls.css](../styles/controls.css) | 作用于 `.app`、`.room-dialog` 与 `.ui-samples` 的按钮、字段、状态、面板标题、卡片、弹窗、浮动条与反馈样式 |
| [styles/app.css](../styles/app.css) | 去掉原根部调色板，保留既有网格、抽屉、SVG/3D 动画与业务选择器 |
| [index.html](../index.html) | 加载 Token → 既有布局 → 控件样式；theme-color 更新；缩放按钮增加 44px 点击区域与可访问名称 |
| [src/services/downloads.js](../src/services/downloads.js) | 导出 SVG 栅格化前将测量标注的实际 fill/stroke 写入副本，保留主题颜色；不改几何、输出尺寸或数据格式 |
| [控件样例页](ui-samples/UI-010/index.html) | 直接加载生产样式，展示各种控件状态；示例动作不访问用户项目 |
| [browser-ui-controls.cjs](../tests/browser-ui-controls.cjs) | 检查真实渲染状态、尺寸、焦点、错误反馈、对比度数值与多视口可达性 |

没有新增 npm 依赖、UI 框架、字体服务或图标库。默认使用系统无衬线字体；当前并无 Inter 资源，不为本次新增网络字体。

旧选择器继续工作：`--bg / --paper / --panel / --line / --ink / --muted / --accent / --accent-soft / --teal` 映射到共享 Token，既有事件、选择、表单、store 与渲染生命周期不需要重接。

## 样例与状态

打开 [控件状态页](http://127.0.0.1:8086/docs/ui-samples/UI-010/) 或[真实编辑器](http://127.0.0.1:8086/)。已有服务继续使用 8086，无新增后台服务。

- 常规按钮、表单输入和下拉框以 40px 为基准；独立缩放图标按钮使用 44×44px。多行房间/门窗条目允许高于基准。
- Primary 为深绿白字；Secondary 有可辨认边界；Ghost 降低强调；危险操作用红色文字与错误颜色。
- Selected 使用浅绿背景、绿边界和较高字重；Disabled 使用浅背景、虚线边界与明确禁用光标。历史按钮已有 inline opacity，样式层仅覆盖该视觉值，disabled 行为仍由原逻辑决定。
- 键盘 `focus-visible` 使用 2px 外轮廓；输入错误用红边与关联提示，非颜色单一提示。普通字段 14px，触控模式输入 16px。
- 加载外观只在状态页示例中演示；没有给同步本地保存加入虚假等待动画。
- 基础排版：项目名 16px，面板分组标题 14px，字段标签 13px，辅助文字 12px；数值使用 tabular-nums。
- 现有弹窗、菜单、Toast 与浮动条共享表面色、圆角与阴影。没有为每个内容区域添加新卡片。
- 2D 选中层与测量层通过 CSS 兼容原渲染属性换色，不改算法或命中检测；测量标注导出时带上解析后的主题颜色。
- 本轮保留既有文字/符号工具按钮，字号统一，不新增彩色 emoji 或另一套图标资源。顶部入口重排与进一步图标整理在 UI-030 实施。

状态页覆盖 Button、IconButton、Tabs/状态切换、Field、NumberField、Select、Popover、Dialog、Tooltip、Toast、EmptyState 和表单分组。名称指样式职责，未引入组件框架。

## 验证证据

使用独立、非持久化 Chromium 149.0.7827.55 context，不读写用户浏览器配置。结果仅代表该环境，未验证 Safari / Edge / Firefox 或真实触控设备。

| 检查 | 结果与证据 |
|---|---|
| 现有 Node 测试 | 38 项通过，[unit-tests.log](verification/UI-010/unit-tests.log) |
| 控件与真实页面检查 | 5 组通过，[control-results.json](verification/UI-010/control-results.json)；含 normal/hover/实际键盘 focus、disabled、输入 error、40/44px、弹窗按钮与焦点返回 |
| 既有编辑基线 | 7 组通过，13 张真实页面截图，[baseline-results.json](verification/UI-010/baseline/baseline-results.json)；包含选中、尺寸/撤销重做、侧栏、单位、JSON 下载/刷新和真实 WebGL |
| T03 主流程回归 | 9 组通过，[browser-results.json](verification/UI-010/t03-regression/browser-results.json)；含 100 次单位切换、拖动/缩放/测量、取消手势、JSON/PNG 实际下载、旧文件/v1 导入与 390px 表单 |
| 源码与脚本检查 | 见 [source-checks.json](verification/UI-010/source-checks.json)；数据、store、2D/3D 与 UI 业务 JS 哈希与 UI-000 一致，仅下载服务增加呈现颜色的副本处理 |

T03 手势测试补充等待视图 CSS 动画结束，并断言坐标命中实际缩放手柄，避免切换视图时过早取坐标；原尺寸精度断言保持不变。

Token 计算检查：主要/次要/辅助文字、brand 和 danger 在白色及 subtle 表面上的对比度均 ≥4.5；brand 白底约 7.76，辅助文字 subtle 底约 4.86。这里只验证这些颜色组合，不等于全应用无障碍认证。渲染尺寸检查容许 0.01 CSS px 的变换计算误差，项目几何比较仍保持严格不漂移。

截图：[状态样例](verification/UI-010/control-states.png)、[弹窗状态](verification/UI-010/dialog-states.png)、[真实输入错误](verification/UI-010/real-field-error.png)、[真实家具选中](verification/UI-010/baseline/furniture-selected-1440.png)、[真实 3D](verification/UI-010/baseline/room-3d-1440.png)。前后对照使用 UI-000 同名状态与同一基线文件。

复现命令：

```bash
export PLAYWRIGHT_MODULE=/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright
export CHROMIUM_EXECUTABLE=/Users/chris/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell
npm test
node tests/browser-ui-controls.cjs
TEST_OUT=docs/verification/UI-010/baseline node tests/browser-ui-baseline.cjs
TEST_OUT=docs/verification/UI-010/t03-regression node tests/browser-t03.cjs
```

## 当前布局与后续边界

40px 控件接入后，1440/1280px 英文基线顶部实测约 121px（UI-000 原约 96px）；1024px 约 173px，390px 约 467px。未出现整页横向溢出，画布与表单仍可用，但窄屏顶栏占位较多。这是保留旧功能排列的阶段限制，不能把当前界面称为已完成 64px 顶栏或移动端最终布局。

不通过隐藏核心按钮规避该问题。下一项 **UI-020：编辑器整体布局** 将固定顶部、重组左右面板并保证 CanvasHost 稳定；随后 **UI-030** 将视图/灯光/语言等迁入对应位置。

UI-000 已记录的文件菜单 Escape、语言刷新草稿丢失、3D 房间列表耦合、内部 ID 和估价混放仍待 UI-040～080 处理，本轮未声称修复。模型本身材质与颜色保持原值；UI-005 样稿仍是独立设计依据。

本任务产物在当前分支工作区，尚未提交、推送或部署。
