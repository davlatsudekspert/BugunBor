export type BusinessRole = 'OWNER' | 'MANAGER' | 'CASHIER';
export const BUSINESS_ROLES: readonly BusinessRole[] = ['OWNER', 'MANAGER', 'CASHIER'];

export type BusinessAction =
  | 'business.read'
  | 'business.edit'
  | 'deal.write'
  | 'branch.write'
  | 'redemption.validate'
  | 'analytics.read'
  | 'team.manage';

const grants: Record<BusinessRole, readonly BusinessAction[]> = {
  OWNER: ['business.read', 'business.edit', 'deal.write', 'branch.write', 'redemption.validate', 'analytics.read', 'team.manage'],
  MANAGER: ['business.read', 'deal.write', 'branch.write', 'redemption.validate', 'analytics.read'],
  CASHIER: ['business.read', 'redemption.validate'],
};

export function roleCan(role: BusinessRole, action: BusinessAction) {
  return grants[role]?.includes(action) ?? false;
}

export function canAccessBusiness(input: { requestedBusinessId: string; membershipBusinessId: string; role: BusinessRole; action: BusinessAction }) {
  return input.requestedBusinessId === input.membershipBusinessId && roleCan(input.role, input.action);
}
