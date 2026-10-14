---
title: "HLSL passes"
description: "The HLSL a compute pass, or a fullscreen pass without a material, runs — written in an hlsl block of the .dsp or in a .usf, the names its bindings make, the fixed parameters and helpers of DreamPass.ush, and how the code reaches the engine through a pre-check and a snapshot. Needs UE 5.8."
---

# DreamShaderBuiltins.ush

> [DreamShader](/en/docs/) » [Builtins](/en/docs/plugin/builtins) » **`DreamShaderBuiltins.ush`**

An HLSL header shipped with the plugin, defining `DS_*` macros and functions that mirror the HLSL the
material translator emits for the corresponding `UE.*` builtin nodes.

| | |
| :-- | :-- |
| Kind | shipped HLSL header |
| On disk | `<Plugin>/Shaders/DreamShaderBuiltins.ush` |
| Virtual shader path | `/Plugin/DreamShader/DreamShaderBuiltins.ush` |
| Include guard | `DREAMSHADER_BUILTINS_USH` |
| Defines | 25 `DS_*` symbols — 22 macros and 3 functions |
| Emitted by the plugin | **no** — see [Reachability](#reachability) |

## Synopsis

```hlsl
#include "/Plugin/DreamShader/DreamShaderBuiltins.ush"
```

## The virtual path

At module startup DreamShader registers a shader source directory mapping from the virtual directory
`/Plugin/DreamShader` to the plugin's `Shaders` folder, unless a mapping for that virtual directory
already exists. The mapping is unconditional — it does not depend on any project setting, backend
choice or engine version — so `/Plugin/DreamShader/DreamShaderBuiltins.ush` always resolves for the
engine's shader preprocessor.

This is a separate mapping from the *generated shader virtual directory*, `/DreamShaderGenerated`,
which the module also registers. Since 2.0.0 DreamShader writes no per-source helper `.ush` there: the
HLSL of a `Function` is embedded in the code of its Custom node. See
[Generated HLSL](/en/docs/plugin/generation/generated-hlsl).

## Reachability [#reachability]

Nothing in the plugin emits an include for this header, and nothing in the plugin references any
`DS_*` symbol. The only occurrence of the name outside the file itself is a source comment.

| Path | Includes this header? |
| :-- | :-- |
| A `Custom` node made from a `Function` block | no — the body is the node's code, other `Function`s it calls are embedded as `DreamShaderFn_*` members of a generated wrapper struct, and the node's include list holds only the `#include` lines at the head of the body *(since 2.0.0; 1.x wrote a per-source helper `.ush`)* |
| The `Graph` backend | no — it emits material nodes, not HLSL |
| The `ThinCustom` backend | no |
| A hand-written `#include` in a [`Function`](/en/docs/plugin/language/function) HLSL body | yes — the virtual path resolves |

The header's own comment describes it as being included by generated `DSI_*.ush` files inside the
material translation unit. That was the arrangement used by the **Instance backend**, which has been
retired: the resolved backend set is now `Graph` and `ThinCustom`, and `Backend = "Instance"` is an
alias for `ThinCustom` *(deprecated in 1.5.0)*. No `DSI_*.ush` file is produced any more, so the
comment describes a path that no longer runs. See [Backend](/en/docs/settings/backend).

Every state read the header exposes now has a material-node equivalent in the
[`UE.*` catalogue](/en/docs/builtins/ue-nodes), and `SampleTexture2D(tex, uv)` in a `Graph` block desugars directly to a
`TextureSample` node. Reaching for this header is therefore only useful inside hand-written HLSL.

## Symbols

`Parameters` is the material parameter struct in scope at the include site; `Tex` is a texture
parameter identifier, from which the sampler name is derived by token pasting (`Tex##Sampler`).

| Symbol | Kind | Expansion | Node equivalent |
| :-- | :-- | :-- | :-- |
| `DS_TIME` | macro | `(View.GameTime)` | [`UE.Time()`](/en/docs/builtins/ue-nodes) |
| `DS_REAL_TIME` | macro | `(View.RealTime)` | — |
| `DS_DELTA_TIME` | macro | `(View.DeltaTime)` | — |
| `DS_PERIODIC_TIME(Period)` | macro | `(fmod(View.GameTime, (Period)))` | [`UE.Time(Period=…)`](/en/docs/builtins/ue-nodes) |
| `DS_TexCoord(Parameters, CoordinateIndex)` | `float2` function | `Parameters.TexCoords[CoordinateIndex].xy`, or `float2(0, 0)` when `NUM_TEX_COORD_INTERPOLATORS` is 0 | [`UE.TexCoord`](/en/docs/builtins/ue-nodes) |
| `DS_VertexColor(Parameters)` | `float4` function | `Parameters.VertexColor` | [`UE.VertexColor`](/en/docs/builtins/ue-nodes) |
| `DS_CameraVector(Parameters)` | macro | `((Parameters).CameraVector)` | [`UE.CameraVector`](/en/docs/builtins/ue-nodes) |
| `DS_ReflectionVector(Parameters)` | macro | `((Parameters).ReflectionVector)` | [`UE.ReflectionVector`](/en/docs/builtins/ue-nodes) |
| `DS_PixelNormalWS(Parameters)` | macro | `((Parameters).WorldNormal)` | [`UE.PixelNormalWS`](/en/docs/builtins/ue-nodes) |
| `DS_VertexNormalWS(Parameters)` | macro | `((Parameters).TangentToWorld[2])` | [`UE.VertexNormalWS`](/en/docs/builtins/ue-nodes) |
| `DS_TwoSidedSign(Parameters)` | macro | `((Parameters).TwoSidedSign)` | [`UE.TwoSidedSign`](/en/docs/builtins/ue-nodes) |
| `DS_ViewportUV(Parameters)` | macro | `(GetViewportUV(Parameters))` | [`UE.ViewportUV`](/en/docs/builtins/ue-nodes) |
| `DS_PixelDepth(Parameters)` | macro | `(GetPixelDepth(Parameters))` | [`UE.PixelDepth`](/en/docs/builtins/ue-nodes) |
| `DS_WorldPosition(Parameters)` | macro | `(WSDemote(GetWorldPosition(Parameters)))` | [`UE.WorldPosition`](/en/docs/builtins/ue-nodes) |
| `DS_TranslatedWorldPosition(Parameters)` | macro | `(GetTranslatedWorldPosition(Parameters))` | [`UE.TranslatedWorldPosition`](/en/docs/builtins/ue-nodes) |
| `DS_ObjectPosition(Parameters)` | macro | `(WSDemote(GetObjectWorldPosition(Parameters)))` | [`UE.ObjectPosition`](/en/docs/builtins/ue-nodes) |
| `DS_ObjectRadius(Parameters)` | macro | `(GetPrimitiveData(Parameters).ObjectRadius)` | [`UE.ObjectRadius`](/en/docs/builtins/ue-nodes) |
| `DS_ObjectBounds(Parameters)` | macro | `(float3(GetPrimitiveData(Parameters).ObjectBoundsX, …ObjectBoundsY, …ObjectBoundsZ))` | [`UE.ObjectBounds`](/en/docs/builtins/ue-nodes) |
| `DS_CameraPosition(Parameters)` | macro | `(WSDemote(GetWorldCameraOrigin(Parameters)))` | [`UE.CameraPosition`](/en/docs/builtins/ue-nodes) |
| `DS_PerInstanceRandom(Parameters)` | macro | `(GetPerInstanceRandom(Parameters))` | [`UE.PerInstanceRandom`](/en/docs/builtins/ue-nodes) |
| `DS_PerInstanceFadeAmount(Parameters)` | macro | `(GetPerInstanceFadeAmount(Parameters))` | [`UE.PerInstanceFadeAmount`](/en/docs/builtins/ue-nodes) |
| `DS_Panner(UV, Time, Speed)` | `float2` function | `UV + float2(frac(Time * Speed.x), frac(Time * Speed.y))` | [`UE.Panner`](/en/docs/builtins/ue-nodes) |
| `DS_SampleTexture2D(Tex, UV)` | macro | `Texture2DSample(Tex, Tex##Sampler, UV)` | `SampleTexture2D(tex, uv)` in a `Graph` block |
| `DS_SampleTexture2DLod(Tex, UV, Lod)` | macro | `Texture2DSampleLevel(Tex, Tex##Sampler, UV, Lod)` | — |
| `DS_SampleTexture2DBias(Tex, UV, Bias)` | macro | `Texture2DSampleBias(Tex, Tex##Sampler, UV, Bias)` | — |

The `WSDemote` calls lower the engine's large-world-coordinate vectors to `float3`. The translated
(camera-relative) position form is already `float3` and keeps precision near the camera.

The header's comment notes that the DSL used to write the unprefixed spellings
`SampleTexture2D` / `SampleTexture2DLod` / `SampleTexture2DBias` and have the generator lower them to
these macros. No such rewrite is performed today. `SampleTexture2D` is still a reserved name in a
`Graph` block, where it desugars to a `TextureSample` node — see
[`UE.Expression`](/en/docs/builtins/ue-expression#sampletexture2d) — but the `Lod` and `Bias` spellings have no
`Graph` equivalent.

## Notes

> [!NOTE]
> **Put the `#include` first.** An `#include` written at the top of a `Function` body (only
> whitespace and comments before it) is taken out of the body and put on the Custom node's include
> list, which the engine includes outside the generated function — see
> [Function ▸ Includes](/en/docs/plugin/language/function#includes) — so the header's function definitions
> compile normally. An `#include` that comes *after* a statement, or after any other `#` line, stays
> in the body, which the engine pastes inside a function; there the 22 macros still work (a
> `#define` is legal anywhere) but the three function definitions (`DS_TexCoord`, `DS_VertexColor`,
> `DS_Panner`) are not legal inside another function body.

> [!WARNING]
> **`DS_TexCoord` and `DS_VertexColor` depend on translator side effects that nothing arranges any
> more.** `DS_TexCoord` reads `Parameters.TexCoords[…]`, which only exists when at least one
> interpolator slot was allocated during material translation
> (`NUM_TEX_COORD_INTERPOLATORS` > 0); with no slot allocated the function compiles and returns
> `float2(0, 0)`. `DS_VertexColor` reads `Parameters.VertexColor`, which is only fed when the
> material was translated with vertex-colour usage set. The retired Instance backend arranged both by
> compiling matching dummy input chunks. Under the `Graph` and `ThinCustom` backends nothing does, so
> use [`UE.TexCoord`](/en/docs/builtins/ue-nodes) and [`UE.VertexColor`](/en/docs/builtins/ue-nodes) — or a wired `Function` input — instead of
> these two.

- The remaining reads are side-effect free. Every field and `Get*(Parameters)` helper they touch is
  populated unconditionally at pixel entry, so they compile in any opaque Surface pixel evaluation
  with no usage flag or interpolator request.
- `DS_PerInstanceRandom` and `DS_PerInstanceFadeAmount` are meaningful only for instanced or
  GPU-culled draws. On a plain mesh they read back safe constants (`0` and `1` respectively) with no
  compile error.
- The header is guarded by `DREAMSHADER_BUILTINS_USH`, so including it more than once in the same
  translation unit is harmless.
- Inside a `Function` body the GLSL-alias pass rewrites whole identifiers before the body is emitted
  — `vec3` → `float3`, `mix` → `lerp`, `fract` → `frac`, `mod` → `fmod`, and so on. It skips string
  literals and comments, so the include path in `#include "…"` is never rewritten.

## Example

A top-level `Function` whose HLSL body uses only the macro half of the header:

```c
Function vec2 Wobble(in vec2 uv, in float speed)
{
    #include "/Plugin/DreamShader/DreamShaderBuiltins.ush"
    float t = DS_TIME * speed;
    return uv + float2(sin(t), cos(t)) * 0.02;
}
```

The include resolves through the registered virtual directory, and `DS_TIME` expands to
`(View.GameTime)`.

The node-based equivalent, which needs no include and no HLSL helper at all:

```c
GraphFunction vec2 Wobble(in vec2 uv, in float speed)
{
    float t = UE.Time() * speed;
    return uv + vec2(sin(t), cos(t)) * 0.02;
}
```

## See also

- [Builtins](/en/docs/plugin/builtins) — the call surfaces available inside `Graph`
- [`UE.*` catalogue](/en/docs/builtins/ue-nodes) — the node equivalent of every symbol on this page
- [`UE.Expression`](/en/docs/builtins/ue-expression) — reaching any other `UMaterialExpression`
- [Math builtins](/en/docs/builtins/math) — the unprefixed numeric call surface in `Graph`
- [Transform builtins](/en/docs/plugin/builtins/transform) — `UE.TransformVector` / `UE.TransformPosition`
- [`Function`](/en/docs/plugin/language/function) — HLSL bodies and how they are emitted
- [`GraphFunction`](/en/docs/plugin/language/graph-function) — the node-based alternative to an HLSL body
- [Generated HLSL](/en/docs/plugin/generation/generated-hlsl) — the per-source `.ush` the plugin does emit
- [Backend](/en/docs/settings/backend) — `Graph`, `ThinCustom`, and the retired `Instance` backend
- [Contributing](/en/docs/plugin/contributing) — the plugin's source and content layout
