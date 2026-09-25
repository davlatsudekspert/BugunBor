import { getDb } from '@/db/client';
import { getConfig } from '@/lib/env';
import { clientIp, route } from '@/lib/http';
import { hashIp, hitRateLimit, RATE_RULES } from '@/modules/rate-limit';

// Best-effort view counter for business statistics. Over-limit hits are ignored silently.
export const POST = route(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const db = await getDb();
  const ipHash = await hashIp(clientIp(request), getConfig().hashSecret);
  const { allowed } = await hitRateLimit(db, `view:${ipHash}`, RATE_RULES.dealView);
  if (allowed) {
    const { id } = await context.params;
    await db.prepare(`UPDATE deals SET view_count = view_count + 1 WHERE id = ?1 AND status = 'ACTIVE' AND deleted_at IS NULL`).bind(id).run();
  }
  return new Response(null, { status: 204 });
});
