import { describe, expect, it } from 'vitest';

import { toDbTime } from '@/lib/time';
import { NOW, marketplace } from '@/test/fixtures';
import { registerDevice } from './devices';
import { daytimeSendAfter, interestDealStatement } from './nearby';
import { createFcmSender, pushFromTelegram, serviceAccountJwt, type PushSender } from './push';
import { processNotifications } from './service';

async function serviceAccount() {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----\n`;
  return { json: JSON.stringify({ project_id: 'bugunbor-test', client_email: 'push@bugunbor-test.iam.gserviceaccount.com', private_key: pem }), publicKey: pair.publicKey };
}

describe('push notifications (FCM)', () => {
  it('signs a service-account token Google can verify', async () => {
    const account = await serviceAccount();
    const jwt = await serviceAccountJwt(JSON.parse(account.json) as never, NOW);
    const [header, claims, signature] = jwt.split('.');
    const decode = (part: string) => Uint8Array.from(atob(part.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(part.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
    expect(JSON.parse(new TextDecoder().decode(decode(claims)))).toMatchObject({ iss: 'push@bugunbor-test.iam.gserviceaccount.com', aud: 'https://oauth2.googleapis.com/token', scope: 'https://www.googleapis.com/auth/firebase.messaging' });
    expect(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', account.publicKey, decode(signature), new TextEncoder().encode(`${header}.${claims}`))).toBe(true);
  });

  it('sends through FCM and recognises dead tokens', async () => {
    const account = await serviceAccount();
    const calls: string[] = [];
    const fakeFetch = (async (url: string, init?: { body?: string }) => {
      calls.push(url);
      if (url.includes('oauth2')) return Response.json({ access_token: 'access', expires_in: 3600 });
      const body = JSON.parse(init?.body ?? '{}') as { message: { token: string } };
      return body.message.token === 'dead-token'
        ? new Response(JSON.stringify({ error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } }), { status: 404 })
        : Response.json({ name: 'projects/bugunbor-test/messages/1' });
    }) as unknown as typeof fetch;
    const sender = createFcmSender(account.json, fakeFetch)!;
    expect(await sender.send('live-token', { title: 'Salom', body: 'Matn', link: 'https://bugunbor.uz/deals/osh' })).toBe('sent');
    expect(await sender.send('dead-token', { title: 'Salom', body: 'Matn', link: 'https://bugunbor.uz' })).toBe('invalid-token');
    expect(calls.filter((url) => url.includes('oauth2'))).toHaveLength(1);
    expect(createFcmSender('{not json')).toBeNull();
  });

  it('turns a Telegram message into a push title and body', () => {
    expect(pushFromTelegram('🔥 <b>Kafe</b> — yangi aksiya!\n\n<b>Osh &amp; choy</b>\n💰 30 000 so‘m', 'https://bugunbor.uz/deals/osh'))
      .toEqual({ title: '🔥 Kafe — yangi aksiya!', body: 'Osh & choy\n💰 30 000 so‘m', link: 'https://bugunbor.uz/deals/osh' });
  });

  it('prefers the app, forgets dead tokens and falls back to Telegram', async () => {
    const db = await marketplace();
    await db.prepare(`UPDATE users SET telegram_user_id = '777' WHERE id = 'alice'`).run();
    const nowDb = toDbTime(NOW);
    const enqueue = (key: string) => db.prepare(`INSERT INTO notifications(id, user_id, kind, dedupe_key, payload_json, send_after, created_at) VALUES (?1, 'alice', 'NEW_DEAL', ?1, '{"dealId":"deal"}', ?2, ?2)`).bind(key, nowDb).run();
    const telegram: string[] = [];
    const bot = { async sendMessage(chat: number | string) { telegram.push(String(chat)); } };
    const pushed: string[] = [];
    const push: PushSender = { async send(token) { pushed.push(token); return token === 'dead-token-xxxxxxxxxxxxxxxxxxxxx' ? 'invalid-token' : 'sent'; } };

    await registerDevice(db, { userId: 'alice', token: 'live-token-xxxxxxxxxxxxxxxxxxxxx', platform: 'android', locale: 'uz', appBuild: '7' }, NOW);
    await enqueue('n1');
    await processNotifications(db, bot, { appUrl: 'https://bugunbor.uz', now: NOW, push });
    expect({ pushed, telegram }).toEqual({ pushed: ['live-token-xxxxxxxxxxxxxxxxxxxxx'], telegram: [] });

    await db.prepare(`DELETE FROM devices`).run();
    await registerDevice(db, { userId: 'alice', token: 'dead-token-xxxxxxxxxxxxxxxxxxxxx', platform: 'android', locale: 'uz', appBuild: '7' }, NOW);
    await enqueue('n2');
    await processNotifications(db, bot, { appUrl: 'https://bugunbor.uz', now: NOW, push });
    expect(telegram).toEqual(['777']);
    expect(await db.prepare(`SELECT COUNT(*) AS n FROM devices`).first('n')).toBe(0);
  });
});

describe('new deal near you', () => {
  it('reaches people with that interest nearby, at most three a day, never at night, never followers', async () => {
    const db = await marketplace();
    const nowDb = toDbTime(NOW);
    await db.batch([
      db.prepare(`UPDATE users SET telegram_user_id = id, notify_nearby = 1, notify_lat_e2 = 4131, notify_lng_e2 = 6928 WHERE id IN ('alice', 'bob', 'stranger')`),
      db.prepare(`UPDATE users SET notify_lat_e2 = 3965, notify_lng_e2 = 6696 WHERE id = 'stranger'`),
      db.prepare(`INSERT INTO user_interests(user_id, category_id) VALUES ('alice', 'cat_food'), ('bob', 'cat_food'), ('stranger', 'cat_food')`),
      db.prepare(`INSERT INTO follows(user_id, business_id) VALUES ('bob', 'biz')`),
    ]);
    await interestDealStatement(db, { dealId: 'deal', sendAfter: NOW, nowDb }).run();
    const rows = await db.prepare(`SELECT user_id AS user, send_after AS at FROM notifications WHERE kind = 'INTEREST_DEAL'`).all<{ user: string; at: string }>();
    // Bob follows the business (he gets NEW_DEAL instead); the stranger is in Samarkand.
    expect(rows.results).toEqual([{ user: 'alice', at: nowDb }]);

    for (let index = 0; index < 3; index += 1) {
      await db.prepare(`INSERT INTO notifications(id, user_id, kind, dedupe_key, payload_json, send_after, created_at) VALUES (?1, 'alice', 'INTEREST_DEAL', ?1, '{}', ?2, ?2)`).bind(`old${index}`, nowDb).run();
    }
    await db.prepare(`DELETE FROM notifications WHERE dedupe_key LIKE 'INTEREST_DEAL:%'`).run();
    await interestDealStatement(db, { dealId: 'deal', sendAfter: NOW, nowDb }).run();
    expect(await db.prepare(`SELECT COUNT(*) AS n FROM notifications WHERE dedupe_key LIKE 'INTEREST_DEAL:%'`).first('n')).toBe(0);
  });

  it('waits for the morning in Tashkent', () => {
    expect(daytimeSendAfter(new Date('2026-09-25T10:00:00Z')).toISOString()).toBe('2026-09-25T10:00:00.000Z'); // 15:00 Tashkent
    expect(daytimeSendAfter(new Date('2026-09-25T18:30:00Z')).toISOString()).toBe('2026-09-26T03:00:00.000Z'); // 23:30 → 08:00
    expect(daytimeSendAfter(new Date('2026-09-25T00:30:00Z')).toISOString()).toBe('2026-09-25T03:00:00.000Z'); // 05:30 → 08:00
  });
});
