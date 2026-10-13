---
title: "ShaderFunction"
description: "ShaderFunction"
---

# ShaderFunction

> [DreamShader](/en/docs/) » [DreamShaderLang](/en/docs/plugin/language) » **ShaderFunction**

A top-level block that declares one reusable Unreal material function: its typed input and output
pins, its function-local parameter nodes, and the node graph that connects them.

| | |
| :-- | :-- |
| Declared in | `.dsf` or `.dsm`, beside a `Shader` too; in a `.dsh` it is [`DSH2249`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2249) (see [Source files](/en/docs/language/file-model#how-the-restriction-is-enforced)) |
| Kind | top-level block |
| Generates | `UMaterialFunction` with `EMaterialFunctionUsage::Default` |
| Multiplicity | any number per file |

The legacy front end reads a `ShaderFunction` as an `export` function of the
[2.0 language](/en/docs/language-v2): its inputs are parameters, a first output named `Result` is
the return value, and the other outputs are `out` parameters. [`dsc migrate`](/en/docs/language-v2/migrate)
writes it that way.

## Synopsis

```c
ShaderFunction(Name = "<asset-path>" [, Root = "<root>"])
{
    [Properties            [=] { <property-declaration> ; … }]
    [Inputs                [=] { <parameter-declaration> ; … }]
    { Outputs | Results }  [=] { <parameter-declaration> ; … }
    Graph                  [=] { <graph-statement> … }
    [Settings              [=] { <key> = <value> ; … }]
    [Layout                [=] { { Node( … ) | Comment( … ) } ; … }]
}
```

A function needs at least one output ([`DSH4315`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4315)) and a `Graph`
that assigns its outputs. Sections may appear in any order and may be repeated. The `=` between a
section name and its `{ … }` block is optional sugar *(since 1.5.0)*; a `;` after a section's closing
`}` is optional.

The keyword `ShaderFunction` is matched **case-sensitively**; section names are matched
case-insensitively. See [Lexical elements](/en/docs/language/lexical#case-sensitivity).

## Header attributes

| Attribute | Required | Value | Effect |
| :-- | :-- | :-- | :-- |
| **`Name`** | yes | string | The asset's logical path. The last `/`-separated segment is the asset name; preceding segments become folders. |
| `Root` | no | string | The package root the folders hang off. Defaults to `/Game` when absent or empty. |

Attribute keys are matched case-insensitively (`name=` works). Values may be quoted or bare; a bare
value runs to the next `,` or `)` outside parentheses. A key written twice is a warning
([`DSH2244`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2244)) and the later value wins. A trailing comma
before `)` is accepted, as in 1.x *(2.0.0 – 2.1.0 refused it with
[`DSH2243`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2243))*. A missing or empty `Name` is
[`DSH2242`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2242).

Full `Name` / `Root` grammar, the accepted root spellings, and the resulting on-disk path are
specified in [Asset paths](/en/docs/generation/asset-paths).

## Sections

| Section | Accepted | Repeat behaviour | Reference |
| :-- | :-- | :-- | :-- |
| `Properties` | yes — function-local parameter, `const` and `UE.*` nodes | appends | [Properties](/en/docs/parameters/properties) |
| `Inputs` | yes — `UMaterialExpressionFunctionInput` pins | appends | [Inputs / Outputs / Results](/en/docs/plugin/language/inputs-outputs) |
| `Outputs` | yes — `UMaterialExpressionFunctionOutput` pins | appends | [Inputs / Outputs / Results](/en/docs/plugin/language/inputs-outputs) |
| `Results` | yes — alias for `Outputs`, no warning | appends | [Inputs / Outputs / Results](/en/docs/plugin/language/inputs-outputs) |
| `Settings` | yes — three keys are honoured, see [below](#generated-asset) | merges; a key written twice is a warning ([`DSH3262`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3262)) and the later value wins | [Function settings](/en/docs/plugin/settings/function) |
| `Graph` | yes | the later one wins, with a warning ([`DSH2258`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2258)) | [Graph](/en/docs/graph/overview) |
| `Layout` | yes | the later one replaces the earlier, with `DSH2258` | [Layout](/en/docs/language/layout) |
| `Code` | **no** — [`DSH2246`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2246) | — | — |
| anything else, `Options` included | **no** — [`DSH2245`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2245) | — | — |

The same body parser serves `ShaderFunction`, [`ShaderLayer` and
`ShaderLayerBlend`](/en/docs/plugin/language/shader-layer); the section table above is identical for all three.

## `Properties` versus `Inputs`

Both sections put something into the generated function, but they are different grammars producing
different nodes.

| | `Properties` | `Inputs` |
| :-- | :-- | :-- |
| Grammar | `[const] <type> <name> [= <default>] [[ … ]] ;` | `[opt] <type> <name> [= <default>] [[ … ]] ;` |
| Generates | a parameter node, a constant node, or a `UE.*` builtin node *inside* the function graph | a `UMaterialExpressionFunctionInput` pin on the function's interface |
| Visible to callers | as a material parameter on any material that uses the function | as a wired input pin |

*(since 2.0.0)* Both sections are read as words: the type and the name are one word each, whatever
whitespace separates them.

A property that the `Graph` never mentions produces no node in the generated asset *(since 1.3.2)*.

`Properties` in a `ShaderFunction` is *not* the same thing as `Properties` inside a
[`VirtualFunction`](/en/docs/plugin/language/virtual-function), where the keyword is a synonym for `Inputs`.

## Parameter types

`Inputs`, `Outputs` and `Results` accept these type tokens, matched case-insensitively. A type is one
word.

| Token(s) | Function pin type | Components |
| :-- | :-- | :-- |
| `StaticBool`, `StaticBoolParameter` | `FunctionInput_StaticBool` on an input (as an output it is read as `bool`) | 1 |
| `MaterialAttributes` | `FunctionInput_MaterialAttributes` | — |
| `Substrate` | `FunctionInput_Substrate` | — |
| `float`, `float1`, `half`, `half1`, `int`, `uint`, `bool` | `FunctionInput_Scalar` | 1 |
| `float2`, `half2`, `vec2`, `int2`, `uint2`, `bool2`, `ivec2`, `uvec2`, `bvec2` | `FunctionInput_Vector2` | 2 |
| `float3`, `half3`, `vec3`, `int3`, `uint3`, `bool3`, `ivec3`, `uvec3`, `bvec3` | `FunctionInput_Vector3` | 3 |
| `float4`, `half4`, `vec4`, `int4`, `uint4`, `bool4`, `ivec4`, `uvec4`, `bvec4` | `FunctionInput_Vector4` | 4 |
| `Texture2D` | `FunctionInput_Texture2D` | — |
| `TextureCube` | `FunctionInput_TextureCube` | — |
| `Texture2DArray` | `FunctionInput_Texture2DArray` | — |
| `Texture3D`, `VolumeTexture` | `FunctionInput_VolumeTexture` | — |

| Token | What happens |
| :-- | :-- |
| `SamplerState` | no function pin carries a sampler: [`DSH4364`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4364) *(since 2.0.0; 1.x made it a `Texture2D` input)* |
| `Material Attributes`, `float 4` — a type written as two words | the statement no longer reads as `<type> <name>`: [`DSH3271`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3271) *(since 2.0.0)* |
| a word that names no type | [`DSH4201`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4201) |

The pin type is looked up in the running engine's own list; a type the engine does not have (such as
`Substrate` on an engine without it) is [`DSH8228`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8228).

## Input defaults and `opt`

| Form | Effect |
| :-- | :-- |
| `<type> <name>;` | required input; the caller must supply it |
| `<type> <name> = <expr>;` | optional input whose default is `<expr>` *(since 2.0.0: a default makes an input optional — legacy rule L7; 1.x left the pin required)* |
| `opt <type> <name>;` | optional input (`bUsePreviewValueAsDefault = true`) with no preview value |
| `opt <type> <name> = <expr>;` *(since 1.2.3)* | optional input; `<expr>` is the value used when the pin is unconnected |

A default that folds to a constant is written into `PreviewValue`. Anything else is built as a graph
expression and connected to the input's `Preview` pin — which is how `opt Texture2D Tex = PreviewTex;`
referencing a generated `Properties` entry works *(since 1.2.6)*. A `StaticBool` input's default
becomes a `StaticBool` node on the `Preview` pin, because the engine ignores `PreviewValue` there. A
default whose type does not fit the input is reported as an assignment would be
([`DSH4226`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4226); a wider vector is cut down with
[`DSH5289`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5289)).

*(since 2.0.0)* `opt`, the type and the name are words: a tab between them is as good as a space.

## Per-parameter metadata

The trailing `[ … ]` block is accepted on `Inputs`, `Outputs` and `Results` declarations. Only these
keys have an effect; unlike `Properties`, no other key is reflected onto the generated node.

| Metadata key (case-insensitive) | Effect on the input/output node |
| :-- | :-- |
| `Description`, `Desc`, `Tooltip` | writes `Description` |
| `SortPriority`, `Sort` | orders the pins: a section's entries are stably sorted by it, an entry without one counting as its declaration index, and the asset gets dense priorities `0, 1, 2, …` in that order *(since 2.0.0)*. Not a whole number: [`DSH3258`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3258) |
| `Group`, `Category`, any other key | ignored, without a diagnostic — the engine's function input/output nodes have no group field |

A malformed block is [`DSH3255`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3255)–[`DSH3257`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3257).
Full metadata grammar, including the `Slider(min, max)` shorthand, is in
[Metadata](/en/docs/parameters/metadata).

## `Outputs`

The first output, when it is named exactly `Result`, is the function's return value: it starts at
zero and the `Graph` assigns it. Every other output is an `out` parameter the `Graph` has to assign.

| Rule | Code |
| :-- | :-- |
| at least one output must be declared | `DSH4315` |
| the `Graph` must assign each output other than a first `Result` | [`DSH6211`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6211) |
| the assigned value must fit the declared type | `DSH4226`; a wider vector is cut down with `DSH5289` |
| `opt` on an output | [`DSH3272`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3272) (warning; ignored) |
| `= <expression>` on an output | [`DSH3273`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3273) (warning; dropped) |

A `MaterialAttributes` output starts as an empty material, so member writes such as
`Attrs.BaseColor = …;` have a target. See [MaterialAttributes](/en/docs/plugin/graph/material-attributes).

> [!NOTE]
> An initializer on an output declaration (`vec3 OutColor = InColor;`) is dropped with `DSH3273` — a
> function output is only ever driven by the `Graph`. This is unlike a [`Shader`](/en/docs/plugin/language/shader)'s
> `Outputs`, where an initializer is meaningful.

## Generated asset

`Name` + `Root` resolve to a package path exactly as described in
[Asset paths](/en/docs/generation/asset-paths). The asset created there is a `UMaterialFunction` and its
`MaterialFunctionUsage` is set to `Default`.

When an asset already exists at that path it is reused only if its class is **exactly**
`UMaterialFunction`; a subclass such as `UMaterialFunctionMaterialLayer` is
[`DSH8110`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8110), an unrelated object
[`DSH8111`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8111). If the package exists on disk and the object carries
no DreamShader provenance metadata, generation refuses to touch it
([`DSH8112`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8112)). See [Regeneration](/en/docs/generation/regeneration).

The `Settings` keys are applied to the asset on every build, so removing a key from the source removes
it from the asset:

| Key | `UMaterialFunction` field | When absent |
| :-- | :-- | :-- |
| `Description` | `Description` | cleared |
| `ExposeToLibrary` | `bExposeToLibrary` — set only when it is `true` **and** `LibraryCategories` is not empty *(since 2.0.0)* | set to `false` |
| `LibraryCategories` | `LibraryCategoriesText` — comma-split, each entry trimmed, empty entries dropped | cleared |
| `UserExposedCaption` | **not applied** *(since 2.0.0)*: a warning ([`DSH3264`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3264)); the value is kept for `dsc migrate` | — |

`ExposeToLibrary` with a value other than `true` / `false` is a warning
([`DSH3265`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3265)) and counts as `false`. Every other key is a warning
([`DSH3263`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3263)) and is ignored — there is no generic
reflected-property path here, unlike [`Shader` settings](/en/docs/settings/material). See
[Function settings](/en/docs/plugin/settings/function).

### Input and output identity across regeneration

Before the old graph is cleared, the `Id` GUID of every `FunctionInput` and `FunctionOutput` is
cached by pin name and restored onto the newly created node *(since 1.3.2)*. Existing
`MaterialFunctionCall` nodes in hand-authored materials therefore keep their wiring across a
regeneration, **as long as the pin name is unchanged**. Renaming an input or output is equivalent to
deleting it and adding a new one: call sites lose that connection.

> [!WARNING]
> A rebuild replaces the function's graph. A function that no longer holds what DreamShader generated
> into it is not rebuilt ([`DSH8207`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8207)), and neither is one open in
> an asset editor ([`DSH8206`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8206)). See
> [Regeneration](/en/docs/generation/regeneration).

## Calling a ShaderFunction

Inside the `Graph` of another function block of the same file, the callee name is the asset's leaf,
as an identifier: `F_Tint` for `Name="Functions/F_Tint"`. A call that matches it only in case
resolves when the match is unique, with [`DSH5275`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5275). When a
function the file can call already has that name — a `Function` from an imported header, say — the
block's function is declared under another one (`<Leaf>_Asset`, with
[`DSH5290`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5290)), the asset keeps its name, and the call reaches the
other function.

A `Shader` calls a `ShaderFunction` of its own `.dsm` by name, like any function of the file; the
function's asset is built first. *(2.0.0 – 2.1.0 refused the two in one file with
[`DSH6201`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6201).)* An asset block cannot be imported (`DSH2249`), so any
other file reaches the generated asset through a [`VirtualFunction`](/en/docs/plugin/language/virtual-function).

```c
// ShaderFunction(Name="Functions/F_Tint") declared elsewhere in the same .dsf:
vec3 Tinted = F_Tint(BaseColor, Tint);          // single-output call as a value  (since 1.5.0)
F_Tint(BaseColor, Tint, OutColor, OutLuma);     // statement call: inputs, then one target per output
```

Argument rules, `default` arguments and the named-argument form are specified in
[Calls](/en/docs/graph/calls).

## Notes

- **One compile of a file builds every asset it declares.** A `.dsm` or `.dsf` may declare any number
  of `ShaderFunction`, `ShaderLayer`, `ShaderLayerBlend`, `VirtualFunction`, `Function`,
  `GraphFunction` and `Namespace` blocks, and a `.dsm` one `Shader` beside them *(2.0.0 – 2.1.0
  refused a `Shader` beside a function or layer with `DSH6201`)*. A `.dss` makes a material or
  function assets, not both, so [`dsc migrate`](/en/docs/language-v2/migrate) wants the functions moved to a
  `.dsf` first. See [Source files](/en/docs/language/file-model).
- **The file-kind restriction is a parse, decided per block** *(since 2.0.0)*. A `.dsh` holding a
  `ShaderFunction` block is `DSH2249`; a comment or a string that mentions `ShaderFunction(` is fine.
- A file that declares only functions needs no `Shader` block; each built function adds a
  `Generated <Kind> <AssetPath> from <SourceFile>.` line to the compile output (`<Kind>` is
  `MaterialFunction` here).
- Regeneration is skipped when the source hash is unchanged **and** the asset's
  `MaterialFunctionUsage` already matches the block kind; the compile output then says
  `Skipped <AssetPath> from <SourceFile>; …` for it, as for a material. See
  [Caching](/en/docs/plugin/generation/caching).
- `Layout` is accepted and applies to the function's own graph.
- The `Code` section is rejected outright (`DSH2246`).

## Diagnostics

Each code carries the line and column of the construct; the code's page has the message.

### Parse time

| Code | Raised when |
| :-- | :-- |
| `DSH2249` | the block is in a `.dsh` header |
| [`DSH2241`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2241) | no `(` after `ShaderFunction` |
| `DSH2243` | a malformed attribute list |
| `DSH2244` | an attribute written twice (warning) |
| `DSH2242` | no `Name`, or an empty one |
| [`DSH2257`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2257) | no `{` after the header, or a section without its name or its `{` |
| `DSH2245` | an unknown section |
| `DSH2246` | a `Code` section |
| `DSH2258` | a second `Graph` or `Layout` (warning) |
| `DSH3271` | an `Inputs` / `Outputs` / `Results` statement that is not `[opt] <type> <name> [= <default>] [[ … ]] ;` |
| `DSH3272`, `DSH3273` | `opt` / a default on an output (warnings) |
| `DSH3255`–`DSH3258` | a malformed metadata block |
| [`DSH3261`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3261), `DSH3262` | a malformed `Settings` statement / a key written twice (warning) |
| `DSH3263`, `DSH3264`, `DSH3265` | an ignored setting, `UserExposedCaption`, a non-boolean `ExposeToLibrary` (warnings) |
| [`DSH2150`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2150) | the body is never closed |

Errors inside `Properties`, `Graph` and `Layout` are listed on [Properties](/en/docs/parameters/properties),
[Graph](/en/docs/graph/overview) and [Layout](/en/docs/language/layout).

### Binding and IR

| Code | Raised when |
| :-- | :-- |
| `DSH4201` | a type token names no type |
| [`DSH4214`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4214) | two inputs or outputs share a name |
| `DSH6211` | the `Graph` never assigns an output |
| `DSH4226`, `DSH5289` | a value does not fit an output or a default does not fit its input / a wider vector is cut down (info) |
| `DSH4315` | the function has no output |
| `DSH4364` | an input type no function pin carries |
| `DSH5290` | the block's name is taken by a function the file can call, so its function is renamed (info) |

### Emit time

| Code | Raised when |
| :-- | :-- |
| `DSH8110`, `DSH8111`, `DSH8112` | an asset of another class, an unrelated object, or an asset DreamShader did not generate is at the target path |
| [`DSH8113`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8113), [`DSH8114`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8114) | the package or the function could not be created |
| [`DSH8098`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8098)–[`DSH8100`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8100) | `Name` resolves to an empty or invalid asset name |
| `DSH8206`, `DSH8207` | the asset is open in an editor, or was edited since it was generated |
| `DSH8228` | the engine has no function input type of that name |
| [`DSH8214`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8214) | a `FunctionInput` / `FunctionOutput` node could not be created |

The complete cross-stage list lives in the [diagnostics index](/en/docs/diagnostics).

## Example

```c
ShaderFunction(Name="Functions/F_Tint", Root="Game")
{
    Properties = {
        Group("Tint") {
            float Boost = 1.0 [Slider(0, 4); Description="Extra gain applied after tinting"];
        }
        const float Epsilon = 0.001;
    }

    Inputs = {
        vec3  InColor;
        vec3  InTint                [Description="Multiplied with InColor"];
        opt float Strength = 1.0    [Description="Blend amount"; SortPriority=10];
    }

    Outputs = {
        vec3  OutColor              [Description="Tinted colour"];
        float OutLuma;
    }

    Settings = {
        Description        = "Tint helper";
        ExposeToLibrary    = true;
        LibraryCategories  = "DreamShader, Color";
    }

    Graph = {
        vec3 Tinted = InColor * InTint * Boost;
        OutColor    = lerp(InColor, Tinted, Strength);
        OutLuma     = dot(OutColor, vec3(0.2126, 0.7152, 0.0722)) + Epsilon;
    }
}
```

Generated asset:

```text
package     /Game/Functions/F_Tint
object path /Game/Functions/F_Tint.F_Tint
class       UMaterialFunction   (usage: Default)
on disk     <Project>/Content/Functions/F_Tint.uasset      (persist mode only)

interface   in  InColor   Vector3
            in  InTint    Vector3
            in  Strength  Scalar     (optional, preview 1.0; SortPriority=10 keeps it last)
            out OutColor  Vector3
            out OutLuma   Scalar
parameters  Boost         ScalarParameter, group "Tint", slider 0..4
```

## See also

- [Source files](/en/docs/language/file-model) — which block kinds each of `.dsm` / `.dsh` / `.dsf` may contain
- [Shader](/en/docs/plugin/language/shader) — the `UMaterial`-producing top-level block
- [ShaderLayer / ShaderLayerBlend](/en/docs/plugin/language/shader-layer) — the material-layer variants of this block
- [VirtualFunction](/en/docs/plugin/language/virtual-function) — declaring an existing `UMaterialFunction` instead of generating one
- [Properties](/en/docs/parameters/properties) — the `Properties` section grammar, `Group(…)` scopes and `const`
- [Inputs / Outputs / Results](/en/docs/plugin/language/inputs-outputs) — the typed-parameter grammar in full
- [Metadata](/en/docs/parameters/metadata) — the `[ … ]` block, `Slider(…)` and reflected passthrough
- [Types](/en/docs/language/types-and-values) — the complete type-token catalogue and per-context validity matrix
- [Layout](/en/docs/language/layout) — `Node` / `Comment` placement directives and `#Region`
- [Graph](/en/docs/graph/overview) — the statement/expression language inside `Graph`
- [Calls](/en/docs/graph/calls) — calling functions from a `Graph`, argument forms, `default`
- [Function settings](/en/docs/plugin/settings/function) — the keys a material-function `Settings` honours
- [Asset paths](/en/docs/generation/asset-paths) — `Name=` + `Root=` → package path
- [Regeneration](/en/docs/generation/regeneration) — what survives a rebuild and what does not
- [Caching](/en/docs/plugin/generation/caching) — the source-hash skip
- [Diagnostics index](/en/docs/diagnostics) — every code, by stage
