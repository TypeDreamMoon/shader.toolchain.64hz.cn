import { DocsShell } from '@/lib/docs-layout';
import { defaultLocale } from '@/lib/i18n';
import { resolveLocaleParam } from '@/lib/locale-param';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default async function DocsRootLayout(props: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const locale = resolveLocaleParam(lang);

  if (locale === defaultLocale) {
    redirect('/docs');
  }

  return <DocsShell locale={locale}>{props.children}</DocsShell>;
}
