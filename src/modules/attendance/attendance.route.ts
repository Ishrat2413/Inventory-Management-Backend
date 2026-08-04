import { Router } from 'express';
import { checkIn, checkOut, getManyAttendance, getMyTodayStatus, overrideAttendance, updateAttendance } from './attendance.controller';
import { validateCheckIn, validateCheckOut, validateAttendanceSearchQuery, validateOverrideAttendance, validateUpdateAttendance } from './attendance.validation';
import { validateId } from '../../handlers/common-zod-validator';
import isAuthorized from '../../middlewares/is-authorized';
import { checkRoles } from '../../middlewares/check-roles';

const router = Router();

router.use(isAuthorized);

/** @route POST /api/v1/attendance/check-in — Employee / Device */
router.post('/check-in', validateCheckIn, checkIn);

/** @route POST /api/v1/attendance/check-out — Employee / Device */
router.post('/check-out', validateCheckOut, checkOut);

/** @route GET /api/v1/attendance/me/today — Employee */
router.get('/me/today', getMyTodayStatus);

/** @route GET /api/v1/attendance — Admin / Employee (own) */
router.get('/', validateAttendanceSearchQuery, getManyAttendance);

/** @route POST /api/v1/attendance/override — Admin only */
router.post('/override', checkRoles('ADMIN'), validateOverrideAttendance, overrideAttendance);

/** @route PATCH /api/v1/attendance/:id — Admin only */
router.patch('/:id', checkRoles('ADMIN'), validateId, validateUpdateAttendance, updateAttendance);

module.exports = router;
