---
title: "DreamShader documentation"
description: "DreamShader documentation"
---

# DreamShader documentation

This directory is the English source for the DreamShader manual. Tutorials and reference pages live
together by topic and can be read here on GitHub or in a local Markdown reader. The
[documentation site](https://shader.toolchain.64hz.cn/en/docs) publishes these sources and maintains
reviewed Chinese translations separately.

## Start here

1. [About DreamShader](/en/docs/start/about) — the plugin, its modules and supported engines.
2. [Installation](/en/docs/start/installation) — install, enable and check the plugin.
3. [Your first material](/en/docs/start/first-material) — author and find a generated material.
4. [Project layout](/en/docs/start/project-layout) — source roots, folders and files.
5. [Daily workflow](/en/docs/start/workflow) — save, compile, regenerate and diagnose.

The compact [getting-started reference](/en/docs/plugin/getting-started) remains available for a quick setup.

## Topics

| Topic | Guides and reference |
| --- | --- |
| Language | [DreamShaderLang 2.0](/en/docs/language-v2); [1.x reference](/en/docs/plugin/language), [blocks](/en/docs/language/blocks), [sections](/en/docs/language/sections), [functions](/en/docs/language/functions) |
| Graphs | [Statements, expressions and calls](/en/docs/graph/overview) |
| Nodes and parameters | [Builtins](/en/docs/plugin/builtins), [parameters](/en/docs/plugin/parameters), [settings](/en/docs/plugin/settings) |
| Generation | [Pipeline and asset lifecycle](/en/docs/generation/pipeline), [output bindings](/en/docs/generation/outputs), [source control](/en/docs/generation/source-control) |
| Examples | [Reference examples](/en/docs/plugin/examples), [patterns](/en/docs/examples/patterns), [recipes](/en/docs/examples/recipes), [Custom Pass examples](/en/docs/examples/custom-pass) |
| Tools | [Editor tools](/en/docs/plugin/tools), [VSCode and Rider](/en/docs/tools/vscode), [commandlet](/en/docs/tools/commandlet) |
| Custom Pass | [Runtime](/en/docs/plugin/runtime), [HLSL passes](/en/docs/plugin/runtime/hlsl), [pipeline language](/en/docs/custom-pass) |
| Diagnostics | [Error and warning lookup](/en/docs/diagnostics), [limitations](/en/docs/diagnostics/limitations) |
| Development | [C++ API](/en/docs/plugin/api), [contributing](/en/docs/plugin/contributing), [testing](/en/docs/plugin/contributing/testing), [release](/en/docs/plugin/contributing/release) |
| Release history | [Version notes with explanations](/en/docs/changelog/dreamshader), [repository changelog](https://github.com/TypeDreamMoon/DreamShader/blob/96cffa24e5a454147d7953256ed7d45afae7ac9f/CHANGELOG.md) |

The [complete reference index](/en/docs/) lists the individual technical reference pages.

## Maintaining the manual

Edit the English Markdown in the relevant topic directory. Keep examples, identifiers and relative
links usable in the plugin repository; website presentation belongs to the documentation site.

The site's `docs-sync/config.json` maps source paths to published page IDs. Moving a source file
requires updating that mapping and incoming relative links, while retaining its page ID to keep
existing URLs stable. English pages are generated from these sources; AI-generated Chinese updates
are reviewed in a pull request before publication.
