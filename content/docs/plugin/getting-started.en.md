---
title: "Getting started"
description: "Getting started"
---

# Getting started

> [DreamShader](/en/docs/) » **Getting started**

This page takes a project from "plugin copied in" to "a material generated from a text file".

## Install

1. Copy the plugin into the project:

   ```text
   MyProject/Plugins/DreamShader/
   ```

2. Enable **DreamShader** in *Edit ▸ Plugins* and restart the editor. DreamShader depends on the
   engine plugins `WebSocketNetworking` and `SQLiteCore`; both are enabled automatically.
3. Confirm the settings page exists: *Project Settings ▸ DreamPlugin ▸ DreamShader*.

| | |
| :-- | :-- |
| Engines | Unreal Engine `5.3` – `5.8`, Win64 verified |
| Modules loaded | `DreamShaderLang`, `DreamShader`, `DreamShaderPass` (runtime) and `DreamShaderCompiler`, `DreamShaderEditor` (editor) |

## Create the source directory

DreamShader reads source files from one directory under the project root, `DShader` by default
(*Project Settings ▸ DreamPlugin ▸ DreamShader ▸ Paths ▸ Source Directory*).

```text
MyProject/
├─ DShader/
│  ├─ Materials/        # .dss  — materials and material functions (DreamShaderLang 2.0)
│  │                    # .dsm  — a 1.x material, .dsf — 1.x material function assets
│  ├─ Instances/        # .dsi  — material instances
│  ├─ Shared/           # .dsh  — headers, included by other sources
│  └─ Packages/         # installed shared libraries
└─ Plugins/
   └─ DreamShader/
```

Folders are yours to choose; the extension is what matters. Write new sources as `.dss`; a `.dsm` /
`.dsf` is the 1.x syntax, which still builds — through the same compiler — so a project can migrate one
file at a time with [`dsc migrate`](/en/docs/language-v2/migrate). See [Source files](/en/docs/language/file-model)
and [DreamShaderLang 2.0](/en/docs/language-v2).

## Write a material

`MyProject/DShader/Materials/M_Minimal.dss`:

```hlsl
#pragma material(Domain = UI, ShadingModel = Unlit)

/// @group Look   @desc Base colour of the panel
uniform float3 Tint = float3(1.0, 0.2, 0.2);

export void M_Minimal(inout material m)
{
    m.EmissiveColor = Tint;
}
```

Or *Material Content Browser ▸ New ▾ ▸ Material (.dss)*, which writes the same shape from a template.

Save the file. With *Auto Compile On Save* enabled (the default), DreamShader compiles the source
after a short debounce and builds the material.

| Piece | Reference |
| :-- | :-- |
| `#pragma material(…)` | [Material settings](/en/docs/settings/material), [enum values](/en/docs/settings/enums) |
| `///` lines and `uniform` | material parameters and their metadata — [DreamShaderLang 2.0](/en/docs/language-v2) |
| `export void M_Minimal(inout material m)` | the entry: the one function that makes the file a material |
| `m.EmissiveColor = …` | a material output, checked against the engine's attribute list |

The asset lands under `/Game` at the file's folder relative to the source root, named after the
`export` function: this file produces `/Game/Materials/M_Minimal`. `/// @name` above the entry names
it otherwise — see [Asset paths](/en/docs/generation/asset-paths).

### The same material in 1.x syntax

A project that already has `.dsm` files keeps writing them; this one builds the same material:

```c
// MyProject/DShader/Materials/M_Minimal.dsm
Shader(Name="Materials/M_Minimal")
{
    Properties = {
        vec3 Tint = vec3(1.0, 0.2, 0.2) [Group="Look"; Description="Base colour of the panel"];
    }

    Settings = {
        Domain = "UI";
        ShadingModel = "Unlit";
    }

    Outputs = {
        vec3 Color;
        Base.EmissiveColor = Color;
    }

    Graph = {
        Color = Tint;
    }
}
```

| Piece | Reference |
| :-- | :-- |
| `Shader(Name=…)` | [`Shader`](/en/docs/plugin/language/shader) |
| `Properties = { … }` | [`Properties`](/en/docs/parameters/properties), [parameter catalogue](/en/docs/plugin/parameters) |
| `Settings = { … }` | [Material settings](/en/docs/settings/material) |
| `Base.EmissiveColor = …` | [Output bindings](/en/docs/plugin/language/output-bindings) |
| `Graph = { … }` | [Graph language](/en/docs/graph/overview) |

`Name` is the asset path relative to the root, and `Root` defaults to `Game`. Keep one of the two
files: both would build `/Game/Materials/M_Minimal`.

## Find the generated material

Under the default backend, **ThinCustom**, DreamShader generates the material **Ephemeral**: in memory,
with no `.uasset` on disk, and hidden from the Content Browser. This is deliberate — the source file is
the authoring surface, and hiding the asset prevents an accidental *Save* from materializing it. A
`Graph`-backend material (`#pragma material(Backend = Graph)`) is an ordinary asset, saved on every
build.

To work with the result:

- Open *Tools ▸ DreamShader ▸ Material Content Browser*. It lists the source files, their compile
  status and diagnostics, and the asset each one built.
- Or turn on *Tools ▸ DreamShader ▸ Show Ephemeral Materials* — or the setting of that name under
  *Project Settings ▸ DreamPlugin ▸ DreamShader ▸ Compiler* — to show them in the Content Browser and
  asset pickers.
- Or *Materialize* one from the browser when you need a real asset on disk.

Cooking materializes the assets automatically. See [Ephemeral materials](/en/docs/generation/in-memory).

## When something fails

Every diagnostic carries a `DSHnnnn` code, and is reported at its own line and column:

```text
I:/MyProject/DShader/Materials/M_Minimal.dss(8,24): DSH4200: 'Tnt' is not declared; did you mean 'Tint'? Names are case-sensitive.
```

It goes to the Output Log, to the Material Content Browser, and to the bridge files the VSCode
extension reads. Look the code up in the [diagnostics catalogue](/en/docs/plugin/diagnostics/readme); where
diagnostics appear and how to read one is on [Diagnostics](/en/docs/diagnostics).

## Next steps

| | |
| :-- | :-- |
| [Examples](/en/docs/plugin/examples) | Complete sources for parameters, functions, layers, Substrate, and more |
| [DreamShaderLang 2.0](/en/docs/language-v2) | The `.dss` language: declarations, `///` metadata, the pipeline |
| [Material instances](/en/docs/language-v2/instances) | `.dsi` — an instance as a source file |
| [Language reference (1.x)](/en/docs/plugin/language) | The 1.x declaration grammar, for `.dsm` / `.dsf` sources |
| [Graph language (1.x)](/en/docs/graph/overview) | What a 1.x `Graph = { … }` accepts — and what it does not |
| [Editor tools](/en/docs/plugin/tools) | Browser, decompiler, VSCode workspace, headless commandlet |
| [`dsc migrate`](/en/docs/language-v2/migrate) | Rewrite a 1.x source as `.dss`, proved before it is written |
| [Custom Pass pipelines](/en/docs/custom-pass) | *(UE 5.8, since 2.1.0)* Render passes of your own from a `.dsp` source — fullscreen, compute and mesh passes, run by the [Custom Pass runtime](/en/docs/plugin/runtime) |
| [Project settings](/en/docs/settings/project) | Every setting and its default |

## See also

- [Main page](/en/docs/)
- [Regeneration](/en/docs/generation/regeneration) — what a rebuild overwrites
- [Contributing](/en/docs/plugin/contributing) — building the plugin from source
