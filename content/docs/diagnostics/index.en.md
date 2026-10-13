---
title: "Diagnostics"
description: "Where DreamShader's diagnostics appear, how to read one, how the DSHnnnn codes are banded, their severities, a table of the common ones by stage, and the 1.x messages mapped to their codes."
---

# Diagnostics

> [DreamShader](/en/docs/) » **Diagnostics**

Where DreamShader's diagnostics appear, how to read one, and what became of the messages of the 1.x
generator. Every diagnostic a compile raises has a stable `DSHnnnn` code *(since 2.0.0)*; the codes are
the contract, the wording is not. The catalogue is [README.md](/en/docs/plugin/diagnostics/readme) — every code with its
severity and message — and each code has a section on its page, `DSH1xxx.md` … `DSH9xxx.md`, with every
message raised under it, the places that raise it, a cause and a fix.

| | |
| :-- | :-- |
| Produced by | `DreamShaderLang` — the preprocessor, both front ends, the binder, the IR and its validator · `DreamShaderCompiler` — the pipeline, the include resolver, the emitter, the asset layer · `DreamShaderEditor` — the bridge, the commandlet verbs and the tools |
| Log category | `LogDreamShader` |
| Wire form | `<file>(<line>,<column>): DSHnnnn: <message>`, English whatever the editor's language |
| Severity | `error`, `warning` or `info` — a compile's records keep their own *(since 2.1.0)*; the few records a compile does not explain are `error` |
| Bridge artifacts | `<Project>/Saved/DreamShader/Bridge/diagnostics.json`, `.../Bridge/diagnostics/`, `.../Bridge/bridge.db` |

