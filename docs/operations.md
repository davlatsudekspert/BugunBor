# Deployment, backup and recovery

## Deployment

Run lint, strict typecheck, tests and the production build. Apply reviewed migrations before switching traffic. Provider credentials are environment-managed secrets; never commit them. Promote the same immutable artifact through staging and production.

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
