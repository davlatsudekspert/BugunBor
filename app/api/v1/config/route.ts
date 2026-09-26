import { getDb } from '@/db/client';
import { CITIES } from '@/lib/cities';
import { getConfig } from '@/lib/env';
import { json, route } from '@/lib/http';
import { PRIVACY_VERSION } from '@/lib/privacy';
import { getBillingSettings } from '@/modules/billing/service';
import { listCategories } from '@/modules/catalog/queries';
import { demoEnabled } from '@/modules/demo';
import { REPORT_REASONS } from '@/modules/reports';
import { loginBotUsername } from '@/modules/telegram/setup';

// Everything the mobile app needs before its first screen: switches the admin
// controls (demo, tariffs), the oldest supported build, categories, cities.
// The app never sells anything, so it only uses these to hide prices.
export const GET = route(async () => {
  const config = getConfig();
  const db = await getDb();
  const [demo, billing, categories, bot] = await Promise.all([
    demoEnabled(db),
    getBillingSettings(db),
    listCategories(db),
    loginBotUsername(db, config).catch(() => config.telegram.botUsername),
  ]);
  return json(
    {
      data: {
        demo,
        tariffsEnabled: billing.tariffsEnabled,
        minAppBuild: config.app.minBuild,
        privacyVersion: PRIVACY_VERSION,
        links: { privacy: '/privacy', terms: '/terms', deleteAccount: '/delete-account', contact: '/contact' },
        telegramBot: bot,
        // `id` is what business registration sends; `slug` is used everywhere else.
        categories: categories.map((category) => ({ id: category.id, slug: category.slug, nameUz: category.nameUz, nameRu: category.nameRu, icon: category.icon })),
        cities: CITIES.map((city) => ({ slug: city.slug, nameUz: city.uz, nameRu: city.ru, latitude: city.latitude, longitude: city.longitude })),
        reportReasons: REPORT_REASONS,
      },
    },
    { headers: { 'cache-control': 'public, max-age=60' } },
  );
});
