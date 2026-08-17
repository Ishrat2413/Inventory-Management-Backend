import { z } from 'zod';
import { validateBody, validateQuery } from '../../handlers/zod-error-handler';
import { validateId } from '../../handlers/common-zod-validator';

/**
 * Documents Module Validation Schemas
 */

const zodCreateDocumentSchema = z
  .object({
    name: z.string({ message: 'Document name is required' }).min(1),
    documentType: z.string({ message: 'Document type is required' }).min(1),
    expiryDate: z.coerce.date().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type CreateDocumentInput = z.infer<typeof zodCreateDocumentSchema>;

const zodUpdateDocumentSchema = z
  .object({
    name: z.string().optional(),
    documentType: z.string().optional(),
    expiryDate: z.coerce.date().optional().nullable(),
    notes: z.string().optional(),
    isVerified: z.boolean().optional(),
  })
  .strict();

export type UpdateDocumentInput = z.infer<typeof zodUpdateDocumentSchema>;

const zodDocumentListQuerySchema = z
  .object({
    documentType: z.string().optional(),
  })
  .strict();

export type DocumentListQueryInput = z.infer<typeof zodDocumentListQuerySchema>;

export const validateCreateDocument = validateBody(zodCreateDocumentSchema);
export const validateUpdateDocument = validateBody(zodUpdateDocumentSchema);
export const validateDocumentListQuery = validateQuery(zodDocumentListQuerySchema);
