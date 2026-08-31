import { NextResponse } from 'next/server';

import { ensureDatabase, getDb } from '@/db/runtime';
import { getRequestIdentity } from '@/modules/auth/identity';
import { runSchedulerTick } from '@/modules/scheduler/tick';

/**
 * Drives the Auto Scheduler (section 33): flips SCHEDULED -> ACTIVE, ACTIVE -> EXPIRED,
 * and ACTIVE -> SOLD_OUT as time and inventory cross their thresholds. Call this from a
 * Railway Cron Job (or any external scheduler) roughly once a minute — see
 * docs/operations.md. Authorized either by an ADMIN/SUPER_ADMIN session or by the
 * `x-bugunbor-cron-secret` header matching the CRON_SECRET environment variable.
 */
export async function POST(request: Request) {
  const identity = await getRequestIdentity(request);
  const isAdmin =
    identity !== null &&
    (identity.role === 'ADMIN' || identity.role === 'SUPER_ADMIN');
  const providedSecret = request.headers.get('x-bugunbor-cron-secret');
  const cronSecret = process.env.CRON_SECRET;
  const isCron = Boolean(cronSecret) && providedSecret === cronSecret;
  if (!isAdmin && !isCron) {
    return NextResponse.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'Admin ruxsati yoki cron kaliti talab qilinadi.',
        },
      },
      { status: 403 },
    );
  }

  await ensureDatabase();
  const result = await runSchedulerTick(getDb());
  return NextResponse.json({ data: result });
}
