// Shared NFCStore.uz link validation — the one place this is decided, so it's never
// re-implemented (and never drifts) across the customer profile field, the business profile
// field, and the server-side re-check on every write. If NFCStore ever adds a subdomain or a
// different canonical host, change it here only.
const NFCSTORE_CANONICAL_HOSTS = ['nfcstore.uz'];
const MAX_URL_LENGTH = 300;

export type NfcStoreUrlValidation = { ok: true; normalizedUrl: string } | { ok: false; reason: string };

function isCanonicalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return NFCSTORE_CANONICAL_HOSTS.some((canonical) => host === canonical || host.endsWith(`.${canonical}`));
}

/**
 * Accepts only a real `https://nfcstore.uz/...` link (or an allowed subdomain) — rejects a
 * malformed URL, any other scheme (`javascript:`, `data:`, plain `http:`, …), credentials
 * embedded in the URL, and any host that merely *contains* "nfcstore.uz" as a substring
 * (e.g. `nfcstore.uz.evil.com` or `evil.com/nfcstore.uz`) rather than actually being it.
 * Returns a normalized form (lowercased host, no query/hash, no trailing slash) so the same
 * profile can't be stored as two different-looking strings — load-bearing for the "one
 * NFCStore Business profile per BugunBor business" uniqueness check.
 */
export function validateNfcStoreProfileUrl(input: string): NfcStoreUrlValidation {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: 'Havolani kiriting.' };
  if (trimmed.length > MAX_URL_LENGTH) return { ok: false, reason: 'Havola juda uzun.' };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'Havola formati noto‘g‘ri.' };
  }

  if (url.protocol !== 'https:') return { ok: false, reason: 'Havola https:// bilan boshlanishi kerak.' };
  if (url.username || url.password) return { ok: false, reason: 'Havola formati noto‘g‘ri.' };
  if (!isCanonicalHost(url.hostname)) return { ok: false, reason: 'Faqat nfcstore.uz havolasi qabul qilinadi.' };

  const normalized = `https://${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, '')}`;
  return { ok: true, normalizedUrl: normalized || `https://${url.hostname.toLowerCase()}` };
}

/** A business's `nfcstore_status`, in plain Uzbek — never show the raw enum value to a
 * business owner or a public visitor (see business-nfcstore-panel.tsx and admin/business-actions.tsx). */
export const NFCSTORE_STATUS_LABELS: Record<string, string> = {
  NOT_CONNECTED: 'NFCStore ulanmagan',
  PENDING_VERIFICATION: 'Tekshirilmoqda',
  VERIFIED: 'NFCStore tasdiqlangan',
  VERIFICATION_FAILED: 'Tasdiqlanmadi',
  DISCONNECTED: 'NFCStore uzilgan',
  SUSPENDED: 'To‘xtatilgan',
};

export const NFCSTORE_STATUS_STYLES: Record<string, string> = {
  NOT_CONNECTED: 'bg-slate-100 text-slate-600',
  PENDING_VERIFICATION: 'bg-amber-50 text-amber-700',
  VERIFIED: 'bg-emerald-50 text-emerald-700',
  VERIFICATION_FAILED: 'bg-red-50 text-red-700',
  DISCONNECTED: 'bg-slate-100 text-slate-600',
  SUSPENDED: 'bg-red-50 text-red-700',
};
