---
title: "Substrate Nodes"
description: "The Substrate.* call namespace — every Substrate BSDF, composition and utility node of the running engine, called by name. UE 5.4+."
---

# Substrate.*

> [DreamShader](/en/docs/) » [Builtins](/en/docs/plugin/builtins) » **`Substrate.*`**

A sibling call namespace to [`UE.*`](/en/docs/builtins/ue-nodes) holding Unreal's Substrate BSDF, composition and utility
material nodes. Since 2.0.0 it is the builtin catalog's `Substrate` namespace: every Substrate class
the running engine has, by name.

| | |
| :-- | :-- |
| Declared in | `.dsm`, `.dsf` — inside a `Graph { … }` body, an `Outputs` binding expression, or an `Outputs` declaration initializer |
| Kind | builtin call namespace |
| Generates | one `UMaterialExpressionSubstrate*` node per call; identical calls are one node |
| Names | every `UMaterialExpressionSubstrate*` class of the running engine — the 24 names of the [catalogue](#catalogue), the catalog's short names, and a name derived from any other class *(since 2.0.0)* |
| Requires | an engine with Substrate nodes: **UE 5.4 or newer**; `Substrate.Select` from UE 5.6 |

## Availability

Nothing is compiled in or out by version in the binder *(since 2.0.0)*: the catalog lists the
Substrate classes of the running engine, and an engine before UE 5.4 has none.

| Surface | On an engine without the node |
| :-- | :-- |
| `Substrate.<Name>(…)` | [`DSH5210`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5210) — for `Select` (UE 5.6) and `Toon` (UE 5.8) [`DSH5294`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5294), which names the engine that has it |
| `A + B`, `A * w`, `lerp(A, B, t)`, a Slab's virtual arguments | `DSH5294`, [`DSH4381`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4381) |
| a run-time branch over two Substrate values | [`DSH4378`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4378) below UE 5.6 |
| `OutputType="Substrate"` on a generic `UE.*` call | dropped like any `OutputType` — see [`OutputType`](/en/docs/plugin/builtins/output-type) |
| `Base.FrontMaterial` output binding | decided by the material attributes the catalog lists for the engine; a name it lacks is [`DSH5200`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5200) |
| `Settings = { ShadingModel = "Substrate"; }` (and the `"Strata"` spelling) | [`DSH8215`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8215), carrying [`DSH7128`](/en/docs/plugin/diagnostics/dsh7xxx#dsh7128), below UE 5.4 |

> [!NOTE]
> Substrate must also be enabled for the project (*Project Settings ▸ Engine ▸ Rendering ▸
> Substrate*) for a Substrate graph to compile in the engine. DreamShader reads that setting
> *(since 2.0.0)*: the `Substrate` setting of a `Shader` — `Legacy`, `Bridge` or `Native` — says how
> a material is built in a project that has it on or off, and `Native` driving `FrontMaterial` with
> Substrate off is [`DSH4382`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4382). See
> [One source, two kinds of project](/en/docs/language-v2/substrate#one-source-two-kinds-of-project--substrate-).

> [!NOTE]
> The editor tooling reflects the engine. Below UE 5.4 the Bridge manifest
> `Saved/DreamShader/Bridge/substrate-builtins.json` is written with an empty entry array,
> `supported: false` and an `unsupportedReason` — so completion in the editor extensions offers
> nothing. See [Bridge](/en/docs/plugin/tools/bridge).

## Synopsis

```c
Substrate . <Name> ( [ <argument-name> = <expression> ]
                     [ , <argument-name> = <expression> ] …
                     [ , { Output | OutputName } = "<pin-name>" ]
                     [ , OutputIndex = <integer> ] )
```

`Substrate` and `.` are literal; `[ … ]`, `{ a | b }` and `…` are meta-notation.

In a 1.x source the prefix is matched **case-insensitively** — `Substrate` is a 1.x type spelling, and
those are read ignoring case — and a `<Name>` that matches only ignoring case is accepted with the
warning [`DSH5276`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5276): `SUBSTRATE.UNLIT(…)` resolves. Argument names
are matched the same way — exactly, or ignoring case with `DSH5276` — and are otherwise exact: no
separator stripping.

## Argument model

A `Substrate.*` call is bound like any reflected node call ([`UE.Expression`](/en/docs/builtins/ue-expression)),
against the class the name selects.

| Rule | Behaviour |
| :-- | :-- |
| Arguments are **named** | except on the five composition nodes, which take their operands by position too *(since 2.0.0)*: `Add(A, B)`, `Weight(A, Weight)`, `HorizontalMix(Background, Foreground, Mix)`, `VerticalLayer(Top, Base, Thickness)`, `Select(A, B, SelectValue)`. Elsewhere a positional argument is [`DSH5220`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5220) |
| `Class=` is **rejected** | [`DSH5216`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5216) — the name is the class |
| `OutputType=` / `ResultType=` are **dropped** | by the legacy front end, without a diagnostic; the catalog types the call |
| `Output=` / `OutputName=` | selects an output by name |
| `OutputIndex=` | selects an output by 0-based index |
| `Output`/`OutputName` and `OutputIndex` together | [`DSH5252`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5252) |
| Anything else | bound by the catalog — see below |

### Reflection-driven binding

For each remaining argument the binder tries, in order:

1. **Input pin** — a pin of the class by its name, or by an alias: its display name in identifier form
   (`Diffuse_Albedo`), with a property's display name also with its spaces removed.
2. **Property** — a reflected, editable property of the class by its name or an alias; a bool property
   also without its leading `b`, so `UseParameterBlending` reaches `bUseParameterBlending`.
3. **Virtual argument** — on a BSDF that has the pins it feeds, `BaseColor` / `Metallic` / `Specular`,
   `Haziness`, `Transmittance` / `Thickness` and `IOR` become the input of a conversion node in front
   of those pins *(since 2.0.0)*. See
   [Legacy parameters on a slab](/en/docs/language-v2/substrate#legacy-parameters-on-a-slab).
4. In a 1.x source, a name that is none of these and carries a value is kept with
   [`DSH5291`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5291) and connected by name when the node is built
   ([`DSH8212`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8212) if the node has no such pin).
5. No match → [`DSH5213`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5213).

A pin-name match wins over a property of the same name. A value is checked against the pin's type: a
number on a Substrate pin, a Substrate value on a numeric pin and anything but a material on a
`MaterialAttributes` pin are [`DSH5214`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5214).

> [!NOTE]
> **Engine pin names with spaces in them are reachable** *(since 2.0.0)*: a pin displayed as
> `Diffuse Albedo` is `Diffuse_Albedo`, and its property name — `DiffuseAlbedo`, which the tables
> below list — works as before.

> [!NOTE]
> **Accepted argument names follow the engine, not the plugin.** The catalog is read off the running
> engine's `UMaterialExpressionSubstrate*` classes, so an input added or removed by an engine release
> appears or disappears with no plugin change. The tables below list the inputs these classes expose;
> the **Completion** column marks the curated subset DreamShader publishes to editor completion and the
> Bridge manifest, which *is* fixed by the plugin. Any editable non-input property of the same class —
> enums, floats, booleans — is also settable as a literal argument even though it is not listed here.

### Selecting an output

`Output=` / `OutputName=` names an output exactly as the catalog lists it, including names that
contain spaces; in a 1.x source a case-only match is accepted with `DSH5276`. A name no output has is
[`DSH5201`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5201). `OutputIndex=` takes a 0-based index
([`DSH5282`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5282) past the last). Only the utility nodes below have more
than one output.

## Catalogue

*Substrate output* marks the classes whose output is a Substrate material value, bindable to
`Base.FrontMaterial`; the four marked **no** are the utility nodes and return ordinary numeric values.

| `Substrate.<Name>` | `UMaterialExpression` class | Substrate output | Entry |
| :-- | :-- | :-- | :-- |
| `ShadingModels` | `UMaterialExpressionSubstrateShadingModels` | yes | [↓](#substrateshadingmodels) |
| `Slab` | `UMaterialExpressionSubstrateSlabBSDF` | yes | [↓](#substrateslab) |
| `SimpleClearCoat` | `UMaterialExpressionSubstrateSimpleClearCoatBSDF` | yes | [↓](#substratesimpleclearcoat) |
| `VolumetricFogCloud` | `UMaterialExpressionSubstrateVolumetricFogCloudBSDF` | yes | [↓](#substratevolumetricfogcloud) |
| `Unlit` | `UMaterialExpressionSubstrateUnlitBSDF` | yes | [↓](#substrateunlit) |
| `Hair` | `UMaterialExpressionSubstrateHairBSDF` | yes | [↓](#substratehair) |
| `Eye` | `UMaterialExpressionSubstrateEyeBSDF` | yes | [↓](#substrateeye) |
| `SingleLayerWater` | `UMaterialExpressionSubstrateSingleLayerWaterBSDF` | yes | [↓](#substratesinglelayerwater) |
| `LightFunction` | `UMaterialExpressionSubstrateLightFunction` | yes | [↓](#substratelightfunction) |
| `PostProcess` | `UMaterialExpressionSubstratePostProcess` | yes | [↓](#substratepostprocess) |
| `UI` | `UMaterialExpressionSubstrateUI` | yes | [↓](#substrateui) |
| `ConvertMaterialAttributes` | `UMaterialExpressionSubstrateConvertMaterialAttributes` | yes | [↓](#substrateconvertmaterialattributes) |
| `ConvertToDecal` | `UMaterialExpressionSubstrateConvertToDecal` | yes | [↓](#substrateconverttodecal) |
| `HorizontalMix` | `UMaterialExpressionSubstrateHorizontalMixing` | yes | [↓](#substratehorizontalmix) |
| `HorizontalMixing` **— alias of `HorizontalMix`** | `UMaterialExpressionSubstrateHorizontalMixing` | yes | [↓](#substratehorizontalmix) |
| `VerticalLayer` | `UMaterialExpressionSubstrateVerticalLayering` | yes | [↓](#substrateverticallayer) |
| `VerticalLayering` **— alias of `VerticalLayer`** | `UMaterialExpressionSubstrateVerticalLayering` | yes | [↓](#substrateverticallayer) |
| `Add` | `UMaterialExpressionSubstrateAdd` | yes | [↓](#substrateadd) |
| `Weight` | `UMaterialExpressionSubstrateWeight` | yes | [↓](#substrateweight) |
| `Select` *(UE 5.6)* | `UMaterialExpressionSubstrateSelect` | yes | [↓](#substrateselect) |
| `TransmittanceToMFP` | `UMaterialExpressionSubstrateTransmittanceToMFP` | **no** | [↓](#substratetransmittancetomfp) |
| `MetalnessToDiffuseAlbedoF0` | `UMaterialExpressionSubstrateMetalnessToDiffuseAlbedoF0` | **no** | [↓](#substratemetalnesstodiffusealbedof0) |
| `HazinessToSecondaryRoughness` | `UMaterialExpressionSubstrateHazinessToSecondaryRoughness` | **no** | [↓](#substratehazinesstosecondaryroughness) |
| `ThinFilm` | `UMaterialExpressionSubstrateThinFilm` | **no** | [↓](#substratethinfilm) |

The two alias pairs are exact duplicates: same class, same inputs, same output typing. Neither
spelling is deprecated. Since 2.0.0 two short names join them — `Mix` for `HorizontalMix`, `Layer` for
`VerticalLayer` — and every class is also reachable by the catalog's short name (`SubstrateSlabBSDF`)
and by its class name without `MaterialExpressionSubstrate` in front and `BSDF` behind, which is how a
class this table does not list is called: UE 5.8's `UMaterialExpressionSubstrateToonBSDF` is
`Substrate.Toon`.

## Output typing

The catalog types each output from the engine: a BSDF or composition node makes a `Substrate` value;
a utility node makes numbers, as wide as the engine types each output — or, where the engine does not
type it, as wide as the place it is read into. A node with several outputs is read by naming one.

A `Substrate` value can be:

- assigned to a `Substrate`-typed `Graph` variable or `Outputs` declaration;
- passed to a Substrate-typed input of another `Substrate.*` node or of a
  [`UE.Expression`](/en/docs/builtins/ue-expression) node;
- combined with `+` (`Substrate.Add`), weighted with `* <scalar>` (`Substrate.Weight`) and mixed with
  `lerp(A, B, t)` (`Substrate.HorizontalMix`) *(since 2.0.0)* — see
  [Operators and `lerp`](/en/docs/language-v2/substrate#operators-and-lerp);
- chosen between by a static switch, or by a run-time `if`, which becomes `Substrate.Select`
  *(since 2.0.0)* — see [`if` over Substrate values](/en/docs/language-v2/substrate#if-and--over-substrate-values);
- bound to `Base.FrontMaterial`.

Any other operator over a Substrate value — `-`, `/`, `A * B`, a compound assignment — and a `lerp`
of a Substrate value with a number is [`DSH5293`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5293); another math
builtin given a Substrate value is [`DSH4226`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4226). An HLSL Custom node —
a `Function` — can neither take nor return one ([`DSH6253`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6253)).

> [!NOTE]
> A static switch over two closures is how a master material picks a shading variant from a static
> parameter: `UMaterialExpressionStaticSwitchParameter` resolves the bool while the engine builds the
> material topology tree and descends only the taken branch, so the translator still sees one
> topology. [`UE.StaticSwitchParameter`](/en/docs/builtins/ue-nodes#uestaticswitchparameter) does not compare its two
> branches, so a Substrate value on one side and a number on the other is not reported by DreamShader.

---

## Node reference

### Substrate.ShadingModels

Legacy-style shading-model surface expressed as a Substrate material.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `BaseColor` | numeric | — |
| `Metallic` | numeric | — |
| `Specular` | numeric | — |
| `Roughness` | numeric | — |
| `Anisotropy` | numeric | — |
| `EmissiveColor` | numeric | — |
| `Normal` | numeric | — |
| `Tangent` | numeric | — |
| `SubSurfaceColor` | numeric | — |
| `ClearCoat` | numeric | — |
| `ClearCoatRoughness` | numeric | — |
| `Opacity` | numeric | — |
| `TransmittanceColor` | numeric | — |
| `WaterScatteringCoefficients` | numeric | — |
| `WaterAbsorptionCoefficients` | numeric | — |
| `WaterPhaseG` | numeric | — |
| `ColorScaleBehindWater` | numeric | — |
| `ClearCoatNormal` | numeric | — |
| `CustomTangent` | numeric | — |
| `ThinTranslucentSurfaceCoverage` | numeric | — |
| `ShadingModel` *(since 2.0.1)* | a shading model, `UE.ShadingModel(ShadingModel = …)`; left open, the node's `ShadingModelOverride` applies | — |

Output: Substrate value. Editor completion offers no parameters for this wrapper.

### Substrate.Slab

The general-purpose Substrate BSDF slab.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `DiffuseAlbedo` | numeric | yes |
| `F0` | numeric | yes |
| `F90` | numeric | — |
| `Roughness` | numeric | yes |
| `Anisotropy` | numeric | — |
| `Normal` | numeric | yes |
| `Tangent` | numeric | — |
| `SSSMFP` | numeric | — |
| `SSSMFPScale` | numeric | — |
| `SSSPhaseAnisotropy` | numeric | — |
| `EmissiveColor` | numeric | — |
| `SecondRoughness` | numeric | — |
| `SecondRoughnessWeight` | numeric | — |
| `FuzzRoughness` | numeric | — |
| `FuzzAmount` | numeric | — |
| `FuzzColor` | numeric | — |
| `GlintValue` | numeric | — |
| `GlintUV` | numeric | — |

Output: Substrate value.

### Substrate.SimpleClearCoat

A slab with a fixed second clear-coat lobe.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `DiffuseAlbedo` | numeric | yes |
| `F0` | numeric | yes |
| `Roughness` | numeric | yes |
| `ClearCoatCoverage` | numeric | yes |
| `ClearCoatRoughness` | numeric | yes |
| `Normal` | numeric | yes |
| `EmissiveColor` | numeric | — |
| `BottomNormal` | numeric | — |

Output: Substrate value.

### Substrate.VolumetricFogCloud

Participating-media BSDF for volumetric fog and cloud materials.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `Albedo` | numeric | yes |
| `Extinction` | numeric | yes |
| `EmissiveColor` | numeric | yes |
| `AmbientOcclusion` | numeric | yes |

Output: Substrate value.

### Substrate.Unlit

Emissive-only BSDF. The smallest complete Substrate surface.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `EmissiveColor` | numeric | yes |
| `TransmittanceColor` | numeric | — |
| `Normal` | numeric | — |

Output: Substrate value.

### Substrate.Hair

Hair BSDF.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `BaseColor` | numeric | yes |
| `Scatter` | numeric | yes |
| `Specular` | numeric | yes |
| `Roughness` | numeric | yes |
| `Backlit` | numeric | yes |
| `Tangent` | numeric | yes |
| `EmissiveColor` | numeric | yes |

Output: Substrate value.

### Substrate.Eye

Eye BSDF.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `DiffuseColor` | numeric | yes |
| `Roughness` | numeric | yes |
| `CorneaNormal` | numeric | yes |
| `IrisNormal` | numeric | yes |
| `IrisPlaneNormal` | numeric | yes |
| `IrisMask` | numeric | yes |
| `IrisDistance` | numeric | yes |
| `EmissiveColor` | numeric | yes |

Output: Substrate value.

### Substrate.SingleLayerWater

Single-layer water BSDF.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `BaseColor` | numeric | yes |
| `Metallic` | numeric | yes |
| `Specular` | numeric | yes |
| `Roughness` | numeric | yes |
| `Normal` | numeric | yes |
| `EmissiveColor` | numeric | yes |
| `TopMaterialOpacity` | numeric | yes |
| `WaterAlbedo` | numeric | yes |
| `WaterExtinction` | numeric | yes |
| `WaterPhaseG` | numeric | yes |
| `ColorScaleBehindWater` | numeric | yes |

Output: Substrate value.

### Substrate.LightFunction

Substrate output node for light-function materials.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `Color` | numeric | yes |

Output: Substrate value.

### Substrate.PostProcess

Substrate output node for post-process materials.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `Color` | numeric | yes |
| `Opacity` | numeric | yes |

Output: Substrate value.

### Substrate.UI

Substrate output node for UI-domain materials.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `Color` | numeric | yes |
| `Opacity` | numeric | yes |

Output: Substrate value.

### Substrate.ConvertMaterialAttributes

Converts a `MaterialAttributes` value into a Substrate material.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `MaterialAttributes` | **`MaterialAttributes`** | yes |
| `Attributes` — alias of `MaterialAttributes` | **`MaterialAttributes`** | — |
| `WaterScatteringCoefficients` | numeric | yes |
| `WaterAbsorptionCoefficients` | numeric | yes |
| `WaterPhaseG` | numeric | yes |
| `ColorScaleBehindWater` | numeric | yes |

Output: Substrate value.

`MaterialAttributes` is the reflected property name and `Attributes` is the engine's pin name for the
same input; both bind input 0. Passing a numeric value to it is
[`DSH5214`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5214). See
[`MaterialAttributes`](/en/docs/plugin/graph/material-attributes).

### Substrate.ConvertToDecal

Converts a Substrate material into a decal material.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `DecalMaterial` | **Substrate** | yes |
| `Coverage` | numeric | yes |

Output: Substrate value.

### Substrate.HorizontalMix

Screen-space horizontal blend of two Substrate materials. Also spelled
**`Substrate.HorizontalMixing`** — the two names are interchangeable.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `Background` | **Substrate** | yes |
| `Foreground` | **Substrate** | yes |
| `Mix` | numeric | yes |

Output: Substrate value.

### Substrate.VerticalLayer

Layers one Substrate material over another. Also spelled **`Substrate.VerticalLayering`** — the two
names are interchangeable.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `Top` | **Substrate** | yes |
| `Base` | **Substrate** | yes |
| `Thickness` | numeric | yes |

Output: Substrate value.

### Substrate.Add

Adds two Substrate materials.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `A` | **Substrate** | yes |
| `B` | **Substrate** | yes |

Output: Substrate value.

### Substrate.Weight

Scales a Substrate material's contribution.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `A` | **Substrate** | yes |
| `Weight` | numeric | yes |

Output: Substrate value.

### Substrate.Select

Static selection between two Substrate materials.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `A` | **Substrate** | yes |
| `B` | **Substrate** | yes |
| `SelectValue` | numeric | yes |

Output: Substrate value.

### Substrate.TransmittanceToMFP

Utility. Converts a transmittance colour and thickness into a mean-free-path parameterisation.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `TransmittanceColor` | numeric | yes |
| `Thickness` | numeric | yes |

Outputs — numeric, selectable with `Output=` or `OutputIndex=`:

| Index | Name |
| :-- | :-- |
| 0 (default) | `MFP` |
| 1 | `Thickness` |

### Substrate.MetalnessToDiffuseAlbedoF0

Utility. Converts a legacy base-colour/metallic/specular triple into the slab parameterisation.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `BaseColor` | numeric | yes |
| `Metallic` | numeric | yes |
| `Specular` | numeric | yes |

Outputs — numeric:

| Index | Name |
| :-- | :-- |
| 0 (default) | `DiffuseAlbedo` |
| 1 | `F0` |

### Substrate.HazinessToSecondaryRoughness

Utility. Converts a haziness control into a second-roughness lobe.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `BaseRoughness` | numeric | yes |
| `Haziness` | numeric | yes |

Outputs — numeric:

| Index | Name |
| :-- | :-- |
| 0 (default) | `Second Roughness` |
| 1 | `Second Roughness Weight` |

### Substrate.ThinFilm

Utility. Computes thin-film interference specular colours.

| Argument | Value | Completion |
| :-- | :-- | :-- |
| `Normal` | numeric | yes |
| `F0` | numeric | yes |
| `F90` | numeric | yes |
| `Thickness` | numeric | yes |
| `IOR` | numeric | yes |

Outputs — numeric:

| Index | Name |
| :-- | :-- |
| 0 (default) | `Specular Color` |
| 1 | `Edge Specular Color` |

---

## Binding a Substrate value to Base.FrontMaterial

A Substrate material reaches the generated `UMaterial` through the `Base.FrontMaterial` output
binding.

```c
Outputs = {
    Substrate Surface;              // declared-type token; case-insensitive, no other spelling
    Base.FrontMaterial = Surface;
}
Graph = {
    Surface = Substrate.Unlit(EmissiveColor = Color);
}
```

| Rule | Behaviour |
| :-- | :-- |
| Declared-type token | the single spelling `Substrate`, any case. `Strata` is **not** a type token. |
| Binding expression | the right side of `Base.FrontMaterial = …` may be an expression of its own (`Base.FrontMaterial = Substrate.Layer(Coat, Body);`) *(since 2.0.0)* |
| Shading model | DreamShader sets none for the binding *(since 2.0.0; 1.x force-set Substrate)*; a `Settings` `ShadingModel` is applied as written |
| Source of the value | a `Graph` block with `Substrate.*` nodes; a `Function` — an HLSL Custom node — cannot produce one (`DSH6253`) |
| Value kind | a number bound to `Base.FrontMaterial`, or a Substrate value bound to a numeric pin, does not fit (`DSH5214` / `DSH4228`) |
| Engine | an engine whose catalog lists the `FrontMaterial` attribute; otherwise `DSH5200` |

> [!NOTE]
> `Strata` is the pre-rename spelling. It is accepted as a `Settings = { ShadingModel = … }` value
> (an alias for the same shading model) but never as a type token and never as a call namespace.
> See [Enum values](/en/docs/settings/enums).

## Notes

- **Every Substrate class is a name.** A class with no row in the [catalogue](#catalogue) is called by
  its derived name — `Substrate.Toon` on UE 5.8 — or by its class through
  `UE.Expression(Class = "SubstrateToonBSDF", …)`, which resolves `SubstrateToonBSDF`,
  `MaterialExpressionSubstrateToonBSDF`, `UMaterialExpressionSubstrateToonBSDF` and the full
  `/Script/Engine.…` path *(since 2.0.0)*. See [`UE.Expression`](/en/docs/builtins/ue-expression#class-resolution).
- **`UE.*` names do not apply inside this namespace.** `Substrate.TexCoord(…)` is not a thing; a name
  the namespace does not have is [`DSH5210`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5210).
- Substrate nodes take part in **node reuse**: two identical `Substrate.Slab(…)` calls over identical
  argument values are one node. See [Node reuse](/en/docs/plugin/graph/node-reuse).
- A `Substrate.` call inside a [`GraphFunction`](/en/docs/plugin/language/graph-function) body is not lifted into
  a node input, because no Custom node input carries a Substrate value; it stays in the HLSL text, with
  the warning [`DSH6316`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6316).
- The [decompiler](/en/docs/tools/decompiler) exports an existing Substrate graph back to source,
  deriving channel swizzles from each connection's write mask *(since 1.5.0)*, and writes each node
  under the name sources use — see [Decompiling](/en/docs/language-v2/substrate#decompiling).
- The `Substrate.*` surface is exported for editor tooling to
  `Saved/DreamShader/Bridge/substrate-builtins.json` (schema `DreamShader.SubstrateBuiltins`,
  version 1), one entry per name with its `qualifiedName`, `className`, `outputType`,
  `isSubstrateOutput` and curated `parameters`. See [Bridge](/en/docs/plugin/tools/bridge).

## Diagnostics

Every code is listed with its message and its full description on its page in
[Diagnostics](/en/docs/diagnostics).

### Call site

| Code | Raised when |
| :-- | :-- |
| [`DSH5210`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5210) | the name is no Substrate class of the running engine — every `Substrate.*` call below UE 5.4 |
| [`DSH5294`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5294) | the node exists from a later engine on (`Select`, `Toon`), or an operator or virtual argument needs a node this engine lacks |
| [`DSH5276`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5276) (warning) | in a 1.x source, a name, argument or output matches only ignoring case |
| [`DSH5216`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5216) | `Class=` was supplied |
| [`DSH5220`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5220), [`DSH5221`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5221) | a positional argument on a BSDF, or past the order of a composition node |
| [`DSH5213`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5213) | an argument is no pin, property or virtual argument of the class |
| `DSH5291` (info), `DSH8212` | in a 1.x source, such an argument carrying a value, and the built node without the pin |
| [`DSH5214`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5214) | a pin is given a value of the wrong kind |
| [`DSH5224`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5224) | a property is given something that is not a constant |
| [`DSH4215`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4215) | an argument is given twice |
| [`DSH5295`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5295), [`DSH5296`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5296) | virtual arguments that conflict with each other or the pins, or lack their companion |
| [`DSH5279`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5279) (warning) | in a 1.x source, a required pin is left unconnected |
| `DSH5250`–`DSH5252`, `DSH5201`, `DSH5282` | an output selector — see [`UE.Expression`](/en/docs/builtins/ue-expression#selecting-an-output) |
| [`DSH8214`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8214) | the node could not be created |
| [`DSH8213`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8213) | a property value could not be written |

### Substrate values elsewhere in the pipeline

| Code | Raised when |
| :-- | :-- |
| [`DSH5293`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5293) | an operator other than `+` and `* <scalar>`, a compound assignment, or a `lerp` of a Substrate value with a number |
| [`DSH4226`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4226) | another math builtin is given a Substrate value |
| [`DSH5297`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5297)–[`DSH5299`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5299), [`DSH4383`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4383) | a Substrate value built member by member — see [the 2.0 page](/en/docs/language-v2/substrate#building-a-value-member-by-member) |
| [`DSH4378`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4378) | a branch over a Substrate value and a number, or a run-time branch over Substrate values below UE 5.6 |
| [`DSH4380`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4380) (warning) | a run-time branch selects between two different BSDF classes |
| [`DSH4381`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4381) | a virtual argument's conversion node is missing from this engine |
| [`DSH4382`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4382) | `Substrate = Native` drives `FrontMaterial` and Substrate is off in the project |
| [`DSH6253`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6253) | a `Function` takes or returns a Substrate value |
| [`DSH6316`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6316) (warning) | a `Substrate.` call in a `GraphFunction` body is left in the HLSL text |
| [`DSH5200`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5200) | `Base.FrontMaterial` on an engine whose catalog has no such attribute |
| [`DSH8215`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8215) | `ShadingModel = "Substrate"` or `"Strata"` below UE 5.4 (the message carries `DSH7128`) |

## Example

```c
Shader(Name="Docs/M_Substrate")
{
    Properties = {
        vec3  BaseColor = vec3(0.6, 0.1, 0.1);
        float Metallic  = 0.0;
        float Specular  = 0.5;
        float Rough     = 0.3;
        vec3  Glow      = vec3(0.1, 0.6, 1.0);
    }

    Outputs = {
        Substrate Surface;
        Base.FrontMaterial = Surface;
    }

    Graph = {
        // Utility node: two numeric outputs, selected by name.
        vec3 Albedo = Substrate.MetalnessToDiffuseAlbedoF0(
            BaseColor = BaseColor, Metallic = Metallic, Specular = Specular,
            Output = "DiffuseAlbedo");
        vec3 F0 = Substrate.MetalnessToDiffuseAlbedoF0(
            BaseColor = BaseColor, Metallic = Metallic, Specular = Specular,
            Output = "F0");

        Substrate Body = Substrate.Slab(
            DiffuseAlbedo = Albedo,
            F0            = F0,
            Roughness     = Rough);

        Substrate Emissive = Substrate.Unlit(EmissiveColor = Glow);

        Surface = Substrate.Add(A = Body, B = Emissive);
    }
}
```

Generated nodes:

```text
SubstrateMetalnessToDiffuseAlbedoF0   -> output "DiffuseAlbedo"  -> Albedo
                                      -> output "F0"             -> F0
                                         (one node, read for both)
SubstrateSlabBSDF                     -> Body                    (Substrate value)
SubstrateUnlitBSDF                    -> Emissive                (Substrate value)
SubstrateAdd                          -> Surface                 (Substrate value)
```

Since 2.0.0 the same graph is
`Surface = Substrate.Slab(BaseColor = BaseColor, Metallic = Metallic, Specular = Specular, Roughness = Rough) + Substrate.Unlit(EmissiveColor = Glow);`
— the virtual arguments put the conversion node in front of the slab, and `+` is `Substrate.Add`.

## See also

- [Builtins](/en/docs/plugin/builtins) — the call surfaces available inside `Graph`
- [`UE.*` catalogue](/en/docs/builtins/ue-nodes) — the sibling namespace
- [`UE.Expression`](/en/docs/builtins/ue-expression) — the binding rules every node call shares
- [Substrate sugar](/en/docs/language-v2/substrate) — operators, `lerp`, branches, virtual arguments, builders, `Substrate =`
- [`OutputType` values](/en/docs/plugin/builtins/output-type) — dropped on this namespace
- [Math builtins](/en/docs/builtins/math) — the unprefixed numeric call surface
- [Transform builtins](/en/docs/plugin/builtins/transform) — `UE.TransformVector` / `UE.TransformPosition`
- [Output bindings](/en/docs/plugin/language/output-bindings) — `Base.FrontMaterial` and the full target list
- [`MaterialAttributes`](/en/docs/plugin/graph/material-attributes) — the value type `ConvertMaterialAttributes` consumes
- [Types](/en/docs/language/types-and-values) — the `Substrate` declared-type token
- [Enum values](/en/docs/settings/enums) — `ShadingModel = "Substrate"` / `"Strata"`
- [Calls](/en/docs/graph/calls) — named-argument syntax
- [Node reuse](/en/docs/plugin/graph/node-reuse) — identical calls and nodes
- [Bridge](/en/docs/plugin/tools/bridge) — `substrate-builtins.json` and the editor completion manifest
- [Decompiler](/en/docs/tools/decompiler) — exporting an existing Substrate graph back to source
- [Diagnostics index](/en/docs/diagnostics) — every code
