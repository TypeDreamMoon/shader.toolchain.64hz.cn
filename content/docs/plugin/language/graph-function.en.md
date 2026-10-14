---
title: "GraphFunction"
description: "GraphFunction"
---

# GraphFunction

> [DreamShader](/en/docs/) » [DreamShaderLang](/en/docs/plugin/language) » **GraphFunction**

A top-level block whose body is HLSL, but whose `UE.*` calls are lifted out of the text, built as real
material nodes, and wired into the call's Custom node as auto-named input pins.

| | |
| :-- | :-- |
| Declared in | `.dsm`, `.dsf`, `.dsh` — and inside a [`Namespace`](/en/docs/plugin/language/namespace) body |
| Kind | top-level block |
| Generates | nothing by itself. Each call site generates one `UMaterialExpressionCustom` node plus the material expressions lifted out of its body. |
| Since | `1.3.1` |

The legacy front end reads a `GraphFunction` as a `/// @custom` function whose `UE.` calls are lifted
(legacy rule L8); see [the 2.0 language](/en/docs/language-v2) and
[`dsc migrate`](/en/docs/language-v2/migrate).

## Synopsis

```c
GraphFunction [ ( <generate-attributes> ) ] [ <return-type> ] <name> ( [ <parameter-list> ] )
{
    <hlsl-with-UE-calls>
}
```

```c
<parameter-list> ::= <parameter> [ , <parameter> ] …
<parameter>      ::= [ { in | out } ] <type-token> <parameter-name>
```

The keyword `GraphFunction` is matched **case-sensitively**. The parameter grammar, the `in` / `out`
qualifiers, the "at least one output" rule, the return-type form, the type tokens, the body's
identifier normalisation, the leading `#include`s, the shape of the node's code and the optional
`(Generate = ..., Library = ..., Description = ...)` header *(after 2.1.2)* that asks a package to generate
a material function from it are **identical to [`Function`](/en/docs/plugin/language/function)** — read that page for all of
them. This page documents only what differs.

## How a GraphFunction differs from a Function

| Aspect | `Function` | `GraphFunction` |
| :-- | :-- | :-- |
| `Inline` / `SelfContained` | accepted | **not accepted** — see below |
| `UE.*` calls in the body | left as literal HLSL text, which the shader compiler does not know | built as material expressions and passed in as Custom-node inputs |
| Body placement | the calling node's code, and a wrapper member of any node whose body calls it | the calling node's code |
| Callable from another `Function` body | yes — it is embedded | only when the body lifts no `UE.*` call; otherwise [`DSH6327`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6327) |
| Recursion | [`DSH6260`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6260) | `DSH6260`, and [`DSH6330`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6330) through a lifted call |
| `Substrate` parameters and results | never ([`DSH6253`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6253)) | never (`DSH6253`) |

*(since 2.0.0)* Both put their body in the node's code: there is no shared include for a `Function`
to be emitted into, so that row of the 1.x comparison is gone.

> [!WARNING]
> `GraphFunction SelfContained Foo(…)` and `GraphFunction Inline Foo(…)` are
> [`DSH6307`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6307) *(since 2.0.0; 1.x skipped the modifier check and
> read the word as a return type)*. `GraphFunction SelfContained(…)` declares a function named
> `SelfContained`. There is no self-contained mode for `GraphFunction`.

## `UE.*` hoisting

When the body is read, it is scanned and every `UE.*` call is recorded as a lifted call. When the
node's code is built, the call's text is replaced by the name of a generated input pin; the value that
pin carries is the material expression the call evaluates to.

A call is lifted only when **all** of these hold, in order:

| Step | Condition |
| :-- | :-- |
| 1 | The character before the `U` is an identifier boundary — not `[A-Za-z0-9_]`, or start of text |
| 2 | The next three characters are `U`/`u`, `E`/`e`, `.` — the prefix is matched **case-insensitively** in a 1.x body, so `UE.`, `ue.`, `Ue.` and `uE.` all trigger |
| 3 | The character after the `.` starts an identifier: `[A-Za-z_]`, then `[A-Za-z0-9_]` |
| 4 | After optional whitespace, the next character is `(` |
| 5 | A matching `)` exists (the search skips `"…"` strings) |

If step 1–4 fails, the text is copied through **verbatim and silently**. If step 5 fails, the body is
[`DSH6314`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6314).

The scan skips `//` comments, `/* */` comments, `"…"` strings and `'…'` character literals, so a
`UE.Time()` written inside a comment is not lifted.

The extracted text — the whole `UE.Foo(…)` including its parentheses — is parsed as a
[Graph expression](/en/docs/graph/expressions), so any [`UE.*` builtin](/en/docs/builtins/ue-nodes), including
the generic [`UE.Expression(…)`](/en/docs/builtins/ue-expression), is available. *(since 2.0.0)* It is
bound in the **function's own scope**: its parameters, replaced at each call by that call's
arguments, and the file's file-scope declarations. A name only the caller has is
[`DSH6325`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6325) — 1.x evaluated lifted calls in the caller's `Graph`
scope; pass the value as a parameter instead. A name nobody has, a variable the body itself declares
included, is [`DSH6326`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6326).

