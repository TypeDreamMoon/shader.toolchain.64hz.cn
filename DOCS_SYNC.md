# 插件文档同步与中文审阅

本仓库对应 `TypeDreamMoon/DreamShader`。插件文档是原文来源；英文由程序生成，中文在本站维护，经人工合并 PR 后发布。

## 日常流程

1. 在插件仓库修改 `Docs/**`，提交并推送到 `main`。只有推送到 GitHub 后才会触发 CI。
2. 插件的 `Notify documentation site` 发送仓库名与精确提交 SHA。
3. 本站 `Sync plugin documentation` 拉取该版本，生成英文页及原文版本记录，运行测试、类型检查、静态构建和链接检查。
4. 检查成功后，机器人只提交英文与原文快照，并直接调用部署流程发布；中文正文保持已合并版本。GitHub 默认令牌推送不会再次触发 push 工作流，因此同步任务显式调用部署。
5. `Draft Chinese translations` 更新一个「中文翻译待更新」Issue，再调用你配置的 AI 生成中文 PR。默认每批最多 5 页。
6. 你检查翻译、按需修改并合并 PR。默认分支的部署流程发布中文，随后继续为剩余页面生成下一批 PR。不会自动合并。

已有翻译 PR 等待审阅时，机器人不追加提交、不覆盖人工修改。若原文又更新，旧 PR 的基准仍是它实际翻译的版本；合并后页面继续显示待更新，并生成下一批更新。关闭而不合并 PR 后，可手动运行 `Draft Chinese translations` 重试。

翻译生成成功但构建或链接检查失败时，保留为 **Draft PR** 并让工作流失败，方便在 PR 中修复。API 调用失败、结果截断、保护标记损坏则不写入本批翻译。



## AI 配置

在**文档站仓库**的 **Settings → Secrets and variables → Actions** 配置：

| 名称 | 位置 | 值 |
| --- | --- | --- |
| `DOCS_AI_BASE_URL` | Variables | API 根地址，例如 `https://api.openai.com/v1`，或自己的兼容服务地址；包含服务要求的 `/v1`，不要追加 `/chat/completions` 或 `/responses`。留空采用上述默认地址 |
| `DOCS_AI_API_KEY` | Secrets | 该服务的 API Key，仅作为 Bearer 凭据由 Actions 使用；不要写入配置文件、PR 或 `NEXT_PUBLIC_*` |
| `DOCS_AI_MODEL` | Variables | 服务提供的模型 ID，必须填写；代码没有固定模型 |

使用支持 OpenAI 兼容协议的服务，不限定供应商。只支持该协议的文本翻译接口；其他鉴权格式需要适配。

可选 Variables：

| 名称 | 默认值 | 含义 |
| --- | --- | --- |
| `DOCS_AI_API_FORMAT` | `chat-completions` | 也可填 `responses`，调用对应接口 |
| `DOCS_AI_TOKEN_FIELD` | `max_tokens` | Chat Completions 可选 `max_completion_tokens`；不接受此参数的服务用 `omit` |
| `DOCS_AI_JSON_MODE` | `false` | 仅在服务支持时设 `true`，请求 JSON Object 模式；所有结果仍会做 JSON 校验 |
| `DOCS_AI_MAX_PAGES` | `5` | 每批最多翻译几页 |
| `DOCS_AI_CHUNK_CHARS` | `8000` | 长文分段的目标字符数，最少 500；代码块先保护，通常不占这部分长度 |
| `DOCS_AI_MAX_INPUT_CHARS` | `120000` | 单次请求正文的字符上限，包括术语表和上下文；不是 token 或费用上限 |
| `DOCS_AI_MAX_OUTPUT_TOKENS` | `12000` | 单次响应 token 上限；长文会发起多次请求 |
| `DOCS_AI_TIMEOUT` | `180` | 单次请求超时秒数 |

传给服务的内容包括所选原文、旧版原文/中文的有限上下文、需要翻译的组件文字和术语表。更换模型或 BaseURL 不会把已对齐的页面全部重新翻译。

## GitHub 凭据与首次接入

| 仓库 | Secret | 用途 |
| --- | --- | --- |
| 插件仓库 | `DOCS_SYNC_TOKEN` | Fine-grained PAT，授权**对应文档站仓库** `Contents: Read and write`，用于跨仓库 `repository_dispatch` |
| 文档站仓库 | `DOCS_SOURCE_TOKEN` | 私有插件仓库需要：授权**插件仓库** `Contents: Read`。公共仓库可省略 |
| 文档站仓库 | `DOCS_PR_TOKEN` | 推荐：授权本站 `Contents`、`Pull requests`、`Issues` 的读写权限，创建翻译分支、PR 和状态 Issue；使用独立机器人账号的令牌也可以 |
| 文档站仓库 | `SFTP_*` | 沿用部署凭据；新接入的站点必须配置 SSH 私钥或密码，以及实际主机、目录与已核实的 host key |

省略 `DOCS_PR_TOKEN` 时使用 `GITHUB_TOKEN`，需要在 Actions 设置中允许工作流创建 PR，并开启 Issues。默认令牌创建的 PR 的检查可能需要人工批准后运行；独立令牌可以触发常规 PR 检查。仓库规则还需要允许同步机器人向默认分支写入**英文/快照**提交；若禁止直接推送，应先调整机器人权限，否则同步明确失败，不会强推。

首次迁移的执行顺序：

