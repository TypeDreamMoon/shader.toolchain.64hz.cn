import { Backdrop } from '@/app/_home/backdrop';
import { homeCopies } from '@/app/_home/copy';
import { DocsSection } from '@/app/_home/docs-section';
import { HeroSection } from '@/app/_home/hero-section';
import { SampleSection } from '@/app/_home/sample-section';
import { SlideDeck } from '@/app/_home/slide-deck';
import { SlideNav } from '@/app/_home/slide-nav';
import { ToolsSection } from '@/app/_home/tools-section';
import { WorkflowSection } from '@/app/_home/workflow-section';
import type { Locale } from '@/lib/i18n';
import { FX_SITE_URL, GITHUB_URL, GUI_SITE_URL, PORTAL_URL, SITE_TITLE } from '@/lib/site';

/**
 * The homepage body: five full-height bands, one per screen.
 *
 * Snapping is CSS, so touch, the keyboard and a JavaScript-less page all work on
 * their own. `SlideDeck` adds the timing on top — one eased glide per gesture
 * instead of the browser's own short snap animation — and the arrival reveals.
 * Both step aside for a short viewport, a narrow one, or reduced motion.
 */
export function HomeContent({ locale = 'zh' }: { locale?: Locale }) {
  const copy = homeCopies[locale];

  return (
    <main>
      <Backdrop />

      <HeroSection copy={copy} locale={locale} />
      <SampleSection copy={copy} />
      <WorkflowSection copy={copy} />
      <ToolsSection copy={copy} locale={locale} />
      <DocsSection copy={copy} locale={locale}>
        <footer className="ds-foot">
          <div className="ds-container">
            <span className="ds-foot-brand">{SITE_TITLE}</span>
            <span className="ds-foot-links">
              <a href={GITHUB_URL} rel="noreferrer" target="_blank">
                GitHub
              </a>
              <span aria-hidden="true">·</span>
              <a href={FX_SITE_URL} rel="noreferrer" target="_blank">
                DreamFX
              </a>
              <span aria-hidden="true">·</span>
              <a href={GUI_SITE_URL} rel="noreferrer" target="_blank">
                DreamGUI
              </a>
              <span aria-hidden="true">·</span>
              <a href={PORTAL_URL} rel="noreferrer" target="_blank">
                64Hz Toolchain
              </a>
              <span aria-hidden="true">·</span>
              <span>MIT</span>
              <span aria-hidden="true">·</span>
              <span>TypeDreamMoon</span>
            </span>
          </div>
        </footer>
      </DocsSection>

      <SlideNav label={copy.railLabel} slides={copy.slides} />
      <SlideDeck />
    </main>
  );
}
