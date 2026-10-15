import type { Locale } from '@/lib/i18n';
import { RIDER_PLUGIN_URL } from '@/lib/site';
import { CodeXml, MonitorCog, Package, Puzzle, type LucideIcon } from 'lucide-react';

export type HomeVersion = readonly [label: string, value: string];
export type WorkflowStep = readonly [index: string, title: string, text: string];

/**
 * `href` is locale-neutral — sections localize it through `localizedPath`.
 */
export type ReadingRoute = readonly [title: string, text: string, href: string];

export type EcosystemItem = {
  icon: LucideIcon;
  title: string;
  text: string;
  /** Locale-neutral docs path, or an absolute url when `external`. */
  href: string;
  external?: boolean;
};

/** One span of the sample. A bare string is unhighlighted text. */
export type CodeToken = string | readonly [text: string, kind: TokenKind];
export type TokenKind = 'kw' | 'type' | 'fn' | 'str' | 'num' | 'prop' | 'punct' | 'com';

export type HomeCopy = {
  hero: {
    kicker: string;
    title: string[];
    lead: string;
    primary: string;
    secondary: string;
    versionsLabel: string;
    artAlt: string;
    artCaption: string;
    scrollCue: string;
  };
  railLabel: string;
  slides: readonly (readonly [id: string, label: string])[];
  sample: {
    kicker: string;
    title: string;
    lead: string;
    file: string;
    result: string;
    command: string;
  };
  /** After the plugin and extension versions, which `lib/versions` reads at build time. */
  versions: HomeVersion[];
  workflow: {
    kicker: string;
    title: string;
    lead: string;
    steps: WorkflowStep[];
  };
  tools: {
    kicker: string;
    title: string;
    lead: string;
    items: EcosystemItem[];
  };
  docs: {
    kicker: string;
    title: string;
    lead: string;
    routes: ReadingRoute[];
  };
};

/**
 * The manual's first 2.0 example (DreamShaderLang 2.0 ▸ Two short examples),
 * hand-tokenized. It is a real, complete source file — the panel is the page's
 * evidence, not decoration.
 */
export const heroSample: readonly (readonly CodeToken[])[] = [
  [['// M_TeleportGlow.dss', 'com']],
  [['#pragma', 'kw'], ' ', ['material', 'fn'], ['(', 'punct'], ['ShadingModel', 'prop'], ' = Unlit, ', ['BlendMode', 'prop'], ' = Additive', [')', 'punct']],
  [],
  [['/// @group Glow|Look   @desc Multiplied on top of the particle colour', 'com']],
  [['uniform', 'kw'], ' ', ['float4', 'type'], ' Tint = ', ['float4', 'fn'], ['(', 'punct'], ['1', 'num'], ', ', ['1', 'num'], ', ', ['1', 'num'], ', ', ['1', 'num'], [')', 'punct'], ';'],
  [],
  [['/// @group Glow|Look   @desc Overall emissive gain', 'com']],
  [['uniform', 'kw'], ' ', ['float', 'type'], ' Intensity = ', ['0.7', 'num'], ';'],
  [],
  [['float', 'type'], ' ', ['GlowMask', 'fn'], ['(', 'punct'], ['float2', 'type'], ' UV', [')', 'punct']],
  [['{', 'punct']],
  ['    ', ['float2', 'type'], ' P = UV * ', ['2.0', 'num'], ' - ', ['1.0', 'num'], ';'],
  ['    ', ['return', 'kw'], ' ', ['pow', 'fn'], ['(', 'punct'], ['saturate', 'fn'], ['(', 'punct'], ['1.0', 'num'], ' - ', ['dot', 'fn'], ['(', 'punct'], 'P, P', [')', 'punct'], [')', 'punct'], ', ', ['2.4', 'num'], [')', 'punct'], ';'],
  [['}', 'punct']],
  [],
  [['export', 'kw'], ' ', ['void', 'type'], ' ', ['M_TeleportGlow', 'fn'], ['(', 'punct'], ['inout', 'kw'], ' ', ['material', 'type'], ' m', [')', 'punct']],
  [['{', 'punct']],
  ['    ', ['float2', 'type'], ' UV = ', ['UE.TexCoord', 'fn'], ['(', 'punct'], ['Index', 'prop'], ' = ', ['0', 'num'], [')', 'punct'], ';'],
  ['    m.', ['EmissiveColor', 'prop'], ' = Tint.rgb * ', ['GlowMask', 'fn'], ['(', 'punct'], 'UV', [')', 'punct'], ' * Intensity;'],
  [['}', 'punct']],
];

