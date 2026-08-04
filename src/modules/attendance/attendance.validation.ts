import { z } from 'zod';
import { validateBody, validateQuery } from '../../handlers/zod-error-handler';

const zodCheckInSchema = z
  .object({
    source: z.enum(['FINGERPRINT', 'MANUAL']).optional().default('FINGERPRINT'),
    timestamp: z.coerce.date().optional(),
  })
  .strict();

export type CheckInInput = z.infer<typeof zodCheckInSchema>;

const zodCheckOutSchema = z
  .object({
    source: z.enum(['FINGERPRINT', 'MANUAL']).optional().default('FINGERPRINT'),
    timestamp: z.coerce.date().optional(),
  })
  .strict();

export type CheckOutInput = z.infer<typeof zodCheckOutSchema>;

const zodAttendanceSearchQuerySchema = z
  .object({
    employeeId: z.string().uuid().optional(),
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

export type AttendanceSearchQueryInput = z.infer<typeof zodAttendanceSearchQuerySchema>;

const zodOverrideAttendanceSchema = z
  .object({
    employeeId: z.string({ message: 'employeeId is required' }).uuid(),
    date: z.coerce.date({ message: 'date is required' }),
    checkIn: z.coerce.date().optional(),
    checkOut: z.coerce.date().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type OverrideAttendanceInput = z.infer<typeof zodOverrideAttendanceSchema>;

const zodUpdateAttendanceSchema = z
  .object({
    checkIn: z.coerce.date().optional(),
    checkOut: z.coerce.date().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type UpdateAttendanceInput = z.infer<typeof zodUpdateAttendanceSchema>;

export const validateCheckIn = validateBody(zodCheckInSchema);
export const validateCheckOut = validateBody(zodCheckOutSchema);
export const validateAttendanceSearchQuery = validateQuery(zodAttendanceSearchQuerySchema);
export const validateOverrideAttendance = validateBody(zodOverrideAttendanceSchema);
export const validateUpdateAttendance = validateBody(zodUpdateAttendanceSchema);
