# P0 公开住宅图纸验收与第二批修复

日期：2026-10-02。接续 `feat/ui-refactor` 当前工作区；此前修改与证据均保留，验收时尚未提交、推送、合并或部署。优先级依据 [原审查](NA-user-flow-audit-2026-10-01.md) 的 NA-001 / NA-002，首轮记录见 [逐项验收](NA-fixes-verification-2026-10-02.md)。

**本批支持每侧墙厚及整侧开放，修复多房间窗方向和不同墙厚的共享墙洞口。公开住宅图纸已可进行简化单层手工建模；完整真实户型还不能据此宣告验收。**

## 样本、尺度与建模范围

来源为 [圣迭戈县 Dwelling Unit Building Plans](https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html) 的 [PDS 673 Plan B PDF](https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds673_11x17.pdf)：标题 1200 SF、两卧室、单层、L 形外轮廓，可用于 ADU 或独立住宅。14 页，约 10 MB；A1 为第 5 页，PDF 页面有 270° 旋转信息。该样本是正式公开的建筑设计图，不是用户提供的房屋竣工图或已建成房屋实测资料。来源、下载日期和 SHA-256 见 [source.json](verification/NA-real-house/source.json)。

导入原始多页 PDF，选择 A1，以上侧标注的 54 ft 外尺寸两端标定，第一点作为坐标原点。尺寸来自图纸标签；校准端点通过页面像素点选，不能作为测绘精度验证。

通过实际 UI 表单输入 Dining、Kitchen、Bath、Bedroom 1、Bedroom 2、Living 及 Entry / Hall west / Hall east，共九个矩形空间。六个主空间保留图纸标签净尺寸；走廊与位置为简化手工描绘。L 形来自矩形组合和开放边界，单房间多边形尚未实现。

内墙 4.5 in / 外墙 6.5 in 为本次测试的成品墙厚假设，**不是由原图 2×4 / 2×6 木框标注直接确认的成品厚度**。实际使用应输入实测墙厚。没有完整描绘衣柜、洗衣区、厨房半高墙、全部门窗及其细部；该模型净面积约 1040 sq ft，不能与标题 1200 SF 直接作面积一致性验收，也不能作为完整施工模型。

## 发现、调整与复测

| 优先级 / 归属 | 发现 | 本批调整 | 复测 |
|---|---|---|---|
| P0 / NA-002 | 固定 120 mm 墙厚限制按住宅图纸定位 | 新建、编辑房间可分别输入 Top / Right / Bottom / Left 墙厚；0–1000 mm，默认 120 mm | 4.5 / 6.5 in 场景、旧数据默认值、保存及撤销 |
| P0 / NA-002 | 开放式餐厅、客厅、走廊会生成虚假封闭墙 | 整侧设为 0；相邻净空间按两侧较大墙厚留间距，双方 0 可直接相接 | L 形组合、无隔断、开放侧禁用门窗，已有洞口阻止改为开放 |
| P0 / NA-002 | 不同墙厚两侧的共享门洞可能被较厚墙封住 | 扩展洞口切除范围覆盖完整共享墙，两侧统一切除 | 114.3 / 165.1 mm 非对称共享门洞数据测试 |
| P1 / NA-004 本地服务 | 回归中本地模块请求 `ERR_CONNECTION_RESET`，页面无法初始化 | 开发服务器用 HTTP/1.1 长连接，监听队列由默认 5 调至 128；缓存策略不变 | 同来源连续导航 100 次正常，无脚本/请求失败 |
| P1 / 显示联动 | `roomId--top` / `roomId--bottom` 被当作竖向窗 | 2D 与 3D 按墙 ID 末端方向判断 | 四方向实际建筑生成器验证 + 住宅 72×48 in 水平窗 |

`House.rooms[].wallWidths` 为可选扩展，省略侧默认 120 mm。更改旧单矩形为非默认墙厚时转换为 House，原房间 ID、家具、测量、底图保留。整侧开放不等于局部通道或半高墙；已有门窗不能归属开放侧。墙厚修改如破坏邻室间距，整次提交被拒绝。

## 验证与证据

本地服务诊断捕获的连接重置见 [修复前请求记录](verification/NA-real-house/requests-before-server-fix.log)；调整连接处理后的连续 100 次导航见 [记录](verification/NA-real-house/requests-after-server-fix.log)。这证明本轮临时服务的改进，不证明 2026-10-01 原 8086 异常也由同一原因造成。

**最终版本 `b4be7033176714bb`：48/48 数据测试、11/11 住宅流程检查、12/12 前轮场景、连续 100 次导航、语法与 Lint 均通过。** [总结果](verification/NA-real-house/final-results.json)、[住宅结果](verification/NA-real-house/browser-results.json) 和下列本轮日志保留证据。

- 数据/建筑生成器：`npm test` 48 项；包括原 44 项与开放空间、墙厚校验、非对称共享洞口、房间前缀窗方向。[日志](verification/NA-real-house/unit-tests.log)
- 公开 PDF：14 页选页、旋转页面、54 ft 标定、底图保留；九区模型、共享墙门窗、Queen、挡门提示与移开消除、非法编辑原子拒绝、刷新及 JSON 全字段往返、墙厚撤销/重做、2D/3D PNG 下载、390px 表单访问。[脚本](../tests/browser-real-house.mjs)、[日志](verification/NA-real-house/browser.log)
- 前轮 NA-001～012 场景重新运行，证据写入独立子目录，未覆盖前轮。[日志](verification/NA-real-house/regression.log)
- ESLint、JavaScript 语法与 `git diff --check`。[Lint](verification/NA-real-house/lint.log)
- 可回导的 [住宅项目](verification/NA-real-house/house-project.json)，实际下载 [2D PNG](verification/NA-real-house/house-2d-export.png) / [3D PNG](verification/NA-real-house/house-3d-export.png)，[桌面](verification/NA-real-house/house-2d.png) / [窄屏](verification/NA-real-house/mobile-wall-fields.png)。

浏览器验证由 Playwright 驱动独立本机 Chrome profile，不使用用户 Chrome 存储。主要建模通过 DOM 表单完成；测试可直接操作文件输入和部分菜单按钮。没有开展外部用户试用。原 8086 服务保留，8095 临时测试服务已关闭。8086 原进程未重启，长连接修复需以后使用新的 `scripts/serve.py` 启动才能生效；8086 仅补验 HTTP 200。

## 下一优先任务与验收条件

仍优先补 NA-002 的真实户型表达能力：**部分墙段和半高隔墙**，然后补推拉/折叠洞口与衣柜、洗衣区域细节，再以同一 A1 图核对完整连通、净尺寸、面积统计与门窗定位。整侧开放已经解决本批开放空间阻断，但不能用它删除应当保留的局部隔墙。

之后再进入单个 L 形/非矩形房间、多楼层；自动识图无需成为先决条件。用户自有 PDF/图片、倾斜扫描、实体打印尺量、Safari/Firefox、真实触屏与长期使用尚未验证。当前项目仍只有一个布局数据集，没有账户或云同步。
