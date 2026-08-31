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
  }
}
