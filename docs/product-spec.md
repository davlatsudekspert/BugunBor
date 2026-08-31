# BugunBor product specification

## Product promise

BugunBor helps people in Uzbekistan discover and safely claim nearby, time-limited offers. The core promise is **“Bugun bor — ertaga bo‘lmasligi mumkin.”** The marketplace balances urgency with verifiable terms, clear quantities, and auditable redemption.

## Users and jobs

- Customer: find an active, relevant offer nearby and claim it before it expires.
- Business owner/staff: turn unused capacity or limited stock into incremental revenue without overselling.
- Moderator: verify businesses and offers against documented policy, with a mandatory reason for every decision.
- Administrator: configure plans and incentives, resolve abuse, and audit sensitive activity.
- NFC visitor: reach the mapped business and its active offers from a non-guessable NFC token.

## Release checkpoint

This repository is a Phase 0 + Phase 1 vertical checkpoint, not a claim that every later module is finished. It contains the public marketplace experience, route and data contracts, tenant-aware authorization rules, moderation and redemption domain logic, plus deployment-compatible persistence. Wallet, referrals, boosts, NFC SSO/webhooks, background scheduling, complete provider integrations, and full operational hardening remain explicitly staged in later phases.

## Phase 1 acceptance criteria

1. A visitor can search/browse seeded offers by city and open a deal detail page.
2. A customer claim is accepted only for ACTIVE deals within the time window and available quantity.
3. Claim creation is idempotent and duplicate validation is rejected.
4. Quantity is decremented in the same transaction as redemption creation.
5. Business data access requires both an allowed role and matching `business_id` membership.
6. Deal submission creates a PENDING_REVIEW state and an audit event.
7. Moderator decisions require a reason and create before/after audit records.
8. Private routes are marked noindex and server authorization is the source of truth.

## Non-goals for this checkpoint

- Real payment capture, real SMS delivery, or real NFCStore verification without credentials.
- Cross-database joins or shared credentials with NFCStore.
- Production claims based on demo seed identities.

## Success metrics

- Discovery-to-detail click rate.
- Detail-to-claim conversion rate.
- Successful validation rate and duplicate/rejected validation rate.
- Median time to first business offer and moderation turnaround.
- Redemptions, views, and NFC-sourced sessions by business and branch.
