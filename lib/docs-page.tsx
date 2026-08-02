import { getMDXComponents } from '@/mdx-components';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Locale } from './i18n';
import { source } from './source';

export type DocsSlug = string[] | undefined;

/**
 * Every page of one locale, as `generateStaticParams` entries.
 */
export function docsStaticParams(locale: Locale): { slug: string[] }[] {
  return source.getPages(locale).map((page) => ({
    slug: page.slugs,
  }));
}

function requirePage(locale: Locale, slug: DocsSlug) {
  const page = source.getPage(slug, locale);

  if (!page) notFound();

  return page;
}

export function docsMetadata(locale: Locale, slug: DocsSlug): Metadata {
  const page = requirePage(locale, slug);

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: page.url,
      languages: {
        zh: source.getPage(slug, 'zh')?.url,
        en: source.getPage(slug, 'en')?.url,
      },
    },
  };
}

export function DocsPageContent({
  locale,
  slug,
}: {
  locale: Locale;
  slug: DocsSlug;
}) {
  const page = requirePage(locale, slug);
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
