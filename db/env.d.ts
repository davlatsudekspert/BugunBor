declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    /** Shared secret a Cloudflare Cron Trigger (or external scheduler) presents to
     *  POST /api/v1/admin/scheduler/tick. Unset in local/dev — that endpoint then
     *  only accepts an authenticated ADMIN/SUPER_ADMIN session. */
    CRON_SECRET?: string;
  }
}
