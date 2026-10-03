# 全屋组合复用与 3D 标签复测

2026-10-03；分支 `feat/ui-refactor`；最终构建 `cd24d1281a92a43a`。

**已将 Jacobsen 狭长住宅的全屋工程测试接入现有 CMU 组合验收流程，并修复 DV-007（P2）全屋 3D 标签互相遮挡。两种户型共用编辑、计算、回导和检查逻辑。** Jacobsen 测试模型包含 12 个空间、20 件家具；原住宅的完整实测验收仍未完成，未标注细部继续保留为假设。

## 本次推送

开始本任务时，已将固定障碍物、CMU 组合、紧凑标签、四向斜切角及 Plan F 橱柜修正等前轮已验收内容推送至 `origin/feat/ui-refactor`，提交 **`ea09df0db7c17d8429d8a042f4f9f7ab0c07c075`**。`git ls-remote` 核对远程分支与本地 HEAD 相同。未合并、未部署。

前轮机器验收文件中的 `committed: false` / `pushed: false` 是当时的历史快照；不修改其产物摘要。本记录后续新增的全屋测试和 DV-007 为本地工作区改动，尚未推送。与项目无关的未跟踪文件未纳入提交。

## 一套流程覆盖不同户型

原组合测试脚本改为读取 `COMPOSITION_FIXTURE`：参考图的页内两点、距离、房间与切角参数、墙段、门窗、固定物、家具及非法修改样例均来自场景数据。脚本不再固化八房间、十二洞口或七固定物；默认输出移至新的复用目录，避免覆盖历史验收证据。

`fixtureProject` 复用现有 millimetre 项目数据与几何生成，仅扩充测试中的斜切参数换算。共享审计按场景逐一核对实际房间原点 / 尺寸 / 墙厚 / 切角、家具类型 / 尺寸 / 坐标 / 旋转、独立净面积、占地边界、门扇 / 固定物 / 净地面冲突与结构连通性。新场景直接使用生产功能，未增加供应商专用逻辑、测试接口或应用依赖。

| 场景 | 空间 | 家具 | 固定物 | 平开 / 折叠 / 推拉 / 通道 | 窗 | 净面积 sq ft | 含墙地面 sq ft |
|---|---:|---:|---:|---|---:|---:|---:|
| Jacobsen 全屋测试 | 12 | 20 | 0 | 5 / 2 / 1 / 3 | 7 | 604.27 | 693.18 |
| CMU 两卧组合回归 | 8 | 14 | 7 | 4 / 1 / 0 / 1 | 6 | 575.91 | 639.24 |

上述面积均属于测试模型。结构连通性检查使用 3 in 网格，计入实际斜墙、直墙、窗和固定物，全部空间连接；不加入家具或人形半径，不替代通道净宽、开门后通行及完整人员漫游。

Jacobsen 的厨房台面与水槽为明确声明的嵌套占地；审计确认水槽矩形完全在台面内。其他家具采用独立 SAT 检查，不能凭门扇无冲突就判定家具互不重叠。修改初始测试摆位后，三类潜在冲突均为 0；不表示已经计算高度避让。

## 来源、已知尺寸与未知部分

使用项目内 [Jacobsen ISW-4521 原始 PDF](../tests/fixtures/floorplans/originals/jacobsen-isw-4521/original.pdf)，SHA-256：`420bb3c5a38f37a8b41a2206f3d2bdc3c07e6248544cc70bcb641a62d8bf24cb`。原件是一页位图图纸，本轮直接核对项目内预览，未猜读不存在的 PDF 文本层。图纸注明全部尺寸近似。

| 原图主要标注 | 本模型保留的净矩形尺寸 |
|---|---|
| Master Bedroom | 10'0" × 10'0" |
| Dining Room | 9'0" × 7'0" |
| Living Room | 12'6" × 12'4" |
| Bedroom Two | 8'8" × 9'4" |

图示名义总尺寸 13'4" × 52'，印刷面积 693 sq ft；矩形乘积为 693.33 sq ft。测试模型外包尺寸相同，但合成厨卫斜边分区使补地面积为 693.18 sq ft，不能把二者或名义外框当成精确原图轮廓验收。

所有房间原点、厨卫 / 衣柜 / 洗衣 / 走道尺寸、厨房斜切端点、浴室角部分区、墙厚 / 墙段 / 层高、门窗位置 / 尺寸 / 开合方式、家具规格和摆位均为工程假设。浴室角部分区用于测试矩形组合与开放斜边的复用，不是原图新增的一间房。次卫采用推拉门为测试选择，不是从原图确认的门型。可选 bay 未纳入模型。

详细参数见 [Jacobsen 场景](../tests/fixtures/north-american/jacobsen-whole-floor-scenario.json)；CMU 原有假设继续见 [既有记录](NA-apartment-composition-verification-2026-10-02.md)。机器结果均保留 `sourceWholePlanAccepted: false`；素材库仍是 18 份原件和 4 套已有单层手工模型，没有新增完整实测验收数量。

## DV-007：全屋 3D 标签互相遮挡

