import { Router } from 'express';
import {
  uploadDocument,
  listMyDocuments,
  listUserDocuments,
  updateDocument,
  deleteDocument,
} from './documents.controller';
import {
  validateCreateDocument,
  validateUpdateDocument,
  validateDocumentListQuery,
} from './documents.validation';
import { validateId } from '../../handlers/common-zod-validator';
import isAuthorized from '../../middlewares/is-authorized';
import { checkRoles } from '../../middlewares/check-roles';

const router = Router();

/**
 * @route POST /api/v1/documents
 * @description Upload a new document (multipart/form-data with "file" field)
 * @access Private (Employee — own account)
 */
router.post('/', isAuthorized, uploadDocument);

/**
 * @route GET /api/v1/documents
 * @description List own documents
 * @access Private (Employee)
 */
router.get('/', isAuthorized, validateDocumentListQuery, listMyDocuments);

/**
 * @route GET /api/v1/documents/user/:userId
 * @description List all documents for a specific user
 * @access Private (Admin)
 */
router.get('/user/:userId', isAuthorized, checkRoles('ADMIN'), validateDocumentListQuery, listUserDocuments);

/**
 * @route PATCH /api/v1/documents/:id
 * @description Update document metadata (name, type, expiry, notes, isVerified)
 * @access Private (Owner or Admin)
 */
router.patch('/:id', isAuthorized, validateId, validateUpdateDocument, updateDocument);

/**
 * @route DELETE /api/v1/documents/:id
 * @description Delete a document and remove file from storage
 * @access Private (Owner or Admin)
 */
router.delete('/:id', isAuthorized, validateId, deleteDocument);

module.exports = router;
