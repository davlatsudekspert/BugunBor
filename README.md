# BugunBor

**Bugun bor — ertaga bo‘lmasligi mumkin.** BugunBor is a marketplace for nearby, time- and quantity-limited deals in Uzbekistan. Businesses post deals; customers claim a one-time code and pay on site; staff check the code at the counter.

- Uzbek (Latin) and Russian, all 17 regional centres, 8 categories
- Login with the Telegram bot (no passwords, no SMS)
- Deals go through moderation; businesses get a free period, then a Start / Biznes / Premium plan
- Customers follow businesses and get new deals, code reminders and thank-you messages in Telegram, and rate real visits
- Businesses upload their own photos, manage branches and staff roles, and validate codes by typing or scanning the QR
- Installable web app (manifest, icons, offline page) — the base for the Android and iOS apps

The complete product and business rules are in **[docs/TIZIM.md](docs/TIZIM.md)** (Uzbek).

## Stack

| Layer | Choice |
| --- | --- |
| Framework | [vinext](https://github.com/cloudflare/vinext) (Next.js App Router on Vite), React 19 |
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite), versioned migrations applied on start (`db/migrations.ts`) |
| Styling | Tailwind CSS 4, shadcn/ui primitives, Inter |
| Validation | zod 4 (shared by forms and API) |
| Tests | vitest with a `node:sqlite` D1 shim (`test/d1.ts`) |

## Run locally

```bash
npm install
npm run dev          # then open the URL it prints
```

Development runs in demo mode: the database is seeded with fictional businesses in every city and category, and `/login` shows one-click demo accounts (customer, owner, cashier, moderator, admin). `POST /api/v1/dev/reset` restores the demo state.

## Configuration

Set these as Worker environment variables / secrets (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Public origin, e.g. `https://bugunbor.uz` (links in Telegram messages, QR codes) |
| `HASH_SECRET` | Long random secret; derives redemption codes and hashes IPs. **Set it before launch and never change it** — changing it invalidates active codes |
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather |
| `TELEGRAM_BOT_USERNAME` | Bot username without `@` |
| `TELEGRAM_WEBHOOK_SECRET` | Random string; Telegram sends it with every webhook call |
| `ADMIN_PHONES` | Comma-separated phones that become admins on first Telegram login, e.g. `+998901234567` |
| `DEMO_SEED` | `true` to show the demo catalogue in production (off by default) |

After deploying, open the site once: the bot connects itself (Telegram webhook) on the first request. **Admin → Sozlamalar** shows its state. For Cloudflare Workers Builds also set the build variables `D1_DATABASE_ID` and `D1_DATABASE_NAME`.

## Quality gates

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Structure

- `app/` — pages (customer site, `/business` workspace, `/admin` panel) and route handlers (`/api/v1`, `/media`, `/r/[code]`)
- `components/` — UI by area: `site`, `deals`, `account`, `business`, `admin`
- `modules/` — domain logic: `auth`, `catalog`, `deals`, `redemptions`, `businesses`, `billing`, `moderation`, `media`, `engagement`, `notifications`, `telegram`, `admin`
- `db/` — migrations, D1 client, demo seed and the generated demo catalogue
- `lib/` — i18n dictionaries, time (Tashkent), formatting, search, cities
- `docs/` — system specification (TIZIM.md), architecture, routes, data model, security, operations

## Documentation

- [docs/TIZIM.md](docs/TIZIM.md) — product rules, roles, flows, tariffs (Uzbek)
- [docs/architecture.md](docs/architecture.md) — how the pieces fit
- [docs/routes.md](docs/routes.md) — pages and API
- [docs/database-model.md](docs/database-model.md) — tables
- [docs/security-checklist.md](docs/security-checklist.md) — security controls
- [docs/operations.md](docs/operations.md) — deploy, configure, operate
- [docs/RASMLAR.md](docs/RASMLAR.md) — demo photos: sources, adding new ones (Uzbek)
