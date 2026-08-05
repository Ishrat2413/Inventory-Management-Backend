import prisma from '../../utils/prisma/prisma-client';
import ApiError from '../../utils/errors/api-error';
import { CreateCategoryInput, UpdateCategoryInput } from './categories.validation';

const createCategory = async (data: CreateCategoryInput) => {
  const existing = await prisma.category.findUnique({ where: { name: data.name } });
  if (existing) throw ApiError.conflict('A category with this name already exists', 'DUPLICATE_CATEGORY');
  return prisma.category.create({ data });
};

const updateCategory = async (id: string, data: UpdateCategoryInput) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw ApiError.notFound('Category not found');
  if (data.name && data.name !== category.name) {
    const existing = await prisma.category.findUnique({ where: { name: data.name } });
    if (existing) throw ApiError.conflict('A category with this name already exists', 'DUPLICATE_CATEGORY');
  }
  return prisma.category.update({ where: { id }, data });
};

const deleteCategory = async (id: string) => {
  const category = await prisma.category.findUnique({ where: { id }, include: { products: { select: { id: true } } } });
  if (!category) throw ApiError.notFound('Category not found');
  if (category.products.length > 0) {
    // Unlink all products from this category before deleting
    await prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  }
  return prisma.category.delete({ where: { id } });
};

const getCategoryById = async (id: string) => {
  const category = await prisma.category.findUnique({ where: { id }, include: { products: { select: { id: true, name: true, sku: true } } } });
  if (!category) throw ApiError.notFound('Category not found');
  return category;
};

const getManyCategories = async (search?: string) => {
  const where = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { description: { contains: search, mode: 'insensitive' as const } }] }
    : {};
  const categories = await prisma.category.findMany({ where, orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } });
  return { categories, totalData: categories.length };
};

export const categoryServices = { createCategory, updateCategory, deleteCategory, getCategoryById, getManyCategories };
