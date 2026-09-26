import { beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '@/db/migrate';
import type { BotSender, ReplyMarkup, TelegramUpdate } from '@/modules/telegram/api';
import { handleTelegramUpdate } from '@/modules/telegram/bot';
import { createTestD1 } from '@/test/d1';
import { PRIVACY_VERSION } from '@/lib/privacy';
import { loginCookieValue, pollLogin, startLogin } from './login';
import { createSession, getSessionUser } from './sessions';

type Sent = { chatId: number | string; text: string; markup?: ReplyMarkup };

function fakeSender() {
  const sent: Sent[] = [];
  const sender: BotSender = {
    async sendMessage(chatId, text, markup) { sent.push({ chatId, text, markup }); },
    async answerCallback() {},
    async clearInlineKeyboard() {},
  };
  return { sent, sender };
}

let updateId = 1;
const message = (from: number, fields: Record<string, unknown>): TelegramUpdate => ({
  update_id: updateId++,
  message: { message_id: updateId, from: { id: from, first_name: 'Aziza', language_code: 'uz' }, chat: { id: from, type: 'private' }, ...fields },
});

describe('Telegram login flow', () => {
  let db: D1Database;
  const now = new Date('2026-09-25T10:00:00Z');

  beforeEach(async () => {
    db = createTestD1();
    await applyMigrations(db);
  });

  it('registers a new user through contact sharing and consumes the approval once', async () => {
    const { sent, sender } = fakeSender();
    const login = await startLogin(db, { returnTo: '/deals/osh', locale: 'uz', userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/140.0 Mobile Safari/537.36', consent: true }, now);
    const cookie = loginCookieValue(login.id, login.browserSecret);
    expect(await pollLogin(db, cookie, now)).toEqual({ status: 'PENDING', matchCode: login.matchCode });

    await handleTelegramUpdate(db, message(501, { text: `/start ${login.token}` }), { sender, adminPhones: [], siteUrl: 'https://bugunbor.uz', now });
    expect(sent.at(-1)?.text).toContain(login.matchCode);
    expect(sent.at(-1)?.text).toContain('Chrome · Android');
    expect(sent.at(-1)?.text).toContain('Saytdagi moslik kodi');
    expect(sent.at(-1)?.markup).toMatchObject({ keyboard: [[{ request_contact: true }], [{}]] });
    expect(await pollLogin(db, cookie, now)).toMatchObject({ status: 'WAITING' });

    await handleTelegramUpdate(db, message(501, { contact: { phone_number: '998901234567', first_name: 'Aziza', last_name: 'K', user_id: 501 } }), { sender, adminPhones: [], siteUrl: 'x', now });
    expect(sent.at(-1)?.markup).toEqual({ remove_keyboard: true });

    const approved = await pollLogin(db, cookie, now);
    expect(approved).toMatchObject({ status: 'APPROVED', returnTo: '/deals/osh' });
    expect(await pollLogin(db, cookie, now)).toEqual({ status: 'MISSING' });

    const user = await db.prepare(`SELECT phone, display_name AS name, role, telegram_user_id AS tg, privacy_accepted_at AS consentAt, privacy_version AS version FROM users WHERE phone = '+998901234567'`).first();
    expect(user).toEqual({ phone: '+998901234567', name: 'Aziza K', role: 'CUSTOMER', tg: '501', consentAt: '2026-09-25 10:00:00', version: PRIVACY_VERSION });
  });

  it('refuses to start without the consent box and never approves a request without consent', async () => {
    await expect(startLogin(db, { locale: 'uz' } as never, now)).rejects.toMatchObject({ code: 'CONSENT_REQUIRED' });

    // A request left over from before consent was required cannot create an account or a session.
    const { sent, sender } = fakeSender();
    const login = await startLogin(db, { locale: 'uz', consent: true }, now);
    await db.prepare(`UPDATE login_requests SET consent_at = NULL, consent_version = NULL WHERE id = ?1`).bind(login.id).run();
    await handleTelegramUpdate(db, message(520, { text: `/start ${login.token}` }), { sender, adminPhones: [], siteUrl: 'x', now });
    await handleTelegramUpdate(db, message(520, { contact: { phone_number: '+998905550000', first_name: 'Bekzod', user_id: 520 } }), { sender, adminPhones: [], siteUrl: 'x', now });
    expect(sent.at(-1)?.text).toContain('muddati tugagan');
    expect(await db.prepare(`SELECT COUNT(*) AS n FROM users WHERE telegram_user_id = '520'`).first('n')).toBe(0);
    expect(await pollLogin(db, loginCookieValue(login.id, login.browserSecret), now)).toMatchObject({ status: 'WAITING' });
  });

  it('records the newest consent when a returning user logs in again', async () => {
    const { sender } = fakeSender();
    const first = await startLogin(db, { locale: 'uz', consent: true }, now);
    await handleTelegramUpdate(db, message(530, { text: `/start ${first.token}` }), { sender, adminPhones: [], siteUrl: 'x', now });
    await handleTelegramUpdate(db, message(530, { contact: { phone_number: '+998905550001', first_name: 'Nodira', user_id: 530 } }), { sender, adminPhones: [], siteUrl: 'x', now });
    await db.prepare(`UPDATE users SET privacy_accepted_at = NULL, privacy_version = NULL WHERE telegram_user_id = '530'`).run();

    const later = new Date(now.getTime() + 60 * 60_000);
    const second = await startLogin(db, { locale: 'uz', consent: true }, later);
    await handleTelegramUpdate(db, message(530, { text: `/start ${second.token}` }), { sender, adminPhones: [], siteUrl: 'x', now: later });
    await handleTelegramUpdate(db, { update_id: updateId++, callback_query: { id: 'cb530', from: { id: 530, first_name: 'Nodira' }, message: { message_id: 1, chat: { id: 530, type: 'private' } }, data: `confirm:${second.id}` } }, { sender, adminPhones: [], siteUrl: 'x', now: later });
    expect((await pollLogin(db, loginCookieValue(second.id, second.browserSecret), later)).status).toBe('APPROVED');
    const consent = await db.prepare(`SELECT privacy_accepted_at AS at, privacy_version AS version FROM users WHERE telegram_user_id = '530'`).first();
    expect(consent).toEqual({ at: '2026-09-25 11:00:00', version: PRIVACY_VERSION });
  });

  it('rejects a contact that belongs to someone else', async () => {
    const { sent, sender } = fakeSender();
    const login = await startLogin(db, { locale: 'uz', consent: true }, now);
    await handleTelegramUpdate(db, message(600, { text: `/start ${login.token}` }), { sender, adminPhones: [], siteUrl: 'x', now });
    await handleTelegramUpdate(db, message(600, { contact: { phone_number: '+998907777777', first_name: 'Boshqa', user_id: 999 } }), { sender, adminPhones: [], siteUrl: 'x', now });
    expect(sent.at(-1)?.text).toContain('o‘zingizning raqamingizni');
    expect(await pollLogin(db, loginCookieValue(login.id, login.browserSecret), now)).toMatchObject({ status: 'WAITING' });
  });

  it('lets a known user confirm with the inline button and promotes admin phones', async () => {
    const { sent, sender } = fakeSender();
    const first = await startLogin(db, { locale: 'ru', consent: true }, now);
    await handleTelegramUpdate(db, message(700, { text: `/start ${first.token}` }), { sender, adminPhones: ['+998901110033'], siteUrl: 'x', now });
    await handleTelegramUpdate(db, message(700, { contact: { phone_number: '+998901110033', first_name: 'Kamol', user_id: 700 } }), { sender, adminPhones: ['+998901110033'], siteUrl: 'x', now });
    expect(sent.at(-1)?.text).toContain('Подтверждено');
    const firstPoll = await pollLogin(db, loginCookieValue(first.id, first.browserSecret), now);
    expect(firstPoll.status).toBe('APPROVED');

    const second = await startLogin(db, { locale: 'uz', consent: true }, now);
    await handleTelegramUpdate(db, message(700, { text: `/start ${second.token}` }), { sender, adminPhones: [], siteUrl: 'x', now });
    const prompt = sent.at(-1)!;
    expect(prompt.markup).toMatchObject({ inline_keyboard: [[{ callback_data: `confirm:${second.id}` }, { callback_data: `deny:${second.id}` }]] });
    await handleTelegramUpdate(db, { update_id: updateId++, callback_query: { id: 'cb1', from: { id: 700, first_name: 'Kamol' }, message: { message_id: 1, chat: { id: 700, type: 'private' } }, data: `confirm:${second.id}` } }, { sender, adminPhones: [], siteUrl: 'x', now });
    const approved = await pollLogin(db, loginCookieValue(second.id, second.browserSecret), now);
    expect(approved.status).toBe('APPROVED');
    const role = await db.prepare(`SELECT role FROM users WHERE telegram_user_id = '700'`).first('role');
    expect(role).toBe('ADMIN');
  });

  it('confirms the login even when Telegram rejects the button acknowledgement', async () => {
    const { sender } = fakeSender();
    const first = await startLogin(db, { locale: 'uz', consent: true }, now);
    await handleTelegramUpdate(db, message(710, { text: `/start ${first.token}` }), { sender, adminPhones: [], siteUrl: 'x', now });
    await handleTelegramUpdate(db, message(710, { contact: { phone_number: '+998901110044', first_name: 'Dilnoza', user_id: 710 } }), { sender, adminPhones: [], siteUrl: 'x', now });
    expect((await pollLogin(db, loginCookieValue(first.id, first.browserSecret), now)).status).toBe('APPROVED');

    const failing: BotSender = {
      ...sender,
      async answerCallback() { throw new Error('Bad Request: query is too old'); },
      async clearInlineKeyboard() { throw new Error('Bad Request: message is not modified'); },
    };
    const second = await startLogin(db, { locale: 'uz', consent: true }, now);
    await handleTelegramUpdate(db, message(710, { text: `/start ${second.token}` }), { sender, adminPhones: [], siteUrl: 'x', now });
    const update: TelegramUpdate = { update_id: updateId++, callback_query: { id: 'late', from: { id: 710, first_name: 'Dilnoza' }, message: { message_id: 9, chat: { id: 710, type: 'private' } }, data: `confirm:${second.id}` } };
    await handleTelegramUpdate(db, update, { sender: failing, adminPhones: [], siteUrl: 'x', now });
    expect((await pollLogin(db, loginCookieValue(second.id, second.browserSecret), now)).status).toBe('APPROVED');
  });

  it('does not let another Telegram account hijack a started request', async () => {
    const { sent, sender } = fakeSender();
    const login = await startLogin(db, { locale: 'uz', consent: true }, now);
    await handleTelegramUpdate(db, message(800, { text: `/start ${login.token}` }), { sender, adminPhones: [], siteUrl: 'x', now });
    await handleTelegramUpdate(db, message(801, { text: `/start ${login.token}` }), { sender, adminPhones: [], siteUrl: 'x', now });
    expect(sent.at(-1)?.text).toContain('muddati tugagan');
  });

  it('expires requests after ten minutes and ignores a wrong browser secret', async () => {
    const login = await startLogin(db, { locale: 'uz', consent: true }, now);
    expect(await pollLogin(db, loginCookieValue(login.id, 'wrong-secret'), now)).toEqual({ status: 'MISSING' });
    const later = new Date(now.getTime() + 11 * 60 * 1000);
    expect(await pollLogin(db, loginCookieValue(login.id, login.browserSecret), later)).toMatchObject({ status: 'EXPIRED' });
  });

  it('denies from the reply keyboard', async () => {
    const { sender } = fakeSender();
    const login = await startLogin(db, { locale: 'uz', consent: true }, now);
    await handleTelegramUpdate(db, message(900, { text: `/start ${login.token}` }), { sender, adminPhones: [], siteUrl: 'x', now });
    await handleTelegramUpdate(db, message(900, { text: '✋ Men emas' }), { sender, adminPhones: [], siteUrl: 'x', now });
    expect(await pollLogin(db, loginCookieValue(login.id, login.browserSecret), now)).toMatchObject({ status: 'DENIED' });
  });
});

describe('sessions', () => {
  it('creates, reads and expires sessions; blocked users lose access', async () => {
    const db = createTestD1();
    await applyMigrations(db);
    const now = new Date('2026-09-25T10:00:00Z');
    await db.prepare(`INSERT INTO users(id, role, display_name, locale) VALUES ('u1', 'CUSTOMER', 'Test', 'uz')`).run();
    const session = await createSession(db, 'u1', { userAgent: 'test' }, now);
    expect(await getSessionUser(db, session.token, now)).toMatchObject({ id: 'u1', role: 'CUSTOMER' });
    expect(await getSessionUser(db, `${session.token}x`, now)).toBeNull();
    expect(await getSessionUser(db, session.token, new Date(now.getTime() + 31 * 86400000))).toBeNull();
    await db.prepare(`UPDATE users SET status = 'BLOCKED' WHERE id = 'u1'`).run();
    expect(await getSessionUser(db, session.token, now)).toBeNull();
  });
});
