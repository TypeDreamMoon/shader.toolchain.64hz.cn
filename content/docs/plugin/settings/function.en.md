---
title: "Function settings"
description: "Function settings"
---

# Function settings

> [DreamShader](/en/docs/) » [Settings](/en/docs/plugin/settings) » **Function settings**

The `Settings` section of a [`ShaderFunction`](/en/docs/plugin/language/shader-function),
[`ShaderLayer` or `ShaderLayerBlend`](/en/docs/plugin/language/shader-layer) block: four keys that describe the
generated `UMaterialFunction` to the Material Function Library.

| | |
| :-- | :-- |
| Declared in | `.dsm`, `.dsf` — inside `ShaderFunction`, `ShaderLayer` or `ShaderLayerBlend` |
| Kind | section |
| Generates | property writes on the generated `UMaterialFunction`, `UMaterialFunctionMaterialLayer` or `UMaterialFunctionMaterialLayerBlend` |

## Synopsis

```c
ShaderFunction(Name = "<asset-path>")
{
    Settings [=] {
        [Description       = <text>;]
        [UserExposedCaption = <text>;]
        [ExposeToLibrary   = { true | false };]
        [LibraryCategories = "<category>[, <category>]…";]
    }
}
```

The same section is accepted, with the same four keys, in `ShaderLayer`, `ShaderLayerBlend` and their
deprecated `MaterialLayer` / `MaterialLayerBlend` spellings. In 2.0 the keys are the `/// @desc` and
`/// @library` directives of the exported function — see [The 2.0 language](/en/docs/language-v2).

## Keys

Keys are matched ignoring case, so `description`, `Description` and `DESCRIPTION` are the same key.
Underscores are **not** folded here — `Expose_To_Library` is not `ExposeToLibrary`.

| Key | Sets | Value grammar | Value when the key is absent |
| :-- | :-- | :-- | :-- |
| **`Description`** | `UMaterialFunction::Description` | free text | cleared to the empty string |
| **`UserExposedCaption`** | nothing *(since 2.0.0)*: [`DSH3264`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3264) warns that it is not applied, and the asset's caption is left as it is | free text | — |
| **`ExposeToLibrary`** | `UMaterialFunction::bExposeToLibrary`, together with `LibraryCategories` | `true` / `false`, case-insensitive; any other value is a [`DSH3265`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3265) warning and the setting is ignored | `false` |
| **`LibraryCategories`** | `UMaterialFunction::LibraryCategoriesText`, together with `ExposeToLibrary` | a comma-separated list; each entry is trimmed and empty entries are dropped | the category list is cleared |

*(since 2.0.0)* `ExposeToLibrary` and `LibraryCategories` act as one setting, the 2.0
`/// @library <categories>`: the function is exposed, under those categories, when `ExposeToLibrary`
is `true` **and** `LibraryCategories` is not empty. `ExposeToLibrary = true;` alone leaves the function
out of the library, and `LibraryCategories` without `ExposeToLibrary = true;` is dropped.

`LibraryCategories` clears the list before parsing, so the setting always replaces the asset's
categories rather than appending to them. `LibraryCategories = "A,,  B ,";` yields exactly `A` and
`B`.

Quotes are optional on every value, as everywhere in a `Settings` block:
`Description = Tint helper;` and `Description = "Tint helper";` are identical.

> [!NOTE]
> **Every key here is reset when the key is absent.** Omitting `ExposeToLibrary` sets it to `false`;
> omitting `Description` empties it. A property edited by hand on the generated asset is discarded on
> the next regeneration — except the caption, which 2.0 does not write at all. See
> [Regeneration](/en/docs/generation/regeneration).

> [!WARNING]
> **Any other key is ignored**, with a [`DSH3263`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3263) warning
> *(since 2.0.0; 1.x said nothing)*. Only these four names are looked up: `Backend`, `Domain`,
> `ShadingModel`, `BlendMode`, `TwoSided` and every other [`Shader` setting](/en/docs/settings/material) do
> **nothing** in a `ShaderFunction` block, and a misspelling of one of the four — `Descriptions`,
> `Expose_To_Library`, `LibraryCategory` — is the same warning.

> [!WARNING]
> The [decompiler](/en/docs/tools/decompiler) does not emit a `Settings` block when exporting a
> `UMaterialFunction` to `.dsf`. `Description`, `UserExposedCaption`, `ExposeToLibrary` and
> `LibraryCategories` are lost on that round trip and must be re-added by hand.

