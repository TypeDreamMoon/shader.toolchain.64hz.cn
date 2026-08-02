import { localizedPath, type Locale } from '@/lib/i18n';
import { GITHUB_URL } from '@/lib/site';
import { BookOpen, CodeXml, GitBranch } from 'lucide-react';
import Link from 'next/link';
import { CodePanel } from './code-panel';
import type { HomeCopy } from './copy';

export function HeroSection({
  copy,
  locale,
}: {
  copy: HomeCopy;
  locale: Locale;
}) {
  return (
    <section className="ds-hero" id="overview">
      <div className="ds-aurora" aria-hidden="true" />

      <div className="ds-container ds-hero-grid">
        <div className="ds-hero-copy">
          <p className="ds-kicker">
            <CodeXml aria-hidden="true" />
            {copy.hero.kicker}
          </p>

          <h1>
            {copy.hero.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>

          <p className="ds-lead">{copy.hero.lead}</p>

          <div className="ds-actions">
            <Link className="ds-btn ds-btn-primary" href={localizedPath(locale, '/docs')}>
              <BookOpen aria-hidden="true" />
              {copy.hero.primary}
            </Link>
            <a
              className="ds-btn ds-btn-ghost"
              href={GITHUB_URL}
              rel="noreferrer"
              target="_blank"
            >
              <GitBranch aria-hidden="true" />
              {copy.hero.secondary}
            </a>
          </div>

          <ul className="ds-tags" aria-label={copy.hero.versionsLabel}>
            {copy.versions.map(([label, value]) => (
              <li key={label}>
                <strong>{label}</strong>
                {value}
              </li>
            ))}
          </ul>
        </div>

        <CodePanel file={copy.sample.file} result={copy.sample.result} />
      </div>
    </section>
  );
}