1. 配置上述 Secrets、Variables、Actions/Issues 和默认分支权限。
2. 检查并提交插件 `Docs/` 下的英文原文和 `.github/workflows/docs-notify.yml`，推送插件 `main`。首次通知时本站工作流还未上线，可稍后手动补跑。
3. 在插件文档已经提交、工作区相关文件干净后，运行下方本地同步命令。确认 `docs-sync/source-lock.json` 的 `workingTree` 为 `false`。
4. 检查并提交本站改动，推送本站默认分支。随后手动运行一次 **Sync plugin documentation**，`source_sha` 留空表示插件当前 `main`，也可填写其历史中的精确 SHA。

插件 PR 使用 squash 合并后，如果全部页面的原文指纹保持一致，同步会接受合并后的新提交并更新版本记录；不同内容的旧版本或无关历史仍会拒绝同步。

当前本地迁移允许读取未提交的插件文档，并标记 `workingTree: true`。CI 会拒绝部署这种快照，避免网页声称对应一个实际上尚未包含文档的提交。不要手工修改该标记绕过校验。

## 在哪里编辑

- 插件原文：从插件 `Docs/README.md` 导航，按主题编辑 `Docs/getting-started/`、`language/`、`examples/`、`generation/`、`diagnostics/`、`tools/`、`changelog/` 等目录中的英文 Markdown。教程和技术手册共用这套分类，原 `Docs/Website/` 内容已归入对应主题。
- 英文网页：`docs-sync/source-lock.json` 列出的 `content/docs/*.en.md[x]` 都由程序生成，直接编辑会触发覆盖保护。`config.json` 的 `siteOnly` 页面仍属于本站，例如网站变更记录。
- 中文正文：在 `content/docs/` 不带 `.en` 的页面或翻译 PR 中编辑。初次接入保留现有中文，没有伪造“已核对”的基准。
- 中文独立补充：在页尾写 `<!-- docs-sync:notes -->`，该标记之后全部原样保留，不传给翻译模型。
- 术语：在 `docs-sync/glossary.json` 维护。代码块、行内代码、诊断编号、链接和组件结构受保护；卡片标题等显示属性单独翻译并转义。

翻译可能从 `.mdx` 迁移为原文对应的 `.md`；中文补充请用普通 Markdown。来源版本记录与中文页面一起进入 PR；审阅时不要把 `sourceHash` 改成其他版本。普通人工措辞调整不需要修改版本记录。

### 待更新提示

`source-lock.json` 存储每页的内容指纹和插件提交；`docs-sync/translations/<page>.json` 存储这次中文实际采用的原文与版本。

- `missing`：还没有中文页，列在状态 Issue 中。
- `unreviewed`：中文存在，但还没有这套流程的审阅基准；页面显示「本页待核对」。
- `outdated`：原文内容或网站转换规则变化，页面显示「原文已更新」并链接原文。
- `current`：当前中文记录对应最新原文，不显示提醒。

网页提示在静态构建时生成。英文同步后的自动发布会更新提醒；AI 草稿在合并前不会改变线上中文。

### 添加、改名与删除原文

`docs-sync/config.json` 指定原文与既有路由的对应关系，支持整篇、按标题、诊断组摘录。尚未映射的 `Docs/**/*.md` 自动出现在英文的 `plugin/` 参考目录；辅助页或兼容入口应加入 `exclude`。需要固定网址的新教程应显式加入映射。文件移动时更新 `sources[].path`，保留原 `id`；本次目录整理保留全部 126 个映射 ID 和现有网站网址。

原文删除、章节改名或路由冲突会停止同步，需要维护映射和链接。不会静默删除中文。正文中的相对文档链接转换为已知网页路由；其他链接固定到插件提交，图片使用同一提交的 raw URL。私有图片不会因配置 checkout token 而自动公开。

生成中文翻译时，站内链接会优先指向已存在或同批生成的中文页面；章节锚点尚不存在时保留英文链接。代码、外部链接和用户独立补充保持原样。

旧的 diagnostics/reference 生成脚本仅保留作历史参考，新的维护入口统一为 `docs_sync.py`，不要混用旧脚本覆盖中文。

## 本地命令（PowerShell 7）

Python 3.10+ 标准库即可运行同步脚本；网站沿用当前 Node/npm 工具链，CI 使用 Node 22。脚本不会自动加载 `.env`。

```powershell
$ErrorActionPreference = 'Stop'
$env:PYTHONIOENCODING = 'utf-8'
python -B scripts/docs_sync.py sync --plugin 'I:\UnrealProject_Moon\DEV_58\DevTest\Plugins\DreamShader'
if ($LASTEXITCODE -ne 0) { throw 'docs sync failed' }
python -B scripts/docs_sync.py status
if ($LASTEXITCODE -ne 0) { throw 'docs status failed' }
```

只检查是否有变化时追加 `--check`（有差异返回 1，不改文件）。本地翻译还需设置同名环境变量 `DOCS_AI_BASE_URL`、`DOCS_AI_API_KEY`、`DOCS_AI_MODEL`，然后运行 `python -B scripts/docs_sync.py translate --page start/installation`；将页面 ID 换成本仓库的实际 ID。不带 `--page` 按状态取下一批。Key 应从安全的凭据输入取得，不写进脚本或命令历史。

验证入口：`npm run docs:test`、`npm run docs:validate`、`npm run typecheck`、`npm run build`、`python -B scripts/check-links.py`。链接检查覆盖导出 HTML 中的中英文页面与章节锚点，不验证外站或远程图片可用性。本地命令不会提交、推送、创建 PR 或部署；`docs_ci.py` 只供 GitHub Actions 调用。

四个站共用同一份标准库脚本的副本；修改 `docs_sync.py`、`docs_ci.py` 或测试后应同步四站并运行测试。配置与源页面映射各自维护。
