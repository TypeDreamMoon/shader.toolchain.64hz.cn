import './global.css';

import { SiteProvider } from '@/components/site-provider';
import { SITE_DESCRIPTION_ZH, SITE_TITLE } from '@/lib/site';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: {
    template: `%s | ${SITE_TITLE}`,
    default: SITE_TITLE,
  },
  description: SITE_DESCRIPTION_ZH,
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#39c5bb' },
    { media: '(prefers-color-scheme: dark)', color: '#10272c' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning data-darkreader-ignore>
      <body className="flex min-h-screen flex-col" suppressHydrationWarning data-darkreader-ignore>
        <SiteProvider>{children}</SiteProvider>
      </body>
    </html>
  );
}
