---
title: "Tools"
description: "Tools"
---

# Tools

> [DreamShader](/en/docs/) » **Tools**

The editor-side surface of DreamShader: the menus, the docked browser tab, the preview renderer, the
decompiler, the VirtualFunction actions, the asset-rename sync, the on-disk bridge, and the headless
commandlet.

| | |
| :-- | :-- |
| Implemented in | the `DreamShaderEditor` module (type `Editor`, loading phase `Default`) |
| Namespace | `UE::DreamShader::Editor::Private` — there is no public editor header |
| Plugin dependencies | `WebSocketNetworking` (preview streaming), `SQLiteCore` (bridge database) |
| Disabled by | the `-NoDreamShaderEditorBridge` command-line switch, and by any commandlet run |

Everything on this page runs inside `UnrealEditor.exe`. None of it is present in a packaged game: the
module is editor-only, and the runtime `DreamShader` module carries no UI.

## Pages

| Page | Covers |
| :-- | :-- |
| [Editor integration](/en/docs/tools/editor) | every menu entry, toolbar button, context-menu action and tab spawner, with labels, tooltips, icons and effects; the details panel of a Custom Pass pipeline *(2.1.0)* |
| [Material Content Browser](/en/docs/plugin/tools/material-browser) | the docked browser tab: sources and assets side by side with status, diagnostics, provenance, dependencies and inheritance; live preview; the instance factory and *Materialize*; `.dsp` pipelines and their *New* templates *(2.1.0)* |
| [Preview](/en/docs/plugin/tools/preview) | the thumbnail renderer, the streaming WebSocket preview, the mesh set and the limits |
| [Decompiler](/en/docs/tools/decompiler) | exporting an existing material, function, layer, blend or instance back to source: `.dss` / `.dsi` (2.0, the default) or `.dsm` / `.dsf`; a Custom Pass pipeline to `.dsp` *(2.1.0)* |
| [Migrate](/en/docs/language-v2/migrate) | `dsc migrate`: 1.x sources rewritten as `.dss`, each rewrite proved before it is written *(2.0)* |
| [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) | the conditional VirtualFunction context menu and the startup sync service |
| [Asset rename sync](/en/docs/plugin/tools/asset-rename-sync) | following a renamed or moved asset into the `.dsm` / `.dsf` / `.dsh` files that reference it *(since 1.9.0)* |
| [Workspace](/en/docs/plugin/tools/workspace) | the generated `DreamShader.code-workspace`, VSCode discovery and launch, the exported manifests — `pass-keys.json` among them *(2.1.0)* |
| [Packages](/en/docs/tools/packages) | `DShader/Packages`: what the plugin implements and what it does not |
| [Commandlet](/en/docs/tools/commandlet) | `-run=DreamShader` — headless compile, decompile, migrate, check and the IR tools; the Custom Pass slot registry, `pass-registry` *(2.1.0)* |
| [Bridge](/en/docs/plugin/tools/bridge) | request files, the diagnostics sinks, `bridge.db`, the WebSocket protocol; the watches on Custom Pass shader files *(2.1.0)* |

## Which side implements what

DreamShader ships as two independent products that talk through files in
`<Project>/Saved/DreamShader/Bridge/` and one loopback WebSocket. This manual documents the Unreal
plugin. Editor-extension behaviour is named only where the plugin's contract depends on it, and is
labelled as such.

| Surface | Implemented by | Notes |
| :-- | :-- | :-- |
| Menus, toolbar, context menus, tab | Unreal plugin | [Editor integration](/en/docs/tools/editor) |
| Auto-compile-on-save, diagnostics store | Unreal plugin | writes three diagnostic sinks; see [Bridge](/en/docs/plugin/tools/bridge) |
| Preview rendering (PNG frames) | Unreal plugin | the renderer, the mesh set and the clamps are plugin-side — [Preview](/en/docs/plugin/tools/preview) |
| Preview camera control, pitch clamping, frame acknowledgement | editor extension | the plugin applies no pitch clamp of its own |
| Decompiler | Unreal plugin | [Decompiler](/en/docs/tools/decompiler) |
| `.dss` / `.dsi` / `.dsm` / `.dsh` / `.dsf` syntax highlighting, completion, hovers | editor extension | fed by the manifests the plugin exports — [Workspace](/en/docs/plugin/tools/workspace) |
| `.dsp` highlighting and completion | editor extension | the plugin exports `pass-keys.json` and the symbol index for it — [Workspace](/en/docs/plugin/tools/workspace#pass-keysjson) *(2.1.0)* |
| `DreamShader.code-workspace` file | Unreal plugin | rewritten on every *Open Dream Shader Workspace* |
| Package manifest (`dreamshader.package.json`), lock file, install/update commands | editor extension | **no plugin C++ reads either file** — [Packages](/en/docs/tools/packages) |
| `DShader/Packages` directory creation, import resolution, auto-compile exclusion | Unreal plugin | [Packages](/en/docs/tools/packages) |

The editor extension is published separately as `TypeDreamMoon/dreamshader-language-support`; its
settings, commands and package store are outside the scope of this manual.

## Startup order

The bridge and the browser tab are registered from `StartupModule`. Skipping any of it also skips
everything below it.

| # | Step | Skipped when |
| :-- | :-- | :-- |
| 1 | If running a commandlet: install the cook hook when `-run=` contains `Cook` and `-cookworker` is absent, then stop | — |
| 1a | Register the [pass pipeline details panel](/en/docs/tools/editor#pass-pipeline-details-panel) *(since 2.1.0)* | a commandlet (step 1 stopped) |
| 2 | Bail out entirely | `-NoDreamShaderEditorBridge` is on the command line |
| 3 | Create and start the editor bridge | as above |
| 4 | Register the Material Content Browser nomad tab and its menu entries | as above |
| 5 | Subscribe the [asset rename sync service](/en/docs/plugin/tools/asset-rename-sync) to `OnAssetRenamed` *(since 1.9.0)* | as above, and when the asset registry is unavailable |

The bridge's own startup then resets `bridge.db`, exports the manifests (`pass-keys.json` with
`settings.json` *(since 2.1.0)*), runs the
[VirtualFunction sync service](/en/docs/plugin/tools/virtual-function-tools#startup-sync-service), queues a full scan,
opens the [preview WebSocket server](/en/docs/plugin/tools/preview#streaming-preview) on port `17864`, registers the
source-directory watcher, and installs the menus.

## Notes

- Menu registration is idempotent and bails during editor shutdown. Bridge menus are owned by the
  ToolMenu owner `DreamShaderEditor`; the browser tab's own entries use `DreamShaderMaterialBrowser`.
- Every editor log line goes to the `LogDreamShader` category.
- Toasts raised by the bridge expire after 4 seconds; toasts raised by the Material Content
  Browser's own actions (compile, materialize) expire after 3.5 seconds.
- The editor keeps a ThinCustom material Ephemeral — no `.uasset` — until it is materialized; a
  `Graph` material and a material function are saved by every successful compile *(since 2.0.0)*.
  See [Ephemeral materials](/en/docs/generation/in-memory).

## See also

- [Editor integration](/en/docs/tools/editor) — the complete menu and command surface
- [Project settings](/en/docs/settings/project) — the settings these tools read
- [Generation](/en/docs/generation/pipeline) — what a compile actually does
- [Diagnostics index](/en/docs/diagnostics) — every message, by stage
- [Getting started](/en/docs/plugin/getting-started) — the first-run walkthrough
