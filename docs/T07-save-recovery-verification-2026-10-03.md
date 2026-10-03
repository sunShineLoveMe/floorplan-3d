# T07 保存、备份与恢复可靠性验收

日期：2026-10-03。T07 本批已完成本地实现与复测。最终资源构建 `0a797fe1d69e03fd`，142 / 142 自动化测试、46 项新增原生浏览器检查、150 项既有原生流程回归通过；3D 标签另有 12 项细项核验，属于全屋检查的展开，不重复加入总数。完整机器结果见 [final-results.json](verification/T07-save-recovery/final-results.json)。

接续 `feat/ui-refactor` 当前工作区；HEAD 与远程分支均核对为 `7abfb7100fa3bdd40f20ebe8fd70f3da0067dfb4`。本批未提交、未推送、未合并、未部署。既有 8086 服务保留；验收在本批 8095 服务和隔离 Chrome 上下文运行，没有操作用户常用浏览器的工程。未读取或修改无关 `aws-tokyo-wireguard.yaml`。原始 [交接](T07-save-recovery-handoff-2026-10-03.md)、T06、所有原图和历史产物保留。

## 问题、影响与修复

| ID / 优先级 | 实际复现与影响 | 修复与证据 |
|---|---|---|
| T07-001 / P2 | 自动保存成功后刷新仍显示笼统的 Device storage only，不能准确说明已恢复保存副本。 | 加载结果记录实际来源与持久化结果；恢复 v2 显示 Saved on this device，初始工程与 v1 迁移保存失败分别显示真实状态。[基线](verification/T07-save-recovery/baseline/T07-001.png)、[最终正常保存](verification/T07-save-recovery/final/normal-save.png)。 |
| T07-002 / P1 | 配额拒绝时原设备副本和内存工程仍保留，但缺少直接重试入口；反复编辑会重复排队提示。 | 增加 Retry device save、Export this window；只在失败类型变化时提示，成功重试反馈恢复。最后成功已提交快照用于离页保护；Undo 回到精确设备修订不执行冗余写入。配额和 SecurityError、下载后重试 / 刷新、未持久化离页确认均通过。[失败备份](verification/T07-save-recovery/final/quota-memory.json)、[截图](verification/T07-save-recovery/final/quota-failure.png)。 |
| T07-003 / P1 | 合法 JSON 读取完成就替换工程；不能先备份或取消。Sample plan 只有简单确认，替换范围与独立备份关系不清楚。 | 导入 / 恢复示例共用项目审查对话框，显示当前与目标名称、完整替换范围、备份 / 继续 / 取消。New project 复用既有输入表单及备份 / Create and replace / Cancel，明确保留底图和单位。取消保留已提交工程、选择、单位、历史、无效字段草稿；备份不清空新房间输入。[审查](verification/T07-save-recovery/final/import-review.png)、[真实旧工程备份](verification/T07-save-recovery/final/before-import.json)。 |
| T07-004 / P1 | 同源两个页面交替编辑时，旧页面能无声覆盖新页面的最新版本。 | 每次保存先核对上次加载 / 成功写入的原始字节；另监听 storage 事件。冲突暂停写入，双方版本可真实下载；可读取另一版本，或明确覆盖并先归档另一版本。审查后再次发生写入会拒绝旧选择；备份失败也阻止覆盖。读取另一版本不刷新修改日期，避免制造多余冲突。[双窗口审查](verification/T07-save-recovery/final/window-conflict.png)、[本窗口](verification/T07-save-recovery/final/conflict-local.json)、[另一窗口原文](verification/T07-save-recovery/final/conflict-other.json)。 |
| T07-005 / P1 | 损坏 v2 不会静默回退，但编辑占位工程会自动归档并替换原文，缺少明确恢复选择和可发现的原文导出。 | 存在损坏数据 / 原始 legacy 时先暂停写入。Review recovery 提供原文下载、明确选择旧 v1 / 原始示例恢复，或归档原文并保存当前工程。recovery 和主写入分别失败时都保留原文；Device recovery copies 可导出原文，合法副本可以再次审查后打开，不清理旧键和副本。[恢复审查](verification/T07-save-recovery/final/corrupt-review.png)、[损坏 v2 原文](verification/T07-save-recovery/final/corrupt-original.json)、[损坏 v1 原文](verification/T07-save-recovery/final/corrupt-v1-original.json)。 |
| T07-006 / P1 | 使用原 HEAD store 和原保存订阅契约复现：事务预览期间 preferences 通知会保存未提交内容，随后 Cancel 不保存恢复值，设备留下预览。[原 HEAD 模块复现](verification/T07-save-recovery/baseline/preview-before.json)，不是原生浏览器基线。 | store 提供 getCommittedProject；自动保存和 JSON 导出只读取已提交快照。事务中 view 偏好单独进入已提交快照，Cancel 保留其已保存值。自动化覆盖 preferences + preview + Cancel；原生拖动、Escape、设备字节与 JSON 备份一致性通过。 |

