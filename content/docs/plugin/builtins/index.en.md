---
title: "Builtins"
description: "Builtins"
---

# Builtins

> [DreamShader](/en/docs/) » **Builtins**

The names DreamShaderLang resolves itself instead of looking them up among the author's declarations:
the `UE.*` namespace, the `Substrate.*` namespace, the reserved `SampleTexture2D` form, and the math
builtin set.

| | |
| :-- | :-- |
| Declared in | `.dsm`, `.dsf`, `.dsh` |
| Kind | section hub |
| Generates | one or more `UMaterialExpression` nodes per call |

## The call surfaces

Since 2.0.0 the surfaces share one implementation. A `UE.` or `Substrate.` call is bound against the
**builtin catalog** — the material expression classes of the running engine, read by reflection
(`dsc export-catalog` writes it out) — and a math builtin is one of the compiler's core operations.
What still differs between the rows is what the **legacy front end** does to a 1.x spelling before the
binder sees it.

| # | Surface | Written as | Where | What the legacy front end does first | Reference |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | The 1.x `UE.*` names | `UE.TexCoord(Index = 0)` | `Graph` | keeps the 1.x argument list of each of the 27 names, dropping every other argument with [`DSH5254`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5254); rewrites `UE.SceneTexture`, `UE.StaticSwitchParameter`, `UE.TranslatedWorldPosition` | [`UE.*` catalogue](/en/docs/builtins/ue-nodes) |
| 2 | Any node, by class | `UE.Expression(Class = "Sine", …)` or `UE.Sine(…)` | `Graph` | takes `OutputType` / `ResultType` off the call (a width hint; kept on a Custom node) | [`UE.Expression`](/en/docs/builtins/ue-expression) |
| 3 | Property declaration | `UE.TexCoord(Index = 0) UV;` | `Properties` | declares a local initialised with the call at the head of each `Graph` body that reads it | [`UE.*` catalogue](/en/docs/builtins/ue-nodes#properties-declaration-form) |
| 4 | Math builtins | `pow(a, b)` | `Graph` | nothing | [Math builtins](/en/docs/builtins/math) |
| 5 | `Substrate.*` | `Substrate.Slab(BaseColor = c)` | `Graph`, `Outputs` | drops `OutputType` / `ResultType` | [Substrate](/en/docs/builtins/substrate) |

Surface 3 is a *declaration*, not an expression; from the local it declares, the call is an ordinary
`UE.` call. Surfaces 1, 2, 4 and 5 are expressions evaluated inside a `Graph` body.

> [!IMPORTANT]
> Surfaces 1 and 3 share builtin names but not argument lists. `UE.TexCoord` in a `Graph` keeps
> `Index` and drops `CoordinateIndex` with `DSH5254`; as a property declaration it takes both, since no
> 1.x filter applies there. Every difference is tabulated in
> [`UE.*` catalogue § Properties declaration form](/en/docs/builtins/ue-nodes#properties-declaration-form).

### The reserved `SampleTexture2D` form

`SampleTexture2D(<texture-object>, <uv>)` is not in a namespace but belongs to the same cluster. It is
a reserved name, rewritten by the legacy front end before user properties and functions are looked
up, to

```c
UE.Expression(Class = "TextureSample", TextureObject = <arg0>, Coordinates = <arg1>)
```

— the whole sample, `RGBA` where a `float4` is wanted. It is the only builtin call form matched
**case-sensitively**: `sampletexture2d(t, uv)` is not it. It takes exactly two positional arguments
([`DSH5256`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5256) otherwise). See
[`UE.Expression`](/en/docs/builtins/ue-expression#sampletexture2d).

## Dispatch order inside a `Graph`

A call is resolved in this order; the first match wins. The full lookup is on
[Name resolution](/en/docs/plugin/graph/name-resolution).

| Order | Test on the callee | Result |
| :-- | :-- | :-- |
| 1 | in a 1.x source, while the call is read: `Path(…)`, a call of a declared parameter-node property, `SampleTexture2D` (case-**sensitive**), `UE.SceneTexture`, `UE.StaticSwitchParameter`, `UE.TranslatedWorldPosition`, and the 1.x argument lists of the other `UE.` names | rewritten to their 2.0 shape |
| 2 | is a type name | [constructor](/en/docs/plugin/graph/constructors) |
| 3 | `UE.<Name>` or `Substrate.<Name>` | a node of the catalog — [`UE.Expression`](/en/docs/builtins/ue-expression) |
| 4 | a texture's `.Sample(…)` / `.SampleLevel(…)`, `Texture2DSample`, `Texture2DSampleLevel` | a texture sample |
| 5 | a math builtin name, then a GLSL spelling (`DSH5277` in a 1.x source) | [math builtin](/en/docs/builtins/math) |
| 6 | a function this file declares or imports | [Calls](/en/docs/graph/calls) |
| 7 | in a 1.x source only: a math builtin or function matching ignoring case | as 5 or 6, with [`DSH5275`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5275) |

Inside step 3 the name after the prefix is looked up in the catalog, in the prefix's namespace:

| Order | Match | Result |
| :-- | :-- | :-- |
| 1 | `Class = "…"`, if the call has one | the class it names — [Class resolution](/en/docs/builtins/ue-expression#class-resolution) |
| 2 | the catalog's short name of a class — `Sine`, `TextureCoordinate`, `SubstrateSlabBSDF` | that class |
| 3 | an alias the catalog carries — `TexCoord`, `ViewportUV`, `Slab`, `HorizontalMix`, … | that class |
| 4 | in a 1.x source only: the one name or alias that matches ignoring case | that class, with [`DSH5276`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5276) |
| 5 | none | [`DSH5210`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5210), or `DSH5294` / `DSH5300` for a node a later engine has |

`UE.Expression` names no class, so without `Class` it is
[`DSH5218`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5218).

## Name and argument matching

| Element | Rule |
| :-- | :-- |
| `UE.` prefix | exact *(since 2.0.0)* — `ue.X` is an unknown variable `ue` ([`DSH4200`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4200)); a variable named `UE` hides the namespace |
| `Substrate.` prefix | in a 1.x source any case — it is a 1.x type spelling |
| Builtin name | exact; in a 1.x source a unique case-insensitive match with `DSH5276` |
| `SampleTexture2D` | case-**sensitive** |
| Math builtin name | exact; in a 1.x source case-insensitive with `DSH5275` — see [Math builtins](/en/docs/builtins/math#name-resolution) |
| Argument names | exact, or an alias the catalog carries; in a 1.x source a unique case-insensitive match with `DSH5276`. No other normalization — `_`, `-` and spaces are **not** removed |
| `Class` | exactly this spelling |
| `Output`, `OutputName`, `OutputIndex`, `OutputType`, `ResultType` | any case — the legacy front end takes them off the call |
| Enum values passed to properties | the value's name without its prefix, exactly; in a 1.x source case, spaces, `_`, `-`, `:`, `.`, `/`, the prefix and an `Enum::` scope are ignored, with [`DSH5278`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5278) |
| Unquoted text arguments | a bare word or dotted name is accepted wherever a quoted string is — `Class = Sine` equals `Class = "Sine"` |

Positional arguments are accepted by the classes the catalog gives an argument order —
`TextureCoordinate`, `Constant` … `Constant4Vector`, `Transform`, `TransformPosition`, `Panner`,
`ComponentMask`, `Time` and the five Substrate composition nodes — and refused elsewhere with
[`DSH5220`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5220) *(since 2.0.0)*. On the 27 1.x names the legacy front end
drops them first, except position 0 (`Input`) of `UE.TransformVector` and `UE.TransformPosition`;
`UE.StaticSwitchParameter` reads `True` at position 0 and `False` at position 1, and `SampleTexture2D`
takes both of its arguments positionally. The [math builtins](/en/docs/builtins/math) take arguments by position, or
named after the node's pins *(since 2.0.0)*.

> [!WARNING]
> **On the 27 1.x names, an argument the name did not read is dropped — with a warning now.** The
> legacy front end keeps the 1.x argument list and drops anything else with `DSH5254`
> *(since 2.0.0; 1.x dropped it without a word)*. `UE.Time(Bogus = 1)` compiles and says so;
> `UE.TexCoord(0)` produces UV channel 0 because the positional argument is dropped and
> `CoordinateIndex` keeps its node default. Every other call is bound argument by argument against the
> catalog, and a name that is no pin or property is [`DSH5213`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5213) —
> or, in a 1.x source, kept for the built node with [`DSH5291`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5291).

## Pages

| Page | Contents |
| :-- | :-- |
| [`UE.*` catalogue](/en/docs/builtins/ue-nodes) | The 27 1.x names, their node classes, argument lists and outputs; the special-cased builtins; the property declaration form |
| [`UE.Expression`](/en/docs/builtins/ue-expression) | Class resolution, argument binding, property values, output selection, Custom nodes |
| [`OutputType`](/en/docs/plugin/builtins/output-type) | What `OutputType` / `ResultType` still do in a 1.x source, and the output names |
| [Math builtins](/en/docs/builtins/math) | `pow`, `min`, `max`, `fmod`, `frac` and the rest |
| [Transform bases](/en/docs/plugin/builtins/transform) | The basis values for `UE.TransformVector` and `UE.TransformPosition` |
| [Substrate](/en/docs/builtins/substrate) | The `Substrate.*` node catalogue |
| [HLSL library](/en/docs/custom-pass/hlsl) | `Shaders/DreamShaderBuiltins.ush` |
| [Custom Pass nodes](/en/docs/builtins/dream-pass) | `UE.DreamPassOutput` and `UE.DreamPassBuffer`, reflected expressions of the DreamShaderPass module (UE 5.8) |

## Notes

- **Identical calls are one node, on every surface.** The IR merges nodes with the same class,
  properties and inputs *(since 2.0.0; 1.x reused nodes for the generic and `Substrate.*` calls and
  the math builtins only, and never for a Custom node)*. See [Node reuse](/en/docs/plugin/graph/node-reuse).
- Where a node lands on the canvas is decided by the layout pass. See
  [Graph layout](/en/docs/plugin/generation/graph-layout).
- A `UE.*` call written inside a [`GraphFunction`](/en/docs/plugin/language/graph-function) body is hoisted out
  of the HLSL and becomes a generated input pin on the emitted Custom node. The argument rules on this
  page still apply to the call itself.
- The `Substrate.*` namespace holds the Substrate classes of the running engine, which has none before
  UE 5.4; a call there is `DSH5210`. See [Substrate](/en/docs/builtins/substrate#availability).
- The builtin catalog is the engine's reflected classes, those of loaded plugins included. A name that
  is not a builtin, a declared property, a `Graph` variable or a declared function is an
  [unknown identifier](/en/docs/plugin/graph/name-resolution).
- A `.dss` writes the same nodes as `UE.<ClassShortName>(Pin = …, Property = …)`; `dsc migrate` writes
  each 1.x call that way. See [`dsc migrate`](/en/docs/language-v2/migrate) and
  [DreamShaderLang 2.0](/en/docs/language-v2).

## Example

```c
Shader(Name="Docs/M_Surfaces")
{
    Properties {
        Texture2D BaseTex = Path(Game, "Textures/T_Noise");
        float     Speed   = 0.2;
    }

    Settings { ShadingModel = "Unlit"; }

    Outputs {
        vec3 Color;
        Base.EmissiveColor = Color;
    }

    Graph {
        // 1 — 1.x UE.* names
        float2 uv = UE.Panner(Coordinate = UE.TexCoord(Index = 0), Speed = Speed);

        // 2 — any node by its class name; OutputType is optional since 2.0.0
        float pulse = UE.Sine(OutputType = "float1", Input = UE.Time());

        // the reserved two-argument sample form
        float4 tex = SampleTexture2D(BaseTex, uv);

        // 4 — math builtin
        float k = pow(pulse, 2.0);

        Color = tex.rgb * k;
    }
}
```

## See also

- [`UE.*` catalogue](/en/docs/builtins/ue-nodes) — every 1.x name, one entry each
- [`UE.Expression`](/en/docs/builtins/ue-expression) — any node by its class
- [`OutputType`](/en/docs/plugin/builtins/output-type) — the argument 1.x needed and 2.0 reads as a hint
- [Substrate](/en/docs/builtins/substrate) — the `Substrate.*` sibling namespace
- [Custom Pass nodes](/en/docs/builtins/dream-pass) — the two expressions a `.dsp` pipeline's materials use
- [Math builtins](/en/docs/builtins/math) — the scalar/vector math set
- [Calls](/en/docs/graph/calls) — call syntax, named arguments and out arguments
- [Name resolution](/en/docs/plugin/graph/name-resolution) — the lookup order a callee goes through
- [Node reuse](/en/docs/plugin/graph/node-reuse) — identical calls and nodes
- [Properties](/en/docs/parameters/properties) — the section the declaration form lives in
- [`Path(…)`](/en/docs/parameters/path) — asset-reference syntax
- [Diagnostics index](/en/docs/diagnostics) — every code
