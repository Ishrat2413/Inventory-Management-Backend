import { z } from 'zod';
import { validateBody, validateParams, validateQuery } from './zod-error-handler';

/**
 * ID Validation Schemas and Types
 *
 * This module defines Zod schemas for validating PostgreSQL UUIDs
 * (single id or array of ids) as well as common search query parameters.
 * It also exports corresponding TypeScript types and named validator
 * middleware functions for use in Express routes.
 */

/**
 * Zod schema for validating single id or array of ids.
 */
const zodIdSchema = z
  .object({
    id: z
      .string({ message: 'Id is required' })
      .uuid({ message: 'Please provide a valid UUID' })
      .optional(),

    ids: z
      .array(
        z.string().uuid({
          message: 'Each ID must be a valid UUID',
        })
      )
      .min(1, { message: 'At least one ID must be provided' })
      .optional(),
  })
  .strict();

export type IdOrIdsInput = z.infer<typeof zodIdSchema>;

/**
 * Zod schema for validating pagination & search query parameters.
 */
const zodSearchQuerySchema = z
  .object({
    searchKey: z.string({ message: 'Please specify the search key' }).optional(),

    showPerPage: z
      .string()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine((val): val is number => val !== undefined && val > 0, {
        message: 'Show per page must be a positive number',
      })
      .optional(),

    pageNo: z
      .string()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine((val): val is number => val !== undefined && val > 0, {
        message: 'Page number must be a positive number',
      })
      .optional(),
  })
  .strict();

export type SearchQueryInput = z.infer<typeof zodSearchQuerySchema>;

/**
 * Named validators (to be used in Express routes)
 */
export const validateId = validateParams(zodIdSchema.pick({ id: true }));
export const validateIds = validateBody(zodIdSchema.pick({ ids: true }));
export const validateSearchQueries = validateQuery(zodSearchQuerySchema);
