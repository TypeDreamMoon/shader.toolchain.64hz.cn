import { HomeShell } from '@/app/_home/home-shell';
import { defaultLocale, localizedPath } from '@/lib/i18n';
import { resolveLocaleParam } from '@/lib/locale-param';
import { SITE_DESCRIPTION_EN, SITE_TITLE } from '@/lib/site';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

type LocalizedHomeProps = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return [{ lang: 'en' }];
}

export async function generateMetadata(
  props: LocalizedHomeProps,
): Promise<Metadata> {
  const { lang } = await props.params;
  const locale = resolveLocaleParam(lang);

  if (locale === defaultLocale) {
    return {};
  }

  return {
    // absolute: the root layout's `%s | DreamShaderLang` template would
    // otherwise render the homepage as "DreamShaderLang | DreamShaderLang"
    title: { absolute: SITE_TITLE },
    description: SITE_DESCRIPTION_EN,
    alternates: {
      canonical: localizedPath(locale, '/'),
      languages: {
        zh: '/',
        en: '/en',
      },
    },
  };
}

export default async function HomePage(props: LocalizedHomeProps) {
  const { lang } = await props.params;
  const locale = resolveLocaleParam(lang);

  if (locale === defaultLocale) {
    redirect('/');
  }

  return <HomeShell locale={locale} />;
}
