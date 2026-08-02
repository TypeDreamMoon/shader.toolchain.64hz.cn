import { localizedPath, type Locale } from '@/lib/i18n';
import { ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import type { HomeCopy } from './copy';
import { HomeSection, SectionHead } from './section';

export function DocsSection({
  copy,
  locale,
}: {
  copy: HomeCopy;
  locale: Locale;
}) {
  return (
    <HomeSection id="docs">
      <SectionHead
        icon={BookOpen}
        kicker={copy.docs.kicker}
        lead={copy.docs.lead}
        title={copy.docs.title}
      />

      <div className="ds-route-grid">
        {copy.docs.routes.map(([title, text, href]) => (
          <Link className="ds-route" href={localizedPath(locale, href)} key={href}>
            <h3>
              {title}
              <ArrowRight aria-hidden="true" />
            </h3>
            <p>{text}</p>
          </Link>
        ))}
      </div>
    </HomeSection>
  );
}
