import { z } from 'zod';

export const depositIdSchema = z.string().min(1, 'depositId is required');

export const amountSchema = z.number().finite().positive().int().min(100);

export const emailSchema = z.string().email().optional().or(z.literal(''));

export const paymentInitiateSchema = z.object({
  depositId: depositIdSchema,
  amount: amountSchema,
  returnUrl: z.string().url('returnUrl must be a valid URL'),
  reason: z.string().optional(),
  email: emailSchema,
  name: z.string().optional(),
  slug: z.string().min(1, 'slug is required'),
  orgName: z.string().optional(),
  paymentMethod: z.enum(['mobile_money', 'card']).optional(),
});

export const paymentFinalizeSchema = z.object({
  depositId: depositIdSchema,
  type: z.enum(['donation', 'membership']),
});

export const smtpSettingsSchema = z.object({
  orgId: z.string().min(1, 'orgId is required'),
  smtpHost: z.string().optional(),
  smtpPort: z.union([z.string(), z.number()]).optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpFromEmail: z.string().email().optional().or(z.literal('')),
  smtpFromName: z.string().optional(),
});
