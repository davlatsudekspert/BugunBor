# Operations

## Deploy

1. Run the gates: `npm run lint && npm run typecheck && npm test && npm run build`.
2. Deploy the Worker with its D1 binding `DB` (the Sites plugin reads `.openai/hosting.json`).
3. Set the variables from `.env.example` (at least `APP_URL`, `HASH_SECRET`, the three `TELEGRAM_*` values and `ADMIN_PHONES`).
4. Open the site once: the first request connects the Telegram bot (webhook) by itself, and again whenever the token, secret or `APP_URL` changes. Then log in with an admin phone through Telegram. **Admin → Sozlamalar** shows which bot the token belongs to and any connection error; **Webhook’ni o‘rnatish** reconnects by hand.
5. In **Admin → Tariflar** check prices, the free-period length (1–3 months) and the payment instructions shown to businesses.
6. In **Admin → Sozlamalar** fill in the company details (legal name, STIR, address, phone): the footer, the contact page and the public offer (`/oferta`) show them.
7. Online payments stay off until `PAYMENTS_ENABLED=true`; the keys go in as Worker secrets. Step by step: `docs/TOLOV.md`.

Deploying straight to Cloudflare Workers Builds: set the build variables `D1_DATABASE_ID` and `D1_DATABASE_NAME`, so the built `wrangler.json` binds the real database (without them it carries a placeholder id).

Migrations run automatically on the first request after a deploy. They are additive and idempotent; never edit a migration that has shipped — add a new one.

## Telegram bot

- Create the bot with @BotFather, set its name, description and the profile picture (`public/icons/icon-512.png`).
- The bot handles `/start <token>` for logins, phone sharing, confirm/deny buttons, and sends notifications.
- Users who never started the bot cannot receive messages; that is expected.
- Notification health: **Admin → Sozlamalar** shows queued, sent, skipped and failed counts.

## Daily work

- **Moderation is automatic.** Every new business and deal is checked at once. Clean ones are approved on the spot; the system moderator (`usr_system`) signs the decision.
  Anything suspicious stays in the queue with its reasons, and moderators and admins get a Telegram message. The reasons include a link, a forbidden topic, alcohol or tobacco, a card number, an odd price, a duplicate name, or an earlier rejection.
  The system never rejects; people do.
  Obscene, link or card-number reviews are hidden automatically and can be shown again.
  Each switch is in Admin → Sozlamalar → Avtomatik moderatsiya. Admin → Bizneslar / Aksiyalar → «Avto tasdiqlangan» lists last week's automatic approvals for a second look.
- **Free launch:** tariffs are hidden for now (Admin → Tariflar), so no price shows anywhere and every verified business stays on air with the gifted plan (Premium by default).
  «Tariflarni ochish» gives every verified, unpaid business a fresh free period from that day before prices apply.
- **Payments:** Payme and Click switch a plan on by themselves once the payment system confirms (see `docs/TOLOV.md`).
  A manual request (bank transfer) still works: admins get a Telegram message, then confirm it in Admin → Tariflar.
  Admins can also grant 1–3 free months or a plan directly on a business.
- **Audit:** Admin → Audit lists every decision with reasons.

## Demo mode

Development always shows the demo catalogue. Production shows it with `DEMO_SEED=true`, or when an admin presses «Namuna bizneslarni ko‘rsatish» in Admin → Sozlamalar (no redeploy; «yashirish» hides it again). Demo businesses and deals carry `is_demo = 1`, never have phone numbers, and are hidden again as soon as the flag is off. Ended demo deals restart automatically every few minutes, and a new catalogue version (`DEMO_CATALOG_VERSION`) loads the same way, with no need to switch demo mode off and on.

## Search engines

1. Add the site in Google Search Console (URL prefix `https://bugunbor.uz/`, method «HTML tag») and in Yandex Webmaster (method «Мета-тег»).
2. Paste each code, or the whole `<meta …>` tag, in **Admin → Sozlamalar → Qidiruv tizimlari** and save. The home page carries them within two minutes; then press Verify / Проверить there. An empty field takes a code away.
3. Submit `https://bugunbor.uz/sitemap.xml` in both (Google: Sitemaps; Yandex: Индексирование → Файлы Sitemap). It lists the static pages, the categories, the cities that have a real deal (`/discover?city=…`), live real deals and public businesses, each in Uzbek (the plain address) and in Russian (`/ru/…`) with `hreflang` links between them; samples are never in it.

