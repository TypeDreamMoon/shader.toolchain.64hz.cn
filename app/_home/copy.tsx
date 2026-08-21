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

/** One span of the hero sample. A bare string is unhighlighted text. */
export type CodeToken = string | readonly [text: string, kind: TokenKind];
export type TokenKind = 'kw' | 'type' | 'fn' | 'str' | 'num' | 'prop' | 'punct';

export type HomeCopy = {
  hero: {
    kicker: string;
    title: string[];
    lead: string;
    primary: string;
    secondary: string;
    versionsLabel: string;
  };
  sample: {
    file: string;
    result: string;
  };
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
 * The minimal material from the manual, hand-tokenized. It is a real, complete
 * source file — the panel is the page's evidence, not decoration.
 */
export const heroSample: readonly (readonly CodeToken[])[] = [
  [['Shader', 'kw'], ['(', 'punct'], ['Name', 'prop'], ['=', 'punct'], ['"DreamMaterials/M_Minimal"', 'str'], [')', 'punct']],
  [['{', 'punct']],
  ['    ', ['Properties', 'kw'], ' = ', ['{', 'punct']],
  ['        ', ['vec3', 'type'], ' Tint = ', ['vec3', 'fn'], ['(', 'punct'], ['1.0', 'num'], ', ', ['0.2', 'num'], ', ', ['0.2', 'num'], [')', 'punct'], ';'],
  ['    ', ['}', 'punct']],
  [],
  ['    ', ['Settings', 'kw'], ' = ', ['{', 'punct']],
  ['        ', ['Domain', 'prop'], ' = ', ['"UI"', 'str'], ';'],
  ['        ', ['ShadingModel', 'prop'], ' = ', ['"Unlit"', 'str'], ';'],
  ['    ', ['}', 'punct']],
  [],
  ['    ', ['Outputs', 'kw'], ' = ', ['{', 'punct']],
  ['        ', ['vec3', 'type'], ' Color;'],
  ['        ', ['Base', 'prop'], '.', ['EmissiveColor', 'prop'], ' = Color;'],
  ['    ', ['}', 'punct']],
  [],
  ['    ', ['Graph', 'kw'], ' = ', ['{', 'punct']],
  ['        Color = Tint;'],
  ['    ', ['}', 'punct']],
  [['}', 'punct']],
];

export const homeCopies: Record<Locale, HomeCopy> = {
  zh: {
    hero: {
      kicker: '虚幻引擎材质语言',
      title: ['DreamShader', 'Lang'],
      lead: '用 .dsm / .dsf / .dsh 源文件描述材质，DreamShader 插件在编辑器里解析它们，生成标准的 UMaterial、UMaterialFunction 与 Material Layer 资产。源文件是唯一的编辑面，资产是构建产物，随时可以丢掉重建。',
      primary: '开始阅读',
      secondary: 'GitHub',
      versionsLabel: '当前版本',
    },
    sample: {
      file: 'M_Minimal.dsm',
      result: '生成 /Game/DreamMaterials/M_Minimal',
    },
    versions: [
      ['DreamShader', '1.8.0'],
      ['VSCode', '1.5.3'],
      ['UE', '5.3 – 5.8'],
      ['License', 'MIT'],
    ],
    workflow: {
      kicker: '工作流',
      title: '从源文件到材质资产',
      lead: '资产声明负责 Unreal 产物，Graph 负责节点连接，Function / GraphFunction 负责可复用的 Custom 节点逻辑。保存即编译，生成过程是幂等的。',
      steps: [
        ['01', 'Source', '.dsm / .dsf / .dsh 描述材质、函数资产、共享 helper 和 Package 依赖。import 会在解析前把整个闭包内联成一份文本。'],
        ['02', 'Compile', '插件解析声明与 Graph，建立 MaterialExpression、Custom 节点和函数资产，并把诊断映射回你实际写的那一行。'],
        ['03', 'Asset', '生成 UMaterial、UMaterialFunction、Material Layer 与 Layer Blend。默认 backend 下材质只存在于内存里。'],
      ],
    },
    tools: {
      kicker: '工具链',
      title: '插件、编辑器扩展与 Package 分发',
      lead: '四个部分共用同一份语法和同一条诊断通道：Unreal 侧负责解析和生成，编辑器扩展负责补全与跳转，Package 负责把可复用的库分发出去。',
      items: [
        {
          icon: Puzzle,
          title: 'DreamShader 插件',
          text: 'Unreal 侧解析源文件、生成资产，并回传 Bridge 诊断与 MaterialExpression metadata。',
          href: '/docs/start/about',
        },
        {
          icon: CodeXml,
          title: 'VSCode 扩展',
          text: '补全、Hover、跳转、Signature Help、诊断、材质预览、Package 命令与模板。',
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
          text: '以 @scope/name 的目录约定分发可复用的 .dsh 库，并锁定团队依赖来源。',
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
        ['语言参考', '文件模型、词法、顶层块、Section、类型、函数与 import。', '/docs/language/file-model'],
        ['Graph 语言', '语句、表达式、类型转换、if / else、调用，以及 Graph 不支持什么。', '/docs/graph/overview'],
        ['诊断信息', '每一条错误与警告的成因和处理办法，以及当前的已知限制。', '/docs/diagnostics'],
        ['示例', '常见写法，以及可以直接复制的完整源文件。', '/docs/examples/patterns'],
        ['更新记录', '插件、VSCode 扩展与本站的版本变化。', '/docs/changelog'],
      ],
    },
  },
  en: {
    hero: {
      kicker: 'A material language for Unreal Engine',
      title: ['DreamShader', 'Lang'],
      lead: 'Describe materials in .dsm / .dsf / .dsh source files. The DreamShader plugin parses them inside the editor and builds standard UMaterial, UMaterialFunction and Material Layer assets. The source is the authoring surface; the asset is build output, and can always be thrown away and regenerated.',
      primary: 'Read the docs',
      secondary: 'GitHub',
      versionsLabel: 'Current versions',
    },
    sample: {
      file: 'M_Minimal.dsm',
      result: 'builds /Game/DreamMaterials/M_Minimal',
    },
    versions: [
      ['DreamShader', '1.8.0'],
      ['VSCode', '1.5.3'],
      ['UE', '5.3 – 5.8'],
      ['License', 'MIT'],
    ],
    workflow: {
      kicker: 'Workflow',
      title: 'From source file to material asset',
      lead: 'Asset declarations describe the Unreal output, Graph describes the node connections, and Function / GraphFunction hold reusable Custom-node logic. Saving compiles, and generation is idempotent.',
      steps: [
        ['01', 'Source', '.dsm / .dsf / .dsh files describe materials, function assets, shared helpers and package dependencies. import inlines the whole closure into one text before parsing.'],
        ['02', 'Compile', 'The plugin parses declarations and Graph code, builds MaterialExpression nodes, Custom nodes and function assets, and maps diagnostics back to the line you actually wrote.'],
        ['03', 'Asset', 'The generator writes UMaterial, UMaterialFunction, Material Layer and Layer Blend assets. Under the default backend the material lives in memory only.'],
      ],
    },
    tools: {
      kicker: 'Tooling',
      title: 'Plugin, editor extensions, package distribution',
      lead: 'Four pieces share one grammar and one diagnostics channel: Unreal parses and generates, the editor extensions handle completion and navigation, and packages ship reusable libraries.',
      items: [
        {
          icon: Puzzle,
          title: 'DreamShader plugin',
          text: 'Parses sources in Unreal, generates assets, and exports bridge diagnostics plus MaterialExpression metadata.',
          href: '/docs/start/about',
        },
        {
          icon: CodeXml,
          title: 'VSCode extension',
          text: 'Completion, hover, go to definition, signature help, diagnostics, material preview, package commands and templates.',
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
          text: 'Ship reusable .dsh libraries through the @scope/name directory convention and pin dependency sources for teams.',
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
        ['Language reference', 'File model, lexical rules, top-level blocks, sections, types, functions and imports.', '/docs/language/file-model'],
        ['The Graph language', 'Statements, expressions, conversions, if / else, calls — and what Graph is not.', '/docs/graph/overview'],
        ['Diagnostics', 'Every error and warning, with cause and fix, plus the current limitations.', '/docs/diagnostics'],
        ['Examples', 'Common patterns, and complete sources you can copy as they are.', '/docs/examples/patterns'],
        ['Changelog', 'Release notes for the plugin, the VSCode extension and this site.', '/docs/changelog'],
      ],
    },
  },
};
