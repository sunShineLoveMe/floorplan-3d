# BE-01 本地交付与开发环境准备

日期：2026-10-07（Asia/Shanghai）。结论：BE-01 契约、开发骨架、迁移、可信会话授权和最小保存链路已经实现，本地验收通过；真实 Google / Worker CPU 验收尚未完成，BE-01 尚未达到批次出口。没有进入 BE-02～BE-04。

## 状态

| 任务 | 代码 | 本地 | 远程 / 剩余 |
| --- | --- | --- | --- |
| BE-01-01 契约 | 完成开发契约，含白名单和 v2 适配 | v1/v2、Umbria、底图、畸形输入、名称及毫米精度通过 | 生产容量未冻结，需实测 CPU |
| BE-01-02 Worker 骨架 | `server/`、精确依赖、静态白名单、开发登录检查页 | 启动、类型检查、API、打包、静态路由通过 | 开发资源部署待授权完成；生产未部署 |
| BE-01-03 迁移 | 官方生成 auth schema + 业务迁移 / 索引 / 约束 | 空库初始化、已有 auth 库升级、非法归属 / 重复回执通过 | 已创建真实 D1，远程迁移未应用 |
| BE-01-04 认证授权 | Better Auth / D1、Google provider 配置、退出、实时会话、CSRF | 签名 cookie、A/B 本地会话隔离、撤销 / 过期、错误 Origin、HTTPS 属性通过 | 无真实 Google client / A/B 实际账号验收 |
| BE-01-05 保存链路 | R2 新 key + D1 CAS / commit_token 守卫 + 回执 | 同 revision / 同 mutation 并发、强制 0 行、R2 / D1 失败及响应丢失通过 | 真实 Worker CPU P95/P99、完整行计量和故障矩阵未验证 |

任务清单的完整验收项不以本地结果替代远程结果。当前只能继续准备开发配置，不能进入需要 BE-01 出口通过的 BE-02。

## 代码与原工作区

分支 `feat/ui-refactor`，HEAD `6ff58d74a29c1cdf7a2d14da625b618949facd76`，本轮新增 `server/` 和本报告目录。开始时已有的 5 个 tracked 修改及原 untracked 文件保留。没有 reset / clean / stash、推送、合并或生产发布；未读取或打包 `aws-tokyo-wireguard.yaml`。

原生编辑器业务文件没有改变；项目根 build 仍为 `f35a2cebc21e75fd`，没有产生 index.html diff。新增本地 `.dev.vars.development` 只有随机 session secret，权限 0600，Git 忽略，没有 Google 凭据。开发 D1 ID 已填入 `server/wrangler.jsonc`，生产仍为占位配置。

依赖：Better Auth 1.7.7、Hono 4.13.13、Wrangler 4.148.0、TypeScript 6.0.3、tsx 4.23.15、本地 Miniflare 4.20260730.0。Wrangler 自身使用其官方锁定的 Miniflare 5 prerelease；本地打包运行另外使用稳定 Miniflare 4。sharp 0.35.5 / undici 7.29.1 overrides 修复开发链间接漏洞，audit 为 0。

## 验收证据

| 命令 / 证据 | 实际结果 |
| --- | --- |
| 根目录 `npm test` | 148/148，见 frontend-tests.txt |
| 根目录 `npm run build` | 通过，f35a2cebc21e75fd；无新 index.html diff |
| `server: npm run typecheck` | 通过，见 typecheck-04.txt |
| `server: npm test` | 最终 25/25，见 backend-tests-04.txt；早期 21/24 项记录保留 |
| `server: npm run build` | dry-run 通过，见 worker-build-02.txt；没有远程部署 |
| `server: npm run migrate:local` | Wrangler 实际 local D1 两条迁移成功，见 migrate-local.txt |
| 官方 `npm run auth:generate` | 生成 SQLite schema，提交 migrations/0001_auth.sql；空库 introspection 提示按预期保留 |
| bundled workerd 保存 / 读取 / 会话撤销 | 30 次保存通过，见 worker-runtime-02.txt、worker-samples-02.json |
| HTTP / 静态白名单 | 首页 200、health 200、未登录 me 401；docs、server/package.json、secret 路径均 404 |
| 原生 Codex IAB | 无登录打开英制 Living room / 120 sq ft；开发页显示 Signed out，见 local-editor.jpg / local-session.jpg |
| 静态 manifest | 77 个实际文件，没有 docs/tests/server/source.json/秘密；见 static-manifest.json |
| 依赖审计 | 0 vulnerabilities，见 dependency-audit.json |
| `git diff --check` | 通过 |

