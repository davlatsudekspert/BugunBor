# Route map

## Public

| Route | Purpose |
| --- | --- |
| `/` | Homepage and active nearby deals (real per-deal distance once location is granted — see below) |
| `/discover` | Search, viloyat/tuman picker (manual, all 14 regions with real districts — no GPS required), GPS-based "near me" sort and a 1/3/5/10/25/50km radius filter (implemented; map/list switch and cursor pagination still planned) |
| `/categories/[slug]` | Category discovery |
| `/businesses/[slug]` | Public business profile and active deals |
| `/deals/[slug]` | Deal terms, branch, countdown and claim |
| `/map` | Geographic discovery |
| `/pricing`, `/how-it-works`, `/nfcstore`, `/about`, `/faq`, `/contact` | Acquisition and trust content |
| `/terms`, `/privacy` | Legal content |
| `/rules` | Platform rules: accurate pricing, no false claims, enforcement consequences (implemented) |
| `/login` | Phone + Telegram OTP sign-in (implemented — see `README.md` → "Mijoz/biznes uchun kirish"). A first-time phone is walked through linking a Telegram chat via a bot deep link before its first code can be sent; no separate `/verify` page — code entry is a step within `/login` itself. |
| `/n/[token]` | NFC tap recording and safe redirect |
| `/telegram` | Telegram Mini App entry point — verifies `Telegram.WebApp.initData`, mints a session, then redirects into the app; shown a "open in Telegram" prompt instead if loaded outside Telegram |

## Customer

Implemented: `/account` (profile summary + counts, redirects to `/login` if signed out), `/account/saved` (favorited deals — a heart toggle on `/deals/[slug]` adds/removes here), `/account/redemptions` (every deal ever claimed, with its status: claimed / completed / expired / canceled).

Still only planned: `/account/following`, `/account/wallet`, `/account/referrals`, `/account/notifications`, `/account/security`, `/account/settings`.

## Business

Implemented: `/business/onboarding` (requires accepting `/rules`), `/business/dashboard` (own business + recent deals), `/business/deals` (full list — edit, cancel a not-yet-launched deal, or stop a live one), `/business/deals/new` (create a deal, gated to `VERIFIED` businesses and a `deal.write` role, blocks a discount that isn't actually lower than the original price — also where a PRODUCT/SERVICE toggle, Auto Skidka discount tiers, and SERVICE time slots are set up, see `README.md`), `/business/redemptions` (staff enters a customer's code to redeem it — the counterpart to the claim flow, gated to a `redemption.validate` role — plus a panel to record units sold in person so the online stock count stays accurate).

Still only planned: `/business/branches`, `/business/team`, `/business/profile`, `/business/media`, `/business/verification`, `/business/billing`, `/business/boosts`, `/business/nfcstore`, `/business/analytics`, `/business/audit`.

## Administration

Implemented today, behind its own phone + Telegram OTP session (see `README.md` → Admin panel): `/admin/login`, `/admin` (dashboard), `/admin/deals` (moderation queue), `/admin/businesses` (verify/suspend, plan assignment, Pro-gated sponsored placement), `/admin/plans` (pricing), `/admin/announcements` (post to the Telegram channel), `/admin/team` (SUPER_ADMIN-only account management), `/admin/support` (Murojaatlar — every "Bog‘lanish" form and AI Yordamchi lead lands here as a ticket with name + phone, gated to `admin.support.manage`), `/admin/promo-codes` (create a PERCENT/FIXED code with an optional use-limit and expiry, toggle one on/off, gated to `admin.promocodes.manage`).

Still only planned: `/admin/users`, `/admin/categories`, `/admin/wallet`, `/admin/referrals`, `/admin/subscriptions`, `/admin/boosts`, `/admin/integrations`, `/admin/webhooks`, `/admin/reports`, `/admin/content`, `/admin/flags`, `/admin/settings`, `/admin/fraud`, `/admin/audit`, `/admin/health`.

## External API

- `GET /api/v1/deals`, `GET /api/v1/deals/:slug`
- `POST /api/v1/deals/:id/redemptions` (optional `promoCode` in the body applies a promo code's discount on top of the deal price, optional `timeSlotId` books a specific slot on a SERVICE deal — both best-effort: a promo-code or time-slot edge case never blocks the underlying claim), `POST /api/v1/redemptions/:id/validate`
- `POST /api/v1/auth/otp/request` (returns `NEEDS_TELEGRAM_LINK` + a bot deep link for a phone with no Telegram chat linked yet, otherwise sends a code and returns `SENT`), `POST /api/v1/auth/otp/verify` (sets the `__Host-bugunbor_session` cookie), `POST /api/v1/auth/logout`
- `POST /api/v1/telegram/bot/webhook` (Telegram calls this on every message to the bot; only acts on `/start link_<token>`, pairing that chat with the phone that generated the token — see `POST /api/v1/auth/otp/request` above)
- `POST /api/v1/businesses`, `POST /api/v1/business/deals`
- `POST /api/v1/business/deals/:id` (edit), `POST /api/v1/business/deals/:id/cancel`, `POST /api/v1/business/deals/:id/stop`
- `POST /api/v1/business/redemptions/validate` (staff redeems a customer's code)
- `POST /api/v1/business/deals/:id/adjust-stock` (staff records an in-person sale)
- `POST /api/v1/admin/auth/request-otp`, `POST /api/v1/admin/auth/verify-otp`, `POST /api/v1/admin/auth/logout`
- `POST /api/v1/admin/deals/:id/decision`, `POST /api/v1/admin/deals/:id/sponsor`
- `POST /api/v1/admin/businesses/:id/decision`, `POST /api/v1/admin/businesses/:id/plan`
- `POST /api/v1/admin/plans/:id`, `POST /api/v1/admin/announcements`, `POST /api/v1/admin/team`, `POST /api/v1/admin/team/:id`
- `POST /api/v1/admin/promo-codes` (create), `POST /api/v1/admin/promo-codes/:id` (toggle active), both gated to `admin.promocodes.manage`
- `POST /api/v1/telegram/webapp/auth` (verifies `initData`'s HMAC signature against `TELEGRAM_BOT_TOKEN`, sets an httpOnly `bb_tg_session` cookie the rest of the app recognizes as an ordinary customer identity)
- `POST /api/v1/favorites` (toggles a deal in/out of the signed-in caller's saved list)
- `POST /api/v1/reviews` (rate + optionally comment on a business — only for a redemption the caller owns that staff has already marked COMPLETED, one review per redemption)
- `POST /api/v1/support/tickets` (public — the contact form and the AI Yordamchi lead-capture gate both post here; name + phone required)
- `POST /api/v1/admin/support/:id` (update a ticket's status/resolution note, gated to `admin.support.manage`)
- `POST /api/v1/integrations/nfcstore/webhooks`, `GET /api/v1/integrations/nfcstore/status`
- `GET /api/v1/openapi.json`

All collection endpoints use cursor pagination. Write endpoints accept `Idempotency-Key`; private endpoints derive subject and tenant from the verified session rather than request JSON.
