import { Router } from 'express';
import isAuthorized from '../../middlewares/is-authorized';
import { checkRoles } from '../../middlewares/check-roles';
import * as categoryController from './categories.controller';

const router = Router();

router.use(isAuthorized);

// GET /categories — list all (any authenticated user)
router.get('/', categoryController.getManyCategories);

// GET /categories/:id
router.get('/:id', categoryController.getCategoryById);

// POST /categories — admin only
router.post('/', checkRoles('ADMIN'), categoryController.createCategory);

// PATCH /categories/:id — admin only
router.patch('/:id', checkRoles('ADMIN'), categoryController.updateCategory);

// DELETE /categories/:id — admin only
router.delete('/:id', checkRoles('ADMIN'), categoryController.deleteCategory);

module.exports = router;
