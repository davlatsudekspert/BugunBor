export type DealLifecycleStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'SOLD_OUT'
  | 'EXPIRED'
  | 'STOPPED'
  | 'REJECTED'
  | 'ARCHIVED';

const PRE_LAUNCH_STATUSES: readonly DealLifecycleStatus[] = [
  'DRAFT',
  'PENDING_REVIEW',
  'SCHEDULED',
];
const TERMINAL_STATUSES: readonly DealLifecycleStatus[] = [
  'SOLD_OUT',
  'EXPIRED',
  'STOPPED',
  'REJECTED',
  'ARCHIVED',
];

export type DealEditPatch = Partial<{
  title: string;
  categoryId: string;
  attributes: Record<string, string>;
  imageUrls: string[];
  discountedPriceUzs: number;
  totalQuantity: number | null;
  startsAt: string;
  endsAt: string;
  description: string;
  terms: string;
}>;

export type DealEditContext = {
  status: DealLifecycleStatus;
  discountedPriceUzs: number;
  totalQuantity: number | null;
  endsAt: string;
};

export type DealPolicyResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/**
 * Section 10/11 of the product spec: everything is editable before a deal goes LIVE
 * (DRAFT/PENDING_REVIEW/SCHEDULED). Once ACTIVE, only price-down, quantity-up, and an
 * early end are allowed — the identity of what was advertised may never change under
 * a customer's feet. Terminal states (SOLD_OUT/EXPIRED/STOPPED/REJECTED/ARCHIVED) are
 * frozen entirely.
 */
export function evaluateDealEditPolicy(
  context: DealEditContext,
  patch: DealEditPatch,
): DealPolicyResult {
  if (TERMINAL_STATUSES.includes(context.status)) {
    return {
      ok: false,
      code: 'DEAL_TERMINAL',
      message: 'Tugagan yoki to‘xtatilgan e’lonni tahrirlab bo‘lmaydi.',
    };
  }

  if (PRE_LAUNCH_STATUSES.includes(context.status)) return { ok: true };

  if (context.status !== 'ACTIVE') {
    return {
      ok: false,
      code: 'DEAL_NOT_EDITABLE',
      message: 'E’lon hozirgi holatda tahrirlanmaydi.',
    };
  }

  if (
    patch.title !== undefined ||
    patch.categoryId !== undefined ||
    patch.attributes !== undefined ||
    patch.imageUrls !== undefined
  ) {
    return {
      ok: false,
      code: 'CORE_FIELDS_LOCKED',
      message:
        'Faol e’londa nom, kategoriya, rasm yoki xususiyatlarni almashtirib bo‘lmaydi.',
    };
  }
  if (patch.startsAt !== undefined) {
    return {
      ok: false,
      code: 'STARTS_AT_LOCKED',
      message: 'Faol e’lonning boshlanish vaqtini o‘zgartirib bo‘lmaydi.',
    };
  }
  if (
    patch.discountedPriceUzs !== undefined &&
    patch.discountedPriceUzs > context.discountedPriceUzs
  ) {
    return {
      ok: false,
      code: 'PRICE_INCREASE_FORBIDDEN',
      message:
        'Faol e’londa narxni oshirib bo‘lmaydi — faqat tushirish mumkin.',
    };
  }
  if (patch.totalQuantity !== undefined) {
    if (context.totalQuantity === null || patch.totalQuantity === null) {
      return {
        ok: false,
        code: 'QUANTITY_UNLIMITED_FORBIDDEN',
        message: 'Faol e’londa miqdor turini o‘zgartirib bo‘lmaydi.',
      };
    }
    if (patch.totalQuantity < context.totalQuantity) {
      return {
        ok: false,
        code: 'QUANTITY_DECREASE_FORBIDDEN',
        message:
          'Faol e’londa mahsulot sonini kamaytirib bo‘lmaydi — faqat ko‘paytirish mumkin.',
      };
    }
  }
  if (
    patch.endsAt !== undefined &&
    new Date(`${patch.endsAt}Z`) > new Date(`${context.endsAt}Z`)
  ) {
    return {
      ok: false,
      code: 'END_EXTEND_FORBIDDEN',
      message:
        'Faol e’lonni uzaytirib bo‘lmaydi — faqat muddatidan oldin tugatish mumkin.',
    };
  }

  return { ok: true };
}

export function canDeleteDeal(status: DealLifecycleStatus): DealPolicyResult {
  if (!PRE_LAUNCH_STATUSES.includes(status)) {
    return {
      ok: false,
      code: 'DELETE_AFTER_LAUNCH_FORBIDDEN',
      message: 'Faqat boshlanmagan e’lonni o‘chirish mumkin.',
    };
  }
  return { ok: true };
}

export function canStopDeal(status: DealLifecycleStatus): DealPolicyResult {
  if (status !== 'ACTIVE') {
    return {
      ok: false,
      code: 'STOP_REQUIRES_ACTIVE',
      message: 'Faqat hozir faol e’lonni muddatidan oldin to‘xtatish mumkin.',
    };
  }
  return { ok: true };
}