Every public page names its address in the language it is shown in (`canonical`) and both versions (`hreflang` uz, ru, x-default = Uzbek). Russian pages live at `/ru/…` (`lib/locale-paths.ts`, `worker.ts`), so search engines index both languages; the language cookie alone never changes what a search engine sees.

## Speed

- Guests' public pages (home, deals, categories, business pages, FAQ, offer) are kept in the edge cache for 30 seconds (`worker.ts`, `lib/page-cache.ts`); the `x-page-cache: HIT|MISS` header shows it. Signed-in visitors, responses that set cookies and client navigation payloads are never cached.
- Smart Placement (`placement` in `vite.config.ts`) runs the Worker next to D1 when that is faster, because pages make several queries in a row.
- Releasing expired codes on list pages and restarting demo deals run after the response is sent. Photos and icons are cached for a day in browsers (`public/_headers`).

## Backups and recovery

- D1 Time Travel keeps point-in-time history (30 days on paid plans, 7 on free); restore with `wrangler d1 time-travel restore`.
- Export before risky changes: `wrangler d1 export <database> --output backup.sql`.
- Redemption, moderation and audit rows are append-only in practice; restore them before derived data.

## Photos

Uploaded photos live in D1 (`media`) and are served from `/media/:id` with a one-year cache. If storage grows past a few GB, move `modules/media/service.ts` to R2; the URLs stay the same.

### Automatic photo check

Every public photo (deal photo, logo, cover), from the site and the app alike, is looked at by an AI service before it is kept (`modules/media/check.ts`): **Claude** (`ANTHROPIC_API_KEY`) first, and **Google Gemini** (`GEMINI_API_KEY`) when Claude has no key or does not answer (an error such as no credit or a limit, a 4xx/5xx or no answer in time). Both get the same rules and give the same verdict. A photo with military, political or religious content (even in the background), nudity, alcohol, tobacco or drugs, gambling, hate symbols or a personal document is refused with the reason in the uploader's language, nothing of it is stored, and **Admin → Audit** gets a `media.refused` line. Profile photos are not sent: only their owner sees them.

The check never blocks an upload. When neither service answers, the photo is kept as `UNCHECKED`, queued (`media.check_after`, `media.check_attempts`) and checked again by the background job (`modules/media/recheck.ts`, a few photos a minute, next try after 15 min, 1 h, 3 h, 6 h, 12 h, then daily). A photo that passes later is marked `PASSED`; one that breaks the rules is taken off its deal or profile and deleted, with a `media.refused` audit line, and the business's owners and managers get a Telegram message. The admins get one Telegram message a day while the check is down, with each service's error.

**Admin → Sozlamalar → Avtomatik moderatsiya** shows which service is connected, the last successful check (time and service), the last error and how many photos wait for a new check.

To switch it on, add BugunBor's **own** keys as Worker secrets — never another project's key:

1. Gemini: aistudio.google.com → Get API key, in a Google Cloud project **with billing on** (on the paid tier Google does not use the photos to improve its models; set a budget alert in Cloud Billing). Claude: console.anthropic.com → create a key for BugunBor and set a monthly spend limit there.
2. Cloudflare → Workers & Pages → the BugunBor Worker → Settings → Variables and Secrets → Add → type **Secret**, name `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`), paste the key → Deploy. (Or `npx wrangler secret put GEMINI_API_KEY`.)
3. **Admin → Sozlamalar** shows the service as «ulangan».

Optional: `PHOTO_CHECK_MODEL` picks another Claude model (default `claude-sonnet-5`), `GEMINI_MODEL` another Gemini model (default `gemini-flash-latest`, Google's name for its newest Flash model). Without any key photos are kept as before, marked `UNCHECKED` and not queued; moderators can still remove a business's or deal's photos.

Demo photos are static files in `public/photos` with authors in `lib/stock-photos.ts` (see `docs/RASMLAR.md`):

- `npm run photos:fetch` downloads the curated Commons picks again (needs access to `commons.wikimedia.org` and `upload.wikimedia.org`); `npm run photos:fetch -- --search "Chust doppi"` lists candidates.
- `npm run photos:import -- <folder>` adds photos named by visual (`plov.jpg`, `osh-2.jpg`), with authors from `mualliflar.csv` (`fayl,muallif,litsenziya,manba_url`). Licences with NC or ND are refused.
