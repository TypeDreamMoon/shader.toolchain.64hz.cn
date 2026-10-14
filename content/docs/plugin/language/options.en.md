---
title: "Options"
description: "Options"
---

# Options

> [DreamShader](/en/docs/) » [DreamShaderLang](/en/docs/plugin/language) » **Options**

The section of a `VirtualFunction` block that names the existing `UMaterialFunction` asset the
declaration stands for.

| | |
| :-- | :-- |
| Declared in | `.dsh`, `.dsf`, `.dsm` — inside a `VirtualFunction` block only |
| Kind | section |
| Generates | nothing — a `VirtualFunction` declares an asset, it does not create one |
| Since | `1.2.0` |

In 2.0 the same declaration is an `extern` prototype with `/// @asset` — see
[DreamShaderLang 2.0](/en/docs/language-v2); [`dsc migrate`](/en/docs/language-v2/migrate) rewrites a
`VirtualFunction` that way.

## Synopsis

```c
{ Options | Settings } [=]
{
    Asset = <asset-reference> ;
    [ <key> = <value> ; ]…
}
```

```c
asset-reference := Path( <root> , "<relative-path>" )
                 | Path( "<absolute-object-path>" )
                 | "<absolute-object-path>"
                 | <absolute-object-path>
```

`Options` and `Settings` are accepted interchangeably as the section keyword; both read into the same
list. Section names are matched case-insensitively, the `=` before `{ … }` is optional
*(since 1.5.0)*, and a repeated section merges into the same list.

## Keys

| Key | Required | Value | Effect |
| :-- | :-- | :-- | :-- |
| **`Asset`** | yes, unless `VirtualFunction(Asset="…")` was given | asset reference | The `UMaterialFunction` a `Graph` call to this name resolves to. |
| `Description` | no | string | Kept as the declaration's description. |
| *any other key* | — | any | **Read and ignored**, with no diagnostic. |

> [!NOTE]
> The [VirtualFunction sync service](/en/docs/plugin/tools/virtual-function-tools) writes a `Description` key
> alongside `Asset` when it generates or refreshes a declaration.

### Precedence

The block attribute wins over the section:

```c
VirtualFunction(Name="BufferWriter", Asset=Path(Game, "MaterialFunctions/F_BufferWriter"))
{
    Options = { Asset = Path(Game, "Ignored"); }   // not consulted — the attribute was present
    Outputs = { float3 Result; }
}
```

`Options.Asset` is read **only** when the `Asset` attribute is absent or empty after trimming.

## Statement grammar

Identical to the [`Settings`](/en/docs/plugin/settings) grammar.

| Rule | Detail |
| :-- | :-- |
| Statement form | `<Key> = <Value> ;` — a key that is not a word, a missing `=` or a missing value is [`DSH3261`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3261) |
| Value | every token up to the `;` outside brackets, so `Asset = Path(Game, "A/B")` is one value |
| Key matching | case-insensitive; the key is kept as written |
| Value handling | a single quoted string is its text, escapes resolved; anything else is the text of its tokens |
| Duplicate key | the later statement wins, with the warning [`DSH3262`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3262) *(since 2.0.0; 1.x overwrote silently)* |
| Comments | allowed between any two tokens |

The asset reference is trimmed before it is used, so `Asset = "  /Game/MF/F_X  ";` and
`Asset = /Game/MF/F_X;` name the same asset.

String escapes recognized in a quoted value are `\n`, `\r`, `\t`, `\"`, `\\` and `\0`; any other `\X`
is [`DSH2104`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2104) *(since 2.0.0; 1.x yielded the literal `X`)*.

## Asset reference resolution

The front end keeps the reference as written, and the compiler resolves it **when a `Graph` call to
the `VirtualFunction` is built**, using the general asset-reference resolver — not the
texture-default resolver. Accepted root spellings:

| Root | Resolves to |
| :-- | :-- |
| `Game` | `/Game` |
| `Engine` | `/Engine` |
| `Plugin.<Name>` | the plugin's mounted asset path |
| `Plugins.<Name>` | the plugin's mounted asset path |

A `Path( … )` call takes either 1 argument (an absolute `/…` object path) or 2 arguments (root plus a
relative path). A bare or quoted value that is not a `Path( … )` call is used directly and must be an
absolute object path. The full grammar, both resolvers and every root diagnostic are on
[`Path(...)`](/en/docs/parameters/path).

