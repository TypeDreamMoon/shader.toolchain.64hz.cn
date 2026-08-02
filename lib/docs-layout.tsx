import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import type { Locale } from './i18n';
import { baseOptions } from './layout.shared';
import { GITHUB_URL } from './site';
import { source } from './source';

/**
 * The docs chrome (sidebar tree, nav, GitHub link) for one locale.
 * Both `app/docs` and `app/[lang]/docs` render this.
 */
export function DocsShell({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <DocsLayout
      {...baseOptions(locale)}
      tree={source.getPageTree(locale)}
      githubUrl={GITHUB_URL}
    >
      {children}
    </DocsLayout>
  );
}
