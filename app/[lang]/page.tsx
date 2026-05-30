import { HomeContent } from '@/app/home-content';
import { defaultLocale, isLocale, localizedPath, type Locale } from '@/lib/i18n';
import { baseOptions } from '@/lib/layout.shared';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

export function generateStaticParams() {
  return [{ lang: 'en' }];
}

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;

  if (!isLocale(lang)) {
    notFound();
  }

  if (lang === defaultLocale) {
    return {};
  }

  return {
    title: 'DreamShaderLang',
    description:
      'DreamShaderLang is a text-first material language for Unreal Engine material graphs.',
    alternates: {
      canonical: localizedPath(lang, '/'),
      languages: {
        zh: '/',
        en: '/en',
      },
    },
  };
}

export default async function HomePage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;

  if (!isLocale(lang)) {
    notFound();
  }

  if (lang === defaultLocale) {
    redirect('/');
  }

  const locale = lang as Locale;
  const options = baseOptions(locale);

  return (
    <HomeLayout
      {...options}
      githubUrl="https://github.com/TypeDreamMoon/DreamShader"
      links={[
        {
          text: 'Docs',
          url: '/en/docs',
          active: 'nested-url',
        },
        {
          text: 'Syntax',
          url: '/en/docs/syntax/file-model',
          active: 'nested-url',
        },
        {
          text: 'Tools',
          url: '/en/docs/workflows/vscode',
          active: 'nested-url',
        },
        {
          text: 'ChangeLog',
          url: '/en/docs/changelog',
          active: 'nested-url',
        },
        {
          text: 'Rider',
          url: 'https://github.com/tsdaer/dreamshader-language-support',
          external: true,
        },
      ]}
      nav={{
        ...options.nav,
        transparentMode: 'top',
      }}
      className="ds-home"
    >
      <HomeContent locale="en" />
    </HomeLayout>
  );
}
