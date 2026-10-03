# T05 编辑交互可靠性验收

日期：2026-10-03。接续 `feat/ui-refactor` 现有工作区，保留 T04 未提交实现、原始图纸、历史证据及其他文件。确认并修复 7 项编辑可靠性问题；精确坐标与房间 / 门窗原子提交沿用已有实现，没有新建编辑系统或依赖。

最终构建 `cd2cb1233220bc6e`，144 / 144 自动化测试和 144 项登记浏览器检查通过（T05 33，既有回归 111；T05 含明确标注的异常补充序列，不把全部检查称为纯原生）。11 项独立磁盘 JSON / PNG 检查通过。机器结果入口：[final-results.json](verification/T05-editing-reliability/final-results.json)。

## 已复现问题与修复

| ID / 优先级 | 输入与复现步骤 | 预期 / 实际及影响 | 修复建议与实际实现 | 验收条件 / 证据 |
|---|---|---|---|---|
| T05-001 / P1 | 独立场景，将 Width=50 mm、Depth=60 mm；选中家具，原生鼠标竖直拖尺寸手柄 20 px。 | 未动横轴应仍为 50 mm；实际宽度跳到 100 mm，中心也发生额外位移。 | 用手势开始尺寸和指针差值计算，保留未动轴精度，统一可编辑下限为 50 mm；不将旧小尺寸强制扩大。对角锚点固定。 | 修复后宽度仍为 50；0°/90°/37° 下单帧与 12 帧同终点相同，原对角坐标保持，一次 Undo/Redo 完整恢复。[原始数据](verification/T05-editing-reliability/baseline-01/small-resize.json)，[缩放样本](verification/T05-editing-reliability/final-02/resize-samples.json)。 |
| T05-002 / P1 | 2D / 3D 原生 mouse down → move，调用浏览器 releasePointerCapture，再 move → up。 | 捕获丢失应取消预览；实际继续移动并提交，例如 2D 中心从 (2400,2000) 变为 (2670,1350)。释放后存在失控操作。 | 按 pointerId 跟踪手势；lostpointercapture / pointercancel 恢复已提交快照、画面及 3D Orbit；正常结束先清手势再释放捕获。2D 第二指接管时保留捕获以继续 pinch。 | 中心、尺寸、height 与工程完整恢复，下一次拖动可用，相机恢复；真实 lostpointercapture 事件记录，取消不生成历史。[2D 基线](verification/T05-editing-reliability/baseline-01/browser-results.json)，[3D 基线](verification/T05-editing-reliability/baseline-03/browser-results.json)，[最终前图](verification/T05-editing-reliability/final-02/capture-3d-before.png)、[恢复后](verification/T05-editing-reliability/final-02/capture-3d-after.png)。 |
| T05-003 / P1 | 家具选中，焦点放在 Properties 的 Rotate 按钮，原生按 R、ArrowRight、Ctrl+D；家具库 / 输入 / 搜索 / select / 模态同样检查。 | 应只响应当前 UI 上下文；实际旋转、移动并复制底层家具。 | 2D / 3D 共用文本和 UI 焦点判定，识别实际 isContentEditable（含 plaintext-only）；面板、菜单、导航和对话框不执行模型快捷键，保留输入自身 Undo。Escape 使用同一文本判定。 | 当前工程完整不变；画布仍支持旋转、微移、复制删除和历史；输入、字段草稿、模态 / 菜单隔离通过。[基线](verification/T05-editing-reliability/baseline-01/browser-results.json)，[最终](verification/T05-editing-reliability/final-02/browser-results.json)。 |
| T05-004 / P1 | 原生拖动家具，未释放时按 R，再继续 move → up。 | 应先取消预览再旋转；实际 store.mutate 取消事务，但交互仍保留旧 drag，后续 move 报 Preview requires a transaction。 | 执行模型旋转、复制、删除、微移快捷键前，统一取消 2D / 3D 手势；手势提交读取当前事务快照，保留事务中已提交的 view 偏好。 | 无 pageerror，中心保持开始值，旋转单独一笔历史；Undo 完整恢复；偏好 + 无操作手势不插入假历史。[原始错误栈](verification/T05-editing-reliability/baseline-02/browser-results.json)，[最终预览偏好导出](verification/T05-editing-reliability/final-02/preview-preferences.json)。 |
| T05-005 / P1 | CDP 模拟触控：3D 已选家具单指拖动，再按第二指，移动两指并全部释放。 | 第二指应取消家具事务；实际提交了单指预览，例如中心变为 (3270,1910)。 | 3D 检测不同 pointerId 的第二指时取消原手势并恢复 Orbit；2D 继续复用原 pinch。 | 2D / 3D 家具均完整恢复，2D 双指仍缩放；只有模拟触控结论，无实机触屏结论。[修复前](verification/T05-editing-reliability/second-touch-before/browser-results.json)，[最终事件](verification/T05-editing-reliability/final-02/touch-2d-events.json)、[数据](verification/T05-editing-reliability/final-02/simulated-second-touch.json)。 |
| T05-006 / P1 | 3D 选中独立场景家具，右键在可见模型上拖动 (705,584) → (750,610)。 | 按可见操作说明应平移相机；实际移动家具到 (3260,2050)。 | 家具拖动只接受主键；右键保留 OrbitControls 原有平移。 | 相机可平移，家具完整不变，无新增编辑历史。[修复前](verification/T05-editing-reliability/right-drag-before/browser-results.json)，[最终画面](verification/T05-editing-reliability/final-02/right-drag-3d.png)。 |
| T05-007 / P2 | 切换 3D，查找并通过可见 UI 关闭 Wall snap。 | 3D 拖动复用墙吸附但开关被 only2d 隐藏，无法直接关闭。 | 同一个生产开关显示于 2D / 3D；标题与属性说明写清关闭仍保留单位网格，数值中心不吸附。 | 2D / 3D 与 390 px 可达；公制/英制关闭保留 10 mm / 1/4 in 网格，开启对齐旋转家具 AABB 边界。[入口基线](verification/T05-editing-reliability/baseline-03/browser-results.json)，[2D 样本](verification/T05-editing-reliability/final-02/wall-snap-samples.json)、[3D 样本](verification/T05-editing-reliability/final-02/wall-snap-3d-samples.json)。 |

