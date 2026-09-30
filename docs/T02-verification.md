# T02 矩形房间与门窗验收

[项目首页](../README.md) · [任务书](T02-room-and-openings-plan.md) · [v2 数据约定](T02-project-data.md)

## 结论与本地状态

2026-09-30，完成单矩形房间净尺寸、门窗父墙及数值编辑、2D/3D 同步、事务撤销、v2 保存和 v1/无版本旧文件兼容。可按自己的毫米尺寸创建房间并试摆家具。T03 英制输入、自动越界/碰撞提示、多房间和后端均未开发。

直接接续 `/Users/chris/Documents/项目/AI家装/floorplan-3d` 当前工作区；分支 `feat/project-data-t01`，HEAD 保持 `31fa6b533bc79ed10caf2e82a885d9b82b64a2c4`。以上为开发验收时点，当时未提交、推送、合并或公开部署。验收后用户已授权提交推送当前分支、合并到 `master` 并切回开发分支；实际执行结果以 Git 为准。开始时已有 README、roadmap 改动与未跟踪 T02 任务书，均在原文件上继续维护，没有重置、清理、另克隆或丢弃。

31 项 Node 测试通过；6 套 Chromium 浏览器脚本完成当前验证；JS 语法、ESLint 与 diff 空白检查通过。Safari、Edge 和真实移动设备等未测项见末尾，不将桌面窄屏模拟当成实机验收。

## 基线与环境

- 已读取用户项目约定、T02、T01、T01.1 任务书、架构、开发、使用及 T01.1 验收文档；项目及各父目录未发现其他 AGENTS.md。
- 修改前 `npm test` 19/19 通过。保留原测试意图，版本断言升级为 v2，原 v1 卧室夹具继续保持 v1；未来版本夹具仍为 999。
- 复用 Python PID 20514 的静态服务：监听 `127.0.0.1:8086`，启动参数 `--directory /Users/chris/Documents/项目/AI家装/floorplan-3d`。工作目录在上一级，但 URL 根路径实际就是项目。未停止或替换服务。
- macOS arm64、Chromium 149.0.7827.55，1440×1000 与 390×844。所有测试使用新的非持久 context，没有接入、清空或改写用户浏览器存储。
- Playwright 使用已有 Codex runtime，Chromium 使用本机现有安装。项目没有增加运行依赖、框架、数据库、构建器或后端。3D 使用实际 CDN Three.js r160 与 WebGL。

## 分批交付

| 批次 | 结果 | 验证 |
| --- | --- | --- |
| A 数据 | 纯矩形模型、生成几何、v2 校验、v1 迁移、存储优先级 | 19 项基线扩为 30 项数据/服务测试 |
| B 房间 | 草稿、取消、新建替换、净尺寸修改、家具/测量保留 | 新建 12.00 m² → 摆床 → 扩房 14.40 m² → 撤销/重做 |
| C 门窗 | 父墙、方向、位置/尺寸、铰链/开向、窗台、增删改 | 16 种门方向 UI/SVG；真实建筑函数 1152 组边界组合；新门实际开合 |
| D 持久化 | v2 恢复与文件往返、v1/旧文件、迁移与备份失败 | 真实下载/上传、刷新再编辑、故障注入、迟到读取保护 |
| E 交付 | 架构、schema、使用、功能、路线及本验收记录 | 31 Node、6 浏览器脚本、语法/lint/diff、截图与导出目视检查 |

## 可复现命令与自动化

```bash
npm test
npx --yes --package eslint eslint --config tests/eslint.config.js src
export PLAYWRIGHT_MODULE=/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright
export CHROMIUM_EXECUTABLE=/Users/chris/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell
export TEST_URL=http://127.0.0.1:8086
node tests/browser-t02.cjs
node tests/browser-t02-storage.cjs
node tests/browser-t02-doors.cjs
node tests/browser-regression.cjs
node tests/browser-3d-interactions.cjs
node tests/browser-failures.cjs
```

