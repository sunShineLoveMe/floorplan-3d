# T06 第二批：家具使用空间复核

日期：2026-10-03。直接接续 `feat/ui-refactor` 的本地工作区和第一批构建 `d30813843994046d`；HEAD 仍为 `ea09df0db7c17d8429d8a042f4f9f7ab0c07c075`。全部既有未提交 / 未跟踪内容保留。本批未提交、未推送、未合并、未部署；未重新核验远程。

本批新增床侧、座椅、柜门及电器的**显式矩形使用区假设**，可调所在侧边、沿边宽度、向外深度、沿边偏移。真实旋转多边形与净地面、家具、墙、固定物和规划门叶共用生产逻辑复核；2D 展示、定位、原生属性操作、保存回导及持续漫游均纳入验收。最终资源构建 `bad34d23ec95f5e4`。132 / 132 自动化测试、48 项新增原生浏览器检查及 102 项既有流程回归通过。最终机器记录见 [final-results.json](verification/T06-use-zones/final-results.json)。

## 已核验问题与修复

| ID / 优先级 | 复现与影响 | 修复和证据 |
|---|---|---|
| T06-005 / P1（能力缺口） | 第一批家具占地间距不含操作空间；原家具没有床侧 / 座椅 / 柜门 / 电器方向和外伸参数。添加明确的测试假设后，三户型均出现真实使用区限制；不能用无占地冲突替代“能使用”。 | 可显式添加不同用途、多侧使用区。红色表示实体重叠或净地面外面积，绿色仅表示本次平面检查无冲突；不自动添加、不自动修改摆位。见三户型 `before.png`、`zones.png`、`complete-project.json`、`zone-report.json` 和独立 Shapely 结果。 |
| T06-006 / P1 | 旧漫游仅检查实体终点，没有净地面边界。原生持续 W 行走从 `[1500,1500]` 到 `[7392.88,1500]`，穿出 3000 mm 开放边。 | 使用净地面并集检查连续圆形扫掠，每次 X / Y 分量移动分别验算；原开放边模型以键盘和摇杆复测均停在净边界前，位置半径 220 mm。见 [修复前](verification/T06-use-zones/walk-before-results.json)、[最终漫游](verification/T06-use-zones/walk-final/walk-results.json)。修复前仅被动采集相机位置，未更改移动或按键逻辑。 |
| T06-007 / P1 | 可见的推拉门叶没有 collider。持续原生键盘 / 摇杆分别穿过门叶至 X≈3747 / 3766 mm。 | 按实际显示的推拉门框外廓及折叠门旋转叶片补 collider；共享连续扫掠检查它们和实时平开门。见 [修复前](verification/T06-use-zones/walk-sliding-before/walk-results.json)、最终同场景复测和独立尺寸的 architecture 自动化测试。规划“滑门退开”的假设与 3D 真实显示保持分开。 |
| T06-008 / P2 | 新嵌套表单的 `div.full` 没跨越父网格列，390 px 属性抽屉横向溢出。 | 使用区表单跨列、父网格允许收缩，窄屏内部单列和按钮换行。见 [失败截图](verification/T06-use-zones/attempt-03/failure.png)、[最终窄屏](verification/T06-use-zones/mobile-390.png)与无横向溢出断言。 |
| T06-009 / P2 | 无效的 `0 mm` 宽度草稿在修改另一区方向时被丢弃，单位锁随之解除。独立原生浏览器复现。 | 按使用区 ID 和具体尺寸字段恢复草稿；仅自身保存值变化或对象变更时丢弃。修改另一区、撤销后保持无效状态与单位锁，Escape 恢复精确保存值。见 [独立复核](verification/T06-use-zones/draft-retention-review.json)。 |

同时修正复制家具时使用区参数共用引用的问题（复制后编辑互不影响），保持墙 collider 的原始稳定索引；对切换 / 导入过程中短暂失效的选择进行防护，隐藏 / 退出 3D 的 canvas 不再拾取旧场景对象。浏览器重跑期间发现的失败和修复前产物保留在本目录的 `attempt-*` 中；它们不是最终通过结果。最后的 Plan F 使用区补强只复跑实际床 / 沙发 / 衣柜 / 洗衣机，保留同一最终构建下 Jacobsen / CMU 已通过的 14 项检查；主结果内明示这 14 项的来源。

