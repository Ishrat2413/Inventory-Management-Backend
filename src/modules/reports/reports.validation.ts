import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from '../../handlers/zod-error-handler';

const zodMonthlyQuerySchema = z
  .object({
    year: z.string({ message: 'year is required' }).transform((v) => parseInt(v, 10)),
    month: z
      .string({ message: 'month is required' })
      .transform((v) => parseInt(v, 10))
      .refine((v) => v >= 1 && v <= 12, { message: 'month must be between 1 and 12' }),
  })
  .strict();

export type MonthlyQueryInput = z.infer<typeof zodMonthlyQuerySchema>;

const zodDateRangeQuerySchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .strict();

export type DateRangeQueryInput = z.infer<typeof zodDateRangeQuerySchema>;

const zodGenerateMonthlySchema = z
  .object({
    year: z.number({ message: 'year is required' }).int(),
    month: z.number({ message: 'month is required' }).int().min(1).max(12),
  })
  .strict();

export type GenerateMonthlyInput = z.infer<typeof zodGenerateMonthlySchema>;

const zodMonthlyParamsSchema = z.object({
  year: z.string().transform((v) => parseInt(v, 10)),
  month: z
    .string()
    .transform((v) => parseInt(v, 10))
    .refine((v) => v >= 1 && v <= 12, { message: 'month must be between 1 and 12' }),
});

export type MonthlyParamsInput = z.infer<typeof zodMonthlyParamsSchema>;

export const validateMonthlyQuery = validateQuery(zodMonthlyQuerySchema);
export const validateDateRangeQuery = validateQuery(zodDateRangeQuerySchema);
export const validateGenerateMonthly = validateBody(zodGenerateMonthlySchema);
export const validateMonthlyParams = validateParams(zodMonthlyParamsSchema);
