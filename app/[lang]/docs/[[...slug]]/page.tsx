import { getMDXComponents } from '@/mdx-components';
import { defaultLocale, isLocale, type Locale } from '@/lib/i18n';
import { source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

export function generateStaticParams() {
  return source
    .getPages('en')
    .map((page) => ({
      lang: 'en',
      slug: page.slugs,
    }));
}

export async function generateMetadata(props: {
  params: Promise<{ lang: string; slug?: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;

  if (!isLocale(params.lang)) {
    notFound();
  }

  if (params.lang === defaultLocale) {
    return {};
  }

  const locale = params.lang as Locale;
  const page = source.getPage(params.slug, locale);

  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: page.url,
      languages: {
        zh: source.getPage(params.slug, 'zh')?.url,
        en: page.url,
      },
    },
  };
}

export default async function Page(props: {
  params: Promise<{ lang: string; slug?: string[] }>;
}) {
  const params = await props.params;

  if (!isLocale(params.lang)) {
    notFound();
  }

  if (params.lang === defaultLocale) {
    redirect(`/docs/${params.slug?.join('/') ?? ''}`);
  }

  const locale = params.lang as Locale;
  const page = source.getPage(params.slug, locale);

  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? (
        <DocsDescription>{page.data.description}</DocsDescription>
      ) : null}
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}
