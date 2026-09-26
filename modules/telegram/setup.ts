import type { AppConfig } from '@/lib/env';
import { toDbTime } from '@/lib/time';
import { createTelegramApi } from './api';

// The bot connects itself: the first request after a deploy (and after the
// token, secret or site address changes) registers the webhook with Telegram.
// Logging in needs a working webhook, so a manual "connect" button behind the
// admin login could never be the first step.

export type WebhookState = {
  /** Hash of token, secret and URL the state belongs to. */
  fingerprint: string;
  /** The bot the token belongs to, as Telegram reports it (getMe). */
  username: string | null;
  url: string;
  error: string | null;
  checkedAt: string;
};

const KEY = 'telegram_webhook';
const RETRY_MS = 10 * 60_000;

export const webhookUrl = (appUrl: string) => `${appUrl}/api/v1/telegram/webhook`;

async function fingerprintOf(config: AppConfig) {
  const parts = [config.telegram.botToken ?? '', config.telegram.webhookSecret ?? '', webhookUrl(config.appUrl ?? '')];
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts.join('\n'))));
  return Array.from(digest.slice(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function readWebhookState(db: D1Database): Promise<WebhookState | null> {
  const row = await db.prepare(`SELECT value FROM app_settings WHERE key = ?1`).bind(KEY).first<{ value: string }>();
  if (!row) return null;
  try {
    return JSON.parse(row.value) as WebhookState;
  } catch {
    return null;
  }
}

type Api = Pick<ReturnType<typeof createTelegramApi>, 'call' | 'setWebhook'>;

/**
 * Registers the webhook once per token, secret and address (retrying failures
 * every ten minutes) and remembers which bot the token belongs to. Needs an
 * https APP_URL, as Telegram only calls https webhooks.
 */
export async function ensureTelegramWebhook(
  db: D1Database,
  config: AppConfig,
  options: { force?: boolean; now?: Date; api?: (token: string) => Api } = {},
): Promise<WebhookState | null> {
  const { botToken, botUsername, webhookSecret } = config.telegram;
  if (!botToken || !botUsername || !webhookSecret || !config.appUrl?.startsWith('https://')) return null;
  const now = options.now ?? new Date();
  const token = botToken;
  const url = webhookUrl(config.appUrl);
  const fingerprint = await fingerprintOf(config);
  const current = await readWebhookState(db);
  if (!options.force && current?.fingerprint === fingerprint) {
    if (!current.error) return current;
    if (now.getTime() - Date.parse(current.checkedAt) < RETRY_MS) return current;
  }

  const api = (options.api ?? createTelegramApi)(token);
  let next: WebhookState;
  try {
    const me = await api.call<{ username?: string }>('getMe');
    await api.setWebhook(url, webhookSecret);
    next = { fingerprint, username: me.username ?? null, url, error: null, checkedAt: now.toISOString() };
  } catch (error) {
    next = { fingerprint, username: current?.fingerprint === fingerprint ? current.username : null, url, error: error instanceof Error ? error.message : String(error), checkedAt: now.toISOString() };
  }
  await db
    .prepare(`INSERT INTO app_settings(key, value, updated_at) VALUES (?1, ?2, ?3)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .bind(KEY, JSON.stringify(next), toDbTime(now))
    .run();
  return next;
}

/** The state, only if it still describes the configured token, secret and address. */
export async function currentWebhookState(db: D1Database, config: AppConfig) {
  const state = await readWebhookState(db).catch(() => null);
  return state && state.fingerprint === (await fingerprintOf(config)) ? state : null;
}

/** The bot a login link should open: the one the token belongs to, once Telegram has confirmed it. */
export async function loginBotUsername(db: D1Database, config: AppConfig) {
  return (await currentWebhookState(db, config))?.username ?? config.telegram.botUsername;
}
