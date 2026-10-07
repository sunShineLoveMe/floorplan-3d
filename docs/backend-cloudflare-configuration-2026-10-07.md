# Cloudflare 后端开发环境配置

日期：2026-10-07。适用项目：`floorplan-3d`。本文件记录已实施的开发配置及验收边界，作为后续维护和接续开发入口。

## 当前结论

开发 Worker、D1、私有 R2、独立 session secret、Google OAuth Web client 和静态资源发布已配置完成。HTTPS 可访问；线上基础路由、未登录拒绝、禁止资源 404、Google provider 初始化及回调 state 拒绝已验证。Google 应用保持外部测试模式；测试用户配置、真实登录、账号隔离、云保存和 CPU 验收仍待完成，BE-01 尚未通过批次出口。

交付分支为 `feat/ui-refactor`，实施前基线 HEAD 为 `6ff58d74a29c1cdf7a2d14da625b618949facd76`。本次按用户授权提交并同步后端实现、必要 fixture 与文档；后续实际提交及远程状态按 Git 同步记录确认。本项目的 `production` 环境未部署。

## 云资源与绑定

| 配置 | 已实施的值 / 状态 |
| --- | --- |
| Cloudflare account ID | `fc237f83b491fe04cbfbd57c5f9ba812` |
| Wrangler environment | `development` |
| Worker name | `floorplan-development` |
| 开发 origin | `https://floorplan-development.juneandrao.workers.dev` |
| 部署版本记录 | 见 [OAuth / 验收接续报告](verification/backend-cloudflare/BE-01/2026-10-07-oauth-01/report.md)；secret 变更也会生成版本 |
| D1 name / binding | `floorplan-development` / `DB` |
| D1 database ID | `b4b72f97-5634-4556-bb32-e2690ac4a96e` |
| R2 name / binding | `floorplan-development-private` / `BUCKET` |
| R2 存储 | APAC / Standard，公开访问已禁用 |
| 静态资源 binding | `ASSETS` |
| workers.dev / preview URLs | 主开发 URL 启用；额外 preview URLs 关闭 |
| runtime | `compatibility_date=2026-07-30`，`nodejs_compat` |

配置源为 [wrangler.jsonc](../server/wrangler.jsonc)。Cloudflare 控制台将单个 Worker 的活动版本标记为“生产”；这里活动 Worker 的名称、资源和 `ENVIRONMENT` 都属于开发环境，不代表本项目生产资源已发布。

