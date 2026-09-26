import { waitUntil } from 'cloudflare:workers';

import { getConfig, isTelegramConfigured } from '@/lib/env';
import { processNotifications } from '@/modules/notifications/service';
import { createTelegramApi } from '@/modules/telegram/api';
import { ensureTelegramWebhook } from '@/modules/telegram/setup';

// Work that should not slow down the request that triggered it: connecting
// the Telegram bot (first request after a deploy) and sending notifications.
// Traffic drives it (at most once a minute per isolate); Workers keep the
// isolate alive for waitUntil promises after the response is sent.

const INTERVAL_MS = 60_000;
let lastRun = 0;

export function tickBackgroundJobs(db: D1Database, now = Date.now()) {
  if (now - lastRun < INTERVAL_MS) return;
  lastRun = now;
  const config = getConfig();
  if (!isTelegramConfigured(config)) return;
  const task = ensureTelegramWebhook(db, config)
    .catch((error: unknown) => console.error('Telegram webhook setup failed', error))
    .then(() => processNotifications(db, createTelegramApi(config.telegram.botToken!).sender, { appUrl: config.appUrl ?? 'https://bugunbor.uz' }))
    .catch((error: unknown) => console.error('Notification job failed', error));
  try {
    waitUntil(task);
  } catch {
    // Outside a request context; the promise still runs.
  }
}
