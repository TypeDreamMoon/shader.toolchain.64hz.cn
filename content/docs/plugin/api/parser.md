---
title: "DreamShaderParser.h *（2.0 中已弃用）*"
description: "DreamShaderParser.h *（2.0 中已弃用）*"
---

# DreamShaderParser.h *（2.0 中已弃用）* [#dreamshaderparserh-retired-in-20]

> [DreamShader](/docs/) » [C++ API](/docs/plugin/api) » **DreamShaderParser.h**

> [!IMPORTANT]
> **`DreamShaderParser.h` 和 `FTextShaderParser` 已不复存在。** 直到 1.9.x，
> `DreamShader` 模块中的 `FTextShaderParser::Parse` 都会将 1.x 源代码文本转换为
> [`FTextShaderDefinition`](/docs/plugin/api/types#ftextshaderdefinition)，而 1.x 生成器则基于
> 该结构体构建资源。2.0 弃用了两者：`.dsm` / `.dsf` / `.dsh` 现在由唯一编译器的 **旧版前端**
> 读取，进入与 `.dss` 解析得到的相同 AST。

## 应改用哪些 [#what-to-call-instead]

| 1.x | 2.0 |
| :-- | :-- |
| `#include "DreamShaderParser.h"`（模块 `DreamShader`） | `#include "Lang/LangParser.h"`（模块 `DreamShaderLang`，仅限 `Core`） |
| `FTextShaderParser::Parse(SourceText, OutDefinition, OutError)` | `Lang::ParseDreamShaderLang(Lang::FLangSourceText(Path, Text), Options)` |
| 一个 `FText` 错误，且仅报告首个错误 | `FLangParseResult::Diagnostics` —— 所有诊断，每条都带有 `DSHnnnn` 代码、严重级别以及包含行、列和长度的范围 |
| `FTextShaderDefinition` | `FLangParseResult::Module`（`Lang::FModule`，两个前端都会生成的 AST）加上 `FLangParseResult::Legacy`（`Lang::FLegacyMigrationInfo`：该 AST 背后的 1.x 块、区段、参数声明、资源引用和重命名） |
| `Definition.Warnings` | 同一接收器中严重级别为 `Warning` 的诊断 |
| 文本必须先展开其中的 `import` | `import` 是 `#include`；它会在绑定时通过 `FBindOptions::IncludeResolver` 解析 |

```cpp
#include "Lang/LangParser.h"

using namespace UE::DreamShader::Lang;

const FLangSourceText Source(TEXT("DShader/Materials/M_Panel.dsm"), Text);   // the extension picks the front end
const FLangParseResult Parsed = ParseDreamShaderLang(Source);

if (Parsed.Succeeded() && Parsed.Legacy.IsValid())
{
    // Parsed.Module: functions, uniforms, pragmas -- what the 1.x blocks mean in 2.0 terms.
    // Parsed.Legacy: what the 1.x text said, for tools that need the 1.x view (migrate, the language service).
}
```

`ELangFrontend::Auto` 按扩展名决定：`.dsm` 和 `.dsf` 属于 1.x，`.dss` 和 `.dsi` 属于 2.0，而
`.dsh` 头文件是**按声明**进行分派的，因此一个头文件可以在项目迁移期间同时包含两种方言。

## 行为上的变化 [#what-changed-in-behaviour]

旧版前端保留了 1.x **有文档记载**的宽松行为，并取消了其未记录的静默宽松行为：
1.x 未加提示地接受、随后构建出的内容与文本所述不符的情况，现在会成为一个
诊断。这些规则被编目为 `L1`–`L27`；每条会重写或丢弃内容的规则都会通过代码说明这一点
（`DSH5254`、`DSH5275`–`DSH5292` 等），而 [`dsc migrate`](/docs/language-v2/migrate) 会将这些
规则改写为显式的 2.0 文本。

随之弃用的 1.x 解析器代码：`DSH2007`、`DSH3133`、`DSH3137` 及其相邻代码不再
被引发；旧版前端自身的代码为 `DSH2200`–`DSH2258`、`DSH3250`–`DSH3278` 和
`DSH6300`–`DSH6330`。

## 另请参阅 [#see-also]

- [`DreamShaderLang`](/docs/plugin/api/lang-module) —— 语言模块的每个入口点
- [`DreamShaderTypes.h`](/docs/plugin/api/types) —— 资源层仍在使用的 1.x 数据模型
- [迁移](/docs/language-v2/migrate) —— 将 1.x 源转换为 `.dss`
- [诊断索引](/docs/diagnostics)
