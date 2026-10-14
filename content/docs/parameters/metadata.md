---
title: "元数据块"
description: "元数据块"
---

# 元数据块 [#metadata-block]

> [DreamShader](/docs/) » [参数](/docs/plugin/parameters) » **元数据块**

声明末尾的 `[ … ]` 块：一组 `Key = Value` 条目，用于设置生成节点的组织字段；对于语言不认识的任何键，则直接写入该节点类的反射 UPROPERTY。

| | |
| :-- | :-- |
| 声明于 | `.dsm`、`.dsf` —— 在 `Properties` 声明之后，或在 `Inputs` / `Outputs` / `Results` 类型参数之后 |
| 种类 | 声明后缀 |
| 生成 | 对声明所生成节点的属性写入 |
| 起始版本 | `1.2.3`；分号分隔形式起始于 `1.2.4`；`Slider(min, max)` 起始于 `1.5.0` |

## 概要 [#synopsis]

```c
<declaration> [ <entry> ; <entry> ; … ] ;
<declaration> [ <entry> , <entry> , … ] ;
```

```text
<entry> := <key> = <value>
         | Slider( <min> , <max> )
```

上面的每个 `[`、`]`、`;`、`,`、`=` 和 `( )` 都是**字面 DreamShaderLang 标点**，不是元符号。`;` 和 `,` 可以在一个块中混用，且接受 `]` 之前的末尾分隔符。`Slider(…)` 是唯一不带 `=` 的条目形式。

放置规则：

