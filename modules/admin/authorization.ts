export type AdminRole = 'SUPER_ADMIN' | 'MANAGER' | 'ACCOUNTANT';

export type AdminAction =
  | 'admin.dashboard.read'
  | 'admin.deals.moderate'
  | 'admin.businesses.manage'
  | 'admin.plans.manage'
  | 'admin.team.manage';

const grants: Record<AdminRole, readonly AdminAction[]> = {
  // Owns the whole panel, including who else gets admin access.
  SUPER_ADMIN: ['admin.dashboard.read', 'admin.deals.moderate', 'admin.businesses.manage', 'admin.plans.manage', 'admin.team.manage'],
  // Operates the marketplace day to day: moderation queue and business verification.
  MANAGER: ['admin.dashboard.read', 'admin.deals.moderate', 'admin.businesses.manage'],
  // Owns pricing and billing state, not marketplace moderation or admin access itself.
  ACCOUNTANT: ['admin.dashboard.read', 'admin.plans.manage'],
};

export function canAdmin(role: AdminRole, action: AdminAction) {
  return grants[role].includes(action);
}
