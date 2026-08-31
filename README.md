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

## Important deployment note

The runnable Sites checkpoint uses D1 because Workers do not support raw PostgreSQL TCP connections. The requested production target remains PostgreSQL/Prisma, Redis/BullMQ and S3-compatible storage behind the same domain/repository interfaces. See `docs/architecture.md` and `docs/implementation-plan.md`.

Never treat development adapters as successful production payments, SMS delivery, or NFCStore verification.
"# BugunBor" 
