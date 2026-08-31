import { describe, expect, it } from 'vitest';
import { canAccessBusiness } from './authorization';

describe('tenant authorization', () => {
  it('allows an owner inside their tenant', () => expect(canAccessBusiness({ requestedBusinessId: 'biz-a', membershipBusinessId: 'biz-a', role: 'OWNER', action: 'team.manage' })).toBe(true));
  it('rejects cross-tenant access even for a business owner', () => expect(canAccessBusiness({ requestedBusinessId: 'biz-b', membershipBusinessId: 'biz-a', role: 'OWNER', action: 'business.read' })).toBe(false));
  it('limits redemption staff permissions', () => expect(canAccessBusiness({ requestedBusinessId: 'biz-a', membershipBusinessId: 'biz-a', role: 'REDEMPTION_STAFF', action: 'deal.write' })).toBe(false));
});
