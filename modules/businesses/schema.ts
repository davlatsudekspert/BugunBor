import { z } from 'zod';

import { CITY_SLUGS } from '@/lib/cities';
import { isTime } from '@/lib/hours';
import { tryNormalizeUzbekPhone } from '@/modules/auth/phone';

// Shared by business forms (client) and the API (server). Messages are keys of `t.validation`.

const text = (min: number, max: number) => z.string().trim().min(min, 'tooShort').max(max, 'tooLong');

const uzPhone = z
  .string()
  .trim()
  .transform((value, context) => {
    const phone = tryNormalizeUzbekPhone(value);
    if (!phone) {
      context.addIssue({ code: 'custom', message: 'phone' });
      return z.NEVER;
    }
    return phone;
  });

const optionalHandle = (pattern: RegExp) =>
  z
    .string()
    .trim()
    .transform((value) => value.replace(/^https?:\/\/(www\.)?(t\.me|instagram\.com)\//i, '').replace(/^@/, '').replace(/\/+$/, ''))
    .refine((value) => value === '' || pattern.test(value), 'invalid')
    .transform((value) => value || null);

const optionalWebsite = z
  .string()
  .trim()
  .max(200, 'tooLong')
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'invalid')
  .transform((value) => value || null);

const coordinate = (limit: number) => z.coerce.number().min(-limit).max(limit).nullable().optional();

export const businessProfileSchema = z.object({
  name: text(2, 80),
  description: text(20, 1200),
  categoryId: z.string().min(1, 'invalid').max(60),
  city: z.enum(CITY_SLUGS, { message: 'invalid' }),
  phone: uzPhone,
  telegram: optionalHandle(/^[A-Za-z0-9_]{4,32}$/).optional(),
  instagram: optionalHandle(/^[A-Za-z0-9._]{1,30}$/).optional(),
  website: optionalWebsite.optional(),
});

export const onboardingSchema = businessProfileSchema.extend({
  address: text(5, 240),
  latitude: coordinate(90),
  longitude: coordinate(180),
});

const time = z.string().refine(isTime, 'time');

export const branchSchema = z.object({
  name: text(2, 80),
  city: z.enum(CITY_SLUGS, { message: 'invalid' }),
  address: text(5, 240),
  phone: z
    .string()
    .trim()
    .transform((value, context) => {
      if (!value) return null;
      const phone = tryNormalizeUzbekPhone(value);
      if (!phone) {
        context.addIssue({ code: 'custom', message: 'phone' });
        return z.NEVER;
      }
      return phone;
    })
    .optional(),
  open: time,
  close: time,
  latitude: coordinate(90),
  longitude: coordinate(180),
});

export const teamAddSchema = z.object({
  phone: uzPhone,
  role: z.enum(['OWNER', 'MANAGER', 'CASHIER']),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type BranchInput = z.infer<typeof branchSchema>;
