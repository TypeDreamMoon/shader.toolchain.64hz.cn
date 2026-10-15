---
title: "DreamShader 文档"
description: "DreamShader 文档"
---

# DreamShader 文档 [#dreamshader-documentation]

[English](/docs/plugin/readme) · 简体中文

本目录是 DreamShader 手册的英文原文。教程与参考页按主题放在一起，可以在 GitHub 上阅读，也可以用本地 Markdown 阅读器打开。[文档站](https://shader.toolchain.64hz.cn/en/docs)发布这些英文原文，以及本插件中维护的、经过审阅的中文译文。

## 从这里开始 [#start-here]

1. [关于 DreamShader](/docs/start/about) —— 插件、其模块及支持的引擎。
2. [安装](/docs/start/installation) —— 安装、启用并检查插件。
3. [第一个材质](/docs/start/first-material) —— 编写并找到生成的材质。
4. [项目结构](/docs/start/project-layout) —— 源根目录、文件夹和文件。
5. [日常工作流](/docs/start/workflow) —— 保存、编译、重新生成和诊断。

简洁的[入门参考](/docs/plugin/getting-started)仍可用于快速设置。

## 主题 [#topics]

| 主题 | 指南与参考 |
| --- | --- |
| 语言 | [DreamShaderLang 2.0](/docs/language-v2)；[1.x 参考](/docs/plugin/language)、[块](/docs/language/blocks)、[Section](/docs/language/sections)、[函数](/docs/language/functions) |
| 图 | [语句、表达式与调用](/docs/graph/overview) |
| 节点与参数 | [内置](/docs/plugin/builtins)、[参数](/docs/plugin/parameters)、[设置](/docs/plugin/settings) |
| 生成 | [管线与资产生命周期](/docs/generation/pipeline)、[输出绑定](/docs/generation/outputs)、[版本控制](/docs/generation/source-control) |
| 示例 | [参考示例](/docs/plugin/examples)、[常用写法](/docs/examples/patterns)、[完整示例](/docs/examples/recipes)、[Custom Pass 示例](/docs/examples/custom-pass) |
| 工具 | [编辑器工具](/docs/plugin/tools)、[VSCode 与 Rider](/docs/tools/vscode)、[命令行](/docs/tools/commandlet) |
| Custom Pass | [运行时](/docs/custom-pass)、[HLSL pass](/docs/plugin/pass-runtime/hlsl)、[管线语言](/docs/language-v2/passes) |
| 诊断 | [错误与警告速查](/docs/diagnostics)、[当前限制](/docs/diagnostics/limitations) |
| 开发 | [C++ API](/docs/plugin/api)、[参与贡献](/docs/plugin/contributing)、[测试](/docs/plugin/contributing/testing)、[发布](/docs/plugin/contributing/release) |
| 发布历史 | [带说明的版本记录](/docs/changelog/dreamshader)、[仓库更新日志](https://github.com/TypeDreamMoon/DreamShader/blob/b5169970e3e8fb75199b1c0cef17d213ca3a3573/CHANGELOG.md) |

[完整参考索引](/docs/)列出了各篇技术参考页。

## 维护手册 [#maintaining-the-manual]

编辑相应主题目录中的英文 Markdown。保持示例、标识符和相对链接在插件仓库中可用；网站的呈现方式属于文档站。

文档站的 `docs-sync/config.json` 将源路径映射到已发布页面 ID。移动源文件需要更新该映射以及指向它的相对链接，同时保留其页面 ID 以保持现有 URL 稳定。英文页面由这些源文件生成；AI 生成的中文更新在发布前会经过 Pull Request 审阅。

发布时还会更新[版本说明页面](/docs/changelog/dreamshader)：它面向手册读者撰写——说明对他们而言有哪些变化，并链接到相关页面——并非 `CHANGELOG.md` 的副本，因此两者都不是由对方生成的。当 `CHANGELOG.md` 获得新版本时，更新其*当前版本*行并添加该版本的章节；提及当前版本的页面，例如[限制](/docs/diagnostics/limitations)，也在同一时间审阅。

`zh-CN/` 目录树与英文源路径保持一致。导入的译文未经审阅；[首次迁移快照](https://github.com/TypeDreamMoon/DreamShader/blob/b5169970e3e8fb75199b1c0cef17d213ca3a3573/Docs/zh-CN/TRANSLATIONS.md)保留了原始的已导入和缺译清单。要了解当前状态，请运行 `python -B Docs/translation-status.py`，或查看网站仓库中的翻译状态 Issue。`.translations/` 记录源文件版本，但不将导入视为批准。仅网站使用的说明保留在网站仓库中。

在本地用 `python -B Docs/translation-status.py` 检查翻译状态；添加 `--all` 可包含全部源文件，或添加 `--json` 输出结构化结果。此只读工具无需网站仓库或 Git 检出。
