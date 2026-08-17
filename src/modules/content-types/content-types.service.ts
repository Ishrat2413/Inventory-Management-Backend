import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma/prisma-client';
import ApiError from '../../utils/errors/api-error';
import {
  CreateContentTypeInput,
  UpdateContentTypeInput,
  UpsertEmployeeRecordInput,
} from './content-types.validation';

// ── Content Type CRUD ─────────────────────────────────────────────────────

const listContentTypes = async (includeInactive = false) => {
  return prisma.contentType.findMany({
    where: includeInactive ? undefined : { isActive: true },
    include: {
      fields: { orderBy: { order: 'asc' } },
      _count: { select: { records: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const getContentType = async (id: string) => {
  const ct = await prisma.contentType.findUnique({
    where: { id },
    include: {
      fields: { orderBy: { order: 'asc' } },
    },
  });
  if (!ct) throw ApiError.notFound('Content type not found');
  return ct;
};

const createContentType = async (data: CreateContentTypeInput, createdById: string) => {
  const { fields, ...rest } = data;
  return prisma.contentType.create({
    data: {
      ...rest,
      createdById,
      fields: {
        create: fields.map((f, i) => ({
          ...f,
          order: f.order ?? i,
          options: f.options === null ? Prisma.DbNull : (f.options as any),
        })),
      },
    },
    include: { fields: { orderBy: { order: 'asc' } } },
  });
};

const updateContentType = async (id: string, data: UpdateContentTypeInput) => {
  const existing = await prisma.contentType.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Content type not found');

  const { fields, ...rest } = data;

  return prisma.$transaction(async (tx) => {
    // Update the content type itself
    const updated = await tx.contentType.update({
      where: { id },
      data: rest,
    });

    if (fields !== undefined) {
      // Separate new fields from existing ones (those with an id)
      const toCreate = fields.filter((f) => !('id' in f) || !f.id);
      const toUpdate = fields.filter((f): f is typeof f & { id: string } => 'id' in f && !!f.id);
      const keepIds = toUpdate.map((f) => f.id);

      // Delete fields not in the updated list
      await tx.contentField.deleteMany({
        where: { contentTypeId: id, id: { notIn: keepIds } },
      });

      // Update existing fields
      for (const field of toUpdate) {
        const { id: fieldId, ...fieldData } = field;
        await tx.contentField.update({
          where: { id: fieldId },
          data: {
            ...fieldData,
            options: fieldData.options === null ? Prisma.DbNull : (fieldData.options as any),
          },
        });
      }

      // Create new fields
      if (toCreate.length > 0) {
        await tx.contentField.createMany({
          data: toCreate.map((f, i) => ({
            ...f,
            contentTypeId: id,
            order: f.order ?? (toUpdate.length + i),
            options: f.options === null ? Prisma.DbNull : (f.options as any),
          })),
        });
      }
    }

    return tx.contentType.findUnique({
      where: { id },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
  });
};

const deleteContentType = async (id: string) => {
  const existing = await prisma.contentType.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Content type not found');
  return prisma.contentType.delete({ where: { id } });
};

// ── Employee Record CRUD ──────────────────────────────────────────────────

const getEmployeeRecords = async (userId: string) => {
  // Get all active content types with their fields
  const contentTypes = await prisma.contentType.findMany({
    where: { isActive: true },
    include: { fields: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });

  // Get all records for this user
  const records = await prisma.employeeRecord.findMany({
    where: { userId },
    include: { contentType: { include: { fields: { orderBy: { order: 'asc' } } } } },
  });

  const recordMap = new Map(records.map((r: any) => [r.contentTypeId, r]));

  // Merge: return each content type with its record data (or empty)
  return contentTypes.map((ct: any) => ({
    contentType: ct,
    record: recordMap.get(ct.id) ?? null,
  }));
};

const upsertEmployeeRecord = async (
  userId: string,
  contentTypeId: string,
  data: UpsertEmployeeRecordInput,
) => {
  const ct = await prisma.contentType.findUnique({ where: { id: contentTypeId } });
  if (!ct) throw ApiError.notFound('Content type not found');

  return prisma.employeeRecord.upsert({
    where: { userId_contentTypeId: { userId, contentTypeId } },
    create: { userId, contentTypeId, data: data.data as any },
    update: { data: data.data as any },
    include: { contentType: { include: { fields: { orderBy: { order: 'asc' } } } } },
  });
};

export const contentTypeServices = {
  listContentTypes,
  getContentType,
  createContentType,
  updateContentType,
  deleteContentType,
  getEmployeeRecords,
  upsertEmployeeRecord,
};
