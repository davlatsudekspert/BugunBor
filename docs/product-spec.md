# BugunBor product specification

See `docs/concept-uz.md` for the full original Uzbek-language product concept.
This document is the English-language working spec — it tracks what this
checkpoint actually implements against that concept, phase by phase.

## Product promise

BugunBor helps people in Uzbekistan discover and safely claim nearby, time-limited offers. The core promise is **“Bugun bor — ertaga bo‘lmasligi mumkin.”** The formula is: **location × proximity × discount × limited quantity × deadline.** The marketplace balances urgency with verifiable terms, clear quantities, and auditable redemption.

## Two listing kinds

Every deal is either a **PRODUCT** (a physical item with an exact, decrementing quantity — "Sotuvda: 7 dona") or a **SERVICE** (a business's idle capacity sold as bookable time slots — "Bo‘sh joy: 3 ta"). The two share the same discount/countdown/claim mechanics but track availability differently: a PRODUCT's `remaining_quantity` decrements on every claim; a SERVICE deal instead owns a set of `service_slots`, each with its own `remaining_capacity`, and a claim reserves one specific slot. In MVP, only verified businesses may publish either kind — no unmoderated peer-to-peer listings.

## Users and jobs

- Customer: find an active, relevant offer nearby and claim it before it expires.
- Business owner/staff: turn unused capacity or limited stock into incremental revenue without overselling.
- Moderator: verify businesses and offers against documented policy, with a mandatory reason for every decision.
- Administrator: configure plans and incentives, resolve abuse, and audit sensitive activity.
- NFC visitor: reach the mapped business and its active offers from a non-guessable NFC token.

## Release checkpoint

This repository is a Phase 0 + Phase 1 vertical checkpoint, not a claim that every later module is finished. It contains the public marketplace experience, route and data contracts, tenant-aware authorization rules, moderation and redemption domain logic, plus deployment-compatible persistence. Wallet, referrals, boosts, NFC SSO/webhooks, background scheduling, complete provider integrations, and full operational hardening remain explicitly staged in later phases.

## Phase 1 acceptance criteria

1. A visitor can search/browse seeded offers by city, category, PRODUCT/SERVICE type, or a distance radius around a point, and open a deal detail page.
2. A customer claim is accepted only for ACTIVE deals within the time window and available quantity (PRODUCT) or an open, upcoming slot (SERVICE).
3. Claim creation is idempotent and duplicate validation is rejected.
4. Quantity (or the claimed slot's capacity) is decremented in the same transaction as redemption creation.
5. Business data access requires both an allowed role and matching `business_id` membership.
6. Deal submission creates a PENDING_REVIEW state and an audit event; a business can create, edit, stop early, or delete its own deals subject to the lifecycle edit-lock policy below.
7. Moderator decisions require a reason and create before/after audit records.
8. Private routes are marked noindex and server authorization is the source of truth.
9. A recurring scheduler tick flips SCHEDULED → ACTIVE, ACTIVE → EXPIRED, and ACTIVE → SOLD_OUT purely from time and inventory, with no business action required.

## Deal lifecycle and the edit-lock policy

`DRAFT → PENDING_REVIEW → SCHEDULED → ACTIVE → {SOLD_OUT | EXPIRED | STOPPED}`, with `REJECTED` and `ARCHIVED` as terminal outcomes off the moderation and delete paths respectively. Before a deal goes ACTIVE (i.e. while DRAFT/PENDING_REVIEW/SCHEDULED), every field is freely editable and the deal can be deleted outright. Once ACTIVE, the contract with the customer locks in: a business may lower the price further, raise a PRODUCT's quantity, or end the deal early (STOPPED) — but may never raise the price, shrink quantity, move the start time, swap the images/title/category/attributes, or extend the end time. This is enforced server-side by `modules/deals/policy.ts` (`evaluateDealEditPolicy`, `canDeleteDeal`, `canStopDeal`), not just in the UI. See `docs/concept-uz.md` §10–11 for the original rationale.

## Location and distance

Businesses store branch coordinates (`latitude_e6`/`longitude_e6`); the public API accepts `lat`/`lng`/`radiusKm` and returns matching deals sorted nearest-first, computed with `modules/geo/distance.ts` (haversine, with a SQL bounding-box pre-filter). The `/discover` page offers the 1/3/5/10/25/50 km presets from §3 of the concept plus a "Mening joylashuvim" (browser geolocation) button. **Not yet built:** an admin-managed `region`/`district` reference table with a Viloyat → Shahar/Tuman → Mahalla picker — city stays a free-text field for this checkpoint, and "butun tuman/viloyat" is approximated by the existing city filter rather than a real administrative-boundary lookup.

## Non-goals for this checkpoint

- Real payment capture, real SMS delivery, or real NFCStore verification without credentials.
- Cross-database joins or shared credentials with NFCStore.
- Production claims based on demo seed identities.
- A `region`/`district` reference-data taxonomy and its picker UI (§3) — distance-radius search ships instead.
- Auto Skidka time-tiered pricing (§13), the "🔔 boshlanganda ayt" reminder (§18), a Telegram Mini App shell (§19–20), FREE/PRO/BOOST plan enforcement and online payment (§29–30), and the AI idle-slot recommender (§37) — all explicitly staged for later phases in `docs/concept-uz.md` and `docs/implementation-plan.md`.

## Success metrics

- Discovery-to-detail click rate.
- Detail-to-claim conversion rate.
- Successful validation rate and duplicate/rejected validation rate.
- Median time to first business offer and moderation turnaround.
- Redemptions, views, and NFC-sourced sessions by business and branch.
