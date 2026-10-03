# T04 家具真实外廓与高度编辑验收

日期：2026-10-03。T04 第一批已完成本地实现与验收。最终资源构建 `1891ea7378a262e2`；144 / 144 自动化测试、132 项登记的原生浏览器检查通过，包含 656 个实际网格样本、45 种内置类型。网格样本属于浏览器检查的展开，不另加到检查总数；21 项行走 / 摇杆回归来自较早构建，不能归入最终构建。详见 [机器汇总](verification/T04-furniture-dimensions/final-results.json)。

接续 `feat/ui-refactor` / `b0b6797` 当前工作区，保留原有文档改动和未跟踪内容。默认仅本地交付，不提交、推送、合并或部署。

## 修复前问题表

原生 Chromium 通过生产 Three.js factory 生成实际网格，逐顶点测量；已完成 336 个样本（全部预设、各类型非等比小数和小尺寸，0° / 90° / 37°）。坐标系排除家具整体平移和旋转，保留内部零件变换。包含床架、扶手、装饰等所有家具网格，排除标签和选择辅助对象。[原始记录](verification/T04-furniture-dimensions/baseline/results.json)。

| ID / 优先级 | 输入与复现 | 影响 | 建议及验收条件 | 证据 |
|---|---|---|---|---|
| T04-001 / P1 | 导入含 height 的工程，选中家具；属性只有宽深 | 无法填写或清除厂商高度 | 可选高度沿用严格长度输入，缺省保持未知；草稿、撤销、保存回导精确 | [面板](verification/T04-furniture-dimensions/baseline/missing-height.png) |
| T04-002 / P1 | Queen 1524 × 2032 mm；逐顶点局部测量得到 1574.000001 × 2032.000010 mm | 床架比平面占地宽 50 mm；其他类型也有外伸或不足 | 共用实际网格外廓适配，局部宽深等于声明值，中心一致；旋转后顶点均在同角度占地内 | [3D](verification/T04-furniture-dimensions/baseline/bed-3d.png)、原始尺寸记录 |
| T04-003 / P1 | 各类型显式 height=87.654321 mm，部分自然造型底部高于地面 | 只缩放高度不能同时保证外包高度与落地；世界 AABB 也受内部旋转零件影响 | 逐顶点精确外包高度等于输入，所有类型局部 min Y=0 | 原始记录中 fraction 样本 |
| T04-004 / P1 | 各类型 w=50、d=60、height=0.125 mm | 固定装饰和减量构造会产生负尺寸、半径；旧合同仍允许正值 | 使用有界安全造型尺寸构造再适配；不改保存值，不生成负几何参数或 NaN | 原始记录中 small 样本 |

| T04-005 / P2 | 高度输入 invalid draft，复制当前家具，再 Undo 并选回原件；草稿丢失 | 无关的复制/删除历史打断高度纠错 | 按当前工程/家具/单位保留高度草稿，不传给副本；保存高度改变或确认替换后丢弃 | [补充复现](verification/T04-furniture-dimensions/drafts-before/browser-results.json)、[截图](verification/T04-furniture-dimensions/drafts-before/after-copy-undo.png) |

## 实现与尺寸约定

- `height` 沿用原可选字段，没有新增数据版本或推断值。Height (optional) 接受英制 / 公制、严格长度解析及现有正值上限；留空并离开字段清除为字段缺省，与 0 / 负数无效输入分开。未指定显示 Unspecified，打开属性、改名称、单位切换、复制和导出不会补默认实测高度。精确 mm 通过已提交事务、Undo / Redo、自动保存及 JSON 保留。
- 面板把高度加入自身保存值比较，保留无关重绘中的无效草稿、焦点及选区。小型内存缓存按工程 / 家具 / 单位隔离，复制 / 删除后撤销可恢复原件草稿，副本只取已提交值；高度保存值变化后失效，确认工程替换后显式清除。取消替换不清除。缓存不进入 store、保存或导出。
- 每个内置类型先生成安全造型，再用 Three.js `Box3.setFromObject(group, true)` 测量实际顶点外廓，在家具整体平移 / 旋转之前进行宽深适配、显式高度适配与居中 / 落地。内部零件旋转、床架、扶手、靠垫、花瓶等装饰均纳入完整外廓。缺省高度保持自然造型高度，不写派生尺寸、矩阵或缓存。
- 为避免微小 / 巨大尺寸造成负内部几何或数量失控，构造尺寸在同类型库示例的 0.8–2 倍范围内使用输入，其余使用示例尺寸构造后缩放。保存值始终保留。所有缩放轴为正；材质沿用。极端宽深比只能作为尺寸示意，无法承诺厂商实际形状。
- 局部 X / Z 中心对齐家具中心，实际网格 min Y=0。壁挂电视 / 空调 / 热水器与坐垫同样采用地面底部基准；本批没有安装标高字段，不能把示例位置或高度当作安装数据。模型高度包含装饰最高点，用户输入本体高度时需核对完整最高处。产品说明中已明确这些语义。

