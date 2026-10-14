---
title: "The Pipeline"
description: "How one DreamShaderLang source file becomes Unreal assets — every stage, what triggers a build, and where each stage can fail."
---

# Generation

> [DreamShader](/en/docs/) » **Generation**

The stage that turns a DreamShaderLang source file into Unreal assets.

| | |
| :-- | :-- |
| Input | one `.dsm` or `.dsf` file, plus every `.dsh` header it imports — the same pipeline compiles `.dss`, `.dsi` and `.dsp` |
| Rejected input | `.dsh` — a header is compiled only as part of a file that imports it ([`DSH8296`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8296)) |
| Produces | `UMaterial` / `UDreamShaderMaterialInstance`, `UMaterialFunction`, `UMaterialFunctionMaterialLayer`, `UMaterialFunctionMaterialLayerBlend`. No `.ush` include *(since 2.0.0)* — see [Generated HLSL](/en/docs/plugin/generation/generated-hlsl) |
| Runs in | the editor process only (the emitter uses editor-only material APIs) |

## Pipeline

*(since 2.0.0)* A `.dsm` / `.dsf` is read by the **legacy front end** into the same tree the `.dss` parser
builds, and from there takes the one pipeline every source kind takes
(`Source/DreamShaderCompiler/Private/Pipeline/DreamShaderCompilePipeline.cpp`). A stage reports **every**
error it finds; a stage that reported one stops the run before the next stage. Every diagnostic has a
stable code and is reported as `<file>(<line>,<col>): DSHnnnn: <message>` — see the
[diagnostics index](/en/docs/diagnostics) and the [code ranges](/en/docs/language-v2#diagnostics).
The codes below are the ones a stage raises for a 1.x source.

| # | Stage | What it does | Fails with |
| :-- | :-- | :-- | :-- |
| 1 | Normalize path | full path, normalized | — |
| 2 | File-kind gate | builds `.dss`, `.dsi`, `.dsp`, `.dsm` and `.dsf`; a `.dsh` never on its own | `DSH8296` |
| 3 | Read | the file's text | [`DSH8290`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8290) |
| 4 | Preprocess | `#if` / `#define` against the project's define table, in the 1.x dialect for `.dsm` / `.dsf`; directive lines become empty lines, so positions do not move | [`DSH8291`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8291), carrying the preprocessor's own `DSH1030`–`DSH1042` |
| 5 | Parse | the legacy front end reads the 1.x blocks, sections and `Graph` statements | `DSH2200`–`DSH2258`, `DSH3250`–`DSH3278`, `DSH5250`–`DSH5265`, `DSH6300`–`DSH6319`, and the lexer's `DSH2101`–`DSH2106`; then a texture default whose class shell names the wrong class, [`DSH1043`](/en/docs/plugin/diagnostics/dsh1xxx#dsh1043) / [`DSH1044`](/en/docs/plugin/diagnostics/dsh1xxx#dsh1044) |
| 6 | Bind | names, types, calls, settings; each imported `.dsh` is resolved, preprocessed and parsed **on its own**, and its declarations are declared into the file | `DSH4200`–`DSH4264`, `DSH5200`–`DSH5231`, the legacy rules `DSH5275`–`DSH5292`, `DSH6200`–`DSH6211`, `DSH7200`–`DSH7233`; an import that cannot be resolved, read or parsed, [`DSH8292`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8292)–`DSH8295` |
| 7 | Build key | hash of every imported header and of the file, plus the settings and versions that decide the output | — see [Caching](/en/docs/plugin/generation/caching) |
| 8 | Lower | the bound tree into the graph IR, Custom-node code included | `DSH4350`–`DSH4383`, `DSH6220`–`DSH6223`, `DSH6250`–`DSH6264`, `DSH6327`, `DSH6328` |
| 9 | Passes, validate | constant folding, de-duplication, dead-node pruning; the IR validator | `DSH4390`; `DSH4300`–`DSH4335` |
| 10 | Emit | one asset per product, in dependency order — see [below](#inside-the-emit) | `DSH8200`–`DSH8237`; two exported functions that call each other, [`DSH8299`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8299) |
| 11 | Compose result | one line per product, plus a `Warnings:` block — see [Success messages](#success-messages) | — |

A `.dsi` resolves its parent after the parse (`DSH8260`–`DSH8265`) and a `.dsp` the materials and shader
files its passes name; see [`.dsi`](/en/docs/language-v2/instances) and [`.dsp`](/en/docs/language-v2/passes).

A compile that fails returns the first error as its first line, then every other diagnostic of the run:
errors, then warnings, then infos. The result's code is the first error's.

The *compile material* entry point runs the same compile as *compile assets* *(since 2.0.0)*: a source is
one compile unit, and its material may call a function the same file declares, which is emitted first.

### Inside the emit

One product — a `Shader`, `ShaderFunction`, `ShaderLayer` or `ShaderLayerBlend` block — in this order.
The diagnostics of the asset layer reach the result inside the emitter's: the emitter's message quotes
the asset layer's code and text.

| # | Sub-stage | Fails with |
| :-- | :-- | :-- |
| 1 | Resolve the destination from `Name=` / `Root=` | [`DSH8200`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8200) — see [Asset paths](/en/docs/generation/asset-paths#diagnostics) |
| 2 | Create or reuse the asset: the class check and the [ownership guard](/en/docs/generation/regeneration#ownership-guard) | `DSH8201` (`Graph` material), `DSH8203` (ThinCustom instance), `DSH8202` (function, layer, blend) |
| 3 | Another editor owns writing this project's generated assets | [`DSH8209`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8209), an info: skipped, not failed |
| 4 | Source-hash short circuit | [`DSH8237`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8237), an info: skipped — see [Caching](/en/docs/plugin/generation/caching) |
| 5 | Open in an asset editor | [`DSH8206`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8206) — see [Regeneration](/en/docs/generation/regeneration#open-in-an-asset-editor) |
| 6 | Divergence | [`DSH8207`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8207) — see [Divergence](/en/docs/plugin/generation/divergence) |
| 7 | ThinCustom: capture the instance's parameter overrides, then find or create the hidden base | `DSH8230` |
| 8 | Build the graph, apply settings, lay out, recompile — atomically | see below and [Regeneration](/en/docs/generation/regeneration) |
| 9 | Stamp the provenance metadata and the output digest | — |
| 10 | Save, unless the product is an Ephemeral ThinCustom one or writing is refused | [`DSH8229`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8229) |

The checks the 1.x generator made here — a top-level `Shader` present, a non-empty `Outputs`, a known
`Backend` — are the front end's now: a `Shader` without `Outputs` is the warning
[`DSH2256`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2256) and still builds, a `Shader` with no `Graph` whose
`Outputs` compute nothing either is [`DSH2255`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2255), and a
`Backend` that is no backend is [`DSH7202`](/en/docs/plugin/diagnostics/dsh7xxx#dsh7202) (an empty one
[`DSH7201`](/en/docs/plugin/diagnostics/dsh7xxx#dsh7201); `Instance` is read as `ThinCustom` with
[`DSH7204`](/en/docs/plugin/diagnostics/dsh7xxx#dsh7204)).

### Inside the graph build

Shared by both backends. For the ThinCustom backend it runs against the hidden base material, not
the emitted instance.

1. Clear the generated `DreamShader: ` comment boxes, then detach the existing graph — kept, so a
   failure puts it back ([`DSH8208`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8208) when it cannot be
   snapshotted).
2. Reset every material property to its engine default.
3. Apply `Settings` ([`DSH8215`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8215) for a refused one).
4. Emit the IR graph node by node — parameters, expressions, one Custom node per `Function` call, a
   `MaterialFunctionCall` per `ShaderFunction` call — and connect each `Outputs` binding through a
   `DS_<output>` named-reroute pair. A node the engine could not build is `DSH8210`–`DSH8228`.
5. Lay the graph out, in the project's [Graph Layout Style](/en/docs/plugin/generation/graph-layout#layout-styles).
6. Commit — the detached graph is destroyed only now — and recompile the material.

## What triggers a compile

| Trigger | Forced | ThinCustom result | Scope |
| :-- | :-- | :-- | :-- |
| Auto-compile on save (file watcher + debounce) | no | Ephemeral | the saved file; a saved `.dsh` queues every source that imports it |
| The startup sweep, and the sweep after a change to a setting the [build key](/en/docs/plugin/generation/caching#it-is-a-build-key-not-just-a-source-hash) covers | no | Ephemeral | every project source |
| *Recompile DSM*, *Clean Generated Shaders* | yes | Ephemeral | every project source |
| Material Content Browser *Compile* / thumbnail-refresh buttons | yes | Ephemeral | one source |
| Live preview renderer | through the bridge, yes; through the preview WebSocket, only when the request sets `force` | Ephemeral | one source |
| *Materialize*, and creating a child instance of an Ephemeral material | yes | **Materialized** | one source |
| A `.dsi` whose parent material is missing or older than its source ([`DSH8264`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8264)) | no | **Materialized** | the parent's source, first |
| Commandlet `-run=DreamShader` | with `-Force` | **Materialized** | as asked |
| Cook, on the cook director process only | yes | **Materialized** | every project source |

Auto-compile is governed by two project settings: **Auto Compile On Save** (default on) and **Save
Debounce Seconds** (default `0.25`, clamped to `[0.05, 10.0]`). See
[Project settings](/en/docs/settings/project).

> [!NOTE]
> Only a **ThinCustom** product can live in memory. The interactive editor keeps it there, Ephemeral,
> until a cook, the commandlet or an explicit *Materialize* puts it on disk. A `Graph`-backend material
> and every material function, layer and blend are saved by every build that is allowed to write
> *(since 2.0.0)*. See [Ephemeral materials](/en/docs/generation/in-memory).

## Outcomes that are not assets

A source file can compile successfully and produce nothing to place in the Content Browser.

| Source | Outcome |
| :-- | :-- |
| a `.dsm` / `.dsf` that declares only `Function`, `GraphFunction`, `Namespace` or `VirtualFunction` blocks | success: `Compiled {File}; it declares no material and no exported function, so no asset was written.` |
| a `.dsm` / `.dsf` with no block at all | **failure**, [`DSH2254`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2254) |

## Success messages

One line per product, in the order the products were emitted. The lines are a wire format:
`.skill/dsc.ps1` reads `Generated <Kind> <ObjectPath> from <Source>.` to list what a run wrote.

| Message | Emitted for |
| :-- | :-- |
| `Generated {Kind} {ObjectPath} from {File}.` | each product built. `{Kind}` is `Material` (either backend), `MaterialFunction`, `MaterialLayer`, `MaterialLayerBlend`, `MaterialInstance` or `PassPipeline`; `{ObjectPath}` is the object path, `/Game/M.M` |
| `Generated RenderTarget {ObjectPath} from {File}.` | the render target of each exported buffer of a `.dsp` *(since 2.1.0)* |
| `Skipped {ObjectPath} from {File}; source hash is unchanged (build key {BuildKey}).` | a product the hash short circuit skipped, of any kind — see [Caching](/en/docs/plugin/generation/caching) |
| `Skipped {ObjectPath}; another editor owns this project's DreamShader bridge, and only that one writes generated assets to disk.` | a product another editor owns the writing of (`DSH8209`) |
| `Compiled {File}; it declares no material and no exported function, so no asset was written.` | a source with no product |

`{File}` is the full, normalized source path. Under them, a `Warnings:` header lists every warning of
the run in wire form, then the generation warnings `DSH8155`, `DSH9011` and `DSH9012`.

> [!NOTE]
> *(since 2.0.0)* The 1.x lines `Generated {AssetPath} from {File}.`, `Generated DreamShader thin-custom
> material …`, the ` (virtual)` suffix and the helper-include line are gone: every product says
> `Generated` with its kind, and a function skipped by the hash says `Skipped` instead of nothing.

Runtime substitutions are rendered as `{Placeholder}` on this page; the compiler emits the
substituted text.

## Progress reporting

Generation reports through Unreal's slow-task system. The dialog is delayed so a fast compile never
flashes one, carries a **Cancel** button, and is not shown under `IsRunningCommandlet()`. Resolving a
source's products for the Material Content Browser runs the front half with no dialog at all.

| Scope | Title | Frames | Dialog delay |
| :-- | :-- | :-- | :-- |
| one compile | `Compiling DreamShader source '{File}'...` | 6: `Reading '{File}'...`, `Parsing '{File}'...`, `Resolving names in '{File}'...`, `Lowering '{File}' to IR...`, `Validating the IR of '{File}'...`, `Building the graph for '{File}'...` | 0.35 s |
| `Classic` layout (nested) | `Laying out DreamShader material graph...` | one per node | inherited |

`{File}` is the file name without its folder here.

### Where the time goes

For a `.dsm` / `.dsf` the first five frames are the front end, and quick. The last,
`Building the graph for '{File}'...`, holds the emit — and the emit ends in the shader compile
(`RecompileMaterial`, a ThinCustom instance's `UpdateStaticPermutation`, a function's
`UpdateMaterialFunction`), which is unbounded. *(since 2.0.0)* The 1.9 `Step 1 of 2` / `Step 2 of 2`
prefixes are gone with the 1.x generator.

> [!NOTE]
> A bar that stops moving on `Building the graph for …` is normal. Shader compilation happens outside
> the plugin, and a single heavy permutation can hold it for minutes.

### Cancelling *(since 1.9.0)*

The cancel is checked before every stage, before every product, and inside the emit once the old graph
has been detached. Cancelling takes the same path a failed compile takes:

- The asset is restored to exactly what it held before the compile started — the atomic-rebuild
  rollback is what does it, so there is never a half-built graph or an emptied material function.
- Nothing is stamped and nothing is saved.
- The compile reports [`DSH8298`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8298) as an error *(since 2.0.0; through
  1.x `DSH9010`)*.

The one thing a cancel does not put back is the generated `DreamShader: ` comment boxes on a
material or function, for the same reason a failed rebuild does not: they are destroyed before the
snapshot is taken. The next successful compile recreates them, and comments you wrote yourself are
never touched.

> [!WARNING]
> Cancelling does not stop shaders that Unreal has already queued. If you cancel during the shader
> compile, `ShaderCompileWorker.exe` keeps working through whatever was already dispatched.

### When a shader compile takes too long *(since 1.9.0)*

If the shader compile of one asset runs past **30 seconds**, generation emits `DSH9011` once, as a
warning in the log and in the result's `Warnings:` block. It never blocks or fails the compile — it
exists to say what that wait usually means:

- A `Custom` node whose loop bound is one of its **inputs** — a `for` or `while` whose limit is not a
  literal or a `#define`d constant.
- Combined with **implicit-mip** texture sampling — `Texture2DSample`, `Texture3DSample` or
  `.Sample` — inside divergent control flow.

The compiler derives the mip level from screen-space derivatives, which are undefined inside
divergent flow, so it fully unrolls a loop whose iteration count it cannot know. To confirm the
compile is still working rather than hung, check whether `ShaderCompileWorker.exe` is busy in Task
Manager. To fix it, bound the loop with a literal or a `#define`, or call `SampleLevel` /
`SampleGrad`, which take the mip level as an argument.

Generation also looks for that pair while it emits a `Custom` node's code and warns up front, as
`DSH9012`, before the compile is even started. Both are advisory; neither fails a build.

## Pages

| Page | Covers |
| :-- | :-- |
| [Asset paths](/en/docs/generation/asset-paths) | `Name=` + `Root=` → package path → on-disk `.uasset` |
| [Ephemeral materials](/en/docs/generation/in-memory) | the ThinCustom result, the hidden base, visibility, materializing, cook |
| [Caching](/en/docs/plugin/generation/caching) | the build key, the metadata keys, when regeneration is skipped |
| [Graph layout](/en/docs/plugin/generation/graph-layout) | how generated nodes are positioned |
| [Regeneration](/en/docs/generation/regeneration) | what a rebuild destroys and what survives |
| [Divergence](/en/docs/plugin/generation/divergence) | the output digest, and what happens when an asset was edited by hand |
| [Generated HLSL](/en/docs/plugin/generation/generated-hlsl) | the HLSL a `Function` call puts into its Custom node |
| [Source control](/en/docs/generation/source-control) | which generated assets have files, the two recipes for versioning them, `dsc list-generated` |

## Notes

- **The parse unit is the file.** *(since 2.0.0)* `import` inlines nothing: an imported `.dsh` is
  preprocessed and parsed on its own, and its declarations are declared into the importing file. A
  name declared twice is [`DSH4210`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4210), an import cycle
  [`DSH4211`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4211). A header cannot hold an asset block
  ([`DSH2249`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2249)), so "one `Shader` per file"
  ([`DSH2250`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2250)) means the file. The build key still covers every
  imported byte. See [import](/en/docs/language/imports).
- Every diagnostic carries the line and column of the construct it is about, in the file that
  construct is in: one raised inside an imported header names the header. Only a few file-level ones,
  such as an import that cannot be resolved, report line 1.
- Products are emitted in dependency order: a function that another product of the same file calls is
  built first, so a `Shader` can call a `ShaderFunction` declared beside it. Otherwise the order is the
  order of declaration.
- Warnings never fail a compile. They follow the result lines under a `Warnings:` header.
- Generation is editor-only. There is no runtime code path that builds a material from
  DreamShaderLang.
- To write the same material in the 2.0 language, see [DreamShaderLang 2.0](/en/docs/language-v2) and
  [`dsc migrate`](/en/docs/language-v2/migrate).

## Example

```c
// DShader/Materials/M_Emissive.dsm
import "Common.dsh";

ShaderFunction(Name="Functions/F_Tint")
{
    Inputs  { vec3 InColor; vec3 InTint; }
    Outputs { vec3 OutColor; }
    Graph   { OutColor = InColor * InTint; }
}

Shader(Name="Materials/M_Emissive")
{
    Properties { vec3 Tint = vec3(1.0, 0.4, 0.1); }
    Settings   { ShadingModel = "Unlit"; }
    Outputs    { vec3 Color; Base.EmissiveColor = Color; }
    Graph      { Color = F_Tint(vec3(1.0, 1.0, 1.0), Tint); }
}
```

One compile of that file produces:

```text
/Game/Functions/F_Tint            UMaterialFunction, saved
/Game/Materials/M_Emissive        UDreamShaderMaterialInstance + hidden UMaterial base, Ephemeral in the editor
```

Result message:

```text
Generated MaterialFunction /Game/Functions/F_Tint.F_Tint from I:/.../M_Emissive.dsm.
Generated Material /Game/Materials/M_Emissive.M_Emissive from I:/.../M_Emissive.dsm.
```

## See also

- [Shader](/en/docs/plugin/language/shader) — the block that declares a material
- [ShaderFunction](/en/docs/plugin/language/shader-function) — the block that declares a material function
- [Source files](/en/docs/language/file-model) — what `.dsm`, `.dsf` and `.dsh` may contain
- [import](/en/docs/language/imports) — how a header is read into the file that imports it
- [Backend](/en/docs/settings/backend) — `Graph` vs `ThinCustom`, and the deprecated `Instance` alias
- [Project settings](/en/docs/settings/project) — auto-compile, debounce, default backend, paths
- [Commandlet](/en/docs/tools/commandlet) — `-run=DreamShader`, the headless generation entry point
- [Material Content Browser](/en/docs/plugin/tools/material-browser) — the Compile / Materialize surface
- [DreamShaderLang 2.0](/en/docs/language-v2) — the pipeline's stages and code ranges
- [Diagnostics index](/en/docs/diagnostics) — every code
