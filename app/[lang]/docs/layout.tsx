import { defaultLocale, isLocale, type Locale } from '@/lib/i18n';
import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default async function DocsRootLayout(props: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;

  if (!isLocale(lang)) {
    notFound();
  }

  if (lang === defaultLocale) {
    redirect('/docs');
  }

  const locale = lang as Locale;

  return (
    <DocsLayout
      {...baseOptions(locale)}
      tree={source.getPageTree(locale)}
      githubUrl="https://github.com/TypeDreamMoon/DreamShader"
    >
      {props.children}
    </DocsLayout>
  );
}
