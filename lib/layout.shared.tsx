import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import type { Locale } from './i18n';
import { localizedPath } from './i18n';

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
