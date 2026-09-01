export type AdminRole = 'SUPER_ADMIN' | 'MANAGER' | 'ACCOUNTANT';

export type AdminAction =
  | 'admin.dashboard.read'
  | 'admin.deals.moderate'
  | 'admin.businesses.manage'
  | 'admin.plans.manage'
  | 'admin.team.manage'
  | 'admin.announcements.manage'
  | 'admin.support.manage'
  | 'admin.promocodes.manage';

const grants: Record<AdminRole, readonly AdminAction[]> = {
  // Owns the whole panel, including who else gets admin access.
  SUPER_ADMIN: ['admin.dashboard.read', 'admin.deals.moderate', 'admin.businesses.manage', 'admin.plans.manage', 'admin.team.manage', 'admin.announcements.manage', 'admin.support.manage', 'admin.promocodes.manage'],
  // Operates the marketplace day to day: moderation queue, business verification, channel marketing and customer support.
  MANAGER: ['admin.dashboard.read', 'admin.deals.moderate', 'admin.businesses.manage', 'admin.announcements.manage', 'admin.support.manage'],
  // Owns pricing, billing and promotional-discount state, not marketplace moderation, marketing, support or admin access itself.
  ACCOUNTANT: ['admin.dashboard.read', 'admin.plans.manage', 'admin.promocodes.manage'],
};

export function canAdmin(role: AdminRole, action: AdminAction) {
  return grants[role].includes(action);
}
