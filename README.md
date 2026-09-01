# BugunBor

BugunBor is an Uzbekistan-focused marketplace for nearby, time-limited offers: **“Bugun bor — ertaga bo‘lmasligi mumkin.”**

This repository is a deployable Phase 0 + Phase 1 checkpoint. It includes a D1-backed public marketplace, deal detail and claim flow, business onboarding, reasoned moderation, tenant authorization rules, provider boundaries, OpenAPI, tests, migrations and product/architecture documentation. It does not claim that Wallet, referrals, boosts, real OTP/payment providers, NFCStore SSO/webhooks or the final PostgreSQL/Redis adapters are complete.

## Run locally

```bash
npm install
npm run dev
```

The Sites scaffold supplies a project-local D1 binding. Demo records are marked as development seed data; real integrations remain fail-closed without credentials.

## Quality gates

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Structure

- `app/` — public pages, protected workflows and `/api/v1`.
- `app/admin/` — the operator panel (see below).
- `modules/` — auth, catalog, redemption and provider business boundaries.
- `db/` + `drizzle/` — Sites D1 adapter and migration.
- `docs/` — product specification, architecture, entity model, routes, security and rollout plan.

## Admin panel (`/admin`)

A separate operator panel for running the marketplace day to day: moderating
deals, verifying/suspending businesses, and pricing plans. It is deliberately
independent of the customer/business identity system above — sign-in is a
dedicated **phone number + Telegram one-time code** flow, gated by its own
session cookie (`bb_admin_session`, httpOnly, 12h expiry).

Three roles, least-privilege by default (`modules/admin/authorization.ts`):

| Role | Can do |
| --- | --- |
| **Bosh admin** (`SUPER_ADMIN`) | Everything below, plus add/suspend/promote other admin accounts. |
| **Menejer** (`MANAGER`) | Moderate deals, verify/reject/suspend businesses. |
| **Hisobchi** (`ACCOUNTANT`) | Edit plan pricing/features, assign businesses to a plan. |

`MANAGER` also posts to **Reklama va e'lonlar** (`/admin/announcements`) — a
free-text or deal-templated message sent to a Telegram channel via
`TELEGRAM_ANNOUNCE_CHANNEL_ID` (the bot must be an admin of that channel).
Every post, success or failure, is logged to `admin_announcements`.

**Sponsored placement** (`/admin/businesses` → "Qidiruvda ustuvor joylashuv")
lets a manager pin a deal to the top of search — but only for a business on
an **active Pro plan**; the API rejects turning it on otherwise (`deals.is_sponsored`
is already the sort key in `listActiveDeals`). Sponsored deals carry a
visible "Tavsiya etilgan" badge on the public site — sponsorship is never
hidden from customers.

**First-time setup**, so the panel is never left unreachable:

