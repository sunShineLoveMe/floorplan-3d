# UI-005｜关键交互样稿

日期：2026-10-01。分支：`feat/ui-refactor`。依据 [UI 方案 v1.1](frontend-ui-refactor-plan-v1.0.md) 与 [UI-000 基线](UI-000-baseline.md)。本任务提供后续实现的交互与布局依据，未替换生产编辑器。

## 可审查结果

已有本地服务时打开 [交互样稿](http://127.0.0.1:8086/docs/ui-prototypes/UI-005/)。源文件为 [index.html](ui-prototypes/UI-005/index.html)、[prototype.css](ui-prototypes/UI-005/prototype.css) 与 [prototype.js](ui-prototypes/UI-005/prototype.js)。通过 HTTP 打开，不能直接使用 file://。

上方审查工具可切换视口和场景；在画布上点床、书桌、椅子、门、窗或房间地面可查看对应属性。左侧标签与面板开关不会取消选择。右侧 Change 可查看单位切换；门窗编辑、新建方案可查看表单与替换提示。

样稿使用 UI-000 的真实尺寸文件，以及现有 `units.js` / `furniture-symbols.js` / `catalogs.js`。画布是按该文件绘制的二维示意，不是生产引擎；不支持拖动、测量、保存、导入导出、撤销或 3D。这些业务动作在样稿中禁用，并在审查页顶部明确说明。字段只读，避免把取整摘要误当作精确输入；单位仅影响样稿显示，项目文件不变。

不显示 Saved、云同步、账户或收费入口。`Export project` 的生产目标是既有 v2 JSON 导出，图片导出保留在 File 中；样稿不会生成导出文件。

## 本轮落实的交互决策

| 场景 | 左侧 | 中间 | 右侧 |
|---|---|---|---|
| 无选择 | Room / Furniture 可切换 | 2D 模式与已有视图工具位置明确 | 固定宽度，轻提示与 View room details |
| 房间 | 房间列表及门窗入口 | 当前房间 | 名称、净宽深高、面积、地面材料；净尺寸通过已有弹窗编辑 |
| 家具 | 资源库保持当前标签 | 对应家具选中边界 | 宽深、中心 X/Y、旋转、名称、颜色与对象动作，不新增高度 |
| 门 | Room 中可选 Door | 上墙门高亮 | 父墙方向、宽高、偏移、铰链与开启方向；Edit door 打开表单 |
| 窗 | Room 中可选 Window | 右墙窗高亮 | 父墙方向、宽高、偏移、窗台高；Edit window 打开表单 |

- 顶部只有项目名称、撤销重做、文件、设置与项目导出位置；名称可截断，低频显示控制退出顶栏。
- 宽屏无选择与选中对象保持同一右栏宽度。用户主动收起右栏后，Properties 可重新打开；面板显示与选择分开。
- 单位在属性区常显，Change 进入项目设置；精确输入格式复用 T03，不强制拆成 ft / in 两个字段。门窗摘要带 ≈ 时只是显示，编辑弹窗使用精确格式。
- 左侧资源卡片名称使用中性家具名，宽深分行且标明 W / D；不把现有公制床型改名为 Queen / King。家具缩略图来自现有模型符号，不用新的实拍或生成图片。
- 门窗只展示自然名称与父墙，隐藏内部 ID。位置基准采用“墙起点到洞口起边”，右墙为上到下，顶部墙为左到右。
- `New room plan` 明示替换当前项目，表单标题、备份入口、说明与 `Create and replace` 一致。不承诺追加第二个房间。
- 原 CNY 示例估价、全屋统计进入 File → Project details，保留对应真实逻辑；清空家具以项目全部家具为范围。
- 文件与显示浮层可用 Escape 关闭并回到触发按钮；模态框关闭也返回触发位置。资源标签可通过方向键、Home / End 切换。
- 3D 首轮保留原引擎和既有 Orbit / Walk、Camera / Visibility / Lighting；本任务没有制作或测试 3D 新外壳，不将禁用的 3D 样稿按钮当作生产行为。

## 侧栏规则

| 宽度 | 左栏 | 右栏 | 画布 |
|---|---|---|---|
| 1440px | 280px | 304px，默认展开 | 856px |
| 1280px | 280px | 304px，默认展开 | 696px |
| 1024px | 280px，支持收起 | 304px 可关闭覆盖抽屉，默认关闭 | 容器保持 744px；打开抽屉会暂时遮住右部 |

两栏同时展开条件为“可用宽度 − 280 − 304 ≥ 640”，无其他边距时临界点为 1224px；不机械地把 1200px 判为可双栏。真实实现应依据容器宽度，而非只看设备名。

抽屉是临时编辑覆盖层，打开时实际可见画布变窄，不能宣称全部可见区域仍 ≥640px。Escape / 关闭按钮可恢复画布；选择不应因此清除。现有 2D/3D CanvasHost 保持挂载；生产版仍通过现有 ResizeObserver 更新尺寸。样稿中视觉缩放是审查工具对整个预览的缩放，不能搬到生产 Canvas 作为 resize 实现。

1024px 以下的细化与真实触控仍属后续任务，本稿不作为移动端完整验收。

## 关键截图

| 状态 | 1440 × 900 | 1280 × 800 |
|---|---|---|
| 无选择 | [截图](verification/UI-005/1440-none.png) | [截图](verification/UI-005/1280-none.png) |
| 房间属性 | [截图](verification/UI-005/1440-room.png) | [截图](verification/UI-005/1280-room.png) |
| 家具属性 | [截图](verification/UI-005/1440-furniture.png) | [截图](verification/UI-005/1280-furniture.png) |
| 门属性 | [截图](verification/UI-005/1440-door.png) | [截图](verification/UI-005/1280-door.png) |
| 窗属性 | [截图](verification/UI-005/1440-window.png) | [截图](verification/UI-005/1280-window.png) |

补充：[窗编辑表单](verification/UI-005/window-edit-dialog.png)、[新建替换提示](verification/UI-005/new-plan-replacement-dialog.png)、[1024px 属性抽屉](verification/UI-005/1024-properties-drawer.png)、[可交互审查页](verification/UI-005/review-board.png)。共 14 张截图。

## 验证与限制

使用隔离 Chromium 149.0.7827.55，执行 [browser-ui-prototype.cjs](../tests/browser-ui-prototype.cjs)。实际结果见 [results.json](verification/UI-005/results.json) 和 [browser.log](verification/UI-005/browser.log)。检查桌面尺寸、五种选中态、侧栏收起与恢复、无选择时画布宽度、家具指针与键盘选择、门窗表单、新建替换语义、Escape 与焦点、单位显示和 1024px 抽屉。

```bash
export PLAYWRIGHT_MODULE=/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright
export CHROMIUM_EXECUTABLE=/Users/chris/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell
node tests/browser-ui-prototype.cjs
```

无新增运行依赖；无生产模块、index.html 或 app.css 修改；未读写用户项目或 localStorage。测试检查的是样稿的布局与交互，不替代 UI-090 的真实引擎、文件、历史与数据回归。未测试 Safari、真实触控或真实用户；设计方向尚未经过用户试用验证。

## 实施接续

UI-005 的关键状态和交互规则已形成可审查交付。下一项 **UI-010** 将颜色、排版、按钮、输入、标签与状态样例接入生产样式层，沿用现有类和原生模块。生产版按钮恢复真实可用状态，不能照搬样稿的 readonly / disabled。

UI-020 再接入 Shell：固定 64px 顶栏、280/304px 面板与按容器宽度收起；UI-040/050 接现有选择与表单。不要直接用本稿的二维示意替代真实 SVG/Three.js 编辑器，也不要把示意图的取景当作新相机算法。
