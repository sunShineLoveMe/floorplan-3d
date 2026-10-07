# BE-01 Git 交付验证

日期：2026-10-07（Asia/Shanghai）。目标：`origin/feat/ui-refactor`。同步前本地和远程基线均为 `6ff58d74a29c1cdf7a2d14da625b618949facd76`。

## 范围与结果

本次按用户授权提交后端 `server/`、契约 / 迁移 / 精确依赖、Google 开发配置及回调修复、验收工具、脱敏证据、后端规划文档与必需 Umbria fixture。README 只暂存后端说明和导航；原 T09 / Umbria 前端改动及其他资料保留本机，不混入本次提交。秘密文件、Wrangler 状态、依赖、构建产物、控制台 / 订阅 / 授权 / Chrome 全窗口截图及原始 CLI 授权记录不推送。

从实际暂存区导出临时目录进行验证，该目录没有本机 `.dev.vars.development`，没有其他未跟踪工作区文件。`tested-source-manifest.json` 记录所测试源码和必需 fixture 的 SHA-256，后续文档追加不改变这些源码。

| 验证 | 结果 | 证据 |
| --- | --- | --- |
| `npm ci` | 成功，173 packages，audit 0 vulnerabilities | `npm-ci.txt` |
| `npm run typecheck` | 成功 | `typecheck.txt` |
| `npm test` | 26/26 | `backend-tests.txt` |
| `npm run test:worker` | dry-run build 成功；真实本地 bundled workerd 保存 30/30，0 failures | `worker-runtime.txt` |
| staged 文档相对链接 | 全部存在于提交文件集合 | 本次提交前扫描 |
| 代码 / Markdown / fixture diff whitespace | 通过 | `git diff --cached --check` 按这些路径执行 |
| credential scan | 未检出实际本机 secret、Google secret、private key、bearer / GitHub token 或 callback code | 本次提交前扫描；不输出 secret 值 |

CLI `.txt` 原始输出保留原始换行及表格空白，不为通过 whitespace 检查修改历史证据。本次没有重新执行无关前端浏览器回归；原 148/148 记录是前置工作区结果。快照的 30 次保存为 Umbria 25 次与近正文上限 5 次，使用隔离本地签名会话；未访问 Google，未写远程用户数据，CPU 未测。

BE-01 尚未通过真实 Google A/B、远程保存 / 故障及 CPU 验收；BE-02 未开始。本次只做 Git 同步，不再部署 Worker，也不发布项目生产环境。

## 实际提交与远程核对

实现提交：[`dea8868fdb02f350fb78e75264b999b0aa43c647`](https://github.com/sunShineLoveMe/floorplan-3d/commit/dea8868fdb02f350fb78e75264b999b0aa43c647)，标题 `Add Cloudflare backend foundation and Google OAuth development checks`，102 files changed。

2026-10-07（Asia/Shanghai）`git push origin HEAD:refs/heads/feat/ui-refactor` 成功，输出 `6ff58d7..dea8868 HEAD -> feat/ui-refactor`。随后 `git ls-remote origin refs/heads/feat/ui-refactor` 返回同一个完整 SHA，实际远程同步已核对。此次核对后的文档状态追加通过后续独立 docs commit 同步；实现源码未再改变。

剩余 tracked 修改仍为 `README.md` 的原 T09 / Umbria 内容、`docs/roadmap.md`、`scripts/serve.py`、两个原浏览器回归脚本；原未跟踪 T09 / Umbria 资料及无关 YAML 继续保留。秘密文件、`.wrangler`、`node_modules`、`dist`、无关 YAML 均未进入 Git 文件集合。原始控制台截图及授权过程记录仅留本机。

现行配置见 [开发环境配置](../../../../backend-cloudflare-configuration-2026-10-07.md)，远程入口为 [GitHub 开发分支](https://github.com/sunShineLoveMe/floorplan-3d/tree/feat/ui-refactor)。Git 推送不等于 BE-01 真实环境出口通过。
