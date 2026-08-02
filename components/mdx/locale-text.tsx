'use client';

import { useI18n } from 'fumadocs-ui/contexts/i18n';
import type { ReactNode } from 'react';

export interface LocaleTextProps {
  /** Rendered for the default locale (`zh`) and for any unknown locale. */
  zh: ReactNode;
  /** Rendered for the `en` locale. */
  en: ReactNode;
}

/**
 * Picks one of two prerendered fragments based on the active locale.
 *
 * This is the only client-side piece of the MDX component set. It exists because the custom
 * components carry a little fixed chrome (table headers, the "deprecated" label) that has to speak
 * the page's language, and a server component has no way to see the route's locale. The locale
 * comes from `RootProvider` in `components/site-provider.tsx`, which resolves it from the pathname,
 * so it is already correct during the static export — the same mechanism fumadocs uses for its own
 * UI strings.
 *
 * Keep this a leaf: pass finished fragments in, never wrap large subtrees with it.
 */
export function LocaleText({ zh, en }: LocaleTextProps) {
  const { locale } = useI18n();

  return <>{locale === 'en' ? en : zh}</>;
}
