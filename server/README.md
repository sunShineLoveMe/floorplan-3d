# Cloudflare BE-01

原生 ESM 编辑器保持独立。本目录提供 Hono Worker、Better Auth / Google 会话、D1 元数据及 R2 不可变快照的开发最小链路；完整云项目 UI、草稿队列、文件上传及清理尚在后续批次。

## 本地运行

需要 Node >= 22.22.3。

```sh
cd server
npm ci
cp .dev.vars.example .dev.vars.development
# 编辑 .dev.vars.development；session secret 用随机值，至少 32 字符。
npm run migrate:local
npm run dev
```

本轮已生成一个权限 0600、被 Git 忽略的本地随机 session secret。不要用示例 secret 或本地 secret 部署。开发入口 `http://127.0.0.1:8787/` 保持无登录可编辑；`/cloud-development` 提供 Google 登录 / 退出和会话检查。Google 尚未配置时页面会显示实际错误，没有测试身份后门。

Git 仓库只有 `.dev.vars.example`，已有开发机的秘密文件不会随克隆取得。在已有开发机请直接保留 `.dev.vars.development`；只有首次配置新机器时才复制示例，再单独填入获授权的开发凭据。

```sh
npm run typecheck
npm test
npm run test:worker
npm run build
npm run auth:generate
```

`test` 使用真实本地 D1 / R2 绑定、Better Auth 会话及 SQL trigger 注入故障。`test:worker` 运行打包后的代码，保存 Umbria 及接近 1 MiB 的样本。它们均不接触 Google 或远程 Cloudflare。`build` 是 `wrangler deploy --dry-run`，不会部署。前端原验证仍在项目根目录运行 `npm test`、`npm run build`。

## 开发环境配置

