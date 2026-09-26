import { toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';

// The operator's legal details (Payme, Click and the public offer need them):
// entered by an admin in Admin → Sozlamalar, stored in app_settings, shown in
// the footer, on the contact page and in the public offer. Empty until set —
// nothing is invented. A sole trader publishes the state registration
// certificate; personal identification numbers and home addresses never go here.

export type CompanyInfo = { legalName: string; tin: string; registration: string; address: string; phone: string; email: string };

export const COMPANY_KEYS = {
  legalName: 'company_legal_name',
  tin: 'company_tin',
  registration: 'company_registration',
  address: 'company_address',
  phone: 'company_phone',
  email: 'company_email',
} as const satisfies Record<keyof CompanyInfo, string>;

export const EMPTY_COMPANY: CompanyInfo = { legalName: '', tin: '', registration: '', address: '', phone: '', email: '' };

// The footer shows these on every page, so they are kept for a minute per database.
const cache = new WeakMap<D1Database, { value: CompanyInfo; at: number }>();
const CACHE_MS = 60_000;

export async function getCompanyInfo(db: D1Database, options: { fresh?: boolean } = {}): Promise<CompanyInfo> {
  const hit = cache.get(db);
  if (hit && !options.fresh && Date.now() - hit.at < CACHE_MS) return hit.value;
  const rows = await db
    .prepare(`SELECT key, value FROM app_settings WHERE key IN (?1, ?2, ?3, ?4, ?5, ?6)`)
    .bind(...Object.values(COMPANY_KEYS))
    .all<{ key: string; value: string }>();
  const map = new Map(rows.results.map((row) => [row.key, row.value]));
  const value: CompanyInfo = {
    legalName: map.get(COMPANY_KEYS.legalName) ?? '',
    tin: map.get(COMPANY_KEYS.tin) ?? '',
    registration: map.get(COMPANY_KEYS.registration) ?? '',
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
    auditStatement(db, { actorUserId: input.actorId, action: 'company.updated', targetType: 'Settings', targetId: 'company', after: { legalName: input.info.legalName, tin: input.info.tin, registration: input.info.registration } }, nowDb),
  ]);
  cache.delete(db);
}

/** What Payme and Click check on the site before approving a cashbox. */
/** Name, address and phone are enough; STIR or the certificate is added when Payme/Click are connected. */
export const companyComplete = (info: CompanyInfo) => Boolean(info.legalName && info.address && info.phone);

/** "STIR 123456789" for a company, the registration certificate for a sole trader. */
export const companyIdentifier = (info: CompanyInfo, stirLabel: string) => (info.tin ? `${stirLabel} ${info.tin}` : info.registration);
