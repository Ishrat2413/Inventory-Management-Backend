import { Request, Response } from 'express';
import { authServices } from './auth.service';
import ServerResponse from '../../helpers/responses/custom-response';
import catchAsync from '../../utils/catch-async/catch-async';
import config from '../../config/config';
import ApiError from '../../utils/errors/api-error';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  maxAge: config.REFRESH_TOKEN_EXPIRATION_TIME * 1000,
};

/** POST /auth/login */
export const loginUser = catchAsync(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authServices.loginUser(req.body);

  res.cookie('token', `Bearer ${accessToken}`, { httpOnly: true, secure: config.NODE_ENV === 'production', maxAge: config.JWT_EXPIRATION_TIME * 1000 });
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);

  ServerResponse(res, true, 200, 'Login successful', { user, accessToken, refreshToken });
});

/** POST /auth/refresh */
export const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.body?.refreshToken || req.cookies?.refreshToken;
  if (!token) throw ApiError.badRequest('refreshToken is required');
  const { accessToken, refreshToken: newRefreshToken } = await authServices.refreshTokens(token);

  res.cookie('token', `Bearer ${accessToken}`, { httpOnly: true, secure: config.NODE_ENV === 'production', maxAge: config.JWT_EXPIRATION_TIME * 1000 });
  res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTS);

  ServerResponse(res, true, 200, 'Token refreshed successfully', { accessToken, refreshToken: newRefreshToken });
});

/** POST /auth/logout */
export const logoutUser = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (req.user?.id) await authServices.logoutUser(req.user.id);

  res.clearCookie('token');
  res.clearCookie('refreshToken');
  ServerResponse(res, true, 200, 'Logout successful');
});

/** POST /auth/change-password */
export const changePassword = catchAsync(async (req: AuthedRequest, res: Response) => {
  await authServices.changePassword(req.user!.id, req.body);
  ServerResponse(res, true, 200, 'Password changed successfully');
});

/** GET /auth/me */
export const getMe = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await authServices.getCurrentUser(req.user!.id);
  ServerResponse(res, true, 200, 'Current user retrieved successfully', result);
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await authServices.forgotPassword(req.body);
  ServerResponse(res, true, 200, result.message);
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await authServices.resetPassword(req.body);
  ServerResponse(res, true, 200, result.message);
});

export const registerUser = catchAsync(async (req: Request, res: Response) => {
  const result = await authServices.registerUser(req.body);
  ServerResponse(res, true, 201, 'User registered successfully', result);
});