### 修复前后代表尺寸

以下输入统一为 W=731.123456、D=419.987654、H=87.654321 mm，角度 0°。高度是测试参数，不是厂商实测。数字展示四位小数，完整浮点记录见 [before-after-dimensions.json](verification/T04-furniture-dimensions/before-after-dimensions.json)。

| 类型 | 修复前网格 W / D / H（mm） | 修复前 min Y（mm） | 修复后 |
|---|---|---|---|
| bed | 781.1235 / 760.8080 / 87.6543 | ≈ 0 | W / D / H 与输入一致，min Y≈0 |
| sofa | 731.1235 / 460.8962 / 85.7926 | ≈ 0 | 同上 |
| chair | 691.1235 / 366.9747 / 87.5703 | -0.0618 | 同上 |
| cabinet | 751.1234 / 455.9876 / 87.6543 | ≈ 0 | 同上 |
| washer | 731.1234 / 455.0892 / 87.6543 | ≈ 0 | 同上 |
| rug | 731.1234 / 419.9876 / 87.6543 | 12.9858 | 同上 |
| baycushion | 731.1234 / 419.9876 / 84.9266 | 93.4629 | 同上 |
| tv | 731.1234 / 54.5000 / 87.6543 | 211.9380 | 同上 |
| acwall | 731.1234 / 433.9876 / 87.6543 | 561.0061 | 同上 |

最终测量依据独立声明的家具中心和角度建立逆变换，逐可见网格顶点得到局部 min / max / size，同时记录世界 AABB。每个旋转后顶点都在同角度声明占地内；世界 AABB 随旋转变大，没有拿它直接等同原始 W / D。容差 **0.00001 mm**，656 个样本的最大声明尺寸误差为 **3.725290298461914e-9 mm**，没有用毫米级容差掩盖差异。检测有限顶点、负几何尺寸 / 半径、min Y、对称局部中心和真实外包；没有只断言 scale 或文字。[完整网格记录](verification/T04-furniture-dimensions/final-02/mesh-results.json)。

## 验收矩阵与证据

| 范围 | 已验证结果 |
|---|---|
| 旧工程与精度 | 自动化覆盖 v2 / v1 / legacy 的高度缺省、极薄 / 超层高精确值及错误高度拒绝；T07 原生旧格式迁移与恢复继续通过。公制 / 英制输入、10 次单位切换、原始浮点不量化。 |
| 高度草稿与历史 | 0、负值、无法解析、组合英寸溢出和超上限拒绝；Escape 取消、单位锁、焦点和选区、无关名称 / 占地规则 / 使用区重绘、清除回未知 / Undo / Redo、独立复制和删除历史通过。确认同 ID JSON 替换后剩余草稿也清除。 |
| 全类型网格 | 66 库预设；45 类型的非等比精确小数、50 × 60 mm / 0.125 mm 高、0.001 × 0.002 mm / 0.0005 mm 高和 10,000,000 mm 上限样本；各类型包含 0° / 90° / 37°。606 独立样本及三户型 / 旋转单件共 656 样本通过，没有负参数 / NaN / 外廓越界。 |
| 原生拾取、移动和取消 | 实际 2D SVG 拖动、3D 可见网格拾取、3D 拖动、Undo 与 Escape，保持精确宽深高和中心；返回 2D 的 SVG 变换正确。见 [交互结果](verification/T04-furniture-dimensions/interactions-final/browser-results.json)。 |
| T07 高度保存 | 配额失败保留旧设备字节；实际 Export this window 下载只含已提交高度，不含无效草稿；Retry 成功后刷新等于下载工程。原保存恢复、损坏原文、替换审查、同源多窗口和 preview / Cancel 回归通过。 |
| Jacobsen / CMU / 修正 Plan F | 使用 T07 实际下载工程；每户型通过同一库 UI 添加一个明确命名的高度测试参数家具，原家具 height 缺省、来源、底图、结构和使用区逐字段不变。实际下载落盘、校验、刷新、经 Continue replacement 回导，完整工程字段保持；不按户型名称硬编码。 |
| PNG / 标签 / 390 px | 三户型均实际下载 2D / 3D PNG并解码校验；3D 房间标签边界与重叠检查通过。390 px 高度和单位入口可达，无文档横向溢出。截图已检查；3D PNG 按既有约定不含 CSS2D 房间标签。 |
| T06 与漫游 | 使用区新增、移动、45°、宽深、复制 / 删除 / Undo、净地面冲突、定位、PNG / PDF及持续键盘通过；独立 18 场景键盘 / 摇杆碰撞与释放停止、三户型带高度工程的实际摇杆通过。未将高度用于平面碰撞判断。 |