1. Message your bot (from [@BotFather](https://t.me/BotFather)) from the phone
   number that should be the first `SUPER_ADMIN`, then read that chat's id
   from `https://api.telegram.org/bot<token>/getUpdates`.
2. Set `TELEGRAM_BOT_TOKEN`, `ADMIN_BOOTSTRAP_PHONE` and
   `ADMIN_BOOTSTRAP_TELEGRAM_CHAT_ID` (see `.env.example`) before deploying.
   A bootstrap `SUPER_ADMIN` is seeded automatically from these on first boot.
3. Sign in at `/admin/login`. From **Admin jamoa**, add further managers/
   accountants — each gets their own phone + Telegram chat id.

Without `TELEGRAM_BOT_TOKEN` configured, login codes are only ever logged to
the server console in local development (never faked as "delivered" — see
`modules/providers/telegram.ts`), so the panel is fully testable before a
real bot is wired up, and never silently insecure in production.

## Anti-fraud rules for business listings

Every business must accept the platform rules (`/rules`) before onboarding
or posting a deal — enforced server-side, not just a UI hint (`acceptedRules`
must be `"on"` in both `POST /api/v1/businesses` and `POST /api/v1/business/deals`).
A business can only post a deal once it is `VERIFIED`, and the API rejects a
"discount" whose discounted price is not below the original price — a fake
markdown can't be submitted in the first place. Violations found later go
through the existing admin moderation/business-suspension flow (`/admin/deals`,
`/admin/businesses`), each recorded with a reason in `moderation_actions` /
`audit_logs`.

## Deal lifecycle: scheduling, editing, and redemption

**Auto-scheduler.** A deal approved with a future start time goes `SCHEDULED`;
once live it's `ACTIVE`; once its stock or time runs out it's `SOLD_OUT` or
`EXPIRED` — all without a human opening the app. There is no Cloudflare Cron
Trigger for this (vinext's build doesn't expose a supported way to add a
`scheduled()` handler); instead `syncDealLifecycle()` (`db/runtime.ts`) runs
these transitions at the top of every read path that shows deal status
(public listings, business dashboard, admin), so the stored status is always
correct by the time anyone looks — the same guarantee a cron job would give,
without depending on one.

**Editing rules** (`POST /api/v1/business/deals/:id`) mirror `/rules`'
promise to customers: before a deal launches, everything is editable
(price either direction, quantity, dates, copy) — a rejected deal even
resubmits for review automatically on edit. Once live, only price-down,
quantity-up, or ending early are allowed; title, description, category and
the original price lock. `/business/deals/:id/cancel` withdraws a deal that
never launched; `/business/deals/:id/stop` ends a live one immediately.

**Redemption loop.** Claiming a deal (`POST /api/v1/deals/:id/redemptions`)
was previously a dead end — the customer got a code but nothing let a
business actually redeem it. `POST /api/v1/business/redemptions/validate`
(UI: `/business/redemptions`) closes that: staff enters the code the
customer shows on their phone, it's hashed and matched against the stored
`code_hash`, and marked `COMPLETED` exactly once (a concurrent double-scan
of the same code can't both succeed).

**Online booking vs. a busy front counter.** A business that doesn't watch
BugunBor in real time, or sells the same stock walk-in without touching the
app, can end up overselling — a customer arrives with a valid code for
something already gone. Two mitigations, since removing online booking
entirely would defeat the point of the site:
- Once stock is low (≤3 left), the deal page and the claim success message
  both show the branch's phone number with a "call ahead to confirm before
  you go" note (`app/deals/[slug]/page.tsx`, `components/claim-button.tsx`).
- `POST /api/v1/business/deals/:id/adjust-stock` (UI: `/business/redemptions`
  → "Filialda to‘g‘ridan-to‘g‘ri sotildimi?") lets staff mark units sold
  in person, decrementing the *same* `remaining_quantity` the online claim
  flow uses — so an offline sale is reflected online immediately instead of
  silently going stale. Verified live: claiming online after an offline
  sale was recorded correctly continued counting down from the adjusted
  total, not the original one.

**Real distance, not a fabricated number.** `/discover` and the homepage
used to print a distance computed from a hardcoded formula
(`1.2 + index * 1.4`), unrelated to the visitor's actual location.
`components/location-provider.tsx` now asks the browser for real
geolocation once (shared across every distance badge on the page) and
`lib/geo.ts` computes true haversine distance against each branch's stored
coordinates; `/discover` adds a 1/3/5/10/25/50km radius filter and sorts by
that real distance. Until location is granted, no distance is shown at all
— BugunBor never states a number it doesn't actually know.

## AI Yordamchi

A small FAQ assistant (`components/ai-assistant-widget.tsx`) sits on every
public page (hidden on `/admin`). Before the chat opens it asks for a name
and phone number once (stored in `localStorage` so a return visitor isn't
asked again) and saves that as a `support_tickets` row
(`source = 'AI_ASSISTANT'`) so the team can call back even if the visitor's
question isn't in the knowledge base. It then answers common questions —
claiming a deal, whether prices are genuine, joining as a business, Pro
plan, reporting a problem — by keyword-matching a curated Uzbek knowledge
base entirely in the browser: no external API, no cost, no credential to
configure, and it never fabricates an answer outside that knowledge base
(it points to `/contact` instead). Swap in a real LLM backend (e.g. Workers
AI) behind the same UI later if richer answers are needed.

## Mijoz shaxsiy kabineti (customer account & favorites)

`/account` is a signed-in customer's home: profile summary plus a count of
saved deals and past redemptions, redirecting to `/login` when signed out.
`/account/saved` lists every deal the customer has favorited (heart icon on
`/deals/[slug]`, toggled by `POST /api/v1/favorites`) so they can find it
again later even after it scrolls out of `/discover`; `/account/redemptions`
lists every deal they've ever claimed with its current status (claimed,
completed, expired, canceled). The homepage and `/discover` headers show
"Hisobim" instead of "Kirish" once `getServerIdentity()` resolves a real
visitor, same mechanism every other authenticated page in this codebase
already uses — no new session system was introduced.

## Reyting va sharhlar (ratings & reviews)

`/deals/[slug]` shows the business's average star rating and its most recent
reviews. A review can only ever come from a redemption `POST
/api/v1/reviews` confirms belongs to the caller and that staff have already
marked `COMPLETED` via the existing redemption-validation flow — so there is
no way to review a business without a staff-confirmed visit, and
`reviews.redemption_id UNIQUE` caps it at one review per visit. Once
completed and unreviewed, a "Baholash" (rate) prompt appears next to that
redemption on `/account/redemptions`.

## Promokodlar (promo codes)

`/admin/promo-codes` (SUPER_ADMIN or ACCOUNTANT, `admin.promocodes.manage`)
creates a code with a PERCENT or FIXED-amount discount, an optional total
use limit, and an optional expiry, and can toggle one active/inactive.
`ClaimButton` on `/deals/[slug]` exposes an optional "Promokodingiz
bormi?" field; `POST /api/v1/deals/:id/redemptions` validates the code
(exists, active, not expired, under its use limit, not already used by
this customer — `promo_code_redemptions` has a `(promo_code_id, user_id)`
primary key so a code caps at one use per customer regardless of its
total limit) and computes the discounted final price on top of the deal's
own price. Applying the code is deliberately best-effort and happens
*after* the underlying claim already succeeded: a promo-code race or edge
case only means the discount doesn't land, never that a legitimate claim
gets rejected because of it.

## Auto Skidka (progressive discount)

A business creating a deal can opt into "Avto Skidka" — a series of steps,
each entered as "N soat keyin, X% chegirma" ("N hours after the deal
starts, X% off"), plus an optional floor price. `POST
/api/v1/business/deals` turns those into `deal_discount_tiers` rows with
absolute timestamps (tier *i*'s window runs from the deal's start plus its
`afterHours` to the next tier's start, or the deal's own end for the last
one); `db/runtime.ts`'s `syncAutoDiscountTiers()` — already wired into the
same lifecycle sync every deal read triggers — recomputes
`discounted_price_uzs`/`discount_percent` from the deal's `original_price_uzs`
whenever the current time falls inside a tier's window, clamped to
`min_price_uzs` if one was set. No cron or background worker needed: the
price is simply always correct by the time anyone reads it.

## Xizmatlar uchun vaqt-slot bron tizimi (service time-slot booking)

A deal can be listed as a "🗓️ Xizmat" (SERVICE) instead of "📦 Mahsulot"
(PRODUCT) in the same creation form, with a set of specific time slots
(each a start time + capacity) instead of a flat quantity counter.
`/deals/[slug]` shows a slot picker instead of a bare claim button for a
SERVICE deal; `POST /api/v1/deals/:id/redemptions` accepts an optional
`timeSlotId`, pre-checks it (exists on this deal, still has capacity,
hasn't started yet) for a clear error, then decrements
`deal_time_slots.remaining_capacity` atomically right after the
underlying claim succeeds — the same best-effort-after-success pattern as
the promo code above, so a slot race never blocks the claim itself, only
(rarely) the specific time; the customer is told to call and re-confirm
the time in that case, echoing this project's existing "online booking
still benefits from a confirmation call" guidance on every claim.

## Kamera orqali QR skanerlash (camera QR scanning)

A customer's claim success screen now renders their one-time code as a
real scannable QR (`components/redemption-qr.tsx`, via the `qrcode`
package) alongside the plaintext code, and `/business/redemptions`
(`components/qr-scanner.tsx`) gets a "Kamera bilan skanerlash" toggle:
it opens the device camera and decodes a frame using the browser-native
`BarcodeDetector` API where available, falling back to `jsqr` (pure JS,
no WASM) everywhere else — a match auto-fills and submits the same
validation the manual-entry field always used, so nothing about the
actual redemption logic changed, only how the code gets into that field.
Denied camera permission or no camera hardware falls back cleanly to the
manual field, which was never removed.

Fixing this surfaced a real, unrelated bug worth calling out on its own:
`next.config.ts`'s security headers (`Permissions-Policy` among them)
were never reaching the homepage at all — its `/:path*` rule doesn't match
the bare root path in this project's framework, so `/` alone shipped with
none of X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
Permissions-Policy, COOP or HSTS while every other route correctly got
them. Fixed by giving `/` its own explicit rule alongside `/:path*`. This
also means `Permissions-Policy` genuinely blocked the camera outright
until fixed — `camera=()` denied it everywhere; it's now `camera=(self)`.

**Sandbox verification note**: this environment has no real camera
hardware. What was verified live: the security-header fix (curl against
`wrangler dev`, before and after, on both `/` and a nested route); the QR
*generation* → decode round-trip (`qrcode` encodes a real redemption code,
`jsqr` decodes the resulting PNG's raw pixels back to the exact same
string); and, via Playwright with Chromium's fake-camera-device flag, that
`getUserMedia` now actually succeeds and the scanner's `<video>` element
renders a live stream once the header change ships (it failed before the
fix, confirming the header was the actual blocker) — and that the claim
success screen renders a real, correctly-encoded QR canvas next to the
code. What could not be verified here is decoding an actual QR pattern
through that live camera feed end-to-end, since faking a specific video
frame content (rather than Chromium's built-in test pattern) needs
hardware or a custom video file this sandbox doesn't have — the decode
algorithm itself is confirmed correct against a real QR image separately.

## Telegram Mini App

`/telegram` loads the real Telegram Web App JS SDK
(`https://telegram.org/js/telegram-web-app.js`), reads
`Telegram.WebApp.initData`, and posts it to `POST
/api/v1/telegram/webapp/auth`. That endpoint verifies `initData`'s
HMAC-SHA256 signature against `TELEGRAM_BOT_TOKEN` exactly as Telegram's
own docs specify (`secret_key = HMAC_SHA256(key="WebAppData",
message=bot_token)`, then `hash = HEX(HMAC_SHA256(key=secret_key,
message=data_check_string))`), also rejecting anything older than 24
hours so a leaked `initData` string can't be replayed indefinitely.
`modules/telegram/webapp.ts` holds that check with unit tests
(`webapp.test.ts`) covering a genuinely-signed payload, a tampered field,
the right signature under the wrong bot token, and stale `auth_date`.

A verified visitor gets a `bb_tg_session` httpOnly cookie
(`modules/telegram/session.ts`, same hashed-token pattern as the admin
panel's own sessions) mapped to an ordinary `users` row
(`tg_<telegramUserId>`). `modules/auth/identity.ts` now falls back to
that cookie whenever no platform-supplied identity header is present —
so a Telegram Mini App visitor is just another `CUSTOMER`
`RequestIdentity`, and every existing customer feature (favorites,
claiming a deal, promo codes, reviews, `/account`) works for them with
*zero* changes to those routes. Opened outside Telegram (no `initData`
present), `/telegram` shows an "open in Telegram" prompt with a bot deep
link instead of erroring.

**Sandbox verification note**: this environment has neither a real
registered Telegram bot nor a Telegram client. What was fully verified:
the HMAC algorithm itself (unit tests against synthetic-but-correctly-signed
data); the complete HTTP path with a real (test) bot token configured —
a genuinely-signed `initData` string round-tripped through `POST
/api/v1/telegram/webapp/auth` end to end, produced a working session
cookie, and that cookie then authenticated a real `POST /api/v1/favorites`
call and rendered the right name on `/account` with no other code path
touched; tampered and missing `initData` both correctly rejected (401 /
422) through the same real endpoint. What could not be verified here:
registering an actual bot with @BotFather, opening `/telegram` from a
real Telegram client, and the Mini App chrome Telegram itself renders
around the page (its native back button, `MainButton`, haptics) — none of
which this backend-side verification depends on, but none of which can be
exercised without a real bot and a real Telegram client either.

## Mijoz/biznes uchun kirish (phone + Telegram OTP login)

`/login` is a real sign-in flow now, not the static explainer it used to
be: enter a phone number, get a 6-digit code over Telegram, and a
`__Host-bugunbor_session` httpOnly cookie is set on success —
`modules/auth/identity.ts` recognizes it the same way it already
recognizes a Telegram Mini App session or the platform's own header, so
every existing customer/business feature (favorites, claiming a deal,
business onboarding, posting a deal, reviews, `/account`) works through
it with no further changes.

The one wrinkle phone-based Telegram delivery has that admin login
(which already works this way, manually, via Team management) doesn't:
the Bot API can only message a chat that has already messaged the bot
first, and a customer obviously hasn't done that yet on their very
first visit. So a first-time phone gets back a bare bot link
(`https://t.me/<bot>`, no payload) instead of a code; opening it and
pressing Start makes the bot reply with a native "share phone number"
button (a `request_contact` reply-keyboard button — Telegram always
reports the *tapping user's own* number for these, never an arbitrary
contact, so it can be trusted outright). Tapping it sends a `contact`
message to `POST /api/v1/telegram/bot/webhook`, which pairs that
Telegram chat with the shared phone number directly — no token, no
copy-pasted command, and (unlike a deep link's `?start=` payload,
which Telegram only auto-fills the very first time a chat is ever
opened) it works identically whether this is the visitor's first
message to the bot or their hundredth. From then on, that phone's
logins send a code directly, same as admin's. The webhook itself is
gated by `TELEGRAM_WEBHOOK_SECRET` (compared with `timingSafeEqual`),
a value nobody ever sets by hand — `deploy-cloudflare.yml` generates a
fresh one on every deploy, sets it as the Worker secret, and registers
the identical value with Telegram's own `setWebhook` in the same step,
so the two can never drift out of sync. One Telegram account can't be
linked to a second phone number — `linkPhoneFromContact()` rejects it
and the bot replies saying so, rather than silently letting someone
else's phone start receiving your codes.

Everything else follows the admin login's proven shape exactly: hashed
OTP codes and session tokens (`user_otp_codes`, `sessions` — never
stored or logged in the clear), per-phone rate limiting (3 codes / 10
minutes) and attempt lockout (5 wrong guesses), a 30-day session. See
`modules/auth/otp.ts`.

**Verified live** (unlike the Mini App and camera-QR features above,
this one needed no real Telegram client or hardware to check
end-to-end — only simulated webhook calls, which are just ordinary
authenticated POSTs): requested a code for a fresh phone and got back
a real bot link; posted a fake Telegram Update simulating "pressed
Start" and confirmed the bot's response carries the `request_contact`
keyboard button; posted a fake Update carrying a `contact` payload and
confirmed the phone linked (and that a wrong `secret_token` is
rejected with 401 either way); requested a code again for the same
phone and this time got a real 6-digit code (logged to the console in
local dev, exactly like admin OTP does with no bot token); verified it
and got a working session cookie; used that cookie with zero other
changes to favorite a real deal and render the right phone number and
count on `/account`; confirmed a wrong code 401s, that the
3-per-10-minutes rate limit actually trips on the 4th request, that
`/api/v1/auth/logout` revokes the session (a subsequent request with
the same cookie correctly 401s), and that sharing a contact whose
phone is already linked to a different Telegram chat is rejected with
the right message instead of hijacking it.

## Murojaatlar (support tickets)

`POST /api/v1/support/tickets` is the single intake point for both the
`/contact` page form and the AI Yordamchi lead-capture gate above — it
requires a name, a valid `+998` phone number, a subject and a message, and
stores them in the `support_tickets` table. `/admin/support` (gated to the
`admin.support.manage` action, held by `SUPER_ADMIN` and `MANAGER`) lists
every ticket — open ones first — with a `tel:` link and buttons to mark a
ticket "Ko‘rib chiqilmoqda" or "Hal qilindi" via
`POST /api/v1/admin/support/:id`.

## Viloyat/tuman (manual region picker)

Alongside the existing GPS-based "near me" distance sort, `/discover`, the
homepage hero search and business onboarding now also offer a manual
region/district picker (`lib/uzbekistan-regions.ts` — all 14 Uzbekistan
regions with their real districts/cities, no database table needed) via
the `useRegionDistrict` hook, for the very common case of a visitor
searching a city they aren't physically standing in, or a browser without
location permission. `businesses` and `branches` gained a `region` column
(backfilled to `'Toshkent shahri'` for all pre-existing `city = 'Toshkent'`
rows so no seed/demo data disappeared from search); `listActiveDeals`
defaults to the visitor's selected region when no specific district is
chosen, and to a specific district's `city` match when one is.

## Important deployment note

The runnable Sites checkpoint uses D1 because Workers do not support raw PostgreSQL TCP connections. The requested production target remains PostgreSQL/Prisma, Redis/BullMQ and S3-compatible storage behind the same domain/repository interfaces. See `docs/architecture.md` and `docs/implementation-plan.md`.

Never treat development adapters as successful production payments, SMS delivery, or NFCStore verification.
"# BugunBor" 
