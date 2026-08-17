import { Router } from 'express';
import {
  createUser,
  updateUser,
  deactivateUser,
  getUserById,
  getManyUser,
  getMe,
  updateMe,
  getMyEarnings,
  getEmployeePerformanceSummary,
  downloadEmployeeReport,
} from './users.controller';
import { validateCreateUser, validateUpdateUser, validateUpdateMe, validateUserSearchQuery, validateEarningsQuery } from './users.validation';
import { validateId } from '../../handlers/common-zod-validator';
import isAuthorized from '../../middlewares/is-authorized';
import { checkRoles } from '../../middlewares/check-roles';

const router = Router();

// ── Self-service (must be registered before the `/:id` routes) ──

/**
 * @route GET /api/v1/users/me
 * @description Current user profile + real-time estimated earnings
 * @access Private (Employee)
 */
router.get('/me', isAuthorized, getMe);

/**
 * @route PATCH /api/v1/users/me
 * @description Update own basic profile (name, address, phone)
 * @access Private (Employee)
 */
router.patch('/me', isAuthorized, validateUpdateMe, updateMe);

/**
 * @route GET /api/v1/users/me/earnings
 * @description Detailed earnings breakdown (query: from, to)
 * @access Private (Employee)
 */
router.get('/me/earnings', isAuthorized, validateEarningsQuery, getMyEarnings);

// ── Admin management ──

/**
 * @route GET /api/v1/users
 * @description List all users (filters: role, isActive, search)
 * @access Private (Admin)
 */
router.get('/', isAuthorized, checkRoles('ADMIN'), validateUserSearchQuery, getManyUser);

/**
 * @route POST /api/v1/users
 * @description Create new employee (with profile, rates, pay mode)
 * @access Private (Admin)
 */
router.post('/', isAuthorized, checkRoles('ADMIN'), validateCreateUser, createUser);

/**
 * @route GET /api/v1/users/:id
 * @description Get user details + employee profile
 * @access Private (Admin / Self)
 */
router.get('/:id', isAuthorized, validateId, getUserById);

/**
 * @route PATCH /api/v1/users/:id
 * @description Update user / employee profile / rates / rules
 * @access Private (Admin)
 */
router.patch('/:id', isAuthorized, checkRoles('ADMIN'), validateId, validateUpdateUser, updateUser);

/**
 * @route DELETE /api/v1/users/:id
 * @description Soft-delete / deactivate a user
 * @access Private (Admin)
 */
router.delete('/:id', isAuthorized, checkRoles('ADMIN'), validateId, deactivateUser);

/**
 * @route GET /api/v1/users/:id/performance
 * @description Monthly performance summary: tasks, hours, earnings (query: year, month)
 * @access Private (Admin or Self)
 */
router.get('/:id/performance', isAuthorized, validateId, getEmployeePerformanceSummary);

/**
 * @route GET /api/v1/users/:id/report
 * @description Download PDF report (query: year, month — defaults to last month)
 * @access Private (Admin or Self)
 */
router.get('/:id/report', isAuthorized, validateId, downloadEmployeeReport);

module.exports = router;
