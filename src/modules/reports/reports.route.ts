import { Router } from 'express';
import {
  getMonthlyReport,
  getSpendingReport,
  getCOGSReport,
  getInventoryValueReport,
  getLowStockReport,
  generateMonthlyReport,
  getStoredMonthlyReport,
} from './reports.controller';
import { validateMonthlyQuery, validateDateRangeQuery, validateGenerateMonthly, validateMonthlyParams } from './reports.validation';
import isAuthorized from '../../middlewares/is-authorized';
import { checkRoles } from '../../middlewares/check-roles';

const router = Router();

router.use(isAuthorized, checkRoles('ADMIN'));

/** @route GET /api/v1/reports/monthly — On-demand monthly report (query: year, month) */
router.get('/monthly', validateMonthlyQuery, getMonthlyReport);

/** @route GET /api/v1/reports/spending — Expenditure + COGS summary (query: from, to) */
router.get('/spending', validateDateRangeQuery, getSpendingReport);

/** @route GET /api/v1/reports/cogs — Detailed COGS by product (query: from, to) */
router.get('/cogs', validateDateRangeQuery, getCOGSReport);

/** @route GET /api/v1/reports/inventory-value — Current total inventory value */
router.get('/inventory-value', getInventoryValueReport);

/** @route GET /api/v1/reports/low-stock — Low stock + negative stock with days negative */
router.get('/low-stock', getLowStockReport);

/** @route POST /api/v1/reports/generate-monthly — Force generate & store monthly snapshot */
router.post('/generate-monthly', validateGenerateMonthly, generateMonthlyReport);

/** @route GET /api/v1/reports/monthly/:year/:month — Get previously generated monthly snapshot */
router.get('/monthly/:year/:month', validateMonthlyParams, getStoredMonthlyReport);

module.exports = router;
