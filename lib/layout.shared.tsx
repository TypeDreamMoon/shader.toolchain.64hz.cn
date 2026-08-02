import type { HomeLayoutProps } from 'fumadocs-ui/layouts/home';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import type { Locale } from './i18n';
import { localizedPath } from './i18n';
import { GITHUB_URL, RIDER_PLUGIN_URL } from './site';

function DreamShaderTitle() {
  return (
    <span className="miku-brand" aria-label="DreamShaderLang">
      <span className="miku-brand-text">DreamShaderLang</span>
    </span>
  );
}

export function baseOptions(locale: Locale = 'zh'): BaseLayoutProps {
  return {
    nav: {
      title: <DreamShaderTitle />,
      url: localizedPath(locale, '/'),
    },
  };
}

/**
 * Props for the marketing (non-docs) layout, shared by both locale routes.
 */
export function homeOptions(locale: Locale): HomeLayoutProps {
  const options = baseOptions(locale);

  return {
    ...options,
    githubUrl: GITHUB_URL,
    links: [
      {
        text: 'Docs',
        url: localizedPath(locale, '/docs'),
        active: 'nested-url',
      },
      {
        text: 'Language',
        url: localizedPath(locale, '/docs/language/file-model'),
        active: 'nested-url',
      },
      {
        text: 'Tools',
        url: localizedPath(locale, '/docs/tools/vscode'),
        active: 'nested-url',
      },
      {
        text: 'ChangeLog',
        url: localizedPath(locale, '/docs/changelog'),
        active: 'nested-url',
      },
      {
        text: 'Rider',
        url: RIDER_PLUGIN_URL,
        external: true,
      },
    ],
    nav: {
      ...options.nav,
      transparentMode: 'top',
    },
    className: 'ds-home',
  };
}