## 参数与检查边界

- 内部始终为 mm。可选 `furniture.useZones[]` 保存 `{id,kind,side,widthMm,depthMm,offsetMm}`；最多 16 区 / 家具，宽 / 深 1–10000 mm，偏移 −10000–10000 mm；尺寸有限、枚举有效、同家具内 ID 唯一。v2 / v1 / legacy 无新字段仍兼容；派生 polygon / status / conflicts 不保存。
- `kind` 只标记用途：`bed-side / seating / cabinet / appliance`。不读取名称来推断门型、铰链位置、开门角度、抽屉、人体尺寸或高度。默认添加的 600 × 600 mm 仅是明确写出的可编辑示例，不是法规或厂商值。
- `side` 对应家具局部 `top/right/bottom/left`。上 / 下边的偏移沿局部 +X，左 / 右边沿局部 +Y；家具旋转时区一起旋转。区宽深保持独立，修改家具尺寸只更新边锚点，不缩放使用区参数。可分别声明两侧床边；不存在“名称包含 Bed 所以自动开放两侧”的分支。
- 每区扣除净地面多边形、有效洞口及拆墙区域的并集，检查剩余面积；逐项检查实墙、半高墙、斜墙、固定物、其他 solid 家具及 Passage 的规划门状态。接触不算面积重叠；面积容差为 0.001 mm²。不以包围盒做最终判定。
- owner 自身不构成使用区障碍；显式 parent 仍构成障碍，嵌套不豁免使用空间。地毯默认可跨越，显式 `ground` 也可跨越，显式 solid 地毯仍阻挡。这些均为平面规划假设，不说明垂直避让。
- 各使用区单独复核，不把区与区的重叠判为实体碰撞；未验证同时使用、通向使用区的路径、开门完整扇形或物理设备联动。没有声明使用区的家具不视为已通过使用性验证。
- 入口：选择家具 → **Use-zone assumptions**；全局 **Furniture use zones** 提供完整结果、2D 显示开关和按区定位。红 / 绿虚线分别对应 review / clear。定位保留所属家具选择，将画面中心移到使用区中心，不移动家具。
- 移动、旋转、两项尺寸、使用区方向 / 偏移、删除对象 / 区、复制、单位切换、撤销 / 重做、刷新与 JSON 回导均重新计算。输入无效时保存值不变，单位锁保留；不损失 617.123456 mm 等保存精度。
- PNG / 打印继承当前 2D 显示开关和项目画布边界；打印 legend 始终报告声明区数 / 需复核数与假设限制。3D 中不渲染使用区。区跨出项目画布时，导出边缘之外的部分可能裁切，文字冲突报告仍保留。

## 跨户型和独立验收

三份源工程均保持家具摆位、几何和原图假设；测试者在每份工程中显式配置四种用途和双侧床边，共 5 区。这些是用于验证功能的测试参数，不是对原住宅设备和人体使用的实测声明。每份源工程的全部家具原属性保持相同，新参数工程另存本目录。

Jacobsen / CMU / 修正 Plan F 与四套斜切场景共用 `useZoneReport`。三户型每份 5 区，其中需复核的区数分别为 Jacobsen 4、CMU 3、修正 Plan F 3；四套斜切另共 9 区。原模型并未为了得到绿色结果而移动或降低阈值；配置后的红色限制如实保留。独立开放地面模型另验证已知 blocker 的移动、地面覆盖、删除及撤销使结果在 clear / conflict 间正确切换。

原生环境：macOS Chrome headless / Playwright，WebGL SwiftShader；1440 × 1000、390 × 844，摇杆通过触摸设备浏览器上下文和真实 pointer capture 操作，桌面键盘实际获得 pointer lock。不是实机移动设备验收。

