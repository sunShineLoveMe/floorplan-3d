# BE-01 Google OAuth 配置与验收接续

日期：2026-10-07。分支 `feat/ui-refactor`，HEAD `6ff58d74a29c1cdf7a2d14da625b618949facd76`，沿用全部工作区修改；未提交、推送或部署项目生产环境。

## 结论

Google Cloud 开发项目、外部测试应用和 OAuth Web client 已创建，Google 凭据已保存在本机被忽略的秘密文件及开发 Worker Secrets。远程 provider 初始化返回 200，回调、scopes 和 state 初始化符合开发配置；真实 Google 账号登录尚未完成。Chrome 被用户切换至其他窗口，配置操作中断，正在等待 Google Cloud 窗口可操作及第二个明确的测试账号。

已修复共享中间件拦截合法 Google 跨站 GET 回调的问题；新增回归先复现 403，再通过 state 验证拒绝缺失 state 的请求。后端 26/26、类型检查和打包通过；远程四项回调 / 拒绝检查通过。BE-01 尚未通过远程出口，BE-02 未开始。

## Google 配置

| 项目 | 实际配置 |
| --- | --- |
| Google Cloud project | `floorplan-development`，无组织 |
| App | `Floor Plan Designer Development` |
| Audience | External / Testing，未发布生产 |
| Web client | `Floor Plan Designer Development Web` |
| scopes | `openid`、`email`、`profile`，远程初始化返回值已核对 |
| localhost origin | `http://127.0.0.1:8787` |
| localhost redirect | `http://127.0.0.1:8787/api/auth/callback/google` |
| development origin | `https://floorplan-development.juneandrao.workers.dev` |
| development redirect | `https://floorplan-development.juneandrao.workers.dev/api/auth/callback/google` |
| support / contact | 用户明确授权的当前开发账号邮箱，未复制进证据正文 |
| credentials | `.dev.vars.development` 被 Git 忽略，权限 `0600`；两个 Google 字段已通过 stdin 单独写入开发 Worker Secrets |
| test users / actual login | 待继续在 Google Cloud 页面完成，不标通过 |

用户先明确授权开发项目、邮箱、client、两个环境和基本三项权限；在条款勾选前再次明确同意 Google API 用户数据政策，随后完成创建。Google 提示配置生效可能需要数分钟至数小时；未将其当成真实登录通过。没有添加 billing、付费订阅、生产发布或 AI agent client 权限。

保存 `google-app-prepared.jpg`、`google-policy-confirmation.jpg`、`google-client-prepared.jpg` 作为配置前审查证据。创建后曾实际出现“OAuth 客户端已创建”弹窗，凭据仅在不输出 AX 内容的操作中读取并保存，关闭弹窗；没有拍摄含 client secret 的弹窗。以上 prepared 截图不冒充创建后或登录成功截图。

