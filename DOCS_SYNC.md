# 插件双语文档同步与中文审阅

本仓库对应 `TypeDreamMoon/DreamShader`。插件仓库保存英文原文和 `Docs/zh-CN/` 中文；网站同步已经合并的双语内容。AI 配置和执行流程继续留在网站，翻译 PR 开到插件仓库。

## 日常流程

1. 在插件仓库按主题修改 `Docs/` 中的英文原文，提交并经审阅合并到 `main`。
2. 插件的 `Notify documentation site` 发送仓库名与精确提交 SHA。中文及翻译记录合并也会触发通知。
3. 网站 `Sync plugin documentation` 拉取该版本，生成英文、已合并的中文和版本记录，执行测试、类型检查、构建及链接检查。
4. 检查通过后，机器人只提交生成的双语页面和记录，直接调用部署流程发布。网站手写 notes 保留。GitHub 默认令牌推送不会触发新的 push 工作流，因此同步任务显式调用部署。
5. 网站 `Draft Chinese translations` 拉取插件最新 `main`，更新本站「中文翻译待更新」Issue，按英文源文件的内容指纹判断哪些中文需要更新。没有待更新内容时不调用 AI。
6. AI 在插件分支中生成 `Docs/zh-CN/` 和对应 metadata，网站在工作区预演双语同步并检查构建，然后向**插件仓库**开 PR，默认每批最多 5 个英文源文件。
7. 你在插件 PR 中检查和修改翻译，再手动合并。插件通知网站同步这一已合并版本，中文才发布；仍有其他待翻译文档时继续生成下一批。不会自动合并。

已有插件翻译 PR 或迁移前的网站 `docs-translation/` PR 等待审阅时，机器人不追加提交、不覆盖人工修改。旧网站 PR 应先处理或迁入插件后关闭，再启动新翻译。若英文在审阅期间更新，旧 PR 保留其真实基准，合并后仍会提示落后。关闭而不合并后，可在网站手动运行 `Draft Chinese translations` 重试。

翻译生成成功但同步预演、构建或链接检查失败时，插件 PR 保持 **Draft**，工作流报告失败。API 失败、截断或保护标记损坏时，不写入本批翻译。中文单独更新不会改变英文指纹；合并中文不会为同一英文版本重复调用 AI。

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
| `DOCS_AI_MAX_PAGES` | `5` | 每批最多翻译几个英文源文件 |
| `DOCS_AI_CHUNK_CHARS` | `8000` | 长文分段的目标字符数，最少 500；代码块先保护，通常不占这部分长度 |
| `DOCS_AI_MAX_INPUT_CHARS` | `120000` | 单次请求正文的字符上限，包括术语表和上下文；不是 token 或费用上限 |
| `DOCS_AI_MAX_OUTPUT_TOKENS` | `12000` | 单次响应 token 上限；长文会发起多次请求 |
| `DOCS_AI_TIMEOUT` | `180` | 单次请求超时秒数 |

传给服务的内容包括所选原文、旧版原文/中文的有限上下文、需要翻译的组件文字和术语表。更换模型或 BaseURL 不会把已对齐的页面全部重新翻译。

## GitHub 凭据与首次接入

以下 AI Variables 和 Secrets 都继续配置在**网站仓库**，无需迁到插件。

| 仓库 | Secret | 用途 |
| --- | --- | --- |
| 插件仓库 | `DOCS_SYNC_TOKEN` | Fine-grained PAT，授权**对应网站仓库** `Contents: Read and write`，用于跨仓库 `repository_dispatch` |
| 网站仓库 | `DOCS_SOURCE_TOKEN` | 私有插件的只读 checkout：授权**插件仓库** `Contents: Read`；也可复用已配置的 `DOCS_PR_TOKEN`，公共插件可省略 |
| 网站仓库 | `DOCS_PR_TOKEN` | **自动翻译开 PR 必须配置**：授权**插件仓库** `Contents: Read and write`、`Pull requests: Read and write`，用于推送中文分支和创建插件 PR |
| 网站仓库 | `SFTP_*` | 沿用部署凭据；新站需配置实际主机、目录、SSH 私钥或密码及已核实的 host key |

网站 `GITHUB_TOKEN` 只用于本站的同步提交、Issue 和旧 PR 查询，不能替代跨仓库的 `DOCS_PR_TOKEN`。若此 Secret 原来只授权网站，需改为授权对应插件仓库。本站启用 Issues；仓库规则需允许同步机器人向网站默认分支写入生成的双语页面和记录，插件规则需允许它创建翻译分支。机器人不强推，不直接提交插件 `main`。

首次迁移顺序：

1. 配置上述凭据、AI Variables、Actions/Issues 和分支权限。
2. 审阅插件英文、`Docs/zh-CN/`、`Docs/zh-CN/.translations/` 和 `docs-notify.yml`，先合并插件 PR，再合并网站 PR。首次通知发生在网站工作流上线前，可稍后手动补跑。
3. 插件文档提交且工作区相关文件干净后，运行下方同步命令。正式提交的 `source-lock.json` 必须 `workingTree: false`。
4. 在网站默认分支手动运行 **Sync plugin documentation**；`source_sha` 留空使用插件最新 `main`。旧于网站已同步版本的提交会被拒绝，避免中文回退。

首次导入的历史中文可以没有已核对基准；`sourceHash: null` / `origin: website-import` 表示待核对，不能伪造为最新英文已审阅。插件 squash 合并的同内容版本可以接续同步，检查同时覆盖英文和中文快照。

