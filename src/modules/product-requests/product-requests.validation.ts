import { z } from 'zod';
import { validateBody, validateQuery } from '../../handlers/zod-error-handler';

const zodCreateRequestSchema = z
  .object({
    productId: z.string({ message: 'productId is required' }).uuid(),
    quantity: z.number({ message: 'quantity is required' }).positive(),
    type: z.enum(['TASK_RELATED', 'GENERAL'], { message: 'type must be TASK_RELATED or GENERAL' }),
    taskId: z.string().uuid().optional(),
    reason: z.string().optional(),
  })
  .strict()
  .refine((data) => data.type !== 'TASK_RELATED' || !!data.taskId, {
    message: 'taskId is required when type is TASK_RELATED',
    path: ['taskId'],
  });

export type CreateRequestInput = z.infer<typeof zodCreateRequestSchema>;

const zodUpdateRequestStatusSchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED'], { message: 'status must be APPROVED or REJECTED' }),
    rejectionReason: z.string().nullable().optional(),
  })
  .strict()
  .refine((data) => data.status !== 'REJECTED' || !!data.rejectionReason, {
    message: 'rejectionReason is required when rejecting a request',
    path: ['rejectionReason'],
  });

export type UpdateRequestStatusInput = z.infer<typeof zodUpdateRequestStatusSchema>;

const zodRequestSearchQuerySchema = z
  .object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    type: z.enum(['TASK_RELATED', 'GENERAL']).optional(),
    taskId: z.string().uuid().optional(),
    requestedBy: z.string().uuid().optional(),
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

export type RequestSearchQueryInput = z.infer<typeof zodRequestSearchQuerySchema>;

export const validateCreateRequest = validateBody(zodCreateRequestSchema);
export const validateUpdateRequestStatus = validateBody(zodUpdateRequestStatusSchema);
export const validateRequestSearchQuery = validateQuery(zodRequestSearchQuerySchema);
