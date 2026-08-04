import prisma from '../../utils/prisma/prisma-client';
import HashInfo from '../../utils/bcrypt/hash-info';
import compareInfo from '../../utils/bcrypt/compare-info';
import EncodeToken from '../../utils/jwt/encode-token';
import EncodeRefreshToken from '../../utils/jwt/encode-refresh-token';
import DecodeRefreshToken from '../../utils/jwt/decode-refresh-token';
import ApiError from '../../utils/errors/api-error';
import { LoginInput, ChangePasswordInput } from './auth.validation';

const sanitize = <T extends { password?: string; refreshTokenHash?: string | null }>(user: T) => {
  const { password, refreshTokenHash, ...safe } = user;
  return safe;
};

/**
 * Issues a fresh access + refresh token pair for a user and persists the
 * hashed refresh token so it can be validated (and revoked) later.
 */
const issueTokens = async (userId: string, email: string, role: string) => {
  const accessToken = await EncodeToken(email, userId, role);
  const refreshToken = await EncodeRefreshToken(userId);
  const refreshTokenHash = await HashInfo(refreshToken);

  await prisma.user.update({ where: { id: userId }, data: { refreshTokenHash, lastLogin: new Date() } });

  return { accessToken, refreshToken };
};

const loginUser = async (data: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email: data.email }, include: { employeeProfile: true } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

  const isPasswordMatch = await compareInfo(data.password, user.password);
  if (!isPasswordMatch) throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

  const { accessToken, refreshToken } = await issueTokens(user.id, user.email, user.role);

  return { user: sanitize(user), accessToken, refreshToken };
};

/**
 * Rotates the refresh token: verifies the presented token's signature AND
 * that its hash still matches what's stored for that user (so a logged-out
 * / revoked token can never be replayed), then issues a brand new pair.
 */
const refreshTokens = async (refreshToken: string) => {
  const decoded = await DecodeRefreshToken(refreshToken);
  if (!decoded || typeof decoded === 'string') throw ApiError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');

  const userId = (decoded as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive || !user.refreshTokenHash) {
    throw ApiError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const isValid = await compareInfo(refreshToken, user.refreshTokenHash);
  if (!isValid) throw ApiError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');

  const { accessToken, refreshToken: newRefreshToken } = await issueTokens(user.id, user.email, user.role);
  return { accessToken, refreshToken: newRefreshToken };
};

/** Invalidates the stored refresh token so it can no longer be used. */
const logoutUser = async (userId: string) => {
  await prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
};

const changePassword = async (userId: string, data: ChangePasswordInput) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');

  const isValid = await compareInfo(data.currentPassword, user.password);
  if (!isValid) throw ApiError.badRequest('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');

  const newHash = await HashInfo(data.newPassword);
  // Changing the password also invalidates any existing refresh token.
  await prisma.user.update({ where: { id: userId }, data: { password: newHash, refreshTokenHash: null } });
};

const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { employeeProfile: true } });
  if (!user) throw ApiError.notFound('User not found');
  return sanitize(user);
};

export const authServices = {
  loginUser,
  refreshTokens,
  logoutUser,
  changePassword,
  getCurrentUser,
};
