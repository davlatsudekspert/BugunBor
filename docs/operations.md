# Deployment, backup and recovery

## Deployment (Railway)

This app runs as a plain Node.js server (`vinext build` / `vinext start`) against Postgres — no Cloudflare Workers runtime or D1 binding involved. To deploy on Railway from this GitHub repository:

1. **Create the Postgres plugin** in the Railway project (`+ New` → `Database` → `Add PostgreSQL`).
2. **Attach this repo as a service**: `+ New` → `GitHub Repo`, pick this repository and branch. Railway's Nixpacks builder auto-detects the Node project and runs `npm run build` then `npm run start` — `railway.json` in this repo pins that explicitly, plus a health check on `GET /api/v1/openapi.json`.
3. **Set the service's environment variables** (Service → Variables):
   - `DATABASE_URL` — reference the Postgres plugin's connection string: `${{Postgres.DATABASE_URL}}`. `db/runtime.ts` creates the schema and seeds demo data on first boot automatically (idempotent — safe on every restart).
   - `CRON_SECRET` — a random secret string (see below).
   - Any of the provider keys in `.env.example` you're ready to wire up; leave the rest unset to keep their adapters fail-closed.
4. **Deploy.** Every push to the connected branch redeploys.

Run lint, strict typecheck, tests and the production build (`npm run lint && npm run typecheck && npm run test && npm run build`) before merging — Railway does not run these for you.

## Auto Scheduler (Railway Cron Job)

Deal status transitions (SCHEDULED→ACTIVE, ACTIVE→EXPIRED, ACTIVE→SOLD_OUT) are driven by `POST /api/v1/admin/scheduler/tick`, not by request-time side effects — see `modules/scheduler/tick.ts`. Nothing calls this on its own; without a scheduler wired up, scheduled and expiring deals will not flip state.

On Railway, add a second service in the same project as a **Cron Job**: `+ New` → `Empty Service`, set its schedule (e.g. `* * * * *` for once a minute — Railway's minimum granularity), and its command to a `curl` call against the app service's public URL:

```
curl -fsS -X POST https://<your-app>.up.railway.app/api/v1/admin/scheduler/tick \
  -H "x-bugunbor-cron-secret: $CRON_SECRET"
```

Give that Cron Job service the same `CRON_SECRET` value as the app service (Railway lets you share a variable via reference, `${{app.CRON_SECRET}}`, so it never needs to be typed twice). Outside Railway, any scheduler that can make an HTTPS call on an interval works the same way — a GitHub Actions scheduled workflow, `cron-job.org`, etc.

## Backup

- Postgres: use Railway's built-in Postgres backups, or `pg_dump` on a schedule, before any destructive migration; keep a tested restore runbook.
- Object storage (once wired up): versioning, lifecycle rules and separate metadata backup.
- Redis (once wired up): never the only source of truth for wallet, redemption or webhook state.

## Recovery priorities

1. Preserve immutable wallet/audit/redemption ledgers.
2. Restore identity, businesses, deals and branch mappings.
3. Rebuild caches and analytics from authoritative events.
4. Replay idempotent integration events only after signature and duplicate checks.

Recovery actions require named operators, timestamps and a post-incident audit record.
