import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NOW, marketplace } from '@/test/fixtures';
import { deleteAccount } from './account';
import { exchangeAppleCode, forgetAppleKeys, openRefreshToken, revokeAppleToken, sealRefreshToken, upsertAppleUser, verifyAppleIdentityToken } from './apple';

// Sign in with Apple, with Apple's key and token endpoints played by stubs and
// a test RSA key standing in for Apple's.

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const errorCode = (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string }) => error.code ?? 'UNKNOWN');

async function appleSigner() {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'apple-test', alg: 'RS256', use: 'sig' };
  const sign = async (claims: Record<string, unknown>, kid = 'apple-test') => {
    const unsigned = `${encode({ alg: 'RS256', kid })}.${encode(claims)}`;
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(unsigned));
    return `${unsigned}.${Buffer.from(signature).toString('base64url')}`;
  };
  const fetcher = vi.fn(async () => Response.json({ keys: [jwk] })) as unknown as typeof fetch;
  return { sign, fetcher };
}

const claims = (extra: Record<string, unknown> = {}) => ({
  iss: 'https://appleid.apple.com', aud: 'uz.bugunbor.app', sub: '001234.abcd', exp: Math.floor(NOW.getTime() / 1000) + 600, ...extra,
});

beforeEach(() => forgetAppleKeys());

describe('Sign in with Apple', () => {
  it('accepts a token Apple signed for this app, and nothing else', async () => {
    const { sign, fetcher } = await appleSigner();
    expect(await verifyAppleIdentityToken(await sign(claims()), { now: NOW, fetcher })).toEqual({ sub: '001234.abcd' });
    for (const token of [
      await sign(claims({ aud: 'com.other.app' })),
      await sign(claims({ iss: 'https://evil.example' })),
      await sign(claims({ exp: Math.floor(NOW.getTime() / 1000) - 1 })),
      await sign(claims({ sub: undefined })),
      await sign(claims(), 'unknown-key'),
      `${(await sign(claims())).slice(0, -4)}AAAA`,
      'not-a-token',
    ]) {
      expect(await errorCode(verifyAppleIdentityToken(token, { now: NOW, fetcher }))).toBe('APPLE_TOKEN_INVALID');
    }
  });

  it('keeps one account per Apple id; a deleted account lets go of it', async () => {
    const db = await marketplace();
    const first = await upsertAppleUser(db, { sub: 'apple-1', displayName: 'Dilnoza K', locale: 'uz', privacyVersion: '2026-09-28' }, NOW);
    expect(first.created).toBe(true);
    expect(await db.prepare(`SELECT role, display_name AS name, phone, privacy_version AS privacy FROM users WHERE id = ?1`).bind(first.id).first())
      .toEqual({ role: 'CUSTOMER', name: 'Dilnoza K', phone: null, privacy: '2026-09-28' });
    expect(await upsertAppleUser(db, { sub: 'apple-1', displayName: null, locale: 'uz', privacyVersion: '2026-09-28' }, NOW)).toEqual({ id: first.id, created: false });

    await deleteAccount(db, first.id, NOW);
    const again = await upsertAppleUser(db, { sub: 'apple-1', displayName: null, locale: 'ru', privacyVersion: '2026-09-28' }, NOW);
    expect(again.created).toBe(true);
    expect(again.id).not.toBe(first.id);
    expect(await db.prepare(`SELECT display_name AS name FROM users WHERE id = ?1`).bind(again.id).first()).toEqual({ name: 'BugunBor' });
  });

  it('keeps the refresh token sealed to its account and revokes it with a signed client secret', async () => {
    const sealed = await sealRefreshToken('r.secret-token', 'usr_1', 'hash-secret');
    expect(sealed).not.toContain('secret-token');
    expect(await openRefreshToken(sealed, 'usr_1', 'hash-secret')).toBe('r.secret-token');
    expect(await openRefreshToken(sealed, 'usr_2', 'hash-secret')).toBeNull();

    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64');
    const appleKey = { teamId: 'TEAM123456', keyId: 'KEY1234567', privateKey: `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----` };
    const calls: Array<{ url: string; body: URLSearchParams }> = [];
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: new URLSearchParams(init?.body as URLSearchParams) });
      return url.endsWith('/token') ? Response.json({ refresh_token: 'r.from-apple' }) : new Response(null, { status: 200 });
    }) as unknown as typeof fetch;

    expect(await exchangeAppleCode('code-1', appleKey, fetcher, NOW)).toBe('r.from-apple');
    expect(await revokeAppleToken('r.from-apple', appleKey, fetcher, NOW)).toBe(true);
    expect(calls.map((call) => call.url)).toEqual(['https://appleid.apple.com/auth/token', 'https://appleid.apple.com/auth/revoke']);
    expect(calls[1].body.get('token')).toBe('r.from-apple');
    expect(calls[1].body.get('client_id')).toBe('uz.bugunbor.app');
    // The client secret is an ES256 token from the team for this app, signed with the key.
    const [header, payload, signature] = calls[1].body.get('client_secret')!.split('.');
    expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({ alg: 'ES256', kid: 'KEY1234567' });
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString())).toMatchObject({ iss: 'TEAM123456', sub: 'uz.bugunbor.app', aud: 'https://appleid.apple.com' });
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, Buffer.from(signature, 'base64url'), new TextEncoder().encode(`${header}.${payload}`))).toBe(true);
  });
});
