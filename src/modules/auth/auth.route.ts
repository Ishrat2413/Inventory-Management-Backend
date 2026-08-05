import { Router } from 'express';
import { loginUser, refreshToken, logoutUser, changePassword, getMe, forgotPassword, resetPassword, registerUser } from './auth.controller';
import { validateLogin, validateRefresh, validateChangePassword, validateForgotPassword, validateResetPassword, validateRegister } from './auth.validation';
import isAuthorized from '../../middlewares/is-authorized';

const router = Router();

/**
 * @route POST /api/v1/auth/login
 * @description Login with email + password. Returns accessToken + refreshToken
 * @access Public
 */
router.post('/login', validateLogin, loginUser);

/**
 * @route POST /api/v1/auth/refresh
 * @description Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh', validateRefresh, refreshToken);

/**
 * @route POST /api/v1/auth/logout
 * @description Invalidate refresh token
 * @access Private
 */
router.post('/logout', isAuthorized, logoutUser);

/**
 * @route POST /api/v1/auth/change-password
 * @description Change own password
 * @access Private
 */
router.post('/change-password', isAuthorized, validateChangePassword, changePassword);

/**
 * @route GET /api/v1/auth/me
 * @description Get current authenticated user + profile
 * @access Private
 */
router.get('/me', isAuthorized, getMe);

/**
 * @route POST /api/v1/auth/forgot-password
 * @description Request a password reset link
 * @access Public
 */
router.post('/forgot-password', validateForgotPassword, forgotPassword);

/**
 * @route POST /api/v1/auth/reset-password
 * @description Reset password using signed reset token
 * @access Public
 */
router.post('/reset-password', validateResetPassword, resetPassword);

/**
 * @route POST /api/v1/auth/register
 * @description Register a new user
 * @access Public
 */
router.post('/register', validateRegister, registerUser);

module.exports = router;