| 规则 | 行为 |
| :-- | :-- |
| 块位于名称和默认值之后、紧接 `;` 之前 | 深度为零处的 `[` 结束默认值；`( … )` 内以及字符串字面量内的方括号属于默认值 |
| 仅为一个 `[ … ]` 块的语句 | [`DSH3250`](/docs/plugin/diagnostics/dsh3xxx#dsh3250) |
| 条目以 `;` **或** `,` 分隔 | 接受在一个块中混用两者 |
| `]` 之前的末尾 `;` 或 `,` | 接受 |
| 键的比较忽略大小写 | `[ Group = "X" ]`、`[group="X"]` 和 `[GROUP="X"]` 是同一个条目 |
| 值不带引号 | 带引号的值会去掉引号并读取其转义；不带引号的值就是所写的文本 |
| 键不是名称、键没有 `=`、`=` 没有值、缺少 `]` | [`DSH3255`](/docs/plugin/diagnostics/dsh3xxx#dsh3255) |
| 重复的键（忽略大小写） | [`DSH3256`](/docs/plugin/diagnostics/dsh3xxx#dsh3256) |

键的作用取决于属性所采取的形式 *（自 2.0.0 起）*：在**声明**上（每个紧凑 token、`ScalarParameter`、`StaticBoolParameter`、`VectorParameter`、`TextureObjectParameter`），条目成为 `uniform` 的 2.0 `///` 指令；在**于使用处展开**的参数节点上（`StaticSwitchParameter`、两个 mask、纹理采样 token），它们成为反射调用的参数。见[参数节点 token](/docs/plugin/parameters/parameter-nodes#the-22-tokens)。

## 可识别的键 [#recognized-keys]

| 键 | 别名 | 值 | 效果 |
| :-- | :-- | :-- | :-- |
| `Group` | `Category` | 字符串 | 节点的参数分组（`Group` UPROPERTY，一个 `FName`） |
| `Description` | `Desc`、`Tooltip` | 字符串 | 写入节点的 **`Desc`** UPROPERTY |
| `SortPriority` | `Sort` | 整数 | 节点的 `SortPriority`；非整数为 [`DSH3258`](/docs/plugin/diagnostics/dsh3xxx#dsh3258) |
| `ParameterName` | — | 字符串 | 覆盖材质参数名；缺省时使用声明的标识符 |
| `SamplerType` | — | 枚举字面量 | 纹理节点的采样器类型 —— 见 [SamplerType](/docs/plugin/parameters/sampler-type) |
| `Slider(min, max)` | — | 两个数字，无 `=` | `SliderMin` 和 `SliderMax` |
| *其他任意键* | — | 见下文 | 写入生成节点类上同名的反射 UPROPERTY |

所有键的比较都不区分大小写。*（自 2.0.0 起）* 可识别的键只执行其自身的职责；在 1.x 中每个条目还会被推送到反射属性写入器。

没有任何设置时 `SortPriority` 为 **32**，与 Unreal 自身的节点默认值一致。任何 `Group(…)` 作用域之外的声明都会写出该 32。

### `Slider(min, max)` [#slidermin-max]

```c
ScalarParameter Roughness = 0.5 [Slider(0, 1)];
```

不区分大小写匹配；括号内必须**恰好为两个**数字。它完全等价于 `[SliderMin = 0; SliderMax = 1]` —— 而在一个块中组合两种形式则算重复：

| 写法 | 结果 |
| :-- | :-- |
| `[Slider(0, 1)]` | `SliderMin = 0`、`SliderMax = 1` |
| `[SliderMin = 0; SliderMax = 1]` | 完全相同 |
| `[Slider(0, 1); SliderMin = 0]` | [`DSH3257`](/docs/plugin/diagnostics/dsh3xxx#dsh3257) |
| `[Slider(0)]` / `[Slider(0, 1, 2)]` / `[Slider(a, b)]` | `DSH3257` |
| `[Slider(1, 0)]` / `[Slider(1, 1)]` | [`DSH7220`](/docs/plugin/diagnostics/dsh7xxx#dsh7220) —— 最小值必须小于最大值 *（自 2.0.0 起）* |

滑条属于标量参数。在任何其他声明上 —— 向量、纹理、静态布尔 —— 范围会被丢弃，并给出 [`DSH7233`](/docs/plugin/diagnostics/dsh7xxx#dsh7233) 警告 *（自 2.0.0 起）*。单独的 `SliderMin` 或 `SliderMax` 会像其他键一样通过反射写入。在展开的 token 上，其类没有滑条，因此在构建材质时边界会被拒绝（[`DSH8212`](/docs/plugin/diagnostics/dsh8xxx#dsh8212)）。

### `ParameterName` [#parametername]

```c
ScalarParameter Rough [ParameterName = "Surface Roughness"];
```

声明的标识符仍然是 `Graph` 使用的名称；`ParameterName` 只更改材质向实例和蓝图公开的名称。在声明上，空值为 [`DSH7227`](/docs/plugin/diagnostics/dsh7xxx#dsh7227) *（自 2.0.0 起）*。

> [!NOTE]
> *（自 2.0.0 起）* `ParameterName` 通过反射写入一次。没有 `ParameterName` UPROPERTY 的类会得到 [`DSH8210`](/docs/plugin/diagnostics/dsh8xxx#dsh8210) 警告；能构建的参数节点 token 所属的类没有一个是这样的类（`DynamicParameter`，即 1.x 在此处拒绝的那个，为 [`DSH3253`](/docs/plugin/diagnostics/dsh3xxx#dsh3253)）。

## 别名重写与自动注入 [#alias-rewriting-and-auto-injection]

键入的键决定写入什么：

| 键入的键 | 在声明上 | 在展开的 token 上 |
| :-- | :-- | :-- |
| `Group`、`Category` | `@group` → `Group` | 参数 `Group` |
| `Description`、`Desc`、`Tooltip` | `@desc` → `Desc` | 参数 `Desc` |
| `SortPriority`、`Sort` | `@sort` → `SortPriority` | 参数 `SortPriority` |
| `ParameterName` | `@name` | 参数 `ParameterName` |
| `SamplerType` | `@sampler`，去掉 `SAMPLERTYPE_` 前缀 | 参数 `SamplerType` |
| `Slider(a, b)`，或 `SliderMin` 与 `SliderMax` 一起 | `@slider a b` | 参数 `SliderMin`、`SliderMax` |
| 其他任意键 | 其小写拼写，通过反射写入 | 同名参数 |

在声明上，外层 [`Group("Name") { … }` 作用域](#group-scopes-and-the-sortpriority-counter) 会注入 `Group`（除非键入了 `Group` 或 `Category`），并注入自动 `SortPriority`（除非键入了 `SortPriority` 或 `Sort`）。展开的 token 两者都不会得到。

## 反射属性透传 [#reflected-property-passthrough]

在**声明**上，无法识别的键会在构建材质时解析为生成节点类上的 `FProperty`：

1. 该键与每个 UPROPERTY 名称比较，忽略大小写；
2. 若失败，第二遍会从每个 `FBoolProperty` 名称中去掉开头的一个 `b` 并再次比较。

因此 `[FractionalPart = true]` 绑定 `bFractionalPart`，而 `[UseCustomPrimitiveData = true]` 绑定
`bUseCustomPrimitiveData`。显式写出 `b` 同样有效。没有属性匹配的键是
[`DSH8210`](/docs/plugin/diagnostics/dsh8xxx#dsh8210) **警告**，不写入 *（自 2.0.0 起；1.x
报错拒绝）*。

在**展开 token** 上，键先和类的输入引脚比对，再和它的属性比对，按引擎目录列出它们的顺序（布尔属性不带 `b` 的拼写作为别名）；只差大小写的
匹配给出 [`DSH5276`](/docs/plugin/diagnostics/dsh5xxx#dsh5276)。两者都不是的键报 [`DSH5213`](/docs/plugin/diagnostics/dsh5xxx#dsh5213) —— 或者，值是数字时，被当作
以节点属性命名的引脚（[`DSH5291`](/docs/plugin/diagnostics/dsh5xxx#dsh5291)，提示），
节点没有这个引脚时在构建材质时被拒绝（`DSH8212`）。

### 按属性类型的取值语法 [#value-grammar-by-property-type]

| 属性类型 | 接受的文本 | 失败时的码 |
| :-- | :-- | :-- |
| `bool` | `true` / `false`，不区分大小写 | [`DSH7132`](/docs/plugin/diagnostics/dsh7xxx#dsh7132) |
| `int32` | 整数 | [`DSH7133`](/docs/plugin/diagnostics/dsh7xxx#dsh7133) |
| `uint32` | `[0, 4294967295]` 内的整数 | [`DSH7134`](/docs/plugin/diagnostics/dsh7xxx#dsh7134) |
| `float` | 数字 —— 这里 `true` / `false` 不算数字 | [`DSH7135`](/docs/plugin/diagnostics/dsh7xxx#dsh7135) |
| `double` | 同 `float` | [`DSH7136`](/docs/plugin/diagnostics/dsh7xxx#dsh7136) |
| `FString` | 任意文本，trim 后原样保留 | — |
| `FName` | 任意文本，转成 `FName` | — |
| 对象引用 | `Path(…)`、以 `/…` 开头的绝对路径，或 `Class'…'` 引用 —— 见 [Path(…)](/docs/parameters/path#two-resolvers) | 见[下文](#object-properties) |
| `enum` | 枚举字面量，四种拼写 —— 见[下文](#enum-literals) | [`DSH7140`](/docs/plugin/diagnostics/dsh7xxx#dsh7140) |
| 以枚举为底的 `uint8` | 枚举字面量 | [`DSH7141`](/docs/plugin/diagnostics/dsh7xxx#dsh7141) |
| 普通 `uint8` | `[0, 255]` 内的整数 | [`DSH7142`](/docs/plugin/diagnostics/dsh7xxx#dsh7142) |
| 其他（结构体、数组等） | Unreal 自己的 import 文本，如 `(R=1,G=0,B=0,A=1)` | [`DSH7143`](/docs/plugin/diagnostics/dsh7xxx#dsh7143) |

数字按 Unreal 的 `LexTryParseString` 读，遇到第一个用不了的字符就停：`"0.5abc"` 是 `0.5`。这些码都包在
[`DSH8213`](/docs/plugin/diagnostics/dsh8xxx#dsh8213) 里到达你，它会指出节点和属性并引用这个码。
在展开 token 上，绑定器先检查值的种类：枚举值按目录检查（见下），名字
或资产路径要是带引号的字符串，其余要是编译期常量（[`DSH5224`](/docs/plugin/diagnostics/dsh5xxx#dsh5224)）。

### 枚举字面量 [#enum-literals]

枚举值先 trim、小写，再删除所有空格、`_`、`-`、`:`、
`.` 和 `/`。每个**未**标记 `UMETA(Hidden)` 的枚举项按四种拼写逐一尝试：

| # | 拼写 | 以 `SAMPLERTYPE_LinearColor` 为例 |
| :-- | :-- | :-- |
| 1 | 短名 | `SAMPLERTYPE_LinearColor` |
| 2 | 全限定名 | `EMaterialSamplerType::SAMPLERTYPE_LinearColor` |
| 3 | `DisplayName` 元数据 | `Linear Color` |
| 4 | 短名去掉第一个 `_` 及之前的部分 | `LinearColor` |

由于这套规范化，`"LinearColor"`、`"linear color"`、`"linear-color"`、
`"SAMPLERTYPE_LinearColor"` 和 `"linear.color"` 都是同一个值。这样一个枚举的完整展开表见
[SamplerType](/docs/plugin/parameters/sampler-type)。

这就是声明上的键走的匹配器。在**展开 token** 上，绑定器把值和引擎目录列出的枚举项比较 *（自 2.0.0 起）*：精确的名字通过；上面某种拼写
规范化后等于枚举项名的，接受并给出
[`DSH5278`](/docs/plugin/diagnostics/dsh5xxx#dsh5278) 警告；其他 —— 包括不同时也是枚举项名的 `DisplayName`，如 `Shared: Wrap` —— 报
[`DSH5215`](/docs/plugin/diagnostics/dsh5xxx#dsh5215)。

### 对象属性 [#object-properties]

对象类型的 UPROPERTY 接受资产引用，由 [Path(…)](/docs/parameters/path#two-resolvers) 里记录的共享解析器处理。

| 情况 | 码 |
| :-- | :-- |
| 值以 `Path(` 或 `/` 开头、或以 `'` 结尾，但解析不了 | 解析器自己的码 —— [`DSH8118`](/docs/plugin/diagnostics/dsh8xxx#dsh8118)–[`DSH8132`](/docs/plugin/diagnostics/dsh8xxx#dsh8132)，或 `Class'…'` 写了不相关的类时 [`DSH1045`](/docs/plugin/diagnostics/dsh1xxx#dsh1045) |
| 值以上都不是 | [`DSH7137`](/docs/plugin/diagnostics/dsh7xxx#dsh7137) |
| 资产能加载但类不对 | [`DSH7139`](/docs/plugin/diagnostics/dsh7xxx#dsh7139) |
| 资产加载失败 | [`DSH7138`](/docs/plugin/diagnostics/dsh7xxx#dsh7138) |

> [!WARNING]
> **加载失败的纹理会被静默接受。** 当属性是 `UTexture` 子类
> *且*名字恰好为 `Texture` 或 `TextureObject` 时，加载失败会写入 `nullptr`，并把这次写入
> 报告为成功。于是 `[Texture = Path(Game, "Typo")]` 不产生任何诊断就生成完毕，
> 留下一个未绑定的采样器。*（自 2.0.0 起）* 纹理采样
> token 和 `const` 纹理的默认值也写到这个属性上，同样如此；纹理采样节点随后
> 取引擎默认纹理。采样器出来不对时，先检查资产路径。

## 不走反射的组织字段 [#organization-fields-that-are-not-reflected]

`Group`、`SortPriority` 和 `Desc` 存在于 `UMaterialExpressionParameter` 子类上。缺少其中之一的类
得到 [`DSH8210`](/docs/plugin/diagnostics/dsh8xxx#dsh8210) **警告**，值
不写入。能构建的 15 个 token 生成的类都有这三个字段。

*（自 2.0.0 起）* 声明的类缺少的*其他*键也是同一个 `DSH8210` 警告，而 1.x
会让编译失败。在展开 token 上它是 `DSH5213`。

> [!NOTE]
> `DynamicParameter`，1.x 里三个字段都缺的那个情况，现在是 `DSH3253`，什么都不构建。

## `Group(…)` 作用域与 SortPriority 计数器 [#group-scopes-and-the-sortpriority-counter]

`Properties` 段里的一个 [`Group("Name") { … }` 作用域](/docs/parameters/properties)会给
成员打标记。它与显式元数据条目的交互如下：

| 情况 | 结果 |
| :-- | :-- |
| 成员既没写 `Group` 也没写 `Category` | 注入外层分组 |
| 成员写了 `Group` 或 `Category` | 写的值优先；该成员忽略作用域 |
| 嵌套作用域 | 用 `\|` 组合 —— `Group("Outer") { Group("Inner") { … } }` 得到 `Outer\|Inner` |
| 字面写成 `Group("Manual\|Literal")` | 原样透传 |
| 成员既没写 `SortPriority` 也没写 `Sort` | 从自动计数器取下一个值 |
| 成员写了 `SortPriority` 或 `Sort` | 写的值优先，**且不消耗计数器槽位** |
| 成员是展开 token（静态开关、mask、纹理采样） | 不打标记：无分组、无自动排序值、不占槽位 *（自 2.0.0 起）* |
| 成员声明为 `const` | 打标记并占一个槽位，但两个标记都是 [`DSH7224`](/docs/plugin/diagnostics/dsh7xxx#dsh7224) 警告：常量没有分组和排序 |
| 作用域之外的声明 | 无分组，`SortPriority` 为 32 |

计数器从 **0** 开始，步长 **10**，并且在整个块内的**所有作用域间共享**，不会
按分组重置：

```c
Properties {
    Group("Surface") {
        ScalarParameter A = 0.5;                   // SortPriority = 0
        VectorParameter B = float4(1, 1, 1, 1);    // SortPriority = 10
    }
    Group("Detail") {
        ScalarParameter C = 1.0 [SortPriority=99]; // 99 — does not consume a slot
        ScalarParameter D = 2.0;                   // SortPriority = 20
    }
    ScalarParameter Loose = 3.0;                   // no group, SortPriority = 32
}
```

## 备注 [#notes]

- 同一個 `[ … ]` 块可被 `Inputs` / `Outputs` / `Results` 类型化参数接受，但那里
  只有 `Description` / `Desc` / `Tooltip` 和 `SortPriority` / `Sort` 有任何效果。`Group` 会被
  解析并保留但从不应用 —— Unreal 的函数输入/输出节点没有分组字段 ——
  其余每个键都会被忽略，而不是被反射。输入的 `SortPriority` 默认为其
  声明序号。参见[输入 / 输出 / 结果](/docs/plugin/language/inputs-outputs)。
- **`Shader` 的 `Outputs` 语句上不接受任何元数据块**，`Settings`、`Options`
  或 `Layout` 条目上也不接受。
- `const` 声明只保留常量节点所拥有的内容：参见
  [紧凑类型 token](/docs/plugin/parameters/compact-types#notes)。
- 显式的 `[SamplerType=…]` 总是覆盖从资产推导出的类型。
- 引擎枚举的 `_MAX` 哨兵通常不带 `Hidden` 元数据，因此在声明上诸如
  `"SAMPLERTYPE_MAX"` 的值会解析而不是报错。不要使用它们。展开
  token 所对照的目录中并不列出它们（`DSH5215`）。

## 诊断 [#diagnostics]

### 解析期 [#parse-time]

| 代码 | 触发条件 |
| :-- | :-- |
| `DSH3250` | 语句只有一个 `[ … ]` 块 |
| `DSH3255` | 条目的键不是名字、键后没有 `=`、`=` 没有值，或块没有 `]` |
| `DSH3256` | 重复的键（比较时忽略大小写） |
| `DSH3257` | `Slider(…)` 未恰好带两个数字，或与 `SliderMin` / `SliderMax` 同时使用 |
| `DSH3258` | `SortPriority` / `Sort` 不是整数 |

### 绑定期 [#binding]

| 代码 | 触发条件 |
| :-- | :-- |
| `DSH7220` | 滑条的最小值不小于最大值 |
| `DSH7233` | 声明不是标量却使用了滑条（警告；丢弃） |
| `DSH7227` | 声明上的 `ParameterName` 为空 |
| `DSH7224` | `const` 上的 `Group` 或 `SortPriority`（警告） |
| [`DSH7222`](/docs/plugin/diagnostics/dsh7xxx#dsh7222) | 声明上的 `SamplerType` 为空 |
| `DSH5213` | 展开 token 的键既不是其类的引脚也不是属性 |
| `DSH5215` / `DSH5278` | 展开 token 的枚举值不是枚举项 / 是某个枚举项的 1.x 拼写（警告） |
| `DSH5224` | 展开 token 的值不是其属性所接受的种类 |
| `DSH5276` | 展开 token 的键仅在忽略大小写时匹配引脚或属性（警告） |

### 构建期 [#build-time]

| 代码 | 触发条件 |
| :-- | :-- |
| `DSH8210` | 声明的键，或 `Group` / `SortPriority` / `Desc` / `ParameterName` 之一，不是该类的属性（警告；不写入） |
| `DSH8213` | 属性无法接受其值；消息引用 `DSH7132`–`DSH7143` 或解析器自己的代码 |
| `DSH8212` | 展开 token 上的滑条或数值键未指认节点的任何引脚 |
| [`DSH8235`](/docs/plugin/diagnostics/dsh8xxx#dsh8235) | 声明的 `SamplerType` 未指认任何采样器类型 |

完整列表见[诊断索引](/docs/diagnostics)。

## 示例 [#example]

```c
Shader(Name="Docs/M_Metadata")
{
    Properties = {
        Group("11 - Specular") {
            TextureSampleParameter2D MetallicMap = Path(Game, "Textures/T_White_Linear") [
                SamplerType          = "LinearColor";
                SamplerSource        = "FromTextureAsset";
                MipValueMode         = "None";
                AutomaticViewMipBias = true;
                ConstCoordinate      = 0;
                ConstMipValue        = -1;
                Description          = "Packed metallic / roughness";
            ];

            ScalarParameter Metallic = 0.0 [Slider(0, 1); SortPriority = 51];
        }

        VectorParameter Tint = float4(1, 1, 1, 1) [
            Category               = "Look",
            Tooltip                = "Multiplied over base colour",
            UseCustomPrimitiveData = false,
            ParameterName          = "Base Tint"
        ];
    }

    Settings = { Domain = "Surface"; ShadingModel = "DefaultLit"; BlendMode = "Opaque"; }
    Outputs  = { vec3 Color; float M; Base.BaseColor = Color; Base.Metallic = M; }

    Graph = {
        vec4 S = MetallicMap(Coordinates = UE.TexCoord(Index = 0));
        Color = S.rgb * Tint.rgb;
        M     = S.b * Metallic;
    }
}
```

应用的属性：

```text
MetallicMap  Desc="Packed metallic / roughness"
             SamplerType=SAMPLERTYPE_LinearColor     SamplerSource=SSM_FromTextureAsset
             MipValueMode=TMVM_None  AutomaticViewMipBias=true
             ConstCoordinate=0       ConstMipValue=-1
Metallic     Group="11 - Specular"  SortPriority=51  SliderMin=0  SliderMax=1
Tint         Group="Look"           Desc="Multiplied over base colour"
             bUseCustomPrimitiveData=false           ParameterName="Base Tint"
```

`Metallic` 从它自己的条目取得 `SortPriority = 51`。`MetallicMap` 是展开 token，所以
`Group("11 - Specular")` 作用域不会给它打标记 *（自 2.0.0 起）*：要把它放入该分组，就在它
自己的块里写 `Group = "11 - Specular"`。

## 另见 [#see-also]

- [参数](/docs/plugin/parameters) —— 中心与决策表
- [紧凑类型 token](/docs/plugin/parameters/compact-types) —— 元数据块可以跟随的 token
- [参数节点 token](/docs/plugin/parameters/parameter-nodes) —— 每个 token 暴露的类专属键
- [SamplerType](/docs/plugin/parameters/sampler-type) —— 一个反射枚举的完全展开值表
- [Path(…)](/docs/parameters/path) —— 对象属性所接受的资产引用语法
- [属性（章节）](/docs/parameters/properties) —— `Group("Name") { … }` 作用域与排序
- [输入 / 输出 / 结果](/docs/plugin/language/inputs-outputs) —— 同一个块效果被削弱的地方
- [反编译器](/docs/tools/decompiler) —— 往返时总会发出的元数据键
- [诊断索引](/docs/diagnostics) —— 每一个代码
