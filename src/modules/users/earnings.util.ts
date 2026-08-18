import prisma from '../../utils/prisma/prisma-client';

const STANDARD_DAILY_HOURS = 8;

export interface EarningsBreakdown {
  from: string;
  to: string;
  daysWorked: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalEstimatedPay: number;
  payCalculationMode: string;
  currency: string;
}

/**
 * Calculates real-time estimated earnings for an employee over a date
 * range, based on their attendance records and pay configuration.
 *
 * Business rule (documented assumption, since not fully specified):
 * - HOURLY mode: every clocked hour is paid at `hourlyRate`; any hours
 *   beyond `STANDARD_DAILY_HOURS` on a given day are paid at
 *   `hourlyRate * overtimeMultiplier`.
 * - DAILY_PLUS_OVERTIME mode: each day worked earns the flat `dailyRate`
 *   (covering the first `STANDARD_DAILY_HOURS`); hours beyond that are
 *   paid at `hourlyRate * overtimeMultiplier`.
 */
export const computeEarnings = async (
  employeeId: string,
  from: Date,
  to: Date,
): Promise<EarningsBreakdown> => {
  const profile = await prisma.employeeProfile.findUnique({ where: { userId: employeeId } });

  const hourlyRate = profile ? Number(profile.hourlyRate) : 0;
  const dailyRate = profile?.dailyRate ? Number(profile.dailyRate) : hourlyRate * STANDARD_DAILY_HOURS;
  const overtimeMultiplier = profile ? Number(profile.overtimeMultiplier) : 1.5;
  const mode = profile?.payCalculationMode ?? 'HOURLY';

  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId,
      date: { gte: from, lte: to },
      calculatedHours: { not: null },
    },
  });

  let regularHours = 0;
  let overtimeHours = 0;
  let regularPay = 0;
  let overtimePay = 0;

  for (const record of attendances) {
    const hours = Number(record.calculatedHours ?? 0);
    const regular = Math.min(hours, STANDARD_DAILY_HOURS);
    const overtime = Math.max(hours - STANDARD_DAILY_HOURS, 0);

    regularHours += regular;
    overtimeHours += overtime;
    overtimePay += overtime * hourlyRate * overtimeMultiplier;

    if (mode === 'DAILY_PLUS_OVERTIME') {
      regularPay += hours > 0 ? dailyRate : 0;
    } else {
      regularPay += regular * hourlyRate;
    }
  }

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    daysWorked: attendances.filter((a: { calculatedHours: unknown }) => Number(a.calculatedHours ?? 0) > 0).length,
    regularHours: Number(regularHours.toFixed(2)),
    overtimeHours: Number(overtimeHours.toFixed(2)),
    regularPay: Number(regularPay.toFixed(2)),
    overtimePay: Number(overtimePay.toFixed(2)),
    totalEstimatedPay: Number((regularPay + overtimePay).toFixed(2)),
    payCalculationMode: mode,
    currency: 'BDT',
  };
};

/** Default period: the current calendar month. */
export const currentMonthRange = (): { from: Date; to: Date } => {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
  return { from, to };
};
