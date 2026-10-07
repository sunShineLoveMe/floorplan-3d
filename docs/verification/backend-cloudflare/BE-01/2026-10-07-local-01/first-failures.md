# 首次验证中的失败记录

1. Better Auth CLI 的 D1 stub 初始化失败；补全检测标记后 CLI 仍需要 introspection。最终使用空的临时 Node SQLite 生成同一 SQLite schema，并用 Wrangler D1 实际迁移验证，不对运行环境做自动迁移。
2. TypeScript 首次发现 reader 的可空性与测试 helper 参数问题，已修复并重跑。
3. 后端首次业务测试 19/21：未知 geometry 字段在既有严格 geometryMatches 前触发拒绝；将本地适配器改为先白名单投影再复用领域校验。Umbria 的“33 墙”断言与当前样本不符，实际为 95 序列化墙段，保持原几何与精度。
4. 本地 Worker 首次 /api/me = AUTH_NOT_CONFIGURED：Wrangler 不自动将普通 shell 环境变量作为 secret binding。改为权限 0600 的忽略文件 .dev.vars.development，随机本地 session secret，不含 OAuth 凭据。
5. 首次依赖审计发现开发工具链 sharp/undici 间接漏洞；对同主版本修复版加精确 overrides，最终 audit 为 0。

上述失败没有标成验收通过。后续成功记录另存，见本目录测试日志及最终报告。
