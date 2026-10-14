---
title: "DreamShaderLang"
description: "DreamShaderLang"
---

# DreamShaderLang [#dreamshaderlang]

> [DreamShader](/docs/) » **DreamShaderLang**

从 `.dsm`、`.dsf` 和 `.dsh` 源文件中读取的语言：一种描述资源的外层声明文法，以及一种嵌入在 `Graph` 块中、描述其内部节点图的语句文法。

| | |
| :-- | :-- |
| 声明于 | `.dsm`、`.dsf`、`.dsh` |
| 种类 | 语言 |
| 生成 | `UMaterial`、`UMaterialFunction`、`UMaterialFunctionMaterialLayer`、`UMaterialFunctionMaterialLayerBlend` |
| 版本 | 1.x 语言，最后发布于 `1.9.1`；由 2.0 编译器构建 *(自 2.0.0 起)* |
| 引擎 | Unreal Engine `5.3` – `5.8`；在所有受支持的引擎版本上，所接受的文法完全相同 |

> [!NOTE]
> 新源文件使用 [DreamShaderLang 2.0](/docs/language-v2)（`.dss`）编写。1.x 源文件
> 仍经由同一编译器构建，并且 [`dsc migrate`](/docs/language-v2/migrate) 会将其重写为
> `.dss`，并证明该重写会构建出相同的图。

## 概要 [#synopsis]

一个源文件就是一个文件加上它所导入的头文件。

```c
[ import "<specifier>" ; ]…

<top-level-block>…
```

```c
<top-level-block> := { Shader | ShaderFunction | ShaderLayer | ShaderLayerBlend
                     | MaterialLayer | MaterialLayerBlend | VirtualFunction | Namespace }
                     ( <attribute> = <value> [, …] ) { <section>… }
                   | { Function [ SelfContained | Inline ] | GraphFunction }
                     [<return-type>] <name> ( [<parameter>, …] ) { <HLSL> }

<section>          := <section-name> [=] { <statement>… } [;]
```

顶层块可以以任意顺序出现，并且除 `Shader` 之外，可以出现任意次数。它们之间没有分隔符。

## 两种文法 [#two-grammars]

*(自 2.0.0 起)* 一个词法分析器将整个文件转换为词法单元，再由一个 **旧版前端** 从这些词法单元中读取两种文法，构建出与 [2.0 解析器](/docs/language-v2) 所构建的相同的树——因此，1.x 文件随后会经历与 `.dss` 相同的绑定器、IR 和发射器。在 1.9.x 及之前，这两种文法是两台独立的机器：运行时模块中的声明解析器，以及生成器中的 `Graph` 表达式解析器，各自拥有自己的字符扫描器。