读写规则仍使用原生 ESM、store 事务、v2 → v1 → legacy 格式优先级；内部 mm 浮点值、字段校验和旧键均保留。没有账户、后端或云同步，也没有自动合并、异步保存队列或 Saving 动画。

## 最低验收矩阵

| 场景 | 结果与证据 |
|---|---|
| 正常保存 / 刷新、单位切换、Undo / Redo | 成功状态对应已提交工程；退出不触发多余 beforeunload。实际刷新仍读取同一修订。 |
| 配额 / SecurityError，恢复权限 | 原设备字节不变；内存仍能编辑、实际下载；重试后下载内容与新设备副本一致，刷新恢复。无效草稿没有进入 JSON。 |
| v1 迁移失败 / 重试 | 加载旧工程成功但不误报 v2 已保存；直接备份、重试成功；原 v1 保持原文。 |
| 损坏 v2 + 同时有效 v1 / legacy；损坏 v1 + 有效 legacy | 不自动回退或覆写；损坏原文真实下载；明确选择后才能恢复。recovery 写入失败与主写入失败分别注入，原文均保留，成功重试不清理任何已有副本。 |
| 合法 / 无效 / 超大 / future JSON，迟到读取 | 无效文件不显示替换审查、不修改存储；10 MiB 上限有效。读取期间编辑会取消迟到文件。合法审查可以备份 / 取消；继续后导入，Undo / Redo 恢复完整旧工程。 |
| New project / Sample plan | 新房间输入在导出时保持；取消不修改工程；确认生成目标；撤销 / 重做、刷新保存一致。 |
| 两个同源页面交替编辑 | storage 事件与保存前字节复核均生效；两个版本均实际下载；再次写入使旧审查选择失效；归档失败拒绝覆盖；归档成功后可以读取恢复副本。 |
| JSON 下载并回导 | 最终构建中 Jacobsen、CMU、修正 Plan F 和四套斜切均完成原生 2D / 3D、真实下载、刷新与实际文件回导；除导入更新时间 / 显式视图切换外逐项比较所有项目字段。独立 Python 原始 JSON 对比通过 7 工程与 2 原文，共 9 项。 |
| 390 px | 文件菜单中的失败重试 / JSON 备份可操作；替换对话框无横向溢出。见 [保存入口](verification/T07-save-recovery/final/mobile-recovery.png)、[替换审查](verification/T07-save-recovery/final/mobile-review.png)。 |
| T06 与全屋复用 | 三户型使用区、四斜切、净宽路径、Plan F 修正、固定障碍物、Jacobsen / CMU 原生全屋建模 / 3D 标签 / PNG / PDF 和持续键盘 / 摇杆回归通过。 |

JSON 与原文下载已用 Playwright download 捕获、saveAs 写入实际文件、检查 failure 并读取内容；不是只断言按钮点击。提示只承诺 Download started；磁盘写入确认不代表云备份。旧格式文件还验证了原文下载在实际迁移前启动。

## 机器结果与资源版本

