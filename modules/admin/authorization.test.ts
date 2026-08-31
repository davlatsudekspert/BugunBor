import { describe, expect, it } from 'vitest';
import { canAdmin } from './authorization';

describe('admin panel authorization', () => {
  it('grants the super admin full control, including team management', () => {
    expect(canAdmin('SUPER_ADMIN', 'admin.team.manage')).toBe(true);
    expect(canAdmin('SUPER_ADMIN', 'admin.plans.manage')).toBe(true);
    expect(canAdmin('SUPER_ADMIN', 'admin.deals.moderate')).toBe(true);
  });

  it('lets a manager moderate and verify businesses, but not touch admin accounts or pricing', () => {
    expect(canAdmin('MANAGER', 'admin.deals.moderate')).toBe(true);
    expect(canAdmin('MANAGER', 'admin.businesses.manage')).toBe(true);
    expect(canAdmin('MANAGER', 'admin.team.manage')).toBe(false);
    expect(canAdmin('MANAGER', 'admin.plans.manage')).toBe(false);
  });

  it('lets an accountant manage pricing, but not moderation or admin accounts', () => {
    expect(canAdmin('ACCOUNTANT', 'admin.plans.manage')).toBe(true);
    expect(canAdmin('ACCOUNTANT', 'admin.deals.moderate')).toBe(false);
    expect(canAdmin('ACCOUNTANT', 'admin.team.manage')).toBe(false);
  });

  it('lets every role read the dashboard', () => {
    for (const role of ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'] as const) {
      expect(canAdmin(role, 'admin.dashboard.read')).toBe(true);
    }
  });
});
