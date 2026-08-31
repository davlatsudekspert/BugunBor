import { NextResponse } from 'next/server';
import { z } from 'zod';

import { listActiveDeals } from '@/modules/catalog/repository';

const querySchema = z.object({ city: z.string().trim().max(80).optional(), q: z.string().trim().max(120).optional(), limit: z.coerce.number().int().min(1).max(50).optional() });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: { code: 'VALIDATION', message: 'Qidiruv parametrlari noto‘g‘ri.' } }, { status: 422 });
  const results = await listActiveDeals({ city: parsed.data.city, query: parsed.data.q, limit: parsed.data.limit });
  return NextResponse.json({ data: results, page: { count: results.length, nextCursor: null } }, { headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=120' } });
}
