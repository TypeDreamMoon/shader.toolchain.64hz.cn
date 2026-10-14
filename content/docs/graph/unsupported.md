---
title: "不支持的写法"
description: "不支持的写法"
---

# 不支持的写法 [#unsupported-constructs]

> [DreamShader](/docs/) » [Graph](/docs/graph/overview) » **不支持的写法**

`Graph` 块**不**实现的每一种 HLSL 与 GLSL 写法、编译器为它报告的代码，以及应该改写成什么。

| | |
| :-- | :-- |
| 声明于 | `.dsm`、`.dsf`——适用于每一个 `Graph { … }` 块体、`Outputs` 绑定表达式和 `Outputs` 声明的默认值 |
| 类型 | 被拒绝语法的参考 |

`Graph` 块是**节点图构建器**，不是着色器编译器。它只有固定的几种语句形式、四个算术运算符，除 `if` 之外没有任何控制流。其余一切都会带诊断码被拒绝。不会再有任何写法被编译成比你写下来的更少的东西*（自 2.0.0 起）*：
1.x 生成器遇到第一个不认识的运算符就静默丢掉表达式的其余部分
（`a % b` 构建出 `a`），而现在每一种这样的写法都是错误，信息里还会说明 1.x 当时做了什么。

想写循环、`?:`、`&&` 或位运算，请把代码搬进 [`Function`](/docs/plugin/language/function)，
或用 [`dsc migrate`](/docs/language-v2/migrate) 把文件迁到 `.dss`——那里有这些写法。

## 一种写法是怎样被拒绝的 [#how-a-construct-is-refused]

legacy 前端用 2.0 的语句与表达式解析器读取 `Graph` 块体，它的文法是 1.x 文法的超集；然后再拒绝 1.x 没有的东西*（自 2.0.0 起）*：

