# Phased implementation plan

## Phase 0 — foundation (this checkpoint)

- Product specification, route map, architecture, entity map and design system.
- Modular boundaries and provider interfaces.
- Threat model, tenant rules and transaction invariants.

## Phase 1 — marketplace core (started in this checkpoint)

- Public discovery, search, categories, business and deal pages.
- OTP/session contracts, business onboarding, deal draft/submission.
- Moderation decisions and auditable state transitions.
- Atomic, idempotent claim and staff validation.
- Admin overview and critical tests.

Exit gate: lint, strict typecheck, unit/integration tests and production build all pass.

## Phase 2 — growth and monetization

- Immutable wallet ledger, bonus expiration and configurable 15% usage cap.
- Referral qualification, holds, abuse flags, reversal.
- Plan entitlement engine, subscriptions, boosts, notifications and analytics.

## Phase 3 — NFCStore boundary

- OIDC discovery/client, external mappings, scoped tokens and rotation.
- HMAC-signed idempotent webhooks with replay protection and dead letters.
- Non-guessable `/n/{token}` redirect, NFC attribution and highest-tier welcome bonus.

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
