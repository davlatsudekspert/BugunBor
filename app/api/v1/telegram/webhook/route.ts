import { getDb } from '@/db/client';
import { getConfig, isTelegramConfigured } from '@/lib/env';
import { createTelegramApi, type TelegramUpdate } from '@/modules/telegram/api';
import { handleTelegramUpdate } from '@/modules/telegram/bot';

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

// Telegram retries non-2xx responses, so handler failures are logged and
// acknowledged; only an invalid secret is rejected.
export async function POST(request: Request) {
  const config = getConfig();
  if (!isTelegramConfigured(config)) return new Response('Not configured', { status: 503 });
  const secret = request.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (!timingSafeEqual(secret, config.telegram.webhookSecret!)) return new Response('Forbidden', { status: 403 });

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  if (!update || typeof update.update_id !== 'number') return new Response('Bad request', { status: 400 });

  try {
    const api = createTelegramApi(config.telegram.botToken!);
    const siteUrl = config.appUrl ?? new URL(request.url).origin;
    await handleTelegramUpdate(await getDb(), update, { sender: api.sender, adminPhones: config.adminPhones, siteUrl });
  } catch (error) {
    console.error('Telegram update failed', update.update_id, error);
  }
  return Response.json({ ok: true });
}
