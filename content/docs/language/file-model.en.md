---
title: "Source Files"
description: "The three 1.x file kinds, what each may declare, how that rule is enforced, and how a file is compiled together with the headers it imports."
---

# Source files

> [DreamShader](/en/docs/) » [DreamShaderLang](/en/docs/plugin/language) » **Source files**

The three DreamShaderLang file kinds — `.dsm`, `.dsf` and `.dsh` — and the rule that decides which
top-level blocks each may contain.

| | |
| :-- | :-- |
| Declared in | — |
| Kind | translation unit |
| Extensions | `.dsm` material · `.dsf` function *(since 1.3.5)* · `.dsh` header |
| Discovered under | `<Project>/DShader` by default, plus every enabled plugin's `DShader`; configurable |
| Enforced by | the legacy front end (what a `.dsh` may hold, one `Shader` per file) and the binder (one kind of product per file) *(since 2.0.0)* |

## Synopsis

```c
// <name>.dsm — Dream Shader Material
[ import "<header>.dsh" ; ]…
[ Shader( Name = "…" [, Root = "…"] ) { … } ]          // at most one per file
[ { VirtualFunction | Namespace | Function | GraphFunction } … ]…
```

```c
// <name>.dsf — Dream Shader Function
[ import "<header>.dsh" ; ]…
[ { ShaderFunction | ShaderLayer | ShaderLayerBlend }( Name = "…" [, Root = "…"] ) { … } ]…
[ { VirtualFunction | Namespace | Function | GraphFunction } … ]…
```

```c
// <name>.dsh — Dream Shader Header
[ import "<header>.dsh" ; ]…
[ { VirtualFunction | Namespace | Function | GraphFunction } … ]…     // and 2.0 declarations, side by side
```

## What each kind may contain

| Top-level block | `.dsm` | `.dsf` | `.dsh` | Reference |
| :-- | :-- | :-- | :-- | :-- |
| `Shader` | one | no — [`DSH2259`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2259) | no | [Shader](/en/docs/plugin/language/shader) |
| `ShaderFunction` | yes | yes | no | [ShaderFunction](/en/docs/plugin/language/shader-function) |
| `ShaderLayer` | yes | yes | no | [ShaderLayer](/en/docs/plugin/language/shader-layer) |
| `ShaderLayerBlend` | yes | yes | no | [ShaderLayerBlend](/en/docs/plugin/language/shader-layer) |
| `MaterialLayer` *(deprecated in 1.3.0)* | yes | yes | no | [ShaderLayer](/en/docs/plugin/language/shader-layer) |
| `MaterialLayerBlend` *(deprecated in 1.3.0)* | yes | yes | no | [ShaderLayer](/en/docs/plugin/language/shader-layer) |
| `VirtualFunction` | yes | yes | yes | [VirtualFunction](/en/docs/plugin/language/virtual-function) |
| `Namespace` | yes | yes | yes | [Namespace](/en/docs/plugin/language/namespace) |
| `Function` | yes | yes | yes | [Function](/en/docs/plugin/language/function) |
| `GraphFunction` | yes | yes | yes | [GraphFunction](/en/docs/plugin/language/graph-function) |
| `import` of a `.dsh` | yes | yes | yes | [`import`](/en/docs/language/imports) |
| 2.0 declarations (`uniform`, `export`, `#pragma`, …) | no | no | yes | [DreamShaderLang 2.0](/en/docs/language-v2) |

A `.dsm` builds its `Shader` and every `ShaderFunction` or layer block beside it, each into its own
asset, as 1.x did; the material may call such a function by name *(2.0.0 – 2.1.0 refused it with [`DSH6201`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6201))*.
A `.dss` makes a material or function assets, not both
([`DSH6201`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6201)), so [`dsc migrate`](/en/docs/language-v2/migrate) cannot
rewrite such a file as one `.dss`: give each function a `.dsf` of its own first.

## How the restriction is enforced

