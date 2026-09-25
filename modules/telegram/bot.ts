import { fmt, getDictionary, type Dictionary } from '@/lib/i18n';
import { approveKnown, approveWithContact, attachTelegram, denyLogin, type ApproveResult } from '@/modules/auth/login';
import { normalizeInternationalPhone } from '@/modules/auth/phone';
import type { BotSender, TelegramCallbackQuery, TelegramMessage, TelegramUpdate } from './api';

export type BotDeps = {
  sender: BotSender;
  adminPhones: string[];
  siteUrl: string;
  now?: Date;
};

const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function describeDevice(userAgent: string | null | undefined, t: Dictionary) {
  const ua = userAgent ?? '';
  const os = /iPhone|iPad|iPod/.test(ua)
    ? 'iPhone'
    : /Android/.test(ua)
      ? 'Android'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Macintosh|Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : null;
  const browser = /BugunBorApp/.test(ua)
    ? 'BugunBor'
    : /Edg\//.test(ua)
      ? 'Edge'
      : /OPR\/|Opera/.test(ua)
        ? 'Opera'
        : /YaBrowser/.test(ua)
          ? 'Yandex'
          : /SamsungBrowser/.test(ua)
            ? 'Samsung Internet'
            : /Firefox\//.test(ua)
              ? 'Firefox'
              : /Chrome\//.test(ua)
                ? 'Chrome'
                : /Safari\//.test(ua)
                  ? 'Safari'
                  : null;
  const parts = [browser, os].filter(Boolean);
  return parts.length ? parts.join(' · ') : t.bot.unknownDevice;
}

function languageOf(message: { from?: { language_code?: string } }) {
  return message.from?.language_code?.startsWith('ru') ? 'ru' : 'uz';
}

const denyTexts = new Set([getDictionary('uz').bot.deny, getDictionary('ru').bot.deny]);

async function reportApproval(result: ApproveResult, chatId: number, fallback: Dictionary, sender: BotSender) {
  const t = result.kind === 'expired' ? fallback : getDictionary(result.request.locale === 'ru' ? 'ru' : 'uz');
  const text = result.kind === 'approved' ? t.bot.approved : result.kind === 'blocked' ? t.bot.blocked : t.bot.expired;
  await sender.sendMessage(chatId, text, { remove_keyboard: true });
}

async function handleMessage(db: D1Database, message: TelegramMessage, deps: BotDeps, now: Date) {
  if (!message.from || message.from.is_bot || message.chat.type !== 'private') return;
  const telegramUserId = String(message.from.id);
  const chatId = message.chat.id;
  const t = getDictionary(languageOf(message));

  if (message.contact) {
    if (String(message.contact.user_id ?? '') !== telegramUserId) {
      await deps.sender.sendMessage(chatId, t.bot.notOwnContact);
      return;
    }
    let phone: string;
    try {
      phone = normalizeInternationalPhone(message.contact.phone_number);
    } catch {
      await deps.sender.sendMessage(chatId, t.bot.notOwnContact);
      return;
    }
    const name = [message.contact.first_name, message.contact.last_name].filter(Boolean).join(' ').trim() || message.from.first_name;
    const result = await approveWithContact(
      db,
      { telegramUserId, telegramUsername: message.from.username ?? null, phone, displayName: name.slice(0, 60), locale: languageOf(message) },
      deps.adminPhones,
      now,
    );
    await reportApproval(result, chatId, t, deps.sender);
    return;
  }

  const text = message.text?.trim() ?? '';
  if (text === '/start' || text.startsWith('/start ')) {
    const token = text.slice('/start'.length).trim();
    if (!token) {
      await deps.sender.sendMessage(chatId, fmt(t.bot.welcome, { site: deps.siteUrl }));
      return;
    }
    const result = await attachTelegram(db, { token, telegramUserId, chatId: String(chatId) }, now);
    if (result.kind !== 'ok') {
      await deps.sender.sendMessage(chatId, t.bot.expired);
      return;
    }
    const rt = getDictionary(result.request.locale === 'ru' ? 'ru' : 'uz');
    const values = { code: result.request.matchCode, device: escapeHtml(describeDevice(result.request.userAgent, rt)) };
    const known = result.knownUser;
    if (known && known.status !== 'ACTIVE') {
      await deps.sender.sendMessage(chatId, rt.bot.blocked);
      return;
    }
    if (known?.phone) {
      await deps.sender.sendMessage(chatId, fmt(rt.bot.loginPromptKnown, values), {
        inline_keyboard: [[
          { text: rt.bot.confirm, callback_data: `confirm:${result.request.id}` },
          { text: rt.bot.deny, callback_data: `deny:${result.request.id}` },
        ]],
      });
      return;
    }
    await deps.sender.sendMessage(chatId, fmt(rt.bot.loginPromptNew, values), {
      keyboard: [[{ text: rt.bot.shareContact, request_contact: true }], [{ text: rt.bot.deny }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    });
    return;
  }

  if (denyTexts.has(text)) {
    const request = await denyLogin(db, { telegramUserId }, now);
    const rt = request ? getDictionary(request.locale === 'ru' ? 'ru' : 'uz') : t;
    await deps.sender.sendMessage(chatId, rt.bot.denied, { remove_keyboard: true });
    return;
  }

  await deps.sender.sendMessage(chatId, fmt(t.bot.welcome, { site: deps.siteUrl }));
}

async function handleCallback(db: D1Database, query: TelegramCallbackQuery, deps: BotDeps, now: Date) {
  const telegramUserId = String(query.from.id);
  const t = getDictionary(query.from.language_code?.startsWith('ru') ? 'ru' : 'uz');
  const [action, requestId] = (query.data ?? '').split(':');
  const chatId = query.message?.chat.id;
  await deps.sender.answerCallback(query.id);
  if (query.message && chatId !== undefined) await deps.sender.clearInlineKeyboard(chatId, query.message.message_id);
  if (chatId === undefined || !requestId) return;

  if (action === 'confirm') {
    const result = await approveKnown(db, { requestId, telegramUserId }, now);
    await reportApproval(result, chatId, t, deps.sender);
  } else if (action === 'deny') {
    const request = await denyLogin(db, { telegramUserId, requestId }, now);
    const rt = request ? getDictionary(request.locale === 'ru' ? 'ru' : 'uz') : t;
    await deps.sender.sendMessage(chatId, rt.bot.denied, { remove_keyboard: true });
  }
}

export async function handleTelegramUpdate(db: D1Database, update: TelegramUpdate, deps: BotDeps) {
  const now = deps.now ?? new Date();
  if (update.callback_query) return handleCallback(db, update.callback_query, deps, now);
  if (update.message) return handleMessage(db, update.message, deps, now);
}