1. 为 `development` 创建独立 D1 `floorplan-development`、私有 R2 `floorplan-development-private`，在 `wrangler.jsonc` 填实际 ID；生产继续独立配置，预览不能使用生产数据。
2. Remote Worker 的 `APP_ORIGIN` 使用实际 HTTPS `workers.dev` 地址；本地开发通过 `.dev.vars.development` 覆盖为 `http://127.0.0.1:8787`。同一 origin 内调用，不配置宽泛 CORS。
3. Google OAuth Web client：本地回调 `http://127.0.0.1:8787/api/auth/callback/google`；远程回调 `https://实际开发域/api/auth/callback/google`。授权 origin 同步设为对应 origin。开发 consent screen 加明确测试账号；不在请求中选择可信 origin。
4. `BETTER_AUTH_SECRET`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` 通过本地 .dev.vars 或环境 Secrets 保存，不能提交 Git。
5. 部署前先审查迁移、静态 manifest、依赖和数据绑定；再对开发 D1 执行 `wrangler d1 migrations apply floorplan-development --remote --env development`，按授权部署开发环境。

所有会话从 D1 实时读取，禁用 cookie cache。远程 HTTPS 使用 Secure + HttpOnly + SameSite=Lax，本地 loopback HTTP 不加 Secure。写 API 要求精确 Origin；Better Auth 自带 OAuth state / origin / CSRF 检查保持开启。Google client 缺失时不启用 provider。

## Schema / 升级 / 恢复

`0001_auth.sql` 是 Better Auth 1.7.7 官方 CLI 对空的临时 SQLite 生成的 SQL；`0002_projects.sql` 是审查后的业务迁移。CLI 不连接运行库；D1 空库初始化和已有认证库升级均已本地验证。`auth:generate` 的 schema mismatch 是空库 introspection 预期提示，不应将其当运行库自动修复步骤。

迁移仅通过 Wrangler 应用，不在请求 / 启动时执行。已经应用的 SQL 不修改，后续追加 `0003_...sql` 向前修复；开发库先演练。远程升级前保留 D1 导出和 R2 引用清单；回退应用需要保持 schema 向后兼容。数据库备份不能替代 R2 备份，完整联合恢复属于 BE-04。

业务 SQL 参数化；项目及版本以 owner 复合外键约束。版本资产必须同 owner、ready、未删除。mutation owner 内唯一。项目列表用 `(owner_id, deleted_at, id)` 索引作 UUID keyset 分页，仅返回元数据。

## 保存与运行边界

流程是可信 session → 有限流式解析 → 显式字段投影 → 复用 `validate(project, CATALOGS)` → canonical JSON / SHA-256 → 新 R2 key → D1 原子提交。每次尝试有独立 `commit_token`，UPDATE / INSERT 后每条版本、配额、回执 SQL 均由同一个 token 守卫；0 行更新不产生任何成功索引或回执。同 mutation 并发返回同一结果；ID 同内容不重复提交，ID 不同内容拒绝。

D1 响应丢失时不删除可能已成功引用的 R2 对象，原 mutation 重试查回执。失败对象留作待清理孤儿；BE-03/04 才实现安全清理、上传预留和完整存储计量。当前只对已提交快照、已有配额占用加总做原子限制，不能当作公开试运营的防滥用系统。没有上传 / finalize / 删除 / 恢复接口，也没有生产测试账号入口。

原始文件与 raster 的配置上限已分开；上传校验尚未实施。dev ceiling：正文请求 1 MiB、raster 3 MiB、源文件 20 MiB、账号 20 项目、已提交存储 100 MiB。正文请求上限包括 envelope；所有历史快照计入存储，当前不自动删除历史。生产容量需真实 CPU P95/P99 与完整 D1 请求计量后冻结，不能从本机 wall-clock 推断。

静态发布只取 `index.html`、`src/`、`styles/`、`vendor/` 和明确列出的开发检查页；保留许可证，排除 source.json、source map、docs、tests、server、密钥及仓库根目录其他文件。`/api`、`/api/*` 进入 Worker，其余已有静态资源由 Assets 直接服务。开发检查页只用于首批验证，可在后续产品 UI 接入时移除。

契约见 [cloud-contract-v1.md](cloud-contract-v1.md)。验收证据见 `../docs/verification/backend-cloudflare/BE-01/`。公开试运营仍需完成清单 BE-02～BE-04。

## 2026-10-07 开发资源状态

已创建开发 D1 `floorplan-development`，应用 `0001_auth.sql`、`0002_projects.sql`；私有 R2 `floorplan-development-private` 位于 APAC，Standard，公开访问关闭。Wrangler OAuth 登录已成功，凭据使用 macOS Keychain 加密保存；没有增加不相关产品 scope。

已部署开发 Worker `floorplan-development`，配置域名 `https://floorplan-development.juneandrao.workers.dev`，绑定上述开发 D1 / R2 与白名单静态 Assets；单独生成的远程 `BETTER_AUTH_SECRET` 已写入 Cloudflare Secrets。本机配置文件和示例文件中的 origin 覆盖只用于本地。

首次 TLS 握手失败已留证，后续正常 HTTPS 恢复；线上未登录编辑器及基础 HTTP 冒烟通过。Google OAuth 开发 client 已创建，两个 Google 字段已写入本机被忽略的配置文件及开发 Worker Secrets，应用保持 External / Testing。仅精确 Google GET 回调允许跨站导航，由 Better Auth 验证 state；其他跨站请求仍拒绝。当前 provider 初始化和缺失 state 的拒绝已验证，真实登录、账号隔离、保存 / CPU P95 / P99 尚未通过。配置入口见 [开发环境配置](../docs/backend-cloudflare-configuration-2026-10-07.md)，最新记录见 [OAuth 接续报告](../docs/verification/backend-cloudflare/BE-01/2026-10-07-oauth-01/report.md)。

`/cloud-development` 的 BE-01 验收按钮使用真实 session，创建两份合成项目并执行 Umbria / 近上限保存、幂等重试、同 revision 并发、越权与超限检查。它不访问编辑器 localStorage，也不提取 cookie；每次保留约 6 MiB 测试快照，重复运行消耗项目 / 存储配额。账号隔离按钮须在另一个真实账号中使用前一账号的 project / mutation ID。可下载不含凭据和正文的 JSON 结果；页面操作尚未执行不能当作验收通过。

运行 `node scripts/capture-acceptance-tail.mjs /绝对路径/sanitized.jsonl` 可仅捕获带验收标记的请求。脚本在持久化前丢弃 headers、cookies、查询串、认证端点及原始日志；平台没有返回 CPU 字段时不伪造 CPU。CPU 可从 [平台指标](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/)取得，客户端 wall-clock 单独记录。完成采集后停止 tail。

## 官方依据

- [Better Auth 1.7.7 changelog](https://better-auth.com/changelog)
- [Better Auth D1 支持](https://better-auth.com/docs/adapters/other-relational-databases)
- [Better Auth CLI](https://better-auth.com/docs/concepts/cli)
- [会话缓存与撤销](https://better-auth.com/docs/concepts/session-management)
- [D1 batch 原子性](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [Static Assets 路由](https://developers.cloudflare.com/workers/static-assets/routing/advanced/)