[Node 完整结果](verification/T02/node-tests.txt)、[源码检查](verification/T02/source-checks.json)、[ESLint 输出](verification/T02/lint.txt)。无应用构建步骤。

新增 Node 覆盖净面积、毫米小数、四角墙段、洞口分段、动态 origin/bounds/标注、16 门方向、窗顶、非法参数/重复 ID/父墙/重叠/缩房、参数快照不一致、保存失败、v1 保真迁移、撤销重做、取消/no-op、稳定 ID 与家具/测量位置。

`tests/architecture.test.js` 直接读取实际 `architecture.js`，只替换 Three 与资源清理依赖；1152 组组合中所有 BoxGeometry 尺寸必须有限且为正。覆盖四墙、铰链/开向、1/900 mm 宽、门高 1/H−1/H、0/1000 mm 窗台、1 mm/齐顶窗与剖切。断言 1 mm 过梁不漏画、不重复，齐顶门无过梁。此项为几何单元验证，不代替 GPU 渲染。

## 真实浏览器矩阵

| 场景 | 结果与证据 |
| --- | --- |
| 创建与取消 | Escape 保留原 46 家具；创建后单房间、无家具/洞口、12.00 m²；整体撤销回示例，重做恢复同一项目 ID。[空房间](verification/T02/room-empty.png) |
| 输入无效/no-op | 空宽拒绝；无变化提交不改时间/存储；非法提交后撤销仍指向上一有效操作。[主结果](verification/T02/browser-t02-results.json) |
| 添加门窗 | 真实点 SVG 上墙，添加 offset500/宽900/高2100门；右墙 offset900/宽1200/台900/高1200窗，选择窗时高亮右墙方向。[2D](verification/T02/room-door-window.png) |
| 改尺寸与位置 | 摆床后修改 4500×3200×3000，14.40 m²；家具全部字段不变，origin/层高更新；单步撤销/重做保留洞口 ID。测量绝对坐标另由 Node 验证 |
| 非法结构 | 窗越界、同墙重叠、净高降到2000均拒绝，指出错误洞口，保存字节和历史不变。[越界错误](verification/T02/invalid-window.png) |
| 门翻转/换墙/删除 | 16 个 wall×hinge×swing 组合通过真实表单；删除后撤销恢复相同 ID。全部组合的数学方向由纯模型/实际3D生成器验证 |
| 3D 同步 | 新房间/门窗/床正常；在3D改为4700宽/3100高，建筑与视角同步，家具数据不变，再撤销回4500/3000。[初始3D](verification/T02/room-3d.png) / [修改3D](verification/T02/resized-3d.png) |
| 新门真实开合 | 900/top/start/inward 关闭改变20238像素，重新打开残差0；实际表单改为1200/bottom/end/outward后关闭改变22297像素，重开残差0。门动画不改变项目存储。[结果](verification/T02/doors/results.json) / [900门](verification/T02/doors/900-top-start-inward-closed.png) / [1200门](verification/T02/doors/1200-bottom-end-outward-closed.png) |
| 房间名称/材料 | 修改后 `rooms` 与生成几何同名/同材料；重新打开净尺寸表单直接应用不改时间或存储 |
| 焦点/语言 | 模态框输入内 Backspace/Ctrl+Z 不操作画布；Escape取消；新建表单 English 切换通过 |
| 文件往返 | 实际下载 [v2 JSON](verification/T02/rectangle-export.json)，新context通过文件输入上传、刷新，继续把窗台改为800.5 mm；几何/参数完整保留 |
| PNG | 实际下载并打开 [2D PNG](verification/T02/rectangle-2d.png)，尺寸线、墙体、门窗、床均非空且在画面内。旧3D截图导出也在原回归保留 |
| 坏文件 | 修改v2快照origin，文件输入导入被拒绝，保存原文不变；原回归还覆盖坏JSON、version999、旧迁移取消与先下载原文备份 |
| v1键迁移 | 浏览器直接放入v1键，读取后生成v2副本，源字节不变，再刷新成功；写v2失败仍展示卧室和明确错误。[存储结果](verification/T02/storage-browser-results.json) |
| 损坏与恢复失败 | 存在坏v2时不回退旧v1；recovery写入失败后编辑仍保留坏v2及v1原文，并提示保存失败。原回归另覆盖正常recovery和quota失败 |
| 迟到文件读取 | 挂起真实File.text，期间创建新房间，再释放读取：旧文件不覆盖新项目，提示重新导入 |
| 旧功能/原示例 | 主回归22项：原示例、v1独立卧室、家具/测量/材料、文件、PNG、撤销、刷新、语言、窄屏均通过。[结果](verification/T02/legacy-regression/browser-results.json) |
| 3D旧交互 | 6项：家具拖动/取消/撤销、相机、全高/剖切、日照、漫游和门开关通过。[结果](verification/T02/legacy-regression/3d-interaction-results.json) |
| 加载降级与销毁 | 7项：主动阻断CDN、模拟WebGL失败仍可2D编辑/导出；异步鼠标锁定拒绝有提示且可返回鸟瞰；待加载3D偏好、销毁RAF/Canvas与迟到回调通过。[结果](verification/T02/legacy-regression/failure-path-results.json) |
| 窄视口 | 390×844房间/门窗抽屉、表单、错误、取消和应用均可操作。[错误](verification/T02/narrow-error.png) / [房间](verification/T02/narrow-room.png) |
| 正常控制台 | T02主流程及门开合回归没有未捕获异常；故障注入的预期错误不计为正常运行异常 |

