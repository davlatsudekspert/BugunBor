# BugunBor

BugunBor is an Uzbekistan-focused marketplace for nearby, time-limited offers: **“Bugun bor — ertaga bo‘lmasligi mumkin.”**

This repository is a deployable Phase 0 + Phase 1 checkpoint. It includes a Postgres-backed public marketplace with two listing kinds — PRODUCT (decrementing quantity) and SERVICE (bookable time slots) — distance-radius location search, a lifecycle edit-lock policy that locks a live deal's price/quantity/identity once customers can see it, an Auto Scheduler endpoint that flips deal status on time/inventory alone, deal detail and claim flow, business onboarding and self-service deal creation/editing, reasoned moderation, tenant authorization rules, provider boundaries, OpenAPI, tests, migrations and product/architecture documentation. See `docs/concept-uz.md` for the full original product concept and `docs/product-spec.md` for what is and isn't built yet against it. It does not claim that Wallet, referrals, boosts, region/district reference data, Auto Skidka, Telegram Mini App, real OTP/payment providers, NFCStore SSO/webhooks or the Redis/S3 adapters are complete.

## Run locally

```bash
docker compose up -d postgres   # or point DATABASE_URL at any Postgres 14+
cp .env.example .env.local      # adjust DATABASE_URL if needed
npm install
npm run dev
```

`db/runtime.ts` creates the schema and seeds demo data automatically on first request — no separate migration step. Demo records are marked as development seed data; real integrations remain fail-closed without credentials.

## Quality gates

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Structure

- `app/` — public pages, protected workflows and `/api/v1`.
- `modules/` — auth, catalog, redemption and provider business boundaries.
- `db/runtime.ts` — the Postgres connection, schema/seed bootstrap, and a small D1-shaped query wrapper every call site is written against.
- `docs/` — product specification, architecture, entity model, routes, security and rollout plan.

## Deployment

Deploys to [Railway](https://railway.com) from this GitHub repository as a plain Node.js service — see `docs/operations.md` for the step-by-step (Postgres plugin, environment variables, the Auto Scheduler's Cron Job) and `railway.json` for the build/start/health-check config. The target production architecture in the original brief also names Redis/BullMQ and S3-compatible storage for later phases; see `docs/architecture.md` and `docs/implementation-plan.md`.

Never treat development adapters as successful production payments, SMS delivery, or NFCStore verification.
