import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      {...baseOptions('zh')}
      tree={source.getPageTree('zh')}
      githubUrl="https://github.com/TypeDreamMoon/DreamShader"
    >
      {children}
    </DocsLayout>
  );
}
