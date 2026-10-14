---
title: "MaterialAttributes"
description: "MaterialAttributes"
---

# MaterialAttributes [#materialattributes]

> [DreamShader](/docs/) » [Graph](/docs/graph/overview) » **MaterialAttributes**

一种类似结构体的 Graph 值，将整个材质的属性集作为单个连接来承载，逐成员写入和读取。*（自 1.2.5 起）*

| | |
| :-- | :-- |
| 声明位置 | `.dsm`、`.dsf` — 位于 `Graph { … }` 主体、`Outputs` 声明或函数的 `Inputs` / `Outputs` 区段内 |
| 类别 | 值类型 |
| 生成内容 | `UMaterialExpressionMakeMaterialAttributes`（空集）、`UMaterialExpressionSetMaterialAttributes`（已写入的属性，即使用该值的位置）、`UMaterialExpressionBreakMaterialAttributes`（成员读取） |

## 概要 [#synopsis]

```c
MaterialAttributes <name> ;                       // creates an empty attribute set
MaterialAttributes <name> = <material-attributes-expression> ;

<name> . <member> = <expression> ;                // member write

<expression> := <name> . <member>                 // member read
```

`.`、`=` 和 `;` 是 DreamShaderLang 的字面标点。`<member>` 是 [Members](#members) 中的名称之一。

## 值类型 [#the-value-type]

| 属性 | 值 |
| :-- | :-- |
| 分量数量 | 无 — 属性集是一种独立的类型，永远不是标量或向量 |
| 类型标记 | `MaterialAttributes`，大小写不敏感匹配 |
| 替代拼写 | 无：类型标记是一个整体标记，因此 `Material Attributes` 不再能解析 *（自 2.0.0 起）* |
| 算术运算 | 拒绝 — [`DSH4226`](/docs/plugin/diagnostics/dsh4xxx#dsh4226) |
| 通道重排 | 不适用；对此类值使用 `.member` 是属性读取，永远不是通道掩码 |
| 赋值 | 只能来自另一个 `MaterialAttributes` 值；其他任何情况均为 [`DSH4228`](/docs/plugin/diagnostics/dsh4xxx#dsh4228) |
| 赋值给数值目标 | 拒绝 — `DSH4228` |

## 创建值 [#creating-a-value]

| 形式 | 效果 |
| :-- | :-- |
| `MaterialAttributes Attrs;` | 空集：一个 `MakeMaterialAttributes` 节点，所有输入均未连接。与 `Texture2D` 和 `Substrate` 不同，`MaterialAttributes` 声明**不**要求初始化器。 |
| `MaterialAttributes Attrs = {};` | 与裸声明完全相同 — 空花括号初始化器等同于没有初始化器。 |
| `MaterialAttributes B = A;` | `B` 采用 `A` 的值。不会创建任何节点。 |
| `MaterialAttributes Attrs = F_Layer(uv);` | 任何值为 `MaterialAttributes` 的表达式 — 函数调用、`StaticSwitchParameter` 调用。 |

> [!WARNING]
> **在 `Shader` 中，`Outputs` 声明会创建该变量** *（自 2.0.0 起）*。每个 `Outputs`
> 声明都声明在材质主体的顶部，而 `MaterialAttributes` 声明初始为空集，
> 因此 `Attrs.BaseColor = Tint;` 无需任何 `Graph` 声明即可工作。
> `Graph` 中的 `MaterialAttributes Attrs;` 命名的是同一个变量，不会额外添加任何内容：
>
> ```c
> Outputs { MaterialAttributes Attrs; Base.MaterialAttributes = Attrs; }
> Graph   { MaterialAttributes Attrs; Attrs.BaseColor = Tint; }
> ```
>
> 在函数块中，`MaterialAttributes` 输出即为该函数的输出：写入其中的属性构成其集合，读取从未写入的属性会得到
> [`DSH4370`](/docs/plugin/diagnostics/dsh4xxx#dsh4370)。

> [!NOTE]
> `MaterialAttributes B = A;` 是值拷贝，不是别名。之后对 `B.Roughness = r;` 的修改仅改变 **`B`**；
> `A` 保持其属性不变。

## 成员 [#members]

属性表即引擎的表 *（自 2.0.0 起）*：此引擎不具备的属性为
[`DSH5200`](/docs/plugin/diagnostics/dsh5xxx#dsh5200)。成员名称先进行精确匹配（名称或别名），
然后忽略大小写匹配，并给出警告 [`DSH5276`](/docs/plugin/diagnostics/dsh5xxx#dsh5276)。别名
是完全同义的。

| 成员 | 别名 | 分量 |
| :-- | :-- | :-- |
| `BaseColor` | — | 3 |
| `Metallic` | — | 1 |
| `Specular` | — | 1 |
| `Roughness` | — | 1 |
| `Anisotropy` | — | 1 |
| `EmissiveColor` | `Emissive` | 3 |
| `Opacity` | — | 1 |
| `OpacityMask` | — | 1 |
| `Normal` | — | 3 |
| `Tangent` | — | 3 |
| `WorldPositionOffset` | `WPO` | 3 |
| `SubsurfaceColor` | — | 3 |
| `CustomData0` | `ClearCoat` | 1 |
| `CustomData1` | `ClearCoatRoughness` | 1 |
| `AmbientOcclusion` | `AO` | 1 |
| `Refraction` | — | 3 |
| `CustomizedUV0` … `CustomizedUV7` | — | 2 |
| `PixelDepthOffset` | `PDO` | 1 |
| `Displacement` | — | 1 |
| `DiffuseColor` | — | 3 |
| `SpecularColor` | — | 3 |
| `SurfaceThickness` | — | 1 |
| `FrontMaterial` *（UE 5.4+）* | — | 一个 `Substrate` 值 |
| `MaterialAttributes` | `Attributes` | 整个集合 |

1.x 别名 `CustomizedUVs0` … `CustomizedUVs7` 不在别名表中 *（自 2.0.0 起）*；
请写 `CustomizedUV0` … `CustomizedUV7`。

`MaterialAttributes`（别名 `Attributes`）可作为成员解析 *（自 2.0.0 起；1.x 会拒绝）*：它
是整个集合，也是绑定 `Base.MaterialAttributes = Attrs;` 所写入的内容。要替换
`Graph` 变量的整个集合，请对变量本身赋值：`Attrs = Other;`。

> [!NOTE]
> 引擎分支宏 `MOON_ENGINE` 添加了成员 `MoonEncodedAttribute0` 到
> `MoonEncodedAttribute4`。改名前的拼写 `MooaEncodedAttribute0` …
> `MooaEncodedAttribute4` 可作为别名接受，因此反编译的 MooaToon 函数仍能解析。这些
> 在标准 UE 5.3–5.8 构建中并不存在。

### 读取成员 [#reading-a-member]

读取主体已在此值中写入的属性，得到的就是该已写入的值；不会生成节点。
其他任何读取都来自每个值一个 `UMaterialExpressionBreakMaterialAttributes`，由该值的所有读取共享
*（自 2.0.0 起；1.x 为每次读取生成一个 Break 节点）*。

> [!WARNING]
> 必须经过 Break 节点的读取，需要引擎的 Break 节点发布该
> 属性；未发布的属性为 [`DSH8216`](/docs/plugin/diagnostics/dsh8xxx#dsh8216)。这取决于
> 引擎构建版本。无可读取内容的值 — 函数在尚未写入任何内容之前的 `MaterialAttributes` 输出 — 为 `DSH4370`。

读取结果是具有该成员分量数量的普通数值，因此可以重排通道：
`Attrs.BaseColor.r` 是先进行属性读取，然后进行通道选择。

### 写入成员 [#writing-a-member]

成员写入会为该属性记录值；之后对同一属性的写入会替换它。节点在值**被使用**的地方生成 — 传给函数或引脚、赋给
输出、绑定到材质：在该值的集合之上生成一个 `UMaterialExpressionSetMaterialAttributes`，
目前已写入的每个属性对应一个引脚 *（自 2.0.0 起；1.x 为每次写入链式生成一个 Set 节点）*。
底下没有集合的值 — 函数的输出 — 则改为生成一个带已写入引脚的 `MakeMaterialAttributes`。

| 规则 | 失败时的代码 |
| :-- | :-- |
| 目标必须是 `name.member`；成员的成员不是目标 | [`DSH2206`](/docs/plugin/diagnostics/dsh2xxx#dsh2206) |
| 基础名称必须已声明 | [`DSH4200`](/docs/plugin/diagnostics/dsh4xxx#dsh4200) |
| 基础必须持有 `MaterialAttributes` 值 | 对数值，该成员被读取为通道重排，[`DSH4230`](/docs/plugin/diagnostics/dsh4xxx#dsh4230)；对纹理 [`DSH4206`](/docs/plugin/diagnostics/dsh4xxx#dsh4206)；对 `Substrate` 值 [`DSH4207`](/docs/plugin/diagnostics/dsh4xxx#dsh4207) |
| 成员名称必须能解析 | `DSH5200` |
| 值必须匹配成员的类型 | `DSH4228`；更宽的向量会取其前导分量，并给出信息 [`DSH5289`](/docs/plugin/diagnostics/dsh5xxx#dsh5289) |

强制转换遵循常规规则：标量会扩展，更宽的值会被截取其前导分量
（`DSH5289`），而将 float2 赋给 float3 成员是错误。请参阅
[Conversions](/docs/plugin/graph/conversions)。

> [!NOTE]
> `Attrs.BaseColor.r = 1.0;` 是 `DSH2206`。在 1.x Graph 中没有按通道写入属性的功能；
> 请先构建完整的值。
>
> 声明的名称是一个标识符，因此 `MaterialAttributes A.B = x;` 是
> [`DSH2154`](/docs/plugin/diagnostics/dsh2xxx#dsh2154) *（自 2.0.0 起）*。

### 成员上的花括号初始化器 [#brace-initializers-on-a-member]

`Attrs.BaseColor = {1.0, 0.35, 0.1};` 是 [`DSH2162`](/docs/plugin/diagnostics/dsh2xxx#dsh2162)
*（自 2.0.0 起）*：花括号列表只能作为声明的初始化器被读取。请编写构造函数，
`Attrs.BaseColor = float3(1.0, 0.35, 0.1);`。

## 传递属性值 [#passing-attribute-values-around]

| 上下文 | 行为 |
| :-- | :-- |
| `Outputs { MaterialAttributes Attrs; }` | 在 `Shader` 中，声明变量 `Attrs`，初始为空集（见上文）。 |
| `Base.MaterialAttributes = Attrs;` | 将值绑定到材质并开启 *Use Material Attributes*。 |
| `ShaderFunction` / `ShaderLayer` / `ShaderLayerBlend` / `VirtualFunction` 输入和输出 | 接受。该参数必须已经是 `MaterialAttributes` 值；不会进行任何转换（输入会 `DSH4226`，另一种类型的输出变量会 [`DSH4218`](/docs/plugin/diagnostics/dsh4xxx#dsh4218)）。 |
| `GraphFunction` 结果类型 | 接受 — `MaterialAttributes` 是可识别的结果类型标记之一。 |
| `if` / `else` | 各分支的属性会逐一合并：分支之间不一致的每个属性对应一个条件节点。在两个分支中赋值不同的完整集合是 [`DSH4375`](/docs/plugin/diagnostics/dsh4xxx#dsh4375) — 参见 [if / else](/docs/graph/control-flow#what-cannot-be-selected)。 |
| `StaticSwitchParameter` 调用分支 | 当两个分支都是属性值时接受。 |
| 构造函数参数 | 拒绝 — `DSH4226`。 |
| 算术操作数 | 拒绝 — `DSH4226`。 |

绑定 `Base.MaterialAttributes` 的完整文档见
[输出绑定](/docs/plugin/language/output-bindings)。

## Substrate 交互 [#substrate-interaction]

`Substrate` 是**独立的**值类型，不是属性集，并且需要 UE 5.4 或更高版本。两者
永远不会相互转换。

| 情况 | 行为 |
| :-- | :-- |
| `Substrate` 值赋给 `MaterialAttributes` 目标，或反过来 | `DSH4228` |
| `Substrate` 值赋给任意数值目标，包括属性成员 | `DSH4228` |
| 带 `.member` 的 `Substrate` 值 | `DSH4207`，例外是仍在构建中的 `Substrate` 值 — 参见 [Substrate 内置项](/docs/builtins/substrate) |
| `Substrate` 值作为 `if` 分支值 | 静态条件下为 `StaticSwitch`，否则为 `Substrate.Select`（UE 5.6+）或 [`DSH4378`](/docs/plugin/diagnostics/dsh4xxx#dsh4378) — 参见 [if / else](/docs/graph/control-flow#what-cannot-be-selected) |
| `Attrs.FrontMaterial` | 该成员在 UE 5.4+ 上可解析，类型为 **`Substrate`** *（自 2.0.0 起；1.x 将其类型定为单个数字）*。Substrate 表面的常规路径仍是 `Base.FrontMaterial` 输出绑定。 |
| 同一个 `Shader` 中的 `Base.MaterialAttributes` 和 `Base.FrontMaterial` | 不会拒绝 *（自 2.0.0 起）*。两者都会连线，而第一个开启的 *Use Material Attributes* 会使材质读取属性集而不是其各个引脚。 |
| 在不支持它的引擎上使用 `Substrate` 节点 | [`DSH5294`](/docs/plugin/diagnostics/dsh5xxx#dsh5294) |

关于 `Substrate.*` 调用接口，参见 [Substrate 内置项](/docs/builtins/substrate)。

## 诊断 [#diagnostics]

| 代码 | 触发条件 |
| :-- | :-- |
| `DSH5200` | 成员名称不是此引擎的属性 |
| `DSH5276` | *警告：* 成员名称仅在忽略大小写时匹配到属性 |
| `DSH2206` | 成员写入的目标不是 `name.member` — 例如 `Attrs.BaseColor.r = …` |
| `DSH2162` | 成员写入右侧出现花括号列表 |
| `DSH4200` | 基名称未声明 |
| `DSH4230`、`DSH4206`、`DSH4207` | 成员的基保存的是数字、纹理或 `Substrate` 值 |
| `DSH4226` | 属性集被用于算术、作为构造函数参数或作为另一种类型的函数输入 |
| `DSH4228` | 属性集被赋值到期望其他内容的位置，或反过来；成员值不匹配 |
| `DSH5289` | *信息：* 较宽的值被截断到成员的前导分量 |
| `DSH4370` | 从没有任何可读取内容的值中读取成员 |
| `DSH4372` | 仅在 `if` 的一个分支中设置了成员，而底层没有任何值，在 `if` 之后被读取 |
| `DSH4375` | `if` 的两个分支在同一变量中留下不同的完整集合 |
| `DSH8216` | 引擎的 Break 节点未发布正在读取的属性 |
| [`DSH8214`](/docs/plugin/diagnostics/dsh8xxx#dsh8214)、[`DSH8212`](/docs/plugin/diagnostics/dsh8xxx#dsh8212) | 发射器无法创建 Make / Set / Break 节点，或无法连接属性引脚 |

## 示例 [#example]

```c
Shader(Name="Docs/M_MatAttrs")
{
    Properties {
        vec3            BaseTint = vec3(0.6, 0.8, 1.0);
        ScalarParameter R        = 0.35 [Group="Surface"];
    }

    Settings {
        Domain       = "Surface";
        ShadingModel = "DefaultLit";
        BlendMode    = "Opaque";
    }

    Outputs {
        MaterialAttributes Attrs;
        Base.MaterialAttributes = Attrs;
    }

    Graph {
        MaterialAttributes Attrs;

        Attrs.BaseColor = BaseTint;
        Attrs.Roughness = R;
        Attrs.Metallic  = 0.0;

        // Read a member back out and feed it to another member.
        float Rough     = Attrs.Roughness;
        Attrs.Specular  = Rough * 0.5;
    }
}
```

生成的节点：

```text
VectorParameter           BaseTint                       (property node)
ScalarParameter           R
MakeMaterialAttributes                                    -> Attrs (empty set)
Constant                  0.0
Constant                  0.5
Multiply                  R * 0.5                         (the read of Roughness is R itself)
SetMaterialAttributes     base=Make, BaseColor=BaseTint, Roughness=R,
                          Metallic=0.0, Specular=Multiply -> Base.MaterialAttributes
```

材质的 *Use Material Attributes* 标志由 `Base.MaterialAttributes` 绑定设置。

## 另请参阅 [#see-also]

- [输出绑定](/docs/plugin/language/output-bindings) — `Base.MaterialAttributes` 和完整目标目录
- [声明](/docs/plugin/graph/declarations) — 声明形式、默认值和重复声明规则
- [语句](/docs/graph/statements) — 作为语句形式的成员赋值
- [转换](/docs/plugin/graph/conversions) — 应用于每次成员写入的转换
- [构造函数](/docs/plugin/graph/constructors) — 用来替代花括号列表的构造函数
- [Swizzle](/docs/plugin/graph/swizzle) — 选择成员读取的通道
- [`if` / `else`](/docs/graph/control-flow) — 在两个属性值之间选择
- [调用](/docs/graph/calls) — 将属性值传入和传出函数
- [节点重用](/docs/plugin/graph/node-reuse) — 哪些节点会被去重
- [Substrate 内置项](/docs/builtins/substrate) — `Substrate.*` 接口和 UE 5.4 限制
- [类型](/docs/language/types-and-values) — 每个类型标记及其有效位置
