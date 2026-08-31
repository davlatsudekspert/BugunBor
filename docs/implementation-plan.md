# Phased implementation plan

## Phase 0 — foundation (this checkpoint)

- Product specification, route map, architecture, entity map and design system.
- Modular boundaries and provider interfaces.
- Threat model, tenant rules and transaction invariants.

## Phase 1 — marketplace core (started in this checkpoint)

- Public discovery, search, categories, business and deal pages; PRODUCT/SERVICE deal types with a shared discount/countdown model.
- OTP/session contracts, business onboarding, deal creation (`POST /api/v1/deals`), and self-service editing under the lifecycle edit-lock policy.
- Distance-radius location search (`lat`/`lng`/`radiusKm`) alongside city search; region/district reference data deferred (see product-spec.md).
- The Auto Scheduler (`POST /api/v1/admin/scheduler/tick`): SCHEDULED→ACTIVE, ACTIVE→EXPIRED, ACTIVE→SOLD_OUT (PRODUCT quantity or SERVICE slots) with no business action required.
- Moderation decisions and auditable state transitions.
- Atomic, idempotent claim and staff validation for both PRODUCT quantity and SERVICE slots.
- Admin overview and critical tests.

Exit gate: lint, strict typecheck, unit/integration tests and production build all pass.

## Phase 2 — growth and monetization

- A `region`/`district` reference-data taxonomy with a Viloyat → Shahar/Tuman → Mahalla picker, replacing the free-text `city` field.
- Auto Skidka: time-tiered pricing with a business-set floor price.
- The "🔔 Boshlanganda menga ayt" Telegram reminder, and a Telegram Mini App shell over the same API.
- Immutable wallet ledger, bonus expiration and configurable 15% usage cap.
- Referral qualification, holds, abuse flags, reversal.
- Plan entitlement engine (FREE/PRO/BOOST), subscriptions, boosts, notifications and analytics.

## Phase 3 — NFCStore boundary

- OIDC discovery/client, external mappings, scoped tokens and rotation.
- HMAC-signed idempotent webhooks with replay protection and dead letters.
- Non-guessable `/n/{token}` redirect, NFC attribution and highest-tier welcome bonus.
- The idle-slot AI recommender (concept §37): surfaces a suggested Auto Skidka window from a business's historically slow hours; the business still confirms before it publishes.

## Phase 4 — production hardening

- PostgreSQL/Prisma and Redis/BullMQ production adapters, S3 upload pipeline.
- Rate-limit tuning, CSRF/security headers, abuse slowdown, backup/restore drills.
- Full accessibility/performance pass, OpenAPI completion, Playwright suite and CI/CD.

## Design system

- Colors: coral/orange action `#f55b37`, deep navy `#152a3b`, cream `#fffdf9`, slate neutrals, emerald verification.
- Type: compact, heavy display hierarchy; highly readable system sans body.
- Geometry: 12–24 px radii, strong countdown pills, restrained shadow, no decorative animation dependency.
- Accessibility: WCAG AA targets, 44 px touch controls, keyboard focus rings, status conveyed by icon + text, reduced-motion friendly.
- Responsive: content-first mobile layout with bottom navigation; desktop navigation and 3-column discovery grid.
