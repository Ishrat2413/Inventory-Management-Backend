import { Router } from 'express';
import { createMovement, consumeProduct, assembleProduct, getManyMovement, getMovementsForProduct } from './stock-movements.controller';
import { validateCreateMovement, validateConsume, validateAssemble, validateMovementSearchQuery } from './stock-movements.validation';
import isAuthorized from '../../middlewares/is-authorized';
import { checkRoles } from '../../middlewares/check-roles';

const router = Router();

router.use(isAuthorized, checkRoles('ADMIN'));

/** @route GET /api/v1/stock-movements — List movements (filters: productId, type, taskId, from, to) */
router.get('/', validateMovementSearchQuery, getManyMovement);

/** @route POST /api/v1/stock-movements — Create manual movement (PURCHASE / ADJUSTMENT / WRITE_OFF / RETURN) */
router.post('/', validateCreateMovement, createMovement);

/** @route POST /api/v1/stock-movements/consume — Consume product(s), auto-exploding BOM if composite */
router.post('/consume', validateConsume, consumeProduct);

/** @route POST /api/v1/stock-movements/assemble — Assemble compound product manually from components */
router.post('/assemble', validateAssemble, assembleProduct);

/** @route GET /api/v1/stock-movements/product/:productId — Full movement history of one product */
router.get('/product/:productId', getMovementsForProduct);

module.exports = router;
