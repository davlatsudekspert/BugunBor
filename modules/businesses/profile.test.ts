import { beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '@/db/migrate';
import { parseHours } from '@/lib/hours';
import { createTestD1 } from '@/test/d1';
import { onboardingSchema } from './schema';
import { createBusiness, listBranches, profileChecklist, updateBranch } from './service';

const NOW = new Date('2026-09-25T06:00:00Z');

describe('filling in a business profile', () => {
  let db: D1Database;

  beforeEach(async () => {
    db = createTestD1();
    await applyMigrations(db);
    await db.prepare(`INSERT INTO users(id, role, display_name, phone, locale) VALUES ('owner', 'CUSTOMER', 'Owner', '+998900000001', 'uz')`).run();
  });

  const raw = (overrides: Record<string, unknown> = {}) => ({
    name: 'Mening Kafem',
    description: 'Shinam kafe, milliy va yevropa taomlari.',
    categoryId: 'cat_food',
    city: 'samarkand',
    phone: '+998 90 111 22 33',
    address: 'Registon ko‘chasi 5, bozor yonida',
    telegram: '',
    instagram: '',
    website: '',
    latitude: null,
    longitude: null,
    ...overrides,
  });
  const application = (overrides: Record<string, unknown> = {}) => onboardingSchema.parse(raw(overrides));

  it('takes the working hours from the application and keeps the defaults otherwise', async () => {
    const custom = await createBusiness(db, { userId: 'owner', locale: 'uz', data: application({ open: '10:00', close: '23:30' }) }, NOW);
    expect(parseHours((await listBranches(db, custom.id, NOW))[0].hoursJson)).toEqual({ open: '10:00', close: '23:30' });
    const plain = await createBusiness(db, { userId: 'owner', locale: 'uz', data: application({ name: 'Ikkinchi kafe' }) }, NOW);
    expect(parseHours((await listBranches(db, plain.id, NOW))[0].hoursJson)).toEqual({ open: '09:00', close: '21:00' });
    expect(onboardingSchema.safeParse(raw({ open: '25:00' })).success).toBe(false);
  });

  it('lists what is still missing and ticks items off as the owner fills them in', async () => {
    const { id } = await createBusiness(db, { userId: 'owner', locale: 'uz', data: application() }, NOW);
    const missing = async () => (await profileChecklist(db, id)).filter((item) => !item.done).map((item) => item.key);
    expect(await missing()).toEqual(['logo', 'cover', 'description', 'contacts', 'location', 'deal']);

    await db.prepare(`UPDATE businesses SET telegram = 'mening_kafem', description = ?2 WHERE id = ?1`)
      .bind(id, 'Shinam kafe: milliy va yevropa taomlari, tushlik uchun kombo, kechqurun jonli musiqa va bolalar menyusi.').run();
    const [branch] = await listBranches(db, id, NOW);
    await updateBranch(db, { businessId: id, userId: 'owner', branchId: branch.id, data: { name: branch.name, city: 'samarkand', address: branch.address, phone: null, open: '09:00', close: '21:00', latitude: 39.6547, longitude: 66.9758 } }, NOW);
    expect(await missing()).toEqual(['logo', 'cover', 'deal']);
  });

  it('starts with the location found by the phone when the owner shares it', async () => {
    const { id } = await createBusiness(db, { userId: 'owner', locale: 'uz', data: application({ latitude: 39.6601, longitude: 66.9712 }) }, NOW);
    expect((await profileChecklist(db, id)).find((item) => item.key === 'location')?.done).toBe(true);
  });
});
