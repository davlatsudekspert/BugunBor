import { env } from 'cloudflare:workers';

export type AppConfig = {
  appUrl: string | null;
  demoMode: boolean;
  isDevelopment: boolean;
  adminPhones: string[];
  hashSecret: string;
  telegram: {
    botToken: string | null;
    botUsername: string | null;
    webhookSecret: string | null;
  };
};

const clean = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export function getConfig(): AppConfig {
  const isDevelopment = import.meta.env.DEV;
  return {
    appUrl: clean(env.APP_URL)?.replace(/\/+$/, '') ?? null,
    demoMode: isDevelopment || env.DEMO_SEED === 'true',
    isDevelopment,
    adminPhones: (env.ADMIN_PHONES ?? '')
      .split(',')
      .map((phone) => phone.replace(/[^\d+]/g, ''))
      .filter(Boolean),
    hashSecret: clean(env.HASH_SECRET) ?? 'bugunbor-default-hash-secret',
    telegram: {
      botToken: clean(env.TELEGRAM_BOT_TOKEN),
      botUsername: clean(env.TELEGRAM_BOT_USERNAME)?.replace(/^@/, '') ?? null,
      webhookSecret: clean(env.TELEGRAM_WEBHOOK_SECRET),
    },
  };
}

export function isTelegramConfigured(config = getConfig()) {
  return Boolean(config.telegram.botToken && config.telegram.botUsername && config.telegram.webhookSecret);
}