翻译工作流仅在预览检查步骤设置 `DOCS_TRANSLATION_PREVIEW=true`，允许尚未提交的 `Docs/zh-CN/`。英文及其他插件文件仍须干净。预览的 `workingTree: true` 不能提交到网站默认分支或部署；不要在正式同步、部署或仓库级环境中设置该变量。

## 在哪里编辑

- 插件原文：从插件 `Docs/README.md` 导航，按主题编辑 `Docs/getting-started/`、`language/`、`examples/`、`generation/`、`diagnostics/`、`tools/`、`changelog/` 等目录中的英文 Markdown。教程和技术手册共用这套分类，原 `Docs/Website/` 内容已归入对应主题。
- 插件中文：在插件 `Docs/zh-CN/` 中维护与英文源路径对应的文件，或在 AI 创建的**插件 PR** 中修订。一个英文源文件只翻译一次；网站摘录、诊断分组和多个网址复用这份中文。
- 插件翻译记录：`Docs/zh-CN/.translations/<英文相对Docs路径>.json` 与中文一起审阅。例如 `language/foo.md` 对应 `Docs/zh-CN/.translations/language/foo.md.json`。保留真实 `sourceRevision` 和 `sourceHash`，不要手工推进到未审阅的新英文。
- 网站双语正文：`source-lock.json` 管理的 `content/docs/*.en.md[x]` 和中文页面由插件生成，直接改正文会触发覆盖保护。先将正文修改移到插件。`config.json` 的 `siteOnly` 页面仍在网站维护。
- 网站独立补充：中文页尾 `<!-- docs-sync:notes -->` 之后的内容保持原样，只属于网站，不发给 AI，也不写回插件。使用普通 Markdown 便于页面格式迁移。
- 术语与 AI 配置：继续在网站的 `docs-sync/glossary.json`、Actions Variables 和 Secrets 中维护。

### 待更新提示

插件 metadata 记录中文实际采用的英文原文、内容指纹和提交版本。网站 `source-lock.json` 记录生成结果及中文导入状态；`docs-sync/translations/<page>.json` 是网站派生记录，不是人工维护入口。

- `missing`：没有对应中文文件。
- `unreviewed`：已有历史中文，但尚无可信英文审阅基准。
- `outdated`：中文对应的英文内容已更新。
- `current`：中文记录对应当前英文内容。

插件内可运行 `python -B Docs/translation-status.py` 查看缺译、未核对和过期文档；追加 `--json` 获取完整结果。该脚本只读，不依赖网站或 AI，也支持无 Git 历史的插件包。

网站提示在构建时生成。Issue 按插件英文源文件列出待翻译项并链接原文；网站页面仍保留原有网址。AI 草稿合并前不会改变线上中文。

### 添加、改名与删除原文

`docs-sync/config.json` 指定原文与既有路由的对应关系，支持整篇、按标题、诊断组摘录。尚未映射的 `Docs/**/*.md` 自动出现在英文的 `plugin/` 参考目录；辅助页或兼容入口应加入 `exclude`。需要固定网址的新教程应显式加入映射。文件移动时更新 `sources[].path`，保留原 `id`；本次目录整理保留全部 126 个映射 ID 和现有网站网址。

单文件整篇页面的中文标题与摘要跟随插件 frontmatter；摘录或多来源页面可在页面映射中用 `titleZh` / `descriptionZh` 指定本站标题。

`Docs/zh-CN/` 及其中 metadata 不参与英文自动发现。移动英文时同步检查中文对应路径、metadata 和网站映射，保持页面 `id` 不变。文件名大小写必须与 Git 一致，以通过 Linux CI。

原文删除、章节改名或路由冲突会停止同步，需要维护映射和链接。插件中使用相对文档链接；网站生成时转换到已知网页路由，其他链接固定到插件提交，图片使用同一提交的 raw URL。私有图片不会因 checkout token 自动公开。

旧的 diagnostics/reference 网站生成脚本仅作历史参考，统一入口为 `docs_sync.py`，不要混用旧脚本覆盖双语页面。

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

只检查差异时追加 `--check`（有差异返回 1，不改文件）。在只读核对首次导入结果后，可用 `--adopt-existing` 接管既有网站中文；这是首次迁移选项，日常 CI 不使用它。

本地翻译先设置 `DOCS_AI_BASE_URL`、`DOCS_AI_API_KEY`、`DOCS_AI_MODEL`，再运行：

```powershell
$ErrorActionPreference = 'Stop'
python -B scripts/docs_sync.py translate --plugin 'I:\UnrealProject_Moon\DEV_58\DevTest\Plugins\DreamShader' --page builtins/dream-pass.md
if ($LASTEXITCODE -ne 0) { throw 'docs translation failed' }
```

`--page` 是英文文件相对 `Docs/` 的路径，包含 `.md` 扩展名，须换成实际存在的文件；不是网站页面 ID。不带 `--page` 按状态取下一批。该命令只写插件中文及 metadata，不提交、不推送、不创建 PR。Key 从安全凭据输入取得，不写进脚本或命令历史。

验证入口：`npm run docs:test`、`npm run docs:validate`、`npm run typecheck`、`npm run build`、`python -B scripts/check-links.py`。链接检查覆盖导出 HTML 的中英文页面及锚点，不验证外站或远程图片。本地命令不会部署；`docs_ci.py` 只供 GitHub Actions 调用。

四站共用标准库脚本副本；修改脚本或测试后同步四站并运行检查，配置与页面映射分别维护。
