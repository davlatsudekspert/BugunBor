# Routes

## Customer site

| Path | Purpose |
| --- | --- |
| `/` | Hero, live stats for the selected city, categories, deals ending soon |
| `/discover` | Search, city, category, sort (ending, discount, new, near me) |
| `/categories`, `/categories/[slug]` | Category index and category listing |
| `/deals/[slug]` | Deal page: photo, branches, terms, countdown, claim, follow the business |
| `/businesses/[slug]` | Business page: cover, logo, rating, reviews, deals, branches, follow |
| `/login` | Telegram login (plus demo accounts in development) |
| `/account` | Savings, stats, notification settings, name, language, delete account |
| `/account/codes` | Active codes with QR, history, rating of redeemed visits |
| `/account/saved` | Saved deals and followed businesses |
| `/how-it-works`, `/faq`, `/contact`, `/terms`, `/privacy` | Information pages (the contact page shows the company details) |
| `/oferta` | Public offer for business plans: prices, payment, refunds (`#qaytarish`), company details |
| `/offline` | Shown by the service worker without a connection |
| `/r/[code]` | QR target: opens the staff check page with the code filled in |
| `/lang/[locale]` | Switches language (`uz`, `ru`) and returns |

## Business workspace (`/business`)

`/business` (landing and tariffs), `/business/onboarding`, `/business/dashboard`, `/business/redeem`, `/business/deals`, `/business/deals/new`, `/business/deals/[id]`, `/business/branches`, `/business/team`, `/business/profile`, `/business/billing` (plans; Payme/Click buttons show «Tez kunda» while payments are off), `/business/billing/return/[order]` (back from Payme or Click), `/business/switch/[id]` (choose the active business).
The dashboard shows a «Profilni to‘ldiring» checklist until the profile is complete.

## Admin panel (`/admin`)

Moderators: overview, businesses, deals, reviews, messages, audit. Admins also: billing, users, categories, settings.

## API (`/api/v1`)

All writes require a same-origin request; authenticated routes use the session cookie. Errors are `{ error: { code, message, fields? } }` with a localized message.

| Method and path | Purpose |
| --- | --- |
| `POST /auth/telegram/start`, `GET /auth/telegram/status` | Telegram login device flow |
| `POST /auth/logout` | End the session |
| `POST /auth/dev-login` | Demo login (development only) |
| `POST /telegram/webhook` | Telegram updates (secret header required) |
| `GET /deals` | Public live deals: `city`, `category`, `q`, `sort`, `lat`/`lng`, `limit`, `offset` |
| `POST /deals/{id}/redemptions` | Claim a deal (`Idempotency-Key` header) |
| `POST /deals/{id}/view` | Count a view (rate limited) |
| `POST /redemptions/{id}/cancel` | Customer cancels an active code |
| `PUT`/`DELETE /favorites/{dealId}` | Save or unsave a deal |
| `PUT`/`DELETE /follows/{businessId}` | Follow or unfollow a business |
| `POST /reviews` | Rate a redeemed visit |
| `PATCH /me`, `DELETE /me` | Name and notification settings; delete account |
| `POST /contact` | Contact form |
| `POST /businesses` | Create a business (onboarding) |
| `POST /business/{businessId}` | Workspace actions: profile, deals, branches, team, code check and completion, plan requests |
| `POST /business/{businessId}/media` | Upload a photo (multipart `file`, `kind` = DEAL, LOGO or COVER) |
| `POST /admin` | Moderation and admin actions (including automatic-moderation switches and company details) |
| `POST /payments/payme` | Payme Merchant API (JSON-RPC, Basic auth) |
| `POST /payments/click/prepare`, `POST /payments/click/complete` | Click SHOP API (MD5 signature) |
| `GET /openapi.json` | Machine-readable summary of the public API |
| `POST /dev/reset` | Restore demo data (development only) |

Other handlers: `GET /media/{id}` (uploaded photos), `GET /manifest.webmanifest`, `GET /sitemap.xml`, `GET /robots.txt`.
