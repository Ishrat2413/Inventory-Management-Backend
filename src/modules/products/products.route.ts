import { Router } from 'express';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getManyProduct,
  getLowStockProducts,
  getProductBOM,
  replaceProductBOM,
  addOrUpdateCustomField,
  removeCustomField,
} from './products.controller';
import {
  validateCreateProduct,
  validateUpdateProduct,
  validateProductSearchQuery,
  validateReplaceBOM,
  validateCustomField,
} from './products.validation';
import { validateId } from '../../handlers/common-zod-validator';
import isAuthorized from '../../middlewares/is-authorized';
import { checkRoles } from '../../middlewares/check-roles';

const router = Router();

router.use(isAuthorized);

/** @route GET /api/v1/products/low-stock — Admin only. Registered before `/:id`. */
router.get('/low-stock', checkRoles('ADMIN'), getLowStockProducts);

/** @route GET /api/v1/products — Admin, Employee */
router.get('/', validateProductSearchQuery, getManyProduct);

/** @route POST /api/v1/products — Admin only */
router.post('/', checkRoles('ADMIN'), validateCreateProduct, createProduct);

/** @route GET /api/v1/products/:id — Admin, Employee */
router.get('/:id', validateId, getProductById);

/** @route PATCH /api/v1/products/:id — Admin only */
router.patch('/:id', checkRoles('ADMIN'), validateId, validateUpdateProduct, updateProduct);

/** @route DELETE /api/v1/products/:id — Admin only */
router.delete('/:id', checkRoles('ADMIN'), validateId, deleteProduct);

/** @route GET /api/v1/products/:id/bom — Admin, Employee */
router.get('/:id/bom', validateId, getProductBOM);

/** @route PUT /api/v1/products/:id/bom — Admin only */
router.put('/:id/bom', checkRoles('ADMIN'), validateId, validateReplaceBOM, replaceProductBOM);

/** @route POST /api/v1/products/:id/custom-fields — Admin only */
router.post('/:id/custom-fields', checkRoles('ADMIN'), validateId, validateCustomField, addOrUpdateCustomField);

/** @route DELETE /api/v1/products/:id/custom-fields/:key — Admin only */
router.delete('/:id/custom-fields/:key', checkRoles('ADMIN'), validateId, removeCustomField);

module.exports = router;
