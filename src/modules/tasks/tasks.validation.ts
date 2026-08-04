import { z } from 'zod';
import { validateBody, validateQuery } from '../../handlers/zod-error-handler';

const zodRequiredProductSchema = z.object({
  productId: z.string({ message: 'productId is required' }).uuid(),
  quantity: z.number({ message: 'quantity is required' }).positive(),
});

const zodCreateTaskSchema = z
  .object({
    title: z.string({ message: 'Title is required' }).min(1),
    description: z.string().optional(),
    assignedEmployeeIds: z.array(z.string().uuid()).optional().default([]),
    requiredProducts: z.array(zodRequiredProductSchema).optional().default([]),
  })
  .strict();

export type CreateTaskInput = z.infer<typeof zodCreateTaskSchema>;

const zodUpdateTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'CANCELLED']).optional(),
  })
  .strict();

export type UpdateTaskInput = z.infer<typeof zodUpdateTaskSchema>;

const zodAssignTaskSchema = z
  .object({
    addEmployeeIds: z.array(z.string().uuid()).optional().default([]),
    removeEmployeeIds: z.array(z.string().uuid()).optional().default([]),
  })
  .strict();

export type AssignTaskInput = z.infer<typeof zodAssignTaskSchema>;

const zodTaskSearchQuerySchema = z
  .object({
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    assigneeId: z.string().uuid().optional(),
    createdBy: z.string().uuid().optional(),
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

export type TaskSearchQueryInput = z.infer<typeof zodTaskSearchQuerySchema>;

export const validateCreateTask = validateBody(zodCreateTaskSchema);
export const validateUpdateTask = validateBody(zodUpdateTaskSchema);
export const validateAssignTask = validateBody(zodAssignTaskSchema);
export const validateTaskSearchQuery = validateQuery(zodTaskSearchQuerySchema);
