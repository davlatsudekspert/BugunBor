import { getDb } from '@/db/client';
import { resetDemoData } from '@/db/seed';
import { json, route } from '@/lib/http';
import { DomainError } from '@/modules/errors';

// Development only (used by the end-to-end script): restores demo data.
// `import.meta.env.DEV` is statically false in production builds.
export const POST = route(async () => {
  if (!import.meta.env.DEV) throw new DomainError('NOT_FOUND');
  await resetDemoData(await getDb());
  return json({ data: { ok: true } });
});
