# Route map

## Public

| Route                                                                  | Purpose                                             |
| ---------------------------------------------------------------------- | --------------------------------------------------- |
| `/`                                                                    | Homepage and active nearby deals                    |
| `/discover`                                                            | Search, filters, cursor pagination, map/list switch |
| `/categories/[slug]`                                                   | Category discovery                                  |
| `/businesses/[slug]`                                                   | Public business profile and active deals            |
| `/deals/[slug]`                                                        | Deal terms, branch, countdown and claim             |
| `/map`                                                                 | Geographic discovery                                |
| `/pricing`, `/how-it-works`, `/nfcstore`, `/about`, `/faq`, `/contact` | Acquisition and trust content                       |
| `/terms`, `/privacy`                                                   | Legal content                                       |
| `/login`, `/verify`                                                    | Authentication entry and OTP verification           |
| `/n/[token]`                                                           | NFC tap recording and safe redirect                 |

## Customer

`/account`, `/account/saved`, `/account/following`, `/account/redemptions`, `/account/wallet`, `/account/referrals`, `/account/notifications`, `/account/security`, `/account/settings`.

## Business

`/business/onboarding`, `/business/dashboard`, `/business/deals`, `/business/deals/new`, `/business/branches`, `/business/team`, `/business/profile`, `/business/media`, `/business/verification`, `/business/billing`, `/business/boosts`, `/business/nfcstore`, `/business/redemptions`, `/business/analytics`, `/business/audit`.

## Administration

`/admin`, `/admin/users`, `/admin/businesses`, `/admin/verifications`, `/admin/deals`, `/admin/categories`, `/admin/wallet`, `/admin/referrals`, `/admin/plans`, `/admin/subscriptions`, `/admin/boosts`, `/admin/integrations`, `/admin/webhooks`, `/admin/reports`, `/admin/content`, `/admin/flags`, `/admin/settings`, `/admin/fraud`, `/admin/audit`, `/admin/health`.

## External API

- `GET /api/v1/deals` — supports `city`, `q`, `type` (PRODUCT/SERVICE), `category`, and `lat`/`lng`/`radiusKm` distance search
- `GET /api/v1/deals/:slug`
- `POST /api/v1/deals` — create a deal (PRODUCT with `totalQuantity`, or SERVICE with `slots`); always lands PENDING_REVIEW
- `PATCH /api/v1/deals/:id` — edit a deal, enforced by the lifecycle edit-lock policy (`modules/deals/policy.ts`)
- `DELETE /api/v1/deals/:id` — delete a deal that has not gone ACTIVE yet
- `POST /api/v1/deals/:id/stop` — end an ACTIVE deal early
- `POST /api/v1/deals/:id/redemptions` — claim a PRODUCT unit, or reserve a SERVICE `slotId`; `POST /api/v1/redemptions/:id/validate` (planned — see below)
- `POST /api/v1/admin/scheduler/tick` — drives the Auto Scheduler (SCHEDULED→ACTIVE, ACTIVE→EXPIRED/SOLD_OUT); call from a Railway Cron Job or ADMIN session
- `POST /api/v1/auth/otp/request`, `POST /api/v1/auth/otp/verify`, `DELETE /api/v1/sessions/:id` (planned)
- `POST /api/v1/businesses`, `POST /api/v1/businesses/:id/deals` (superseded by `POST /api/v1/deals` above)
- `POST /api/v1/moderation/deals/:id/decision`
- `POST /api/v1/integrations/nfcstore/webhooks`, `GET /api/v1/integrations/nfcstore/status` (planned)
- `GET /api/v1/openapi.json`

All collection endpoints use cursor pagination. Write endpoints accept `Idempotency-Key`; private endpoints derive subject and tenant from the verified session rather than request JSON.
