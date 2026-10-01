# UI-040｜左侧 Room / Furniture

> 本页为该批次交付时的历史记录；当前实现、提交状态和验收边界见 [UI 最终交付](UI-final-delivery.md)。
日期：2026-10-01，分支 `feat/ui-refactor`。已接入真实编辑器，尚未提交或推送。

## 实现

- 左侧分为 Room / Furniture 两个标签，默认家具；支持点击与方向键、Home/End 切换，标签切换不改项目数据或销毁画布。
- 房间列表由公共 UI 维护，启动 2D 时即可使用；3D 模块只维护场景标签与相机，不再写入或清空左侧列表。
- 房间按钮在 2D 选择并定位房间，在 3D 选择并沿用原相机定位；全屋表示当前场景视野，不切换项目或账号。
- Room 保留新建房间方案和房间/门窗入口，调用原动作，明确新方案会替换当前方案。无房间时显示空状态。
- 家具卡片复用现有目录、SVG 和尺寸，统一预览区域与两列排列；摘要标明宽/深与 mm/in，英制一位小数加 ≈。完整分数尺寸保留在 title 和属性区，模型值不舍入。
- 常规和较长名称允许换行；类别标题允许换行。现有 280px 面板和窄屏抽屉保持两列可读卡片，没有新增搜索、自定义家具或依赖。
- 原点击/指针拖拽添加保留，卡片另支持 Enter/Space 添加。

涉及：[index.html](../index.html)、[furniture-library.js](../src/ui/furniture-library.js)、[main.js](../src/main.js)、[viewer.js](../src/viewer3d/viewer.js)、[workspace.css](../styles/workspace.css)。

## 验证

Chromium 独立 context，未接触用户浏览器配置。

| 检查 | 结果 |
|---|---|
| Node | 38 项通过，[日志](verification/UI-040/unit-tests.log) |
| 左侧资源专项 | 6 组通过，[结果](verification/UI-040/resource-results.json)：2D 房间定位、原新方案/门窗入口、键盘添加、真实拖拽、正确目录尺寸与撤销、标签键盘导航、真实 3D 全屋定位、390px 抽屉 |
| 编辑基线 | 7 组通过，[结果](verification/UI-040/baseline/baseline-results.json)，13 张截图，真实下载/刷新/WebGL |
| T03 | 9 组通过，[结果](verification/UI-040/t03-regression/browser-results.json)，尺寸精度、单位切换、拖动/取消/撤销、测量、JSON/PNG 下载与旧文件导入 |

截图：[2D 房间](verification/UI-040/rooms-2d.png)、[家具目录](verification/UI-040/furniture-1280.png)、[3D 房间](verification/UI-040/rooms-3d.png)、[390 抽屉](verification/UI-040/furniture-390.png)。复现沿用 UI-010 Playwright 环境，执行 `node tests/browser-ui-resources.cjs`；其他回归脚本使用 UI-040 下对应 TEST_OUT。

未验证 Safari/Firefox 或真实触控设备。右栏仍使用原结构和属性内容，下一项 UI-050 做上下文整理；语言刷新输入草稿仍待 UI-080。搜索、分类筛选增强属于 UI-110。
