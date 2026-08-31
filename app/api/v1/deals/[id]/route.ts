import { NextResponse } from 'next/server';

import { getActiveDealBySlug } from '@/modules/catalog/repository';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deal = await getActiveDealBySlug(id);
  if (!deal) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Aksiya topilmadi.' } }, { status: 404 });
  return NextResponse.json({ data: deal }, { headers: { 'cache-control': 'public, max-age=15, stale-while-revalidate=60' } });
}
