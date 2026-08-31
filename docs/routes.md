# Route map

## Public

| Route | Purpose |
| --- | --- |
| `/` | Homepage and active nearby deals |
| `/discover` | Search, filters, cursor pagination, map/list switch |
| `/categories/[slug]` | Category discovery |
| `/businesses/[slug]` | Public business profile and active deals |
| `/deals/[slug]` | Deal terms, branch, countdown and claim |
| `/map` | Geographic discovery |
| `/pricing`, `/how-it-works`, `/nfcstore`, `/about`, `/faq`, `/contact` | Acquisition and trust content |
| `/terms`, `/privacy` | Legal content |
| `/rules` | Platform rules: accurate pricing, no false claims, enforcement consequences (implemented) |
| `/login`, `/verify` | Authentication entry and OTP verification |
| `/n/[token]` | NFC tap recording and safe redirect |

## Customer

`/account`, `/account/saved`, `/account/following`, `/account/redemptions`, `/account/wallet`, `/account/referrals`, `/account/notifications`, `/account/security`, `/account/settings`.

## Business

Implemented: `/business/onboarding` (requires accepting `/rules`), `/business/dashboard` (own business + recent deals), `/business/deals/new` (create a deal, gated to `VERIFIED` businesses and a `deal.write` role, blocks a discount that isn't actually lower than the original price).

Still only planned: `/business/deals` (full list/edit view — dashboard currently shows the 8 most recent), `/business/branches`, `/business/team`, `/business/profile`, `/business/media`, `/business/verification`, `/business/billing`, `/business/boosts`, `/business/nfcstore`, `/business/redemptions`, `/business/analytics`, `/business/audit`.

## Administration

Implemented today, behind its own phone + Telegram OTP session (see `README.md` → Admin panel): `/admin/login`, `/admin` (dashboard), `/admin/deals` (moderation queue), `/admin/businesses` (verify/suspend, plan assignment, Pro-gated sponsored placement), `/admin/plans` (pricing), `/admin/announcements` (post to the Telegram channel), `/admin/team` (SUPER_ADMIN-only account management).

Still only planned: `/admin/users`, `/admin/categories`, `/admin/wallet`, `/admin/referrals`, `/admin/subscriptions`, `/admin/boosts`, `/admin/integrations`, `/admin/webhooks`, `/admin/reports`, `/admin/content`, `/admin/flags`, `/admin/settings`, `/admin/fraud`, `/admin/audit`, `/admin/health`.

## External API

- `GET /api/v1/deals`, `GET /api/v1/deals/:slug`
- `POST /api/v1/deals/:id/redemptions`, `POST /api/v1/redemptions/:id/validate`
- `POST /api/v1/auth/otp/request`, `POST /api/v1/auth/otp/verify`, `DELETE /api/v1/sessions/:id`
- `POST /api/v1/businesses`, `POST /api/v1/business/deals`
- `POST /api/v1/admin/auth/request-otp`, `POST /api/v1/admin/auth/verify-otp`, `POST /api/v1/admin/auth/logout`
- `POST /api/v1/admin/deals/:id/decision`, `POST /api/v1/admin/deals/:id/sponsor`
- `POST /api/v1/admin/businesses/:id/decision`, `POST /api/v1/admin/businesses/:id/plan`
- `POST /api/v1/admin/plans/:id`, `POST /api/v1/admin/announcements`, `POST /api/v1/admin/team`, `POST /api/v1/admin/team/:id`
- `POST /api/v1/integrations/nfcstore/webhooks`, `GET /api/v1/integrations/nfcstore/status`
- `GET /api/v1/openapi.json`

All collection endpoints use cursor pagination. Write endpoints accept `Idempotency-Key`; private endpoints derive subject and tenant from the verified session rather than request JSON.
