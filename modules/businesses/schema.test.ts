import { describe, expect, it } from 'vitest';

import { dealInputSchema } from '@/modules/deals/schema';
import { branchSchema, businessProfileSchema, onboardingSchema, teamAddSchema } from './schema';

// Forms send already-parsed values to the API, which parses them again.
function parsesTwice(schema: { parse: (value: unknown) => unknown }, input: unknown) {
  const once = schema.parse(input);
  expect(schema.parse(once)).toEqual(once);
  return once;
}

const profile = { name: 'Oltin Qozon', description: 'Toshkent palovi va milliy taomlar, har kuni yangi.', categoryId: 'cat_food', city: 'tashkent', phone: '90 123 45 67' };

describe('form schemas accept their own output', () => {
  it('business profile with empty optional fields', () => {
    const data = parsesTwice(businessProfileSchema, { ...profile, telegram: '', instagram: '', website: '' });
    expect(data).toMatchObject({ phone: '+998901234567', telegram: null, instagram: null, website: null });
  });

  it('business profile with links', () => {
    const data = parsesTwice(businessProfileSchema, { ...profile, telegram: 'https://t.me/oltin_qozon', instagram: '@oltin.qozon', website: 'https://oltinqozon.uz' });
    expect(data).toMatchObject({ telegram: 'oltin_qozon', instagram: 'oltin.qozon', website: 'https://oltinqozon.uz' });
  });

  it('onboarding', () => {
    parsesTwice(onboardingSchema, { ...profile, address: 'Amir Temur ko‘chasi, 1', telegram: '', latitude: null, longitude: null });
  });

  it('branch without a phone', () => {
    const data = parsesTwice(branchSchema, { name: 'Chilonzor', city: 'tashkent', address: 'Bunyodkor 12', phone: '', open: '09:00', close: '22:00', latitude: null, longitude: null });
    expect(data).toMatchObject({ phone: null });
  });

  it('team member', () => {
    parsesTwice(teamAddSchema, { phone: '+998 90 765 43 21', role: 'CASHIER' });
  });

  it('deal', () => {
    parsesTwice(dealInputSchema, {
      title: 'Tushlik seti', description: 'Issiq sho‘rva, non va choy — to‘liq tushlik.', terms: 'Faqat zalda.', categoryId: 'cat_food',
      visual: 'lunch', originalPrice: '55000', price: '39000', startsAt: '2026-09-25T12:00', endsAt: '2026-09-25T15:00', quantity: null,
      perCustomerLimit: '1', claimTtlMinutes: '60', branchIds: ['br1'], photoId: null,
    });
  });
});
