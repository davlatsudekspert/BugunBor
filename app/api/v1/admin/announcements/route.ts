import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { getAdminSessionFromRequest } from '@/modules/admin/auth';
import { canAdmin } from '@/modules/admin/authorization';
import { requireSameOrigin } from '@/modules/auth/identity';
import { createTelegramChannelProvider } from '@/modules/providers/telegram';

const bodySchema = z.object({
  message: z.string().trim().min(5).max(1000),
  dealId: z.string().min(1).max(100).optional(),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const admin = await getAdminSessionFromRequest(request);
  if (!admin || !canAdmin(admin.role, 'admin.announcements.manage')) {
    return NextResponse.json({ error: { message: 'Reklama joylash uchun ruxsat yo‘q.' } }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Xabar matnini kiriting (kamida 5 belgi).' } }, { status: 422 });

  await ensurePhase1Database();
  const db = getD1();
  if (parsed.data.dealId) {
    const deal = await db.prepare('SELECT id FROM deals WHERE id = ?1').bind(parsed.data.dealId).first<{ id: string }>();
    if (!deal) return NextResponse.json({ error: { message: 'Tanlangan aksiya topilmadi.' } }, { status: 404 });
  }

  const channel = createTelegramChannelProvider(env.TELEGRAM_BOT_TOKEN);
  const result = await channel.postAnnouncement({ channelId: env.TELEGRAM_ANNOUNCE_CHANNEL_ID ?? '', text: parsed.data.message });

  const id = crypto.randomUUID();
  await db
    .prepare(`INSERT INTO admin_announcements(id, actor_admin_id, deal_id, message, status, error, telegram_message_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
    .bind(id, admin.id, parsed.data.dealId ?? null, parsed.data.message, result.ok ? 'SENT' : 'FAILED', result.ok ? null : result.error, result.ok ? (result.messageId ?? null) : null)
    .run();

  if (!result.ok) {
    const message =
      result.error === 'TELEGRAM_BOT_TOKEN_MISSING'
        ? 'TELEGRAM_BOT_TOKEN sozlanmagan.'
        : result.error === 'NO_TELEGRAM_CHANNEL_ID'
          ? 'TELEGRAM_ANNOUNCE_CHANNEL_ID sozlanmagan.'
          : `Telegram xatosi: ${result.error}`;
    return NextResponse.json({ error: { message } }, { status: 502 });
  }

  return NextResponse.json({ data: { id, status: 'SENT' } }, { status: 201 });
}
