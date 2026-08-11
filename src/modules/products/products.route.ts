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

const parseProductMultipart = (req: any, res: any, next: any) => {
  if (req.body) {
    delete req.body.image;
    if (typeof req.body.unitPrice === 'string' && req.body.unitPrice !== '') {
      req.body.unitPrice = Number(req.body.unitPrice);
    }
    if (typeof req.body.currentStock === 'string' && req.body.currentStock !== '') {
      req.body.currentStock = Number(req.body.currentStock);
    }
    if (typeof req.body.lowStockThreshold === 'string' && req.body.lowStockThreshold !== '') {
      req.body.lowStockThreshold = Number(req.body.lowStockThreshold);
    } else if (req.body.lowStockThreshold === '' || req.body.lowStockThreshold === 'null') {
      delete req.body.lowStockThreshold;
    }
    if (typeof req.body.reorderTimeDays === 'string' && req.body.reorderTimeDays !== '') {
      req.body.reorderTimeDays = parseInt(req.body.reorderTimeDays, 10);
    } else if (req.body.reorderTimeDays === '' || req.body.reorderTimeDays === 'null') {
      delete req.body.reorderTimeDays;
    }
    if (typeof req.body.quantityInReorder === 'string' && req.body.quantityInReorder !== '') {
      req.body.quantityInReorder = Number(req.body.quantityInReorder);
    } else if (req.body.quantityInReorder === '' || req.body.quantityInReorder === 'null') {
      delete req.body.quantityInReorder;
    }
    if (typeof req.body.isComposite === 'string') {
      req.body.isComposite = req.body.isComposite === 'true';
    }
    if (typeof req.body.isDiscontinued === 'string') {
      req.body.isDiscontinued = req.body.isDiscontinued === 'true';
    }
    if (typeof req.body.bomItems === 'string' && req.body.bomItems !== '') {
      try {
        req.body.bomItems = JSON.parse(req.body.bomItems);
      } catch (e) {
        req.body.bomItems = undefined;
      }
    } else if (req.body.bomItems === '') {
      req.body.bomItems = undefined;
    }
    if (typeof req.body.customFields === 'string' && req.body.customFields !== '') {
      try {
        req.body.customFields = JSON.parse(req.body.customFields);
      } catch (e) {
        req.body.customFields = {};
      }
    } else if (req.body.customFields === '') {
      req.body.customFields = {};
    }
    if (req.body.vendorId === '' || req.body.vendorId === 'null' || req.body.vendorId === 'undefined') {
      req.body.vendorId = null;
    }
    if (req.body.categoryId === '' || req.body.categoryId === 'null' || req.body.categoryId === 'undefined') {
      req.body.categoryId = null;
    }
  }
  next();
};

const router = Router();

router.use(isAuthorized);

/** @route GET /api/v1/products/low-stock — Admin only. Registered before `/:id`. */
router.get('/low-stock', checkRoles('ADMIN'), getLowStockProducts);

/** @route GET /api/v1/products — Admin, Employee */
router.get('/', validateProductSearchQuery, getManyProduct);

/** @route POST /api/v1/products — Admin only */
router.post('/', checkRoles('ADMIN'), parseProductMultipart, validateCreateProduct, createProduct);

/** @route GET /api/v1/products/:id — Admin, Employee */
router.get('/:id', validateId, getProductById);

/** @route PATCH /api/v1/products/:id — Admin only */
router.patch('/:id', checkRoles('ADMIN'), validateId, parseProductMultipart, validateUpdateProduct, updateProduct);

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
