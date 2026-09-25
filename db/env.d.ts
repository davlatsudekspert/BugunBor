declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    /** Public site origin, e.g. https://bugunbor.uz — used for Telegram links and webhook setup. */
    APP_URL?: string;
    /** "true" seeds fictional demo businesses and deals outside development. */
    DEMO_SEED?: string;
    /** Comma-separated +998… numbers that become ADMIN after their first Telegram login. */
    ADMIN_PHONES?: string;
    TELEGRAM_BOT_TOKEN?: string;
    /** Bot username without @, e.g. BugunBorBot. */
    TELEGRAM_BOT_USERNAME?: string;
    /** Random string (A-Z, a-z, 0-9, _ and -) sent by Telegram in X-Telegram-Bot-Api-Secret-Token. */
    TELEGRAM_WEBHOOK_SECRET?: string;
    /** Secret mixed into IP and redemption-code hashes. */
    HASH_SECRET?: string;
  }
}