> [!NOTE]
> **Through 1.9.x** most messages had no code: the 1.x parser coded its own, the 1.x generator's ~560
> raise sites reported bare text, and this page catalogued that text verbatim. The generator and the
> parser are gone, and none of those strings is raised any more. If you have one in an old log or a
> search result, [1.x messages and their codes](#1x-messages-and-their-codes) maps the common ones.

## Where diagnostics appear

| Surface | What it shows | Implemented by |
| :-- | :-- | :-- |
| **Output Log** | the compile's report under `LogDreamShader`: at `Error` on failure — every record as a wire line, errors first, then warnings, then notes — and at `Display` on success — the `Generated …` / `Skipped …` lines, then a `Warnings:` block | plugin |
| **[Material Content Browser](/en/docs/plugin/tools/material-browser)** | each source's records, read from the bridge's diagnostics store in memory; the first error is shown on the source's row | plugin |
| **`Bridge/diagnostics.json`** | `{ version, updatedAtUtc, files[] }`, one entry per file | plugin |
| **`Bridge/diagnostics/`** | one `<md5-of-normalized-path>.json` shard per file plus `index.json`; stale shards are deleted on every write | plugin |
| **`Bridge/bridge.db`** | SQLite table `diagnostics(path, json, updated_at_utc)`, replaced wholesale in one transaction | plugin |
| **`-DiagnosticsOut=<file>`** | one commandlet run's diagnostics as JSON (schema `dreamshader-diagnostics`) — see [Commandlet](/en/docs/tools/commandlet) | plugin |
| **VSCode / Rider extension squiggles** | rendered from the three bridge artifacts above | **extension side**, not the plugin |

All three bridge sinks are written together on every diagnostics update, so they never disagree. The
Output Log is a separate path and is the only surface that shows *success* lines.

Diagnostics are owned by the source and the **run** that produced them. There are three kinds of run:
the compile of a source, the shader compile of one material it generated, and the startup
VirtualFunction scan of a file.

| Run | What it replaces |
| :-- | :-- |
| the compile of `A.dsm` | exactly what A's previous compile filed — against A, and against any header A imports. What `B.dsm` filed against the same header stays. It also retires what the startup VirtualFunction scan said about A and its headers |
| the shader compile of one material | that material's shader-compile records, when its shader compile finishes, ticks after the compile that generated it — never the compile's own warnings |
| the startup VirtualFunction scan | its records for the file it scanned |
| deleting a file | everything the file owns, from every kind of run, and every record filed against it, whoever filed it |

Within one file the records run compile first, then shader compile, then the VirtualFunction scan, by
source within each, so the first error of a file is its compile's. See [Bridge](/en/docs/plugin/tools/bridge).

> [!NOTE]
> The bridge never runs inside a commandlet. `-run=DreamShader`, `-run=Cook` and any other commandlet
> process writes no `diagnostics.json`, no shards and no `bridge.db` rows; the messages exist only in
> the log (and in a `-DiagnosticsOut` file). The bridge is also suppressed by
> `-NoDreamShaderEditorBridge`. See [Commandlet](/en/docs/tools/commandlet).

## Severity

A compile files its own records with the severity each was raised at -- a failed compile all of them, a
successful one its warnings and notes *(since 2.1.0; before, every stored diagnostic was `error` and a
successful compile's warnings reached the Output Log only)*. The records the compile does not explain --
`generate-error`, `material-compile`, `virtual-function-sync` -- are `error`. The field and its values are
on [Bridge](/en/docs/plugin/tools/bridge).

Log-only warnings (`UE_LOG(LogDreamShader, Warning, …)`) that are not a compile's records never enter the
store. A client tolerates a missing or unknown severity by treating it as an error.

## Message locations

A diagnostic is printed MSVC-style, with its code:

```text
I:/Project/DShader/Materials/M_Sample.dsm(8,19): DSH4200: 'Tin' is not declared in this scope.
```

| Diagnostic | Where its position comes from |
| :-- | :-- |
| a compile's record | the line and column of the construct, from the token it was raised at — in a section body, in a `Graph`, in an included header alike. A record raised inside a header names the **header**, not the file that imports it |
| about a file as a whole — an include that cannot be resolved, a source the compiler does not build | line 1, column 1 of the file |
| material compile | the engine's own `<path>(<line>,<col>): ` prefix, re-parsed and re-attributed to the source line it came from |
| `generate-error` — a failure the records do not explain | recovered from a `<path>(<line>,<column>): <message>` line; otherwise `1,1` |

*(since 2.0.0)* Each file is lexed and parsed on its own, so a position is never mapped back from an
assembled text. Through 1.9.x a parse error carried a `near index {Index}` offset into the import-inlined
text, a position inside a section body was wrong, and most statement-level messages had no position
at all.

A stage reports **all** of its errors — the parser and the binder keep going after one — and a stage
with errors stops the pipeline before the next stage: a file with a syntax error is not bound, a file
that does not bind is not emitted.

## Reading a code

The leading digit is the stage that raises it; the full allocation is on
[DreamShaderLang 2.0](/en/docs/language-v2#diagnostics).

| Range | Stage |
| :-- | :-- |
| `DSH1xxx` | the preprocessor (`#if`, `#define`), asset references in a 1.x texture default |
| `DSH2xxx` | the lexer and the parsers — `DSH2200`–`DSH2258` are the legacy front end's: 1.x `Graph` statements and top-level blocks |
| `DSH3xxx` | declarations, `#pragma`, `///` blocks; `DSH3250`–`DSH3278` the legacy front end's sections |
| `DSH4xxx` | the binder (names, types, statements), the IR validator, lowering refusals |
| `DSH5xxx` | `UE.*` / `Substrate.*` calls and the node catalog; `DSH5250`–`DSH5292` the 1.x call spellings and the numbered **legacy rules** |
| `DSH6xxx` | function kinds, inlining, `/// @custom` HLSL; `DSH6300`–`DSH6330` 1.x `Function` / `GraphFunction` / `Namespace` / `VirtualFunction` |
| `DSH7xxx` | uniforms, directives, `#pragma material`, the material settings writer, `.dsi`, `.dsp` checks |
| `DSH8xxx` | the emitter, the asset layer, the include resolver (`DSH8291`–`DSH8295`), Custom Pass emission |
| `DSH9xxx` | the tools — `check`, `dump-ir`, the decompiler, `migrate`, navigation, `pass-registry` |

A **legacy rule** (`DSH5275`–`DSH5292`) is something 1.x did that a 1.x source still gets, said out
loud: a name matched only by case (`DSH5275`, `DSH5276`), a GLSL spelling (`DSH5277`), a wider vector
cut down where a narrower one goes (`DSH5289`), an assignment that declares its variable (`DSH5292`). It
is a warning or a note on a `.dsm` / `.dsf`, never in a `.dss`, and
[`dsc migrate`](/en/docs/language-v2/migrate) writes each one out as explicit 2.0 text.

## 1.x messages and their codes

The common messages of the 1.x parser and generator, and what reports the same condition today.
`{…}` stands for what the message filled in.

| 1.x message | Today |
| :-- | :-- |
| `Unknown Graph identifier '{Name}'.` | [`DSH4200`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4200) — with *did you mean* when a declared name differs only in case |
| `Unknown Graph function '{Name}'.` | [`DSH4208`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4208) |
| `Math function '{Name}' expects exactly {N} argument(s).` | [`DSH4224`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4224); a named argument selects a pin now, an unknown one is [`DSH4216`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4216) — see [Math builtins](/en/docs/builtins/math#named-arguments) |
| `Math function '{Name}' only accepts numeric scalar/vector arguments.` · `Operator '{Op}' requires matching vector sizes …` · `Arithmetic operators cannot be applied to …` | [`DSH4226`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4226) |
| `Integer division is not supported by the material graph …` | [`DSH4243`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4243) |
| `Expected {N} component(s) but got {M}.` | [`DSH4228`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4228); a wider value into a narrower place is the note [`DSH5289`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5289) in a 1.x source |
| `Swizzle '{Swizzle}' is invalid …` · `Unsupported swizzle '{Swizzle}'.` | [`DSH4230`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4230) |
| `Constructor '{Name}' expects {N} total components but got {M}.` | [`DSH4222`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4222); `float3()` with nothing is [`DSH4221`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4221) |
| `Graph variable '{Name}' is declared more than once.` | [`DSH4220`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4220) in one block; [`DSH4210`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4210) at file scope |
| `Graph variable type '{Type}' requires an explicit initializer.` | [`DSH2215`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2215) |
| `Unsupported Graph variable type '{Type}'.` | [`DSH4201`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4201) for an unknown type; `return`, `for`, `while`, `switch` are [`DSH2208`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2208) |
| `Graph if statement is missing a '{ ... }' body.` | [`DSH2209`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2209) |
| `Graph if statement could not resolve both branch values for '{Name}'.` | [`DSH4372`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4372) |
| `Graph if statement cannot select texture value '{Name}'.` · `… Substrate value …` | [`DSH4379`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4379) · [`DSH4378`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4378) |
| `Unsupported material output '{Name}'.` | [`DSH5200`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5200) |
| `Unsupported property type '{Type}'.` | [`DSH3252`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3252); one of the seven node tokens with no 2.0 spelling is [`DSH3253`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3253) |
| `Metadata 'Slider(min, max)' requires exactly two numeric bounds …` · `Metadata key '{Key}' is declared more than once.` · `Metadata SortPriority value '{Value}' is not an integer.` | [`DSH3257`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3257) · [`DSH3256`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3256) · [`DSH3258`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3258) |
| `Unsupported UE builtin call '{Name}' in Graph. …` | [`DSH5210`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5210) — no `OutputType` is needed for a node the catalog knows |
| `UE.{Name} could not resolve MaterialExpression class '{Class}'.` | [`DSH5212`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5212) |
| `UE.Expression requires Class="MaterialExpressionName".` | [`DSH5218`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5218) |
| `UE.{Name}: '{Argument}' is not a property on '{Class}'.` | [`DSH5213`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5213) |
| `Generic {Namespace}.{Name} calls require named arguments.` | [`DSH5220`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5220) / [`DSH5221`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5221) |
| `UE.SceneTexture expects exactly Id="..." …` · `SampleTexture2D expects exactly two positional arguments …` | [`DSH5255`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5255) · [`DSH5256`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5256) |
| `UE.StaticSwitchParameter requires Name="ParameterName".` · `StaticSwitchParameter '{Name}' requires True=... and False=... inputs.` | [`DSH5257`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5257) · [`DSH5258`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5258) |
| `{Kind} '{Name}' is missing required input '{Input}'.` · `… does not have an input named '{Input}'.` | [`DSH4217`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4217) · [`DSH4216`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4216) |
| `GraphFunction cycle detected: {Chain}.` · `SelfContained Function cycle detected: …` | [`DSH6260`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6260) for `Function` / `GraphFunction` bodies that call each other; [`DSH6330`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6330) when the cycle runs through calls lifted out of a body; [`DSH6220`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6220) for a `.dss` helper that is inlined |
| `Function '{Name}' has a return type and cannot also declare out parameters. …` · `Function '{Name}' must declare at least one out parameter.` | [`DSH6304`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6304) · [`DSH6305`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6305) |
| `Function '{Name}' parameter '{Parameter}' uses unsupported qualifier '{Qualifier}'. …` · `… '__return' is reserved …` | [`DSH6302`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6302) · [`DSH6303`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6303) |
| `Namespace(Name="...") is required.` · `Namespace '{Name}' may only contain Function or GraphFunction blocks.` | [`DSH6309`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6309) · [`DSH6310`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6310) |
| `VirtualFunction(Name="...") is required.` · `… must provide Options = { Asset = Path(...); }.` · `… must declare at least one output.` | [`DSH6311`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6311) · [`DSH6312`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6312) · [`DSH6313`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6313) |
| `Shader(Name="...") is required.` · `{Block}(Name="...") is required.` | [`DSH2242`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2242) |
| `Shader must provide a Graph block.` | [`DSH2255`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2255) |
| `{File}: Outputs block is required.` · `No Outputs block was provided. …` | the warning [`DSH2256`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2256); the material builds, with nothing wired to it |
| `Unknown shader section '{Section}'.` · `Unknown material function section '{Section}'.` · `Unknown VirtualFunction section '{Section}'.` | [`DSH2245`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2245) |
| `Shader graph sections now use Graph = { ... }. …` | [`DSH2246`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2246) |
| `MaterialLayer is deprecated; use ShaderLayer instead.` · `MaterialLayerBlend is deprecated; …` | the warning [`DSH2251`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2251) |
| `Only one top-level Shader block is currently supported.` | [`DSH2250`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2250) — per **file** now; it spanned the import closure |
| `DreamShader header '{File}' may only declare …` | [`DSH2249`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2249), decided per declaration: a comment that mentions `Shader(` is fine |
| `DreamShader function file '{File}' may only declare …` · `{File}: .dsf files cannot define top-level Shader blocks.` | [`DSH2259`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2259) — see [Source files](/en/docs/language/file-model#how-the-restriction-is-enforced) |
| `A top-level Shader, Function, … block was not found.` | [`DSH2254`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2254) |
| `Unexpected token near index {Index}.` | [`DSH2240`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2240); 2.0 syntax in a `.dsm` / `.dsf` is [`DSH2248`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2248) |
| `Expected '{' near index {Index}.` · `Expected ',' or ')' near index {Index}.` · `Expected identifier near index {Index}.` · `Expected value near index {Index}.` | [`DSH2257`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2257) · [`DSH2243`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2243) |
| `Unterminated block.` · `Unterminated string literal.` | [`DSH2150`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2150) · [`DSH2103`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2103) |
| `DreamShader import '{Specifier}' referenced from '{File}' could not be resolved.` | [`DSH8292`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8292); an import of a `.dsf` / `.dsm` or a root-qualified one is [`DSH2252`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2252) |
| `DreamShader could not read '{File}'.` · `DreamShader import cycle detected at '{File}'.` | [`DSH8293`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8293) · [`DSH4211`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4211) |
| `Unsupported Backend '{Value}'. Supported values: Graph, Instance, ThinCustom.` | [`DSH7202`](/en/docs/plugin/diagnostics/dsh7xxx#dsh7202); an empty value is [`DSH7201`](/en/docs/plugin/diagnostics/dsh7xxx#dsh7201), `Instance` the warning [`DSH7204`](/en/docs/plugin/diagnostics/dsh7xxx#dsh7204) |
| `Unsupported BlendMode/RenderType '{Value}'.` · `Unsupported ShadingModel '{Value}'.` · `Unsupported MaterialDomain '{Value}'.` · `Unsupported material setting '{Key}'.` | [`DSH7127`](/en/docs/plugin/diagnostics/dsh7xxx#dsh7127) · [`DSH7129`](/en/docs/plugin/diagnostics/dsh7xxx#dsh7129) · [`DSH7130`](/en/docs/plugin/diagnostics/dsh7xxx#dsh7130) · [`DSH7118`](/en/docs/plugin/diagnostics/dsh7xxx#dsh7118) — the material settings writer kept its 1.x messages |
| `Asset '{ObjectPath}' already exists and is not a Material.` · `… was not generated by DreamShader. …` | [`DSH8201`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8201), carrying [`DSH8102`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8102) / [`DSH8103`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8103) as its reason |
| `Asset '{ObjectPath}' is open in an asset editor, so it was NOT rebuilt. …` | [`DSH8206`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8206), carrying [`DSH8101`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8101) |
| `Asset '{ObjectPath}' was edited by hand since DreamShader generated it …` | [`DSH8207`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8207), carrying [`DSH8115`](/en/docs/plugin/diagnostics/dsh8xxx#dsh8115) — see [Divergence](/en/docs/plugin/generation/divergence) |

A message that is in no row: search [README.md](/en/docs/plugin/diagnostics/readme) for a word of its condition, or compile the
file and read the code it reports now.

## What 1.x accepted in silence

Conditions the 1.x generator accepted without a word — and built something other than what the text
says, or dropped what it said. Each is a diagnostic now *(since 2.0.0)*.

| 1.x text | 1.x did | Today |
| :-- | :-- | :-- |
| `a % b`, `a & b`, `a \| b`, `a ^ b`, `a << b` in a `Graph` expression | stopped reading at the operator: the expression was `a` | [`DSH2201`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2201) |
| `a ? b : c`, or `a < b` outside an `if` condition | the same: the expression was `a` | [`DSH2200`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2200) |
| `v[0]` | dropped the index and everything after it | [`DSH2202`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2202) |
| `if (a > 0 && b > 0)` | tested `a > 0` only | [`DSH2210`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2210) |
| `(float3)x` | had no casts | [`DSH2203`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2203) |
| `a += b` | read a declaration of a variable named after the operator | [`DSH2205`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2205) |
| `x++` | had no such operator | [`DSH2207`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2207) |
| `a + b;` as a statement | built nodes nothing read | [`DSH2211`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2211) |
| `0x10` in a `Graph` expression | read it as a different number | [`DSH2222`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2222) |
| `1abc` or `0.5.5` as a number | used the leading digits | [`DSH2105`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2105) |
| an unterminated `/* …` | consumed the rest of the file | [`DSH2102`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2102) |
| an attribute written twice, `Shader(Name="A", Name="B")` | kept the later value | the warning [`DSH2244`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2244), later value kept |
| a `Settings` key written twice | kept the later value | the warning [`DSH3262`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3262), later value kept |
| an unknown key in a material-function `Settings` | ignored it | the warning [`DSH3263`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3263), still ignored |
| a positional argument on a `UE.*` call that takes none | ignored it | the warning [`DSH5254`](/en/docs/plugin/diagnostics/dsh5xxx#dsh5254), still dropped |
| a default on a function's `Outputs` entry | ignored it | the warning [`DSH3273`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3273), still dropped |
| a second `Graph` or `Layout` section | kept the later one | the warning [`DSH2258`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2258), later one kept |
| a `ShaderFunction` with the name of a builtin, called from `Graph` | called the builtin | [`DSH6206`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6206) at the declaration |
| `dot(vec3Value, vec2Value)` | accepted it; Unreal's own material translation failed later | [`DSH4226`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4226) |

What 1.x documented and a 1.x source still relies on — a name in another case, a GLSL spelling, a
`float4` written into a `float3` place — keeps building, as a [legacy rule](#reading-a-code) that says
so.

## VirtualFunction sync

The startup service that re-reads every `VirtualFunction` declaration and refreshes it from its
`UMaterialFunction` asset, plus the editor actions on the Material Function toolbar and context menu.
These messages have no `DSHnnnn` code, except `DSH9001` for a source that uses `#if`.

Sync diagnostics reach the store with `stage = virtualFunctionSync`, `code = virtual-function-sync`
and `source = DreamShader VirtualFunction`. The editor-action messages are toast notifications and
log lines; they are not stored.

| Message | Cause | Fix | See |
| :-- | :-- | :-- | :-- |
| `Created VirtualFunction file but could not open it: {File}` | the `.dsh` was written but VSCode could not be launched | open the file manually | [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) |
| `DreamShader could not find a VirtualFunction definition for {Asset}.` | *Open VirtualFunction* on an asset with no declaration | use *CreateVirtualFunction* instead | [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) |
| `DreamShader could not find the selected Material Function.` | the selected asset vanished between menu build and action | reselect the asset | [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) |
| `DreamShader could not open VirtualFunction file: {File}` | the editor launch failed | open the file manually | [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) |
| `DreamShader could not read VirtualFunction source file '{File}'.` | the source file is unreadable; reported at line 1, column 1 | check file locks and permissions | [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) |
| `DreamShader failed to build VirtualFunction call: {Detail}` | the call snippet could not be produced | see the inner message | [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) |
| `DreamShader failed to build VirtualFunction reference: {Detail}` | the reference snippet could not be produced | see the inner message | [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) |
| `DreamShader failed to build VirtualFunction: {Detail}` | the declaration text could not be produced | see the inner message | [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) |
| `DreamShader failed to create directory: {Dir}` | `DShader/VirtualFunctions` could not be created | check permissions | [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) |
| `DreamShader failed to update VirtualFunction source file '{File}'.` | the refreshed declaration could not be written back; reported at line 1, column 1 | check file locks and source control | [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) |
| `DreamShader failed to write VirtualFunction file: {File}` | the new `.dsh` could not be written | check permissions | [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) |
| `Expected exactly one VirtualFunction block.` | a re-parsed declaration region yielded zero or several blocks | keep one `VirtualFunction` per declaration region | [VirtualFunction](/en/docs/plugin/language/virtual-function) |
| `MaterialFunction '{Name}' does not have a valid package path.` | the asset's outermost package name is empty or does not start with `/` | re-save the asset somewhere under a mounted content root | [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) |
| `MaterialFunction '{Name}' does not expose any outputs.` | the asset has no `FunctionOutput` node | add an output to the material function | [VirtualFunction](/en/docs/plugin/language/virtual-function) |
| `VirtualFunction '{Name}' asset reference is invalid: {Detail}` | `Options.Asset` did not resolve; the raw literal is reported as the diagnostic's `assetPath` | fix the `Path( … )` | [Path](/en/docs/parameters/path) |
| `VirtualFunction '{Name}' could not be refreshed from MaterialFunction '{Path}': {Detail}` | the declaration builder failed | see the inner message | [VirtualFunction tools](/en/docs/plugin/tools/virtual-function-tools) |
| `VirtualFunction '{Name}' references missing MaterialFunction '{Path}'.` | `LoadObject` returned null | restore the asset, or update `Options.Asset` | [VirtualFunction](/en/docs/plugin/language/virtual-function) |
| `VirtualFunction attributes are missing a closing ')'.` | unbalanced `(` in the header | balance the parentheses | [VirtualFunction](/en/docs/plugin/language/virtual-function) |
| `VirtualFunction body is missing a closing '}'.` | unbalanced `{` in the body | balance the braces | [VirtualFunction](/en/docs/plugin/language/virtual-function) |
| `VirtualFunction declaration is invalid: {Detail}` | the re-parse failed; the parse error is carried in `detail` | fix the declaration | [VirtualFunction](/en/docs/plugin/language/virtual-function) |
| `VirtualFunction name cannot be empty.` | the declaration builder was given an empty name | supply a name | [VirtualFunction](/en/docs/plugin/language/virtual-function) |

> [!NOTE]
> The sync service finds a declaration by the bare keyword `VirtualFunction`, **case-sensitively**,
> with identifier boundaries on both sides — the same spelling the legacy front end requires of a
> block word. A lower-case `virtualfunction` is invisible to both.

## Other log lines

Lines that are not a compile's records and never enter the store.

| Message | Meaning |
| :-- | :-- |
| `Failed to open DreamShader bridge database for diagnostics: {Path}` | `bridge.db` could not be opened; the JSON sinks are still written |
| `'{ObjectPath}' exists as a saved asset, so it is rebuilt and saved on disk rather than in memory. Run Tools > DreamShader > Make Ephemeral to make it Ephemeral again.` | a compile landed on a ThinCustom product that has a file behind it; storage decides, so it was rebuilt and saved |
| `Skipping automatic layout for large DreamShader graph ({Count} nodes). Existing generated positions will be used.` | logged at `Display`; the 1.x `Classic` layout skips a large graph |

The commandlet's own run lines, its usage banner and its exit codes are on
[Commandlet](/en/docs/tools/commandlet); the decompiler's on [Decompiler](/en/docs/tools/decompiler).

## Example

A typo inside a `Graph` block, as it reaches each surface.

```c
// DShader/Materials/M_Sample.dsm
Shader(Name="Materials/M_Sample")
{
    Properties = { vec3 Tint = vec3(1.0, 0.4, 0.1); }
    Outputs    = { vec3 Color; Base.EmissiveColor = Color; }
    Graph      = {
        vec2 UV = UE.TexCoord(Index = 0);
        Color   = Tin * UV.x;          // typo: Tin, not Tint
    }
}
```

Output Log:

```text
LogDreamShader: Error: I:/Project/DShader/Materials/M_Sample.dsm(8,19): DSH4200: 'Tin' is not declared in this scope.
```

`Saved/DreamShader/Bridge/diagnostics.json`:

```json
{
  "version": 1,
  "updatedAtUtc": "2026-10-04T11:04:22Z",
  "files": [
    {
      "path": "I:/Project/DShader/Materials/M_Sample.dsm",
      "diagnostics": [
        {
          "message": "'Tin' is not declared in this scope.",
          "detail": "I:/Project/DShader/Materials/M_Sample.dsm(8,19): DSH4200: 'Tin' is not declared in this scope.",
          "stage": "bind",
          "code": "DSH4200",
          "line": 8,
          "column": 19,
          "severity": "error",
          "source": "DreamShader Lang2"
        }
      ]
    }
  ]
}
```

The same record is written to `Bridge/diagnostics/<md5>.json` and to the `diagnostics` table of
`Bridge/bridge.db`, and appears on the source's row in the Material Content Browser. `stage` follows
from the code's range: `preprocess`, `parse`, `bind`, `ir`, `generate` or `tools`.

## See also

- [README.md](/en/docs/plugin/diagnostics/readme) — every code, with its severity and message
- [Bridge](/en/docs/plugin/tools/bridge) — the request files, the WebSocket protocol, and the diagnostic artifacts
- [Material Content Browser](/en/docs/plugin/tools/material-browser) — the tab that shows each source's records
- [Commandlet](/en/docs/tools/commandlet) — `-run=DreamShader`, `-DiagnosticsOut`, its switches and exit codes
- [DreamShaderLang 2.0](/en/docs/language-v2#diagnostics) — the code ranges in full
- [`dsc migrate`](/en/docs/language-v2/migrate) — the legacy rules, written out as 2.0 text
- [Source files](/en/docs/language/file-model) — the file-kind rules several codes enforce
- [import](/en/docs/language/imports) — how a header is read, and the codes of an import
- [Testing](/en/docs/plugin/contributing/testing) — the corpus fixtures that pin many of these codes
