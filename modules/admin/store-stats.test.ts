import { describe, expect, it } from 'vitest';

import { applyMigrations } from '@/db/migrate';
import { createTestD1 } from '@/test/d1';
import { fetchAppleDay, parseAppleSalesReport, parsePlayInstallsCsv, playStorageToken, refreshStoreDownloads, storeDownloads } from './store-stats';

// Download counts: the stores' reports, parsed and summed.

const NOW = new Date('2026-10-25T09:00:00Z');

async function testKeys() {
  const ec = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const rsa = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const pem = async (key: CryptoKey) => `-----BEGIN PRIVATE KEY-----\n${Buffer.from(await crypto.subtle.exportKey('pkcs8', key)).toString('base64')}\n-----END PRIVATE KEY-----`;
  return {
    apple: { keyId: 'KEY1234567', issuerId: 'issuer-1', privateKey: await pem(ec.privateKey), vendorNumber: '12345678' },
    play: { serviceAccount: JSON.stringify({ client_email: 'play@test.iam', private_key: await pem(rsa.privateKey) }), bucket: 'pubsite_prod_1' },
  };
}

const appleTsv = [
  'Provider\tProvider Country\tSKU\tDeveloper\tTitle\tVersion\tProduct Type Identifier\tUnits\tDeveloper Proceeds\tBegin Date\tEnd Date\tCustomer Currency\tCountry Code\tCurrency of Proceeds\tApple Identifier',
  'APPLE\tUS\tuz.bugunbor.app\tDev\tBugunBor\t1.0\t1F\t7\t0\t10/24/2026\t10/24/2026\tUZS\tUZ\tUZS\t6821543877',
  'APPLE\tUS\tuz.bugunbor.app\tDev\tBugunBor\t1.0\t1F\t2\t0\t10/24/2026\t10/24/2026\tUSD\tKZ\tUSD\t6821543877',
  'APPLE\tUS\tuz.bugunbor.app\tDev\tBugunBor\t1.0\t7F\t30\t0\t10/24/2026\t10/24/2026\tUZS\tUZ\tUZS\t6821543877',
  'APPLE\tUS\tuz.bugunbor.app\tDev\tBugunBor\t1.0\t3F\t4\t0\t10/24/2026\t10/24/2026\tUZS\tUZ\tUZS\t6821543877',
  'APPLE\tUS\tother.app\tDev\tOther\t1.0\t1F\t50\t0\t10/24/2026\t10/24/2026\tUZS\tUZ\tUZS\t1111111111',
].join('\n');

