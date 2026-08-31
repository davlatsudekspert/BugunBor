# Deployment, backup and recovery

## Deployment

Run lint, strict typecheck, tests and the production build. Apply reviewed migrations before switching traffic. Provider credentials are environment-managed secrets; never commit them. Promote the same immutable artifact through staging and production.

## Auto Scheduler (Cron Trigger)

Deal status transitions (SCHEDULED→ACTIVE, ACTIVE→EXPIRED, ACTIVE→SOLD_OUT) are driven by `POST /api/v1/admin/scheduler/tick`, not by request-time side effects — see `modules/scheduler/tick.ts`. In production, configure a Cloudflare Cron Trigger (e.g. `* * * * *`, once a minute) that calls this endpoint with an `x-bugunbor-cron-secret` header matching the `CRON_SECRET` Worker secret. Without a Cron Trigger wired up, scheduled and expiring deals will not flip state on their own — call the endpoint manually (as an ADMIN/SUPER_ADMIN session) or wire an external scheduler in the meantime.

## Backup

- PostgreSQL target: daily encrypted full backup plus point-in-time WAL retention; quarterly restore drill.
- D1 Sites checkpoint: platform export before destructive migrations and a tested import runbook.
- Object storage: versioning, lifecycle rules and separate metadata backup.
- Redis: never the only source of truth for wallet, redemption or webhook state.

## Recovery priorities

1. Preserve immutable wallet/audit/redemption ledgers.
2. Restore identity, businesses, deals and branch mappings.
3. Rebuild caches and analytics from authoritative events.
4. Replay idempotent integration events only after signature and duplicate checks.

Recovery actions require named operators, timestamps and a post-incident audit record.
