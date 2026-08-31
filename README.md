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
- `modules/` — auth, catalog, redemption and provider business boundaries.
- `db/` + `drizzle/` — Sites D1 adapter and migration.
- `docs/` — product specification, architecture, entity model, routes, security and rollout plan.

## Important deployment note

The runnable Sites checkpoint uses D1 because Workers do not support raw PostgreSQL TCP connections. The requested production target remains PostgreSQL/Prisma, Redis/BullMQ and S3-compatible storage behind the same domain/repository interfaces. See `docs/architecture.md` and `docs/implementation-plan.md`.

Never treat development adapters as successful production payments, SMS delivery, or NFCStore verification.
"# BugunBor" 