- 最终 [新增浏览器结果](verification/T07-save-recovery/final/browser-results.json)：46 项、构建 `0a797fe1d69e03fd`、无 pageerror；[142 项自动化测试](verification/T07-save-recovery/unit-tests.txt)、[构建](verification/T07-save-recovery/build.txt)、[ESLint](verification/T07-save-recovery/eslint.txt)、[diff](verification/T07-save-recovery/diff-check.txt)、[独立下载对比](verification/T07-save-recovery/independent-download-results.json)。
- 本批重新执行的使用区 / 漫游回归共 48 项：使用区 27、连续键盘 / 摇杆 18、三户型摇杆 3。既有其他流程 102 项：净宽 22、斜切 43、Plan F 7、固定物 8、两份全屋各 11。全屋标签细项各 6，包含于全屋流程；不重复累计。
- 回归文件保留各自实际资源号。使用区报告为 `2f9482e83e823fd6`；斜切和 Plan F 部分为 `da594a6ecf440475`；全屋与净宽为 `77b4cbe9fc1a5ee6`；最终 T07、固定物与三户型摇杆为 `0a797fe1d69e03fd`。连续漫游按各 trace 的 build 记录，期间有重新加载，不能将所有回归都宣称来自最终资源号。中间差异只涉及来源文案、恢复 / 已存修订处理，未更改 T06 几何和漫游代码；最终 T07 七工程复测覆盖最终保存链。
- [独立使用区结果](verification/T07-save-recovery/use-zones/independent-use-zone-results.json)：Shapely 重建 7 模型 / 24 区，真实 PDF 布局核验通过。[独立漫游采样](verification/T07-save-recovery/use-zones/independent-walk-results.json)：24 条 trace / 705 点与净地面 / 实体距离阈值复核通过；只验证采样点，连续扫掠由生产逻辑与自动化测试验证。`use-zones/walk-final` 和 `use-zones/joystick-layouts` 为本批对应输出的相对符号链接，供既有独立检查器读取，不复制或覆盖历史结果。

基线 [context.json](verification/T07-save-recovery/baseline/context.json)注明原始构建 `bad34d23ec95f5e4`。初次基线脚本误查不存在的 app-build meta，原结果的 build 为 null；保留原文件，在 context 中补充通过原 HEAD HTML 核对的资源号。

失败尝试、截图和日志均保留。`attempt-01` 暴露读取另一版本更新日期的问题，已修复；`attempt-02` 的窄屏脚本没先打开家具库；`attempt-03` / `final-attempt-02` 枚举误包含 `.log`；`final-attempt-01.log` 是脚本变量重名。`passage-regression` 窄屏步骤误将已展开抽屉再次关闭，脚本已改为按实际 aria-expanded 操作，`passage-final` 全部通过。这些失败不充作通过项。`final-attempt-03` 是增加“Undo 回到已存修订不冗余写入”前的通过记录，最终以 `final/` 为准。

## 复测命令

在隔离端口 / 上下文运行，不操作用户常用浏览器数据。再次复测使用新的输出目录，不覆盖本批历史。

```bash
npm test
npm run build
node /Users/chris/.npm/_npx/515228b7c8d004a2/node_modules/eslint/bin/eslint.js src --config tests/eslint.config.js
python3 scripts/serve.py --port 8095
TEST_URL=http://127.0.0.1:8095/ T07_TEST_OUT=docs/verification/T07-save-recovery-next/final node tests/browser-t07-save-recovery.mjs
python3 scripts/check-save-recovery-exports.py docs/verification/T07-save-recovery-next
git diff --check
```

本地外部 Playwright 路径通过 `PLAYWRIGHT_MODULE` 可覆盖，Chrome headless / SwiftShader，1440 × 1000、390 × 844。原有回归已改为使用 `tests/helpers/project-protection.mjs` 点击真实产品的 Continue replacement，再继续原流程。各脚本输出环境变量和原命令见 [T06 第二批验收](T06-use-zones-verification-2026-10-03.md)，本批完整文件路径与数量见机器结果。

## 未测范围

本批双窗口覆盖保护验收为同源页面交替写入和审查后版本变化；同步 localStorage 的“检查后写入”没有跨进程原子比较交换，不声明解决严格同一时刻多写者竞争，也不声明自动合并、账户隔离或云同步。浏览器不保证所有环境都展示离页确认，因此主动 JSON 备份仍是迁移 / 独立保留路径。

未验证 Safari / Edge、真实触屏 / 多指、物理打印机、设备损坏、站点数据被用户清除后的恢复、长期大量恢复副本容量压力。T06 原范围继续保留：真实铰链 / 抽屉扫掠、家具高度、同时使用、使用区可达性、多层、任意大模型精确最大净宽、法规合规。`sourceWholePlanAccepted: false` 与原图未知尺寸继续保留；本批新增原住宅完整实测验收数量为 0。
