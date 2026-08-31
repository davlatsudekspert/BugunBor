export type BusinessRole = 'OWNER' | 'MANAGER' | 'DEAL_EDITOR' | 'REDEMPTION_STAFF' | 'ANALYST';
export type BusinessAction = 'business.read' | 'deal.write' | 'redemption.validate' | 'analytics.read' | 'team.manage';

const grants: Record<BusinessRole, readonly BusinessAction[]> = {
  OWNER: ['business.read', 'deal.write', 'redemption.validate', 'analytics.read', 'team.manage'],
  MANAGER: ['business.read', 'deal.write', 'redemption.validate', 'analytics.read'],
  DEAL_EDITOR: ['business.read', 'deal.write'],
  REDEMPTION_STAFF: ['business.read', 'redemption.validate'],
  ANALYST: ['business.read', 'analytics.read'],
};

export function canAccessBusiness(input: { requestedBusinessId: string; membershipBusinessId: string; role: BusinessRole; action: BusinessAction }) {
  return input.requestedBusinessId === input.membershipBusinessId && grants[input.role].includes(input.action);
}
