# Security checklist

## In place

- [x] Strict TypeScript; every write validated server-side with zod (the same schemas as the forms).
- [x] Same-origin check (Origin / Sec-Fetch-Site) on every state-changing request.
- [x] Sessions: random tokens stored as SHA-256, `HttpOnly; SameSite=Lax; Secure`, 30 days, revoked on logout, block or account deletion.
- [x] Telegram login: one-time token bound to the browser, match code shown on both sides, 10-minute expiry, consumed once; webhook requires the secret header.
- [x] Admins only via `ADMIN_PHONES` on first login or by another admin; demo accounts carry no phone numbers, and demo login is compiled out of production.
- [x] Tenant isolation: every business action checks membership and role grant (OWNER, MANAGER, CASHIER); cashiers only see a masked customer phone.
- [x] Claims are atomic and idempotent; per-customer limit, stock, time window, branch and subscription re-checked inside the insert.
- [x] Codes derived with HMAC and stored hashed; codes of another business are indistinguishable from unknown codes.
- [x] Rate limits on login, claims, code checks, contact form, views and writes (hashed IPs).
- [x] Uploads: size and pixel limits, magic-byte type detection (JPEG, PNG, WebP only — no SVG), re-encoded in the browser, served with `nosniff` and a locked-down CSP; businesses can only attach their own uploads; moderators can take images down.
- [x] Reviews only for redeemed codes, once, within 30 days; names shown as “Aziza K.”; moderators can hide reviews.
- [x] Moderation decisions require reasons and are written to moderation and audit logs.
- [x] Account deletion removes personal data, follows, queued notifications and review comments; redemption history stays anonymous.
- [x] Security headers on every response (HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy with camera limited to the site for QR scanning).
- [x] Private pages are `noindex`; errors shown to users are localized and never leak internals.
- [x] Telegram message text escapes user content.

## Before or soon after launch

- [ ] Set `HASH_SECRET` to a long random value (the default is for development only) and keep it stable.
- [ ] Content-Security-Policy with nonces once the production asset pipeline is final.
- [ ] Cloudflare WAF / Bot Fight rules for the login and claim endpoints.
- [ ] Scheduled D1 backups (Time Travel is on by default; export before risky migrations).
- [ ] External penetration test and an incident runbook.
