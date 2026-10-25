import { getDb } from '@/db/client';
import { json, route } from '@/lib/http';
import { listAdminUsers } from '@/modules/admin/service';
import { appOwner } from '@/modules/auth/app-owner';

// GET /api/v1/admin/users?q= — people by name or phone, for the owner in the app.
export const GET = route(async (request: Request) => {
  const db = await getDb();
  await appOwner(request, db);
  const query = new URL(request.url).searchParams.get('q')?.trim().slice(0, 80) ?? '';
  const users = await listAdminUsers(db, query || null);
  return json({
    data: users.slice(0, 100).map((u) => ({
      id: u.id, name: u.displayName, phone: u.phone, role: u.role, status: u.status, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt, businesses: u.businesses,
    })),
  });
});
