import { z } from 'zod';
import { validateBody } from '../../handlers/zod-error-handler';

/**
 * Zod schema for login credentials.
 */
const zodLoginSchema = z
  .object({
    email: z.string({ message: 'Email is required' }).email({ message: 'Invalid email format' }),
    password: z.string({ message: 'Password is required' }),
  })
  .strict();

export type LoginInput = z.infer<typeof zodLoginSchema>;

/**
 * Zod schema for refreshing an access token.
 */
const zodRefreshSchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
  })
  .strict();

export type RefreshInput = z.infer<typeof zodRefreshSchema>;

/**
 * Zod schema for changing your own password.
 */
const zodChangePasswordSchema = z
  .object({
    currentPassword: z.string({ message: 'currentPassword is required' }),
    newPassword: z.string({ message: 'newPassword is required' }).min(6, { message: 'Password must be at least 6 characters' }),
  })
  .strict();

export type ChangePasswordInput = z.infer<typeof zodChangePasswordSchema>;

export const validateLogin = validateBody(zodLoginSchema);
export const validateRefresh = validateBody(zodRefreshSchema);
export const validateChangePassword = validateBody(zodChangePasswordSchema);
