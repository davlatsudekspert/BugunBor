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
  AUTH & DEALS & REDEEM & WALLET --> REPO[Repository interfaces]
  REPO --> DB[(PostgreSQL + Prisma target)]
  REPO --> D1[(D1 Sites adapter)]
  DEALS & REDEEM & WALLET --> JOBS[Redis + BullMQ target]
  INTEGRATION --> EXT[NFCStore OAuth/OIDC + signed webhooks]
  API --> PROVIDERS[SMS · email · maps · payments · storage · push]
```

The target production architecture in the supplied brief is PostgreSQL/Prisma, Redis/BullMQ and S3-compatible storage. The runnable Sites checkpoint uses a D1 repository adapter because the hosting runtime does not provide raw TCP connections. Domain rules and API contracts remain storage-agnostic so the PostgreSQL adapter can replace it without moving business logic into UI components. R2 is reserved for uploaded media once the upload phase is enabled.

## Module boundaries

- `app/`: public and protected route surfaces only.
- `modules/auth`: phone normalization, OTP policy, sessions, RBAC.
- `modules/deals`: lifecycle transitions and public queries.
- `modules/redemptions`: atomic claim/validation and events.
- `modules/moderation`: reasoned decisions and audit capture.
- `modules/providers`: interfaces and explicit development adapters.
- `db/`: Sites persistence adapter and migrations.
- `packages/database/prisma`: target PostgreSQL schema checkpoint.

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
