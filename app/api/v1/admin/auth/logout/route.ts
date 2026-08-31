import { NextResponse } from 'next/server';

import { ADMIN_SESSION_COOKIE, revokeAdminSessionToken } from '@/modules/admin/auth';
import { requireSameOrigin } from '@/modules/auth/identity';

function readSessionToken(request: Request) {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;
    if (part.slice(0, separatorIndex).trim() === ADMIN_SESSION_COOKIE) return decodeURIComponent(part.slice(separatorIndex + 1).trim());
  }
  return undefined;
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const token = readSessionToken(request);
  if (token) await revokeAdminSessionToken(token);

  const response = NextResponse.json({ data: { ok: true } });
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
