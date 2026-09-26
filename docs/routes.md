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
| `/how-it-works`, `/faq`, `/contact`, `/terms` | Information pages (the contact page shows the company details) |
| `/privacy` | Privacy policy in uz/ru/en (`?lang=`), text in `lib/privacy.ts` |
| `/delete-account` | How to delete an account; signed-in visitors can delete right there |
| `/oferta` | Public offer for business plans: prices, payment, refunds (`#qaytarish`), company details |
| `/ilova` | The phone app: APK download with install steps, Google Play, or «Tez kunda» (Admin → Sozlamalar → «Mobil ilova») |
| `/ilova/yuklash` | Download button: redirects to the newest GitHub release APK (`?v=32` for 32-bit phones) while the APK is served |
| `/offline` | Shown by the service worker without a connection |
| `/r/[code]` | QR target: opens the staff check page with the code filled in |
| `/lang/[locale]` | Switches language (`uz`, `ru`) and returns |

## Business workspace (`/business`)

`/business` (landing and tariffs), `/business/onboarding`, `/business/dashboard`, `/business/redeem`, `/business/deals`, `/business/deals/new`, `/business/deals/[id]`, `/business/branches`, `/business/team`, `/business/profile`, `/business/billing` (plans; Payme/Click buttons show «Tez kunda» while payments are off), `/business/billing/return/[order]` (back from Payme or Click), `/business/switch/[id]` (choose the active business).
The dashboard shows a «Profilni to‘ldiring» checklist until the profile is complete.

## Admin panel (`/admin`)

Moderators: overview, businesses, deals, reviews, messages, audit. Admins also: billing, users, categories, settings.

## API (`/api/v1`)

The site authenticates with the session cookie (writes must be same-origin); the mobile app sends `Authorization: Bearer <token>` plus `x-app: bugunbor` and `x-app-build` (and `x-locale`). Errors are `{ error: { code, message, fields? } }` with a localized message; the app maps `code` to its own texts. Response shapes the app relies on are pinned in `contracts/*.json` (checked by `app/api/v1/app-api.test.ts`).

| Method and path | Purpose |
| --- | --- |
| `POST /auth/telegram/start`, `GET /auth/telegram/status` | Telegram login device flow (`consent: true` required). The app sends `client: 'app'`, gets `loginSecret`, polls with `x-login-secret` and receives `token` |
| `POST /auth/review` | Store reviewer sign-in (only when `REVIEW_LOGIN_CODE` is set) |
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
| `GET /config` | App startup: demo and tariff switches, oldest supported build, categories (with `id` for registration), cities, report reasons, deal rules and the pictures a deal without a photo can show |
| `GET /feed` | App home: `forYou` (interests), `nearby` (`lat`/`lng` or `city`), `ending` |
| `GET /deals/{slug}` | Deal page for the app: branches, business, `claimable`, favorite, following, active code |
| `GET /businesses/{slug}` | Business page for the app: branches, deals, reviews, following |
| `GET /me`, `PATCH /me`, `DELETE /me` | Profile (incl. Telegram username), stats, notification switches (incl. `notifyNearby`), locale, interests, blocks, memberships with review `status`; delete account (`closeBusinesses: true` closes businesses only this person owns) |
| `GET /me/redemptions`, `GET /me/favorites`, `GET /me/follows` | My codes (with the code while active), saved deals, followed businesses |
| `PUT /me/interests` | Replace interests (category slugs) |
| `PUT`/`DELETE /me/devices` | Register or remove a push token (FCM) |
| `PUT`/`DELETE /me/blocks/{businessId}` | Block or unblock a business |
| `POST /reports` | Report a deal, business or review (goes to Admin → Shikoyatlar) |
| `POST /contact` | Contact form |
| `POST /businesses` | Create a business (onboarding, site and app); returns `status` after the automatic check |
| `GET /business/{businessId}` | Business profile for a member: status, role and permissions; owners and managers also get today's numbers, the latest codes, setup steps and the branches a deal can run in |
| `POST /business/{businessId}` | Workspace actions: profile, deals, branches, team, code check and completion, plan requests |
| `GET /business/{businessId}/deals` | The business's deals for its team (owners and managers): status, window, prices, stock, bookings, uses and views |
| `GET /business/{businessId}/deals/{dealId}` | One deal as the edit form needs it (times as Tashkent `YYYY-MM-DDTHH:MM`, branch ids, photo) |
| `POST /business/{businessId}/media` | Upload a photo (multipart `file`, `kind` = DEAL, LOGO or COVER) |
| `POST /admin` | Moderation and admin actions (including automatic-moderation switches and company details) |
| `POST /payments/payme` | Payme Merchant API (JSON-RPC, Basic auth) |
| `POST /payments/click/prepare`, `POST /payments/click/complete` | Click SHOP API (MD5 signature) |
| `GET /openapi.json` | Machine-readable summary of the public API |
| `POST /dev/reset` | Restore demo data (development only) |

Other handlers: `GET /media/{id}` (uploaded photos), `GET /manifest.webmanifest`, `GET /sitemap.xml`, `GET /robots.txt`, `GET /.well-known/assetlinks.json` (Android App Links from `ANDROID_CERT_SHA256`).
