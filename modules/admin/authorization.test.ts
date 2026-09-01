import { describe, expect, it } from 'vitest';
import { canAdmin } from './authorization';

describe('admin panel authorization', () => {
  it('grants the super admin full control, including team management', () => {
    expect(canAdmin('SUPER_ADMIN', 'admin.team.manage')).toBe(true);
    expect(canAdmin('SUPER_ADMIN', 'admin.plans.manage')).toBe(true);
    expect(canAdmin('SUPER_ADMIN', 'admin.deals.moderate')).toBe(true);
  });

  it('lets a manager moderate, verify businesses, post channel announcements and handle support tickets, but not touch admin accounts or pricing', () => {
    expect(canAdmin('MANAGER', 'admin.deals.moderate')).toBe(true);
    expect(canAdmin('MANAGER', 'admin.businesses.manage')).toBe(true);
    expect(canAdmin('MANAGER', 'admin.announcements.manage')).toBe(true);
    expect(canAdmin('MANAGER', 'admin.support.manage')).toBe(true);
    expect(canAdmin('MANAGER', 'admin.team.manage')).toBe(false);
    expect(canAdmin('MANAGER', 'admin.plans.manage')).toBe(false);
    expect(canAdmin('MANAGER', 'admin.promocodes.manage')).toBe(false);
  });

  it('lets an accountant manage pricing and promo codes, but not moderation, marketing, support or admin accounts', () => {
    expect(canAdmin('ACCOUNTANT', 'admin.plans.manage')).toBe(true);
    expect(canAdmin('ACCOUNTANT', 'admin.promocodes.manage')).toBe(true);
    expect(canAdmin('ACCOUNTANT', 'admin.deals.moderate')).toBe(false);
    expect(canAdmin('ACCOUNTANT', 'admin.announcements.manage')).toBe(false);
    expect(canAdmin('ACCOUNTANT', 'admin.support.manage')).toBe(false);
    expect(canAdmin('ACCOUNTANT', 'admin.team.manage')).toBe(false);
  });

  it('lets every role read the dashboard', () => {
    for (const role of ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'] as const) {
      expect(canAdmin(role, 'admin.dashboard.read')).toBe(true);
    }
  });
});
