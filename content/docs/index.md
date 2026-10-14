---
title: "DreamShader 参考"
description: "DreamShader 参考"
---

# DreamShader 参考 [#dreamshader-reference]

如需教程和面向任务的阅读，请从[文档概览](/docs/plugin/readme)开始。

DreamShader 将 **DreamShaderLang** 源文件——`.dsm`、`.dsf`、`.dsh`，以及在 2.0 系列上的
`.dss`——编译为标准 Unreal Engine 材质资产：`UMaterial`、`UMaterialFunction`、
`UMaterialFunctionMaterialLayer` 和 `UMaterialFunctionMaterialLayerBlend`——并且在 Unreal Engine 5.8 上，将
`.dsp` [Custom Pass](#custom-pass) 管线编译为 `UDreamPassPipeline` 资产，从而添加你自己的渲染 pass。
源文件是创作表面；资产是构建产物，随时可以重新生成。

| | |
| :-- | :-- |
| 版本 | `2.1.2` |
| 引擎 | Unreal Engine `5.3` – `5.8`（Win64 已验证）；Custom Pass 需要 `5.8` |
| 模块 | `DreamShaderLang` (Runtime)、`DreamShader` (Runtime)、`DreamShaderPass` (Runtime)、`DreamShaderCompiler` (Editor)、`DreamShaderEditor` (Editor) |
| 源文件扩展名 | `.dsm` 材质 · `.dsf` 函数 · `.dsh` 头文件 · `.dss` 2.0 编译单元 · `.dsi` 材质实例 · `.dsp` Custom Pass 管线 |
| 项目设置 | *Project Settings ▸ DreamPlugin ▸ Dream Shader* |
| 许可证 | MIT |

初次接触？请从 **[快速开始](/docs/plugin/getting-started)** 开始，然后是 **[示例](/docs/plugin/examples)**。

---

## DreamShaderLang [#dreamshaderlang]

> [!NOTE]
> 两套语法，一个编译器。下面记录的 **1.x** 语法（`.dsm` / `.dsf` / `.dsh`）是
> 已发布的语法。**2.0** 语法——`.dss`，用声明代替 Section 块的 HLSL——
> 在 `2.0` 系列上通过新的 binder/IR/emitter 管线编译，并有自己的页面：
> **[DreamShaderLang 2.0](/docs/language-v2)**。

### [语言参考](/docs/plugin/language) [#language-referencelanguageindexmd]

声明语法：源文件、块和 Section。

| | |
| :-- | :-- |
| [源文件](/docs/language/file-model) | `.dsm` / `.dsf` / `.dsh` 以及各自可包含的内容 |
| [词法元素](/docs/language/lexical) | 注释、标识符、大小写敏感性、字面量、后缀 |
| [关键字索引](/docs/plugin/language/keywords) | 每个保留字和别名，附链接 |
| [`import`](/docs/language/imports) | 引入头文件、函数和包 |
| [预处理器](/docs/plugin/language/preprocessor) | `#if` 和 define 表——条件编译 |
| [类型](/docs/language/types-and-values) | 类型标记、GLSL 别名、各上下文有效性 |

**顶层块**

| | |
| :-- | :-- |
| [`Shader`](/docs/plugin/language/shader) | 生成一个 `UMaterial` |
| [`ShaderFunction`](/docs/plugin/language/shader-function) | 生成一个 `UMaterialFunction` |
| [`ShaderLayer` / `ShaderLayerBlend`](/docs/plugin/language/shader-layer) | 生成原生材质层函数 |
| [`VirtualFunction`](/docs/plugin/language/virtual-function) | 声明一个已有的 `UMaterialFunction` |
| [`Function`](/docs/plugin/language/function) | 可复用的 HLSL 辅助函数 |
| [`GraphFunction`](/docs/plugin/language/graph-function) | 可将 `UE.*` 节点引入其输入的 HLSL 辅助函数 |
| [`Namespace`](/docs/plugin/language/namespace) | 将辅助函数归组到 `Ns::Name` 下 |

**Section**

| | |
| :-- | :-- |
| [`Properties`](/docs/parameters/properties) | 参数声明和组作用域 |
| [`Inputs` / `Outputs`](/docs/plugin/language/inputs-outputs) | 函数签名和材质输出 |
| [输出绑定](/docs/plugin/language/output-bindings) | `Base.<Target> = <value>;` |
| [`Settings`](/docs/plugin/settings) | 材质和函数设置 |
| [`Options`](/docs/plugin/language/options) | `VirtualFunction` 资产绑定 |
| [`Layout`](/docs/language/layout) | 节点放置、注释框、`#Region` |

### [Graph 语言](/docs/graph/overview) [#graph-languagegraphindexmd]

`Graph = { ... }` 内部的语句和表达式语言，用于具现化材质节点。

| | |
| :-- | :-- |
| [语句](/docs/graph/statements) | 每种语句形式 |
| [声明](/docs/plugin/graph/declarations) | 变量、初始化器、作用域 |
| [表达式和运算符](/docs/graph/expressions) | 优先级、操作数规则、整数除法 |
| [字面量](/docs/plugin/graph/literals) | 数值、布尔值、后缀 |
| [构造函数](/docs/plugin/graph/constructors) | `float3(...)`、`vec4(...)`、整数构造函数 |
| [Swizzle](/docs/plugin/graph/swizzle) | 通道掩码、重排、重复 |
| [类型转换](/docs/plugin/graph/conversions) | 拓宽、收窄、分量数量规则 |
| [`if` / `else`](/docs/graph/control-flow) | 条件、真值性、分支选择 |
| [`MaterialAttributes`](/docs/plugin/graph/material-attributes) | 类结构体成员写入 |
| [调用](/docs/graph/calls) | 调用函数和参数引脚 |
| [名称解析](/docs/plugin/graph/name-resolution) | 查找顺序和遮蔽 |
| [节点复用](/docs/plugin/graph/node-reuse) | 公共子表达式去重 |
| [不支持的写法](/docs/graph/unsupported) | 循环、`return`、`%`、索引——以及取而代之的行为 |

---

## 节点库 [#node-library]

### [内置节点](/docs/plugin/builtins) [#builtinsbuiltinsindexmd]

| | |
| :-- | :-- |
| [`UE.*` 目录](/docs/builtins/ue-nodes) | 每个具名材质节点内置 |
| [`UE.Expression`](/docs/builtins/ue-expression) | 通用反射节点逃生舱 |
| [`OutputType` 值](/docs/plugin/builtins/output-type) | 每个可接受的输出类型标记 |
| [数学内置](/docs/builtins/math) | `lerp`、`saturate`、`frac`…… |
| [变换内置](/docs/plugin/builtins/transform) | `UE.TransformVector` / `UE.TransformPosition` 坐标基 |
| [`Substrate.*`](/docs/builtins/substrate) | Substrate 节点（UE 5.4+） |
| [Custom Pass 节点](/docs/builtins/dream-pass) | `UE.DreamPassOutput`、`UE.DreamPassBuffer`（UE 5.8） |
| [`DreamShaderBuiltins.ush`](/docs/custom-pass/hlsl) | 随附的 HLSL 辅助头文件 |

### [参数](/docs/plugin/parameters) [#parametersparametersindexmd]

| | |
| :-- | :-- |
| [紧凑类型](/docs/plugin/parameters/compact-types) | `float`、`float3`、`Texture2D`…… |
| [参数节点](/docs/plugin/parameters/parameter-nodes) | `ScalarParameter`、`StaticSwitchParameter`…… |
| [元数据块](/docs/parameters/metadata) | `Group`、`SortPriority`、`Slider`、反射属性 |
| [`SamplerType`](/docs/plugin/parameters/sampler-type) | 纹理采样器配置 |
| [在 `Graph` 中使用参数](/docs/plugin/parameters/graph-usage) | 值读取和引脚调用形式 |
| [`Path(...)`](/docs/parameters/path) | 资产引用 |

---

## Custom Pass [#custom-pass]

在 Unreal Engine 5.8 上添加你自己的渲染 pass，无需修改引擎：遮罩和自定义缓冲区、
屏幕空间效果、写入数据纹理的 compute shader。

| | |
| :-- | :-- |
| [管线——`.dsp`](/docs/language-v2/passes) | 缓冲区、pass、注入点、绑定、网格选择、编译器检查的内容 |
| [运行时](/docs/custom-pass) | 什么使管线生效、pass 何时运行、内置和导出的缓冲区、视图、调试、限制 |
| [HLSL pass](/docs/plugin/pass-runtime/hlsl) | 固定参数、槽位、快照和预检查 |
| [材质节点](/docs/builtins/dream-pass) | 用于网格 pass 的 `UE.DreamPassOutput`，用于读取导出缓冲区的 `UE.DreamPassBuffer` |
| [示例](/docs/examples/custom-pass) | 高亮描边、UI 毛玻璃、透视、风场 |
| [`DreamShaderPass`](/docs/plugin/api/pass-module) | 该模块的 C++ 和蓝图 API |

---

## 构建与输出 [#build-and-output]

### [设置](/docs/plugin/settings) [#settingssettingsindexmd]

| | |
| :-- | :-- |
| [材质设置](/docs/settings/material) | 特殊键加上反射的 `UMaterial` 属性 |
| [枚举取值](/docs/settings/enums) | 每一个 `ShadingModel`、`BlendMode`、`Domain` |
| [`Backend`](/docs/settings/backend) | `ThinCustom` 对比 `Graph` |
| [函数设置](/docs/plugin/settings/function) | 材质函数支持的键 |
| [项目设置](/docs/settings/project) | *DreamPlugin ▸ Dream Shader* |

### [生成](/docs/generation/pipeline) [#generationgenerationindexmd]

| | |
| :-- | :-- |
| [资产路径](/docs/generation/asset-paths) | `Name=` 和 `Root=` 到包路径与磁盘路径 |
| [瞬时材质](/docs/generation/in-memory) | 薄实例、隐藏基础、烹饪行为 |
| [缓存](/docs/plugin/generation/caching) | 源哈希与跳过的重建 |
| [图表布局](/docs/plugin/generation/graph-layout) | 自动放置及其限制 |
| [重新生成](/docs/generation/regeneration) | 重建后什么保留、什么不保留 |
| [分歧](/docs/plugin/generation/divergence) | 手改过的资产：检测，以及三种出路 |
| [NoGeneration](/docs/generation/no-generation) | 只有指名它们的那次编译才会构建的源文件 |
| [生成的 HLSL](/docs/plugin/generation/generated-hlsl) | 生成的 `.ush` include |

---

## 工具链 [#tooling]

### [编辑器工具](/docs/plugin/tools) [#editor-toolstoolsindexmd]

| | |
| :-- | :-- |
| [编辑器集成](/docs/tools/editor) | 菜单、工具栏、上下文菜单 |
| [材质 Content Browser](/docs/plugin/tools/material-browser) | 浏览、筛选、实例化、实体化 |
| [预览](/docs/plugin/tools/preview) | 缩略图和流式预览 |
| [反编译器](/docs/tools/decompiler) | 把已有的材质、实例和 Custom Pass 管线导出为源文件 |
| [VirtualFunction 工具](/docs/plugin/tools/virtual-function-tools) | 声明并同步已有的函数 |
| [工作区与编辑器扩展](/docs/plugin/tools/workspace) | VSCode 工作区、VSCode 与 Rider 插件 |
| [Package](/docs/tools/packages) | `DShader/Packages` 共享库 |
| [Commandlet](/docs/tools/commandlet) | 无头编译与反编译 |
| [编辑器 bridge](/docs/plugin/tools/bridge) | 请求文件、WebSocket 协议、产物 |

### [C++ API](/docs/plugin/api) [#c-apiapiindexmd]

| | |
| :-- | :-- |
| [`DreamShaderModule.h`](/docs/plugin/api/dreamshader-module) | 模块、日志类别、导出的函数 |
| [`DreamShaderTypes.h`](/docs/plugin/api/types) | 解析后的源数据模型 |
| [`DreamShaderParser.h`](/docs/plugin/api/parser) | 2.0 中已退役 —— 取代 1.x 解析器入口点的是什么 |
| [`DreamShaderSettings.h`](/docs/plugin/api/settings) | `UDreamShaderSettings` |
| [`DreamShaderMaterialInstance.h`](/docs/plugin/api/material-instance) | 生成的实例类 |
| [`DreamShaderVersionCompat.h`](/docs/plugin/api/version-compat) | 引擎版本宏 |
| [`DreamShaderCompiler`](/docs/plugin/api/compiler-module) | 编译器接口与服务 |
| [`DreamShaderPass`](/docs/plugin/api/pass-module) | Custom Pass：管线资产、设置、子系统、体积与组件 |

---

## 参考 [#reference]

| | |
| :-- | :-- |
| [诊断索引](/docs/diagnostics) | 每一个错误和警告，附原因与修复方法 |
| [禁用诊断](/docs/language-v2/disable-diagnostics) | `disable_warning` / `disable_error`，针对一个文件或一行 |
| [示例](/docs/plugin/examples) | 完整、可直接复制粘贴的源文件 |
| [贡献](/docs/plugin/contributing) | 构建插件 |
| [测试](/docs/plugin/contributing/testing) | 自动化测试套件与固定样本集 |
| [发布](/docs/plugin/contributing/release) | 打标签与打包 |

---

## 外部链接 [#external-links]

| | |
| :-- | :-- |
| 仓库 | <https://github.com/TypeDreamMoon/DreamShader> |
| Issues | <https://github.com/TypeDreamMoon/DreamShader/issues> |
| 文档站点 | <https://shader.toolchain.64hz.cn/> |
| VSCode 扩展 | <https://github.com/TypeDreamMoon/dreamshader-language-support> |
| Rider 插件 | <https://github.com/tsdaer/dreamshader-language-support> |
| 更新日志 | [../CHANGELOG.md](https://github.com/TypeDreamMoon/DreamShader/blob/8bd41da94a076dda0ba993a8381f8bbd43c61734/CHANGELOG.md) |
