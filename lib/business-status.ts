/** `businesses.verification_status`, in plain Uzbek — never show the raw enum value to a
 * business owner (see app/business/dashboard/page.tsx and components/admin/business-actions.tsx). */
export const BUSINESS_STATUS_LABELS: Record<string, string> = {
  UNVERIFIED: 'Tekshirilmagan',
  PENDING: 'Tekshirilmoqda',
  VERIFIED: 'Tasdiqlangan',
  REJECTED: 'Rad etilgan',
};

export const BUSINESS_STATUS_STYLES: Record<string, string> = {
  UNVERIFIED: 'bg-slate-100 text-slate-600',
  PENDING: 'bg-amber-50 text-amber-700',
  VERIFIED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
};
