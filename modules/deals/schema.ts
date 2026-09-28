import { z } from 'zod';

import { SET_RULES } from '@/lib/deal-set';
import { calmCaps } from '@/lib/text';
import { tashkentInputToDate } from '@/lib/time';
import { DEAL_VISUAL_KEYS } from '@/lib/visuals';
import { DEAL_RULES, discountPercent } from './status';

// Shared by the deal form (client) and the API (server). Issue messages are
// keys of `t.validation`, so both sides show the same localized text.

const text = (min: number, max: number) => z.string().trim().min(min, 'tooShort').max(max, 'tooLong');
const price = z.coerce.number({ message: 'invalid' }).int('invalid').min(0, 'invalid').max(100_000_000, 'invalid');

/** What a set holds (at least two things) and, if it says so, for how many people. */
export const dealSetSchema = z.object({
  items: z
    .array(z.object({ name: text(SET_RULES.nameMin, SET_RULES.nameMax), qty: z.coerce.number().int('invalid').min(1, 'invalid').max(SET_RULES.maxQty, 'invalid') }))
    .min(SET_RULES.minItems, 'setItems')
    .max(SET_RULES.maxItems, 'setItems'),
  persons: z.coerce.number().int('invalid').min(1, 'invalid').max(SET_RULES.maxPersons, 'invalid').nullable(),
});

export const dealInputSchema = z
  .object({
    title: text(5, 90),
    description: text(20, 600).transform(calmCaps),
    terms: text(5, 600).transform(calmCaps),
    categoryId: z.string().min(1, 'invalid').max(60),
    visual: z.enum(DEAL_VISUAL_KEYS, { message: 'invalid' }),
    originalPrice: price.min(1000, 'invalid'),
    price,
    startsAt: z.string().refine((value) => tashkentInputToDate(value) !== null, 'invalid'),
    endsAt: z.string().refine((value) => tashkentInputToDate(value) !== null, 'invalid'),
    quantity: z.coerce.number().int('invalid').min(1, 'invalid').max(DEAL_RULES.maxQuantity, 'invalid').nullable(),
    perCustomerLimit: z.coerce.number().int('invalid').min(1, 'invalid').max(DEAL_RULES.maxPerCustomer, 'invalid'),
    claimTtlMinutes: z.coerce.number().refine((value) => (DEAL_RULES.claimTtlOptions as readonly number[]).includes(value), 'invalid'),
    branchIds: z.array(z.string().min(1).max(100)).min(1, 'branchesRequired').max(50),
    /** Uploaded cover photo; omitted keeps the current one, null removes it. */
    photoId: z.string().regex(/^[0-9a-f-]{36}$/, 'invalid').nullable().optional(),
    /** A set; omitted keeps the current one (older apps do not send it), null makes it a regular deal. */
    set: dealSetSchema.nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.price >= value.originalPrice) {
      context.addIssue({ code: 'custom', path: ['price'], message: 'priceOrder' });
    } else if (discountPercent(value.originalPrice, value.price) < DEAL_RULES.minDiscountPercent) {
      context.addIssue({ code: 'custom', path: ['price'], message: 'minDiscount' });
    }
    const start = tashkentInputToDate(value.startsAt);
    const end = tashkentInputToDate(value.endsAt);
    if (start && end) {
      const minutes = (end.getTime() - start.getTime()) / 60_000;
      if (minutes <= 0) context.addIssue({ code: 'custom', path: ['endsAt'], message: 'endAfterStart' });
      else if (minutes < DEAL_RULES.minDurationMinutes || minutes > DEAL_RULES.maxDurationDays * 1440) {
        context.addIssue({ code: 'custom', path: ['endsAt'], message: 'duration' });
      }
    }
  });

export type DealInput = z.infer<typeof dealInputSchema>;