| 阶段 | 拒绝什么 | 码 |
| :-- | :-- | :-- |
| 词法器 | 根本不是记号的字符（`@`、`$`、反引号）、写坏的数（`0.5.5`、`1.0fx`） | [`DSH2101`](/docs/plugin/diagnostics/dsh2xxx#dsh2101)、[`DSH2105`](/docs/plugin/diagnostics/dsh2xxx#dsh2105) |
| 解析器 | 不是 2.0 文法里语句或表达式的文本：缺了 `;`、`)` 或名字，`switch` | `DSH2150`–`DSH2165` |
| legacy 限制检查 | 2.0 文法有、1.x 没有的写法：运算符、`[ ]`、强制转换、循环、`return`、复合赋值 | [`DSH2200`](/docs/plugin/diagnostics/dsh2xxx#dsh2200)–[`DSH2222`](/docs/plugin/diagnostics/dsh2xxx#dsh2222) |
| 绑定器 | 能解析但没有意义的写法：字符串值、整数除法、宽度不匹配 | `DSH42xx` |

每条诊断都带该写法的行列。一个阶段会报告它的全部错误，有错误的阶段会在下一阶段之前停止构建。

## 1.x 会截断的运算符 [#operators-1x-truncated]

下面每一种 1.x 都会接受，然后只构建运算符前面的部分，没有任何信息。*（自 2.0.0 起）* 每一种都是错误。

| 写法 | 码 | 应改写为 |
| :-- | :-- | :-- |
| `a % b` | [`DSH2201`](/docs/plugin/diagnostics/dsh2xxx#dsh2201) | `fmod(a, b)` |
| `a && b`、`a \|\| b`、`!a` | [`DSH2200`](/docs/plugin/diagnostics/dsh2xxx#dsh2200) | 嵌套 `if` 语句，或对 0/1 掩码用 `max` / `min` |
| `a & b`、`a \| b`、`a ^ b`、`~a` | `DSH2201` | 带 HLSL 函数体的 `Function` |
| `a << 2`、`a >> 2` | `DSH2201` | `a * 4.0`、`a / 4.0`，或一个 `Function` |
| `a < b`、`a > b`、`a <= b`、`a >= b`、`a == b`、`a != b`，位于 `if` 条件之外 | `DSH2200` | 一个 [`if` 条件](/docs/graph/control-flow) |
| `a ? b : c` | `DSH2200` | `if` / `else`、`lerp(c, b, mask)`，或一次 `StaticSwitchParameter` 调用 |
| `v[0]` | [`DSH2202`](/docs/plugin/diagnostics/dsh2xxx#dsh2202) | 一个 [swizzle](/docs/plugin/graph/swizzle)：`v.x` |
| `if` 条件里的第二个比较、`&&` 或 `\|\|` | [`DSH2210`](/docs/plugin/diagnostics/dsh2xxx#dsh2210) | 嵌套 `if` 语句 |

```c
// Refused (DSH2201); 1.x built this as UE.Time().
float Wave = UE.Time() % 1.0;

// Correct:
float Wave = fmod(UE.Time(), 1.0);
```

```c
// Refused (DSH2210); 1.x built this as if (Color.r > 0.5).
if (Color.r > 0.5 && Color.g > 0.5) { Out = One; } else { Out = Zero; }

// Correct:
if (Color.r > 0.5) {
    if (Color.g > 0.5) { Out = One; } else { Out = Zero; }
} else {
    Out = Zero;
}
```

限制检查对一个被拒绝的写法只报一次、不再看它内部，所以 `a % b % c`
是一条诊断；`a % b + c % d` 是两条。

## 语句层面的写法 [#statement-level-constructs]

| 写法 | 码 | 应改写为 |
| :-- | :-- | :-- |
| `return Color;`、`return;` | [`DSH2208`](/docs/plugin/diagnostics/dsh2xxx#dsh2208) | 给声明的输出变量赋值：`Color = …;` |
| `for (int i = 0; i < 3; i = i + 1) {}` | `DSH2208` | 手工展开，或把循环搬进函数体是真 HLSL 的 [`Function`](/docs/plugin/language/function) |
| `while (t) {}`、`do {} while (t);` | `DSH2208` | 同上 |
| `break;`、`continue;`、`discard;` | `DSH2208` | —— |
| `switch (Mode) {}` | [`DSH2160`](/docs/plugin/diagnostics/dsh2xxx#dsh2160) | 嵌套 [`if`](/docs/graph/control-flow) 语句，或一次 [`StaticSwitchParameter` 调用](/docs/graph/calls#staticswitchparameter) |
| `float Foo(float x) { return x; }` | [`DSH2154`](/docs/plugin/diagnostics/dsh2xxx#dsh2154)，在本该放声明 `;` 的 `(` 处 | 在顶层声明成 [`Function`](/docs/plugin/language/function) 或 [`GraphFunction`](/docs/plugin/language/graph-function) 再调用 |
| `struct S { float a; }` | [`DSH2151`](/docs/plugin/diagnostics/dsh2xxx#dsh2151)：`struct` 不能开始一个表达式 | 用 [`MaterialAttributes`](/docs/plugin/graph/material-attributes)，或把结构体放进 `Function` 函数体 |
| 前面没有 `if` / `else` 的 `{ … }` | [`DSH2220`](/docs/plugin/diagnostics/dsh2xxx#dsh2220) | 去掉花括号 |
| 变量上的 `static` / `const` | [`DSH2212`](/docs/plugin/diagnostics/dsh2xxx#dsh2212) | 一个 `const` 属性 |
| `float w[4];` | [`DSH2213`](/docs/plugin/diagnostics/dsh2xxx#dsh2213) | 多个独立变量 |
| `a + b;`——没人接收的值 | [`DSH2211`](/docs/plugin/diagnostics/dsh2xxx#dsh2211) | 把它赋给变量 |
| `#include "X.ush"`、`#pragma …` | [`DSH1035`](/docs/plugin/diagnostics/dsh1xxx#dsh1035)：`.dsm` / `.dsf` 的预处理器不认识这样的行 | 文件级 [`import`](/docs/language/imports)，或一个使用该 include 的 `Function` |
| `#define K 2` | Graph 里没有诊断：这一行属于[预处理器](/docs/plugin/language/preprocessor)，它在 `#if` 条件里使用 define | 一个 `const` 属性 |

`Graph` 块体按语句读取，而不是按文本在 `;` 处切分，所以带花括号的写法后面的代码不会再被吞进同一条语句
*（自 2.0.0 起）*。

## 表达式层面的写法 [#expression-level-constructs]

| 写法 | 码 |
| :-- | :-- |
| `x = a == b;` | `DSH2200` |
| `a == b;` *（作为语句）* | `DSH2211`——比较的值无处可去 |
| `x = a++;`、`a++;`、`--a;` | [`DSH2207`](/docs/plugin/diagnostics/dsh2xxx#dsh2207) |
| `x = (float)a;` | [`DSH2203`](/docs/plugin/diagnostics/dsh2xxx#dsh2203)——没有 C 风格强制转换；请写 `float(a)` |
| `x = (y = z);` | [`DSH2204`](/docs/plugin/diagnostics/dsh2xxx#dsh2204) |
| `x = 0x10;` | [`DSH2222`](/docs/plugin/diagnostics/dsh2xxx#dsh2222)——没有十六进制字面量；1.x 把 `0x10` 读成 `0` |
| `x = 1.0fx;`、`x = 0.5.5;` | `DSH2105` |
| `x = "text";` | [`DSH4202`](/docs/plugin/diagnostics/dsh4xxx#dsh4202) |
| `x = {1, 2, 3};`、`Attrs.BaseColor = {1, 0, 0};` | [`DSH2162`](/docs/plugin/diagnostics/dsh2xxx#dsh2162)——花括号列表只作为声明的初始值读取 |
| `float4 v = {{1,2},{3,4}};` | [`DSH2214`](/docs/plugin/diagnostics/dsh2xxx#dsh2214)——花括号初始值不能嵌套 |
| `f(a b)` | [`DSH2152`](/docs/plugin/diagnostics/dsh2xxx#dsh2152)——缺少 `,` |
| `if (a) Color = X;` | [`DSH2209`](/docs/plugin/diagnostics/dsh2xxx#dsh2209)——花括号是必需的 |
| `@`、`$`、反引号 | `DSH2101` |

## 复合赋值与自增自减 [#compound-assignment-and-increment]

`+= -= *= /= %=`、位运算的复合形式、`++` 和 `--` 都不是 1.x 运算符。

| 写法 | 码 |
| :-- | :-- |
| `a += b;`、`a -= b;`、`a *= b;`、`a /= b;`、`a %= b;` | [`DSH2205`](/docs/plugin/diagnostics/dsh2xxx#dsh2205) |
| `a++;`、`a--;`、`++a;`、`--a;` | `DSH2207` |

*（自 2.0.0 起）* 空白不再有影响。1.x 把 `a += b;` 读成类型为 `a`、
名为 `+` 的变量声明，把 `a+=b;` 读成对一个名叫 `a+` 的全新变量的赋值，
`a` 保持不变且没有任何信息；现在这些都是 `DSH2205`。请写展开形式：`a = a + b;`。

```c
// Refused (DSH2205).
Sum+=Tint;

// Correct:
Sum = Sum + Tint;
```

## 大小写写错的关键字 [#wrong-case-keywords]

`if` 和 `else` 是关键字，**区分大小写**，`for`、`while`、`return`、
`struct` 及其他 HLSL 关键字也一样。大小写写错的拼法是一个名字。

| 写法 | 结果 |
| :-- | :-- |
| `If (x) {}`、`IF (x) {}` | `If (x)` 是对一个叫 `If` 的函数的调用，本该放这条语句的 `;` 的位置出现了 `{`：`DSH2154` |
| `if (x) {} Else {}`、`ELSE {}` | `if` 能解析；`Else` 是一个名字，它的 `{` 是 `DSH2154` |

类型 token、构造器名和 `true` / `false` 不区分大小写。其他名字先精确查找，
再不区分大小写，后者带警告（[`DSH5275`](/docs/plugin/diagnostics/dsh5xxx#dsh5275)，
引擎名为 [`DSH5276`](/docs/plugin/diagnostics/dsh5xxx#dsh5276)）；见
[名称解析](/docs/plugin/graph/name-resolution)。

## 根本不存在的特性 [#features-that-simply-do-not-exist]

| 特性 | 状态 | 替代方案 |
| :-- | :-- | :-- |
| 矩阵类型（`float3x3`、`float4x4`、`mat2`、`mat3`、`mat4`） | 图里没有矩阵值：[`DSH4361`](/docs/plugin/diagnostics/dsh4xxx#dsh4361) | [`UE.TransformVector` / `UE.TransformPosition`](/docs/plugin/builtins/transform)，或把矩阵局部变量放在 `Function` 函数体**内部** |
| 数组与下标 | `DSH2213`、`DSH2202` | 通道用 [swizzle](/docs/plugin/graph/swizzle)；层用 `Texture2DArray` 采样 |
| `inout` 参数 | 1.x 函数只有 `in` 和 `out`：[`DSH6302`](/docs/plugin/diagnostics/dsh6xxx#dsh6302) | 传一个 `in` 和一个 `out` |
| 在 `Graph` 内声明函数 | `DSH2154` | 顶层的 `Function` / `GraphFunction` |
| 整数运算 | 没有——`int`、`uint`、`bool` 和 `half` 在图里都是浮点；两个整数构造器之间的 `/` 是 [`DSH4243`](/docs/plugin/diagnostics/dsh4xxx#dsh4243) | 见[表达式](/docs/graph/expressions#integer-division) |
| 十六进制、八进制、二进制字面量 | 十六进制是 `DSH2222` | 十进制字面量；见[字面量](/docs/plugin/graph/literals) |
| 字符串值 | `DSH4202` 在命名 `UE.*` 参数之外 | —— |
| 三元条件 | `DSH2200` | `if` / `else`、`lerp`、`StaticSwitchParameter` |
| 逗号运算符 | 没有 | 拆成多条语句 |
| 表达式内赋值 | `DSH2204` | 拆成多条语句 |
| 嵌套花括号初始值 | `DSH2214` | 用构造器调用：`float4(float2(1,2), float2(3,4))` |
| 预处理指令 | 只有[条件编译那一组](/docs/plugin/language/preprocessor)和 `#Region` / `#EndRegion` | `import`、`const` 属性 |
| `Code = { … }` 里的 `Shader` | **已移除**——[`DSH2246`](/docs/plugin/diagnostics/dsh2xxx#dsh2246) | `Graph = { … }` |

## 诊断 [#diagnostics]

| 码 | 触发条件 |
| :-- | :-- |
| `DSH1035` | 一行 `#`，不属于条件编译组和 `#Region` / `#EndRegion` —— `#include`、`#pragma` |
| `DSH2101` | 不属于任何记号的字符 |
| `DSH2105` | 写坏的数：`0.5.5`、`1.0fx`、`1e` |
| `DSH2151` | 本该是一个表达式，却出现了别的东西：`struct`、`= 5;`、`if ()` |
| `DSH2152` | 缺少一个 `)` —— 常见于两个参数之间缺了 `,` |
| `DSH2154` | 语句没有以 `;` 结束：大小写写错的 `If`、一个函数定义、末尾缺 `;` 的最后一条语句 |
| `DSH2160` | 语句开头出现 `switch`、`case` 或 `default` |
| `DSH2162` | 声明之外把花括号列表当作值使用 |
| `DSH2200` | 在 `if` 条件之外出现比较、逻辑运算符或 `?:` |
| `DSH2201` | `%`、移位或位运算符 |
| `DSH2202` | `[ ]` |
| `DSH2203` | C 风格强制转换 |
| `DSH2204` | 表达式内赋值 |
| `DSH2205` | 复合赋值 |
| `DSH2207` | `++` 或 `--` |
| `DSH2208` | `for`、`while`、`do`、`return`、`break`、`continue`、`discard` |
| `DSH2209` | `if` 或 `else` 的块体不带花括号 |
| `DSH2210` | `if` 条件里多于一个比较，或用了 `&&` / `\|\|` |
| `DSH2211` | 值无人接收的表达式语句 |
| `DSH2212` | Graph 变量上的存储关键字 |
| `DSH2213` | 数组声明子 |
| `DSH2214` | 花括号初始值里嵌套花括号列表 |
| `DSH2220` | 一个裸 `{ … }` 块 |
| `DSH2222` | 十六进制字面量 |
| `DSH2246` | `Shader` 或函数块里的 `Code` 段 |
| `DSH4202` | 字符串被当作值使用 |
| `DSH4243` | `/` 的两个操作数都是整数构造器调用 |
| `DSH4361` | 矩阵值 |
| `DSH6302` | 1.x 函数参数上的 `inout` |

包含每条消息的完整列表见[诊断索引](/docs/diagnostics)。

## 示例 [#example]

一段 GLSL 风格的尝试，以及它的 DreamShaderLang 等价写法。

```c
// Refused.
Graph {
    vec2  uv    = UE.TexCoord(Index = 0);
    float t     = UE.Time() % 4.0;                 // DSH2201
    float mask  = uv.x > 0.5 && uv.y > 0.5;        // DSH2200
    vec3  col   = mask ? Hot : Cold;               // DSH2200
    col        *= Gain;                            // DSH2205
    Color = col;
}
```

```c
// Correct.
Graph {
    vec2  uv = UE.TexCoord(Index = 0);
    float t  = fmod(UE.Time(), 4.0);

    vec3 col;
    if (uv.x > 0.5) {
        if (uv.y > 0.5) { col = Hot; } else { col = Cold; }
    } else {
        col = Cold;
    }

    Color = col * Gain;
}
```

任何真正命令式的东西——循环、位掩码、`switch`——都属于 `Function`，它的函数体是真 HLSL，会被编译进一个 `Custom` 节点：

```c
Function SelfContained float Ring(in float2 uv, in float count)
{
    float acc = 0.0;
    for (int i = 0; i < 4; ++i)
    {
        acc += sin(uv.x * count * (i + 1));
    }
    return acc * 0.25;
}
```

```c
Graph {
    float r = Ring(uv, 8.0);
}
```

## 参见 [#see-also]

- [语句](/docs/graph/statements) —— *确实*被支持的语句形式
- [表达式](/docs/graph/expressions) —— 存在的那四个运算符及其优先级
- [`if` / `else`](/docs/graph/control-flow) —— 唯一的控制流，以及条件运算符
- [字面量](/docs/plugin/graph/literals) —— 接受的数字形式、后缀，以及什么不是字面量
- [构造器](/docs/plugin/graph/constructors) —— 强制转换与矩阵构造的替代方案
- [Swizzle](/docs/plugin/graph/swizzle) —— 下标的替代方案
- [调用](/docs/graph/calls) —— 把命令式代码搬进可调用函数
- [`Function`](/docs/plugin/language/function) —— HLSL 函数体，循环和位运算符在那里合法
- [`GraphFunction`](/docs/plugin/language/graph-function) —— 把 `UE.*` 节点提升为引脚的 HLSL 函数体
- [数学内置](/docs/builtins/math) —— `fmod`、`min`、`max`、`clamp`、`lerp`
- [名称解析](/docs/plugin/graph/name-resolution) —— 大小写敏感对照表
- [`dsc migrate`](/docs/language-v2/migrate) —— 把 1.x 文件改写为 `.dss`，那里有循环和 `?:`
- [诊断索引](/docs/diagnostics) —— 按阶段列出每个码
