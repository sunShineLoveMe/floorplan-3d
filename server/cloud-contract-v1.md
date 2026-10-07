# 云容器 / API 契约 v1

状态：BE-01 开发契约。保留现有独立 v2 JSON，不把云容器当成新的离线文件格式。

## 容器与元数据

```json
{
  "format": "floorplan-cloud",
  "version": 1,
  "domain": {
    "units": {"internal": "mm", "display": "imperial"},
    "layout": {"id": "layout-1", "name": "Layout A"},
    "view": {},
    "roomEditor": {},
    "geometry": {},
    "rooms": {},
    "furniture": [],
    "demolished": [],
    "measures": []
  }
}
```

上例只展示结构，不是合法可导入的完整工程。`domain` 的明确嵌套白名单在 `src/container.ts`：保留几何、编辑器、单位、展示设置、家具 / 高度 / useZones、clearance、reference 标定及已有模板 / 迁移来源；不舍入毫米浮点数。底图只存 `assetId`（UUID v4）及标定字段，不保存 src、签名 URL 或原始 PDF。

服务器元数据：`id`（UUID v4）、可信 session 用户归属、`revision`（从 1 单调增长）、`createdAt` / `updatedAt`（UTC ISO 时间）、`name`、`deletedAt`。创建只允许提交 name；服务器分配项目 ID / owner / revision / 时间。客户端 `mutationId` 使用 UUID v4，`expectedRevision` 必须是当前确认的正整数。

- API envelope 未知字段拒绝；`ownerId` / `owner_id` / `role` / `permissions` / `session` / `sessionToken` 和危险 prototype 字段在任何深度拒绝。
- 云领域 / 本地适配的其他未知字段按嵌套白名单剔除；不能成为授权依据。local id、name、timestamps 不进入 cloud domain。临时 preview、draft、selection、Undo history 不进入正文。
- `editorToCloud` 先投影再复用现有领域校验；v1 升级为 v2。无 version 的 legacy 必须先走原有确认式导入，BE-03-05 再实现云迁移 UI；不能自动认领 localStorage。
- `cloudToEditor` 使用当前服务端元数据恢复 v2；历史快照无项目名称，因此恢复历史不覆盖重命名。存在底图但没有 raster 时明确失败 `ASSET_UNAVAILABLE`，不能把临时 URL 写入领域模型。缓存和离线资产下载属于 BE-03。

## API

| Method / path | 请求 | 响应 |
| --- | --- | --- |
| GET `/api/health` | 无会话 | 环境和契约版本 |
| POST `/api/auth/sign-in/social` | Better Auth `{provider:"google",callbackURL:同源地址}` | OAuth URL / 库错误 |
| GET `/api/auth/callback/google` | Google callback | Better Auth 验证 state / code，写会话 cookie |
| POST `/api/auth/sign-out` | `{}` + cookie + Origin | 撤销当前 D1 session |
| GET `/api/me` | cookie | `{user:{id}}` |
| POST `/api/projects` | `{name,mutationId,container}` | `201 {project,mutationId,replayed,metering?}` |
| GET `/api/projects?cursor=UUID` | cookie | `{projects,nextCursor}`，最多 20 项元数据 |
| GET `/api/projects/:id` | cookie | `{project,container}` |
| PUT `/api/projects/:id` | `{expectedRevision,mutationId,container}` | `200 {project,mutationId,replayed,metering?}` |
| GET `/api/mutations/:id` | cookie | 已提交 mutation 的原始 `{project,mutationId}` |
| GET `/api/assets/:id` | cookie | 同 owner 的 ready / 未删除文件字节 |

每个业务私有查询和修改都按可信 owner 限定，找不到或越权统一 404。不提供客户端选择 owner 的入口。写请求要求 `Origin === APP_ORIGIN`，跨站 Sec-Fetch-Site 拒绝。没有宽泛 CORS。私有 API 使用 `Cache-Control: private, no-store`。

业务错误：`{error:{code,requestId,...detail}}`。Better Auth 自身端点保留官方错误结构，后续 UI 同时读取其 `code` 与业务 `error.code`，不把错误当保存成功。

| code | HTTP | 客户端处理 |
| --- | --- | --- |
| INVALID_REQUEST / INVALID_PROJECT | 400 / 422 | 修正输入，保留本地工程 |
| SESSION_REQUIRED | 401 | 停止云队列，重新登录 |
| ORIGIN_REJECTED | 403 | 检查同源配置 |
| NOT_FOUND | 404 | 不展示他人资源 |
| CONFLICT | 409 | 展示 currentRevision，保留本地副本，禁止自动覆盖 |
| MUTATION_REUSED | 409 | 同 ID 不同 payload，不可重放 |
| MUTATION_EXPIRED | 409 | 先重新同步，再由用户决定新提交 |
| BODY_TOO_LARGE | 413 | 本地保留 / 导出 |
| QUOTA_EXCEEDED | 429 | 本地保留 / 导出，不能盲目重试 |
| AUTH_NOT_CONFIGURED | 503 | 完成开发环境配置 |
| TEMPORARY_FAILURE / SNAPSHOT_UNAVAILABLE / ASSET_UNAVAILABLE | 503（无权限引用 422） | 保留冻结请求 / 草稿；核对回执，不假成功 |

## 原子提交与幂等

R2 每次尝试使用新的不可变 key。D1 一个 batch 提交条件项目更新、版本、version_assets、已提交字节和回执，每条后续 SQL 由独立 commit_token 守卫，不能用可能相同的 mutationId 守卫。D1 更新 0 行时，后续写入也为 0；检查最终回执，否则返回冲突或配额错误。

同 owner 内 mutation ID 唯一，回执请求 hash 绑定操作、项目、expectedRevision、规范化正文及创建名称。同 ID 同请求回放原始结果；不同请求返回 MUTATION_REUSED。取消 fetch 不代表服务器取消提交，客户端必须保留原 payload / mutationId；恢复后查询回执或重试原请求。

回执有效期 30 天，客户端最大自动重试期计划 7 天。BE-01 不清除回执：过期回执保留为 tombstone 并拒绝重放。BE-03 清理实现前须定义有界 tombstone / mutation epoch 策略，不能删回执后自动把旧请求当新提交。已删除项目不回放成功，防止客户端重新进入保存队列。

`metering` 是本地及远程 D1 commit batch 的 rows_read / rows_written，用于调试；不包含会话、授权、对象读取或回执 lookup，不能作为完整计费统计。完整请求计量和 CPU 观测仍需 BE-01-05 / BE-04。

## 配置上限

| 环境变量 | 开发默认 | 状态 |
| --- | --- | --- |
| MAX_BODY_BYTES | 1 MiB | 请求 envelope 与规范化正文各检查，流式拒绝超限 |
| MAX_RASTER_BYTES | 3 MiB | ready raster 引用检查；上传尚待 BE-03 |
| MAX_SOURCE_BYTES | 20 MiB | 源文件契约预留，上传尚待 BE-03 |
| MAX_PROJECTS | 20 | 包括软删除项目，避免删除规避容量 |
| MAX_USER_BYTES | 100 MiB | 已提交快照 + 已计量 / 预留字节，D1 原子限制 |

这些不是已经冻结的生产承诺。上传、pending、孤儿、回收站、备份的完整计量和清理尚未实现，需实测 Worker CPU 后调整容量及计划。