const gzip = async (text: string) => new Uint8Array(await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
const utf16 = (text: string) => {
  const bytes = new Uint8Array(2 + text.length * 2);
  bytes[0] = 0xff; bytes[1] = 0xfe;
  for (let i = 0; i < text.length; i++) { const code = text.charCodeAt(i); bytes[2 + i * 2] = code & 0xff; bytes[3 + i * 2] = code >> 8; }
  return bytes;
};
const playCsv = 'Date,Package Name,Daily Device Installs,Daily Device Uninstalls,Daily Device Upgrades,Total User Installs,Daily User Installs,Daily User Uninstalls,Active Device Installs\n2026-10-23,uz.bugunbor.app,5,0,0,40,4,1,38\n2026-10-24,uz.bugunbor.app,9,1,0,48,8,0,45\n2026-10-24,other.app,1,0,0,1,1,0,1\n';

describe('the stores’ reports', () => {
  it('counts Apple first downloads of this app only: no updates, re-downloads or other apps', () => {
    expect(parseAppleSalesReport(appleTsv)).toEqual({ downloads: 9 });
    expect(parseAppleSalesReport('')).toEqual({ downloads: 0 });
    expect(() => parseAppleSalesReport('a\tb\n1\t2')).toThrow('unexpected columns');
  });

  it('reads daily user installs from the Play CSV, UTF-16 or UTF-8', () => {
    const expected = new Map([['2026-10-23', 4], ['2026-10-24', 8]]);
    expect(parsePlayInstallsCsv(utf16(playCsv))).toEqual(expected);
    expect(parsePlayInstallsCsv(new TextEncoder().encode(playCsv))).toEqual(expected);
  });

  it('asks Apple with a signed token and unpacks the gzip; a missing day is null', async () => {
    const { apple } = await testKeys();
    const calls: Array<{ url: string; auth: string }> = [];
    const fetcher = (async (url: string, init?: RequestInit) => {
      calls.push({ url, auth: String(new Headers(init?.headers).get('authorization')) });
      return url.includes('reportDate%5D=2026-10-24') ? new Response(await gzip(appleTsv)) : new Response('{}', { status: 404 });
    }) as unknown as typeof fetch;
    expect(await fetchAppleDay(apple, '2026-10-24', fetcher, NOW)).toBe(9);
    expect(await fetchAppleDay(apple, '2026-10-25', fetcher, NOW)).toBeNull();
    expect(calls[0].url).toContain('filter%5BvendorNumber%5D=12345678');
    const [header, claims] = calls[0].auth.replace('Bearer ', '').split('.');
    expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({ alg: 'ES256', kid: 'KEY1234567', typ: 'JWT' });
    expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toMatchObject({ iss: 'issuer-1', aud: 'appstoreconnect-v1' });
  });

  it('gets a Google token for the bucket with the service account', async () => {
    const { play } = await testKeys();
    const fetcher = (async (url: string, init?: RequestInit) => {
      const body = new URLSearchParams(init?.body as URLSearchParams);
      expect(url).toBe('https://oauth2.googleapis.com/token');
      const claims = JSON.parse(Buffer.from(body.get('assertion')!.split('.')[1], 'base64url').toString());
      expect(claims).toMatchObject({ iss: 'play@test.iam', scope: 'https://www.googleapis.com/auth/devstorage.read_only' });
      return Response.json({ access_token: 'tok' });
    }) as unknown as typeof fetch;
    expect(await playStorageToken(play.serviceAccount, fetcher, NOW)).toBe('tok');
  });

  it('refreshes what is missing, keeps the numbers, sums them, and remembers a store’s error', async () => {
    const db = createTestD1();
    await applyMigrations(db);
    const stores = await testKeys();
    let appleCalls = 0;
    const fetcher = (async (url: string) => {
      if (url.startsWith('https://oauth2')) return Response.json({ access_token: 'tok' });
      if (url.includes('storage.googleapis.com')) return url.includes('_202610_') ? new Response(utf16(playCsv)) : new Response('', { status: 404 });
      appleCalls++;
      const day = /reportDate%5D=(\d{4}-\d{2}-\d{2})/.exec(url)![1];
      if (day >= '2026-10-24') return new Response('', { status: 404 });
      return new Response(await gzip(appleTsv));
    }) as unknown as typeof fetch;

    await refreshStoreDownloads(db, stores, fetcher, NOW);
    // Apple: 2026-10-17 … 2026-10-23 have reports (9 each); the 24th has none yet, so it stops there.
    expect(appleCalls).toBe(8);
    let downloads = await storeDownloads(db, stores, NOW);
    expect(downloads.apple).toMatchObject({ total: 63, last30: 63, days: 7, error: null });
    expect(downloads.play).toMatchObject({ total: 12, last7: 12, days: 2, error: null });
    expect(downloads.apple!.updatedAt).toBe('2026-10-25 09:00:00');

    // Fresh enough: nothing is asked again within six hours.
    await refreshStoreDownloads(db, stores, fetcher, new Date(NOW.getTime() + 60_000));
    expect(appleCalls).toBe(8);

    // Later, Apple fails: the numbers stay and the error is shown.
    const failing = (async (url: string) => (url.includes('appstoreconnect') ? new Response('', { status: 500 }) : fetcher(url))) as unknown as typeof fetch;
    await refreshStoreDownloads(db, stores, failing, new Date(NOW.getTime() + 7 * 3_600_000));
    downloads = await storeDownloads(db, stores, NOW);
    expect(downloads.apple).toMatchObject({ total: 63, error: 'App Store Connect: HTTP 500' });

    // Not set up: null, nothing is fetched.
    expect(await storeDownloads(db, { apple: null, play: null }, NOW)).toEqual({ apple: null, play: null });
  });
});
