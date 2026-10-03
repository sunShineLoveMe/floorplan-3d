# T08 Computer Use 本机验证 — 2026-10-03

结论：本轮实际操作范围内未发现阻断问题。8086 本地服务继续运行，Chrome 无痕窗口保留独立测试工程 `CUA T08 native test`，页面缩放已恢复 100%。普通 Chrome 窗口原有工程未编辑。本轮未修改产品代码，未提交、推送或部署。

## 方法与环境

用户要求启动项目并通过 computer use 测试。复用现有 `127.0.0.1:8086` 服务（Python PID 20514），通过 `mcp__cua_repl` 操作本机 Google Chrome 无痕窗口；使用原生可访问性控件、按键及截图观察，没有用 Playwright、DOM 注入或脚本直接写入浏览器数据替代本轮 UI 操作。字段值主要通过原生 AX `setValue` 输入，不能等同于全部物理逐字键入。截图证据在本次会话工具输出中，未保存为仓库图片。

## 实际操作结果

| 检查 | 结果及可观察证据 |
| --- | --- |
| 空数据启动 | English / Feet & inches，12 × 10 × 8 ft 初始房间，无家具；Help 五步可展开。 |
| 房间表单 | 名称必填；空名称 Apply 被英文错误阻止。修正为 `CUA bedroom`，12 × 10 × 8 ft，120 sq ft；显示已保存。 |
| 门 | Top 墙，offset 2 ft、width 3 ft、height 7 ft，Apply 成功；恢复后仍显示 2 ft → 5 ft。 |
| 家具搜索和添加 | Queen 搜索只显示匹配卡片，点击添加 60 × 80 in 床垫示例；高度仍为 Unspecified。 |
| 尺寸错误 | `5'12"` 显示 Combined inches must be below 12，并禁用单位切换；原占地仍 60 × 80 in。 |
| 分数尺寸 | 改为 60 1/8 × 80 3/8 in，占地和属性同步更新。 |
| 门扇冲突 | 初始放置显示 1 potential door conflicts；中心移到 78 / 70 in 后提示消失。 |
| Undo / Redo | 按钮撤销 Y：回到 60 in 并重新显示冲突；重做恢复 70 in，冲突消失。Help 焦点下 Cmd/Ctrl+Z 不改变工程，符合菜单隔离规则。未把该操作算作画布键盘撤销验证。 |
| 3D | 实际截图显示房间墙、门、地板和床架；可返回 2D。 |
| 下载 | 原生 Save 对话框保存 JSON 到 Downloads，Chrome 显示 3.4 KB、完成。 |
| 刷新 | Cmd+R 后保持工程名、房间、门和家具；Export/File 显示 Restored from this device。 |
| 200% 页面缩放 | Chrome 控件明确显示 200%；Help 在视口内，内容可滚动到末尾及 Close Help。Escape 关闭，焦点返回 Help；结束恢复 100%。 |
| JSON 恢复 | 原生 Open 对话框选择刚导出的测试文件，经过替换预览后 Continue replacement；显示 Project imported。通过 Room Areas → 房间 → Furniture in room 按钮重新选择床架，确认尺寸 60 1/8 × 80 3/8 in、中心 78 / 70 in、高度 Unspecified。 |

## 下载内容独立校验

[实际导出 JSON](verification/T08-english-onboarding/computer-use-01/native-export-project.json) 与 [磁盘校验](verification/T08-english-onboarding/computer-use-01/disk-check.json)。解析格式 v2，并用断言核对房间、门、床架分数尺寸、中心和未指定高度；全部通过。内部单位仍为 mm，浮点数按 1e-7 mm 容差核对。

## 边界和工具限制

一次 native `paste` 在表单中没有插入预期内容，导致空值；一次修改尺寸后的 `click` 使用了已经重绘失效的 AX 索引。通过重新观察与 `setValue` 继续成功，未据此认定产品缺陷。地址栏 paste 正常。没有完整验证剪贴板输入法链路。

本轮为单个合成房间原生操作补充，不覆盖多户型、真实用户试用、屏幕阅读器、Safari / Edge、实机手机、所有画布键盘快捷键、物理拖拽、PNG / PDF 或参考图导入。实际 200% 验证仅对应此 Chrome 窗口。无痕保存只在当前无痕会话存续；测试 JSON 是独立磁盘备份。

既有 145 Node / 157 浏览器 / 23 磁盘检查属于此前自动化验收，本轮不重复登记到其数量中。
