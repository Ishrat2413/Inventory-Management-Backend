import { User, EmployeeProfile } from '@prisma/client';

/**
 * Full user row as stored in the database (includes password hash).
 * Internal use only — never returned directly from a controller.
 */
export type TUser = User;

/**
 * Employee profile (pay rates, department, etc.)
 */
export type TEmployeeProfile = EmployeeProfile;

/**
 * User safe to expose over the API — password & refresh token hash stripped.
 */
export type TSafeUser = Omit<TUser, 'password' | 'refreshTokenHash'> & {
  employeeProfile?: TEmployeeProfile | null;
};
