import { beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '@/db/migrate';
import type { AppConfig } from '@/lib/env';
import { createTestD1 } from '@/test/d1';
import { ensureTelegramWebhook, loginBotUsername, readWebhookState } from './setup';

const NOW = new Date('2026-09-26T10:00:00Z');

function config(overrides: Partial<AppConfig['telegram']> & { appUrl?: string | null } = {}): AppConfig {
  const { appUrl = 'https://bugunbor.uz', ...telegram } = overrides;
  return {
    appUrl,
    demoMode: false,
    isDevelopment: false,
    adminPhones: [],
    hashSecret: 'secret',
    payments: { enabled: false, payme: null, click: null },
    app: { fcmServiceAccount: null, reviewLoginCode: null, minBuild: 0 },
    telegram: { botToken: '1:token-a', botUsername: 'bugunborbot', webhookSecret: 'hook-secret', ...telegram },
  };
}

function fakeTelegram(username: string, options: { fail?: boolean } = {}) {
  const calls: string[] = [];
  const api = (token: string) => ({
    async call<T>(method: string): Promise<T> {
      calls.push(`${token}:${method}`);
      if (options.fail) throw new Error('Unauthorized');
      return { username } as T;
    },
    async setWebhook(url: string, secret: string) {
      calls.push(`${token}:setWebhook:${url}:${secret}`);
      if (options.fail) throw new Error('Unauthorized');
      return true;
    },
  });
  return { calls, api };
}

describe('self-connecting Telegram bot', () => {
  let db: D1Database;

  beforeEach(async () => {
    db = createTestD1();
    await applyMigrations(db);
  });

  it('registers the webhook once and remembers which bot the token belongs to', async () => {
    const { calls, api } = fakeTelegram('bugunborbot');
    const state = await ensureTelegramWebhook(db, config(), { api, now: NOW });
    expect(state).toMatchObject({ username: 'bugunborbot', url: 'https://bugunbor.uz/api/v1/telegram/webhook', error: null });
    expect(calls).toEqual(['1:token-a:getMe', '1:token-a:setWebhook:https://bugunbor.uz/api/v1/telegram/webhook:hook-secret']);

    await ensureTelegramWebhook(db, config(), { api, now: NOW });
    expect(calls).toHaveLength(2);
  });

  it('connects again when the token, secret or address changes, or when forced', async () => {
    const { calls, api } = fakeTelegram('bugunborbot');
    await ensureTelegramWebhook(db, config(), { api, now: NOW });
    await ensureTelegramWebhook(db, config({ botToken: '1:token-b' }), { api, now: NOW });
    await ensureTelegramWebhook(db, config({ botToken: '1:token-b', webhookSecret: 'new-secret' }), { api, now: NOW });
    await ensureTelegramWebhook(db, config({ botToken: '1:token-b', webhookSecret: 'new-secret' }), { api, now: NOW, force: true });
    expect(calls.filter((call) => call.includes('setWebhook'))).toHaveLength(4);
  });

  it('keeps the error and retries only after ten minutes', async () => {
    const failing = fakeTelegram('x', { fail: true });
    const state = await ensureTelegramWebhook(db, config(), { api: failing.api, now: NOW });
    expect(state?.error).toBe('Unauthorized');
    await ensureTelegramWebhook(db, config(), { api: failing.api, now: new Date(NOW.getTime() + 5 * 60_000) });
    expect(failing.calls).toHaveLength(1);

    const working = fakeTelegram('bugunborbot');
    const later = await ensureTelegramWebhook(db, config(), { api: working.api, now: new Date(NOW.getTime() + 11 * 60_000) });
    expect(later).toMatchObject({ error: null, username: 'bugunborbot' });
  });

  it('needs an https address and a complete configuration', async () => {
    const { calls, api } = fakeTelegram('bugunborbot');
    expect(await ensureTelegramWebhook(db, config({ appUrl: 'http://127.0.0.1:8788' }), { api, now: NOW })).toBeNull();
    expect(await ensureTelegramWebhook(db, config({ appUrl: null }), { api, now: NOW })).toBeNull();
    expect(await ensureTelegramWebhook(db, config({ webhookSecret: null }), { api, now: NOW })).toBeNull();
    expect(calls).toHaveLength(0);
    expect(await readWebhookState(db)).toBeNull();
  });

  it('sends people to the bot the token belongs to', async () => {
    expect(await loginBotUsername(db, config())).toBe('bugunborbot');
    const { api } = fakeTelegram('real_bugunbor_bot');
    await ensureTelegramWebhook(db, config(), { api, now: NOW });
    expect(await loginBotUsername(db, config())).toBe('real_bugunbor_bot');
    // A new token is not trusted until Telegram confirms it.
    expect(await loginBotUsername(db, config({ botToken: '1:token-b' }))).toBe('bugunborbot');
  });
});
