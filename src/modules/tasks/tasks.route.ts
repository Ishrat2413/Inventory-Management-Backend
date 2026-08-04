import { Router } from 'express';
import { createTask, updateTask, getTaskById, getManyTask, assignEmployees, getTaskRequests, completeTask } from './tasks.controller';
import { validateCreateTask, validateUpdateTask, validateAssignTask, validateTaskSearchQuery } from './tasks.validation';
import { validateId } from '../../handlers/common-zod-validator';
import isAuthorized from '../../middlewares/is-authorized';
import { checkRoles } from '../../middlewares/check-roles';

const router = Router();

router.use(isAuthorized);

/** @route GET /api/v1/tasks — Admin sees all, Employee sees own (created or assigned) */
router.get('/', validateTaskSearchQuery, getManyTask);

/** @route POST /api/v1/tasks — Admin only */
router.post('/', checkRoles('ADMIN'), validateCreateTask, createTask);

/** @route GET /api/v1/tasks/:id — Admin / Assigned */
router.get('/:id', validateId, getTaskById);

/** @route PATCH /api/v1/tasks/:id — Admin / Assigned */
router.patch('/:id', validateId, validateUpdateTask, updateTask);

/** @route POST /api/v1/tasks/:id/complete — Assigned / Admin */
router.post('/:id/complete', validateId, completeTask);

/** @route POST /api/v1/tasks/:id/assign — Admin only */
router.post('/:id/assign', checkRoles('ADMIN'), validateId, validateAssignTask, assignEmployees);

/** @route GET /api/v1/tasks/:id/requests — Admin / Assigned */
router.get('/:id/requests', validateId, getTaskRequests);

module.exports = router;
