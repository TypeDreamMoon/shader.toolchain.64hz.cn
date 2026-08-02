import { DocsShell } from '@/lib/docs-layout';
import type { ReactNode } from 'react';

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return <DocsShell locale="zh">{children}</DocsShell>;
}
