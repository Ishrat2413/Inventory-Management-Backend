import { Router } from 'express';
import { createVendor, updateVendor, deleteVendor, getVendorById, getManyVendor } from './vendors.controller';
import { validateCreateVendor, validateUpdateVendor, validateVendorSearchQuery } from './vendors.validation';
import { validateId } from '../../handlers/common-zod-validator';
import isAuthorized from '../../middlewares/is-authorized';
import { checkRoles } from '../../middlewares/check-roles';

const router = Router();

router.use(isAuthorized, checkRoles('ADMIN'));

/** @route GET /api/v1/vendors — List all vendors */
router.get('/', validateVendorSearchQuery, getManyVendor);

/** @route POST /api/v1/vendors — Create vendor */
router.post('/', validateCreateVendor, createVendor);

/** @route GET /api/v1/vendors/:id — Vendor detail */
router.get('/:id', validateId, getVendorById);

/** @route PATCH /api/v1/vendors/:id — Update vendor */
router.patch('/:id', validateId, validateUpdateVendor, updateVendor);

/** @route DELETE /api/v1/vendors/:id — Soft-delete vendor */
router.delete('/:id', validateId, deleteVendor);

module.exports = router;