`secret-names.json` 仅列 `BETTER_AUTH_SECRET`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`；Google bulk 上传成功 2 项，未上传本机 session secret，远程 session secret保持独立。`provider-initialization.json` 只保留授权 host、回调、scopes 和 state 是否存在，不保存 state、cookie 或完整授权 URL。

Google 官方说明要求 redirect URI 精确匹配，开发与生产配置分离：[OAuth Web server flow](https://developers.google.com/identity/protocols/oauth2/web-server)、[OAuth policy compliance](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance)。真实 Google 登录继续使用原生浏览器。

## 回调问题与验证

原共享中间件无条件拒绝 `Sec-Fetch-Site: cross-site`，导致 Google `GET /api/auth/callback/google` 在进入 Better Auth 前被拒绝。仅对该精确路径的 GET 放行至 Better Auth，保留其 state / PKCE 验证和其他跨站 guard。POST 或错误 Origin 不属于例外。

| 验证 | 预期 / 实际 | 证据 |
| --- | --- | --- |
| 本地回归先复现 | 期望回调 302，原实现实际 403 | `callback-first-failure.txt` |
| 后端回归 | 26/26，包含回调与其他跨站拒绝 | `backend-tests.txt`、`acceptance-backend-tests.txt` |
| TypeScript | 通过 | `typecheck.txt` |
| dry-run build | 通过，明确静态白名单 | `worker-build.txt`、`acceptance-build-final.txt` |
| 远程缺失 state 的跨站 Google GET | 302 至同 origin `state_not_found`，无 Set-Cookie | `remote-callback-checks.json` |
| 远程其他跨站私有 GET | 403 | 同上 |
| 远程未登录同源 me | 401 | 同上 |
| 远程错误 Origin sign-in POST | 403 | 同上 |
| 远程 Google 初始化 | 200，Google host、精确回调、3 scopes、state present | `provider-initialization.json` |

缺失 state 的拒绝不等于一次真实 OAuth 成功。没有收集 auth code、session cookie、client secret 或原始请求 headers。

## 开发验收工具及发布

当前开发版本 `ec9c7fc1-38f3-4e20-9347-5c9e185dc053`，见 `acceptance-deploy.txt`。回调修复版本 `901e3b8e-1203-41d3-9729-7284e9701372`、Google Secrets 变更版本 `28957259-d132-4469-bb73-f00be56fad29` 保留为前置记录。开发资源仍为原 D1 / 私有 R2，项目生产环境未部署。

`/cloud-development` 新增 BE-01 验收工具，使用真实浏览器 HttpOnly session 调用同一 API。构建生成两份合成样本 module，只公开转换后的 Umbria fixture 与近 1 MiB 正文，不复制 tests 源目录、文档或原始图纸。静态白名单总计 79 文件。

登录后的一次运行创建两个测试项目，执行 Umbria 25 次和近上限 5 次首次 / 连续保存，记录 D1 commit batch 行计量、request ID 和客户端 wall-clock；读取后以 canonical SHA-256 对照检查完整正文及毫米精度。还执行相同 mutation 的响应丢失重试、同 revision 两次并发、失败者无成功回执、赢家正文完整、超限 413、伪 owner 422。另一账号可输入前一账号 project / mutation UUID，检查读取 / 修改 / 回执 / 列表隔离。结果 JSON 不含凭据或正文。

原生 Codex 浏览器已实际打开验收页，未登录点击运行返回 401 / `SESSION_REQUIRED`，样本数组为空，未开始保存；见 `acceptance-unauthenticated.json` / `.jpg`。这是验收工具的未登录拒绝证据，不是远程保存验收通过。工具在真实账号下的结果仍待执行。每次运行保留约 6 MiB 测试版本，重复运行消耗项目和容量配额。

`deployed-assets.json` 验证三份部署文件均返回 200 且 SHA-256 与本机构建一致；docs、server 配置、秘密文件及 tests 原始 fixture 四个路径返回 404。Umbria 创建 envelope 为 46,976 bytes，近上限为 1,012,915 bytes，均小于当前 1,048,576 bytes 正文上限。本机秘密文件权限仍为 `0600`；文档相对链接、JS 语法及 `git diff --check` 通过，文本证据未检出 Google secret 值。

`server/scripts/capture-acceptance-tail.mjs` 按验收 header 筛选流量，仅在写文件前保留时间、方法、路径、状态、outcome 和平台提供的 CPU / wallTime。headers、cookies、查询串、OAuth 端点和日志丢弃；尚未启动实际采集，平台未提供 CPU 时保持未测。CPU 指标规则见 [Workers metrics](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/)，客户端 wall-clock 和 deployment startup time 均不能替代 CPU。

## 下一步与未验证边界

1. 在 Google Cloud Audience 完成明确的测试用户配置，原生 Chrome 完成账号 A 登录与退出；验证退出撤销会话。
2. 执行真实账号 A 的保存验收，下载报告，采集真实 CPU P95 / P99；首次与连续请求分别记录，结合 D1 行计量冻结容量。
3. 明确第二个 Google 测试账号后完成 A / B 隔离；不把其他窗口偶然出现的账号认作已授权测试账号。
4. 完成含 raster 的真实保存及下载边界、远程 R2 / D1 部分故障和无坏指针验证。现有本地故障结果不能代替远程；删除 / 上传 finalize 接口尚未实现，不能标其远程隔离通过。
5. 上述出口通过后再进入 BE-02。Google 页面配置、本地 26/26 和 provider 初始化都不单独满足该出口。

前置资源与首次 HTTPS 失败保留在 [remote-01](../2026-10-07-remote-01/report.md)；本地 25/25、前端 148/148 和 bundled workerd 保存证据保留在 [local-01](../2026-10-07-local-01/report.md)，本次前端编辑器未改动，不重复把旧结果记为新一轮完整回归。
