import prisma from '../../utils/prisma/prisma-client';
import ApiError from '../../utils/errors/api-error';
import { buildPagination, totalPagesOf } from '../../helpers/pagination';
import { computeEarnings } from '../users/earnings.util';
import { getConfigValue } from '../config/config.service';
import { CheckInInput, CheckOutInput, AttendanceSearchQueryInput, OverrideAttendanceInput, UpdateAttendanceInput } from './attendance.validation';

/**
 * Documented assumption: since the README/API spec doesn't define an
 * explicit "standard shift" system config, a 09:00–18:00 shift is assumed
 * for late/early-leave calculation. Swap these for real SystemConfig keys
 * (e.g. `shift_start_hour`) once the business defines them.
 */
const SHIFT_START_HOUR = 9;
const SHIFT_END_HOUR = 18;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const checkIn = async (employeeId: string, data: CheckInInput) => {
  const timestamp = data.timestamp ?? new Date();
  const date = startOfDay(timestamp);

  const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date } } });
  if (existing?.checkIn) throw ApiError.conflict('Already checked in today', 'ALREADY_CHECKED_IN');

  const profile = await prisma.employeeProfile.findUnique({ where: { userId: employeeId } });
  const graceMinutes = profile?.lateGraceMinutes ?? Number((await getConfigValue('default_late_grace_minutes')) ?? 10);

  const shiftStart = new Date(date);
  shiftStart.setHours(SHIFT_START_HOUR, 0, 0, 0);
  const lateMinutes = Math.max(0, Math.round((timestamp.getTime() - shiftStart.getTime()) / 60000) - graceMinutes);

  if (existing) {
    return prisma.attendance.update({ where: { id: existing.id }, data: { checkIn: timestamp, source: data.source, lateMinutes } });
  }

  return prisma.attendance.create({ data: { employeeId, date, checkIn: timestamp, source: data.source, lateMinutes } });
};

const checkOut = async (employeeId: string, data: CheckOutInput) => {
  const timestamp = data.timestamp ?? new Date();
  const date = startOfDay(timestamp);

  const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date } } });
  if (!existing || !existing.checkIn) throw ApiError.badRequest('You must check in before checking out', 'NOT_CHECKED_IN');
  if (existing.checkOut) throw ApiError.conflict('Already checked out today', 'ALREADY_CHECKED_OUT');

  const calculatedHours = Number(((timestamp.getTime() - existing.checkIn.getTime()) / 3_600_000).toFixed(2));

  const shiftEnd = new Date(date);
  shiftEnd.setHours(SHIFT_END_HOUR, 0, 0, 0);
  const earlyMinutes = Math.max(0, Math.round((shiftEnd.getTime() - timestamp.getTime()) / 60000));

  return prisma.attendance.update({
    where: { id: existing.id },
    data: { checkOut: timestamp, calculatedHours, earlyMinutes },
  });
};

const getManyAttendance = async (query: AttendanceSearchQueryInput, requester: { id: string; role: string }) => {
  const { skip, take, showPerPage } = buildPagination(query);

  const where: Record<string, unknown> = {
    ...((query.from || query.to) && {
      date: {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      },
    }),
  };

  if (requester.role === 'ADMIN') {
    if (query.employeeId) where.employeeId = query.employeeId;
  } else {
    where.employeeId = requester.id;
  }

  const [totalData, records] = await prisma.$transaction([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      skip,
      take,
      include: { employee: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    }),
  ]);

  return { records, totalData, totalPages: totalPagesOf(totalData, showPerPage) };
};

/** GET /attendance/me/today — today's status + estimated pay so far. */
const getMyTodayStatus = async (employeeId: string) => {
  const date = startOfDay(new Date());
  const record = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date } } });

  const profile = await prisma.employeeProfile.findUnique({ where: { userId: employeeId } });
  const hourlyRate = profile ? Number(profile.hourlyRate) : 0;

  let hoursSoFar = 0;
  if (record?.checkIn) {
    const end = record.checkOut ?? new Date();
    hoursSoFar = Number(((end.getTime() - record.checkIn.getTime()) / 3_600_000).toFixed(2));
  }

  const { totalEstimatedPay } = await computeEarnings(employeeId, date, date);

  return {
    date: date.toISOString().slice(0, 10),
    checkedIn: !!record?.checkIn,
    checkedOut: !!record?.checkOut,
    checkIn: record?.checkIn ?? null,
    checkOut: record?.checkOut ?? null,
    hoursSoFar,
    hourlyRate,
    estimatedPaySoFar: record?.checkOut ? totalEstimatedPay : Number((hoursSoFar * hourlyRate).toFixed(2)),
  };
};

/** Admin manual create/edit of an attendance record. */
const overrideAttendance = async (data: OverrideAttendanceInput, overriddenById: string) => {
  const date = startOfDay(data.date);
  const calculatedHours =
    data.checkIn && data.checkOut ? Number(((data.checkOut.getTime() - data.checkIn.getTime()) / 3_600_000).toFixed(2)) : undefined;

  return prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: data.employeeId, date } },
    create: {
      employeeId: data.employeeId,
      date,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      calculatedHours,
      notes: data.notes,
      source: 'MANUAL',
      isOverride: true,
      overriddenById,
    },
    update: {
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      calculatedHours,
      notes: data.notes,
      isOverride: true,
      overriddenById,
    },
  });
};

const updateAttendance = async (id: string, data: UpdateAttendanceInput, overriddenById: string) => {
  const existing = await prisma.attendance.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Attendance record not found');

  const checkIn = data.checkIn ?? existing.checkIn;
  const checkOut = data.checkOut ?? existing.checkOut;
  const calculatedHours = checkIn && checkOut ? Number(((checkOut.getTime() - checkIn.getTime()) / 3_600_000).toFixed(2)) : existing.calculatedHours;

  return prisma.attendance.update({
    where: { id },
    data: { ...data, calculatedHours, isOverride: true, overriddenById },
  });
};

export const attendanceServices = { checkIn, checkOut, getManyAttendance, getMyTodayStatus, overrideAttendance, updateAttendance };
