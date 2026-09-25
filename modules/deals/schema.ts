import { z } from 'zod';

import { tashkentInputToDate } from '@/lib/time';
import { DEAL_VISUAL_KEYS } from '@/lib/visuals';
import { DEAL_RULES, discountPercent } from './status';

// Shared by the deal form (client) and the API (server). Issue messages are
// keys of `t.validation`, so both sides show the same localized text.

const text = (min: number, max: number) => z.string().trim().min(min, 'tooShort').max(max, 'tooLong');
const price = z.coerce.number({ message: 'invalid' }).int('invalid').min(0, 'invalid').max(100_000_000, 'invalid');

export const dealInputSchema = z
  .object({
    title: text(5, 90),
    description: text(20, 600),
    terms: text(5, 600),
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
