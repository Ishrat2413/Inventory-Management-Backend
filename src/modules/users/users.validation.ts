import { z } from 'zod';
import { validateBody, validateQuery } from '../../handlers/zod-error-handler';

/**
 * Users Module Validation Schemas
 *
 * Covers admin-side employee/user management (create/update/list/deactivate)
 * and the nested employee profile (pay rates & attendance rules) described
 * in API_ENDPOINTS.md section 2.
 */

const zodEmployeeProfileSchema = z
  .object({
    hourlyRate: z.number({ message: 'hourlyRate is required' }).nonnegative(),
    dailyRate: z.number().nonnegative().optional(),
    payCalculationMode: z.enum(['HOURLY', 'DAILY_PLUS_OVERTIME']).optional(),
    overtimeMultiplier: z.number().positive().optional(),
    lateGraceMinutes: z.number().int().nonnegative().optional(),
    earlyLeavePenalty: z.boolean().optional(),
    missingPunchRules: z.record(z.string(), z.any()).optional(),
    department: z.string().optional(),
    joinDate: z.coerce.date().optional(),
  })
  .strict();

export type EmployeeProfileInput = z.infer<typeof zodEmployeeProfileSchema>;

/**
 * Create a new user/employee (Admin only).
 */
const zodCreateUserSchema = z
  .object({
    email: z.string({ message: 'Email is required' }).email({ message: 'Invalid email format' }),
    password: z.string({ message: 'Password is required' }).min(6, { message: 'Password must be at least 6 characters' }),
    role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
    name: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    profile: zodEmployeeProfileSchema.optional(),
  })
  .strict();

export type CreateUserInput = z.infer<typeof zodCreateUserSchema>;

/**
 * Update an existing user/employee (Admin only). Profile fields are merged
 * (upserted) into the employee's profile record.
 */
const zodUpdateUserSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email format' }).optional(),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }).optional(),
    role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
    name: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    isActive: z.boolean().optional(),
    profile: zodEmployeeProfileSchema.partial().optional(),
  })
  .strict();

export type UpdateUserInput = z.infer<typeof zodUpdateUserSchema>;

/**
 * Self-service profile update — deliberately excludes email/role/isActive.
 */
const zodUpdateMeSchema = z
  .object({
    name: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
  })
  .strict();

export type UpdateMeInput = z.infer<typeof zodUpdateMeSchema>;

/**
 * List/search query for GET /users
 */
const zodUserSearchQuerySchema = z
  .object({
    searchKey: z.string().optional(),
    search: z.string().optional(),
    role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    showPerPage: z
      .string()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine((val) => val === undefined || val > 0, { message: 'Show per page must be a positive number' })
      .optional(),
    pageNo: z
      .string()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine((val) => val === undefined || val > 0, { message: 'Page number must be a positive number' })
      .optional(),
  })
  .strict();

export type UserSearchQueryInput = z.infer<typeof zodUserSearchQuerySchema>;

/**
 * GET /users/me/earnings query
 */
const zodEarningsQuerySchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .strict();

export type EarningsQueryInput = z.infer<typeof zodEarningsQuerySchema>;

export const validateCreateUser = validateBody(zodCreateUserSchema);
export const validateUpdateUser = validateBody(zodUpdateUserSchema);
export const validateUpdateMe = validateBody(zodUpdateMeSchema);
export const validateUserSearchQuery = validateQuery(zodUserSearchQuerySchema);
export const validateEarningsQuery = validateQuery(zodEarningsQuerySchema);
