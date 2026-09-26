import { toDbTime } from '@/lib/time';

// Phones with the app installed (Firebase Cloud Messaging tokens). A token
// belongs to one account: signing in with another account moves it.

export type Device = { token: string; platform: string; locale: string | null };

export async function registerDevice(
  db: D1Database,
  input: { userId: string; token: string; platform: 'android' | 'ios'; locale: string | null; appBuild: string | null },
  now = new Date(),
) {
  const nowDb = toDbTime(now);
  await db
    .prepare(`INSERT INTO devices(token, user_id, platform, locale, app_build, created_at, last_seen_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
      ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform, locale = excluded.locale,
        app_build = excluded.app_build, last_seen_at = excluded.last_seen_at`)
    .bind(input.token, input.userId, input.platform, input.locale, input.appBuild, nowDb)
    .run();
}

export async function removeDevice(db: D1Database, input: { userId: string; token: string }) {
  await db.prepare(`DELETE FROM devices WHERE token = ?1 AND user_id = ?2`).bind(input.token, input.userId).run();
}

export async function listDevices(db: D1Database, userId: string): Promise<Device[]> {
  const rows = await db.prepare(`SELECT token, platform, locale FROM devices WHERE user_id = ?1 ORDER BY last_seen_at DESC LIMIT 10`).bind(userId).all<Device>();
  return rows.results;
}

export async function forgetDeviceToken(db: D1Database, token: string) {
  await db.prepare(`DELETE FROM devices WHERE token = ?1`).bind(token).run();
}
