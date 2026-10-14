---
title: "DreamShaderLang"
description: "DreamShaderLang"
---

# DreamShaderLang

> [DreamShader](/en/docs/) » **DreamShaderLang**

The language read from `.dsm`, `.dsf` and `.dsh` source files: an outer declaration grammar that
describes assets, and a statement grammar, embedded in `Graph` blocks, that describes the node graph
inside them.

| | |
| :-- | :-- |
| Declared in | `.dsm`, `.dsf`, `.dsh` |
| Kind | language |
| Generates | `UMaterial`, `UMaterialFunction`, `UMaterialFunctionMaterialLayer`, `UMaterialFunctionMaterialLayerBlend` |
| Version | the 1.x language, last released in `1.9.1`; built by the 2.0 compiler *(since 2.0.0)* |
| Engines | Unreal Engine `5.3` – `5.8`; the accepted grammar is identical on every supported engine version |

> [!NOTE]
> New sources are written in [DreamShaderLang 2.0](/en/docs/language-v2) (`.dss`). A 1.x source
> keeps building through the same compiler, and [`dsc migrate`](/en/docs/language-v2/migrate) rewrites one as
> `.dss`, proving the rewrite builds the same graph.

## Synopsis

A source file is one file plus the headers it imports.

```c
[ import "<specifier>" ; ]…

<top-level-block>…
```

```c
<top-level-block> := { Shader | ShaderFunction | ShaderLayer | ShaderLayerBlend
                     | MaterialLayer | MaterialLayerBlend | VirtualFunction | Namespace }
                     ( <attribute> = <value> [, …] ) { <section>… }
                   | { Function [ SelfContained | Inline ] | GraphFunction }
                     [<return-type>] <name> ( [<parameter>, …] ) { <HLSL> }

<section>          := <section-name> [=] { <statement>… } [;]
```

Top-level blocks may appear in any order and, apart from `Shader`, any number of times. There is no
separator between them.

## Two grammars

*(since 2.0.0)* One lexer turns the whole file into tokens, and one **legacy front end** reads both
grammars from them into the same tree the [2.0 parser](/en/docs/language-v2) builds — so a 1.x
file then goes through the same binder, IR and emitter as a `.dss`. Through 1.9.x the two grammars
were two separate machines, the declaration parser in the runtime module and the `Graph` expression
parser in the generator, each with its own character scanner.

| | Declaration grammar | `Graph` statement grammar |
| :-- | :-- | :-- |
| Implemented by | the legacy front end in module `DreamShaderLang` | the same front end, over the 2.0 statement and expression parser |
| Runs | when a source is compiled, after the preprocessor | in the same parse, after every other section of the block |
| Input | the tokens of the whole file | the tokens between `Graph = {` and its `}` |
| Produces | 2.0 declarations: `#pragma material`, `uniform`s, the entry function or function asset, `#pragma layout` | the statements of that function's body |
| Numeric literals | number tokens; each section reads a token's text the way its consumer asks — see [Numeric literals](/en/docs/language/lexical#numeric-literals) | number tokens |
| Comments | `//` and `/* */`, anywhere between tokens | the same |
| Statement separator | `;` outside brackets | `;` — see [Statements](/en/docs/graph/statements) |
| Punctuation accepted | `{ } ( ) [ ] ; = , . :` and `::` where a section's grammar names them | every operator of the 2.0 grammar is a token; what a 1.x `Graph` did not have is refused by name, [`DSH2200`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2200)–[`DSH2222`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2222) |
| Error positions | the line and column of the construct, in every section | the line and column of the construct |

The `#if` family belongs to **neither** grammar: it is handled line by line before the file is
lexed, so none of its keywords is one the parser knows. See [Preprocessor](/en/docs/plugin/language/preprocessor).
*(since 2.0.0)* [`import`](/en/docs/language/imports) is a top-level declaration of the declaration grammar; through
1.9.x it too was a line-oriented directive, handled before parsing.

