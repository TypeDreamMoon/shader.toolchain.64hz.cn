import { notFound } from 'next/navigation';
import { isLocale, type Locale } from './i18n';

/**
 * Narrow a raw `[lang]` route parameter to a supported locale.
 * Unknown values render the not-found page.
 */
export function resolveLocaleParam(value: string): Locale {
  if (!isLocale(value)) {
    notFound();
  }

  return value;
}
