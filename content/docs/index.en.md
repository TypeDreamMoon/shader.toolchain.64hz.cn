---
title: "Overview"
description: "DreamShaderLang is a text language for Unreal Engine materials, compiled by the DreamShader plugin into ordinary material assets; on UE 5.8, .dsp sources add render passes of your own."
---

# DreamShader reference

For tutorials and task-oriented reading, start at the [documentation overview](/en/docs/plugin/readme).

DreamShader compiles **DreamShaderLang** source files — `.dsm`, `.dsf`, `.dsh` and, on the 2.0 line,
`.dss` — into standard Unreal Engine material assets: `UMaterial`, `UMaterialFunction`,
`UMaterialFunctionMaterialLayer`, and `UMaterialFunctionMaterialLayerBlend` — and, on Unreal Engine 5.8,
`.dsp` [Custom Pass](#custom-pass) pipelines into `UDreamPassPipeline` assets that add render passes of
your own. Source files are the authoring surface; the assets are build output and can always be
regenerated.

| | |
| :-- | :-- |
| Version | `2.2.0` |
| Engines | Unreal Engine `5.3` – `5.8` (Win64 verified); Custom Pass needs `5.8` |
| Modules | `DreamShaderLang` (Runtime), `DreamShader` (Runtime), `DreamShaderPass` (Runtime), `DreamShaderCompiler` (Editor), `DreamShaderEditor` (Editor) |
| Source extensions | `.dsm` material · `.dsf` function · `.dsh` header · `.dss` 2.0 compilation unit · `.dsi` material instance · `.dsp` Custom Pass pipeline |
| Project settings | *Project Settings ▸ DreamPlugin ▸ Dream Shader* |
| License | MIT |

New here? Start with **[Getting started](/en/docs/plugin/getting-started)**, then **[Examples](/en/docs/plugin/examples)**.

---

## DreamShaderLang

> [!NOTE]
> Two syntaxes, one compiler. The **1.x** syntax documented below (`.dsm` / `.dsf` / `.dsh`) is the
> one that ships. The **2.0** syntax — `.dss`, HLSL with declarations instead of section blocks —
> compiles through the new binder/IR/emitter pipeline on the `2.0` line and has its own page:
> **[DreamShaderLang 2.0](/en/docs/language-v2)**.

### [Language reference](/en/docs/plugin/language)

The declaration grammar: source files, blocks, and sections.

| | |
| :-- | :-- |
| [Source files](/en/docs/language/file-model) | `.dsm` / `.dsf` / `.dsh` and what each may contain |
| [Lexical elements](/en/docs/language/lexical) | Comments, identifiers, case sensitivity, literals, suffixes |
| [Keyword index](/en/docs/plugin/language/keywords) | Every reserved word and alias, with links |
| [`import`](/en/docs/language/imports) | Including headers, functions, and packages |
| [Preprocessor](/en/docs/plugin/language/preprocessor) | `#if` and the define table — conditional compilation |
| [Types](/en/docs/language/types-and-values) | Type tokens, GLSL aliases, per-context validity |

**Top-level blocks**

| | |
| :-- | :-- |
| [`Shader`](/en/docs/plugin/language/shader) | Generates a `UMaterial` |
| [`ShaderFunction`](/en/docs/plugin/language/shader-function) | Generates a `UMaterialFunction` |
| [`ShaderLayer` / `ShaderLayerBlend`](/en/docs/plugin/language/shader-layer) | Generates native material layer functions |
| [`VirtualFunction`](/en/docs/plugin/language/virtual-function) | Declares an existing `UMaterialFunction` |
| [`Function`](/en/docs/plugin/language/function) | Reusable HLSL helper |
| [`GraphFunction`](/en/docs/plugin/language/graph-function) | HLSL helper that may pull `UE.*` nodes into its inputs |
| [`Namespace`](/en/docs/plugin/language/namespace) | Groups helpers under `Ns::Name` |

**Sections**

| | |
| :-- | :-- |
| [`Properties`](/en/docs/parameters/properties) | Parameter declarations and group scopes |
| [`Inputs` / `Outputs`](/en/docs/plugin/language/inputs-outputs) | Function signatures and material outputs |
| [Output bindings](/en/docs/plugin/language/output-bindings) | `Base.<Target> = <value>;` |
| [`Settings`](/en/docs/plugin/settings) | Material and function settings |
| [`Options`](/en/docs/plugin/language/options) | `VirtualFunction` asset binding |
| [`Layout`](/en/docs/language/layout) | Node placement, comment boxes, `#Region` |

### [Graph language](/en/docs/graph/overview)

The statement and expression language inside `Graph = { ... }`, which materialises material nodes.

| | |
| :-- | :-- |
| [Statements](/en/docs/graph/statements) | Every statement form |
| [Declarations](/en/docs/plugin/graph/declarations) | Variables, initialisers, scope |
| [Expressions and operators](/en/docs/graph/expressions) | Precedence, operand rules, integer division |
| [Literals](/en/docs/plugin/graph/literals) | Numeric, boolean, suffixes |
| [Constructors](/en/docs/plugin/graph/constructors) | `float3(...)`, `vec4(...)`, integer constructors |
| [Swizzles](/en/docs/plugin/graph/swizzle) | Channel masks, reorder, repeat |
| [Conversions](/en/docs/plugin/graph/conversions) | Widening, narrowing, component-count rules |
| [`if` / `else`](/en/docs/graph/control-flow) | Conditions, truthiness, branch selection |
| [`MaterialAttributes`](/en/docs/plugin/graph/material-attributes) | Struct-like member writes |
| [Calls](/en/docs/graph/calls) | Calling functions and parameter pins |
| [Name resolution](/en/docs/plugin/graph/name-resolution) | Lookup order and shadowing |
| [Node reuse](/en/docs/plugin/graph/node-reuse) | Common-subexpression deduplication |
| [Unsupported constructs](/en/docs/graph/unsupported) | Loops, `return`, `%`, indexing — and what happens instead |

---

## Node library

### [Builtins](/en/docs/plugin/builtins)

| | |
| :-- | :-- |
| [`UE.*` catalogue](/en/docs/builtins/ue-nodes) | Every named material-node builtin |
| [`UE.Expression`](/en/docs/builtins/ue-expression) | The generic reflected-node escape hatch |
| [`OutputType` values](/en/docs/plugin/builtins/output-type) | Every accepted output-type token |
| [Math builtins](/en/docs/builtins/math) | `lerp`, `saturate`, `frac`, … |
| [Transform builtins](/en/docs/plugin/builtins/transform) | `UE.TransformVector` / `UE.TransformPosition` bases |
| [`Substrate.*`](/en/docs/builtins/substrate) | Substrate nodes (UE 5.4+) |
| [Custom Pass nodes](/en/docs/builtins/dream-pass) | `UE.DreamPassOutput`, `UE.DreamPassBuffer` (UE 5.8) |
| [`DreamShaderBuiltins.ush`](/en/docs/custom-pass/hlsl) | Shipped HLSL helper header |

### [Parameters](/en/docs/plugin/parameters)

| | |
| :-- | :-- |
| [Compact types](/en/docs/plugin/parameters/compact-types) | `float`, `float3`, `Texture2D`, … |
| [Parameter nodes](/en/docs/plugin/parameters/parameter-nodes) | `ScalarParameter`, `StaticSwitchParameter`, … |
| [Metadata block](/en/docs/parameters/metadata) | `Group`, `SortPriority`, `Slider`, reflected properties |
| [`SamplerType`](/en/docs/plugin/parameters/sampler-type) | Texture sampler configuration |
| [Using parameters in `Graph`](/en/docs/plugin/parameters/graph-usage) | Value reads and pin call forms |
| [`Path(...)`](/en/docs/parameters/path) | Asset references |

---

## Custom Pass

Render passes of your own on Unreal Engine 5.8, without changing the engine: masks and custom buffers,
screen-space effects, compute shaders writing data textures.

| | |
| :-- | :-- |
| [Pipelines — `.dsp`](/en/docs/language-v2/passes) | Buffers, passes, injection points, bindings, mesh selection, what the compiler checks |
| [Runtime](/en/docs/custom-pass) | What makes a pipeline apply, when passes run, built-in and exported buffers, views, debugging, limits |
| [HLSL passes](/en/docs/plugin/pass-runtime/hlsl) | The fixed parameters, slots, snapshots and the pre-check |
| [Material nodes](/en/docs/builtins/dream-pass) | `UE.DreamPassOutput` for mesh passes, `UE.DreamPassBuffer` to read an exported buffer |
| [Examples](/en/docs/examples/custom-pass) | Highlight outline, UI frosted glass, X-ray, wind field |
| [`DreamShaderPass`](/en/docs/plugin/api/pass-module) | The module's C++ and Blueprint API |

---

## Build and output

### [Settings](/en/docs/plugin/settings)

| | |
| :-- | :-- |
| [Material settings](/en/docs/settings/material) | Special keys plus reflected `UMaterial` properties |
| [Enum values](/en/docs/settings/enums) | Every `ShadingModel`, `BlendMode`, `Domain` |
| [`Backend`](/en/docs/settings/backend) | `ThinCustom` vs `Graph` |
| [Function settings](/en/docs/plugin/settings/function) | Keys honoured by material functions |
| [Project settings](/en/docs/settings/project) | *DreamPlugin ▸ Dream Shader* |

### [Generation](/en/docs/generation/pipeline)

| | |
| :-- | :-- |
| [Asset paths](/en/docs/generation/asset-paths) | `Name=` and `Root=` to package and disk paths |
| [Ephemeral materials](/en/docs/generation/in-memory) | The thin instance, hidden base, cook behaviour |
| [Caching](/en/docs/plugin/generation/caching) | Source hashing and skipped rebuilds |
| [Graph layout](/en/docs/plugin/generation/graph-layout) | Automatic placement and its limits |
| [Regeneration](/en/docs/generation/regeneration) | What survives a rebuild and what does not |
| [Divergence](/en/docs/plugin/generation/divergence) | Hand-edited assets: detection, and the three ways out |
| [NoGeneration](/en/docs/generation/no-generation) | Sources only a compile that names them builds |
| [Generated HLSL](/en/docs/plugin/generation/generated-hlsl) | The emitted `.ush` include |

---

## Tooling

### [Editor tools](/en/docs/plugin/tools)

| | |
| :-- | :-- |
| [Editor integration](/en/docs/tools/editor) | Menus, toolbar, context menus |
| [Material Content Browser](/en/docs/plugin/tools/material-browser) | Browse, filter, instance, materialize |
| [Preview](/en/docs/plugin/tools/preview) | Thumbnail and streaming preview |
| [Decompiler](/en/docs/tools/decompiler) | Export existing materials, instances and Custom Pass pipelines to source |
| [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) | Declare and sync existing functions |
| [Workspace and editor extensions](/en/docs/plugin/tools/workspace) | VSCode workspace, VSCode and Rider plugins |
| [Packages](/en/docs/tools/packages) | `DShader/Packages` shared libraries |
| [Commandlet](/en/docs/tools/commandlet) | Headless compile and decompile |
| [Editor bridge](/en/docs/plugin/tools/bridge) | Request files, WebSocket protocol, artifacts |

### [C++ API](/en/docs/plugin/api)

| | |
| :-- | :-- |
| [`DreamShaderModule.h`](/en/docs/plugin/api/dreamshader-module) | Module, log category, exported functions |
| [`DreamShaderTypes.h`](/en/docs/plugin/api/types) | The parsed-source data model |
| [`DreamShaderParser.h`](/en/docs/plugin/api/parser) | Retired in 2.0 — what replaced the 1.x parser entry point |
| [`DreamShaderSettings.h`](/en/docs/plugin/api/settings) | `UDreamShaderSettings` |
| [`DreamShaderMaterialInstance.h`](/en/docs/plugin/api/material-instance) | The generated instance class |
| [`DreamShaderVersionCompat.h`](/en/docs/plugin/api/version-compat) | Engine-version macros |
| [`DreamShaderCompiler`](/en/docs/plugin/api/compiler-module) | Compiler interfaces and service |
| [`DreamShaderPass`](/en/docs/plugin/api/pass-module) | Custom Pass: the pipeline asset, settings, subsystem, volume and components |

---

## Reference

| | |
| :-- | :-- |
| [Diagnostics index](/en/docs/diagnostics) | Every error and warning, with cause and fix |
| [Disabling diagnostics](/en/docs/language-v2/disable-diagnostics) | `disable_warning` / `disable_error`, for a file or a line |
| [Examples](/en/docs/plugin/examples) | Complete, copy-pasteable sources |
| [Contributing](/en/docs/plugin/contributing) | Building the plugin |
| [Testing](/en/docs/plugin/contributing/testing) | Automation suite and the fixture corpus |
| [Release](/en/docs/plugin/contributing/release) | Tagging and packaging |

---

## External links

| | |
| :-- | :-- |
| Repository | <https://github.com/TypeDreamMoon/DreamShader> |
| Issues | <https://github.com/TypeDreamMoon/DreamShader/issues> |
| Documentation site | <https://shader.toolchain.64hz.cn/> |
| VSCode extension | <https://github.com/TypeDreamMoon/dreamshader-language-support> |
| Rider plugin | <https://github.com/tsdaer/dreamshader-language-support> |
| Changelog | [../CHANGELOG.md](https://github.com/TypeDreamMoon/DreamShader/blob/b5169970e3e8fb75199b1c0cef17d213ca3a3573/CHANGELOG.md) |
