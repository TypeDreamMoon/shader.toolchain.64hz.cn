import {
  DocsPageContent,
  docsMetadata,
  docsStaticParams,
} from '@/lib/docs-page';
import type { Metadata } from 'next';

type DocsRouteProps = {
  params: Promise<{ slug?: string[] }>;
};

export function generateStaticParams() {
  return docsStaticParams('zh');
}

export async function generateMetadata(
  props: DocsRouteProps,
): Promise<Metadata> {
  const { slug } = await props.params;

  return docsMetadata('zh', slug);
}

export default async function Page(props: DocsRouteProps) {
  const { slug } = await props.params;

  return <DocsPageContent locale="zh" slug={slug} />;
}
