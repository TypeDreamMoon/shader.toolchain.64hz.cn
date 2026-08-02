import { localizedPath, type Locale } from '@/lib/i18n';
import { ArrowUpRight, Layers3 } from 'lucide-react';
import Link from 'next/link';
import type { HomeCopy } from './copy';
import { HomeSection, SectionHead } from './section';

export function ToolsSection({
  copy,
  locale,
}: {
  copy: HomeCopy;
  locale: Locale;
}) {
  return (
    <HomeSection id="tools">
      <SectionHead
        icon={Layers3}
        kicker={copy.tools.kicker}
        lead={copy.tools.lead}
        title={copy.tools.title}
      />

      <div className="ds-tool-grid">
        {copy.tools.items.map((item) => {
          const Icon = item.icon;

          const body = (
            <>
              <span className="ds-tool-icon">
                <Icon aria-hidden="true" />
              </span>
              <h3>
                {item.title}
                {item.external ? <ArrowUpRight aria-hidden="true" /> : null}
              </h3>
              <p>{item.text}</p>
            </>
          );

          return item.external ? (
            <a
              className="ds-tool-card"
              href={item.href}
              key={item.title}
              rel="noreferrer"
              target="_blank"
            >
              {body}
            </a>
          ) : (
            <Link
              className="ds-tool-card"
              href={localizedPath(locale, item.href)}
              key={item.title}
            >
              {body}
            </Link>
          );
        })}
      </div>
    </HomeSection>
  );
}
