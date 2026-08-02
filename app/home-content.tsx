import { homeCopies } from '@/app/_home/copy';
import { DocsSection } from '@/app/_home/docs-section';
import { HeroSection } from '@/app/_home/hero-section';
import { ToolsSection } from '@/app/_home/tools-section';
import { WorkflowSection } from '@/app/_home/workflow-section';
import type { Locale } from '@/lib/i18n';
import { GITHUB_URL, SITE_TITLE } from '@/lib/site';

/**
 * The homepage body. It is a static server component: the page scrolls
 * normally, so there is no slide state, no wheel handler and no client bundle.
 */
export function HomeContent({ locale = 'zh' }: { locale?: Locale }) {
  const copy = homeCopies[locale];

  return (
    <main>
      <HeroSection copy={copy} locale={locale} />
      <WorkflowSection copy={copy} />
      <ToolsSection copy={copy} locale={locale} />
      <DocsSection copy={copy} locale={locale} />

      <footer className="ds-foot">
        <div className="ds-container">
          <span className="ds-foot-brand">{SITE_TITLE}</span>
          <span className="ds-foot-links">
            <a href={GITHUB_URL} rel="noreferrer" target="_blank">
              GitHub
            </a>
            <span aria-hidden="true">·</span>
            <span>MIT</span>
            <span aria-hidden="true">·</span>
            <span>TypeDreamMoon</span>
          </span>
        </div>
      </footer>
    </main>
  );
}