关键原子性测试不是只检查错误码：通过真实 SQLite trigger 验证 D1 中途失败回滚指针 / 版本 / 配额 / 回执；另在 R2 写完与 CAS 之间强制竞争者成功，再检查败者 UPDATE 及后续版本 / 配额 / 回执 SQL 全部 changes=0，最终只有成功提交的版本存在。已提交但响应丢失时重试原 mutation 返回原 revision。

## 样本与计量边界

- Umbria 当前云容器正文 46,863 bytes，25 空间 / **95 个序列化墙段** / 43 家具。清单“33 墙”与当前 fixture 的数组口径不同，本轮保留实际几何，不为满足旧数字调整结构。完整 geometry/furniture、毫米浮点尺寸和高度通过回转断言。
- 近正文上限样本 1,012,793 bytes（约 0.97 MiB），1600 件带高度家具。请求仍受 1 MiB envelope 上限，不宣称所有领域最大组合都能保存。
- 本地 bundled Worker：Umbria 25 次、近上限样本 5 次，错误 0，首次 / 连续 wall-clock 与 commit batch D1 rows_read / rows_written 分开存入 worker-samples-02.json。
- **这些是本机 wall-clock，不是 Cloudflare Worker CPU。** 小样本 P99 不作为容量结论。记录的 D1 行计量只涵盖 commit batch，不含 auth / preflight / 回执 lookup；远程应记录完整请求。
- 临时容量：正文 1 MiB、raster 3 MiB、源 20 MiB、20 项目、已提交存储 100 MiB。尚未冻结生产承诺。

## 真实开发环境

用户在实施中授权使用已打开的 Cloudflare 页面自行配置开发环境。

- 已确认 Cloudflare 页面登录；新建 D1 `floorplan-development`，ID `b4b72f97-5634-4556-bb32-e2690ac4a96e`，并写入开发绑定。证据 d1-created.jpg。真实数据库当前未迁移、未写用户 / 工程数据。
- R2 页面显示尚未订阅，需要接受条款和按量自动续订。本轮没有提交该交易；已要求用户完成最终开通，证据 r2-subscription-required.jpg。
- 已准备 Cloudflare 官方 Wrangler 的 7 项 OAuth 权限：User Read、Background Access、Account Read、Workers Write、Workers Scripts Write、Workers Tail Read、D1 Write。当前授权确认待用户答复；首次本地 callback 等待超时，未取得凭证。确认后重新打开同范围链接，凭证使用本机钥匙串，不提交仓库。
- 未部署 Worker / 创建 R2 bucket；没有真实 Google OAuth 凭据。没有用假用户或本机签名 session 冒充 Google 实际登录。

## 后续入口

1. 完成 R2 开通和 Wrangler 具体权限确认，再创建 `floorplan-development-private` 私有 bucket，关闭 public domain / r2.dev。
2. 迁移真实开发 D1，配置实际 HTTPS APP_ORIGIN、独立 secret 和 Google Web OAuth client / callbacks；执行本地例程对应的真实 A/B 登录与资源隔离验证。
3. 在真实 Worker 运行 Umbria、raster、近上限样本；保留首次 / 连续 CPU、完整 D1 行计量、错误及 D1/R2 注入失败证据。未满足免费 CPU 时先评估所需计划和预算，再冻结容量。
4. BE-01 出口通过后再进入 BE-02（CRUD UI、IndexedDB 草稿、切换 / Undo 隔离、保存队列）。

BE-03 上传 / finalize、pending 预留、所有孤儿的完整配额和清理、版本 / 回收站恢复、BE-04 Turnstile / 生命周期 / 备份 / 发布回归均未实现。仅当前已提交快照的计量不足以支持公开试运营。T09 实机手机、Umbria 通道判断和真实打印保持原待办，未以本轮测试宣称通过。
