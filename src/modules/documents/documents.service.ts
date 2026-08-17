import prisma from '../../utils/prisma/prisma-client';
import { storageProvider } from '../../utils/storage/storage.service';
import ApiError from '../../utils/errors/api-error';
import { CreateDocumentInput, UpdateDocumentInput, DocumentListQueryInput } from './documents.validation';

/**
 * Upload a new document for the given user.
 * The file comes from express-fileupload (req.files.file).
 */
const uploadDocument = async (
  userId: string,
  data: CreateDocumentInput,
  file: any,
): Promise<any> => {
  const { imageUrl, imageStorageId } = await storageProvider.uploadFile(file);

  const doc = await prisma.employeeDocument.create({
    data: {
      userId,
      name: data.name,
      documentType: data.documentType,
      fileUrl: imageUrl,
      fileStorageId: imageStorageId,
      expiryDate: data.expiryDate ?? null,
      notes: data.notes ?? null,
    },
  });

  return doc;
};

/**
 * List documents for a specific user.
 * Employees can only see their own. Admins can see anyone's.
 */
const listDocuments = async (
  userId: string,
  query: DocumentListQueryInput,
): Promise<any[]> => {
  const where: any = { userId };
  if (query.documentType) where.documentType = query.documentType;

  return prisma.employeeDocument.findMany({
    where,
    orderBy: { uploadedAt: 'desc' },
  });
};

/**
 * Admin: list all documents for a specific user by :userId param.
 */
const listDocumentsForUser = async (
  targetUserId: string,
  query: DocumentListQueryInput,
): Promise<any[]> => {
  const where: any = { userId: targetUserId };
  if (query.documentType) where.documentType = query.documentType;

  return prisma.employeeDocument.findMany({
    where,
    orderBy: { uploadedAt: 'desc' },
  });
};

/**
 * Get a single document by ID.
 */
const getDocumentById = async (id: string): Promise<any | null> => {
  return prisma.employeeDocument.findUnique({ where: { id } });
};

/**
 * Update document metadata (name, type, expiry, notes, isVerified).
 * Actual file replacement is not supported; delete and re-upload instead.
 */
const updateDocument = async (
  id: string,
  data: UpdateDocumentInput,
): Promise<any> => {
  return prisma.employeeDocument.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.documentType !== undefined && { documentType: data.documentType }),
      ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.isVerified !== undefined && { isVerified: data.isVerified }),
    },
  });
};

/**
 * Delete a document by ID, also removes the file from storage.
 */
const deleteDocument = async (id: string): Promise<any> => {
  const doc = await prisma.employeeDocument.findUnique({ where: { id } });
  if (!doc) throw ApiError.notFound('Document not found');

  // Remove from Cloudinary / local storage
  try {
    await storageProvider.deleteFile(doc.fileStorageId);
  } catch {
    // Non-blocking — proceed even if storage deletion fails
  }

  return prisma.employeeDocument.delete({ where: { id } });
};

export const documentServices = {
  uploadDocument,
  listDocuments,
  listDocumentsForUser,
  getDocumentById,
  updateDocument,
  deleteDocument,
};
