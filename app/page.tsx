import { HomeShell } from '@/app/_home/home-shell';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
    languages: {
      zh: '/',
      en: '/en',
    },
  },
};

export default function HomePage() {
  return <HomeShell locale="zh" />;
}
