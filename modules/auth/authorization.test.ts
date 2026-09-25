import { describe, expect, it } from 'vitest';
import { canAccessBusiness, roleCan } from './authorization';

describe('tenant authorization', () => {
  it('allows an owner inside their tenant', () => expect(canAccessBusiness({ requestedBusinessId: 'biz-a', membershipBusinessId: 'biz-a', role: 'OWNER', action: 'team.manage' })).toBe(true));
  it('rejects cross-tenant access even for a business owner', () => expect(canAccessBusiness({ requestedBusinessId: 'biz-b', membershipBusinessId: 'biz-a', role: 'OWNER', action: 'business.read' })).toBe(false));
  it('limits cashiers to code validation', () => {
    expect(roleCan('CASHIER', 'redemption.validate')).toBe(true);
    expect(roleCan('CASHIER', 'deal.write')).toBe(false);
    expect(roleCan('CASHIER', 'analytics.read')).toBe(false);
  });
  it('keeps team management with owners', () => {
    expect(roleCan('MANAGER', 'deal.write')).toBe(true);
    expect(roleCan('MANAGER', 'team.manage')).toBe(false);
    expect(roleCan('MANAGER', 'business.edit')).toBe(false);
  });
});