*(since 2.0.0)* By the parser, one declaration at a time, and by the binder over the declarations of
one file.

| Rule | Checked by | Code |
| :-- | :-- | :-- |
| a `.dsh` holds no asset block (`Shader`, `ShaderFunction`, `ShaderLayer`, `ShaderLayerBlend` or an old spelling of a layer) | the legacy front end, at the block word | [`DSH2249`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2249) |
| a `.dsm` / `.dsf` holds 1.x blocks only — a `uniform`, an `export`, a `#pragma` is 2.0 syntax | the legacy front end | [`DSH2248`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2248) |
| a `.dss` holds 2.0 declarations only — a 1.x block word there | the 2.0 parser | [`DSH3222`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3222) |
| one `Shader` block per file | the legacy front end | [`DSH2250`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2250) |
| a `.dsf` holds no `Shader` block | the legacy front end, at the block word | [`DSH2259`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2259) |
| a `.dsm` / `.dsf` declares at least one block | the legacy front end | [`DSH2254`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2254) |
| an `import` names a `.dsh` | the legacy front end | [`DSH2252`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2252) |

A `.dsh` may hold 1.x blocks and 2.0 declarations side by side, so a project can migrate one file at
a time. A comment or a string that mentions `Shader(` is just a comment or a string.

> [!NOTE]
> **Through 1.9.x** the rule was a case-insensitive **substring scan** of each file's text, after its
> `import` lines were removed: a `.dsh` was refused for containing `Shader(`, `ShaderFunction(`, … —
> in a comment or a string too — and a `.dsf` for containing `Shader(`, while `Shader (` with a space
> slipped past. Nothing scans text any more: the front end reads the block word, so a `.dsf` with a
> `Shader` block is `DSH2259` however it is spaced *(2.0.0 – 2.1.0 did not refuse it, and the file
> built a material like a `.dsm`)*. See [the retired parser page](/en/docs/plugin/api/parser).

## Source roots

Discovery runs over a list of **source roots**, not a single directory.

| Root | Directory | Writable | Contributed when |
| :-- | :-- | :-- | :-- |
| Project | *Source Directory*, `<Project>/DShader` by default | yes | always |
| *(one per plugin)* | `<Plugin>/DShader` | no | the plugin is enabled, the folder exists, and *Scan Plugin Source Directories* is on |

Each root owns a `Packages` folder of its own at `<Root>/Packages`. A root is the unit of import
resolution: an import specifier is resolved against the bases of the root that owns the importing
file and never against another root's — see [`import`](/en/docs/language/imports#roots).

Only the project root is **writable**. Plugin roots are discovered, parsed and compiled like any
other source, but the editor never rewrites a file under one: [VirtualFunction
sync](/en/docs/plugin/tools/virtual-function-tools) skips them, and every editor action that writes a source
file targets the project root.

> [!NOTE]
> A plugin `DShader` folder that overlaps an existing root is ignored, with a warning naming both.
> This happens when *Source Directory* is pointed at a plugin folder, or at a directory containing
> one; without the check the same file would belong to two roots and its imports would resolve by
> scan order.

The source-directory watcher registers one watch per root, so *Auto Compile On Save* fires for a
plugin's sources exactly as it does for the project's.

> [!NOTE]
> The root list is cached. A `DShader` folder created while the editor is open appears when
> **Refresh** (`F5`) is pressed in the [Material Content Browser](/en/docs/plugin/tools/material-browser); its
> **watch**, registered once at startup, attaches on the next editor start, so that root's *Auto
> Compile On Save* begins working then.

