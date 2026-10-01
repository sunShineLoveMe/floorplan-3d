# UI-020｜编辑器整体布局

> 本页为该批次交付时的历史记录；当前实现、提交状态和验收边界见 [UI 最终交付](UI-final-delivery.md)。
日期：2026-10-01。分支：`feat/ui-refactor`。已在真实编辑器接入，尚未提交或推送。

## 实现

- 顶栏固定 64px，保留项目名称、面板开关与文件菜单。编辑工具移入独立 60px 工具区，暂以横向滚动保留全部原有动作；低频动作的菜单归位由 UI-030 完成。
- 1224px 起默认左栏 280px、右栏 304px；1440/1280px 下画布分别为 856/696px。宽屏选择与取消选择不自动收起面板，用户可手动收起，保持原有面板偏好存储。
- 900～1223px 左栏停靠、属性栏覆盖；899px 以下两个侧栏均为覆盖抽屉。关闭按钮返回开关焦点，隐藏面板使用 inert，不允许键盘落入不可见字段。
- 左右面板独立滚动，禁止滚动链影响画布；低高度窗口保留可滚动字段和操作区。
- SVG、stage 与 WebGL canvas 保留原节点，复用已有 ResizeObserver 调整 2D 坐标视野、3D 渲染尺寸和相机比例。未新增渲染器、状态实体或依赖。

生产改动：[index.html](../index.html)、[workspace.css](../styles/workspace.css)、[dom.js](../src/ui/dom.js)、[drawers.js](../src/ui/drawers.js)、[toolbar.js](../src/ui/toolbar.js)。

## 验证

独立 Chromium context，不访问用户浏览器配置。

| 检查 | 结果 |
|---|---|
| Node 测试 | 38 项通过，[日志](verification/UI-020/unit-tests.log) |
| 布局专项 | 5 组通过，[结果](verification/UI-020/workspace-results.json)；1440/1280 尺寸、真实 SVG 命中、展开收起、独立滚动、1024 抽屉、390 与 480px 低高度、WebGL 尺寸和节点身份 |
| 原编辑基线 | 7 组通过，[结果](verification/UI-020/baseline/baseline-results.json)；13 张截图、真实文件下载、刷新和 WebGL |
| T03 主流程 | 9 组通过，[结果](verification/UI-020/t03-regression/browser-results.json)；精度、拖动缩放、单位、撤销重做、测量、实际 JSON/PNG 下载、旧文件导入 |

布局专项对项目业务数据做精确比较，排除主动切换的 view 和 updatedAt；未放宽几何比较。初次并行基线运行出现页面初始化超时，独立重跑通过。

截图：[1280 选中家具](verification/UI-020/selected-1280.png)、[1024 抽屉](verification/UI-020/drawer-1024.png)、[390 窄屏](verification/UI-020/reachable-390-844.png)、[低高度](verification/UI-020/reachable-1280-480.png)、[3D 收起侧栏](verification/UI-020/3d-expanded-canvas.png)。

复现：沿用 UI-010 记录的 PLAYWRIGHT_MODULE / CHROMIUM_EXECUTABLE，执行 `npm test`、`node tests/browser-ui-workspace.cjs`，基线与 T03 分别使用 `TEST_OUT=docs/verification/UI-020/baseline` 和 `TEST_OUT=docs/verification/UI-020/t03-regression`。

## 阶段限制

工具区尚需横向滚动，UI-030/060 将把低频设置与视图动作归位。右栏仍包含原结构和属性内容，UI-050 才进行上下文过滤；房间列表仍由原 3D 模块生成，UI-040 处理。原有语言切换丢失输入草稿、文件菜单 Escape 未关闭等基线问题仍待对应任务。

未验证 Safari、Firefox 或真实触控设备。本批次不代表最终移动端交付。