## 验收范围与证据解释

- 精确中心：两种显示单位均提交负坐标与明确单位小数；未改长度保持浮点，名称编辑、2D/3D、实际 JSON 下载、刷新、Continue replacement 审查回导保持全部数据。中心输入仍直接提交 mm，不调用 snapMove。
- 吸附：24 组 2D 原生样本覆盖两种单位、0°/90°/37°、两档缩放和开/关；24 组 3D WebGL 俯视原生样本覆盖两种单位、三个角度、两档缩放和开/关，[缩放补查](verification/T05-editing-reliability/3d-zoom-final/browser-results.json)使用原生滚轮并核对可见相机缩放。3D 仍使用同一 snapMove；测量 snapPoint 与 Wall snap 分离。数值输入可落非网格位置。
- 家具事务：小尺寸、非等比尺寸、旋转、固定对角锚点、连续 / 单次同终点、轻点、无改动 / 无效字段、完整 Undo/Redo；15 组移动 / 旋转 / 缩放取消序列，检查恢复数据、SVG 位置、实际导出与下一次手势。
- 结构事务：单矩形房间宽深高，门窗新增 / 修改 / 删除，新建工程取消 / 确认 / Undo/Redo；非法开口、缩小父墙导致越界时拒绝整笔保存。添加房间 / 门 / 固定物、移动房间、删除房间，完整比较全部工程与稳定 ID、生成几何及关联数据；家具仍保留绝对坐标。
- 三户型：直接读取 T04 实际下载的 Jacobsen / CMU / 修正 Plan F；用同一生产路径定位、拖动、编辑 / 删除房间并整笔撤销，保留原家具、height、useZones、底图、来源与未知尺寸；实际 JSON 下载、刷新和审查回导，2D/3D PNG，390 px 坐标 / 高度 / Undo/Redo / Wall snap / 门窗表单。窄屏用家具库 Room → Room / openings 的现有可见入口。
- T07 / T04 / T06：恢复原件高度草稿、复制删除撤销、替换取消 / 确认；预览不进入设备和真实 JSON，显示偏好仍能保存；配额失败备份 / 重试、损坏原文 / 冲突恢复；使用区与持续键盘漫游按现有专项脚本复测。

所有通常操作均用 Playwright 原生鼠标、键盘、表单和可见控件。3D 相机投影 helper 只读几何以计算鼠标落点，随后实际命中 WebGL 模型并核验移动、墙边位置和画面；不直接写 store。JSON / PNG 使用 download 事件、saveAs、failure 检查并读磁盘内容，回导使用真实 Continue replacement。

异常序列明确区分：捕获丢失为原生鼠标手势加浏览器 releasePointerCapture API，实际产生 lostpointercapture；pointercancel 与 window blur 是 DOM 合成补充；第二指由 CDP 模拟触控（等待真实 pointermove 分帧处理）；contenteditable 使用补充 DOM 容器和原生键盘。预览中偏好开关使用 DOM click 补充，不冒充同时物理输入。

## 最终版本与检查数量

Chromium `154.0.8037.97`，headless Chrome / SwiftShader，1440 × 1000 和 390 × 844；所有下列报告来自同一最终构建 `cd2cb1233220bc6e`。登记检查包含场景级与细项级，不将其中 48 个吸附样本、6 个缩放样本、15 个取消序列再重复计入总数。

