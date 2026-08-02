import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * One band of the homepage. Bands sit in normal document flow — the page
 * scrolls like any other page, and each band owns only its own rhythm.
 */
export function HomeSection({
  id,
  children,
}: {
  id: 'workflow' | 'tools' | 'docs';
  children: ReactNode;
}) {
  return (
    <section className={`ds-section ds-section-${id}`} id={id}>
      <div className="ds-container">{children}</div>
    </section>
  );
}

export function SectionHead({
  icon: Icon,
  kicker,
  title,
  lead,
}: {
  icon: LucideIcon;
  kicker: string;
  title: string;
  lead: string;
}) {
  return (
    <header className="ds-head">
      <p className="ds-kicker">
        <Icon aria-hidden="true" />
        {kicker}
      </p>
      <h2>{title}</h2>
      <p className="ds-lead">{lead}</p>
    </header>
  );
}