| | 声明文法 | `Graph` 语句文法 |
| :-- | :-- | :-- |
| 实现者 | 模块 `DreamShaderLang` 中的旧版前端 | 同一前端，基于 2.0 语句与表达式解析器 |
| 运行时机 | 源文件编译时，在预处理之后 | 在同一次解析中，在块的其它所有部分之后 |
| 输入 | 整个文件的词法单元 | `Graph = {` 与其 `}` 之间的词法单元 |
| 产出 | 2.0 声明：`#pragma material`、`uniform`、入口函数或函数资源、`#pragma layout` | 该函数体的语句 |
| 数值字面量 | 数字词法单元；每个部分按使用方的要求读取词法单元的文本——参见[数值字面量](/docs/language/lexical#numeric-literals) | 数字词法单元 |
| 注释 | `//` 和 `/* */`，可位于词法单元之间的任意位置 | 相同 |
| 语句分隔符 | 括号外的 `;` | `;`——参见[语句](/docs/graph/statements) |
| 接受的标点 | 在某个部分的文法指明之处使用 `{ } ( ) [ ] ; = , . :` 和 `::` | 2.0 文法的每个运算符都是词法单元；1.x `Graph` 所不具备的运算符会按名称被拒绝，[`DSH2200`](/docs/plugin/diagnostics/dsh2xxx#dsh2200)–[`DSH2222`](/docs/plugin/diagnostics/dsh2xxx#dsh2222) |
| 错误位置 | 各个部分中该构造所在的行和列 | 该构造所在的行和列 |

`#if` 系列**不属于**任何一种文法：它在文件被词法分析之前逐行处理，因此它的任何关键字都不是解析器所认识的关键字。参见[预处理器](/docs/plugin/language/preprocessor)。
*(自 2.0.0 起)* [`import`](/docs/language/imports) 是声明文法中的顶层声明；在
1.9.x 及之前，它同样是一条面向行的指令，在解析之前处理。

```text
<file>.dsm
  │
  ├─ preprocessor           evaluate `#if` / `#ifdef` / `#elif` / `#else` / `#endif` against the
  │                         define table; cut untaken branches, preserving the line count;
  │                         `Function` bodies pass through untouched
  │
  ├─ legacy front end       tokens -> blocks, sections, `Graph` statements -> the 2.0 tree;
  │                         what 1.x read silently and built wrong is an error (DSH2200–DSH2222)
  │
  ├─ binder                 names, types, calls; an `import`ed `.dsh` is preprocessed and parsed on
  │                         its own and its declarations are declared into this file; the legacy
  │                         rules apply to 1.x text and say so (DSH5275–DSH5292)
  │
  ├─ IR                     lowering, passes, validation
  │
  └─ emitter                material nodes  ->  asset
```

前端和绑定器会报告其所有错误，而非仅报告第一个错误，且某个阶段出现错误会在进入下一阶段之前停止流水线；预处理器则在其第一个错误处停止。
预处理器**首先**按文件运行，这正是 `#if` 能够决定是否采用某个 `import` 的原因——也是 `#define` 只对写入它的文件局部有效的原因。

## 声明语言 [#declaration-language]

| | |
| :-- | :-- |
| [源文件](/docs/language/file-model) | `.dsm` / `.dsf` / `.dsh`，各自可包含的内容，发现机制 |
| [词法元素](/docs/language/lexical) | 注释、标识符、大小写敏感性、字面量、语句拆分 |
| [关键字索引](/docs/plugin/language/keywords) | 每个保留字、别名和标识符重写 |
| [`import`](/docs/language/imports) | 搜索根、包、循环 |
| [预处理器](/docs/plugin/language/preprocessor) | 八个 `#if` / `#define` 指令以及定义表 *(自 1.9.0 起)* |
| [类型](/docs/language/types-and-values) | 类型词法单元目录及各上下文有效性 |

**顶层块**

| | |
| :-- | :-- |
| [`Shader`](/docs/plugin/language/shader) | 生成一个 `UMaterial` |
| [`ShaderFunction`](/docs/plugin/language/shader-function) | 生成一个 `UMaterialFunction` |
| [`ShaderLayer` / `ShaderLayerBlend`](/docs/plugin/language/shader-layer) | 生成原生材质层函数 *(自 1.3.0 起)* |
| [`VirtualFunction`](/docs/plugin/language/virtual-function) | 声明一个现有的 `UMaterialFunction` *(自 1.2.0 起)* |
| [`Function`](/docs/plugin/language/function) | 可复用的 HLSL 辅助函数 |
| [`GraphFunction`](/docs/plugin/language/graph-function) | 其 `UE.*` 调用会成为节点输入的 HLSL 辅助函数 *(自 1.3.1 起)* |
| [`Namespace`](/docs/plugin/language/namespace) | 将辅助函数归组到 `Ns::Name` 下 |

**各部分**

| | |
| :-- | :-- |
| [`Properties`](/docs/parameters/properties) | 参数、`const` 和 `UE.*` 声明、`Group("…")` 作用域 |
| [`Inputs` / `Outputs` / `Results`](/docs/plugin/language/inputs-outputs) | 材质函数的类型化参数 |
| [输出绑定](/docs/plugin/language/output-bindings) | `Base.<Property> = <value>;` 和 `Expression( … ).Pin[<i>]` |
| [`Settings`](/docs/plugin/settings) | 材质和材质函数设置 |
| [`Options`](/docs/plugin/language/options) | `VirtualFunction` 资源绑定 |
| [`Layout`](/docs/language/layout) | `Node` / `Comment` 放置与 `#Region` |

## 图语言 [#graph-language]

`Graph = { … }` 内部的语句和表达式语言。

| | |
| :-- | :-- |
| [图概述](/docs/graph/overview) | `Graph` 块是什么以及如何求值 |
| [语句](/docs/graph/statements) | 每一种语句形式 |
| [声明](/docs/plugin/graph/declarations) | 变量、初始化器、作用域 |
| [表达式与运算符](/docs/graph/expressions) | 优先级、结合性、复合赋值 |
| [字面量](/docs/plugin/graph/literals) | 数值形式、后缀、`true` / `false` |
| [构造函数](/docs/plugin/graph/constructors) | `float3( … )`、`vec4( … )`、splatting |
| [Swizzle](/docs/plugin/graph/swizzle) | 通道集合、重排、重复 |
| [转换](/docs/plugin/graph/conversions) | 强制转换与分量数量规则 |
| [`if` / `else`](/docs/graph/control-flow) | 条件与分支语义 |
| [`MaterialAttributes`](/docs/plugin/graph/material-attributes) | 成员写入与读取 *(自 1.2.5 起)* |
| [调用](/docs/graph/calls) | 调用函数和参数引脚 |
| [名称解析](/docs/plugin/graph/name-resolution) | 查找顺序与遮蔽 |
| [节点复用](/docs/plugin/graph/node-reuse) | 公共子表达式去重 |
| [不支持的构造](/docs/graph/unsupported) | 循环、`return`、三元运算符、`%`、比较、索引 |

## 说明 [#notes]

- **同一个标记可以有两种读取方式。** `1.0f` 在任何位置都是一个浮点标记。`Properties`
  默认读取其文本——一个符号、若干数字、一个小数点 `.`、一个指数、一个可选的 `f`——因此
  `float Strength = 1.0f;` 和 `float Strength = 1e3;` 都没问题，而 `float Strength = 0x1F;` 是
  [`DSH3254`](/docs/plugin/diagnostics/dsh3xxx#dsh3254)；`Graph` 表达式则读取该标记本身。请参阅
  [数值字面量](/docs/language/lexical#numeric-literals)。
- **预处理器不属于任何一种语法。** 八个小写指令——`#if`、`#ifdef`、
  `#ifndef`、`#elif`、`#else`、`#endif`、`#define`、`#undef`——会在解析之前
  对原始文本求值，并且永远不会进入任何一种语法 *(自 1.9.0 起)*。除这八个之外，`#` 行只有在
  有归属者时才会被传递：在 `Function` 主体内的任何位置（即 HLSL，包括 `#include`），
  以及在 `#Region` / `#EndRegion` 中无论如何都会传递。其他任何内容都是 `DSH1035`，
  其中包括大小写错误的指令，例如 `#IF`。请参阅 [预处理器](/docs/plugin/language/preprocessor) 和 [布局](/docs/language/layout)。
- **顶层块关键字和小写保留字是区分大小写的标记。**
  节名称、类型标记、属性键、设置键以及所有其他类似关键字的标记
  都以不区分大小写的方式匹配。请参阅 [大小写敏感性](/docs/language/lexical#case-sensitivity)。
- **解析器与引擎版本无关。** 任何词法或语法构造都不以
  Unreal Engine 版本为条件。版本门控只存在于解析的下游——Substrate 类型和
  内置项（UE 5.4+），以及少量节点和设置门控。
- `.dsm` 或 `.dsf` 必须至少包含一个 `Shader`、`ShaderFunction`、`ShaderLayer`、
  `ShaderLayerBlend`、`Function`、`GraphFunction`、`Namespace` 或 `VirtualFunction` 块，否则它
  就是 [`DSH2254`](/docs/plugin/diagnostics/dsh2xxx#dsh2254)。*(自 2.0.0 起)* 即使是空的 `Namespace` 也会计入，
  而 `.dsh` 可以只包含导入。

## 示例 [#example]

一个 `.dsm` 同时使用两种语法：声明语法掌管 `Graph = { }` 之外的一切，
语句语法掌管其内的一切。

```c
Shader(Name="Materials/M_Comments")
{
    Settings = {
        Domain       = "UI";        // trailing line comment
        ShadingModel = "Unlit";
    }

    Outputs = {
        vec3 Color;
        Base.EmissiveColor = Color;
    }

    Graph = {
        Color = vec3(1.0, 1.0, 1.0); // inline comment inside the graph body
    }
}
```

## 另请参阅 [#see-also]

- [源文件](/docs/language/file-model) —— `.dsm` / `.dsf` / `.dsh` 各自可以包含哪些块类型
- [词法元素](/docs/language/lexical) —— 标记、大小写规则、字面量、拆分
- [关键字索引](/docs/plugin/language/keywords) —— 每个保留字及其对应文档页面
- [`import`](/docs/language/imports) —— 头文件的声明如何到达导入它的文件
- [预处理器](/docs/plugin/language/preprocessor) —— 用 `#if` 切分声明层，以及定义表
- [图](/docs/graph/overview) —— 语句语法
- [DreamShaderLang 2.0](/docs/language-v2) —— 编译器流水线，以及 `.dss` 语言
- [`dsc migrate`](/docs/language-v2/migrate) —— 从 1.x 源码到 `.dss`
- [诊断索引](/docs/diagnostics) —— 按流水线阶段列出的每个代码
- [生成](/docs/generation/pipeline) —— 树被转换成什么
- [入门](/docs/plugin/getting-started) —— 端到端完成第一个 `.dsm`
