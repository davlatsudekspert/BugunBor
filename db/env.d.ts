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
    /** Payme Business cashbox ID (Merchant API). */
    PAYME_MERCHANT_ID?: string;
    /** Payme cashbox key; Payme sends it as Basic auth "Paycom:<key>". Use the test key in the sandbox. */
    PAYME_KEY?: string;
    /** "false" only with the live key: sandbox checkout (test.paycom.uz) and tests while payments are off. */
    PAYME_SANDBOX?: string;
    /** Fiscal receipt for Payme (only if the cashbox asks for it): MXIK/IKPU code from tasnif.soliq.uz, package code, VAT percent. */
    PAYME_IKPU?: string;
    PAYME_PACKAGE_CODE?: string;
    PAYME_VAT_PERCENT?: string;
    /** Click SHOP API: service ID, merchant ID and secret key from the Click merchant cabinet. */
    CLICK_SERVICE_ID?: string;
    CLICK_MERCHANT_ID?: string;
    CLICK_SECRET_KEY?: string;
    /** "false" after Click's integration tests: until then Prepare/Complete answer while payments are off. */
    CLICK_SANDBOX?: string;
    /** "true" lets businesses pay online; until then the buttons say "coming soon". */
    PAYMENTS_ENABLED?: string;
  }
}