## Related validation

These checks are the diagnostics a `Settings` mistake is most often confused with.

| Rule | Code |
| :-- | :-- |
| A material function produces at least one output | [`DSH4315`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4315) |
| A `ShaderLayer` or `ShaderLayerBlend` has a `MaterialAttributes` output | [`DSH3278`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3278) |
| A `ShaderLayer` has that material as its only input and output | [`DSH6204`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6204) |
| A `ShaderLayerBlend` has, besides the material output, inputs only — at least one of them `MaterialAttributes` | [`DSH6205`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6205) |
| The body section is `Graph`, not `Code` | [`DSH2246`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2246) |
| Two properties of the file do not share a name | [`DSH4210`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4210) |

The generated asset's usage follows the block kind: `ShaderFunction` produces an ordinary material
function, `ShaderLayer` a material-layer function, `ShaderLayerBlend` a layer-blend function.

## Notes

- A [`VirtualFunction`](/en/docs/plugin/language/virtual-function) block also accepts a section named
  `Settings`, but it is a synonym for `Options` and takes an entirely different key set — `Asset` and
  `Description`. See [Options](/en/docs/plugin/language/options).
- [`Function`](/en/docs/plugin/language/function) and [`GraphFunction`](/en/docs/plugin/language/graph-function) blocks
  have no `Settings` section at all; their only sections are `Inputs` / `Properties`,
  `Outputs` / `Results` and `Code` / `Graph`.
- Multiple `Settings` sections in one block merge, last key wins, with a
  [`DSH3262`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3262) warning, exactly as in a `Shader` block. See
  [Settings](/en/docs/plugin/settings#how-a-statement-is-parsed).
- `ExposeToLibrary = true;` with a `LibraryCategories` is what makes the function appear in the
  Material palette's function library; the categories decide where in that palette it sits.

## Diagnostics

| Code | Raised when |
| :-- | :-- |
| `DSH3265` | the `ExposeToLibrary` value is not a boolean literal (warning; the setting is ignored) |
| `DSH3264` | `UserExposedCaption` is set (warning; not applied) |
| `DSH3263` | a key other than the four (warning; ignored) |
| `DSH3262` | a key written twice (warning; the later value wins) |
| `DSH4315` | the block produces no output |
| `DSH3278` | a layer or blend has no `MaterialAttributes` output |
| `DSH6204` / `DSH6205` | a layer's / a blend's parameters do not fit its kind |
| [`DSH2245`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2245) | a section name other than the recognized ones |

`Description` and `LibraryCategories` have no failure mode: any text is accepted.

## Example

```c
ShaderFunction(Name="Functions/F_Tint", Root="Game")
{
    Inputs = {
        vec3 InColor;
        vec3 InTint;
    }

    Outputs = {
        vec3 OutColor;
    }

    Settings = {
        Description        = "Multiplies a colour by a tint.";
        UserExposedCaption = "Tint";
        ExposeToLibrary    = true;
        LibraryCategories  = "DreamShader, Color";
    }

    Graph = {
        OutColor = InColor * InTint;
    }
}
```

Generated asset:

```text
package  /Game/Functions/F_Tint                     UMaterialFunction
  Description           = "Multiplies a colour by a tint."
  bExposeToLibrary      = true
  LibraryCategoriesText = ["DreamShader", "Color"]
```

`UserExposedCaption` is reported with `DSH3264` and not applied.

## See also

- [Settings](/en/docs/plugin/settings) — the block grammar and key normalization shared by every block kind
- [Shader settings](/en/docs/settings/material) — the very different key surface of a `Shader` block
- [ShaderFunction](/en/docs/plugin/language/shader-function) — the enclosing block
- [ShaderLayer / ShaderLayerBlend](/en/docs/plugin/language/shader-layer) — the layer block kinds and their arity rules
- [VirtualFunction](/en/docs/plugin/language/virtual-function) — declaring an existing `UMaterialFunction`
- [Options](/en/docs/plugin/language/options) — the `VirtualFunction` key set
- [Inputs / Outputs / Results](/en/docs/plugin/language/inputs-outputs) — the parameter sections a function declares
- [Decompiler](/en/docs/tools/decompiler) — the material-function round-trip gap
- [Regeneration](/en/docs/generation/regeneration) — what a rebuild resets
- [Diagnostics index](/en/docs/diagnostics) — every code
