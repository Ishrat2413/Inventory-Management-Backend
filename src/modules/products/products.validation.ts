import { z } from 'zod';
import { validateBody, validateQuery } from '../../handlers/zod-error-handler';

const zodCreateProductSchema = z
  .object({
    sku: z.string().optional(),
    name: z.string({ message: 'Product name is required' }).min(1),
    description: z.string().optional(),
    unitPrice: z.number({ message: 'unitPrice is required' }).nonnegative(),
    currency: z.string().optional(),
    currentStock: z.number().optional(),
    lowStockThreshold: z.number().nonnegative().optional(),
    reorderTimeDays: z.number().int().nonnegative().optional(),
    quantityInReorder: z.number().nonnegative().optional(),
    isComposite: z.boolean().optional(),
    vendorId: z.string().uuid({ message: 'Invalid vendorId' }).optional().nullable(),
    categoryId: z.string().uuid({ message: 'Invalid categoryId' }).optional().nullable(),
    customFields: z.record(z.string(), z.any()).optional(),
    bomItems: z
      .array(
        z.object({
          childProductId: z.string({ message: 'childProductId is required' }).uuid(),
          quantityRequired: z.number({ message: 'quantityRequired is required' }).positive(),
        }),
      )
      .optional(),
  })
  .strict();

export type CreateProductInput = z.infer<typeof zodCreateProductSchema>;

const zodUpdateProductSchema = zodCreateProductSchema
  .partial()
  .extend({ isDiscontinued: z.boolean().optional() })
  .strict();

export type UpdateProductInput = z.infer<typeof zodUpdateProductSchema>;

const zodProductSearchQuerySchema = z
  .object({
    search: z.string().optional(),
    lowStock: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    isDiscontinued: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    isComposite: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    category: z.string().optional(),
    showPerPage: z
      .string()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .optional(),
    pageNo: z
      .string()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .optional(),
  })
  .strict();

export type ProductSearchQueryInput = z.infer<typeof zodProductSearchQuerySchema>;

const zodBOMLineSchema = z.object({
  childProductId: z.string({ message: 'childProductId is required' }).uuid(),
  quantityRequired: z.number({ message: 'quantityRequired is required' }).positive(),
});

const zodReplaceBOMSchema = z
  .object({
    items: z.array(zodBOMLineSchema).min(1, { message: 'At least one BOM line is required' }),
  })
  .strict();

export type ReplaceBOMInput = z.infer<typeof zodReplaceBOMSchema>;

const zodCustomFieldSchema = z
  .object({
    key: z.string({ message: 'key is required' }).min(1),
    value: z.any(),
  })
  .strict();

export type CustomFieldInput = z.infer<typeof zodCustomFieldSchema>;

export const validateCreateProduct = validateBody(zodCreateProductSchema);
export const validateUpdateProduct = validateBody(zodUpdateProductSchema);
export const validateProductSearchQuery = validateQuery(zodProductSearchQuerySchema);
export const validateReplaceBOM = validateBody(zodReplaceBOMSchema);
export const validateCustomField = validateBody(zodCustomFieldSchema);