A file under a plugin root that declares no `Root=` defaults to **that plugin's mount point** rather
than to `/Game` — a `.dsm` in `Plugins/MoonToon/DShader` generates into `/MoonToon` with no attribute
at all. Write `Root="/"` to opt back into `/Game`. See
[Asset paths](/en/docs/generation/asset-paths#the-plugin-source-root-default).

## File discovery

Files are found by recursive scans of every source root. Directories are not returned, and every
result is normalized to a full path.

| Scan | Extensions | Excluded | Used for |
| :-- | :-- | :-- | :-- |
| All source files | `.dsm`, `.dsf`, `.dsh`; on the 2.0 line also `.dss`, `.dsi` and *(since 2.1.0)* `.dsp` | everything under any root's packages directory | dependency graph, workspace generation, editor file lists (result sorted) |
| Generatable files | `.dsm`, `.dsf`; on the 2.0 line also `.dss`, `.dsi` and *(since 2.1.0)* `.dsp` — never `.dsh` | `.dsm` files under any root's packages directory | batch compile / generate-all |

> [!NOTE]
> The two exclusions are not symmetric. The all-sources scan drops **every** file under a packages
> directory; the generatable scan drops only package **`.dsm`** files. A `.dsf` shipped inside
> `DShader/Packages` is therefore still picked up as a generatable file and will produce function
> assets on a generate-all — and on the 2.0 line so is a `.dss`, a `.dsi` or a `.dsp` there.

*(since 2.0.0)* The command-line verbs that name their files with `-All` use scans of their own:

| `-All` of | Extensions | Excluded |
| :-- | :-- | :-- |
| `compile` | the all-sources scan without `.dsh`, every `.dsf` first | everything under any root's packages directory |
| `check`, `dump-ir`, `dump-layout`, `index`, `list-generated` | `.dss`, `.dsi`, `.dsp`, `.dsm`, `.dsf` | everything under any root's packages directory |
| `fmt` | `.dss`, `.dsi`, `.dsp`, `.dsh` | everything under any root's packages directory, and every root that is not writable — a plugin's sources are formatted only when named |

The 2.0 kinds are described under [DreamShaderLang 2.0](/en/docs/language-v2):
[`.dsi`](/en/docs/language-v2/instances) material instances and *(UE 5.8)*
[`.dsp`](/en/docs/language-v2/passes) Custom Pass pipelines.

| Directory | Default | Project setting |
| :-- | :-- | :-- |
| Source | `<Project>/DShader` | *Source Directory* |
| Packages | `<Source>/Packages` | derived from *Source Directory*; not separately configurable |
| Plugin source | `<Plugin>/DShader` | *Scan Plugin Source Directories* (on/off only; the path is fixed) |
| Plugin packages | `<Plugin>/DShader/Packages` | derived; not separately configurable |
| Generated shaders | `<Project>/Intermediate/DreamShader/GeneratedShaders` | *Generated Shader Directory* |

A configured path that is relative is resolved against the project directory. The project's source,
packages and generated-shader directories are created at module startup; a plugin's `DShader` folder
is never created, only discovered. See [Project settings](/en/docs/settings/project) and
[Packages](/en/docs/tools/packages).

## What each kind generates

| Kind | Compiled as | Produces |
| :-- | :-- | :-- |
| `.dsm` | material entry point | the `UMaterial` (or ThinCustom instance) of its `Shader` block |
| `.dsf` | asset entry point | the function assets it declares |
| `.dsh` | not an entry point | nothing; a header is read through the [`import`](/en/docs/language/imports) of the file that names it, and compiling one on its own is [`DSH8296`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8296) |

A `.dsm` with no `Shader` block is still compilable — it produces whatever function assets it does
declare. A compile builds what its own file declares, and never what a header it imports declares:
a header holds no asset block.

## Notes

- **Extensions are compared case-insensitively.** `M_Water.DSM` is a material file.
- **At most one `Shader` per file** ([`DSH2250`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2250)). Through 1.9.x
  imports were inlined into one text before parsing, so the limit spanned the whole import closure;
  since 2.0.0 a header is read on its own and cannot hold a `Shader` at all, so an import never adds
  one.
- A `.dsh` is the natural home for `VirtualFunction` declarations; the editor's *Create Virtual
  Function* action writes one under `DShader/VirtualFunctions`. See
  [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools).
- Only a `.dsh` can be imported *(since 2.0.0)*. An `import` of a `.dsf` or a `.dsm` is
  [`DSH2252`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2252): a material or function file is compiled on its own,
  and its assets are reached from another file through a [`VirtualFunction`](/en/docs/plugin/language/virtual-function).

## Diagnostics

| Code | Raised when |
| :-- | :-- |
| [`DSH2249`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2249) | a `.dsh` holds an asset block |
| [`DSH2248`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2248) | a `.dsm` / `.dsf` holds 2.0 syntax |
| [`DSH3222`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3222) | a `.dss` holds a 1.x block |
| [`DSH2250`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2250) | a second `Shader` block in one file |
| [`DSH2259`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2259) | a `.dsf` holds a `Shader` block |
| [`DSH2254`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2254) | a `.dsm` / `.dsf` declares no block at all |
| [`DSH2252`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2252) | an `import` the include resolver does not read — see [`import`](/en/docs/language/imports#diagnostics) |
| [`DSH8296`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8296) | a file that is not a source the compiler builds — a `.dsh`, or another extension — was asked to compile |

The codes of an `import` that cannot be resolved, read or parsed, and of a cycle, are on
[`import`](/en/docs/language/imports#diagnostics). Every code: [diagnostics](/en/docs/plugin/diagnostics/readme).

## Example

```text
<Project>/DShader/
├── Materials/
│   └── M_Water.dsm
├── Functions/
│   └── F_Tint.dsf
├── Shared/
│   └── Common.dsh
└── Packages/
    └── @typedreammoon/
        └── dream-noise/
            └── Library/
                └── Noise.dsh
```

```c
// DShader/Shared/Common.dsh — header: helpers only
Namespace(Name="Common")
{
    Function ApplyTint(in vec3 color, in vec3 tint, out vec3 result) {
        result = color * tint;
    }
}
```

```c
// DShader/Functions/F_Tint.dsf — function file: declares ShaderFunction blocks
import "Shared/Common.dsh";

ShaderFunction(Name="Functions/F_Tint")
{
    Inputs = {
        vec3 InColor;
        opt float Strength = 1.0;
    }

    Outputs = {
        vec3 OutColor;
    }

    Graph = {
        OutColor = Common::ApplyTint(InColor, vec3(1.0, 0.9, 0.8)) * Strength;
    }
}
```

```c
// DShader/Materials/M_Water.dsm — material file: one Shader block
import "Shared/Common.dsh";

Shader(Name="Materials/M_Water")
{
    Outputs = {
        vec3 Color;
        Base.EmissiveColor = Color;
    }

    Graph = {
        Color = Common::ApplyTint(vec3(0.1, 0.3, 0.6), vec3(1.0, 0.9, 0.8));
    }
}
```

Each source builds its own asset; the header builds nothing and is read by both:

```text
M_Water.dsm   ->  /Game/Materials/M_Water        UMaterial
F_Tint.dsf    ->  /Game/Functions/F_Tint         UMaterialFunction
Common.dsh    ->  (nothing)
```

## See also

- [`import`](/en/docs/language/imports) — how a header is found, read and declared into the file that imports it
- [Shader](/en/docs/plugin/language/shader) — the `.dsm`-only top-level block
- [ShaderFunction](/en/docs/plugin/language/shader-function) — the block a `.dsf` normally holds
- [VirtualFunction](/en/docs/plugin/language/virtual-function) — declaring an existing asset from a `.dsh`
- [Lexical elements](/en/docs/language/lexical) — comments and strings
- [Packages](/en/docs/tools/packages) — `DShader/Packages` and the `@scope/name` layout
- [Project settings](/en/docs/settings/project) — *Source Directory* and *Generated Shader Directory*
- [Commandlet](/en/docs/tools/commandlet) — compiling files headlessly
- [Testing](/en/docs/plugin/contributing/testing) — the `Tests/Corpus` fixture format
