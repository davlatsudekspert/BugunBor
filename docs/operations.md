# Operations

## Deploy

1. Run the gates: `npm run lint && npm run typecheck && npm test && npm run build`.
2. Deploy the Worker with its D1 binding `DB` (the Sites plugin reads `.openai/hosting.json`).
3. Set the variables from `.env.example` (at least `APP_URL`, `HASH_SECRET`, the three `TELEGRAM_*` values and `ADMIN_PHONES`).
4. Open the site, log in with an admin phone through Telegram, go to **Admin → Sozlamalar** and press **Webhook o‘rnatish**.
5. In **Admin → Tariflar** check prices, the free-period length (1–3 months) and the payment instructions shown to businesses.

Migrations run automatically on the first request after a deploy. They are additive and idempotent; never edit a migration that has shipped — add a new one.

## Telegram bot

- Create the bot with @BotFather, set its name, description and the profile picture (`public/icons/icon-512.png`).
- The bot handles `/start <token>` for logins, phone sharing, confirm/deny buttons, and sends notifications.
- Users who never started the bot cannot receive messages; that is expected.
- Notification health: **Admin → Sozlamalar** shows queued, sent, skipped and failed counts.

## Daily work

- **Moderation:** Admin → Bizneslar / Aksiyalar (queues first), Sharhlar for reviews, Murojaatlar for the contact form.
- **Payments:** a business requests a plan in its Tarif page and pays by the instructions; confirm it in Admin → Tariflar. Admins can also grant 1–3 free months or a plan directly on a business.
- **Audit:** Admin → Audit lists every decision with reasons.

## Demo mode

Development always shows the demo catalogue; production shows it only with `DEMO_SEED=true`. Demo businesses and deals carry `is_demo = 1`, never have phone numbers, and are hidden again as soon as the flag is off. Ended demo deals restart automatically every few minutes.

## Backups and recovery

- D1 Time Travel keeps point-in-time history (30 days on paid plans, 7 on free); restore with `wrangler d1 time-travel restore`.
- Export before risky changes: `wrangler d1 export <database> --output backup.sql`.
- Redemption, moderation and audit rows are append-only in practice; restore them before derived data.

## Photos

Uploaded photos live in D1 (`media`) and are served from `/media/:id` with a one-year cache. If storage grows past a few GB, move `modules/media/service.ts` to R2; the URLs stay the same.

Demo photos are static files in `public/photos` with authors in `lib/stock-photos.ts` (see `docs/RASMLAR.md`):

- `npm run photos:fetch` downloads the curated Commons picks again (needs access to `commons.wikimedia.org` and `upload.wikimedia.org`); `npm run photos:fetch -- --search "Chust doppi"` lists candidates.
- `npm run photos:import -- <folder>` adds photos named by visual (`plov.jpg`, `osh-2.jpg`), with authors from `mualliflar.csv` (`fayl,muallif,litsenziya,manba_url`). Licences with NC or ND are refused.
