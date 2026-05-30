'use client';

import StaticSearchDialog from '@/components/search';
import {
  defaultLocale,
  i18nUI,
  isLocale,
  localizedPath,
  type Locale,
} from '@/lib/i18n';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, type ReactNode } from 'react';

function getLocaleFromPathname(pathname: string): Locale {
  const [first] = pathname.split('/').filter(Boolean);
  return isLocale(first) ? first : defaultLocale;
}

function stripLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);

  if (isLocale(segments[0])) {
    segments.shift();
  }

  return segments.length > 0 ? `/${segments.join('/')}` : '/';
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = getLocaleFromPathname(pathname);

  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
  }, [locale]);

  const handleLocaleChange = useCallback(
    (nextLocale: string) => {
      if (!isLocale(nextLocale)) {
        return;
      }

      router.push(localizedPath(nextLocale, stripLocale(pathname)));
    },
    [pathname, router],
  );

  return (
    <RootProvider
      i18n={{
        ...i18nUI.provider(locale),
        onLocaleChange: handleLocaleChange,
      }}
      search={{
        SearchDialog: StaticSearchDialog,
      }}
    >
      {children}
    </RootProvider>
  );
}