```text
<file>.dsm
  │
  ├─ preprocessor           evaluate `#if` / `#ifdef` / `#elif` / `#else` / `#endif` against the
  │                         define table; cut untaken branches, preserving the line count;
  │                         `Function` bodies pass through untouched
  │
  ├─ legacy front end       tokens -> blocks, sections, `Graph` statements -> the 2.0 tree;
  │                         what 1.x read silently and built wrong is an error (DSH2200–DSH2222)
  │
  ├─ binder                 names, types, calls; an `import`ed `.dsh` is preprocessed and parsed on
  │                         its own and its declarations are declared into this file; the legacy
  │                         rules apply to 1.x text and say so (DSH5275–DSH5292)
  │
  ├─ IR                     lowering, passes, validation
  │
  └─ emitter                material nodes  ->  asset
```

The front end and the binder report all of their errors rather than the first, and a stage with
errors stops the pipeline before the next one; the preprocessor stops at its first error.
The preprocessor runs **first**, per file, which is what lets an `#if` decide whether an `import` is
taken at all — and why a `#define` is local to the file that writes it.

## Declaration language

| | |
| :-- | :-- |
| [Source files](/en/docs/language/file-model) | `.dsm` / `.dsf` / `.dsh`, what each may contain, discovery |
| [Lexical elements](/en/docs/language/lexical) | Comments, identifiers, case sensitivity, literals, statement splitting |
| [Keyword index](/en/docs/plugin/language/keywords) | Every reserved word, alias and identifier rewrite |
| [`import`](/en/docs/language/imports) | Search roots, packages, cycles |
| [Preprocessor](/en/docs/plugin/language/preprocessor) | The eight `#if` / `#define` directives and the define table *(since 1.9.0)* |
| [Types](/en/docs/language/types-and-values) | Type-token catalogue and per-context validity |

**Top-level blocks**

| | |
| :-- | :-- |
| [`Shader`](/en/docs/plugin/language/shader) | Generates a `UMaterial` |
| [`ShaderFunction`](/en/docs/plugin/language/shader-function) | Generates a `UMaterialFunction` |
| [`ShaderLayer` / `ShaderLayerBlend`](/en/docs/plugin/language/shader-layer) | Generates native material layer functions *(since 1.3.0)* |
| [`VirtualFunction`](/en/docs/plugin/language/virtual-function) | Declares an existing `UMaterialFunction` *(since 1.2.0)* |
| [`Function`](/en/docs/plugin/language/function) | Reusable HLSL helper |
| [`GraphFunction`](/en/docs/plugin/language/graph-function) | HLSL helper whose `UE.*` calls become node inputs *(since 1.3.1)* |
| [`Namespace`](/en/docs/plugin/language/namespace) | Groups helpers under `Ns::Name` |

**Sections**

| | |
| :-- | :-- |
| [`Properties`](/en/docs/parameters/properties) | Parameter, `const` and `UE.*` declarations, `Group("…")` scopes |
| [`Inputs` / `Outputs` / `Results`](/en/docs/plugin/language/inputs-outputs) | Typed parameters of material functions |
| [Output bindings](/en/docs/plugin/language/output-bindings) | `Base.<Property> = <value>;` and `Expression( … ).Pin[<i>]` |
| [`Settings`](/en/docs/plugin/settings) | Material and material-function settings |
| [`Options`](/en/docs/plugin/language/options) | `VirtualFunction` asset binding |
| [`Layout`](/en/docs/language/layout) | `Node` / `Comment` placement and `#Region` |

## Graph language

The statement and expression language inside `Graph = { … }`.

| | |
| :-- | :-- |
| [Graph overview](/en/docs/graph/overview) | What a `Graph` block is and how it is evaluated |
| [Statements](/en/docs/graph/statements) | Every statement form |
| [Declarations](/en/docs/plugin/graph/declarations) | Variables, initialisers, scope |
| [Expressions and operators](/en/docs/graph/expressions) | Precedence, associativity, compound assignment |
| [Literals](/en/docs/plugin/graph/literals) | Numeric forms, suffixes, `true` / `false` |
| [Constructors](/en/docs/plugin/graph/constructors) | `float3( … )`, `vec4( … )`, splatting |
| [Swizzles](/en/docs/plugin/graph/swizzle) | Channel sets, reorder, repeat |
| [Conversions](/en/docs/plugin/graph/conversions) | Coercion and component-count rules |
| [`if` / `else`](/en/docs/graph/control-flow) | Conditions and branch semantics |
| [`MaterialAttributes`](/en/docs/plugin/graph/material-attributes) | Member writes and reads *(since 1.2.5)* |
| [Calls](/en/docs/graph/calls) | Calling functions and parameter pins |
| [Name resolution](/en/docs/plugin/graph/name-resolution) | Lookup order and shadowing |
| [Node reuse](/en/docs/plugin/graph/node-reuse) | Common-subexpression deduplication |
| [Unsupported constructs](/en/docs/graph/unsupported) | Loops, `return`, ternary, `%`, comparisons, indexing |

