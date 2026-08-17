import prisma from '../../utils/prisma/prisma-client';
import { computeEarnings } from './earnings.util';

export interface PerformanceSummary {
  userId: string;
  period: { year: number; month: number; from: string; to: string };
  tasks: {
    assigned: number;
    completed: number;
    inProgress: number;
    pending: number;
    cancelled: number;
    completionRate: number;
    completedTaskDates: string[]; // ISO dates of completed tasks in the period
  };
  attendance: {
    daysWorked: number;
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
  };
  earnings: {
    regularPay: number;
    overtimePay: number;
    totalEstimatedPay: number;
    hourlyRate: number;
    dailyRate: number;
    estimatedDailyIncome: number; // totalPay / daysWorked
    payCalculationMode: string;
    currency: string;
  };
}

const monthRange = (year: number, month: number) => {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to   = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  return { from, to };
};

export const getEmployeePerformance = async (
  userId: string,
  year: number,
  month: number,
): Promise<PerformanceSummary> => {
  const { from, to } = monthRange(year, month);

  // ── Tasks ──────────────────────────────────────────────────────────────
  const assignments = await prisma.taskAssignment.findMany({
    where: {
      employeeId: userId,
      task: { createdAt: { gte: from, lte: to } },
    },
    include: {
      task: { select: { status: true, updatedAt: true } },
    },
  });

  const completedAssignments = assignments.filter((a) => a.task.status === 'COMPLETED');

  const taskCounts = {
    assigned:           assignments.length,
    completed:          completedAssignments.length,
    inProgress:         assignments.filter((a) => a.task.status === 'IN_PROGRESS').length,
    pending:            assignments.filter((a) => a.task.status === 'PENDING').length,
    cancelled:          assignments.filter((a) => a.task.status === 'CANCELLED').length,
    completionRate:     0,
    completedTaskDates: completedAssignments.map((a) => a.task.updatedAt.toISOString().slice(0, 10)),
  };
  taskCounts.completionRate =
    taskCounts.assigned > 0
      ? Math.round((taskCounts.completed / taskCounts.assigned) * 100)
      : 0;

  // ── Attendance + Earnings ──────────────────────────────────────────────
  const earnings = await computeEarnings(userId, from, to);

  const profile = await prisma.employeeProfile.findUnique({ where: { userId } });

  const hourlyRate = profile ? Number(profile.hourlyRate) : 0;
  const dailyRate  = profile?.dailyRate ? Number(profile.dailyRate) : hourlyRate * 8;
  const daysWorked = earnings.daysWorked;
  const estimatedDailyIncome = daysWorked > 0
    ? Number((earnings.totalEstimatedPay / daysWorked).toFixed(2))
    : 0;

  return {
    userId,
    period: {
      year,
      month,
      from: from.toISOString().slice(0, 10),
      to:   to.toISOString().slice(0, 10),
    },
    tasks: taskCounts,
    attendance: {
      daysWorked,
      totalHours:    Number((earnings.regularHours + earnings.overtimeHours).toFixed(2)),
      regularHours:  earnings.regularHours,
      overtimeHours: earnings.overtimeHours,
    },
    earnings: {
      regularPay:           earnings.regularPay,
      overtimePay:          earnings.overtimePay,
      totalEstimatedPay:    earnings.totalEstimatedPay,
      hourlyRate,
      dailyRate,
      estimatedDailyIncome,
      payCalculationMode:   earnings.payCalculationMode,
      currency:             earnings.currency,
    },
  };
};