> [!NOTE]
> The lift consumes exactly `UE.Name( … )` up to the matching `)` — nothing more. A trailing swizzle
> or member access stays behind as HLSL text applied to the pin, so `UE.CameraVector().xy` becomes
> `_ds_<Fn>_UE0 .xy` and is evaluated by the shader compiler, not by the graph builder. The pin
> carries the node's default output at its full component count. The pin name replaces the call's
> text padded with spaces to the call's length (and keeping any line break inside the call), so every
> later column of the body still matches the source.

> [!WARNING]
> Only `UE.` is lifted. A `Substrate.*` call is **not** lifted and reaches the shader compiler as
> text, where it is not valid HLSL; *(since 2.0.0)* the front end says so with a warning,
> [`DSH6316`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6316). Substrate values cannot cross a Custom node boundary
> at all. Build Substrate material graphs in a [`ShaderFunction`](/en/docs/plugin/language/shader-function) or directly in
> the `Shader`'s [`Graph`](/en/docs/graph/overview).

### Values the hoist refuses

A lifted call has to produce something a Custom node input carries: a number, a bool, or *(since
2.0.0)* a texture object. A `MaterialAttributes` value or a Substrate material is
[`DSH6329`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6329). A node with several outputs feeds the pin its default
output.

## Generated input pins

Each lifted call adds one input to the Custom node. The pin name is derived, then deduplicated:

| Step | Rule |
| :-- | :-- |
| 1 | Base name is `__ds_<FunctionName>_UE<N>`, where `N` counts the lifted calls of the body from 0, in source order — the same names at every call site |
| 2 | The whole base name is identifier-sanitized: non-`[A-Za-z0-9_]` → `_`, then **runs of consecutive underscores are collapsed to one** — which turns the leading `__` into a single `_` |
| 3 | While the name collides with a declared `in` parameter or an earlier lifted call (compared case-insensitively), `_1`, `_2`, … is appended |

So a `GraphFunction WindPulse` whose body contains one `UE.Time()` call produces a pin literally
named:

```text
_ds_WindPulse_UE0
```

and a namespaced `Common::Pulse` produces `_ds_Common_Pulse_UE0`.

> [!NOTE]
> The visible pin name has a **single** leading underscore. `__ds_` appears in the pre-sanitisation
> base name only. These pin names are user-visible on the generated Custom node and in any
> shader-compiler error that mentions them.

The declared `in` parameters occupy the first pins, in declaration order, under their declared names.
Lifted pins follow.

## Generated Custom-node code

*(since 2.0.0)* The code has the shape every `Function` node has — see
[`Function` § Generated HLSL](/en/docs/plugin/language/function#generated-hlsl) — with each lifted call replaced by its
pin's name:

```hlsl
<Out0Type> <Out0> = (<Out0Type>)0;      // a function without a return type: its first `out`
// Begin DreamShader source: <file>
// DreamShader custom: <Name> line <N>
<body, with every lifted UE.* call replaced by its pin name>
// End DreamShader source: <file>
return <Out0>;                         // only when the body has no top-level return
```

| Element | Rule |
| :-- | :-- |
| First output | the returned value, or a local for the first `out`, declared ahead of the body and returned after it |
| Other `out` parameters | the node's additional outputs, named after the **declared** parameters *(since 2.0.0; 1.x named them after the caller's variables)*. The engine declares and zero-initialises them; the body assigns them directly, so there are no writeback lines. |
| Body | verbatim between the source markers |
| Return | appended only when the body has no top-level `return` |

