import { defineI18n } from 'fumadocs-core/i18n';
import { defineI18nUI } from 'fumadocs-ui/i18n';

export const locales = ['zh', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh';

export const i18n = defineI18n({
  languages: [...locales],
  defaultLanguage: defaultLocale,
  hideLocale: 'default-locale',
  parser: 'dot',
});

export const i18nUI = defineI18nUI(i18n, {
  zh: {
    displayName: '中文',
    search: '搜索',
    searchNoResult: '没有找到结果',
    toc: '本页目录',
    tocNoHeadings: '没有目录',
    lastUpdate: '最后更新于',
    chooseLanguage: '选择语言',
    nextPage: '下一页',
    previousPage: '上一页',
    chooseTheme: '主题',
    editOnGithub: '在 GitHub 上编辑',
  },
  en: {
    displayName: 'English',
  },
});

export function isLocale(value: string | undefined): value is Locale {
  return value === 'zh' || value === 'en';
}

export function localizedPath(locale: Locale, path: string): string {
  if (locale === defaultLocale) {
    return path;
  }

  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}
