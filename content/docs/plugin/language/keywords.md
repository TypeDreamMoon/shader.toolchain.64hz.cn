---
title: "关键字索引"
description: "关键字索引"
---

# 关键字索引 [#keyword-index]

> [DreamShader](/docs/) » [DreamShaderLang](/docs/plugin/language) » **关键字索引**

声明语法特殊处理的每个单词：顶层块关键字、节名称及其别名、声明限定符、上下文关键字、保留名称，以及在输出 HLSL 之前被重写的标识符。

| | |
| :-- | :-- |
| 声明于 | `.dsm`, `.dsf`, `.dsh` |
| 类型 | 索引 |
| 大小写规则 | 顶层块关键字和[保留字](#reserved-words)区分**大小写**；本页其他内容均不区分**大小写**，除非其所在行另有说明 |

## 概要 [#synopsis]

```c
<top-level-keyword> ( <attribute-key> = <value> [, …] )
{
    <section-name> [=] { <qualifier>… <type> <name> [= <default>] [[ <metadata> ]] ; … } [;]
}
```

> [!NOTE]
> **块关键字、节名称和类型名称对标识符而言并非保留字。** 属性、
> 输出变量、参数或函数可以命名为 `Shader`、`Graph` 或 `Layout`；它们
> 仅在语法期望出现的位置被识别。[保留字](#reserved-words)是
> 例外 *(自 2.0.0 起)*。

## 顶层块关键字 [#top-level-block-keywords]

以整个单词为单位，**区分大小写**进行匹配：`ShaderFunction` 是一个独立的单词，绝不会是 `Shader`
后跟其他内容。大小写错误的版本（`shader(…)`）不是块：
[`DSH2240`](/docs/plugin/diagnostics/dsh2xxx#dsh2240)。

| 关键字 | 头文件 | 必需特性 | 生成 | 参考 |
| :-- | :-- | :-- | :-- | :-- |
| `Shader` | `Shader(Name = "…"[, Root = "…"])` | `Name` | `UMaterial` | [Shader](/docs/plugin/language/shader) |
| `ShaderFunction` | `ShaderFunction(Name = "…"[, Root = "…"])` | `Name` | `UMaterialFunction` | [ShaderFunction](/docs/plugin/language/shader-function) |
| `ShaderLayer` *(自 1.3.0 起)* | `ShaderLayer(Name = "…"[, Root = "…"])` | `Name` | `UMaterialFunctionMaterialLayer` | [ShaderLayer](/docs/plugin/language/shader-layer) |
| `ShaderLayerBlend` *(自 1.3.0 起)* | `ShaderLayerBlend(Name = "…"[, Root = "…"])` | `Name` | `UMaterialFunctionMaterialLayerBlend` | [ShaderLayer](/docs/plugin/language/shader-layer) |
| `MaterialLayer` *(1.3.0 中已弃用)* | `MaterialLayer(Name = "…"[, Root = "…"])` | `Name` | 同 `ShaderLayer` | [ShaderLayer](/docs/plugin/language/shader-layer) |
| `MaterialLayerBlend` *(1.3.0 中已弃用)* | `MaterialLayerBlend(Name = "…"[, Root = "…"])` | `Name` | 同 `ShaderLayerBlend` | [ShaderLayer](/docs/plugin/language/shader-layer) |
| `VirtualFunction` *(自 1.2.0 起)* | `VirtualFunction(Name = "…"[, Asset = "…"])` | `Name`，以及来自 `Asset =` 或 `Options.Asset` 的资产 | 无 — 声明现有资产 | [VirtualFunction](/docs/plugin/language/virtual-function) |
| `Namespace` | `Namespace(Name = "…")` | `Name` | 无 — 辅助函数的范围 | [Namespace](/docs/plugin/language/namespace) |
| `Function` | `Function [SelfContained \| Inline] [<ret>] <Name>( … ) { <HLSL> }` | 名称、至少一个输出 | HLSL 辅助函数 | [Function](/docs/plugin/language/function) |
| `GraphFunction` *(自 1.3.1 起)* | `GraphFunction [<ret>] <Name>( … ) { <HLSL> }` | 名称、至少一个输出 | 带节点输入的 HLSL 辅助函数 | [GraphFunction](/docs/plugin/language/graph-function) |

`Shader` 限制为**每个文件一个**（[`DSH2250`](/docs/plugin/diagnostics/dsh2xxx#dsh2250)），并且 `.dsh`
头文件根本不包含资产块（[`DSH2249`](/docs/plugin/diagnostics/dsh2xxx#dsh2249)），因此 `import`
不能添加第二个。其他每个块都可以重复。`Function` 和 `GraphFunction`
也可以嵌套在 `Namespace` 内，此时它们的名称变为 `<Namespace>::<Name>`。

> [!WARNING]
> 自 1.3.0 起，`MaterialLayer` 和 `MaterialLayerBlend` 已弃用，建议改用 `ShaderLayer` 和
> `ShaderLayerBlend`。它们的读取方式相同，但会给出警告
> [`DSH2251`](/docs/plugin/diagnostics/dsh2xxx#dsh2251)。后续诊断和生成的元数据始终
> 报告现代拼写。

## 节名称 [#section-names]

不区分大小写进行匹配。块之前的 `=` 是可选的 *(自 1.5.0 起)*，其后的 `;` 也是
可选的。节可以按任意顺序出现，也可以重复：`Properties`、`Inputs` 和 `Outputs` 会追加，
`Settings` 按键逐个合并，第二个 `Graph` 或 `Layout` 会**替换**第一个，并给出警告
[`DSH2258`](/docs/plugin/diagnostics/dsh2xxx#dsh2258) *(自 2.0.0 起)*。块不接受的名称会报
[`DSH2245`](/docs/plugin/diagnostics/dsh2xxx#dsh2245)。

| 名称 | 接受于 | 含义 | 参考 |
| :-- | :-- | :-- | :-- |
| `Properties` | `Shader`, `ShaderFunction`, `ShaderLayer`, `ShaderLayerBlend` | 参数、`const` 和 `UE.*` 节点声明 | [Properties](/docs/parameters/properties) |
| `Properties` | `VirtualFunction` | **`Inputs` 的别名** — 类型化参数，而非参数节点 | [VirtualFunction](/docs/plugin/language/virtual-function) |
| `Inputs` | `ShaderFunction`, `ShaderLayer`, `ShaderLayerBlend`, `VirtualFunction` | 类型化输入参数 | [Inputs / Outputs](/docs/plugin/language/inputs-outputs) |
| `Outputs` | `ShaderFunction`, `ShaderLayer`, `ShaderLayerBlend`, `VirtualFunction` | 类型化输出参数 | [Inputs / Outputs](/docs/plugin/language/inputs-outputs) |
| `Outputs` | `Shader` | 输出声明和绑定 — **不同的语法** | [Output bindings](/docs/plugin/language/output-bindings) |
| `Results` | `ShaderFunction`, `ShaderLayer`, `ShaderLayerBlend`, `VirtualFunction` | `Outputs` 的别名 | [Inputs / Outputs](/docs/plugin/language/inputs-outputs) |
| `Settings` | `Shader` | 材质设置 — 特殊键加上反射的 `UMaterial` 属性 | [Material settings](/docs/settings/material) |
| `Settings` | `ShaderFunction`, `ShaderLayer`, `ShaderLayerBlend` | 材质函数键 | [Function settings](/en/docs/plugin/settings/function) |
| `Settings` | `VirtualFunction` | `Options` 的别名 | [Options](/docs/plugin/language/options) |
| `Options` | `VirtualFunction` | 声明的资产和其他存储的键 | [Options](/docs/plugin/language/options) |
| `Graph` | `Shader`, `ShaderFunction`, `ShaderLayer`, `ShaderLayerBlend` | 节点图主体 | [Graph](/docs/graph/overview) |
| `Code` | — | **在任何位置均被拒绝**；请使用 `Graph` | [Graph](/docs/graph/overview) |
| `Layout` | `Shader`, `ShaderFunction`, `ShaderLayer`, `ShaderLayerBlend` | `Node` / `Comment` 放置 | [Layout](/docs/language/layout) |

`Function` 和 `GraphFunction` 完全没有节 — 它们的 `{ … }` 是原始 HLSL。

> [!WARNING]
> `Code = { … }` 在所有接受节的块中都是错误：
> [`DSH2246`](/docs/plugin/diagnostics/dsh2xxx#dsh2246)，并且在 `VirtualFunction` 中，连同 `Graph`，
> [`DSH2247`](/docs/plugin/diagnostics/dsh2xxx#dsh2247)。请使用 `Graph`。

## 声明限定符 [#declaration-qualifiers]

| 限定符 | 位置 | 作用 | 参考 |
| :-- | :-- | :-- | :-- |
| `const` *(自 1.2.6 起)* | 位于 `Properties` 声明中的类型之前 | 发出常量节点而不是参数；在大多数参数节点标记上被拒绝（[`DSH3253`](/docs/plugin/diagnostics/dsh3xxx#dsh3253)） | [属性](/docs/parameters/properties) |
| `opt` *(自 1.2.3 起)* | 位于 `Inputs` 声明中的类型之前 | 在 Unreal 中将该函数输入标记为可选；当其后跟随类型和名称时被识别 | [输入 / 输出](/docs/plugin/language/inputs-outputs) |
| `in` | 位于 `Function` / `GraphFunction` 参数类型之前 | 输入参数；当参数只有两个词时的默认值 | [函数](/docs/plugin/language/function) |
| `out` | 位于 `Function` / `GraphFunction` 参数类型之前 | 输出参数；除非声明了返回类型，否则至少需要一个，并且不能与返回类型并列（[`DSH6305`](/docs/plugin/diagnostics/dsh6xxx#dsh6305)、[`DSH6304`](/docs/plugin/diagnostics/dsh6xxx#dsh6304)） | [函数](/docs/plugin/language/function) |
| `SelfContained` | 位于 `Function` 之后 | 读取并被忽略：每个 `Function` 节点已经嵌入了其主体所调用的内容，这正是它向 1.x 所要求的内容；**在 `GraphFunction` 上不被接受**（[`DSH6307`](/docs/plugin/diagnostics/dsh6xxx#dsh6307)） | [函数](/docs/plugin/language/function) |
| `Inline` | 位于 `Function` 之后 | `SelfContained` 的精确别名，带有警告 [`DSH6306`](/docs/plugin/diagnostics/dsh6xxx#dsh6306) *(自 2.0.0 起)* | [函数](/docs/plugin/language/function) |

`in` 和 `out` 是函数参数上唯一被接受的限定符，不区分大小写；其他任何内容都是
[`DSH6302`](/docs/plugin/diagnostics/dsh6xxx#dsh6302)。

## 上下文关键字 [#contextual-keywords]

仅在所列位置被识别，且不区分大小写，除非该行另有说明。

| 关键字 | 位置 | 含义 | 参考 |
| :-- | :-- | :-- | :-- |
| `import` | 顶层，位于块之间 | 将 `.dsh` 头文件的名称声明到本文件中 *(自 2.0.0 起；1.x 会粘贴该文件)*；小写 — 其他大小写读取结果相同，并带有警告 [`DSH2253`](/docs/plugin/diagnostics/dsh2xxx#dsh2253) | [`import`](/docs/language/imports) |
| `Group("…") { … }` *(自 1.5.0 起)* | `Properties` 内的语句位置 | 将参数组作用域限定到其包含的每个声明；可嵌套，与 `\|` 组合 | [属性](/docs/parameters/properties) |
| `Slider(min, max)` *(自 1.5.0 起)* | `[ … ]` 元数据块中的条目 | 设置标量参数的 UI 范围 | [元数据块](/docs/parameters/metadata) |
| `Path( … )` | 纹理或资产值声明的默认值 | 带有根拼写的资产引用 | [`Path(...)`](/docs/parameters/path) |
| `Base.` | `Outputs` 绑定目标的开头 | 绑定到材质属性 | [输出绑定](/docs/plugin/language/output-bindings) |
| `Expression( … )` | `Outputs` 绑定目标的开头 | 绑定到反射节点上的引脚；`Class="…"` 是必需的 | [输出绑定](/docs/plugin/language/output-bindings) |
| `.Pin[<index>]` | 位于 `Expression( … )` 目标之后 | 选择要绑定的引脚 | [输出绑定](/docs/plugin/language/output-bindings) |
| `Node( … )` | `Layout` 内的语句 | 固定变量的节点位置 | [布局](/docs/language/layout) |
| `Comment( … )` | `Layout` 内的语句 | 放置注释框 | [布局](/docs/language/layout) |
| `#Region` / `#EndRegion` | `Graph` 主体内的独立行 | 命名图的一个区域；可嵌套 | [布局](/docs/language/layout) |
| `#if` / `#elif` / `#else` / `#endif` *(自 1.9.0 起)* | 独立行，除 `Function` / `GraphFunction` HLSL 主体外的任何位置 | 在解析前从文本中剪除未采用的分支；**仅限小写** | [预处理器](/docs/plugin/language/preprocessor) |
| `#ifdef` / `#ifndef` *(自 1.9.0 起)* | 独立行，相同位置 | `#if defined(NAME)` 和 `#if !defined(NAME)` 的语法糖 | [预处理器](/docs/plugin/language/preprocessor) |
| `#define` / `#undef` *(自 1.9.0 起)* | 独立行，相同位置 | 定义或移除一个名称，**仅对该文件有效**；`#define` 值延伸到行尾且为纯文本 | [预处理器](/docs/plugin/language/preprocessor#define-is-file-local) |
| `defined` *(自 1.9.0 起)* | 位于 `#if` / `#elif` 表达式内 | 名称已定义时为 `1`，否则为 `0`；`defined(X)` 和 `defined X` 均可用 | [预处理器](/docs/plugin/language/preprocessor#values) |
| `UE.` | `Properties` 中的类型位置，`Graph` 中的调用位置 | 内置材质节点命名空间；在 `Graph` 调用中精确写为 `UE` *(自 2.0.0 起)* | [`UE.*` 目录](/docs/builtins/ue-nodes) |
| `true` / `false` | 默认值，`Graph` 表达式 | 布尔字面量；在需要标量的位置转换为 `1.0` / `0.0` | [类型](/docs/language/types-and-values) |
| `default` *(自 1.2.3 起)* | `Graph` 中的调用实参 | 使该输入保持未连接，因此应用函数自身的默认值；仅限小写 *(自 2.0.0 起)* | [调用](/docs/graph/calls) |

## 保留字 [#reserved-words]

*(自 2.0.0 起)* 单个词法分析器读取每个文件，其关键字在 1.x 文件中同样被保留，且为小写：
`uniform` `static` `const` `extern` `export` `in` `out` `inout` `struct` `if` `else` `for` `while`
`do` `return` `break` `continue` `discard` `true` `false` `import`。它们都不能命名属性、
输出、输入或 `Graph` 变量。其他大小写是普通词语：`Const` 和 `IN` 在
1.x 语法期望它们的位置被读取为 `const` 和 `in`，而 `True` 被读取为 `true`。

## 保留名称 [#reserved-names]

| 名称 | 位置 | 规则 |
| :-- | :-- | :-- |
| `__return` | `Function` / `GraphFunction` 参数名 | 任何情况下均保留；使用该名称的参数为 [`DSH6303`](/docs/plugin/diagnostics/dsh6xxx#dsh6303) |
| `return` | 所有位置 | 一个[保留字](#reserved-words)：它不能命名输出变量，也不是绑定源 *(自 2.0.0 起)* |
| `DS_…` *(自 1.9.0 起)* | 预处理器定义名称 | 整个 `DS_` **前缀**属于 DreamShader。此类名称的 `#define` 或 `#undef` 会以 [`DSH1039`](/docs/plugin/diagnostics/dsh1xxx#dsh1039) 失败；其他定义层级会发出警告并丢弃它。参见[预处理器](/docs/plugin/language/preprocessor#the-builtin-ds_-constants) |

`return` 在 `Function` 主体内是 HLSL。在声明了返回类型的函数中出现裸 `return;`
是 [`DSH6308`](/docs/plugin/diagnostics/dsh6xxx#dsh6308)。

## 标识符重写 [#identifier-rewrites]

在发出 HLSL 之前，会在 `Function` 和 `GraphFunction` 声明内重写标识符。
匹配不区分大小写且仅限完整标识符；字符串和注释内的文本保持不变，
而 `::` 限定的名称会绕过该表 — 它会被展平为 `<Namespace>_<Name>`。

| 书写形式 | 重写为 | 适用于 |
| :-- | :-- | :-- |
| `vec2` | `float2` | 参数与返回类型、正文文本 |
| `vec3` | `float3` | 参数与返回类型、正文文本 |
| `vec4` | `float4` | 参数与返回类型、正文文本 |
| `ivec2` | `int2` | 参数与返回类型、正文文本 |
| `ivec3` | `int3` | 参数与返回类型、正文文本 |
| `ivec4` | `int4` | 参数与返回类型、正文文本 |
| `uvec2` | `uint2` | 参数与返回类型、正文文本 |
| `uvec3` | `uint3` | 参数与返回类型、正文文本 |
| `uvec4` | `uint4` | 参数与返回类型、正文文本 |
| `bvec2` | `bool2` | 参数与返回类型、正文文本 |
| `bvec3` | `bool3` | 参数与返回类型、正文文本 |
| `bvec4` | `bool4` | 参数与返回类型、正文文本 |
| `mat2` | `float2x2` | 参数与返回类型、正文文本 |
| `mat3` | `float3x3` | 参数与返回类型、正文文本 |
| `mat4` | `float4x4` | 参数与返回类型、正文文本 |
| `mix` | `lerp` | 仅正文文本 |
| `fract` | `frac` | 仅正文文本 |
| `mod` | `fmod` | 仅正文文本 |

与此表中任何条目都不匹配的标记会原样输出。每个节中的类型标记都通过
[类型](/docs/language/types-and-values)上的同一个类型表读取，该表保存着相同的 GLSL 拼写。

## 诊断 [#diagnostics]

| 代码 | 触发条件 |
| :-- | :-- |
| `DSH2240` | 顶层文本不是块关键字或 `import` —— 包括拼写正确但大小写错误的关键字 |
| [`DSH2248`](/docs/plugin/diagnostics/dsh2xxx#dsh2248) | 在 `.dsm` / `.dsf` 的顶层使用了 2.0 语法 |
| [`DSH2242`](/docs/plugin/diagnostics/dsh2xxx#dsh2242) | 资源块头没有 `Name` 属性 |
| [`DSH6309`](/docs/plugin/diagnostics/dsh6xxx#dsh6309)、[`DSH6311`](/docs/plugin/diagnostics/dsh6xxx#dsh6311) | `Namespace` / `VirtualFunction` 没有名称，或名称不是标识符 |
| `DSH2250` | 文件中有第二个 `Shader` |
| `DSH2245` | 该块不接受的节名称 |
| `DSH2246`、`DSH2247` | `Code` 节；`VirtualFunction` 中的 `Graph` 或 `Code` 节 |
| [`DSH6310`](/docs/plugin/diagnostics/dsh6xxx#dsh6310) | `Namespace` 中除 `Function` 或 `GraphFunction` 之外的任何内容，包括嵌套的 `Namespace` |
| `DSH2251` | 警告：`MaterialLayer` / `MaterialLayerBlend` |
| `DSH2253` | 警告：`import` 使用了另一种大小写 |
| `DSH2258` | 警告：第二个 `Graph` 或 `Layout` 节 |
| `DSH6302`、`DSH6303`、`DSH6304`、`DSH6305`、`DSH6306`、`DSH6307`、`DSH6308` | 上文的 `Function` / `GraphFunction` 签名规则 |

完整列表见[诊断索引](/docs/diagnostics)。

## 示例 [#example]

所有关键字类都放在一个文件中。

```c
Namespace(Name="Common")
{
    Function float Luma(in vec3 color) {
        return dot(color, vec3(0.2126, 0.7152, 0.0722));   // vec3 -> float3 on emission
    }
}

Shader(Name="Materials/M_Keywords")
{
    Properties {
        Group("Look") {
            const vec3      Ambient = vec3(0.02, 0.02, 0.03);
            ScalarParameter Rough   = 0.5 [Group="Surface"; Slider(0, 1)];
        }
        TextureSampleParameter2D BaseTex = Path(Game, "Textures/T_Noise");
    }

    Settings {
        Domain       = "Surface";
        ShadingModel = "Unlit";
        BlendMode    = "Opaque";
    }

    Outputs {
        vec3 Color;
        Base.EmissiveColor = Color;
    }

    Graph {
        #Region "Sampling"
        vec2 UV  = UE.TexCoord(Index = 0);
        vec4 Tex = BaseTex(Coordinates = UV);
        #EndRegion

        Color = Tex.rgb * Common::Luma(Tex.rgb) + Ambient * Rough;
    }

    Layout {
        Comment(Name="Sampling", X=-1200, Y=-200, W=900, H=400);
        Node(Var="UV", X=-1100, Y=-120);
    }
}
```

## 另请参阅 [#see-also]

- [词法元素](/docs/language/lexical) —— 本索引背后的区分大小写矩阵和标记规则
- [源文件](/docs/language/file-model) —— 每种文件类型可以声明哪些块
- [类型](/docs/language/types-and-values) —— 每个类型标记及其在各上下文中的有效性
- [Shader](/docs/plugin/language/shader) · [ShaderFunction](/docs/plugin/language/shader-function) · [ShaderLayer](/docs/plugin/language/shader-layer) ·
  [VirtualFunction](/docs/plugin/language/virtual-function) · [Function](/docs/plugin/language/function) ·
  [GraphFunction](/docs/plugin/language/graph-function) · [Namespace](/docs/plugin/language/namespace) —— 各块页面
- [属性](/docs/parameters/properties) · [输入 / 输出](/docs/plugin/language/inputs-outputs) ·
  [输出绑定](/docs/plugin/language/output-bindings) · [选项](/docs/plugin/language/options) · [布局](/docs/language/layout) —— 各节页面
- [`import`](/docs/language/imports) · [预处理器](/docs/plugin/language/preprocessor) —— 不属于语法的指令
- [诊断索引](/docs/diagnostics) —— 所有代码
