# BE-01 开发资源接入记录

日期：2026-10-07。分支 `feat/ui-refactor`，HEAD `6ff58d74a29c1cdf7a2d14da625b618949facd76`，沿用全部已有工作区修改。此次未提交或推送 Git。

## 结论

R2 已由用户激活，开发 D1 / R2 / Worker 接入已实际完成。远程 D1 两项迁移通过，开发 Worker 发布成功，独立 session secret 已配置。BE-01 仍未通过远程批次出口：Google OAuth 尚未配置，真实账号和保存 / CPU 验收尚未执行。最初 TLS 握手失败已复现并留证；后续正常 HTTPS 恢复，Chrome / Codex 浏览器打开线上编辑器成功，基础 HTTP 冒烟通过。BE-02 尚未开始。

## 已验证资源

| 项目 | 实际结果 | 证据 |
| --- | --- | --- |
| R2 | `floorplan-development-private`，APAC，Standard，公开访问已禁用 | `r2-private-created.jpg`、`resource-actions.txt` |
| Wrangler | OAuth 登录成功，沿用原 7 scopes，凭据加密保存并使用 macOS Keychain | `wrangler-authorized.jpg`、`resource-actions.txt` |
| D1 | `floorplan-development` / `b4b72f97-5634-4556-bb32-e2690ac4a96e` | `d1-schema.json` |
| 迁移 | `0001_auth.sql`、`0002_projects.sql` 2026-10-07 03:42:45 UTC 已应用；再次 list 无待执行项 | `applied-migrations.json`、`migrations-list.txt` |
| Worker | `floorplan-development`，绑定开发 DB / BUCKET / ASSETS | `deploy.txt`、`deploy-02.txt`、`worker-deployed.jpg` |
| 静态资源 | 上传白名单 77 文件，未上传 docs / tests / server / 本机秘密配置 | `deploy.txt` 与本地白名单构建记录 |
| Secrets | 单独随机生成远程 `BETTER_AUTH_SECRET`，不复用本地 secret，值未进入证据 | `secret-names.json` 仅列名称 |

开发 origin 为 `https://floorplan-development.juneandrao.workers.dev`。本机 `.dev.vars.development` 覆盖 `APP_ORIGIN=http://127.0.0.1:8787`；示例已补此项。生产配置仍保持独立占位值，未部署项目的 `production` 环境。Cloudflare 控制台中单个 Worker 的活动版本标记为“生产”，该标签不代表本项目 `production` 资源已发布。

仅保留配置的开发主域，关闭额外 preview URLs。Workers Logs 启用，但自动 invocation logs 关闭，避免记录 OAuth 回调查询串；后续 CPU 从平台指标或脱敏调用记录取得。官方说明 invocation message 包含 method / URL，支持 `observability.logs.invocation_logs=false`：[Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)。本次 tail 无调用记录，不能据此计算 CPU。

## 首次 HTTPS 失败与后续恢复

首次 `/`、`/api/health` 在网络连接阶段失败，未取得 HTTP 响应，保留为首次失败证据。后续 2026-10-07 03:47:30 UTC 正常 HTTPS `/api/health` 返回 200；没有关闭证书验证或更改网络设置。最终 8 项 HTTP 冒烟通过：

| 路径 | 状态 |
| --- | --- |
| `/`、`/api/health`、`/cloud-development` | 200 |
| `/api/me`、`/api/projects`（未登录） | 401 / SESSION_REQUIRED，private no-store |
| `/docs/roadmap.md`、`/server/package.json`、`/.dev.vars.development` | 404 |

见 `http-smoke.json`、`health-recheck-headers.txt` / `health-recheck-body.txt`。Chrome 和 Codex 浏览器都正常呈现英文 Living room / 120.00 sq ft，见 `remote-editor.jpg` / `remote-editor-chrome.jpg`。这只验证线上未登录编辑器基线，未覆盖完整浏览器回归。

- Node v22.22.3 和 curl：TLS handshake failure。
- Chrome 与 Codex 浏览器：`ERR_SSL_VERSION_OR_CIPHER_MISMATCH`，见 `chrome-tls-failure.jpg`。
- Cloudflare 控制台显示 workers.dev URL enabled；没有显示证书待处理状态。
- 系统 DNS 返回本机代理 fake IP；官方 DoH 返回 Cloudflare 地址。保留 hostname 校验的 address override 仍失败。

原因尚未确认，不能断言是证书签发、代理或远端故障。未关闭 TLS 验证，未修改全局网络设置。首次失败保留在 `https-first-failure.txt`。后续恢复记录已另存，未覆盖首次失败。Google 登录预检查返回 `404 / PROVIDER_NOT_FOUND`，见 `google-missing.json`，与未配置 OAuth client 一致；不能作为登录验收通过。

## 下一步入口

1. 基础 HTTPS / 未登录路由验证已通过；继续在 Google 配置后执行真实账号链路。
2. 配置 Google OAuth Web client，开发回调：`https://floorplan-development.juneandrao.workers.dev/api/auth/callback/google`；本地回调：`http://127.0.0.1:8787/api/auth/callback/google`。可信 origin 与对应 origin 精确一致。
3. `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` 仅写本机开发秘密文件和 Cloudflare Secrets；不要放入任务文档或聊天。
4. 用 A / B 真实 Google 账号完成登录、退出、账号隔离、Umbria / raster / 近上限保存、同 revision 并发、故障重试；收集真实 CPU P95 / P99 和业务 D1 行计量，再冻结容量并进入 BE-02。

当前最终版本 `3d6d92d6-542e-4ea6-b3d2-cc560a13f543`，见 `deploy-02.txt`；首次版本和部署记录保留。

本次 D1 schema 查询实际 `rows_read=60 / rows_written=0`，迁移表查询 `2 / 0`。这些属于资源检查，不是保存成本测量。部署 startup 58 ms 也不等于请求 CPU。

本地实现与 25/25 后端、148/148 前端测试证据沿用 `../2026-10-07-local-01/report.md`，本次仅修改配置及文档，未重复执行无关回归。