| 验证 | 证据 |
|---|---|
| 自动化测试、源 ESLint、语法、构建、diff | [unit-tests.txt](verification/T06-use-zones/unit-tests.txt)、[eslint.txt](verification/T06-use-zones/eslint.txt)、[syntax.txt](verification/T06-use-zones/syntax.txt)和最终机器记录 |
| 三户型及四斜切原生使用区 | [browser-results.json](verification/T06-use-zones/browser-results.json)：属性、定位、旋转 / 移动 / 改尺寸、复制 / 删除 / 恢复、单位 / 无效草稿、刷新回导、390 px、PNG / PDF |
| 持续原生行走 / 摇杆 | [walk-final/walk-results.json](verification/T06-use-zones/walk-final/walk-results.json)：9 场景 × 两种输入；[joystick-layouts/browser-results.json](verification/T06-use-zones/joystick-layouts/browser-results.json)：三户型向前 / 横向，释放后停止；三户型键盘轨迹在使用区结果中 |
| 独立几何与 PDF | [independent-use-zone-results.json](verification/T06-use-zones/independent-use-zone-results.json)：Shapely 重建使用区、全部实体交集、越界面积及状态；7 模型 / 24 区、三份 A3 单页 / legend / 无裁剪页尾 / 100 mm 标尺；不导入生产 JS |
| 独立漫游点核验 | [independent-walk-results.json](verification/T06-use-zones/independent-walk-results.json)：24 条 trace / 705 采样点与净地面 / 墙 / 固定物 / solid 家具距离 ≥219.99 mm；实时门角度由原生 benchmark 核对。此独立复核仅证明采样点；连续段由生产扫掠与细长障碍自动化测试验算 |
| 第一批及既有回归 | 本目录 `passage-regression`、`diagonal-regression`、`fixed-regression`、`plan-f-regression`、`whole-jacobsen`、`whole-cmu`；原始功能、全屋保存 / 3D 标签 / 出图流程继续通过 |
| 历史 / 原图保留 | [prior-hashes.json](verification/T06-use-zones/prior-hashes.json)和最终机器核对；新目录不会覆盖第一批及既有证据 |

## 复测与未测范围

复测时使用新的输出根目录，并保持各脚本分目录，避免覆盖历史：

```bash
npm test
npm run build
node /Users/chris/.npm/_npx/515228b7c8d004a2/node_modules/eslint/bin/eslint.js src --config tests/eslint.config.js
PLAYWRIGHT_MODULE=/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright USE_ZONE_TEST_OUT=docs/verification/T06-use-zones-next node tests/browser-t06-use-zones.mjs
PLAYWRIGHT_MODULE=/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright WALK_TEST_OUT=docs/verification/T06-use-zones-next/walk-final node tests/browser-t06-walk.mjs
/tmp/floorplan-audit-tools/bin/python scripts/check-use-zone-exports.py docs/verification/T06-use-zones-next
git diff --check
```

`TEST_URL` 默认 `http://127.0.0.1:8095/`；需要先启动自己的 `python3 scripts/serve.py --port 8095`。摇杆跨户型脚本 `browser-t06-joystick-layouts.mjs` 设置 `USE_ZONE_SOURCE_ROOT` 为新使用区验收根目录，并设置 `JOYSTICK_TEST_OUT` 为该根目录的 `joystick-layouts` 子目录；随后运行 `check-walk-samples.py` 并传入该根目录。原开放边修复前基线仍读取历史 `T06-use-zones/walk-open-edge-before.json`。仅停止本批自己的服务，8086 保留。回归 / 连续漫游部分结果来自 `99d1b59cfcbe9cdb` 或 `4717cfe4e8ffc12a`，各文件保留原构建号；后续改动仅为输入草稿 / 网格收缩 / 过渡拾取防护，最终使用区原生流程覆盖这些改动，几何和连续移动逻辑未再变更。

仍未验证家具真实铰链 / 抽屉扫掠和高度关系、使用区同时使用与可达性、开关门碰到人员后的物理推挤、多层、斜边洞口、任意复杂大模型的精确最大净宽、完整法规 / 无障碍合规、Safari / Edge、实机触屏和物理打印机。`sourceWholePlanAccepted: false` 及原图未知尺寸继续保留，本批新增原住宅完整实测验收数量为 0。

未读取、未修改 `aws-tokyo-wireguard.yaml`。