## 回归中发现并处理

1. 墙面面积改为实际 `geometry.height`，注明未扣门窗；门扇漫游阻挡从固定0.9m改为实际门宽。
2. 低/窄洞口：消除负尺寸门板、窗框限制在洞口内；合法1mm过梁不再被旧阈值跳过。SVG极窄门厚度与3D一致。
3. 2D第二触点取消家具事务；3D取消释放手势并清理点击起点，防止迟到pointerup重新操作。新建/导入/撤销/模式切换均取消未完成交互。
4. 文件异步读取加修订/请求序号，项目已变更或组件销毁时丢弃迟到结果。保存失败提示延后到当前动作提示之后，避免被“已添加家具”覆盖。
5. 原3D取消测试第一次严格Canvas字节比对失败；将撤销/重做后的稳定等待从150ms改为800ms后通过，严格断言保留。属于已观察的截图时序敏感，不据此推断完整渲染根因；原失败截图保留在 legacy-regression/3d-interaction-failure.png。
6. 最终旧流程复跑出现浏览器异步鼠标锁定拒绝（未处理Promise）。接管浏览器请求并处理拒绝/退出后的迟到结果；保留漫游重试入口、提示并可返回鸟瞰。新增故障注入断言，无未捕获错误后再验收。
7. T02脚本初次墙选择使用错误选择器，等待超时；校正为实际逻辑墙 `data-wall="top"` 后通过。保留 t02-failure.png，不能将它当作最终验收截图。

## 明确未测与边界

- 未测 Safari、Edge、真实手机/iPad、触屏双指/摇杆、不同GPU/驱动和数小时连续运行。390×844 是桌面模拟。
- 16门方向已覆盖纯模型、真实建筑生成函数及UI/SVG提交；真实3D射线点击/逐帧图像对比仅两种代表组合，未逐一人工操作全部16种。
- 没有逐个手工检查所有家具模型、全部尺寸极值与材质组合；1mm等极端洞口由几何单测覆盖，不代表实用建筑或通行条件。
- 未做超大文件/超多家具性能压力测试、运行中WebGL context丢失恢复；初始化失败已测。
- 家具和测量不自动随房间缩放，也不自动检测出界或门扇净空；需用户复核。漫游保持近似碰撞，不是人体通行验证。
- v1/无版本旧文件恢复为快照，不反推父墙。v2文件不能给旧版应用读取。材料估价仍沿用示例价格；3D Canvas PNG不含CSS2D标签。
- 未开发T03、框架/数据库/后端，也未部署或邀请真实用户试用；本记录是本地开发验收。
