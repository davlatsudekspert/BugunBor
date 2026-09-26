import { toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';

// The operator's legal details (Payme, Click and the public offer need them):
// entered by an admin in Admin → Sozlamalar, stored in app_settings, shown in
// the footer, on the contact page and in the public offer. Empty until set —
// nothing is invented.

export type CompanyInfo = { legalName: string; tin: string; address: string; phone: string; email: string };

export const COMPANY_KEYS = {
  legalName: 'company_legal_name',
  tin: 'company_tin',
  address: 'company_address',
  phone: 'company_phone',
  email: 'company_email',
} as const satisfies Record<keyof CompanyInfo, string>;

export const EMPTY_COMPANY: CompanyInfo = { legalName: '', tin: '', address: '', phone: '', email: '' };

// The footer shows these on every page, so they are kept for a minute per database.
const cache = new WeakMap<D1Database, { value: CompanyInfo; at: number }>();
const CACHE_MS = 60_000;

export async function getCompanyInfo(db: D1Database, options: { fresh?: boolean } = {}): Promise<CompanyInfo> {
  const hit = cache.get(db);
  if (hit && !options.fresh && Date.now() - hit.at < CACHE_MS) return hit.value;
  const rows = await db
    .prepare(`SELECT key, value FROM app_settings WHERE key IN (?1, ?2, ?3, ?4, ?5)`)
    .bind(...Object.values(COMPANY_KEYS))
    .all<{ key: string; value: string }>();
  const map = new Map(rows.results.map((row) => [row.key, row.value]));
  const value: CompanyInfo = {
    legalName: map.get(COMPANY_KEYS.legalName) ?? '',
    tin: map.get(COMPANY_KEYS.tin) ?? '',
    address: map.get(COMPANY_KEYS.address) ?? '',
    phone: map.get(COMPANY_KEYS.phone) ?? '',
    email: map.get(COMPANY_KEYS.email) ?? '',
  };
  cache.set(db, { value, at: Date.now() });
  return value;
}

export async function updateCompanyInfo(db: D1Database, input: { actorId: string; info: CompanyInfo }, now = new Date()) {
  const nowDb = toDbTime(now);
  await db.batch([
    ...(Object.keys(COMPANY_KEYS) as (keyof CompanyInfo)[]).map((field) =>
      db.prepare(`INSERT INTO app_settings(key, value, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
        .bind(COMPANY_KEYS[field], input.info[field], nowDb, input.actorId),
    ),
    auditStatement(db, { actorUserId: input.actorId, action: 'company.updated', targetType: 'Settings', targetId: 'company', after: { legalName: input.info.legalName, tin: input.info.tin } }, nowDb),
  ]);
  cache.delete(db);
}

/** What Payme and Click check on the site before approving a cashbox. */
export const companyComplete = (info: CompanyInfo) => Boolean(info.legalName && info.tin && info.address && info.phone);
