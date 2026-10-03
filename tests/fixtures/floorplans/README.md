# 户型原始图纸测试素材库

采集日期：2026-10-02。**18 份原始资料，来自 11 个来源方：15 PDF、2 JPG、1 PNG；包含原四套官方完整 PDF 和新增 14 份场景素材。** 素材合计约 64 MiB，保存在当前项目内，后续使用不依赖 `/tmp` 或外部文件夹。

[打开可搜索预览目录](gallery.html) · [来源与摘要清单](manifest.json) · [本轮采集结果](collection-results.json) · [文件完整性结果](integrity-results.json) · [应用试读结果](../../../docs/verification/NA-floorplan-corpus/browser-results.json)

项目服务运行时也可访问 [浏览器目录](http://127.0.0.1:8086/tests/fixtures/floorplans/gallery.html)。目录可按关键词及“已有模型验收 / 新增待深测”筛选，支持手机窄屏。

## 保存方式和验证结论

- `originals/<id>/original.pdf|jpg|png`：原始下载字节不改动。San Diego A/B/C/F 为完整 14 页 PDF，SHA-256 与先前验收的源文件一致。
- `originals/<id>/source.json`：来源页、直接下载地址、摘要、大小、页码、格式、尺寸情况与后续测试特征。文件中的相对路径以本素材库根目录为基准。
- `previews/<id>/page-N.png`：仅用于浏览的 PDF 页面渲染，保持 PDF 自身旋转。相邻 `.txt` 为提取的文字；位图或轮廓文字 PDF 可能没有可提取文本。
- JPG/PNG 预览直接使用原文件，保留原生分辨率，不人为补清晰度或伪造标注。
- `manifest.json` 是主清单；`catalog.csv` 可用 Excel 打开查看。更新主清单后，用下方脚本同步来源文件与目录。

18 份文件已通过 SHA-256 / 文件解析检查、选定页内容人工检查，以及应用真实 `Import drawing` 界面的读取和选页测试。取消导入后原项目完全保持不变。目录图片、筛选、搜索及 390 px 布局通过浏览器检查。验证构建为 `58cd1dedbb49c3ad`。

**新增 14 份尚未完成完整户型验收。** CMU Fairfax Studio 已完成近似标定及标注矩形房间的摆放、保存回导和导出流程；柱子与其余空间未被完整建模。Hillside A1/B5、Imprint A1 和 ZAG B4 已验证无长度时的标定拒绝与项目保护。固定矩形障碍物已补，并用 Studio 和两卧小卧室验证独立柱、面积扣除、家具与平开门冲突、保存回导和导出；柱和门窗细部为明确测试假设，整套公寓仍未验收，见 [固定障碍物验收](../../../docs/NA-fixed-obstacles-verification-2026-10-02.md)。后续 CMU 两卧 8 空间组合与紧凑家具标签复测通过，见 [整户组合记录](../../../docs/NA-apartment-composition-verification-2026-10-02.md)；补充尺寸仍为假设，完整原图验收数量保持 4 份。下一项为 Jacobsen 斜向厨房边界。参考图结果见 [多样化图纸验收](../../../docs/NA-diverse-floorplans-verification-2026-10-02.md)。试读结论仅表示文件能加载，不能据此判定斜墙、多层、缺少尺寸等内容已经被产品完整支持。前四套 A1 的既有模型与导出证据见 [四套验收记录](../../../docs/NA-complete-houses-verification-2026-10-02.md)。

## 素材目录

页码是 PDF 阅读器从 1 开始的文件页码；JPG/PNG 为单图。一个文件可能包含多个楼层或多个方案，不应按文件数统计房屋数量。

| ID | 本地原文件 | 推荐页 | 特征及测试注意点 | 原始发布页 |
|---|---|---:|---|---|
| `san-diego-plan-b` | [San Diego Plan B：两卧一卫，L 形单层](originals/san-diego-plan-b/original.pdf) | 5 | A1 单层手工模型已验收；完整 PDF 保留 14 页 | [来源](https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html) |
| `san-diego-plan-a` | [San Diego Plan A：三卧一卫单层](originals/san-diego-plan-a/original.pdf) | 5 | A1 单层手工模型已验收；完整 PDF 保留 14 页 | [来源](https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html) |
| `san-diego-plan-c` | [San Diego Plan C：两卧两卫单层](originals/san-diego-plan-c/original.pdf) | 5 | A1 单层手工模型已验收；完整 PDF 保留 14 页 | [来源](https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html) |
| `san-diego-plan-f` | [San Diego Plan F：一卧一卫紧凑单层](originals/san-diego-plan-f/original.pdf) | 5 | A1 单层手工模型已验收；完整 PDF 保留 14 页 | [来源](https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html) |
| `hillside-studio-a1` | [Hillside A1：小型 Studio](originals/hillside-studio-a1/original.pdf) | 1 | 需提供实测长度；总面积不能直接用于线性标定 | [来源](https://hillsidecourtyard.com/apartment-layouts/) |
| `hillside-corner-b5` | [Hillside B5：带餐区的转角一卧](originals/hillside-corner-b5/original.jpg) | 1 | 507×1024 JPG；缺少线性尺寸，L 形客餐厅分区 | [来源](https://hillsidecourtyard.com/apartment-layouts/) |
| `cmu-fairfax-studio` | [CMU Fairfax：双人 Studio](originals/cmu-fairfax-studio/original.pdf) | 1 | 位图 PDF，部分英尺标注；柱子和墙带需核对 | [来源](https://www.cmu.edu/housing/our-communities/residences/fairfax.html) |
| `cmu-fairfax-two-bedroom` | [CMU Fairfax：三人两卧公寓](originals/cmu-fairfax-two-bedroom/original.pdf) | 1 | 8'6" 小卧室；柱子、门扇与衣柜占地 | [来源](https://www.cmu.edu/housing/our-communities/residences/fairfax.html) |
| `cmu-fairfax-one-bedroom-jpeg` | [CMU Fairfax：一卧网页图片](originals/cmu-fairfax-one-bedroom-jpeg/original.jpg) | 1 | 509×542 原生网页 JPG，文字较小，不应猜读 | [来源](https://www.cmu.edu/housing/our-communities/residences/fairfax.html) |
| `imprint-a1` | [Imprint A1：租赁一卧](originals/imprint-a1/original.pdf) | 1 | 带家具的 3D 营销图；644 sq ft 是面积，不能作为线性标定依据 | [来源](https://liveatimprint.com/floorplans/a1/) |
| `zag-b4-image` | [ZAG B4：一卧租赁 PNG](originals/zag-b4-image/original.png) | 1 | 斜向外墙、阳台、壁橱；完整斜墙模型超出当前能力 | [来源](https://zag.aragon.ca/floor-plans/) |
| `zag-live-work` | [ZAG LW1：上下层 Live/Work](originals/zag-live-work/original.pdf) | 1 | 同页上下两层、斜墙和挑空；不能合并为单层 | [来源](https://zag.aragon.ca/floor-plans/) |
| `remington-b-basement` | [Remington B：标有地下室的两层联排](originals/remington-b-basement/original.pdf) | 1 | 文件含一层/二层及地下室标记，未提供完整地下室平面 | [来源](https://www.remington-grove.com/floor-plans) |
| `jacobsen-isw-4521` | [Jacobsen ISW-4521：狭长单宽预制住宅](originals/jacobsen-isw-4521/original.pdf) | 1 | 13'4"×52'，名义尺寸近似；小卧室与斜向设备/门 | [来源](https://www.jachomes.com/manufactured-modular-homes/single-wide/two-bedroom/one-and-a-half-bath/isw-4521/) |
| `regent-unit-l` | [Regent Unit L：养老公寓一卧](originals/regent-unit-l/original.pdf) | 1 | 门口、衣柜折叠门、斜墙局部；不代表无障碍规范认证 | [来源](https://www.regentburnsville.org/floor-plans/) |
| `newmark-umbria` | [Newmark Umbria：大独栋与可选布局](originals/newmark-umbria/original.pdf) | 2 | 第 2 页包含主方案与多个可选方案，不应混算为一栋房屋 | [来源](https://newmarkhomes.com/uploads/files/Floorplans/Umbria/5014_MKT_PL_HOU_3-9-21.pdf) |
| `toronto-dawes-west-floor6` | [Toronto 6 Dawes：斜向多单元整层](originals/toronto-dawes-west-floor6/original.pdf) | 9 | 第 9 页 A214.S；29 页完整规划文件，毫米尺寸与 m²/ft² 混用 | [来源](https://www.toronto.ca/legdocs/mmis/2021/cc/bgrd/backgroundfile-166251.pdf) |
| `loc-norvelt-house-types` | [HABS Norvelt：历史住宅档案中的户型](originals/loc-norvelt-house-types/original.pdf) | 18 | PDF 第 18 页（页内编号 17）；低清历史扫描，多户型多层 | [来源](https://tile.loc.gov/storage-services/master/pnp/habshaer/pa/pa2500/pa2599/data/pa2599data.pdf) |

## 后续深入测试顺序

| 优先级 | 素材 | 主要验收目标 |
|---|---|---|
| P0：尺寸与输入真实性 | Hillside A1/B5、Imprint A1、ZAG B4/LW1 | 没有线性尺寸时需实测参照；不能把总面积当作两点距离，也不能用示意家具反推出可靠比例。确认取消、失败和重新导入不覆盖项目。 |
| P0：位图与小字 | CMU 三图、HABS Norvelt | PDF 内图片、低分辨率 JPG、扫描噪点的读取与缩放；标注读不清时保留未知，不能猜尺寸。HABS 第 18 页的页内编号为 17。 |
| P1：紧凑布局与家具 | CMU Studio / 两卧、Jacobsen、Regent L | 小卧室 Queen 床、衣柜推拉/折叠门、洗衣设备、厨卫固定设施与开门占地；长条户型的全屋视图和窄屏操作。营销标注是近似尺寸，实际购买应使用实测数据。 |
| P1：复杂图面 | Newmark Umbria、Toronto 6 Dawes | 正确选页、区分立面/主平面/可选方案、整层图与单套图；mm、m²、sq ft 的区分、密集标注、PDF 内置旋转。 |
| P2：当前建模能力边界 | ZAG B4/LW1、Remington、Newmark、Toronto、HABS | 斜墙、多缺口、楼梯、地下室和多层不能直接当作当前单层矩形组合模型验收；先记录真实缺口及重现步骤，再确定实现范围。 |

每个新案例后续分别记录：源文件摘要 → 已知长度及端点 → 手工参数/不确定项 → 门窗/家具检查 → JSON 刷新回导 → 2D/3D/PNG/PDF → 窄屏。逐个完成和复测；完整测试结果应另建验收文档，不能直接把 `collected-not-accepted` 改成通过。

## 重复使用与补充采集

只核对本地文件与清单：

```bash
# 使用现有具备 PyMuPDF 的 Python QA 环境
python scripts/floorplan-corpus.py
```

如果需要建立独立 QA 环境：

```bash
python3 -m venv .cache/floorplan-corpus-venv
.cache/floorplan-corpus-venv/bin/pip install PyMuPDF
.cache/floorplan-corpus-venv/bin/python scripts/floorplan-corpus.py
```

下载清单中缺失的原文件并生成预览：

```bash
.cache/floorplan-corpus-venv/bin/python scripts/floorplan-corpus.py --download-missing --render
```

脚本仅下载不存在的原文件，不覆盖已有原件；已有 SHA-256 不匹配时直接失败。单文件采集上限为 50 MiB，应用当前图纸导入上限为 20 MiB，本批全部原文件都在应用上限内。来源网站变化或失效时保留旧原件和摘要，新增版本使用新的 ID。

实际界面试读和目录检查（使用独立 Chrome profile）：

```bash
# 项目服务已经运行时无需再启动；TEST_URL 可指向自己的测试端口。
PLAYWRIGHT_MODULE=/absolute/path/to/node_modules/playwright TEST_URL=http://127.0.0.1:8086/ node tests/browser-floorplan-corpus.mjs
```

仅采集无需登录的公开发布文件。营销图、大学示例布局、历史档案和规划申请图不是同一种尺寸证据，已在清单中区分；本库不将它们称为当前房屋的实测施工图。原版权说明保留，公开访问不等于已获得公开再分发许可。采集验收清单中的交付状态为提交前的历史快照；后续交付范围见 [本批交付记录](../../../docs/NA-delivery-2026-10-02.md)。无法采集的 Marysville 文件返回 HTTP 403，已用 Jacobsen 同类方案替代，记录见 [不可用来源](unavailable-sources.json)。


## 2026-10-03 可复用斜切与补充复核

单角斜切已支持四个方向和不同斜率，四套局部 / 合成场景共用编辑、面积、冲突和导出；这些场景不计作原房屋完整验收。Jacobsen 全屋组合与细部尺寸仍待核对。Plan F 原手工模型的橱柜 3 in 越界已修正，最新模型及复测见 [斜切角与 Plan F 补充验收](../../../docs/NA-diagonal-cuts-verification-2026-10-03.md)。18 份原图不变；4 套既有单层手工模型与其余 14 份待完整验收资料的数量不变。


Jacobsen 已补 12 空间 / 20 件家具的全屋工程测试，与 CMU 8 空间复用同一验收脚本，并修复 3D 标签互相遮挡；原住宅完整尺寸仍未验收。模型、假设清单与复测见 [全屋组合复用](../../../docs/NA-whole-floor-reuse-verification-2026-10-03.md)。
