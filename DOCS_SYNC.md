# 插件双语文档同步

本站对应插件仓库 `TypeDreamMoon/DreamShader`。插件仓库保存英文原文、`Docs/zh-CN/` 中文和对齐表 `Docs/zh-CN/.align/`；本站只同步已经合并的双语内容并部署，不调用 AI，也不向插件开 PR。同步代码在共用工具 [dreamdocs](https://github.com/TypeDreamMoon/dreamdocs) 里，版本由 `docs-sync/config.json` 的 `tool` 字段指定，同步和部署工作流按这个版本检出它。

## 流程

1. 在插件仓库修改英文，用 `dreamdocs translate` 更新中文（见插件 `Docs/README.md`），一起审阅、合并到 `main`。
2. 插件的 `Notify documentation site` 把仓库名和提交 SHA 发给本站。
3. 本站 `Sync plugin documentation` 检出该提交和 dreamdocs，生成英文和中文页面及版本记录，做类型检查、构建和链接检查，通过后只提交生成的页面和记录，然后部署。
4. 中文落后于英文的页面照常发布原有中文，页首提示「原文已更新」和待更新的段数；没有核对过的中文提示「本页待核对」。

## 在哪里编辑

- 插件原文和中文：都在插件仓库。网站上由同步生成的页面不要手改，否则同步会拒绝覆盖。
- 网站独立补充：中文页尾 `<!-- docs-sync:notes -->` 之后的内容只属于网站，同步原样保留。
- 页面映射：`docs-sync/config.json`，支持整篇、按标题、诊断组摘录和 `siteOnly` 页面；没有映射的插件文档自动出现在 `plugin/` 下。改页面 ID 时先删掉 `docs-sync/source-lock.json` 里的旧条目和旧生成文件，再同步。路由不要用 `runtime`、`vendor` 这类服务器会拦截的目录名。
- 术语表和提示词：插件的 `Docs/zh-CN/.dreamdocs/`，以及 dreamdocs 自带的通用术语表。

## 凭据

| 仓库 | Secret | 用途 |
| --- | --- | --- |
| 插件仓库 | `DOCS_SYNC_TOKEN` | Fine-grained PAT，对本站仓库 `Contents: Read and write`，用于发送 `repository_dispatch` |
| 本站 | `DOCS_SOURCE_TOKEN` | 私有插件的只读检出；公共插件可省略 |
| 本站 | `SFTP_*` | 部署 |

`DOCS_AI_API_KEY`、`DOCS_AI_*` 变量和 `DOCS_PR_TOKEN` 已不再使用，可以删除；如果 `DOCS_PR_TOKEN` 还兼作私有插件的读取令牌，先配好 `DOCS_SOURCE_TOKEN` 再删。

## 本地命令

```powershell
pip install -e <dreamdocs 检出>
python -B -m dreamdocs site sync --site . --plugin <插件检出>
python -B -m dreamdocs site status --site .
python -B -m dreamdocs site validate --site .
npm run typecheck
npm run build
python -B scripts/check-links.py
```

本地命令不会提交、推送或部署。`site ci` 只在 GitHub Actions 里运行。
