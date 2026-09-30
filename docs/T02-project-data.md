# T02：v2 矩形房间数据约定

[项目首页](../README.md) · [架构](architecture.md) · [任务书](T02-room-and-openings-plan.md) · [验收](T02-verification.md)

## 版本与来源

导出统一为 `format: "floorplan-3d"`、`version: 2`。v1 的身份、时间、家具、房间设置、单位、布局、测量、视图和几何字段语义保留，新增必填 `roomEditor`：

- `null`：几何快照。允许继续摆家具、改材料与原有拆墙；不推断矩形或门窗父墙。
- `kind: "rectangle"`：单矩形参数。参数及 `rooms[roomId]` 是结构和房间名称/材料的唯一编辑来源，`geometry` 为确定性生成的快照。

[v2 可编辑夹具](../tests/fixtures/rectangle-project-v2.json)包含完整项目；[v1 独立卧室](../tests/fixtures/custom-project.json)保持 v1，供兼容验证。

```json
{
  "kind": "rectangle",
  "roomId": "room-1",
  "width": 4000,
  "depth": 3000,
  "height": 2800,
  "wallThickness": 120,
  "openings": [
    {"id":"opening-door-1","type":"door","wallId":"top","offset":500,"width":900,"height":2100,"hinge":"start","swing":"inward"},
    {"id":"opening-window-1","type":"window","wallId":"right","offset":900,"width":1200,"height":1200,"sill":900}
  ]
}
```

矩形项目仅有一个房间，`demolished: []`，不带原模板 `templateId`。新建生成新项目 ID、布局 ID、时间；默认 2D、公制，无家具/门窗/测量。语言为应用偏好，沿用当前选择。

## 数值与约束

所有长度是有限浮点毫米，不取整保存。净宽/净深 **100–100000 mm**，净高 **100–20000 mm**；固定墙厚 **120 mm**。洞口宽/高至少 1 mm，窗台至少 0 mm，每个房间最多 200 个洞口。名称非空且最多 500 字符。范围是编辑器支持边界，不是建筑规范或适用性建议。

洞口两边距墙角及同墙投影间距至少 1 mm；不同高度但平面投影重叠仍拒绝。门高、窗台+窗高不得超过净高。`door` 必须带合法 `hinge/swing`，不能有 `sill`；`window` 必须带 `sill`，不能有 `hinge/swing`。ID 使用安全字母数字/下划线/连字符，门窗 ID 与项目、布局、房间、家具 ID 不得重复。

唯一绝对容差 `GEOMETRY_TOLERANCE = 1e-6 mm` 用于快照数字比较和洞口端距/间距/窗顶的浮点边界。不把容差处理或显示舍入写回输入。

| 墙 | 起点 → 终点 | 室内法向 |
| --- | --- | --- |
| `top` | `(0,0)` → `(width,0)` | +Y |
| `right` | `(width,0)` → `(width,depth)` | -X |
| `bottom` | `(0,depth)` → `(width,depth)` | -Y |
| `left` | `(0,0)` → `(0,depth)` | +X |

`offset` 指起点到洞口起边；`start/end` 为洞口沿正向起端/末端铰链；`inward/outward` 相对房间内部。

## 几何快照

`generateRoomGeometry(editor, rooms)` 无 DOM/Three.js 依赖：

- 净轮廓 `(0,0)..(width,depth)`，净面积严格 `width*depth/1e6`。
- 墙厚向外；上下墙拥有四角，左右墙只覆盖室内 Y 区间，避免重叠实体。固定顺序 `top/right/bottom/left`，每墙按 offset 分段。
- `walls` 保持 `[x0,y0,x1,y1,type]`；新增 `wallIds` 与分段一一对应。逻辑墙 ID 不等于旧快照的 `wN`。
- `doors/windows` 新增稳定 `id/wallId`，其余字段兼容旧渲染器。门 `h/c/o/len/height/rect/name`；窗 `rect/sill/head`。
- `lintels: []`；3D 建筑模块按洞口生成门顶墙、窗台下墙和窗顶墙，不重复封洞。
- `origin` 为净房间中心，尺寸线随宽深变化，bounds 包含尺寸线和外开门扇范围。`walkStart` 位于室内，目标不重合；`entry:null`，不猜测入户门。

v2 导入必须通过普通项目验证、参数验证及生成快照的递归比较。墙段顺序、字段、几何数值有实质不一致就拒绝导入；不静默重算覆盖文件。

## 原子编辑与读写

`createRectangleProject()` 创建新项目。`updateRectangleProject(project, editor, rooms)` 克隆并生成候选项目；UI 完整校验候选后一次 `store.replaceProject()`。无变化不入历史，失败不修改时间、选择或保存数据。尺寸修改不缩放/平移家具和测量端点；若使洞口非法，则拒绝整次修改。

v1 先按其既有规则完整校验，再仅将版本改为 2、加入 `roomEditor:null`。不重排墙段，不改 ID、时间、小数、材料、家具高度、拆墙引用、测量和偏好。无版本旧文件仍须确认原模板，原文备份成功后才能替换。

存储读取顺序 `floorplan-project-v2` → `floorplan-project-v1` → `huxing-design-v1`，仅键不存在才回退。v1 成功读取后将迁移副本保存到 v2；写入失败仍保留内存项目和旧键，显示备份提示。旧键不删除、不覆盖。

损坏的 v2 键后续覆盖前写入唯一 recovery 键；备份失败禁止覆盖。序列化、文件导入、本地保存均使用同一数据校验。旧版应用不能读取 v2 文件，不支持新旧应用同时编辑后的自动合并。
