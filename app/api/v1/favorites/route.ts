import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';
import { toggleFavorite } from '@/modules/catalog/repository';

const bodySchema = z.object({ dealId: z.string().min(3).max(100) });

/** Toggles a deal in/out of the caller's saved list. Idempotent to call either state — it just flips. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: { message: 'Davom etish uchun tizimga kiring.' } }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Aksiya noto‘g‘ri ko‘rsatilgan.' } }, { status: 422 });

  const favorited = await toggleFavorite(identity.id, parsed.data.dealId);
  return NextResponse.json({ data: { favorited } });
}
