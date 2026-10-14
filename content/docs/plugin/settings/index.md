---
title: "设置"
description: "设置"
---

# 设置 [#settings]

> [DreamShader](/docs/) » **设置**

该部分负责将 `<key> = <value>;` 键值对从源块传递到其生成的资源。

| | |
| :-- | :-- |
| 声明于 | `.dsm`、`.dsf`、`.dsh` — 位于 `Shader`、`ShaderFunction`、`ShaderLayer`、`ShaderLayerBlend` 或 `VirtualFunction` 内 |
| 类型 | 节 |
| 生成 | 无直接生成 — 它在外层块所生成的资源上写入属性 |

## 概要 [#synopsis]

```c
Settings [=] { <setting-statement> … }

<setting-statement> := <name> = <value> ;
<name>              := <identifier>
<value>             := <tokens up to the next ;> | "<text>"
```

节名称与其 `{ … }` 块之间的 `=` 是可选的语法糖 *(自 1.5.0 起)*。最后一条语句之后的 `;` 是可选的。

*(自 2.0.0 起)* 名称是**单个标识符**。1.x 还会将嵌套路径（`Lightmass.DiffuseBoost`）和固定数组索引（`PhysicalMaterialMap[2]`）读取为 `Shader` 块的键；旧版前端会在 `.` 或 `[` 处停止，并报告 [`DSH3261`](/docs/plugin/diagnostics/dsh3xxx#dsh3261)。

`Shader` 的 `Settings` 即为 2.0 的 `#pragma material(…)` — 参见 [2.0 语言](/docs/language-v2)。

## `Settings` 块可被接受的位置 [#where-a-settings-block-is-accepted]

| 块 | 节关键字 | 键处理 | 参考 |
| :-- | :-- | :-- | :-- |
| `Shader` | `Settings` | `Backend` 和 `Substrate` 由编译器读取；`BlendMode` / `RenderType`、`ShadingModel`、`MaterialDomain` / `Domain` 为手动处理；其他所有键通过反射写入 `UMaterial` — 未知键将导致构建失败（[`DSH8215`](/docs/plugin/diagnostics/dsh8xxx#dsh8215)） | [Shader 设置](/docs/settings/material) |
| `ShaderFunction` | `Settings` | 4 个可识别的键；其他所有键产生 [`DSH3263`](/docs/plugin/diagnostics/dsh3xxx#dsh3263) 警告并被忽略 | [函数设置](/docs/plugin/settings/function) |
| `ShaderLayer` | `Settings` | 同样的 4 个键 | [函数设置](/docs/plugin/settings/function) |
| `ShaderLayerBlend` | `Settings` | 同样的 4 个键 | [函数设置](/docs/plugin/settings/function) |
| `MaterialLayer` / `MaterialLayerBlend` *（1.3.0 起弃用；[`DSH2251`](/docs/plugin/diagnostics/dsh2xxx#dsh2251)）* | `Settings` | 同样的 4 个键 | [ShaderLayer](/docs/plugin/language/shader-layer) |
| `VirtualFunction` | `Settings` **或** `Options` | `Asset`（必需，[`DSH6312`](/docs/plugin/diagnostics/dsh6xxx#dsh6312)）和 `Description`；其他任何键均被忽略 | [选项](/docs/plugin/language/options) |
| `Function` / `GraphFunction` | — | 不存在 `Settings` 节；仅有 `Inputs`/`Properties`、`Outputs`/`Results` 以及 `Code`/`Graph` | [函数](/docs/plugin/language/function) |

一个块可以包含**多个** `Settings` 节。它们会合并为一个列表；重复写入的键保留**最后**的值，无论来自哪个节，并且重复会触发 [`DSH3262`](/docs/plugin/diagnostics/dsh3xxx#dsh3262) 警告 *(自 2.0.0 起)*。

## 语句的解析方式 [#how-a-statement-is-parsed]

*(自 2.0.0 起)* 旧版前端从文件中其他部分相同的词法单元（token）中读取 `Settings` 节：

| # | 步骤 | 结果 |
| --: | :-- | :-- |
| 1 | `//` 和 `/* … */` 注释属于琐碎内容 | 注释可以出现在任意两个词法单元之间，包括语句中间 |
| 2 | 一条语句由名称、`=` 和值组成；值一直延伸到 `( )`、`[ ]` 和 `{ }` 深度为零处的下一个 `;`，或延伸到关闭该节的 `}` | `Color = (R=1,G=0,B=0);` 是一条语句；空语句会被跳过，因此末尾的 `;` 是可选的 |
| 3 | 名称是单个标识符 | `Foo.Bar = 1;` 和 `Foo[2] = 1;` 属于 `DSH3261`，没有 `=` 的语句以及没有值的 `=` 也是如此 |
| 4 | 值为单个字符串字面量时给出其内容，其转义由词法分析器读取；其他任何值均按其书写原样处理 | 引号在**每个设置上都是可选的** |
| 5 | 名称重复时（忽略大小写比较）保留较后的值 | `DSH3262` |

由于步骤 4，`TwoSided = true;` 和 `TwoSided = "true";` 是相同的，而 `Domain = Surface;` 的行为与 `Domain = "Surface";` 完全一致。

## 键规范化 [#key-normalization]

有若干规范化操作作用于 `Settings` 数据。将它们混淆是本页大多数意外情况的根源。

| 阶段 | 按顺序的操作 | 应用于 |
| :-- | :-- | :-- |
| 重复检查、`Backend`、`Substrate` | 不区分大小写的比较 | 块中的每个键 |
| 键存储与直接查找 | 去除首尾空白、转为小写 | 到达材质的每个键；每次直接键探测（`BlendMode`、`ShadingModel`、`Domain` 等） |
| 反射查找 | 去除首尾空白、转为小写、删除每个空格、`_` 和 `-` | 属性名、[别名表](/docs/settings/material#alias-table) 以及特殊键测试 |
| 枚举的值查找 | 去除首尾空白、转为小写、删除每个空格、`_` 和 `-` | `ShadingModel`、`BlendMode`、`Domain` 值以及每个反射的枚举类型值（后者还会删除 `:`、`.` 和 `/`） |

不会剥离其他任何内容。拼写为 `Two_Sided` 的键存储为 `two_sided`，并且仅在稍后能够匹配，因为*反射*查找会剥离下划线。

> [!WARNING]
> 特殊的 `Shader` 键通过*直接*查找（去除首尾空白 + 转为小写）进行匹配，但会被*反射*规范化（同时剥离 `_`）从反射处理中跳过。因此，仅以下划线区别于规范名称的拼写两者都无法匹配，并且**不会应用于任何地方，也不产生任何诊断**：`Blend_Mode`、`Render_Type`、`Shading_Model`、`Material_Domain`、`Back_end`。请不带分隔符地书写 `BlendMode`、`RenderType`、`ShadingModel`、`MaterialDomain`、`Domain` 和 `Backend`。（自 2.0.0 起，空格或连字符根本不能出现在名称中。）参见 [Shader 设置](/docs/settings/material#special-keys)。

## 这不是固定的键列表 [#this-is-not-a-fixed-key-list]

`Settings` 在 `Shader` 块中**不是**受支持键的目录。少数键是手动处理的；其他所有键都通过 Unreal 反射针对生成的 `UMaterial` 进行解析。

```text
Settings key
   ├── Backend, Substrate
   │      └── read by the compiler when the source is bound; never reach the material
   ├── blendmode rendertype shadingmodel materialdomain domain
   │      └── hand-handled: value parsed through the project's alias maps
   └── anything else
          └── alias table  →  UMaterial / UMaterialInterface / UObject property lookup
                                 (name, b-stripped name, or DisplayName)
                              →  value parsed per the property's C++ type
```

参考文档读者必须理解的两个结果：

- `UMaterial` 或其任一基类上的任何 `UPROPERTY` 都可以通过其名称访问。嵌套结构体成员和固定数组元素无法从 1.x 的键访问 *(自 2.0.0 起)*；未带索引的固定大小数组属于 [`DSH7121`](/docs/plugin/diagnostics/dsh7xxx#dsh7121)。本手册中没有任何表格能够为该范围做到完整，因为它属于引擎的属性集，而非插件的属性集。
- 接受哪些枚举*值*同样来自引擎反射，因此修改过的引擎构建会自动贡献其自己的拼写。参见 [材质枚举](/docs/settings/enums)。

材质函数块则相反：只读取四个键，其他所有键都产生 `DSH3263` 警告。参见 [函数设置](/docs/plugin/settings/function)。

## 页面 [#pages]

| 页面 | 涵盖内容 |
| :-- | :-- |
| [着色器设置](/docs/settings/material) | 特殊键、别名表、反射解析器、各属性类型的值语法，以及每个生成的材质被重置为什么 |
| [材质枚举](/docs/settings/enums) | 所有可接受的 `ShadingModel`、`BlendMode` 和 `Domain` 拼写 |
| [后端](/docs/settings/backend) | `Graph` 与 `ThinCustom`、旧的 `Instance` 拼写、相对项目默认值的优先级 |
| [函数设置](/docs/plugin/settings/function) | `Settings` 位于 `ShaderFunction` / `ShaderLayer` / `ShaderLayerBlend` 内部 |
| [项目设置](/docs/settings/project) | *Project Settings ▸ DreamPlugin ▸ Dream Shader* — 全部十七个配置属性，包括 *Preprocessor Defines* |

## 诊断 [#diagnostics]

### 解析时 [#parse-time]

| 代码 | 触发条件 |
| :-- | :-- |
| `DSH3261` | `Settings` 之后没有 `{`；不以名称开头的语句；名称之后没有 `=`（即在键中放入 `.` 或 `[` 时出现的情况）；没有值的 `=` |
| `DSH3262` | 在块中写入两次的名称，比较时忽略大小写（警告；后写入的值生效） |
| `DSH3263` | 函数块中它不读取的键（警告；被忽略） |
| [`DSH2245`](/docs/plugin/diagnostics/dsh2xxx#dsh2245) | `Shader` 内部的节名称、函数块或该块不具备的 `VirtualFunction` |
| [`DSH2246`](/docs/plugin/diagnostics/dsh2xxx#dsh2246) | `Shader` 或函数块中的 `Code` 节，该块采用 `Graph` |

在*应用*设置时引发的诊断列于 [着色器设置](/docs/settings/material#diagnostics)、
[后端](/docs/settings/backend#diagnostics) 和 [函数设置](/docs/plugin/settings/function#diagnostics)。

## 示例 [#example]

```c
Shader(Name="Docs/M_SettingsGrammar")
{
    Properties { vec3 Tint = vec3(1.0, 0.5, 0.25); }

    // Two Settings sections merge into one list.
    Settings {
        Domain       = Surface;        // quotes are optional
        ShadingModel = "Unlit";
        BlendMode    = "Opaque";
    }

    Settings = {
        BlendMode           = "Translucent";   // last write wins over "Opaque" (DSH3262)
        TwoSided            = true;            // reflected onto UMaterial::TwoSided
        OpacityMaskClipValue = 0.5;            // reflected, float-typed
    }

    Outputs {
        vec3  Color;
        float Alpha;
        Base.EmissiveColor = Color;
        Base.Opacity       = Alpha;
    }

    Graph {
        Color = Tint;
        Alpha = 0.5;
    }
}
```

有效设置，键为发射器存储它们时的形式：

```text
domain                  -> Surface
shadingmodel            -> Unlit
blendmode               -> Translucent
twosided                -> true
opacitymaskclipvalue    -> 0.5
```

## 另请参阅 [#see-also]

- [着色器设置](/docs/settings/material) — 完整的 `Shader` 键表面
- [材质枚举](/docs/settings/enums) — 每个 `ShadingModel`、`BlendMode` 和 `Domain` 拼写
- [后端](/docs/settings/backend) — 选择实例化策略
- [函数设置](/docs/plugin/settings/function) — 四个材质函数键
- [项目设置](/docs/settings/project) — 项目范围的默认值和映射表
- [Shader](/docs/plugin/language/shader) — 材质 `Settings` 节所在的块
- [ShaderFunction](/docs/plugin/language/shader-function) — 材质函数块
- [VirtualFunction](/docs/plugin/language/virtual-function) — 现有资产上的 `Options` / `Settings`
- [选项](/docs/plugin/language/options) — `VirtualFunction` `Options` 键
- [词法元素](/docs/language/lexical) — 注释、字符串字面量和转义
- [诊断索引](/docs/diagnostics) — 每个代码
