import { z } from 'zod';
import { validateBody, validateQuery } from '../../handlers/zod-error-handler';

const zodCreateMovementSchema = z
  .object({
    productId: z.string({ message: 'productId is required' }).uuid(),
    type: z.enum(['PURCHASE', 'ADJUSTMENT', 'WRITE_OFF', 'RETURN'], {
      message: 'type must be one of PURCHASE, ADJUSTMENT, WRITE_OFF, RETURN',
    }),
    quantity: z.number({ message: 'quantity is required' }).refine((v) => v !== 0, { message: 'quantity cannot be zero' }),
    unitCost: z.number({ message: 'unitCost is required' }).nonnegative(),
    notes: z.string().optional(),
  })
  .strict();

export type CreateMovementInput = z.infer<typeof zodCreateMovementSchema>;

const zodConsumeSchema = z
  .object({
    productId: z.string({ message: 'productId is required' }).uuid(),
    quantity: z.number({ message: 'quantity is required' }).positive(),
    relatedTaskId: z.string().uuid().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type ConsumeInput = z.infer<typeof zodConsumeSchema>;

const zodMovementSearchQuerySchema = z
  .object({
    productId: z.string().uuid().optional(),
    type: z.enum(['PURCHASE', 'CONSUMPTION', 'ADJUSTMENT', 'WRITE_OFF', 'RETURN', 'ASSEMBLY']).optional(),
    taskId: z.string().uuid().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
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

export type MovementSearchQueryInput = z.infer<typeof zodMovementSearchQuerySchema>;

const zodAssembleSchema = z
  .object({
    productId: z.string({ message: 'productId is required' }).uuid(),
    quantity: z.number({ message: 'quantity is required' }).int().positive(),
    notes: z.string().optional(),
  })
  .strict();

export type AssembleInput = z.infer<typeof zodAssembleSchema>;

export const validateCreateMovement = validateBody(zodCreateMovementSchema);
export const validateConsume = validateBody(zodConsumeSchema);
export const validateAssemble = validateBody(zodAssembleSchema);
export const validateMovementSearchQuery = validateQuery(zodMovementSearchQuerySchema);
