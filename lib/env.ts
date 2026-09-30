import { env } from 'cloudflare:workers';

import type { PhotoCheckConfig } from '@/modules/media/check';

/** Receipt data Payme needs when the cashbox has fiscalization: MXIK (IKPU) code, package code, VAT %. */
export type PaymeFiscal = { ikpu: string; packageCode: string; vatPercent: number };

export type AppConfig = {
  appUrl: string | null;
  demoMode: boolean;
  isDevelopment: boolean;
  adminPhones: string[];
  hashSecret: string;
  /** Separate Authenticator encryption key; must not rotate redemption-code hashes. */
  adminMfaSecret: string | null;
  telegram: {
    botToken: string | null;
    botUsername: string | null;
    webhookSecret: string | null;
  };
  /**
   * Online plan payments. `enabled` (PAYMENTS_ENABLED) lets businesses pay;
   * a provider exists only when all its secrets are set. `sandbox` keeps its
   * callback endpoint answering for provider tests while payments are off.
   */
  app: {
    fcmServiceAccount: string | null;
    reviewLoginCode: string | null;
    minBuild: number;
  };
  payments: {
    enabled: boolean;
    payme: { merchantId: string; key: string; sandbox: boolean; fiscal: PaymeFiscal | null } | null;
    click: { serviceId: string; merchantId: string; secretKey: string; sandbox: boolean } | null;
  };
  /** Who looks at every public photo before it is kept: Claude (ANTHROPIC_API_KEY), then Gemini (GEMINI_API_KEY); null = no key, photos are kept unchecked. */
  photoCheck: PhotoCheckConfig | null;
};

const clean = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** Development fallback only; production must set HASH_SECRET (see docs/operations.md). */
export const DEFAULT_HASH_SECRET = 'bugunbor-default-hash-secret';

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
    hashSecret: clean(env.HASH_SECRET) ?? DEFAULT_HASH_SECRET,
    adminMfaSecret: clean(env.ADMIN_MFA_SECRET),
    telegram: {
      botToken: clean(env.TELEGRAM_BOT_TOKEN),
      botUsername: clean(env.TELEGRAM_BOT_USERNAME)?.replace(/^@/, '') ?? null,
      webhookSecret: clean(env.TELEGRAM_WEBHOOK_SECRET),
    },
    app: {
      fcmServiceAccount: clean(env.FCM_SERVICE_ACCOUNT),
      reviewLoginCode: (clean(env.REVIEW_LOGIN_CODE)?.length ?? 0) >= 12 ? clean(env.REVIEW_LOGIN_CODE) : null,
      minBuild: Number.parseInt(clean(env.MIN_APP_BUILD) ?? '0', 10) || 0,
    },
    payments: paymentsConfig(),
    photoCheck: photoCheckConfig(),
  };
}

function photoCheckConfig(): PhotoCheckConfig | null {
  const provider = (key: string | undefined, model: string | undefined) => {
    const apiKey = clean(key);
    return apiKey ? { apiKey, model: clean(model) } : null;
  };
  const config = { claude: provider(env.ANTHROPIC_API_KEY, env.PHOTO_CHECK_MODEL), gemini: provider(env.GEMINI_API_KEY, env.GEMINI_MODEL) };
  return config.claude || config.gemini ? config : null;
}

function paymeFiscal(): PaymeFiscal | null {
  const ikpu = clean(env.PAYME_IKPU);
  const packageCode = clean(env.PAYME_PACKAGE_CODE);
  const vat = Number(clean(env.PAYME_VAT_PERCENT) ?? '0');
  return ikpu && packageCode ? { ikpu, packageCode, vatPercent: Number.isFinite(vat) ? vat : 0 } : null;
}

function paymentsConfig(): AppConfig['payments'] {
  const payme = { merchantId: clean(env.PAYME_MERCHANT_ID), key: clean(env.PAYME_KEY) };
  const click = { serviceId: clean(env.CLICK_SERVICE_ID), merchantId: clean(env.CLICK_MERCHANT_ID), secretKey: clean(env.CLICK_SECRET_KEY) };
  return {
    enabled: env.PAYMENTS_ENABLED === 'true',
    // Sandbox unless explicitly switched off: a test key never takes real money.
    payme: payme.merchantId && payme.key ? { merchantId: payme.merchantId, key: payme.key, sandbox: env.PAYME_SANDBOX !== 'false', fiscal: paymeFiscal() } : null,
    click: click.serviceId && click.merchantId && click.secretKey
      ? { serviceId: click.serviceId, merchantId: click.merchantId, secretKey: click.secretKey, sandbox: env.CLICK_SANDBOX !== 'false' }
      : null,
  };
}

export function isTelegramConfigured(config = getConfig()) {
  return Boolean(config.telegram.botToken && config.telegram.botUsername && config.telegram.webhookSecret);
}
