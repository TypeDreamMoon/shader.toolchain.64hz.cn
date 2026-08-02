import { HomeContent } from '@/app/home-content';
import type { Locale } from '@/lib/i18n';
import { homeOptions } from '@/lib/layout.shared';
import { HomeLayout } from 'fumadocs-ui/layouts/home';

/**
 * The full homepage for one locale: marketing nav plus the scroll story.
 */
export function HomeShell({ locale }: { locale: Locale }) {
  return (
    <HomeLayout {...homeOptions(locale)}>
      <HomeContent locale={locale} />
    </HomeLayout>
  );
}
