---
title: "DreamShaderBuiltins.ush"
description: "DreamShaderBuiltins.ush"
---

# DreamShaderBuiltins.ush [#dreamshaderbuiltinsush]

> [DreamShader](/docs/) » [内置项](/docs/plugin/builtins) » **`DreamShaderBuiltins.ush`**

随插件一起提供的 HLSL 头文件，定义了 `DS_*` 宏和函数，与材质翻译器为对应 `UE.*` 内置节点生成的 HLSL 保持一致。

| | |
| :-- | :-- |
| 类型 | 随附的 HLSL 头文件 |
| 磁盘位置 | `<Plugin>/Shaders/DreamShaderBuiltins.ush` |
| 虚拟着色器路径 | `/Plugin/DreamShader/DreamShaderBuiltins.ush` |
| 包含防护 | `DREAMSHADER_BUILTINS_USH` |
| 定义 | 25 个 `DS_*` 符号 — 22 个宏和 3 个函数 |
| 由插件生成 | **否** — 参见[可达性](#reachability) |

## 概要 [#synopsis]

```hlsl
#include "/Plugin/DreamShader/DreamShaderBuiltins.ush"
```

## 虚拟路径 [#the-virtual-path]

在模块启动时，DreamShader 会从虚拟目录 `/Plugin/DreamShader` 到插件的 `Shaders` 文件夹注册一个着色器源码目录映射，除非该虚拟目录的映射已经存在。该映射是无条件的 —— 它不依赖任何工程设置、后端选择或引擎版本 —— 因此 `/Plugin/DreamShader/DreamShaderBuiltins.ush` 总是能被引擎的着色器预处理器解析。

这是与*生成的着色器虚拟目录* `/DreamShaderGenerated` 分开的一个映射，后者也是由模块注册的。自 2.0.0 起，DreamShader 不再在那里写入每个源码的辅助文件 `.ush`：`Function` 的 HLSL 被嵌入到其 Custom 节点的代码中。参见[生成的 HLSL](/docs/plugin/generation/generated-hlsl)。

## 可达性 [#reachability]

插件中没有任何地方会为此头文件发出 include，插件中也没有任何地方引用任何 `DS_*` 符号。该名称在文件自身之外唯一的出现是一处源码注释。

| 路径 | 是否包含此头文件？ |
| :-- | :-- |
| 由 `Function` 块创建的 `Custom` 节点 | 否 — 主体即节点代码，它调用的其他 `Function` 被嵌入为所生成包装结构的 `DreamShaderFn_*` 成员，节点的 include 列表只包含主体头部的那几行 `#include` *（自 2.0.0 起；1.x 会写入每个源码的辅助文件 `.ush`）* |
| `Graph` 后端 | 否 — 它生成材质节点，而不是 HLSL |
| `ThinCustom` 后端 | 否 |
| [`Function`](/docs/plugin/language/function) HLSL 主体中手写的 `#include` | 是 — 虚拟路径可被解析 |

该头文件自身的注释将其描述为被材质翻译单元内生成的 `DSI_*.ush` 文件所包含。那是 **Instance 后端**所使用的安排，而该后端已被弃用：当前解析出的后端集合是 `Graph` 和 `ThinCustom`，而 `Backend = "Instance"` 是 `ThinCustom` *（在 1.5.0 中弃用）* 的别名。不再生成任何 `DSI_*.ush` 文件，因此该注释描述的是一条不再运行的路径。参见[后端](/docs/settings/backend)。

该头文件所暴露的每一种状态读取现在都在[`UE.*` 目录](/docs/builtins/ue-nodes)中有对应的材质节点，而在 `Graph` 块中的 `SampleTexture2D(tex, uv)` 会直接脱糖为一个 `TextureSample` 节点。因此，只有在手写 HLSL 中访问此头文件才有用。

## 符号 [#symbols]

`Parameters` 是在 include 处作用域内的材质参数结构；`Tex` 是纹理参数标识符，采样器名称通过记号粘贴（`Tex##Sampler`）从中派生。

| 符号 | 类型 | 展开 | 等价节点 |
| :-- | :-- | :-- | :-- |
| `DS_TIME` | 宏 | `(View.GameTime)` | [`UE.Time()`](/docs/builtins/ue-nodes) |
| `DS_REAL_TIME` | 宏 | `(View.RealTime)` | — |
| `DS_DELTA_TIME` | 宏 | `(View.DeltaTime)` | — |
| `DS_PERIODIC_TIME(Period)` | 宏 | `(fmod(View.GameTime, (Period)))` | [`UE.Time(Period=…)`](/docs/builtins/ue-nodes) |
| `DS_TexCoord(Parameters, CoordinateIndex)` | `float2` 函数 | `Parameters.TexCoords[CoordinateIndex].xy`，当 `NUM_TEX_COORD_INTERPOLATORS` 为 0 时为 `float2(0, 0)` | [`UE.TexCoord`](/docs/builtins/ue-nodes) |
| `DS_VertexColor(Parameters)` | `float4` 函数 | `Parameters.VertexColor` | [`UE.VertexColor`](/docs/builtins/ue-nodes) |
| `DS_CameraVector(Parameters)` | 宏 | `((Parameters).CameraVector)` | [`UE.CameraVector`](/docs/builtins/ue-nodes) |
| `DS_ReflectionVector(Parameters)` | 宏 | `((Parameters).ReflectionVector)` | [`UE.ReflectionVector`](/docs/builtins/ue-nodes) |
| `DS_PixelNormalWS(Parameters)` | 宏 | `((Parameters).WorldNormal)` | [`UE.PixelNormalWS`](/docs/builtins/ue-nodes) |
| `DS_VertexNormalWS(Parameters)` | 宏 | `((Parameters).TangentToWorld[2])` | [`UE.VertexNormalWS`](/docs/builtins/ue-nodes) |
| `DS_TwoSidedSign(Parameters)` | 宏 | `((Parameters).TwoSidedSign)` | [`UE.TwoSidedSign`](/docs/builtins/ue-nodes) |
| `DS_ViewportUV(Parameters)` | 宏 | `(GetViewportUV(Parameters))` | [`UE.ViewportUV`](/docs/builtins/ue-nodes) |
| `DS_PixelDepth(Parameters)` | 宏 | `(GetPixelDepth(Parameters))` | [`UE.PixelDepth`](/docs/builtins/ue-nodes) |
| `DS_WorldPosition(Parameters)` | 宏 | `(WSDemote(GetWorldPosition(Parameters)))` | [`UE.WorldPosition`](/docs/builtins/ue-nodes) |
| `DS_TranslatedWorldPosition(Parameters)` | 宏 | `(GetTranslatedWorldPosition(Parameters))` | [`UE.TranslatedWorldPosition`](/docs/builtins/ue-nodes) |
| `DS_ObjectPosition(Parameters)` | 宏 | `(WSDemote(GetObjectWorldPosition(Parameters)))` | [`UE.ObjectPosition`](/docs/builtins/ue-nodes) |
| `DS_ObjectRadius(Parameters)` | 宏 | `(GetPrimitiveData(Parameters).ObjectRadius)` | [`UE.ObjectRadius`](/docs/builtins/ue-nodes) |
| `DS_ObjectBounds(Parameters)` | 宏 | `(float3(GetPrimitiveData(Parameters).ObjectBoundsX, …ObjectBoundsY, …ObjectBoundsZ))` | [`UE.ObjectBounds`](/docs/builtins/ue-nodes) |
| `DS_CameraPosition(Parameters)` | 宏 | `(WSDemote(GetWorldCameraOrigin(Parameters)))` | [`UE.CameraPosition`](/docs/builtins/ue-nodes) |
| `DS_PerInstanceRandom(Parameters)` | 宏 | `(GetPerInstanceRandom(Parameters))` | [`UE.PerInstanceRandom`](/docs/builtins/ue-nodes) |
| `DS_PerInstanceFadeAmount(Parameters)` | 宏 | `(GetPerInstanceFadeAmount(Parameters))` | [`UE.PerInstanceFadeAmount`](/docs/builtins/ue-nodes) |
| `DS_Panner(UV, Time, Speed)` | `float2` 函数 | `UV + float2(frac(Time * Speed.x), frac(Time * Speed.y))` | [`UE.Panner`](/docs/builtins/ue-nodes) |
| `DS_SampleTexture2D(Tex, UV)` | 宏 | `Texture2DSample(Tex, Tex##Sampler, UV)` | `Graph` 块中的 `SampleTexture2D(tex, uv)` |
| `DS_SampleTexture2DLod(Tex, UV, Lod)` | 宏 | `Texture2DSampleLevel(Tex, Tex##Sampler, UV, Lod)` | — |
| `DS_SampleTexture2DBias(Tex, UV, Bias)` | 宏 | `Texture2DSampleBias(Tex, Tex##Sampler, UV, Bias)` | — |

`WSDemote` 调用将引擎的大世界坐标向量降为 `float3`。已翻译的（相机相对）位置形式已经是 `float3`，并在相机附近保持精度。

该头文件的注释指出，DSL 过去用于书写不带前缀的拼写 `SampleTexture2D` / `SampleTexture2DLod` / `SampleTexture2DBias`，并由生成器将它们降为这些宏。今天不再执行这样的重写。`SampleTexture2D` 在 `Graph` 块中仍是保留名称，它会脱糖为一个 `TextureSample` 节点 —— 参见 [`UE.Expression`](/docs/builtins/ue-expression#sampletexture2d) —— 但 `Lod` 和 `Bias` 拼写没有 `Graph` 等价物。

## 注意事项 [#notes]

> [!NOTE]
> **将 `#include` 放在最前面。** 写在 `Function` 主体顶部的 `#include`（其前只有空白和注释）会从主体中取出并放到 Custom 节点的 include 列表中，引擎会在所生成函数之外包含它 —— 参见[函数 ▸ 包含](/docs/plugin/language/function#includes) —— 因此该头文件的函数定义可以正常编译。而在某条语句之后、或任何其他 `#` 行之后出现的 `#include`，会留在主体内，引擎会将其粘贴到某个函数内部；在那里 22 个宏仍然可用（`#define` 在任何位置都合法），但三个函数定义（`DS_TexCoord`、`DS_VertexColor`、`DS_Panner`）在另一个函数体内不合法。

> [!WARNING]
> **`DS_TexCoord` 和 `DS_VertexColor` 依赖翻译器副作用，而现在已经没有任何东西安排这些副作用了。** `DS_TexCoord` 读取 `Parameters.TexCoords[…]`，后者仅在材质翻译期间分配了至少一个插值器槽位时才存在
> （`NUM_TEX_COORD_INTERPOLATORS` > 0）；没有分配槽位时，该函数可以编译并返回
> `float2(0, 0)`。`DS_VertexColor` 读取 `Parameters.VertexColor`，而后者仅在材质以顶点色用法设置进行翻译时才会被写入。已退役的 Instance 后端通过
> 编译匹配的 dummy 输入块来安排这两者。在 `Graph` 和 `ThinCustom` 后端下没有任何东西这样做，因此
> 请改用 [`UE.TexCoord`](/docs/builtins/ue-nodes) 和 [`UE.VertexColor`](/docs/builtins/ue-nodes) —— 或者一个连线的 `Function` 输入 —— 而不是
> 这两个。

- 其余的读取都是无副作用的。它们接触的每个字段和 `Get*(Parameters)` 辅助函数都在
  像素入口处无条件填充，因此它们可以在任何不透明 Surface 像素求值中编译，无需使用标志或插值器请求。
- `DS_PerInstanceRandom` 和 `DS_PerInstanceFadeAmount` 仅对实例化或
  GPU 剔除的绘制有意义。在普通网格体上，它们会读回安全常量（分别为 `0` 和 `1`），且不会
  产生编译错误。
- 该头文件由 `DREAMSHADER_BUILTINS_USH` 保护，因此在同一
  翻译单元中包含多次是无害的。
- 在 `Function` 主体内部，GLSL 别名处理会在主体生成之前重写整个标识符
  —— `vec3` → `float3`、`mix` → `lerp`、`fract` → `frac`、`mod` → `fmod`，等等。它会跳过字符串
  字面量和注释，因此 `#include "…"` 中的 include 路径永远不会被重写。

## 示例 [#example]

一个顶层 `Function`，其 HLSL 主体只使用该头文件的宏部分：

```c
Function vec2 Wobble(in vec2 uv, in float speed)
{
    #include "/Plugin/DreamShader/DreamShaderBuiltins.ush"
    float t = DS_TIME * speed;
    return uv + float2(sin(t), cos(t)) * 0.02;
}
```

该 include 通过注册的虚拟目录解析，并且 `DS_TIME` 展开为
`(View.GameTime)`。

基于节点的等价写法，完全不需要 include，也不需要任何 HLSL 辅助函数：

```c
GraphFunction vec2 Wobble(in vec2 uv, in float speed)
{
    float t = UE.Time() * speed;
    return uv + vec2(sin(t), cos(t)) * 0.02;
}
```

## 另请参阅 [#see-also]

- [内置函数](/docs/plugin/builtins) —— `Graph` 内可用的调用接口
- [`UE.*` 目录](/docs/builtins/ue-nodes) —— 本页每个符号对应的节点等价物
- [`UE.Expression`](/docs/builtins/ue-expression) —— 访问任何其他 `UMaterialExpression`
- [数学内置函数](/docs/builtins/math) —— `Graph` 中无前缀的数值调用接口
- [变换内置函数](/docs/plugin/builtins/transform) —— `UE.TransformVector` / `UE.TransformPosition`
- [`Function`](/docs/plugin/language/function) —— HLSL 主体及其生成方式
- [`GraphFunction`](/docs/plugin/language/graph-function) —— HLSL 主体的基于节点的替代方案
- [生成的 HLSL](/docs/plugin/generation/generated-hlsl) —— 插件确实会生成的每个源文件的 `.ush`
- [后端](/docs/settings/backend) —— `Graph`、`ThinCustom`，以及已退役的 `Instance` 后端
- [贡献](/docs/plugin/contributing) —— 插件的源码与内容布局
