export type ClaimableDeal = {
  status: string;
  startsAt: Date;
  endsAt: Date;
  remainingQuantity: number | null;
  existingClaims: number;
  perCustomerLimit: number;
};

export type ClaimPolicyResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function evaluateClaimPolicy(
  deal: ClaimableDeal,
  now = new Date(),
): ClaimPolicyResult {
  if (deal.status !== 'ACTIVE')
    return {
      ok: false,
      code: 'DEAL_NOT_ACTIVE',
      message: 'Aksiya hozir faol emas.',
    };
  if (deal.startsAt > now)
    return {
      ok: false,
      code: 'DEAL_NOT_STARTED',
      message: 'Aksiya hali boshlanmagan.',
    };
  if (deal.endsAt <= now)
    return {
      ok: false,
      code: 'DEAL_EXPIRED',
      message: 'Aksiya muddati tugagan.',
    };
  if (deal.remainingQuantity !== null && deal.remainingQuantity <= 0)
    return {
      ok: false,
      code: 'SOLD_OUT',
      message: 'Aksiya bo‘yicha joy qolmagan.',
    };
  if (deal.existingClaims >= deal.perCustomerLimit)
    return {
      ok: false,
      code: 'LIMIT_REACHED',
      message: 'Siz ushbu aksiya limitidan foydalangansiz.',
    };
  return { ok: true };
}

export type ClaimableSlot = {
  dealStatus: string;
  dealStartsAt: Date;
  dealEndsAt: Date;
  slotStartsAt: Date;
  slotRemainingCapacity: number;
  existingClaims: number;
  perCustomerLimit: number;
};

/** Same shape of checks as {@link evaluateClaimPolicy}, but for a SERVICE deal's
 * bo‘sh slot (section 7) instead of a PRODUCT's remaining quantity. */
export function evaluateSlotClaimPolicy(
  slot: ClaimableSlot,
  now = new Date(),
): ClaimPolicyResult {
  if (slot.dealStatus !== 'ACTIVE')
    return {
      ok: false,
      code: 'DEAL_NOT_ACTIVE',
      message: 'Xizmat hozir faol emas.',
    };
  if (slot.dealStartsAt > now)
    return {
      ok: false,
      code: 'DEAL_NOT_STARTED',
      message: 'Xizmat hali boshlanmagan.',
    };
  if (slot.dealEndsAt <= now)
    return {
      ok: false,
      code: 'DEAL_EXPIRED',
      message: 'Xizmat muddati tugagan.',
    };
  if (slot.slotStartsAt <= now)
    return {
      ok: false,
      code: 'SLOT_PASSED',
      message: 'Bu vaqt allaqachon o‘tib ketgan.',
    };
  if (slot.slotRemainingCapacity <= 0)
    return {
      ok: false,
      code: 'SLOT_FULL',
      message: 'Bu vaqt uchun bo‘sh joy qolmagan.',
    };
  if (slot.existingClaims >= slot.perCustomerLimit)
    return {
      ok: false,
      code: 'LIMIT_REACHED',
      message: 'Siz ushbu taklif limitidan foydalangansiz.',
    };
  return { ok: true };
}
