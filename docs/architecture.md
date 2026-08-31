# BugunBor architecture

## Shape

BugunBor starts as a modular monolith. UI, HTTP contracts, domain services, jobs, and provider adapters are separate modules but deploy together until scale or team boundaries justify extraction.

```mermaid
flowchart LR
  WEB[Next-compatible App Router UI] --> API[/api/v1 REST]
  API --> AUTH[Auth + RBAC]
  API --> DEALS[Deals + moderation]
  API --> REDEEM[Redemption service]
  API --> WALLET[Wallet ledger]
  API --> INTEGRATION[NFCStore boundary]
  AUTH & DEALS & REDEEM & WALLET --> REPO[Query wrapper — db/runtime.ts]
  REPO --> DB[(Postgres, on Railway)]
  DEALS & REDEEM & WALLET --> JOBS[Redis + BullMQ target]
  INTEGRATION --> EXT[NFCStore OAuth/OIDC + signed webhooks]
  API --> PROVIDERS[SMS · email · maps · payments · storage · push]
```

Every module talks to Postgres through a small D1-shaped wrapper (`getDb().prepare(sql).bind(...).first()/.all()/.run()`, plus `.batch()` for transactions) in `db/runtime.ts`, over the `pg` driver. Domain rules and API contracts stay storage-agnostic in the sense that they never touch `pg` directly — only that wrapper — but this checkpoint targets Postgres specifically rather than staying engine-agnostic; earlier iterations of this checkpoint ran on Cloudflare D1 and named Prisma as a future target, neither of which reflects what's implemented now. Redis/BullMQ and S3-compatible object storage remain later-phase targets — see `docs/implementation-plan.md`.

## Module boundaries

- `app/`: public and protected route surfaces only.
- `modules/auth`: phone normalization, OTP policy, sessions, RBAC.
- `modules/deals`: lifecycle edit-lock policy (`modules/deals/policy.ts`).
- `modules/redemptions`: atomic claim/validation policy and events.
- `modules/scheduler`: the Auto Scheduler's status-transition logic.
- `modules/geo`: distance/bounding-box math for location search.
- `modules/providers`: interfaces and explicit development adapters.
- `db/runtime.ts`: the Postgres connection, schema/seed bootstrap, and the query wrapper every module above is written against.

## Security model

- Authentication establishes a user; authorization is checked server-side for every read/write.
- Business tenant access requires a `business_members(user_id, business_id)` match. Client-supplied business IDs are never sufficient.
- OTP values, session tokens and redemption codes are stored only as keyed hashes; comparisons are constant-time where applicable.
- State-changing browser requests require same-origin/CSRF validation; APIs additionally enforce content type, rate limits and idempotency keys.
- Wallet, referral, webhook and redemption commands accept unique idempotency keys and execute inside database transactions.
- Audit records are append-only and store actor, target, action, before/after JSON, reason and request metadata.
- Public identifiers are UUID/ULID-style opaque IDs or human slugs; internal numeric IDs never appear in NFC URLs.

## NFCStore trust boundary

NFCStore has a separate database and never shares passwords. BugunBor maps external subjects through `ExternalAccountMapping`, accepts scoped OAuth/OIDC tokens, verifies HMAC signatures over timestamp + raw payload, rejects replay outside the configured window, records every integration event, and processes webhooks idempotently with retry/dead-letter semantics.

## Time and localization

All persisted timestamps are UTC ISO values. User-facing formatting uses `Asia/Tashkent` unless a supported locale/time-zone preference overrides it. Uzbek Latin is the default locale; message keys are structured for Russian and English catalogs.

## Provider safety

Development adapters are explicitly named and refuse to represent a real success in production mode. Payment and NFCStore adapters fail closed when required credentials are absent.
