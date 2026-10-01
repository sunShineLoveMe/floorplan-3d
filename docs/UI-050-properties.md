# UI-050｜右侧上下文属性

日期：2026-10-01，分支 `feat/ui-refactor`。已接入真实页面，尚未提交、推送。

- 无选择时显示轻量提示与房间设置入口，保持宽屏右栏宽度。
- 家具只展示现有名称、尺寸、坐标、旋转、颜色和对象操作；房间/门窗区隐藏。
- 房间保留名称、尺寸摘要、地板和房间内家具，编辑净尺寸/门窗继续通过已有操作。材料价格与估价从默认房间属性移入项目详情。
- 墙体展示已有墙选择与相应门窗列表；门/窗只展示选中条目摘要和已有编辑、删除入口，标题区分门/窗，不显示内部 ID。完整字段仍复用原弹窗。
- 原总览、面积、示例 CNY 估价、统计、清除测量/布置与快捷键保存在折叠的 Project details / Advanced 中；沿用原计算和动作，没有删除功能或新增数据实体。

文件：[property-panel.js](../src/ui/property-panel.js)、[room-editor.js](../src/ui/room-editor.js)、[main.js](../src/main.js)、[workspace.css](../styles/workspace.css)。

## 验证

独立 Chromium context：38 项 Node 测试，5 组属性专项，7 组编辑基线，9 组 T03 主流程回归。属性专项验证无选择/家具/房间/门/窗、真实尺寸与材料修改、精确撤销、原门窗弹窗、内部 ID 隐藏、统计动作保留与画布宽度稳定。

证据：[属性结果](verification/UI-050/properties-results.json)、[基线](verification/UI-050/baseline/baseline-results.json)、[T03](verification/UI-050/t03-regression/browser-results.json)、[Node 日志](verification/UI-050/unit-tests.log)。回归通过公共“房间 / 门窗”入口进入当前结构上下文，不强制点击隐藏控件；原几何精度比较未放宽。

截图：[无选择](verification/UI-050/none.png)、[家具](verification/UI-050/furniture.png)、[房间](verification/UI-050/room.png)、[门](verification/UI-050/door.png)、[窗](verification/UI-050/window.png)。复现沿用 UI-010 的 Playwright 环境，专项执行 `node tests/browser-ui-properties.cjs`；基线/T03 使用 UI-050 对应 TEST_OUT。

未验证 Safari、Firefox 或真实触控设备。当前字段重绘仍沿用旧生命周期，输入草稿与语言切换问题留给 UI-080；估价沿用原人民币示例价，没有变更为北美报价。下一项 UI-060 整理画布视图与工具。
