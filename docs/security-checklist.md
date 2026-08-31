# Security checklist

- [x] Strict TypeScript and server-side Zod validation for implemented writes.
- [x] Same-origin check for state-changing browser requests.
- [x] Tenant authorization modeled as membership + matching business ID + action grant.
- [x] Claim idempotency, per-customer limit, time/state checks and conditional quantity update.
- [x] Plain redemption token is returned once and only its SHA-256 digest plus short hint is stored.
- [x] Moderator decisions require a reason and append moderation/audit records.
- [x] Development payment and NFCStore adapters fail closed in production.
- [x] Security headers, noindex on private screens and sanitized public errors.
- [ ] Production distributed rate limiting and abuse slowdown through Redis.
- [ ] Full OTP hashing/attempt lockout and HTTP-only session rotation.
- [ ] S3 upload content sniffing, malware scan and image re-encoding.
- [ ] CSP nonce rollout after the production asset pipeline is finalized.
- [ ] External penetration test, secret rotation drill and incident runbook sign-off.
