import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';

const decisionSchema = z.object({ decision: z.enum(['APPROVE', 'REJECT']), reason: z.string().trim().min(10).max(800) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { requireSameOrigin(request); } catch { return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 }); }
  const identity = await getRequestIdentity(request);
  if (!identity || !['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(identity.role)) return NextResponse.json({ error: { message: 'Moderator ruxsati talab qilinadi.' } }, { status: 403 });
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Qaror va kamida 10 belgili sabab kerak.' } }, { status: 422 });
  await ensurePhase1Database();
  const db = getD1();
  const { id } = await context.params;
  const current = await db.prepare('SELECT id, status, starts_at AS startsAt FROM deals WHERE id = ?1').bind(id).first<{ id: string; status: string; startsAt: string }>();
  if (!current) return NextResponse.json({ error: { message: 'Aksiya topilmadi.' } }, { status: 404 });
  if (current.status !== 'PENDING_REVIEW') return NextResponse.json({ error: { message: 'Faqat tekshiruvdagi aksiyaga qaror beriladi.' } }, { status: 409 });
  const nextStatus = parsed.data.decision === 'APPROVE' ? (new Date(`${current.startsAt}Z`) > new Date() ? 'SCHEDULED' : 'ACTIVE') : 'REJECTED';
  const before = JSON.stringify({ status: current.status });
  const after = JSON.stringify({ status: nextStatus });
  await db.batch([
    db.prepare('UPDATE deals SET status = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND status = ?3').bind(nextStatus, id, current.status),
    db.prepare(`INSERT INTO moderation_actions(id, actor_user_id, target_type, target_id, action, reason, before_json, after_json)
      VALUES (?1, ?2, 'Deal', ?3, ?4, ?5, ?6, ?7)`)
      .bind(crypto.randomUUID(), identity.id, id, parsed.data.decision, parsed.data.reason, before, after),
    db.prepare(`INSERT INTO audit_logs(id, actor_user_id, action, target_type, target_id, reason, before_json, after_json)
      VALUES (?1, ?2, 'deal.moderated', 'Deal', ?3, ?4, ?5, ?6)`)
      .bind(crypto.randomUUID(), identity.id, id, parsed.data.reason, before, after),
  ]);
  return NextResponse.json({ data: { id, status: nextStatus } });
}
