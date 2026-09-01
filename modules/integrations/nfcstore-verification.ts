/**
 * Confirms a NFCStore Business profile actually belongs to the BugunBor business claiming it
 * — never trust a client-sent `verified=true`. NFCStore doesn't expose a server-to-server
 * verification API today, so the only implementation below fails closed (matches
 * modules/providers/development.ts's developmentPaymentProvider: never simulate success).
 * That's why `POST /api/v1/business/nfcstore` (see its own comment) always lands a fresh
 * connection in PENDING_VERIFICATION rather than VERIFIED — an admin has to confirm it by
 * hand via `POST /api/v1/admin/businesses/:id/nfcstore-decision` until a real API exists.
 *
 * To wire a real API later: implement this interface against NFCStore's actual endpoint
 * (fixed, allowlisted base URL from an env var — never a URL built from user input, to keep
 * this SSRF-proof by construction) and swap `nfcStoreVerificationService` below for it. No
 * other file needs to change: every caller only ever sees this interface.
 */
export type NfcStoreVerificationOutcome =
  | { ok: true; externalId: string }
  | { ok: false; reason: 'NOT_FOUND' | 'SUSPENDED' | 'SERVICE_UNAVAILABLE' };

export interface NfcStoreVerificationService {
  /** `normalizedUrl` comes from lib/nfcstore.ts's validateNfcStoreProfileUrl() — already
   * confirmed to be a well-formed nfcstore.uz link, never raw user input. */
  verifyBusinessProfile(normalizedUrl: string): Promise<NfcStoreVerificationOutcome>;
}

export const nfcStoreVerificationService: NfcStoreVerificationService = {
  async verifyBusinessProfile() {
    return { ok: false, reason: 'SERVICE_UNAVAILABLE' };
  },
};
