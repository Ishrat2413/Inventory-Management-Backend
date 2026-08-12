import { Router } from 'express';
import { createRequest, getRequestById, getManyRequest, updateRequestStatus, issueRequest, getBOMPreview } from './product-requests.controller';
import { validateCreateRequest, validateUpdateRequestStatus, validateRequestSearchQuery } from './product-requests.validation';
import { validateId } from '../../handlers/common-zod-validator';
import isAuthorized from '../../middlewares/is-authorized';
import { checkRoles } from '../../middlewares/check-roles';

const router = Router();

router.use(isAuthorized);

/** @route GET /api/v1/product-requests/bom-preview?productId=&quantity= — Any authenticated user */
router.get('/bom-preview', getBOMPreview);

/** @route GET /api/v1/product-requests — Admin sees all, Employee sees own */
router.get('/', validateRequestSearchQuery, getManyRequest);

/** @route POST /api/v1/product-requests — Employee creates a request */
router.post('/', checkRoles('EMPLOYEE'), validateCreateRequest, createRequest);

/** @route GET /api/v1/product-requests/:id — Admin / Owner */
router.get('/:id', validateId, getRequestById);

/** @route PATCH /api/v1/product-requests/:id — Admin approves/rejects */
router.patch('/:id', checkRoles('ADMIN'), validateId, validateUpdateRequestStatus, updateRequestStatus);

/** @route POST /api/v1/product-requests/:id/issue — Admin issues approved quantity */
router.post('/:id/issue', checkRoles('ADMIN'), validateId, issueRequest);

module.exports = router;