三户型的 [JSON / 2D / 3D / 窄屏记录目录](verification/T04-furniture-dimensions/final-02/)，[独立下载对比和 PNG 解码](verification/T04-furniture-dimensions/independent-download-results.json)。新加 height=31.5 × 25.4 mm 是测试者验证参数（浮点值 800.0999999999999），不是原图实测。原图未知尺寸和 `sourceWholePlanAccepted: false` 等来源说明保持。

## 构建、检查数量与失败保留

| 结果 | 数量 | 资源构建 / 记录 |
|---|---:|---|
| 自动化 | 144 / 144 | [unit-tests.txt](verification/T04-furniture-dimensions/unit-tests.txt) |
| T04 核心浏览器 | 30 登记检查，含 656 网格样本 | `1891ea7378a262e2`，[结果](verification/T04-furniture-dimensions/final-02/browser-results.json) |
| 高度跨选择草稿 | 4 | `1891ea7378a262e2`，[结果](verification/T04-furniture-dimensions/drafts-final-02/browser-results.json) |
| 原生 2D / 3D 拾取与拖动 | 4 | `1891ea7378a262e2`，[结果](verification/T04-furniture-dimensions/interactions-final/browser-results.json) |
| T07 回归 | 46 | `1891ea7378a262e2`，[结果](verification/T04-furniture-dimensions/t07-final-02/browser-results.json) |
| 使用区 / 三户型键盘回归 | 27 | `1891ea7378a262e2`，[结果](verification/T04-furniture-dimensions/use-zones-final-03/browser-results.json) |
| 独立持续键盘 / 摇杆 | 18 | trace 构建 `c50d00016a1f6eae`，[结果](verification/T04-furniture-dimensions/walk-regression/walk-results.json) |
| 三户型带高度工程摇杆 | 3 | `c50d00016a1f6eae`，[结果](verification/T04-furniture-dimensions/height-joystick/browser-results.json) |

合计 132 个登记检查（111 来自最终构建，21 来自前一构建；两者生产网格适配相同，后续改动仅为高度草稿缓存和确认替换清除）。各报告保存原始实际资源号；不重复累计失败尝试或中间成功。Chromium `154.0.8037.97`。最终源码通过 npm test、npm run build、ESLint 与 git diff --check，见 [构建](verification/T04-furniture-dimensions/build.txt)、[Lint](verification/T04-furniture-dimensions/eslint.txt)、[diff](verification/T04-furniture-dimensions/diff-check.txt)。无新增依赖。

所有中间证据保留：`attempt-01` 的不存在 SVG 选择器、`attempt-02` 的二进制浮点预期写成十进制字面量，均为测试修正；`use-zones-regression` 的窄屏失败是测试沿用桌面 aria-expanded 状态，修正为实际 Properties pane 可见性和原生点击后通过。`drafts-before` 复现真实草稿缺陷，第一次 `drafts-final` 缓存恢复判定仍失败，修复后 `drafts-final-02` 通过。因这个失败主动中断的 `final` / `t07-final` / `use-zones-final-02` 用 interrupted.json 标明未验收；完整重跑在最终表所列目录。没有用中间失败 / 历史结果充作最终通过。

## 运行与交付边界

接续原工作区并保留原 README / 路线图 / 交接文档改动，历史原图和验收文件未修改。结束时 HEAD 和 `origin/feat/ui-refactor` 均核对为 `b0b679750aa08346d34f44fd49ac3dd029e85e01`；T04 与证据为本地未提交 / 未推送 / 未合并 / 未部署。未读取、修改或上传 `aws-tokyo-wireguard.yaml`。使用自建 8095 服务及隔离 Chrome 上下文，没有操作用户常用浏览器真实工程；结束关闭自建浏览器和 8095 服务，原 8086 服务保留。

本批未测 Safari / Edge、实机触屏、物理打印、严格同时写入竞争；未实现真实铰链 / 抽屉扫掠、安装标高、垂直避让、同时使用、法规合规或厂商精确形状。极端尺寸外观为缩放示意，原住宅完整实测仍未验收。后续可按路线图另起自定义家具和真实运动批次，不重复这批尺寸工作。

复跑时使用新的输出目录保留旧证据：

```bash
npm test
npm run build
node /Users/chris/.npm/_npx/515228b7c8d004a2/node_modules/eslint/bin/eslint.js src --config tests/eslint.config.js
T04_TEST_OUT=docs/verification/T04-furniture-dimensions/new-attempt node tests/browser-t04-furniture-dimensions.mjs
DRAFT_TEST_OUT=docs/verification/T04-furniture-dimensions/new-drafts node tests/browser-t04-drafts.mjs
T04_INTERACTION_OUT=docs/verification/T04-furniture-dimensions/new-interactions node tests/browser-t04-interactions.mjs
git diff --check
```

浏览器脚本默认 8095，重跑前检查端口并用 scripts/serve.py 启动自身服务；不要停止 8086。草稿 / 原生交互脚本使用已下载的 final-02 独立场景，T04 核心脚本的基线目录是修复前记录，勿用当前代码覆盖它。
