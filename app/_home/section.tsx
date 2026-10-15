import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * One screen of the homepage deck. Each band fills the viewport and carries a
 * snap point; the sizing and the wash live in `home.css` keyed off
 * `ds-section-<id>`, so a band only has to name itself here.
 */
export function HomeSection({
  id,
  children,
}: {
  id: 'sample' | 'workflow' | 'tools' | 'docs';
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
