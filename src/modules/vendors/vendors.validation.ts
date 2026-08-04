import { z } from 'zod';
import { validateBody } from '../../handlers/zod-error-handler';
import { validateSearchQueries } from '../../handlers/common-zod-validator';

const zodCreateVendorSchema = z
  .object({
    name: z.string({ message: 'Vendor name is required' }).min(1),
    contact: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email({ message: 'Invalid email format' }).optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type CreateVendorInput = z.infer<typeof zodCreateVendorSchema>;

const zodUpdateVendorSchema = zodCreateVendorSchema.partial().extend({ isActive: z.boolean().optional() }).strict();

export type UpdateVendorInput = z.infer<typeof zodUpdateVendorSchema>;

export const validateCreateVendor = validateBody(zodCreateVendorSchema);
export const validateUpdateVendor = validateBody(zodUpdateVendorSchema);
export { validateSearchQueries as validateVendorSearchQuery };