## Notes

- **The same token can be read two ways.** `1.0f` is one float token everywhere. A `Properties`
  default reads its text — a sign, digits, one `.`, an exponent, an optional `f` — so
  `float Strength = 1.0f;` and `float Strength = 1e3;` are fine, and `float Strength = 0x1F;` is
  [`DSH3254`](/en/docs/plugin/diagnostics/dsh3xxx#dsh3254); a `Graph` expression reads the token itself. See
  [Numeric literals](/en/docs/language/lexical#numeric-literals).
- **The preprocessor is not part of either grammar.** Eight lowercase directives — `#if`, `#ifdef`,
  `#ifndef`, `#elif`, `#else`, `#endif`, `#define`, `#undef` — are evaluated over the raw text before
  parsing and never reach either grammar *(since 1.9.0)*. Outside those eight, a `#` line is passed
  through only where it has a claimant: anywhere inside a `Function` body (that is HLSL, `#include`
  included), and `#Region` / `#EndRegion` in any case. Anything else is `DSH1035`, mis-cased
  directives such as `#IF` among them. See [Preprocessor](/en/docs/plugin/language/preprocessor) and [Layout](/en/docs/language/layout).
- **Top-level block keywords and the lower-case reserved words are the case-sensitive tokens.**
  Section names, type tokens, attribute keys, settings keys and every other keyword-like token are
  matched case-insensitively. See [Case sensitivity](/en/docs/language/lexical#case-sensitivity).
- **The parser is engine-version independent.** No lexical or grammatical construct is gated on the
  Unreal Engine version. Version gates exist only downstream of parsing — Substrate types and
  builtins (UE 5.4+), and a small number of node and setting gates.
- A `.dsm` or `.dsf` must contain at least one `Shader`, `ShaderFunction`, `ShaderLayer`,
  `ShaderLayerBlend`, `Function`, `GraphFunction`, `Namespace` or `VirtualFunction` block, otherwise it
  is [`DSH2254`](/en/docs/plugin/diagnostics/dsh2xxx#dsh2254). *(since 2.0.0)* A `Namespace` counts even when it
  is empty, and a `.dsh` may hold nothing but imports.

## Example

One `.dsm` exercising both grammars: the declaration grammar owns everything outside `Graph = { }`,
the statement grammar everything inside it.

```c
Shader(Name="Materials/M_Comments")
{
    Settings = {
        Domain       = "UI";        // trailing line comment
        ShadingModel = "Unlit";
    }

    Outputs = {
        vec3 Color;
        Base.EmissiveColor = Color;
    }

    Graph = {
        Color = vec3(1.0, 1.0, 1.0); // inline comment inside the graph body
    }
}
```

## See also

- [Source files](/en/docs/language/file-model) — which block kinds each of `.dsm` / `.dsf` / `.dsh` may contain
- [Lexical elements](/en/docs/language/lexical) — tokens, case rules, literals, splitting
- [Keyword index](/en/docs/plugin/language/keywords) — every reserved word with the page that documents it
- [`import`](/en/docs/language/imports) — how a header's declarations reach the file that imports it
- [Preprocessor](/en/docs/plugin/language/preprocessor) — cutting the declaration layer with `#if`, and the define table
- [Graph](/en/docs/graph/overview) — the statement grammar
- [DreamShaderLang 2.0](/en/docs/language-v2) — the compiler pipeline, and the `.dss` language
- [`dsc migrate`](/en/docs/language-v2/migrate) — 1.x sources to `.dss`
- [Diagnostics index](/en/docs/diagnostics) — every code, by pipeline stage
- [Generation](/en/docs/generation/pipeline) — what the tree is turned into
- [Getting started](/en/docs/plugin/getting-started) — a first `.dsm` end to end
