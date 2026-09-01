export const dealStatusLabels: Record<string, string> = {
  DRAFT: 'Qoralama',
  PENDING_REVIEW: 'Tekshiruvda',
  SCHEDULED: 'Rejalashtirilgan',
  ACTIVE: 'Faol',
  PAUSED: 'To‘xtatilgan',
  SOLD_OUT: 'Tugadi',
  EXPIRED: 'Muddati o‘tgan',
  REJECTED: 'Rad etilgan',
  ARCHIVED: 'Arxivlangan',
};

export const dealStatusStyles: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  SCHEDULED: 'bg-sky-50 text-sky-700',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700',
  REJECTED: 'bg-red-50 text-red-700',
  PAUSED: 'bg-slate-100 text-slate-600',
  SOLD_OUT: 'bg-slate-100 text-slate-600',
  EXPIRED: 'bg-slate-100 text-slate-600',
  DRAFT: 'bg-slate-100 text-slate-600',
  ARCHIVED: 'bg-slate-100 text-slate-600',
};

export const PRE_LAUNCH_STATUSES = new Set(['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'SCHEDULED']);
