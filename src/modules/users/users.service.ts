import prisma from '../../utils/prisma/prisma-client';
import { TSafeUser } from './users.interface';
import { IdOrIdsInput } from '../../handlers/common-zod-validator';
import HashInfo from '../../utils/bcrypt/hash-info';
import ApiError from '../../utils/errors/api-error';
import { buildPagination, totalPagesOf } from '../../helpers/pagination';
import { computeEarnings, currentMonthRange } from './earnings.util';
import { CreateUserInput, UpdateUserInput, UpdateMeInput, UserSearchQueryInput, EarningsQueryInput } from './users.validation';
import SendEmail from '../../utils/email/send-email';
import { templates } from '../../utils/email/templates';

const sanitize = <T extends { password?: string; refreshTokenHash?: string | null }>(
  user: T,
): Omit<T, 'password' | 'refreshTokenHash'> => {
  const { password, refreshTokenHash, ...safe } = user;
  return safe;
};

/**
 * Create a new user (Admin only). If `profile` is supplied, an
 * EmployeeProfile row is created alongside the user in a single transaction.
 */
const createUser = async (data: CreateUserInput): Promise<Partial<TSafeUser>> => {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) throw ApiError.conflict('Email already exists', 'DUPLICATE_EMAIL');

  const hashedPassword = await HashInfo(data.password);
  const { profile, ...userFields } = data;

  const savedUser = await prisma.user.create({
    data: {
      ...userFields,
      password: hashedPassword,
      ...(profile && {
        employeeProfile: {
          create: {
            hourlyRate: profile.hourlyRate,
            dailyRate: profile.dailyRate,
            payCalculationMode: profile.payCalculationMode,
            overtimeMultiplier: profile.overtimeMultiplier,
            lateGraceMinutes: profile.lateGraceMinutes,
            earlyLeavePenalty: profile.earlyLeavePenalty,
            missingPunchRules: profile.missingPunchRules,
            department: profile.department,
            joinDate: profile.joinDate,
          },
        },
      }),
    },
    include: { employeeProfile: true },
  });

  const result = sanitize(savedUser);

  // Fire-and-forget welcome email (non-blocking)
  SendEmail({
    to: data.email,
    subject: 'Welcome — Your account is ready',
    text: `Welcome ${data.name || data.email}! Your account has been created. Email: ${data.email} | Password: ${data.password}`,
    html: templates.welcomeEmployee({
      name: data.name || '',
      email: data.email,
      password: data.password,
    }),
  }).catch(() => {}); // Silently ignore email errors

  return result;
};

/**
 * Update a user's core fields and/or (upsert) their employee profile.
 */
const updateUser = async (id: IdOrIdsInput['id'], data: UpdateUserInput): Promise<Partial<TSafeUser | null>> => {
  if (!id) return null;

  if (data.email) {
    const existingUser = await prisma.user.findFirst({ where: { email: data.email, NOT: { id } } });
    if (existingUser) throw ApiError.conflict('Email already exists', 'DUPLICATE_EMAIL');
  }

  const { profile, password, ...rest } = data;
  const updateData: Record<string, unknown> = { ...rest };
  if (password) updateData.password = await HashInfo(password);

  if (profile) {
    updateData.employeeProfile = {
      upsert: {
        create: {
          hourlyRate: profile.hourlyRate ?? 0,
          dailyRate: profile.dailyRate,
          payCalculationMode: profile.payCalculationMode,
          overtimeMultiplier: profile.overtimeMultiplier,
          lateGraceMinutes: profile.lateGraceMinutes,
          earlyLeavePenalty: profile.earlyLeavePenalty,
          missingPunchRules: profile.missingPunchRules,
          department: profile.department,
          joinDate: profile.joinDate,
        },
        update: { ...profile },
      },
    };
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    include: { employeeProfile: true },
  });

  return sanitize(updatedUser);
};

/**
 * Hard-delete a user and physically remove the row from the database,
 * along with all user-related data.
 */
const deactivateUser = async (id: IdOrIdsInput['id']): Promise<Partial<TSafeUser | null>> => {
  if (!id) return null;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;

  await prisma.$transaction([
    prisma.taskAssignment.deleteMany({ where: { employeeId: id } }),
    prisma.attendance.deleteMany({ where: { employeeId: id } }),
    prisma.productRequest.deleteMany({ where: { OR: [{ requestedById: id }, { approvedById: id }] } }),
    prisma.stockMovement.deleteMany({ where: { performedById: id } }),
    prisma.task.deleteMany({ where: { OR: [{ createdById: id }, { completedById: id }] } }),
    prisma.employeeProfile.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return sanitize(user);
};

const getUserById = async (id: IdOrIdsInput['id']): Promise<Partial<TSafeUser | null>> => {
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id }, include: { employeeProfile: true } });
  if (!user) return null;
  return sanitize(user);
};

const getManyUser = async (
  query: UserSearchQueryInput,
): Promise<{ users: Partial<TSafeUser>[]; totalData: number; totalPages: number }> => {
  const search = query.search ?? query.searchKey ?? '';
  const { skip, take, showPerPage } = buildPagination(query);

  const where = {
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { name: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(query.role && { role: query.role }),
    ...(query.isActive !== undefined && {
      isActive: typeof query.isActive === 'string' ? query.isActive === 'true' : !!query.isActive,
    }),
  };

  const [totalData, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, skip, take, include: { employeeProfile: true }, orderBy: { createdAt: 'desc' } }),
  ]);

  return { users: users.map(sanitize), totalData, totalPages: totalPagesOf(totalData, showPerPage) };
};

/**
 * GET /users/me — profile + real-time estimated earnings for the current
 * calendar month.
 */
const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { employeeProfile: true } });
  if (!user) throw ApiError.notFound('User not found');

  const { from, to } = currentMonthRange();
  const estimatedEarnings = user.role === 'EMPLOYEE' ? await computeEarnings(userId, from, to) : null;

  return { ...sanitize(user), estimatedEarnings };
};

const updateMe = async (userId: string, data: UpdateMeInput): Promise<Partial<TSafeUser>> => {
  const updated = await prisma.user.update({ where: { id: userId }, data });
  return sanitize(updated);
};

const getMyEarnings = async (userId: string, query: EarningsQueryInput) => {
  const { from, to } = query.from && query.to ? { from: new Date(query.from), to: new Date(query.to) } : currentMonthRange();
  return computeEarnings(userId, from, to);
};

export const userServices = {
  createUser,
  updateUser,
  deactivateUser,
  getUserById,
  getManyUser,
  getMe,
  updateMe,
  getMyEarnings,
};
