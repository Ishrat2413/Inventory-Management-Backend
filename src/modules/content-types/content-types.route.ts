import { Router } from 'express';
import {
  listContentTypes,
  getContentType,
  createContentType,
  updateContentType,
  deleteContentType,
  getEmployeeRecords,
  upsertEmployeeRecord,
} from './content-types.controller';
import isAuthorized from '../../middlewares/is-authorized';
import { checkRoles } from '../../middlewares/check-roles';

const router = Router();

// ── Content Type Schema Management (Admin only) ────────────────────────────

/** GET /api/v1/content-types — list all (optionally include inactive) */
router.get('/', isAuthorized, listContentTypes);

/** GET /api/v1/content-types/:id — get single schema with fields */
router.get('/:id', isAuthorized, getContentType);

/** POST /api/v1/content-types — create new schema + fields */
router.post('/', isAuthorized, checkRoles('ADMIN'), createContentType);

/** PATCH /api/v1/content-types/:id — update schema + fields */
router.patch('/:id', isAuthorized, checkRoles('ADMIN'), updateContentType);

/** DELETE /api/v1/content-types/:id — delete schema */
router.delete('/:id', isAuthorized, checkRoles('ADMIN'), deleteContentType);

// ── Employee Record Management ─────────────────────────────────────────────

/** GET /api/v1/content-types/records/me — own records across all content types */
router.get('/records/me', isAuthorized, (req, res, next) => {
  (req as any).params.userId = (req as any).user.id;
  return getEmployeeRecords(req, res, next);
});

/** GET /api/v1/content-types/records/user/:userId — admin: get user's records */
router.get('/records/user/:userId', isAuthorized, checkRoles('ADMIN'), getEmployeeRecords);

/** PUT /api/v1/content-types/:contentTypeId/records/user/:userId — admin: upsert record */
router.put('/:contentTypeId/records/user/:userId', isAuthorized, checkRoles('ADMIN'), upsertEmployeeRecord);

/** PUT /api/v1/content-types/:contentTypeId/records/me — employee: upsert own record */
router.put('/:contentTypeId/records/me', isAuthorized, (req, res, next) => {
  (req as any).params.userId = (req as any).user.id;
  return upsertEmployeeRecord(req, res, next);
});

module.exports = router;
