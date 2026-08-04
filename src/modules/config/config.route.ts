import { Router } from 'express';
import { getAllConfigs, getConfigByKey, updateConfigs } from './config.controller';
import { validateUpdateConfig } from './config.validation';
import isAuthorized from '../../middlewares/is-authorized';
import { checkRoles } from '../../middlewares/check-roles';

const router = Router();

router.use(isAuthorized, checkRoles('ADMIN'));

/** @route GET /api/v1/config — Get all system configs */
router.get('/', getAllConfigs);

/** @route PATCH /api/v1/config — Update one or more configs */
router.patch('/', validateUpdateConfig, updateConfigs);

/** @route GET /api/v1/config/:key — Get single config value */
router.get('/:key', getConfigByKey);

module.exports = router;
