---
title: "ShaderLayer / ShaderLayerBlend"
description: "ShaderLayer / ShaderLayerBlend"
---

# ShaderLayer / ShaderLayerBlend

> [DreamShader](/en/docs/) » [DreamShaderLang](/en/docs/plugin/language) » **ShaderLayer / ShaderLayerBlend**

Two top-level blocks that declare Unreal's material-layer function assets: a layer, which produces one
`MaterialAttributes` value, and a layer blend, which combines two of them.

| | |
| :-- | :-- |
| Declared in | `.dsf` or `.dsm`, beside a `Shader` too; in a `.dsh` either one is [`DSH2249`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2249) (see [Source files](/en/docs/language/file-model#how-the-restriction-is-enforced)) |
| Kind | top-level block |
| Generates | `UMaterialFunctionMaterialLayer` (`ShaderLayer`) / `UMaterialFunctionMaterialLayerBlend` (`ShaderLayerBlend`) |
| Multiplicity | any number per file |
| Since | `1.3.0` |

The legacy front end reads a `ShaderLayer` as a 2.0 `/// @layer export void L(inout material m)` and a
`ShaderLayerBlend` as `/// @layerblend export void B(material …, inout material Result)`; see
[the 2.0 language](/en/docs/language-v2) and [`dsc migrate`](/en/docs/language-v2/migrate).

## Synopsis

```c
ShaderLayer(Name = "<asset-path>" [, Root = "<root>"])
{
    [Properties            [=] { <property-declaration> ; … }]
    [Inputs                [=] { MaterialAttributes <name> ; }]
    { Outputs | Results }  [=] { MaterialAttributes <name> ; }
    Graph                  [=] { <graph-statement> … }
    [Settings              [=] { <key> = <value> ; … }]
    [Layout                [=] { { Node( … ) | Comment( … ) } ; … }]
}
```

```c
ShaderLayerBlend(Name = "<asset-path>" [, Root = "<root>"])
{
    [Properties            [=] { <property-declaration> ; … }]
    Inputs                 [=] { MaterialAttributes <name> ; MaterialAttributes <name> ; }
    { Outputs | Results }  [=] { MaterialAttributes <name> ; }
    Graph                  [=] { <graph-statement> … }
    [Settings              [=] { <key> = <value> ; … }]
    [Layout                [=] { { Node( … ) | Comment( … ) } ; … }]
}
```

The `=` between a section name and its `{ … }` block is optional sugar *(since 1.5.0)*; a `;` after a
section's closing `}` is optional. Sections may appear in any order and may be repeated.

Both keywords are matched **case-sensitively**, as whole words; section names are matched
case-insensitively.

## Header attributes

| Attribute | Required | Value | Effect |
| :-- | :-- | :-- | :-- |
| **`Name`** | yes | string | The asset's logical path. The last `/`-separated segment is the asset name; preceding segments become folders. |
| `Root` | no | string | The package root the folders hang off. Defaults to `/Game` when absent or empty. |

Attribute keys are matched case-insensitively. Values may be quoted or bare; a bare value runs to the
next `,` or `)` outside parentheses. A key written twice is a warning
([`DSH2244`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2244)) and the later value wins. A trailing comma
before `)` is accepted, as in 1.x *(2.0.0 – 2.1.0 refused it with
[`DSH2243`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2243))*. See
[Asset paths](/en/docs/generation/asset-paths).

## Sections

Both blocks share the [`ShaderFunction`](/en/docs/plugin/language/shader-function#sections) body parser, so the section
table is identical.

| Section | Accepted | Repeat behaviour | Reference |
| :-- | :-- | :-- | :-- |
| `Properties` | yes — function-local parameter, `const` and `UE.*` nodes; this is where layer controls belong | appends | [Properties](/en/docs/parameters/properties) |
| `Inputs` | yes — constrained, see below | appends | [Inputs / Outputs / Results](/en/docs/plugin/language/inputs-outputs) |
| `Outputs` | yes — one `MaterialAttributes` output | appends | [Inputs / Outputs / Results](/en/docs/plugin/language/inputs-outputs) |
| `Results` | yes — alias for `Outputs`, no warning | appends | [Inputs / Outputs / Results](/en/docs/plugin/language/inputs-outputs) |
| `Settings` | yes — the keys a `ShaderFunction` honours | merges; a key written twice is a warning ([`DSH3262`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3262)) | [Function settings](/en/docs/plugin/settings/function) |
| `Graph` | yes | the later one wins, with a warning ([`DSH2258`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2258)) | [Graph](/en/docs/graph/overview) |
| `Layout` | yes | the later one replaces the earlier, with `DSH2258` | [Layout](/en/docs/language/layout) |
| `Code` | **no** — [`DSH2246`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2246) | — | — |
| anything else, `Options` included | **no** — [`DSH2245`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2245) | — | — |

## Interface rules

These are the rules that distinguish a layer or blend from a plain
[`ShaderFunction`](/en/docs/plugin/language/shader-function). *(since 2.0.0)* They are the 2.0 signature rules of `@layer`
and `@layerblend`, checked when the file is bound.

| # | Applies to | Rule | Code |
| :-- | :-- | :-- | :-- |
| 1 | both | a `MaterialAttributes` output is declared | [`DSH3278`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3278) |
| 2 | `ShaderLayer` | the material is all there is: any input that is not `MaterialAttributes`, and any output besides the material, breaks the signature | [`DSH6204`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6204) |
| 3 | `ShaderLayerBlend` | at least one `MaterialAttributes` input, and no output besides the material | [`DSH6205`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6205) |

A layer's material flows through it: *(since 2.0.0)* the layer always has exactly one
`MaterialAttributes` input, named after its output — also when the 1.x block declared no input at
all. A 1.x `MaterialAttributes` input with another name becomes that input, and the pin changes its
name with a warning ([`DSH3277`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3277)); the body still reads it under
its 1.x name. The input is optional only when the 1.x input was declared `opt`.

A blend's output starts empty, and each of its inputs is a pin of its own. The binder takes any number
of `MaterialAttributes` inputs from one up; the engine's layer stack blends exactly two.

`MaterialAttributes` is one word, matched ignoring case; `Material Attributes` with a space is
[`DSH3271`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3271) *(since 2.0.0)*. A missing `Graph` is not reported.

> [!NOTE]
> Scalars, vectors and textures cannot be layer inputs — rule 2 rejects them. Expose them through
> `Properties` instead: they become parameter nodes inside the generated function and appear on the
> layer stack's parameter panel. Do the same for blend controls.

## Blend input relevance *(since UE 5.7)*

On UE 5.7 and newer, each `MaterialAttributes` input of a `ShaderLayerBlend` gets a
`BlendInputRelevance` derived from its declared name. The name is normalized by removing spaces, `_`
and `-`, then compared case-insensitively.

| Normalized input name | `BlendInputRelevance` |
| :-- | :-- |
| `Top`, `TopLayer` | `Top` |
| `Bottom`, `BottomLayer`, `Base`, `BaseLayer` | `Bottom` |
| anything else — the first `MaterialAttributes` input | `Bottom` |
| anything else — a later `MaterialAttributes` input | `Top` |

Inputs of a `ShaderLayer`, and any non-`MaterialAttributes` input, get no relevance and keep the
engine's `General`. On UE 5.3 – 5.6 the property does not exist and nothing is written.

## Generated asset

`Name` + `Root` resolve to a package path exactly as described in
[Asset paths](/en/docs/generation/asset-paths).

| Block | UClass created | `EMaterialFunctionUsage` |
| :-- | :-- | :-- |
| `ShaderLayer` | `UMaterialFunctionMaterialLayer` | `MaterialLayer` |
| `ShaderLayerBlend` | `UMaterialFunctionMaterialLayerBlend` | `MaterialLayerBlend` |

When an asset already exists at the target path it is reused if it **is a** subclass of the expected
class; the exact-class rule that applies to [`ShaderFunction`](/en/docs/plugin/language/shader-function) is relaxed here.
Switching a block between `ShaderFunction` and `ShaderLayer` without moving or deleting the existing
asset therefore fails with [`DSH8110`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8110).

Everything else about generation — the honoured `Settings` keys, lazy property-node creation,
input/output `Id` preservation across regeneration, the source-hash skip, and what stops a rebuild —
is identical to [`ShaderFunction`](/en/docs/plugin/language/shader-function#generated-asset).

A blend's `MaterialAttributes` output starts as an empty material. A layer's starts as the material
that came in through its input — or empty, when the 1.x input had another name (see
[Interface rules](#interface-rules)). Either way member writes such as `Attrs.BaseColor = …;` are
legal in the `Graph`. See [MaterialAttributes](/en/docs/plugin/graph/material-attributes).

## Deprecated spellings

> [!WARNING]
> `MaterialLayer(...)` and `MaterialLayerBlend(...)` are **deprecated since 1.3.0**. Both still parse
> and generate exactly the same assets as their modern spellings, and each is a warning
> ([`DSH2251`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2251)). Use `ShaderLayer` / `ShaderLayerBlend` in new code.

| Deprecated spelling | Replacement | Behaves as |
| :-- | :-- | :-- |
| `MaterialLayer(Name = …)` | `ShaderLayer(Name = …)` | identical: same sections, same rules, same asset |
| `MaterialLayerBlend(Name = …)` | `ShaderLayerBlend(Name = …)` | identical |

A missing `Name` ([`DSH2242`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2242)) names the spelling the author
actually typed.

## Notes

- **One compile of a file builds every asset it declares**: every layer, blend and `ShaderFunction`
  of a `.dsm` or `.dsf`, and the `Shader` of a `.dsm` *(2.0.0 – 2.1.0 refused a `Shader` beside a layer
  or blend with `DSH6201`)*. See [Source files](/en/docs/language/file-model).
- **The file-kind restriction is a parse, decided per block** *(since 2.0.0)*. A `.dsh` holding any of
  the four spellings is `DSH2249`; a comment or a string that mentions `ShaderLayer(` is fine.
- The consumer of a layer or blend is Unreal's material layer stack on a material or material
  instance. *(since 2.0.0)* Neither can be called from a `Graph`:
  [`DSH6208`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6208).
- The `Code` section is rejected outright (`DSH2246`); use `Graph`.

## Diagnostics

Each code carries the line and column of the construct; the code's page has the message. The
parse-time codes of the shared body parser — attributes, sections, parameter statements, metadata,
`Settings` — are listed on [`ShaderFunction` § Diagnostics](/en/docs/plugin/language/shader-function#diagnostics).

| Code | Raised when |
| :-- | :-- |
| `DSH2251` | `MaterialLayer` or `MaterialLayerBlend` (warning) |
| `DSH2242` | no `Name`, or an empty one |
| `DSH3278` | no `MaterialAttributes` output |
| `DSH3277` | the layer's `MaterialAttributes` input is renamed after the output (warning) |
| `DSH6204` | a `ShaderLayer` with any other input or output |
| `DSH6205` | a `ShaderLayerBlend` without a `MaterialAttributes` input, or with another output |
| `DSH6208` | a `Graph` calls a layer or blend |
| `DSH8110` | an asset of an incompatible class is at the target path |

The emit-time codes for the asset itself — [`DSH8111`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8111),
[`DSH8112`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8112), [`DSH8114`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8114),
[`DSH8206`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8206), [`DSH8207`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8207) — are
a `ShaderFunction`'s.

On success the compile output has a `Generated <Kind> <AssetPath> from <SourceFile>.` line, `<Kind>`
being `MaterialLayer` or `MaterialLayerBlend`.

The complete cross-stage list lives in the [diagnostics index](/en/docs/diagnostics).

## Example

```c
ShaderLayer(Name="Layers/L_Rust", Root="Game")
{
    Properties = {
        Group("Rust") {
            vec3  RustColor = vec3(0.35, 0.13, 0.05) [Description="Base colour of the rust"];
            float RustRough = 0.85                   [Slider(0, 1)];
        }
    }

    Outputs = {
        MaterialAttributes Attrs;
    }

    Graph = {
        Attrs.BaseColor = RustColor;
        Attrs.Roughness = RustRough;
        Attrs.Metallic  = 0.0;
    }
}

ShaderLayerBlend(Name="Layers/LB_Wear", Root="Game")
{
    Properties = {
        float WearAmount = 0.5 [Slider(0, 1); Description="0 keeps Bottom, 1 keeps Top"];
    }

    Inputs = {
        MaterialAttributes Bottom;
        MaterialAttributes Top;
    }

    Outputs = {
        MaterialAttributes Attrs;
    }

    Graph = {
        Attrs.BaseColor = lerp(Bottom.BaseColor, Top.BaseColor, WearAmount);
        Attrs.Roughness = lerp(Bottom.Roughness, Top.Roughness, WearAmount);
        Attrs.Normal    = lerp(Bottom.Normal,    Top.Normal,    WearAmount);
    }
}
```

Generated assets:

```text
package     /Game/Layers/L_Rust
object path /Game/Layers/L_Rust.L_Rust
class       UMaterialFunctionMaterialLayer        (usage: MaterialLayer)
            in  Attrs   MaterialAttributes   (the material the layer is applied to; required, no `opt` input in the source)
            out Attrs   MaterialAttributes

package     /Game/Layers/LB_Wear
object path /Game/Layers/LB_Wear.LB_Wear
class       UMaterialFunctionMaterialLayerBlend   (usage: MaterialLayerBlend)
            in  Bottom  MaterialAttributes   (BlendInputRelevance: Bottom, UE 5.7+)
            in  Top     MaterialAttributes   (BlendInputRelevance: Top,    UE 5.7+)
            out Attrs   MaterialAttributes
parameters  WearAmount  ScalarParameter, slider 0..1
```

## See also

- [ShaderFunction](/en/docs/plugin/language/shader-function) — the plain `UMaterialFunction` block these two specialize
- [Shader](/en/docs/plugin/language/shader) — the `UMaterial`-producing top-level block
- [VirtualFunction](/en/docs/plugin/language/virtual-function) — declaring an existing `UMaterialFunction` instead of generating one
- [Source files](/en/docs/language/file-model) — which block kinds each of `.dsm` / `.dsh` / `.dsf` may contain
- [Keywords](/en/docs/plugin/language/keywords) — the complete keyword index, including deprecated spellings
- [Properties](/en/docs/parameters/properties) — the `Properties` section grammar, `Group(…)` scopes and `const`
- [Inputs / Outputs / Results](/en/docs/plugin/language/inputs-outputs) — the typed-parameter grammar in full
- [MaterialAttributes](/en/docs/plugin/graph/material-attributes) — the value type these blocks are built around
- [Function settings](/en/docs/plugin/settings/function) — the keys a material-function `Settings` honours
- [Asset paths](/en/docs/generation/asset-paths) — `Name=` + `Root=` → package path
- [Regeneration](/en/docs/generation/regeneration) — what survives a rebuild and what does not
- [Diagnostics index](/en/docs/diagnostics) — every code, by stage