开发入口：[编辑器](https://floorplan-development.juneandrao.workers.dev/) · [登录 / 会话及保存验收页](https://floorplan-development.juneandrao.workers.dev/cloud-development) · [health](https://floorplan-development.juneandrao.workers.dev/api/health)。编辑器保持无需登录可用；验收页通过真实 Google 会话调用同一套私有 API，没有测试身份后门。

## 代码与依赖

后端位于独立 [server/](../server/README.md)，使用 TypeScript / Hono / Better Auth，复用已有纯 JS 领域校验与 catalog。原生 ESM 编辑器保持现有结构。

| 依赖 | 锁定版本 |
| --- | --- |
| Better Auth / schema CLI | `1.7.7` |
| Hono | `4.13.13` |
| Wrangler | `4.148.0` |
| TypeScript | `6.0.3` |
| Miniflare（本地测试直接依赖） | `4.20260730.0` |
| tsx | `4.23.15` |
| Node 要求 | `>=22.22.3` |

完整依赖与 overrides 以 [package.json](../server/package.json) / [package-lock.json](../server/package-lock.json) 为准。Wrangler 的内部依赖与直接用于本地测试的 Miniflare 分开记录。

## D1 迁移与数据存储

远程开发 D1 已于北京时间 **2026-10-07 11:42:45** 应用：

| 迁移 | 内容 | 状态 |
| --- | --- | --- |
| [0001_auth.sql](../server/migrations/0001_auth.sql) | Better Auth `user` / `session` / `account` / `verification` / `rateLimit` 及索引 | 已应用 |
| [0002_projects.sql](../server/migrations/0002_projects.sql) | 项目、版本、资产、配额预留、用户用量、mutation 回执、归属约束 | 已应用 |

项目元数据、revision、所有者及回执保存在 D1；不可变正文快照保存在私有 R2。业务 SQL 参数化，版本 / 资产按 owner 复合外键约束，保存采用条件更新和同一次尝试的 `commit_token` 守卫。详细语义见 [cloud-contract-v1.md](../server/cloud-contract-v1.md)。

迁移仅由 Wrangler 显式执行，不在请求或启动时修改 schema。已应用迁移后续不直接修改，升级追加新迁移；升级 / 联合恢复说明见 [后端 README](../server/README.md)。完整 R2 清理、上传 finalize、联合备份恢复仍属于后续批次。

## Origin、Secrets 与 CLI 登录

| 配置 | 本地 | 远程开发 |
| --- | --- | --- |
| `APP_ORIGIN` | `.dev.vars.development` 覆盖为 `http://127.0.0.1:8787` | Wrangler vars 中使用开发 HTTPS origin |
| `ENVIRONMENT` | `development` | `development` |
| `BETTER_AUTH_SECRET` | 已生成本地独立随机值，文件权限 `0600` | 已生成另一独立随机值，存于 Cloudflare Secrets |
| `GOOGLE_CLIENT_ID` | 已配置 | 已写入 Cloudflare Secrets |
| `GOOGLE_CLIENT_SECRET` | 已配置 | 已写入 Cloudflare Secrets |

本地秘密文件被 Git 忽略；示例见 [.dev.vars.example](../server/.dev.vars.example)。本文件及验收证据只记录 secret 名称和配置状态，不记录值。Wrangler OAuth 登录已成功，凭据通过加密文件和 macOS Keychain 保存。

已授权的 CLI scopes 为 `account:read`、`user:read`、`workers:write`、`workers_scripts:write`、`workers_tail:read`、`d1:write`、`offline_access`。`whoami` 可能提示缺少其他产品的默认 scope；不因此扩大本任务权限。

会话从 D1 读取，cookie cache 关闭；远程 HTTPS cookie 使用 Secure / HttpOnly / SameSite=Lax。写 API 使用精确 Origin 校验，身份来自服务端 session。仅 `GET /api/auth/callback/google` 允许跨站导航，交由 Better Auth 验证 state / PKCE；其他跨站请求仍拒绝。

Google Cloud 项目为 `floorplan-development`；应用为 `Floor Plan Designer Development`，Web client 为 `Floor Plan Designer Development Web`。用户已明确同意 Google API 用户数据政策，并授权以当前开发账号作为支持 / 联系邮箱。应用为 External / Testing，未发布生产；权限限定 `openid` / `email` / `profile`。两个 origin 和回调见下表；本地和远程使用同一开发 client，生产须独立配置。Google 提示新配置可能需要数分钟至数小时生效，真实登录结果以实际检查为准。

## 静态发布与观测

[build-assets.mjs](../server/scripts/build-assets.mjs) 使用明确白名单，仅发布编辑器 `index.html` / `src` / `styles` / 必要 `vendor`、开发检查页及生成的合成验收样本。验收样本由 Umbria fixture 和近正文上限样本转换生成，不发布 tests 源目录或原始图纸。保留第三方许可证；排除 docs、server、秘密文件与 source map。后续生产发布应移除开发验收入口。

`/api`、`/api/*` 进入 Worker，其余已有资源由 Assets 服务，缺失路径返回 404。Workers Logs 已启用，sampling 为 `1`，自动 invocation logs 关闭，避免将 OAuth 回调查询串写入日志。真实保存 CPU / 用量尚未测量，不能把部署 startup time 或本机 wall-clock 当作保存 CPU。

## 当前开发容量上限

| 项目 | 配置名 | 当前默认值 |
| --- | --- | --- |
| 正文请求（包含 envelope） | `MAX_BODY_BYTES` | 1 MiB |
| raster | `MAX_RASTER_BYTES` | 3 MiB |
| 源文件 | `MAX_SOURCE_BYTES` | 20 MiB |
| 账号项目数（含软删除） | `MAX_PROJECTS` | 20 |
| 账号已提交存储 | `MAX_USER_BYTES` | 100 MiB |

数值来自 [limits.ts](../server/src/limits.ts)，可通过配置覆盖。上传校验、pending / 孤儿 / 回收站的完整用量计量与清理尚未实现；这些是开发 ceiling，生产上限须在真实 Worker 测量后冻结。

## 运行与维护命令

在 `server/` 目录执行：

```sh
npm ci
npm run migrate:local
npm run dev
npm run typecheck
npm test
npm run test:worker
npm run build
```

`npm run build` 仅 dry-run，不部署。远程资源查询：

```sh
npx wrangler whoami
npx wrangler d1 migrations list floorplan-development --remote --env development
npx wrangler r2 bucket info floorplan-development-private
npx wrangler secret list --env development
npx wrangler deployments list --env development
```

开发迁移 / 发布命令（会改变远程开发状态）：

```sh
npx wrangler d1 migrations apply floorplan-development --remote --env development
npx wrangler deploy --env development
```

Google 配置已用 `wrangler secret bulk --env development` 从本机秘密文件经 stdin 写入，仅上传两个 Google 字段，未覆盖独立远程 session secret；后续轮换也不要将真实值作为命令参数、提交内容或文档正文。

## 已验证与下一步

仓库归档保留代码、契约、配置、脱敏文本及编辑器 / 验收页截图。Google / Cloudflare 控制台、订阅与授权界面截图、Chrome 全窗口截图，以及原始 CLI 授权过程记录仅保留本机；证据报告中的这些文件名属于本机记录，未随 Git 推送。真实秘密文件、Wrangler 状态、依赖和构建产物均不提交。

线上基础验收：首页、health、开发检查页返回 200；未登录 `/api/me`、`/api/projects` 返回 `401 / SESSION_REQUIRED` 且 private no-store；docs、server 配置、秘密文件路径返回 404。Chrome 与 Codex 浏览器均正常呈现英文 Living room / 120.00 sq ft。

首次 TLS 失败已保留证据，后续在未绕过证书检查、未修改网络配置的情况下恢复正常 HTTPS；最初原因未确认。早期 `PROVIDER_NOT_FOUND` 属于配置前证据；现在 sign-in 返回 200，生成 Google 授权地址、精确回调和基本三项 scopes。缺失 state 的跨站回调返回 302 / `state_not_found`，不创建 session。这些检查尚不等于真实账号登录通过。

- [本地实现验收](verification/backend-cloudflare/BE-01/2026-10-07-local-01/report.md)：后端 25/25、前端 148/148，类型检查、打包、本地 D1/R2 故障 / 并发验证。
- [远程资源及 HTTPS 验收](verification/backend-cloudflare/BE-01/2026-10-07-remote-01/report.md)：迁移、部署、资源绑定、首次失败与恢复证据。
- [Google OAuth 与 BE-01 验收接续](verification/backend-cloudflare/BE-01/2026-10-07-oauth-01/report.md)：Google 配置、回调修复、后端 26/26、远程拒绝检查与待验项。
- [原任务清单](backend-task-checklist-cloudflare-2026-10-07.md)：BE-01 出口与后续 BE-02～04 顺序。

下一步完成 Google 测试用户和真实 A/B 账号登录 / 退出及授权隔离，执行 Umbria / raster / 近上限保存、并发与故障矩阵，收集真实 CPU P95/P99 和 D1 业务行计量。通过后再进入 BE-02。开发验收页每次创建两份合成项目，执行 30 次首次 / 连续保存、响应丢失后的同 mutation 重试、并发冲突、超限及伪 owner 检查，结果可下载；尚未执行时不计为远程通过。

OAuth 需要精确配置以下 origin / callback：

| 环境 | Authorized JavaScript origin | Authorized redirect URI |
| --- | --- | --- |
| 本地 | `http://127.0.0.1:8787` | `http://127.0.0.1:8787/api/auth/callback/google` |
| 开发云端 | `https://floorplan-development.juneandrao.workers.dev` | `https://floorplan-development.juneandrao.workers.dev/api/auth/callback/google` |

开发 consent screen 只加入明确的测试账号；配置页面完成不等于真实登录验收通过。
