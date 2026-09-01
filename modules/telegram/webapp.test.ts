import { describe, expect, it } from 'vitest';

import { bytesToHex, hmacSha256 } from '@/lib/crypto';
import { verifyTelegramInitData } from './webapp';

const BOT_TOKEN = '123456:test-bot-token-not-real';

async function buildSignedInitData(fields: Record<string, string>) {
  const secretKey = await hmacSha256(new TextEncoder().encode('WebAppData'), BOT_TOKEN);
  const dataCheckString = Object.entries(fields)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const hash = bytesToHex(await hmacSha256(secretKey, dataCheckString));
  const params = new URLSearchParams({ ...fields, hash });
  return params.toString();
}

describe('verifyTelegramInitData', () => {
  it('accepts genuinely-signed, fresh initData and extracts the user', async () => {
    const authDate = Math.floor(Date.now() / 1000).toString();
    const user = JSON.stringify({ id: 987654321, first_name: 'Aziza', last_name: 'Karimova', username: 'aziza_k' });
    const initData = await buildSignedInitData({ auth_date: authDate, query_id: 'AAH1234', user });

    const result = await verifyTelegramInitData(initData, BOT_TOKEN);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user).toEqual({ id: 987654321, firstName: 'Aziza', lastName: 'Karimova', username: 'aziza_k', languageCode: undefined });
    }
  });

  it('rejects a tampered field (hash no longer matches)', async () => {
    const authDate = Math.floor(Date.now() / 1000).toString();
    const user = JSON.stringify({ id: 1, first_name: 'Real' });
    const initData = await buildSignedInitData({ auth_date: authDate, user });
    // Swap in a different user after signing — exactly what a forged request would try.
    const tampered = initData.replace(encodeURIComponent(user), encodeURIComponent(JSON.stringify({ id: 999, first_name: 'Fake' })));

    const result = await verifyTelegramInitData(tampered, BOT_TOKEN);
    expect(result).toEqual({ ok: false, reason: 'INVALID_HASH' });
  });

  it('rejects the right signature from the wrong bot token', async () => {
    const authDate = Math.floor(Date.now() / 1000).toString();
    const user = JSON.stringify({ id: 1, first_name: 'X' });
    const initData = await buildSignedInitData({ auth_date: authDate, user });

    const result = await verifyTelegramInitData(initData, 'a-different-bot-token');
    expect(result).toEqual({ ok: false, reason: 'INVALID_HASH' });
  });

  it('rejects stale initData past the max age', async () => {
    const authDate = (Math.floor(Date.now() / 1000) - 90_000).toString(); // > 24h old
    const user = JSON.stringify({ id: 1, first_name: 'X' });
    const initData = await buildSignedInitData({ auth_date: authDate, user });

    const result = await verifyTelegramInitData(initData, BOT_TOKEN);
    expect(result).toEqual({ ok: false, reason: 'EXPIRED' });
  });

  it('rejects initData with no hash at all', async () => {
    const result = await verifyTelegramInitData('auth_date=123&user=%7B%7D', BOT_TOKEN);
    expect(result).toEqual({ ok: false, reason: 'NO_HASH' });
  });
});
