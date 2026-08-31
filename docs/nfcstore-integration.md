# NFCStore integration contract

NFCStore and BugunBor are separate security domains with separate databases and credentials. The integration never shares passwords or internal database IDs.

## OIDC

- Authorization Code + PKCE for user/browser linking.
- Expected claims: `sub`/`external_user_id`, `external_business_id`, `verified`, `membership`, `card_status`.
- Access tokens are scoped, short-lived, rotatable and revocable. Refresh tokens are encrypted or stored as keyed hashes, never logged.

## Webhooks

Sender signs `timestamp + "." + raw_body` using HMAC-SHA256. Receiver checks constant-time signature equality, a five-minute timestamp window, allowed event type and unique `(provider, external_event_id)`. The unique event is stored before side effects. Retries are safe; terminal failures go to a dead-letter queue with sanitized diagnostics.

## NFC redirect

`/n/{token}` hashes a high-entropy public token, records an anonymized tap, resolves `NFCDeviceMapping`, and redirects to the mapped public business profile with `source=nfc`. Unknown, revoked or temporarily unavailable mappings use a safe branded fallback and never reveal internal IDs.

## Bonus synchronization

Welcome tier evaluation selects the highest eligible tier by default. Wallet credit uses the integration event ID as an idempotency key. Stacking is disabled unless an administrator changes the central bonus rule.
