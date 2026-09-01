# Security checklist

- [x] Strict TypeScript and server-side Zod validation for implemented writes.
- [x] Same-origin check for state-changing browser requests.
- [x] Tenant authorization modeled as membership + matching business ID + action grant.
- [x] Claim idempotency, per-customer limit, time/state checks and conditional quantity update.
- [x] Plain redemption token is returned once and only its SHA-256 digest plus short hint is stored.
- [x] Moderator decisions require a reason and append moderation/audit records.
- [x] Development payment and NFCStore adapters fail closed in production.
- [x] Security headers, noindex on private screens and sanitized public errors.
- [x] Admin panel (`/admin`) gated by phone + Telegram one-time code: hashed OTP codes and session tokens, per-account rate limiting and attempt lockout, httpOnly session cookie, least-privilege roles (SUPER_ADMIN/MANAGER/ACCOUNTANT) enforced on every page and API route, and a guard against removing the last active SUPER_ADMIN.
- [x] Anti-fraud on business listings: mandatory, server-enforced acceptance of `/rules` before onboarding or posting a deal; a deal can only be posted once its business is `VERIFIED`; a "discount" whose price is not below the original price is rejected outright rather than merely flagged. Sponsored placement is likewise enforced server-side, not just hidden in the UI, to a business's actual active Pro-plan status. Once a deal is live, price can only move down, quantity only up, and the end date only earlier — enforced in `POST /business/deals/:id`, not merely a UI restriction.
- [x] Redemption codes are matched by hash only (`sha256(code) = code_hash`), never compared or logged in the clear; the guarded `UPDATE ... WHERE status = 'CLAIMED'` in `POST /business/redemptions/validate` means two concurrent scans of the same code can't both succeed.
- [x] Customer location never reaches the server or the business: `components/location-provider.tsx` reads the browser's GPS and every distance calculation runs client-side in `lib/geo.ts` — only the visitor's own device ever holds their coordinates.
- [ ] Production distributed rate limiting and abuse slowdown through Redis.
- [ ] Full OTP hashing/attempt lockout and HTTP-only session rotation for the *customer/business* login (`/login`) — still a stub pending the platform's real OTP provider.
- [ ] S3 upload content sniffing, malware scan and image re-encoding.
- [ ] CSP nonce rollout after the production asset pipeline is finalized.
- [ ] External penetration test, secret rotation drill and incident runbook sign-off.
