import { toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';
import { DomainError } from '@/modules/errors';

// Sign in with Apple for the iOS app (App Store guideline 4.8 asks for it
// next to Telegram). The app sends Apple's identity token; it is checked
// against Apple's published keys and names the person by Apple's stable id
// (`sub`) only — no email is kept. When the Sign in with Apple key is set
// (APPLE_SIWA_*), the one-time authorization code is exchanged for a refresh
// token, kept encrypted, so deleting the account can revoke it as Apple
// requires (guideline 5.1.1(v)).

export const APPLE_ISSUER = 'https://appleid.apple.com';
export const APPLE_BUNDLE_ID = 'uz.bugunbor.app';

export type AppleKey = { teamId: string; keyId: string; privateKey: string };
type Jwk = JsonWebKey & { kid: string; alg?: string };

const decoder = new TextDecoder();
const encoder = new TextEncoder();

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

let keysCache: { at: number; keys: Jwk[] } | null = null;

async function appleKeys(fetcher: typeof fetch, now: number, refresh = false) {
  if (!refresh && keysCache && now - keysCache.at < 6 * 60 * 60_000) return keysCache.keys;
  const response = await fetcher(`${APPLE_ISSUER}/auth/keys`);
  if (!response.ok) throw new DomainError('APPLE_TOKEN_INVALID');
  const keys = ((await response.json()) as { keys?: Jwk[] }).keys ?? [];
  keysCache = { at: now, keys };
  return keys;
}

/** Test hook: forget Apple's keys between tests. */
export function forgetAppleKeys() {
  keysCache = null;
}

/** Checks the identity token's signature and claims; returns Apple's stable id for the person. */
export async function verifyAppleIdentityToken(token: string, options: { audience?: string; now?: Date; fetcher?: typeof fetch } = {}) {
  const fail = () => new DomainError('APPLE_TOKEN_INVALID');
  const parts = token.split('.');
  if (parts.length !== 3) throw fail();
  let header: { kid?: string; alg?: string };
  let claims: { iss?: string; aud?: string | string[]; exp?: number; sub?: string };
  try {
    header = JSON.parse(decoder.decode(base64UrlToBytes(parts[0])));
    claims = JSON.parse(decoder.decode(base64UrlToBytes(parts[1])));
  } catch {
    throw fail();
  }
  if (header.alg !== 'RS256' || !header.kid) throw fail();
  const fetcher = options.fetcher ?? fetch;
  const now = (options.now ?? new Date()).getTime();
  // A key Apple has just rotated in is fetched again once.
  let jwk = (await appleKeys(fetcher, now)).find((key) => key.kid === header.kid);
  jwk ??= (await appleKeys(fetcher, now, true)).find((key) => key.kid === header.kid);
  if (!jwk) throw fail();
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64UrlToBytes(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`));
  const audience = options.audience ?? APPLE_BUNDLE_ID;
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!valid || claims.iss !== APPLE_ISSUER || !audiences.includes(audience) || !claims.exp || claims.exp * 1000 <= now || !claims.sub) throw fail();
  return { sub: claims.sub };
}

/** The ES256 client secret Apple's token endpoints ask for (valid 5 minutes). */
async function clientSecret(appleKey: AppleKey, now: Date) {
  const pem = appleKey.privateKey.replaceAll('\\n', '\n');
  const body = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const iat = Math.floor(now.getTime() / 1000);
  const segment = (value: object) => bytesToBase64Url(encoder.encode(JSON.stringify(value)));
  const unsigned = `${segment({ alg: 'ES256', kid: appleKey.keyId })}.${segment({ iss: appleKey.teamId, iat, exp: iat + 300, aud: APPLE_ISSUER, sub: APPLE_BUNDLE_ID })}`;
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(unsigned)));
  return `${unsigned}.${bytesToBase64Url(signature)}`;
}

async function tokenCall(path: string, appleKey: AppleKey, fields: Record<string, string>, fetcher: typeof fetch, now: Date) {
  const body = new URLSearchParams({ client_id: APPLE_BUNDLE_ID, client_secret: await clientSecret(appleKey, now), ...fields });
  return fetcher(`${APPLE_ISSUER}/auth/${path}`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
}

/** The refresh token for a fresh authorization code, or null when Apple does not give one. */
export async function exchangeAppleCode(code: string, appleKey: AppleKey, fetcher: typeof fetch = fetch, now = new Date()) {
  const response = await tokenCall('token', appleKey, { code, grant_type: 'authorization_code' }, fetcher, now);
  if (!response.ok) return null;
  const data = (await response.json().catch(() => null)) as { refresh_token?: unknown } | null;
  return typeof data?.refresh_token === 'string' ? data.refresh_token : null;
}

/** Tells Apple the person left: the app's access to their Apple ID ends. */
export async function revokeAppleToken(refreshToken: string, appleKey: AppleKey, fetcher: typeof fetch = fetch, now = new Date()) {
  const response = await tokenCall('revoke', appleKey, { token: refreshToken, token_type_hint: 'refresh_token' }, fetcher, now);
  return response.ok;
}

async function aesKey(secret: string) {
  const raw = await crypto.subtle.digest('SHA-256', encoder.encode(`apple-refresh:${secret}`));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function sealRefreshToken(token: string, userId: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(userId) }, await aesKey(secret), encoder.encode(token));
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(sealed))}`;
}

export async function openRefreshToken(value: string, userId: string, secret: string) {
  try {
    const [iv, data] = value.split('.');
    const opened = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64UrlToBytes(iv), additionalData: encoder.encode(userId) }, await aesKey(secret), base64UrlToBytes(data));
    return decoder.decode(opened);
  } catch {
    return null;
  }
}

/** The account for an Apple id: found, or created with the name Apple gave on the first sign-in. */
export async function upsertAppleUser(
  db: D1Database,
  input: { sub: string; displayName: string | null; locale: string; privacyVersion: string },
  now = new Date(),
) {
  const nowDb = toDbTime(now);
  const existing = await db.prepare(`SELECT id, status FROM users WHERE apple_sub = ?1`).bind(input.sub).first<{ id: string; status: string }>();
  if (existing) {
    if (existing.status !== 'ACTIVE') throw new DomainError('ACCOUNT_BLOCKED');
    await db.prepare(`UPDATE users SET last_login_at = ?2, updated_at = ?2 WHERE id = ?1`).bind(existing.id, nowDb).run();
    return { id: existing.id, created: false };
  }
  const id = `usr_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;
  await db.batch([
    db.prepare(`INSERT INTO users(id, role, display_name, locale, status, apple_sub, privacy_accepted_at, privacy_version, last_login_at, created_at, updated_at)
      VALUES (?1, 'CUSTOMER', ?2, ?3, 'ACTIVE', ?4, ?5, ?6, ?5, ?5, ?5)`)
      .bind(id, input.displayName?.trim().slice(0, 80) || 'BugunBor', input.locale, input.sub, nowDb, input.privacyVersion),
    auditStatement(db, { actorUserId: id, action: 'user.registered', targetType: 'User', targetId: id, after: { role: 'CUSTOMER', via: 'apple' } }, nowDb),
  ]);
  return { id, created: true };
}
