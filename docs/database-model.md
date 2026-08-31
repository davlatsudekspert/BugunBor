# Database model

## Core relationship map

```mermaid
erDiagram
  USER ||--o{ SESSION : owns
  USER ||--o{ BUSINESS_MEMBER : joins
  BUSINESS ||--o{ BUSINESS_MEMBER : has
  BUSINESS ||--o{ BRANCH : operates
  BUSINESS ||--o{ DEAL : publishes
  DEAL ||--o{ DEAL_BRANCH : available_at
  BRANCH ||--o{ DEAL_BRANCH : offers
  DEAL ||--o{ REDEMPTION : claimed_as
  USER ||--o{ REDEMPTION : claims
  REDEMPTION ||--o{ REDEMPTION_EVENT : records
  USER ||--|| WALLET : owns
  WALLET ||--o{ WALLET_LEDGER_ENTRY : contains
  PLAN ||--o{ PLAN_ENTITLEMENT : grants
  BUSINESS ||--o{ SUBSCRIPTION : subscribes
  DEAL ||--o{ BOOST : receives
  USER ||--o{ REFERRAL : invites
  REFERRAL ||--o{ REFERRAL_REWARD : produces
  BUSINESS ||--o{ EXTERNAL_ACCOUNT_MAPPING : maps
  BUSINESS ||--o{ NFC_DEVICE_MAPPING : maps
  NFC_DEVICE_MAPPING ||--o{ NFC_TAP_EVENT : records
```

## Normalized entity inventory

- Identity: `User`, `Account`, `Session`, `VerificationToken`.
- Tenancy: `Business`, `BusinessMember`, `Branch`, `WorkingHours`, `VerificationRequest`.
- Marketplace: `Category`, `Deal`, `DealBranch`, `DealMedia`, `Favorite`, `Follow`.
- Fulfilment: `Redemption`, `RedemptionEvent`.
- Incentives: `Wallet`, `WalletLedgerEntry`, `BonusRule`, `Referral`, `ReferralReward`.
- Commercial: `Plan`, `PlanEntitlement`, `Subscription`, `Boost`.
- Integrations: `ExternalAccountMapping`, `NFCDeviceMapping`, `NFCTapEvent`, `IntegrationEvent`, `WebhookEvent`.
- Trust/operations: `Notification`, `Report`, `ModerationAction`, `FeatureFlag`, `AuditLog`.

## Critical constraints

- Normalized phone and non-null email values are unique.
- Business slug, category slug, deal `(business_id, slug)` and NFC public token hash are unique.
- Business membership is unique on `(business_id, user_id)`.
- One favorite exists per `(user_id, deal_id)` and one follow per `(user_id, business_id)`.
- A redemption is unique by idempotency key and by `(deal_id, user_id, claim_sequence)`; its code hash is unique.
- Ledger idempotency key is globally unique. Amount is non-zero and stored in integer BB units.
- Webhook uniqueness is `(provider, external_event_id)`; raw secrets/tokens never persist.
- Soft deletion uses `deleted_at`; financial, audit and redemption event rows are retained/append-only.

## Transaction invariants

Redemption claim locks or conditionally updates the deal row, checks state/time/customer limit, decrements remaining quantity, inserts redemption + event, and emits an outbox notification in one transaction. Wallet commands insert a ledger entry and derived balance snapshot atomically, reject negative results, and verify the ledger aggregate. Webhook processing inserts the unique event before side effects, making retries safe.