export const homeCopies: Record<Locale, HomeCopy> = {
  zh: {
    hero: {
      kicker: '虚幻引擎的文本材质语言',
      title: ['DreamShader', 'Lang'],
      lead: '用文本写 Unreal 材质：2.0 的 .dss 就是加了 /// 注解和 #pragma 的 HLSL，1.x 的 .dsm / .dsf 照样能用。DreamShader 插件在编辑器里编译它们，生成标准的 UMaterial、UMaterialFunction、材质层与材质实例。源文件是唯一的编辑面，资产是构建产物，随时可以丢掉重建。',
      primary: '开始阅读',
      secondary: 'GitHub',
      versionsLabel: '当前版本',
      artAlt: 'DreamShader 形象：一位黑色长发的少女倚着刻有 DreamShader 字样的黑色立柱，掌心上方悬着一颗棋盘格小球',
      artCaption: 'DreamShader · Text to UE Materials',
      scrollCue: '往下看',
    },
    railLabel: '章节导航',
    slides: [
      ['overview', '概览'],
      ['sample', '长什么样'],
      ['workflow', '工作流'],
      ['tools', '工具链'],
      ['docs', '文档'],
    ],
    sample: {
      kicker: '长什么样',
      title: '一个 .dss 文件，就是一份材质',
      lead: '下面是手册里的一个完整材质：#pragma 定材质设置，uniform 是材质参数，/// 注解写参数的分组和说明，普通的 HLSL 函数是辅助逻辑，export 的那个函数就是材质本身。保存后插件把它编译成标准的材质节点图。',
      file: 'M_TeleportGlow.dss',
      result: '编译成材质 M_TeleportGlow，Unlit、Additive，带 Tint 和 Intensity 两个参数',
      command: 'dsc compile M_TeleportGlow.dss',
    },
    versions: [
      ['UE', '5.3 – 5.8'],
      ['License', 'MIT'],
    ],
    workflow: {
      kicker: '工作流',
      title: '从源文件到材质资产',
      lead: '源文件说明要什么，插件负责把它变成资产，并且一直让两者保持一致。保存即编译，生成过程是幂等的。',
      steps: [
        ['01', 'Author', '用 .dss（2.0）或 .dsm / .dsf（1.x）写材质和材质函数，#include 共享的头文件，用 Package 引入别人写好的库；VS Code 扩展负责补全、悬停和诊断。'],
        ['02', 'Compile', '保存即编译：解析、绑定、降成中间表示，再生成材质表达式。每条诊断都带 DSHnnnn 码，指回你实际写的那一行。'],
        ['03', 'Asset', '生成 UMaterial、UMaterialFunction、材质层与层混合、材质实例（.dsi），以及 UE 5.8 上的 Custom Pass 管线（.dsp）。'],
        ['04', 'Rebuild', '每个资产都记着它是从什么构建的：源文件、插件版本或设置一变就重建；被手改过的资产会被认出来，可以还原成源文件的样子，也可以把改动收回源文件。'],
      ],
    },
    tools: {
      kicker: '工具链',
      title: '插件、编辑器扩展与 Package 分发',
      lead: '四个部分共用同一份语法和同一条诊断通道：Unreal 侧负责编译和生成，编辑器扩展负责补全与跳转，Package 负责把可复用的库分发出去。',
      items: [
        {
          icon: Puzzle,
          title: 'DreamShader 插件',
          text: '编译源文件、生成资产；材质浏览器、反编译、dsc 命令行和打包时的生成都在插件里。',
          href: '/docs/start/about',
        },
        {
          icon: CodeXml,
          title: 'VSCode 扩展',
          text: '.dss / .dsm / .dsf / .dsh / .dsp 的高亮、补全、悬停、跳转、签名提示与诊断，以及材质预览和 Package 命令。',
          href: '/docs/tools/vscode',
        },
        {
          icon: MonitorCog,
          title: 'Rider 插件',
          text: 'JetBrains 文件类型、PSI 解析、高亮、补全、导航、诊断与 inlay hints。',
          href: RIDER_PLUGIN_URL,
          external: true,
        },
        {
          icon: Package,
          title: 'Package',
          text: '以 @scope/name 的目录约定分发可复用的头文件库；包还能在安装它的工程里生成自己的材质函数。',
          href: '/docs/tools/packages',
        },
      ],
    },
    docs: {
      kicker: '文档',
      title: '从这里进入',
      lead: '首页负责快速定位，完整细节留在文档里。按你当前要做的事挑一个入口。',
      routes: [
        ['快速开始', '安装插件，写出第一个材质，跑通保存到编译的循环。', '/docs/start/installation'],
        ['DreamShaderLang 2.0', '.dss 的声明、/// 注解、#pragma、@custom 函数体，以及管线现在做到哪一步。', '/docs/language-v2'],
        ['1.x 语言参考', '文件模型、词法、顶层块、Section、类型、函数与 import。', '/docs/language/file-model'],
        ['诊断信息', '每一条错误与警告的成因和处理办法，以及当前的已知限制。', '/docs/diagnostics'],
        ['示例', '常见写法，以及可以直接复制的完整源文件。', '/docs/examples/patterns'],
        ['更新记录', '插件、VSCode 扩展与本站的版本变化。', '/docs/changelog'],
      ],
    },
  },
  en: {
    hero: {
      kicker: 'A text material language for Unreal Engine',
      title: ['DreamShader', 'Lang'],
      lead: 'Write Unreal materials as text: a 2.0 .dss is HLSL with /// annotations and #pragma lines, and 1.x .dsm / .dsf files keep working. The DreamShader plugin compiles them inside the editor into standard UMaterial, UMaterialFunction, material layer and material instance assets. The source is the authoring surface; the asset is build output, and can always be thrown away and regenerated.',
      primary: 'Read the docs',
      secondary: 'GitHub',
      versionsLabel: 'Current versions',
      artAlt: 'The DreamShader character: a girl with long black hair leaning on a black pillar marked DreamShader, a checkered sphere floating above her palm',
      artCaption: 'DreamShader · Text to UE Materials',
      scrollCue: 'Scroll',
    },
    railLabel: 'Section navigation',
    slides: [
      ['overview', 'Overview'],
      ['sample', 'The source'],
      ['workflow', 'Workflow'],
      ['tools', 'Tooling'],
      ['docs', 'Docs'],
    ],
    sample: {
      kicker: 'What it looks like',
      title: 'One .dss file is one material',
      lead: 'A whole material from the manual: #pragma sets the material\'s settings, uniform declares its parameters, /// annotations group and describe them, plain HLSL functions hold the helper logic, and the exported function is the material itself. Saved, it compiles into a standard material graph.',
      file: 'M_TeleportGlow.dss',
      result: 'compiles into the material M_TeleportGlow — Unlit, Additive, with Tint and Intensity parameters',
      command: 'dsc compile M_TeleportGlow.dss',
    },
    versions: [
      ['UE', '5.3 – 5.8'],
      ['License', 'MIT'],
    ],
    workflow: {
      kicker: 'Workflow',
      title: 'From source file to material asset',
      lead: 'The source says what you want; the plugin turns it into assets and keeps the two in step. Saving compiles, and generation is idempotent.',
      steps: [
        ['01', 'Author', 'Write materials and material functions in .dss (2.0) or .dsm / .dsf (1.x), #include shared headers, and pull in other people\'s libraries as packages; the VS Code extension handles completion, hover and diagnostics.'],
        ['02', 'Compile', 'Saving compiles: parse, bind, lower to an intermediate representation, then build material expressions. Every diagnostic carries a DSHnnnn code and points at the line you actually wrote.'],
        ['03', 'Asset', 'The generator writes UMaterial, UMaterialFunction, material layers and blends, material instances (.dsi), and on UE 5.8 Custom Pass pipelines (.dsp).'],
        ['04', 'Rebuild', 'Every asset records what it was built from: a changed source, plugin version or setting rebuilds it, and an asset edited by hand is recognized — revert it to its source, or adopt the edit into the source.'],
      ],
    },
    tools: {
      kicker: 'Tooling',
      title: 'Plugin, editor extensions, package distribution',
      lead: 'Four pieces share one grammar and one diagnostics channel: Unreal compiles and generates, the editor extensions handle completion and navigation, and packages ship reusable libraries.',
      items: [
        {
          icon: Puzzle,
          title: 'DreamShader plugin',
          text: 'Compiles sources and generates assets; the material browser, the decompiler, the dsc command line and generation at cook time live in the plugin.',
          href: '/docs/start/about',
        },
        {
          icon: CodeXml,
          title: 'VSCode extension',
          text: 'Highlighting, completion, hover, go to definition, signature help and diagnostics for .dss / .dsm / .dsf / .dsh / .dsp, plus material preview and package commands.',
          href: '/docs/tools/vscode',
        },
        {
          icon: MonitorCog,
          title: 'Rider plugin',
          text: 'JetBrains file type, PSI parser, highlighting, completion, navigation, diagnostics and inlay hints.',
          href: RIDER_PLUGIN_URL,
          external: true,
        },
        {
          icon: Package,
          title: 'Packages',
          text: 'Ship reusable header libraries through the @scope/name directory convention; a package can also build its own material functions in the project that installs it.',
          href: '/docs/tools/packages',
        },
      ],
    },
    docs: {
      kicker: 'Documentation',
      title: 'Enter the docs from here',
      lead: 'The homepage is for orientation; the docs hold the full reference. Pick the entry that matches the task you are doing now.',
      routes: [
        ['Getting started', 'Install the plugin, write a first material, and learn the save-and-compile loop.', '/docs/start/installation'],
        ['DreamShaderLang 2.0', 'Declarations in .dss, /// annotations, #pragma, @custom bodies, and how far the pipeline goes today.', '/docs/language-v2'],
        ['1.x language reference', 'File model, lexical rules, top-level blocks, sections, types, functions and imports.', '/docs/language/file-model'],
        ['Diagnostics', 'Every error and warning, with cause and fix, plus the current limitations.', '/docs/diagnostics'],
        ['Examples', 'Common patterns, and complete sources you can copy as they are.', '/docs/examples/patterns'],
        ['Changelog', 'Release notes for the plugin, the VSCode extension and this site.', '/docs/changelog'],
      ],
    },
  },
};