Because the body is the node's code, a `return expr;` returns the node's first output at any brace
depth, and the additional outputs keep what the body assigned before it. See
[`Function` § return lowering](/en/docs/plugin/language/function#return-lowering).

Plain `Function` calls in the body are embedded as they are in a `Function` node.

## Restrictions

| Restriction | Consequence |
| :-- | :-- |
| No `Inline` / `SelfContained` | `DSH6307` |
| No recursion, direct or indirect | `DSH6260` for bodies that call each other; `DSH6330` when a lifted call's arguments reach the function again |
| Called only from a `Graph` block when it lifts calls | another body calling it is `DSH6327` |
| Outputs carry `Float1`…`Float4` or `MaterialAttributes` | a texture or sampler output is [`DSH6254`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6254) |
| No `Substrate` inputs or results | `DSH6253` |
| An empty body | no diagnostic; the outputs come out as 0 |

### Argument validation

The call forms and their argument rules are a `Function`'s: see
[`Function` § Calling a Function](/en/docs/plugin/language/function#calling-a-function). *(since 2.0.0)* Named arguments
are accepted, a value call on a multi-output function reads its first output, and the 1.x synthetic
value target `__ds_<Name>_value<N>` no longer exists.

## Notes

- A `.dsm` or `.dsf` that contains *only* `GraphFunction` blocks generates no assets.
- The mangled spelling `DreamShaderFn_WindPulse(…)` no longer names the function in a `Graph` block
  *(since 2.0.0)*: [`DSH4208`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4208).
- A `Function` and a `GraphFunction` cannot share a name: [`DSH4210`](/en/docs/plugin/diagnostics/dsh4xxx#dsh4210)
  *(since 2.0.0; 1.x reported the call as ambiguous)*.
- On UE 5.3 the generated Custom node displays its code in the material graph; from UE 5.4 onward
  `ShowCode` is set to `false`.
- Each lifted call is lowered on its own. Two textually identical calls in one body produce two pins,
  though the underlying material expressions may still be shared by
  [node reuse](/en/docs/plugin/graph/node-reuse).

## Diagnostics

The declaration, binding, code and call diagnostics of a `Function` apply unchanged — see
[`Function` § Diagnostics](/en/docs/plugin/language/function#diagnostics). These are the ones a `GraphFunction` adds. Each
carries the line and column of the construct; the code's page has the message.

### Parse time

| Code | Raised when |
| :-- | :-- |
| `DSH6307` | `SelfContained` or `Inline` after `GraphFunction` |
| `DSH6314` | a `UE.*` call in the body is never closed |
| `DSH6316` | a `Substrate.*` call in the body, which is not lifted (warning) |

The other parse-time codes (`DSH6300`–`DSH6308`, `DSH6319`) are a `Function`'s; see
[`Function` § Parse time](/en/docs/plugin/language/function#parse-time).

### Binding

| Code | Raised when |
| :-- | :-- |
| `DSH6325` | a lifted call reads a name only the caller has |
| `DSH6326` | a lifted call reads a name that is neither a parameter nor declared at file scope |
| `DSH6329` | a lifted call makes a `MaterialAttributes` or Substrate value |
| `DSH6330` | the function reaches itself through a lifted call |

### Custom-node code

| Code | Raised when |
| :-- | :-- |
| `DSH6327` | another body calls a function that lifts calls |
| [`DSH6328`](/en/docs/plugin/diagnostics/dsh6xxx#dsh6328) | a lifted call's recorded place is not in the body (internal error) |

The complete cross-stage list lives in the [diagnostics index](/en/docs/diagnostics).

## Example

```c
// DShader/Lib/Motion.dsh

GraphFunction WindPulse(in float2 uv, out float pulse)
{
    float t = UE.Time();
    pulse = sin(uv.x * 8.0 + t);
}

GraphFunction float Parallax(in float2 uv, in float depth)
{
    float2 view = UE.CameraVector().xy;
    return uv.x + view.x * depth;
}
```

Used from a `Shader`:

```c
import "Lib/Motion.dsh"

Shader(Name="Materials/M_Wind")
{
    Properties = { float Depth = 0.25; }
    Outputs    = { vec3 Color; Base.EmissiveColor = Color; }
    Graph = {
        vec2  UV = UE.TexCoord(Index = 0);
        float Pulse;
        WindPulse(UV, Pulse);
        float Shift = Parallax(UV, Depth);
        Color = vec3(Pulse, Shift, 0.0);
    }
}
```

Generated material for the `WindPulse` call:

```text
UMaterialExpressionTextureCoordinate       →  Custom pin "uv"
UMaterialExpressionTime                    →  Custom pin "_ds_WindPulse_UE0"
UMaterialExpressionCustom  Description="WindPulse"  OutputType=CMOT_Float1
```

with `Code`:

```hlsl
float pulse = (float)0;
// Begin DreamShader source: DShader/Lib/Motion.dsh
// DreamShader custom: WindPulse line 4

    float t = _ds_WindPulse_UE0;
    pulse = sin(uv.x * 8.0 + t);
// End DreamShader source: DShader/Lib/Motion.dsh
return pulse;
```

## See also

- [Function](/en/docs/plugin/language/function) — the shared declaration grammar, parameters, return type, node code and body normalisation
- [Namespace](/en/docs/plugin/language/namespace) — `Ns::Fn` qualification and the flattened name
- [Calling functions](/en/docs/graph/calls) — value vs statement calls
- [The 2.0 language](/en/docs/language-v2) — `/// @custom` bodies and their lifted `UE.` calls
- [UE builtins](/en/docs/builtins/ue-nodes) — every `UE.*` call the hoist can evaluate
- [UE.Expression](/en/docs/builtins/ue-expression) — the generic reflected-node builtin
- [Substrate builtins](/en/docs/builtins/substrate) — why `Substrate.*` cannot be lifted
- [Graph](/en/docs/graph/overview) — the statement and expression language of a `Graph` block
- [Node reuse](/en/docs/plugin/graph/node-reuse) — when two identical lifted expressions share a node
- [Type tokens](/en/docs/language/types-and-values) — the complete token catalogue
- [ShaderFunction](/en/docs/plugin/language/shader-function) — the alternative when a real node graph, or Substrate, is needed
- [Diagnostics index](/en/docs/diagnostics) — every code, by stage