P2。在斜切功能构建 `84212b2d0f37c16a` 的全屋剪墙视图中，Bath One 与 Central circulation 等标签重叠，CMU 的密集空间也有遮挡。见 [Jacobsen 修复前](verification/NA-whole-floor-reuse/jacobsen/labels-before.png) 与 [CMU 修复前](verification/NA-whole-floor-reuse/cmu/labels-before.png)。

3D 每次投影后按实际文字屏幕矩形复核：当前选中房间优先，再按净面积排序；标签须完整位于画布内且与已保留标签相隔至少 4 px，空间不足时暂时隐藏。旋转、缩放、房间定位、单位切换和窗口改变后重新计算。完整名称、面积和项目数据保留，房间列表仍可选择；界面提示放大可显示更多标签。手动关闭房间标签及漫游模式的隐藏规则保持有效。

两个户型分别复测剪墙、开关恢复、房间定位、全屋适应、单位切换与 390 px 窄屏，共 12 组实际 DOM 边界检查。可见标签无相交且在画布内；桌面定位及全屋适应后选中房间标签保持可见。处于画布外的标签仍隐藏，未承诺任意视角都显示全部名称。见 [Jacobsen 结果](verification/NA-whole-floor-reuse/jacobsen/3d-label-results.json)、[修复后截图](verification/NA-whole-floor-reuse/jacobsen/labels-after.png) 和 [窄屏](verification/NA-whole-floor-reuse/jacobsen/labels-mobile.png)。

## 验证与可复测产物

| 检查 | 结果 |
|---|---|
| 自动化测试 | 107 / 107；新场景共用审计、斜切 / 门型回导与非法重叠拒绝 |
| Jacobsen 全屋原生浏览器 | 11 项；12 空间、20 家具、实际 JSON / PNG / PDF、刷新回导、撤销 / 重做与窄屏控件 |
| CMU 组合原生浏览器 | 相同脚本 11 项；既有尺寸、结构、占地与标签继续通过 |
| 3D 标签边界 | 两场景各 6 组，按实际显示矩形独立检查 |
| 既有功能回归 | 四套斜切场景 43 项、Plan F 修正 7 项、NA-001～012、固定障碍物 8 项、参考图 8 项、紧凑家具标签 9 组 |
| A3 PDF | 两份实际打印预览输出；单页纸张、房间 / 家具数、逐房间面积、净 / 含墙面积、100 mm 标尺 |
| 静态与资源 | source ESLint、JS 语法、`git diff --check`；资源构建一致 |
| 资料完整性 | 18 份原图 SHA-256 不变，已推送的三轮验收证据摘要保持原样 |

PDF 标尺位于页脚文字之后。狭长模型的图面高度小，页脚落在纸张中部；检查按 `Calibration ruler: 100 mm` 文字定位，再确认矢量标尺为 283.5 pt。首轮定位脚本错误地限定页面底部，已修正；应用打印内容没有缺失。实体打印机和纸张实测尚未执行。3D PNG 沿用 WebGL canvas 截图，不包含 CSS 房间标签；DV-007 验证的是交互界面。

| 场景 | JSON | 图像 / PDF |
|---|---|---|
| Jacobsen 全屋测试 | [模型](verification/NA-whole-floor-reuse/jacobsen/complete-project.json) | [2D](verification/NA-whole-floor-reuse/jacobsen/complete-2d.png) · [3D](verification/NA-whole-floor-reuse/jacobsen/complete-3d.png) · [PDF](verification/NA-whole-floor-reuse/jacobsen/complete-print.pdf) |
| CMU 回归 | [模型](verification/NA-whole-floor-reuse/cmu/complete-project.json) | [2D](verification/NA-whole-floor-reuse/cmu/complete-2d.png) · [3D](verification/NA-whole-floor-reuse/cmu/complete-3d.png) · [PDF](verification/NA-whole-floor-reuse/cmu/complete-print.pdf) |

[最终记录](verification/NA-whole-floor-reuse/final-results.json) 保留所有产物摘要、当前构建、推送基线和未测范围。原 8086 服务及用户浏览器方案保留；本轮使用独立 8095 服务与临时浏览器 profile，结束后停止自建服务。

复测命令（现有 8086 服务即可）：

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/playwright TEST_URL=http://127.0.0.1:8086/ COMPOSITION_FIXTURE=jacobsen-whole-floor-scenario COMPOSITION_TEST_OUT=docs/verification/NA-whole-floor-reuse/jacobsen node tests/browser-apartment-composition.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright TEST_URL=http://127.0.0.1:8086/ COMPOSITION_FIXTURE=cmu-two-bedroom-scenario COMPOSITION_TEST_OUT=docs/verification/NA-whole-floor-reuse/cmu node tests/browser-apartment-composition.mjs
python scripts/check-whole-floor-exports.py
```

## 后续

全屋组合的工程流程已覆盖长条住宅与两卧公寓。下一步按 T06 继续通道净宽与家具使用空间复核，让有家具的通行结果与结构连通性分开，并沿用这两种布局做回归。原图未标注尺寸仍需可靠尺寸证据，不能用测试假设宣布完整实测验收。Safari / Edge、实机触屏、家具高度避让、斜边洞口和多层仍未验收。
