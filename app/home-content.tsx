'use client';

import {
  ArrowDown,
  BookOpen,
  Braces,
  CodeXml,
  GitBranch,
  Layers3,
  MonitorCog,
  Package,
  Puzzle,
} from 'lucide-react';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type TouchEvent,
  type WheelEvent,
} from 'react';

type HomeVersion = readonly [label: string, value: string];
type WorkflowStep = readonly [index: string, title: string, text: string];
type ReadingRoute = readonly [title: string, text: string, href: string];

type EcosystemItem = {
  icon: typeof Puzzle;
  title: string;
  text: string;
  href: string;
};

type HomeCopy = {
  dotsLabel: string;
  nextLabel: string;
  versions: HomeVersion[];
  hero: {
    kicker: string;
    title: string[];
    lead: string;
    docsHref: string;
    primary: string;
    secondary: string;
  };
  workflow: {
    kicker: string;
    title: string;
    lead: string;
    steps: WorkflowStep[];
  };
  tools: {
    kicker: string;
    title: string;
    items: EcosystemItem[];
  };
  docs: {
    kicker: string;
    title: string;
    lead: string;
    routes: ReadingRoute[];
  };
};

export const homeCopies = {
  zh: {
    dotsLabel: '首页分屏',
    nextLabel: '下一屏',
    versions: [
      ['DreamShader', '1.3.9'],
      ['VSCode', '1.4.9'],
      ['Rider', 'tsdaer'],
      ['UE', '5.7'],
    ],
    hero: {
      kicker: 'DreamShaderLang docs',
      title: ['DreamShader', 'Lang'],
      lead: '为了代替虚幻引擎材质“连连看”而生的文本化材质语言。用 `.dsm`、`.dsf` 和 `.dsh` 描述材质图、函数资产、Material Layer、共享 helper 与 Package 依赖。',
      docsHref: '/docs',
      primary: '开始阅读',
      secondary: 'GitHub',
    },
    workflow: {
      kicker: 'Language workflow',
      title: '把材质资产拆成可读的文本层级',
      lead: '资产声明负责 Unreal 产物，Graph 负责节点连接，Function / GraphFunction 负责可复用 Custom 节点逻辑。布局和 Region 可以保留大型图的阅读结构。',
      steps: [
        ['01', 'Source', '.dsm / .dsf / .dsh 描述材质、函数资产、共享 helper 和 Package 依赖。'],
        ['02', 'Compile', 'DreamShader 解析 Graph，创建 MaterialExpression、Custom 节点和函数资产。'],
        ['03', 'Asset', '生成 UMaterial、UMaterialFunction、Material Layer 和 Layer Blend。'],
      ],
    },
    tools: {
      kicker: 'Tools ecosystem',
      title: '插件、编辑器和包索引放在同一条链路里',
      items: [
        {
          icon: Puzzle,
          title: 'DreamShader 插件',
          text: 'Unreal 侧解析、生成资产、回传 Bridge 诊断和 MaterialExpression metadata。',
          href: '/docs/dreamshader/overview',
        },
        {
          icon: CodeXml,
          title: 'VSCode 扩展',
          text: '补全、Hover、跳转、Signature Help、诊断、Package 命令和模板。',
          href: '/docs/workflows/vscode',
        },
        {
          icon: MonitorCog,
          title: 'Rider 插件',
          text: 'JetBrains 文件类型、PSI 解析、高亮、补全、导航、诊断和 inlay hints。',
          href: 'https://github.com/tsdaer/dreamshader-language-support',
        },
        {
          icon: Package,
          title: 'Package Store',
          text: '通过 GitHub 分发可复用 .dsh / .dsf 库，并锁定团队依赖来源。',
          href: '/docs/workflows/package-authoring',
        },
      ],
    },
    docs: {
      kicker: 'Reading path',
      title: '从这里进入文档',
      lead: '首页负责快速定位，完整细节留在文档页。按目标选择入口，比在一页里堆完整教程更适合反复查询。',
      routes: [
        ['快速开始', '安装插件，写第一个 UI / Unlit 材质。', '/docs/getting-started/installation'],
        ['语言核心', '文件模型、Section、类型、Graph、Function。', '/docs/syntax/file-model'],
        ['布局与反编译', 'Layout、Graph Region、DSM / DSF 导出。', '/docs/syntax/layout'],
        ['版本变化', '插件、VSCode 扩展和网站更新记录。', '/docs/changelog'],
      ],
    },
  },
  en: {
    dotsLabel: 'Homepage sections',
    nextLabel: 'Next section',
    versions: [
      ['DreamShader', '1.3.9'],
      ['VSCode', '1.4.9'],
      ['Rider', 'tsdaer'],
      ['UE', '5.7'],
    ],
    hero: {
      kicker: 'DreamShaderLang docs',
      title: ['DreamShader', 'Lang'],
      lead: 'A text-first material language for replacing Unreal Engine material spaghetti graphs. Use `.dsm`, `.dsf`, and `.dsh` to describe material graphs, function assets, Material Layers, shared helpers, and package dependencies.',
      docsHref: '/en/docs',
      primary: 'Read docs',
      secondary: 'GitHub',
    },
    workflow: {
      kicker: 'Language workflow',
      title: 'Split material assets into readable text layers',
      lead: 'Asset declarations describe Unreal outputs, Graph sections describe node connections, and Function / GraphFunction helpers hold reusable Custom-node logic. Layout and Region metadata keep large graphs readable.',
      steps: [
        ['01', 'Source', '.dsm / .dsf / .dsh files describe materials, function assets, shared helpers, and package dependencies.'],
        ['02', 'Compile', 'DreamShader parses Graph code and creates MaterialExpression nodes, Custom nodes, and function assets.'],
        ['03', 'Asset', 'The generator writes UMaterial, UMaterialFunction, Material Layer, and Layer Blend assets.'],
      ],
    },
    tools: {
      kicker: 'Tools ecosystem',
      title: 'Plugin, editors, and packages in one workflow',
      items: [
        {
          icon: Puzzle,
          title: 'DreamShader plugin',
          text: 'Parses sources in Unreal, generates assets, and exports bridge diagnostics plus MaterialExpression metadata.',
          href: '/en/docs/dreamshader/overview',
        },
        {
          icon: CodeXml,
          title: 'VSCode extension',
          text: 'Completion, hover, go to definition, signature help, diagnostics, package commands, and templates.',
          href: '/en/docs/workflows/vscode',
        },
        {
          icon: MonitorCog,
          title: 'Rider plugin',
          text: 'JetBrains file type, PSI parser, highlighting, completion, navigation, diagnostics, and inlay hints.',
          href: 'https://github.com/tsdaer/dreamshader-language-support',
        },
        {
          icon: Package,
          title: 'Package Store',
          text: 'Distribute reusable .dsh / .dsf libraries through GitHub and pin dependency sources for teams.',
          href: '/en/docs/workflows/package-authoring',
        },
      ],
    },
    docs: {
      kicker: 'Reading path',
      title: 'Enter the docs from here',
      lead: 'The homepage is for orientation; the docs hold the full reference. Pick the entry that matches the task you are doing now.',
      routes: [
        ['Getting started', 'Install the plugin and write a first UI / Unlit material.', '/en/docs/getting-started/installation'],
        ['Language core', 'File model, sections, types, Graph, and Function syntax.', '/en/docs/syntax/file-model'],
        ['Layout and decompile', 'Layout, Graph Region, DSM / DSF export.', '/en/docs/syntax/layout'],
        ['Release notes', 'Plugin, VSCode extension, and website change history.', '/en/docs/changelog'],
      ],
    },
  },
} satisfies Record<'zh' | 'en', HomeCopy>;

