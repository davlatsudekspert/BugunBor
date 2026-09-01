import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { validateNfcStoreProfileUrl } from '@/lib/nfcstore';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';

const bodySchema = z.object({ profileUrl: z.string().trim().min(1).max(300) });

/**
 * Sets or clears an ordinary customer's optional NFCStore.uz personal profile link
 * (`users.nfcstore_profile_url`). Deliberately does nothing else: no verification step, no
 * discount, no bonus — see components/account-nfcstore-form.tsx and lib/nfcstore.ts's own
 * comment on why. Never blocks or is required for anything else in the account.
 */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: { message: 'Davom etish uchun tizimga kiring.' } }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Havolani kiriting.' } }, { status: 422 });

  const validation = validateNfcStoreProfileUrl(parsed.data.profileUrl);
  if (!validation.ok) return NextResponse.json({ error: { message: validation.reason } }, { status: 422 });

  await ensurePhase1Database();
  const db = getD1();
  await db.batch([
    db.prepare(`UPDATE users SET nfcstore_profile_url = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2`).bind(validation.normalizedUrl, identity.id),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, action, target_type, target_id, after_json) VALUES (?1, ?2, 'user.nfcstore_profile_added', 'User', ?2, ?3)`)
      .bind(crypto.randomUUID(), identity.id, JSON.stringify({ profileUrl: validation.normalizedUrl })),
  ]);

  return NextResponse.json({ data: { profileUrl: validation.normalizedUrl } });
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: { message: 'Davom etish uchun tizimga kiring.' } }, { status: 401 });

  await ensurePhase1Database();
  const db = getD1();
  await db.batch([
    db.prepare(`UPDATE users SET nfcstore_profile_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?1`).bind(identity.id),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, action, target_type, target_id) VALUES (?1, ?2, 'user.nfcstore_profile_removed', 'User', ?2)`)
      .bind(crypto.randomUUID(), identity.id),
  ]);

  return NextResponse.json({ data: { profileUrl: null } });
}
