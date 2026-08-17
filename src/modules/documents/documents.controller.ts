import { Request, Response } from 'express';
import { documentServices } from './documents.service';
import { DocumentListQueryInput, UpdateDocumentInput, CreateDocumentInput } from './documents.validation';
import ServerResponse from '../../helpers/responses/custom-response';
import catchAsync from '../../utils/catch-async/catch-async';
import ApiError from '../../utils/errors/api-error';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

/** POST /documents — upload a document (Employee: own account) */
export const uploadDocument = catchAsync(async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.id;
  const file = (req as any).files?.file;

  if (!file) throw ApiError.badRequest('No file uploaded. Send the file in the "file" field.');

  const data = req.body as CreateDocumentInput;
  const result = await documentServices.uploadDocument(userId, data, file);

  ServerResponse(res, true, 201, 'Document uploaded successfully', result);
});

/** GET /documents — list own documents (Employee) */
export const listMyDocuments = catchAsync(async (req: AuthedRequest, res: Response) => {
  const query = ((req as any).validatedQuery || req.query) as DocumentListQueryInput;
  const docs = await documentServices.listDocuments(req.user!.id, query);
  ServerResponse(res, true, 200, 'Documents retrieved successfully', docs);
});

/** GET /documents/user/:userId — list documents for any user (Admin only) */
export const listUserDocuments = catchAsync(async (req: AuthedRequest, res: Response) => {
  const userId = String(req.params.userId);
  const query = ((req as any).validatedQuery || req.query) as DocumentListQueryInput;
  const docs = await documentServices.listDocumentsForUser(userId, query);
  ServerResponse(res, true, 200, 'Documents retrieved successfully', docs);
});

/** PATCH /documents/:id — update document metadata */
export const updateDocument = catchAsync(async (req: AuthedRequest, res: Response) => {
  const id = String(req.params.id);
  const doc = await documentServices.getDocumentById(id);

  if (!doc) throw ApiError.notFound('Document not found');

  // Employees can only update their own; admins can update any
  if (req.user!.role !== 'ADMIN' && doc.userId !== req.user!.id) {
    throw ApiError.forbidden();
  }

  // Employees cannot change isVerified
  const data = req.body as UpdateDocumentInput;
  if (req.user!.role !== 'ADMIN') delete (data as any).isVerified;

  const result = await documentServices.updateDocument(id, data);
  ServerResponse(res, true, 200, 'Document updated successfully', result);
});

/** DELETE /documents/:id — delete document (owner or Admin) */
export const deleteDocument = catchAsync(async (req: AuthedRequest, res: Response) => {
  const id = String(req.params.id);
  const doc = await documentServices.getDocumentById(id);

  if (!doc) throw ApiError.notFound('Document not found');

  if (req.user!.role !== 'ADMIN' && doc.userId !== req.user!.id) {
    throw ApiError.forbidden();
  }

  const result = await documentServices.deleteDocument(id);
  ServerResponse(res, true, 200, 'Document deleted successfully', result);
});

