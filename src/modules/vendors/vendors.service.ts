import prisma from '../../utils/prisma/prisma-client';
import ApiError from '../../utils/errors/api-error';
import { buildPagination, totalPagesOf } from '../../helpers/pagination';
import { SearchQueryInput } from '../../handlers/common-zod-validator';
import { CreateVendorInput, UpdateVendorInput } from './vendors.validation';

const createVendor = async (data: CreateVendorInput) => {
  return prisma.vendor.create({ data });
};

const updateVendor = async (id: string, data: UpdateVendorInput) => {
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) throw ApiError.notFound('Vendor not found');
  return prisma.vendor.update({ where: { id }, data });
};

/** Soft-delete: vendors with linked products should not be hard-deleted. */
const deleteVendor = async (id: string) => {
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) throw ApiError.notFound('Vendor not found');
  return prisma.vendor.update({ where: { id }, data: { isActive: false } });
};

const getVendorById = async (id: string) => {
  const vendor = await prisma.vendor.findUnique({ where: { id }, include: { products: { select: { id: true, name: true, sku: true, currentStock: true } } } });
  if (!vendor) throw ApiError.notFound('Vendor not found');
  return vendor;
};

const getManyVendor = async (query: SearchQueryInput) => {
  const { skip, take, showPerPage } = buildPagination(query);
  const where = query.searchKey
    ? {
        OR: [
          { name: { contains: query.searchKey, mode: 'insensitive' as const } },
          { email: { contains: query.searchKey, mode: 'insensitive' as const } },
          { phone: { contains: query.searchKey, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [totalData, vendors] = await prisma.$transaction([
    prisma.vendor.count({ where }),
    prisma.vendor.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
  ]);

  return { vendors, totalData, totalPages: totalPagesOf(totalData, showPerPage) };
};

export const vendorServices = { createVendor, updateVendor, deleteVendor, getVendorById, getManyVendor };
