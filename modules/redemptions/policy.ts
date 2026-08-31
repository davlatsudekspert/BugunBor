export type ClaimableDeal = {
  status: string;
  startsAt: Date;
  endsAt: Date;
  remainingQuantity: number | null;
  existingClaims: number;
  perCustomerLimit: number;
};

export type ClaimPolicyResult = { ok: true } | { ok: false; code: string; message: string };

export function evaluateClaimPolicy(deal: ClaimableDeal, now = new Date()): ClaimPolicyResult {
  if (deal.status !== 'ACTIVE') return { ok: false, code: 'DEAL_NOT_ACTIVE', message: 'Aksiya hozir faol emas.' };
  if (deal.startsAt > now) return { ok: false, code: 'DEAL_NOT_STARTED', message: 'Aksiya hali boshlanmagan.' };
  if (deal.endsAt <= now) return { ok: false, code: 'DEAL_EXPIRED', message: 'Aksiya muddati tugagan.' };
  if (deal.remainingQuantity !== null && deal.remainingQuantity <= 0) return { ok: false, code: 'SOLD_OUT', message: 'Aksiya bo‘yicha joy qolmagan.' };
  if (deal.existingClaims >= deal.perCustomerLimit) return { ok: false, code: 'LIMIT_REACHED', message: 'Siz ushbu aksiya limitidan foydalangansiz.' };
  return { ok: true };
}