const slides = [
  ['overview', 'Overview'],
  ['workflow', 'Workflow'],
  ['tools', 'Tools'],
  ['docs', 'Docs'],
] as const;

function clampSlide(value: number) {
  return Math.max(0, Math.min(slides.length - 1, value));
}

export function HomeContent({ locale = 'zh' }: { locale?: keyof typeof homeCopies }) {
  const copy = homeCopies[locale];
  const [active, setActive] = useState(0);
  const lockRef = useRef(false);
  const touchStartRef = useRef(0);
  const unlockTimerRef = useRef<number | null>(null);

  const goTo = useCallback(
    (next: number) => {
      const target = clampSlide(next);

      if (target === active) {
        return;
      }

      setActive(target);
      lockRef.current = true;

      if (unlockTimerRef.current) {
        window.clearTimeout(unlockTimerRef.current);
      }

      unlockTimerRef.current = window.setTimeout(() => {
        lockRef.current = false;
      }, 760);
    },
    [active],
  );

  const goBy = useCallback((delta: number) => goTo(active + delta), [active, goTo]);

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) {
        window.clearTimeout(unlockTimerRef.current);
      }
    };
  }, []);

  const stackStyle = useMemo(
    () => ({
      transform: `translateY(-${active * 100}%)`,
    }),
    [active],
  );

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (lockRef.current || Math.abs(event.deltaY) < 18) {
      return;
    }

    event.preventDefault();
    goBy(event.deltaY > 0 ? 1 : -1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (['ArrowDown', 'PageDown', ' '].includes(event.key)) {
      event.preventDefault();
      goBy(1);
    }

    if (['ArrowUp', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      goBy(-1);
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartRef.current = event.changedTouches[0]?.clientY ?? 0;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (lockRef.current) {
      return;
    }

    const endY = event.changedTouches[0]?.clientY ?? 0;
    const distance = endY - touchStartRef.current;

    if (distance < -42) {
      goBy(1);
    }

    if (distance > 42) {
      goBy(-1);
    }
  }

  return (
    <div
      className="ds-home-stage"
      onKeyDown={handleKeyDown}
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onWheel={handleWheel}
      tabIndex={0}
    >
      <nav className="ds-dots" aria-label={copy.dotsLabel}>
        {slides.map(([id, label], index) => (
          <button
            aria-label={label}
            className={index === active ? 'active' : undefined}
            key={id}
            onClick={() => goTo(index)}
            type="button"
          />
        ))}
      </nav>

      <div className="ds-home-stack" style={stackStyle}>
        <section
          aria-hidden={active !== 0}
          className={`ds-screen ds-screen-overview ${active === 0 ? 'active' : ''}`}
        >
          <div className="ds-bg ds-bg-overview" aria-hidden="true">
            <div className="ds-bg-code">
              <span>Shader(Name=&quot;DreamMaterials/M_NeonIdol&quot;)</span>
              <span>Properties = &#123; vec3 Tint; float Glow; &#125;</span>
              <span>Graph = &#123; Color = Tint * Glow; &#125;</span>
            </div>
            <div className="ds-bg-graph">
              <i />
              <i />
              <i />
              <strong>Graph</strong>
            </div>
          </div>

          <div className="ds-content ds-hero-content">
            <p className="ds-kicker">
              <CodeXml aria-hidden="true" />
              {copy.hero.kicker}
            </p>
            <h1>
              {copy.hero.title.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
            <p className="ds-lead">
              {copy.hero.lead}
            </p>
            <div className="ds-actions">
              <Link className="ds-btn ds-btn-primary" href={copy.hero.docsHref}>
                <BookOpen aria-hidden="true" />
                {copy.hero.primary}
              </Link>
              <Link
                className="ds-btn ds-btn-ghost"
                href="https://github.com/TypeDreamMoon/DreamShader"
              >
                <GitBranch aria-hidden="true" />
                {copy.hero.secondary}
              </Link>
            </div>
            <div className="ds-tags" aria-label="Current versions">
              {copy.versions.map(([label, value]) => (
                <span key={label}>
                  <strong>{label}</strong>
                  {value}
                </span>
              ))}
            </div>
          </div>
          <button
            aria-label={copy.nextLabel}
            className="ds-next"
            onClick={() => goBy(1)}
            type="button"
          >
            <ArrowDown aria-hidden="true" />
          </button>
        </section>

        <section
          aria-hidden={active !== 1}
          className={`ds-screen ds-screen-workflow ${active === 1 ? 'active' : ''}`}
        >
          <div className="ds-bg ds-bg-workflow" aria-hidden="true" />
          <div className="ds-content ds-split-content">
            <div>
              <p className="ds-kicker">
                <Braces aria-hidden="true" />
                {copy.workflow.kicker}
              </p>
              <h2>{copy.workflow.title}</h2>
              <p className="ds-lead">
                {copy.workflow.lead}
              </p>
            </div>

            <div className="ds-process">
              {copy.workflow.steps.map(([index, title, text]) => (
                <article key={index}>
                  <span>{index}</span>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-hidden={active !== 2}
          className={`ds-screen ds-screen-tools ${active === 2 ? 'active' : ''}`}
        >
          <div className="ds-bg ds-bg-tools" aria-hidden="true" />
          <div className="ds-content ds-tools-content">
            <p className="ds-kicker">
                <Layers3 aria-hidden="true" />
                {copy.tools.kicker}
              </p>
            <h2>{copy.tools.title}</h2>
            <div className="ds-tool-grid">
              {copy.tools.items.map((item) => {
                const Icon = item.icon;

                return (
                  <Link className="ds-tool-card" href={item.href} key={item.title}>
                    <span>
                      <Icon aria-hidden="true" />
                    </span>
                    <strong>{item.title}</strong>
                    <small>{item.text}</small>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section
          aria-hidden={active !== 3}
          className={`ds-screen ds-screen-docs ${active === 3 ? 'active' : ''}`}
        >
          <div className="ds-bg ds-bg-docs" aria-hidden="true" />
          <div className="ds-content ds-split-content">
            <div>
              <p className="ds-kicker">
                <BookOpen aria-hidden="true" />
                {copy.docs.kicker}
              </p>
              <h2>{copy.docs.title}</h2>
              <p className="ds-lead">
                {copy.docs.lead}
              </p>
            </div>
            <div className="ds-doc-list">
              {copy.docs.routes.map(([title, text, href]) => (
                <Link href={href} key={href}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
