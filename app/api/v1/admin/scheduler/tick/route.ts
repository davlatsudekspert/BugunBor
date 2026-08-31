import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { getRequestIdentity } from '@/modules/auth/identity';
import { runSchedulerTick } from '@/modules/scheduler/tick';

/**
 * Drives the Auto Scheduler (section 33): flips SCHEDULED -> ACTIVE, ACTIVE -> EXPIRED,
 * and ACTIVE -> SOLD_OUT as time and inventory cross their thresholds. Call this from a
 * Cloudflare Cron Trigger (or any external scheduler) roughly once a minute — see
 * docs/operations.md. Authorized either by an ADMIN/SUPER_ADMIN session or by the
 * `x-bugunbor-cron-secret` header matching the CRON_SECRET binding.
 */
export async function POST(request: Request) {
  const identity = await getRequestIdentity(request);
  const isAdmin =
    identity !== null &&
    (identity.role === 'ADMIN' || identity.role === 'SUPER_ADMIN');
  const providedSecret = request.headers.get('x-bugunbor-cron-secret');
  const isCron = Boolean(env.CRON_SECRET) && providedSecret === env.CRON_SECRET;
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

  await ensurePhase1Database();
  const result = await runSchedulerTick(getD1());
  return NextResponse.json({ data: result });
}
