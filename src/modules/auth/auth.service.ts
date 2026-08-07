import prisma from '../../utils/prisma/prisma-client';
import HashInfo from '../../utils/bcrypt/hash-info';
import compareInfo from '../../utils/bcrypt/compare-info';
import EncodeToken from '../../utils/jwt/encode-token';
import EncodeRefreshToken from '../../utils/jwt/encode-refresh-token';
import DecodeRefreshToken from '../../utils/jwt/decode-refresh-token';
import ApiError from '../../utils/errors/api-error';
import { LoginInput, ChangePasswordInput, ForgotPasswordInput, ResetPasswordInput, RegisterInput } from './auth.validation';
import SendEmail from '../../utils/email/send-email';
import { templates } from '../../utils/email/templates';
import jwt from 'jsonwebtoken';
import config from '../../config/config';

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
  console.log('[Login] Received request for email:', data.email);
  const user = await prisma.user.findUnique({ where: { email: data.email }, include: { employeeProfile: true } });
  console.log('[Login] User lookup complete. User found:', !!user);
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

  console.log('[Login] Comparing password hashes...');
  const isPasswordMatch = await compareInfo(data.password, user.password);
  console.log('[Login] Password match result:', isPasswordMatch);
  if (!isPasswordMatch) throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

  console.log('[Login] Issuing access and refresh tokens...');
  const { accessToken, refreshToken } = await issueTokens(user.id, user.email, user.role);
  console.log('[Login] Tokens successfully issued.');

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

const forgotPassword = async (data: ForgotPasswordInput) => {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw ApiError.notFound('No user found with this email');

  const token = jwt.sign({ id: user.id, purpose: 'reset-password' }, config.JWT_SECRET, { expiresIn: '30m' });
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  // Non-blocking fire-and-forget email sending
  SendEmail({
    to: user.email,
    subject: 'Reset your Workspace Password',
    text: `Reset your password by visiting: ${resetUrl}`,
    html: templates.forgotPassword({
      name: user.name || '',
      resetUrl,
    }),
  }).catch(() => {});

  return { message: 'Reset email sent successfully' };
};

const resetPassword = async (data: ResetPasswordInput) => {
  try {
    const decoded = jwt.verify(data.token, config.JWT_SECRET) as { id: string; purpose?: string };
    if (!decoded || decoded.purpose !== 'reset-password') {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) throw ApiError.notFound('User not found');

    const hashedPassword = await HashInfo(data.password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        refreshTokenHash: null, // Invalidate all logins
      },
    });

    return { message: 'Password has been reset successfully' };
  } catch (err) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }
};

const registerUser = async (data: RegisterInput) => {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) throw ApiError.conflict('Email already exists', 'DUPLICATE_EMAIL');

  const hashedPassword = await HashInfo(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      phone: data.phone,
      role: 'EMPLOYEE',
      isActive: true,
    },
  });

  const result = sanitize(user);

  // Send welcome email (non-blocking)
  SendEmail({
    to: user.email,
    subject: 'Welcome to Workspace!',
    text: `Welcome! Your employee account under ${user.email} is active.`,
    html: templates.welcomeSignup({
      name: user.name || '',
      email: user.email,
    }),
  }).catch(() => {});

  return result;
};

export const authServices = {
  loginUser,
  refreshTokens,
  logoutUser,
  changePassword,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  registerUser,
};
