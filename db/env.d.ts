declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    /** Bot token from @BotFather, used to deliver admin login codes over Telegram. */
    TELEGRAM_BOT_TOKEN?: string;
    /** Phone number for the first SUPER_ADMIN account, seeded on first boot. */
    ADMIN_BOOTSTRAP_PHONE?: string;
    /** Telegram chat id (from the bot's getUpdates, after the admin messages the bot) for the bootstrap SUPER_ADMIN. */
    ADMIN_BOOTSTRAP_TELEGRAM_CHAT_ID?: string;
    /** Channel id (e.g. "@bugunbor" or "-100…") the bot posts admin announcements/promotions to. The bot must be an admin of that channel. */
    TELEGRAM_ANNOUNCE_CHANNEL_ID?: string;
    /** The bot's @username (no @), used to build the /login phone-linking deep link (https://t.me/<username>?start=…). Defaults to "bugunborbot". */
    TELEGRAM_BOT_USERNAME?: string;
    /** Shared secret Telegram echoes back on every webhook call (set via setWebhook's secret_token) — POST /api/v1/telegram/bot/webhook rejects anything that doesn't match. */
    TELEGRAM_WEBHOOK_SECRET?: string;
    /** Payme Merchant ID (Cashbox id) from business.payme.uz — see modules/billing/payme.ts. Without it, POST /api/v1/business/plan/checkout always 503s rather than faking a checkout link. */
    PAYME_MERCHANT_ID?: string;
    /** Payme Merchant API secret key — the password half of the "Paycom" Basic auth Payme's own servers send on every POST /api/v1/payments/payme/webhook call. */
    PAYME_SECRET_KEY?: string;
    /** Overrides the checkout redirect host (defaults to https://checkout.paycom.uz) — only ever needed for Payme's sandbox/test environment. */
    PAYME_CHECKOUT_URL?: string;
  }
}
