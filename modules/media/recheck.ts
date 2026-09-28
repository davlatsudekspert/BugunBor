import { toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';
import { teamStatement } from '@/modules/notifications/service';
import type { PhotoChecker } from './check';
import { checkDownAlertStatement, checkRecordStatements, retryAfter } from './check-status';
import { base64ToBytes, type ImageType } from './service';

// Photos kept unchecked because no checking service answered are checked again
// by the background job (modules/jobs.ts), a few at a time. A photo that passes
// is marked checked; one that breaks the rules is taken off the deal or the
// business profile and deleted, with an audit line, and the business is told.

/** Each check can take up to ~30 s: a run looks at a few photos only. */
const BATCH = 3;
/** A claimed photo is left alone by other runs for this long. */
const CLAIM_MINUTES = 10;

type Waiting = { id: string; businessId: string; kind: string; mime: ImageType; data: string; tries: number; after: string };

/** Checks the photos whose turn has come; returns the ids of those taken down. */
export async function recheckPhotos(db: D1Database, check: PhotoChecker, now = new Date()) {
  const nowDb = toDbTime(now);
  const due = await db
    .prepare(`SELECT id, business_id AS businessId, kind, mime, data_base64 AS data, check_attempts AS tries, check_after AS after
      FROM media WHERE check_after IS NOT NULL AND check_after <= ?1 ORDER BY check_after LIMIT ?2`)
    .bind(nowDb, BATCH)
    .all<Waiting>();
  const removed: string[] = [];
  for (const photo of due.results) {
    // Claimed first, so a run in another isolate skips it.
    const claim = await db
      .prepare(`UPDATE media SET check_after = ?3 WHERE id = ?1 AND check_after = ?2`)
      .bind(photo.id, photo.after, toDbTime(new Date(now.getTime() + CLAIM_MINUTES * 60_000)))
      .run();
    if (!claim.meta.changes) continue;
    const result = await check(base64ToBytes(photo.data), photo.mime);
    const record = checkRecordStatements(db, result, nowDb);
    if (result.status === 'UNAVAILABLE') {
      await db.batch([
        db.prepare(`UPDATE media SET check_attempts = ?2, check_after = ?3 WHERE id = ?1`).bind(photo.id, photo.tries + 1, retryAfter(photo.tries + 1, now)),
        ...record,
        checkDownAlertStatement(db, result.failures, now),
      ]);
      continue;
    }
    if (result.verdict.allowed) {
      await db.batch([db.prepare(`UPDATE media SET check_status = 'PASSED', check_after = NULL WHERE id = ?1`).bind(photo.id), ...record]);
      continue;
    }
    const { verdict } = result;
    await db.batch([
      db.prepare(`UPDATE deals SET photo_id = NULL, updated_at = ?2 WHERE photo_id = ?1`).bind(photo.id, nowDb),
      db.prepare(`UPDATE businesses SET logo_id = CASE WHEN logo_id = ?1 THEN NULL ELSE logo_id END,
          cover_id = CASE WHEN cover_id = ?1 THEN NULL ELSE cover_id END, updated_at = ?2
        WHERE logo_id = ?1 OR cover_id = ?1`).bind(photo.id, nowDb),
      db.prepare(`DELETE FROM media WHERE id = ?1`).bind(photo.id),
      auditStatement(db, {
        actorUserId: null, businessId: photo.businessId, action: 'media.refused', targetType: 'Media', targetId: photo.id,
        reason: `${photo.kind} ${verdict.reason}: ${verdict.note} (checked again)`,
      }, nowDb),
      teamStatement(db, { businessId: photo.businessId, kind: 'PHOTO_REMOVED', key: photo.id, payload: { businessId: photo.businessId, kind: photo.kind, code: verdict.code }, nowDb }),
      ...record,
    ]);
    removed.push(photo.id);
  }
  return removed;
}
