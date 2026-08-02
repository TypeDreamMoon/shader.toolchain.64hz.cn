import {
  DocsPageContent,
  docsMetadata,
  docsStaticParams,
} from '@/lib/docs-page';
import { defaultLocale } from '@/lib/i18n';
import { resolveLocaleParam } from '@/lib/locale-param';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

type LocalizedDocsRouteProps = {
  params: Promise<{ lang: string; slug?: string[] }>;
};

export function generateStaticParams() {
  return docsStaticParams('en').map((params) => ({
    lang: 'en',
    ...params,
  }));
}

export async function generateMetadata(
  props: LocalizedDocsRouteProps,
): Promise<Metadata> {
  const { lang, slug } = await props.params;
  const locale = resolveLocaleParam(lang);

  if (locale === defaultLocale) {
    return {};
  }

  return docsMetadata(locale, slug);
}

export default async function Page(props: LocalizedDocsRouteProps) {
  const { lang, slug } = await props.params;
  const locale = resolveLocaleParam(lang);

  if (locale === defaultLocale) {
    redirect(`/docs/${slug?.join('/') ?? ''}`);
  }

  return <DocsPageContent locale={locale} slug={slug} />;
}