> [!WARNING]
> An unresolvable `Asset` is **not** diagnosed when the file is read or bound — only when a `Graph`
> call to the function is built: [`DSH8270`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8270) for a reference that
> does not resolve, [`DSH8219`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8219) for an asset that does not load. A
> `VirtualFunction` that nothing calls compiles with a broken `Asset` and produces no message.

## Post-parse rules

| Rule | Code |
| :-- | :-- |
| a `Name` attribute is present, non-empty after trimming, and an identifier | [`DSH6311`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6311) |
| an asset is available from the attribute or from `Options.Asset` | [`DSH6312`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6312) |
| at least one output is declared | [`DSH6313`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6313) |

## Sections accepted alongside `Options`

| Section | Inside a `VirtualFunction` |
| :-- | :-- |
| `Options` | this page |
| `Settings` | alias for `Options` |
| `Inputs` | typed parameters — [Inputs / Outputs / Results](/en/docs/plugin/language/inputs-outputs) |
| `Properties` | **alias for `Inputs`** |
| `Outputs` | typed parameters |
| `Results` | alias for `Outputs` |
| `Graph` | **error** — [`DSH2247`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2247) |
| `Code` | **error** — `DSH2247` |
| `Layout`, any other name | **error** — [`DSH2245`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2245) |

## Notes

- A `VirtualFunction`'s `Inputs` and `Outputs` describe the *existing* asset's interface. They are
  what a `Graph` call is checked against; they do not create pins. Getting them out of step with the
  asset produces errors where the call is built — [`DSH8220`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8220) for
  an input the asset does not have, [`DSH8221`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8221) for an output —
  not declaration errors.
- `.dsh` files may contain `VirtualFunction` blocks and nothing else that generates assets. A `.dsm`
  or `.dsf` whose only blocks are `VirtualFunction`s builds no asset.

## Diagnostics

Every diagnostic carries the line and column of the statement it is about.

| Code | Stage | Raised when |
| :-- | :-- | :-- |
| `DSH3261` | parse | a statement that is not `Key = Value` |
| `DSH3262` | parse | warning: a key written twice; the later value wins |
| `DSH6311` | parse | no `Name`, an empty one, or one that is not an identifier |
| `DSH6312` | parse | no asset from the attribute or from `Options` |
| `DSH6313` | parse | no output declared |
| `DSH2247` | parse | a `Graph` or `Code` section in the block |
| `DSH2245` | parse | any other unknown section name |
| `DSH8270`, `DSH8219` | building a call | the `Asset` value does not resolve, or does not load |
| `DSH8220`, `DSH8221` | building a call | the declared interface names an input or output the asset does not have |

The complete list is in the [diagnostics index](/en/docs/diagnostics).

## Example

```c
VirtualFunction(Name="BufferWriter")
{
    Options = {
        Asset = Path(Game, "MaterialFunctions/F_BufferWriter");
        Description = "Existing material function declared for Graph calls.";
    }

    Inputs = {
        float3 Color;
        float  Alpha;
    }

    Outputs = {
        float3 Result;
    }
}
```

Calling it from a `Shader` in the same file, or in a file that imports it:

```c
Graph = {
    float3 Written = BufferWriter(Color = Tint, Alpha = A);
}
```

Resolved reference:

```text
Asset  Path(Game, "MaterialFunctions/F_BufferWriter")
    -> /Game/MaterialFunctions/F_BufferWriter.F_BufferWriter
```

## See also

- [VirtualFunction](/en/docs/plugin/language/virtual-function) — the block `Options` belongs to
- [Inputs / Outputs / Results](/en/docs/plugin/language/inputs-outputs) — the interface sections of a `VirtualFunction`
- [Settings](/en/docs/plugin/settings) — the identical statement grammar
- [`Path(...)`](/en/docs/parameters/path) — every root spelling and both resolvers
- [Calls](/en/docs/graph/calls) — calling a `VirtualFunction` from `Graph`
- [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) — the editor actions and the sync service
- [Source files](/en/docs/language/file-model) — which block kinds `.dsh` / `.dsf` / `.dsm` may hold
- [DreamShaderLang 2.0](/en/docs/language-v2) — `/// @asset` and `extern`, the `.dss` spelling
- [Diagnostics index](/en/docs/diagnostics) — every code
