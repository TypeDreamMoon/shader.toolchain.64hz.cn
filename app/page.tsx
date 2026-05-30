import { HomeContent } from '@/app/home-content';
import { baseOptions } from '@/lib/layout.shared';
import { HomeLayout } from 'fumadocs-ui/layouts/home';

export const metadata = {
  alternates: {
    canonical: '/',
    languages: {
      zh: '/',
      en: '/en',
    },
  },
};

export default function HomePage() {
  const options = baseOptions('zh');

  return (
    <HomeLayout
      {...options}
      githubUrl="https://github.com/TypeDreamMoon/DreamShader"
      links={[
        {
          text: 'Docs',
          url: '/docs',
          active: 'nested-url',
        },
        {
          text: 'Syntax',
          url: '/docs/syntax/file-model',
          active: 'nested-url',
        },
        {
          text: 'Tools',
          url: '/docs/workflows/vscode',
          active: 'nested-url',
        },
        {
          text: 'ChangeLog',
          url: '/docs/changelog',
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
      <HomeContent locale="zh" />
    </HomeLayout>
  );
}