| 检查 | 数量 | 实际报告 |
|---|---:|---|
| T05 主矩阵 | 31 | [final-02](verification/T05-editing-reliability/final-02/browser-results.json) |
| T05 3D 缩放补查 | 2 | [3d-zoom-final](verification/T05-editing-reliability/3d-zoom-final/browser-results.json) |
| T04 核心 / 网格 | 30（656 网格样本） | [t04-final-02](verification/T05-editing-reliability/t04-final-02/browser-results.json) |
| T04 原件高度草稿 | 4 | [height-drafts-final-02](verification/T05-editing-reliability/height-drafts-final-02/browser-results.json) |
| T04 原生 2D / 3D 拾取 / 拖动 / 取消 | 4 | [height-interactions-final-02](verification/T05-editing-reliability/height-interactions-final-02/browser-results.json) |
| T07 保存 / 失败 / 恢复 / 冲突 | 46 | [t07-final-02](verification/T05-editing-reliability/t07-final-02/browser-results.json) |
| T06 使用区 / 三户型键盘漫游 | 27 | [use-zones-final-02](verification/T05-editing-reliability/use-zones-final-02/browser-results.json) |
| Node 自动化 | 144 / 144 | [日志](verification/T05-editing-reliability/unit-tests.txt) |
| 独立实际下载核验 | 11 | [结果](verification/T05-editing-reliability/independent-download-results.json) |

独立检查器逐项比较两份精确中心完整工程与三户型全项目，三户型差异严格限制为本次实际修改的末件家具中心、首房间名称及对应生成几何名称、updatedAt；不排除其他家具、几何、来源、底图或使用区。实际解码六张 2D / 3D PNG，核对尺寸与非空画面。截图人工核对了全屋标签、3D 墙吸附入口和窄屏表单。检查器使用外部 bundled Python / Pillow，无新增生产依赖。

[npm run build](verification/T05-editing-reliability/build.txt)、[ESLint](verification/T05-editing-reliability/eslint.txt)、[git diff --check](verification/T05-editing-reliability/diff-check.txt)通过；[源码指纹](verification/T05-editing-reliability/source-fingerprints.json)仅记录 index/src/styles，不读取无关文件。旧素材 / 已跟踪历史证据未发生修改。

## 失败与中间版本

原始 baseline-01/02/03 保留缺陷与 pageerror；baseline-02 的 #v3d 错误选择器随后改为 #view3d，真正 3D 捕获缺陷见 baseline-03。attempt-01 为首轮修复通过记录；attempt-02 的结构断言是在先删除门窗后要求缩小父墙被拒，及 390 px 误用隐藏的 #editRoom，属测试修正，分别经 attempt-03/04 复测。T07 t07-regression-01 在 Export 持有焦点时期待全局 Undo，已改成可见按钮，t07-regression-02 通过。

pinch-before/after 的立即读 viewBox 未等待 CDP 合并的 pointermove，保留失败；pinch-diagnostic 增加 100 ms 等待并保存完整事件后通过。取消第一指编辑时保留捕获，避免中断 pinch。right-drag-before 是追加实际复现的右键问题。final / t07-final 的旧版验收中断，t04-final 若已完成也被后续修复取代，见各目录标记；均不纳入最终计数。历史源工程和原图不覆盖。

## 运行与交付边界

本地未提交 / 未推送 / 未合并 / 未部署。HEAD 和远程基线以本批 Git 核对记录为准；现有 T04 和全部历史证据保留。未读取、修改或上传 aws-tokyo-wireguard.yaml。隔离 Chrome 上下文与自建 8095 服务；结束只关闭自身浏览器和 8095，保留用户 8086。

未测 Safari / Edge、实机触屏、不同 GPU、物理打印、严格同时写入竞争、长期运行；本批 3D 吸附覆盖俯视和默认画面，不声明任意透视 / 相机缩放下的恒定屏幕容差或斜墙精确贴齐。未实现真实门运动 / 安装标高 / 垂直避让 / 同时使用 / 法规、方案 A/B、任意多边形或 AI。三户型测试参数不是原图实测，原住宅完整实测验收仍为 0。

## 复测

```bash
npm test
npm run build
node /Users/chris/.npm/_npx/515228b7c8d004a2/node_modules/eslint/bin/eslint.js src --config tests/eslint.config.js
git diff --check
python3 scripts/serve.py --port 8095
TEST_URL=http://127.0.0.1:8095/ T05_TEST_OUT=docs/verification/T05-editing-reliability/new-attempt node tests/browser-t05-editing-reliability.mjs
```

脚本使用独立新目录，支持 TEST_URL / T05_TEST_OUT / PLAYWRIGHT_MODULE；T05_3D_ZOOM=1 配合 T05_CASE="3D top-view" 复测原生滚轮缩放场景；可用 T05_CASE 正则选场景，部分跑不能称全矩阵通过。T04 drafts / interactions 已增加 TEST_URL，保留原默认 8095 与场景路径。回归命令和实际版本见机器汇总，不覆盖旧记录。

独立下载检查复跑：

```bash
/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/check-editing-reliability-exports.py docs/verification/T05-editing-reliability
```

新输出批次中应同样提供 final-02 的实际下载工程与图片；检查器不操作浏览器或修改输入工程。
