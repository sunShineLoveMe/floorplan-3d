# UI-030｜顶部项目栏与菜单

> 本页为该批次交付时的历史记录；当前实现、提交状态和验收边界见 [UI 最终交付](UI-final-delivery.md)。
日期：2026-10-01，分支 `feat/ui-refactor`。真实编辑器已接入，尚未提交或推送。

- 顶栏保持 64px，显示真实项目名、撤销/重做、设置和导出/文件入口。长名称截断，历史禁用状态继续由 store 驱动。
- 文件菜单集中新建房间（替换方案）、清空布置、实际 PNG/JSON 导出、导入和示例户型。导出入口使用强调色，不增加虚假保存或云同步标记。
- 单位、语言、全屏归入设置。图层、相机、墙高、夜景和日照归入画布工具区的视图设置。
- 桌面工具区无需横向滚动；700px 以下分成两行，保留 2D/3D 和常用工具。移动端顶栏优先保留动作，项目名暂不显示，最终窄屏细节由 UI-140 继续完善。
- 菜单互斥打开，点击外部关闭；Escape 关闭并返回入口焦点。弹层 pointerdown 不传到画布，复用原动作和控件 ID。

## 验证

Chromium 独立 context：38 项 Node 测试、7 组原编辑基线、9 组 T03 主流程回归通过。菜单专项检查涵盖 1440/1280/390px 长名称、无页面/工具横向溢出、Escape 焦点返回、单位/图层切换与真实 3D 墙高、相机、夜景、日照操作。

证据：[专项结果](verification/UI-030/project-bar-results.json)、[编辑基线](verification/UI-030/baseline/baseline-results.json)、[T03](verification/UI-030/t03-regression/browser-results.json)、[Node 日志](verification/UI-030/unit-tests.log)。测试通过菜单入口访问搬迁后的控件，原尺寸精度比较不变；图层往返比较排除正常更新的 updatedAt。

[1280 项目栏](verification/UI-030/project-bar-1280.png)、[390 窄屏](verification/UI-030/project-bar-390.png)、[3D 设置](verification/UI-030/view-settings-3d.png)。复现命令沿用 UI-010 的 Playwright 环境，专项执行 `node tests/browser-ui-project-bar.cjs`；其他脚本使用 `TEST_OUT=docs/verification/UI-030/baseline` / `t03-regression`。

未验证 Safari、Firefox 和真实触控设备。语言切换刷新属性输入草稿的问题仍待 UI-080；左右面板内容整理属于下一批 UI-040/050。
