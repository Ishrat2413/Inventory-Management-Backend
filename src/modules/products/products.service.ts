import prisma from '../../utils/prisma/prisma-client';
import { Prisma } from '@prisma/client';
import ApiError from '../../utils/errors/api-error';
import { buildPagination, totalPagesOf } from '../../helpers/pagination';
import { getBOMTree } from './bom.util';
import { CreateProductInput, UpdateProductInput, ProductSearchQueryInput, ReplaceBOMInput, CustomFieldInput } from './products.validation';
import { getConfigValue } from '../config/config.service';

type DbClient = Prisma.TransactionClient | typeof prisma;

const createProduct = async (data: CreateProductInput) => {
  if (data.sku) {
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) throw ApiError.conflict('A product with this SKU already exists', 'DUPLICATE_SKU');
  }

  const product = await prisma.product.create({ data: { ...data, customFields: data.customFields ?? {} } });
  return maybeFlagNegativeStock(product.id, Number(product.currentStock));
};

const updateProduct = async (id: string, data: UpdateProductInput) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Product not found');

  if (data.sku && data.sku !== existing.sku) {
    const dupe = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (dupe) throw ApiError.conflict('A product with this SKU already exists', 'DUPLICATE_SKU');
  }

  const updated = await prisma.product.update({ where: { id }, data });
  return maybeFlagNegativeStock(updated.id, Number(updated.currentStock));
};

/** Soft-delete: mark as discontinued rather than physically removing history-linked rows. */
const deleteProduct = async (id: string) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Product not found');
  return prisma.product.update({ where: { id }, data: { isDiscontinued: true } });
};

const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { vendor: true, bomAsParent: { include: { childProduct: true } } },
  });
  if (!product) throw ApiError.notFound('Product not found');

  const bomSummary = product.bomAsParent.map((entry) => ({
    childProductId: entry.childProductId,
    name: entry.childProduct.name,
    sku: entry.childProduct.sku,
    quantityRequired: Number(entry.quantityRequired),
  }));

  return { ...product, bomSummary };
};

const getManyProduct = async (query: ProductSearchQueryInput) => {
  const { skip, take, showPerPage } = buildPagination(query);

  const where: Record<string, unknown> = {
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' as const } },
        { sku: { contains: query.search, mode: 'insensitive' as const } },
      ],
    }),
    ...(query.isDiscontinued !== undefined && { isDiscontinued: query.isDiscontinued }),
    ...(query.isComposite !== undefined && { isComposite: query.isComposite }),
    ...(query.category && { customFields: { path: ['category'], equals: query.category } }),
  };

  if (query.lowStock) {
    // Prisma Client can't compare two columns of the same row in a `where`
    // filter, so the quick list-level flag only catches currently-negative
    // stock. Use GET /products/low-stock for the fully accurate check
    // (which also compares against each product's own lowStockThreshold).
    (where as { currentStock?: unknown }).currentStock = { lt: 0 };
  }

  const [totalData, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, skip, take, include: { vendor: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } }),
  ]);

  return { products, totalData, totalPages: totalPagesOf(totalData, showPerPage) };
};

/** GET /products/low-stock — products below threshold or currently negative. */
const getLowStockProducts = async () => {
  const products = await prisma.product.findMany({
    where: {
      isDiscontinued: false,
      OR: [{ currentStock: { lt: 0 } }],
    },
    include: { vendor: { select: { id: true, name: true } } },
  });

  // Prisma can't compare two columns directly in a `where` filter portably,
  // so threshold comparison is done in-memory after fetching candidates.
  const all = await prisma.product.findMany({
    where: { isDiscontinued: false, lowStockThreshold: { not: null } },
    include: { vendor: { select: { id: true, name: true } } },
  });
  const belowThreshold = all.filter((p) => Number(p.currentStock) <= Number(p.lowStockThreshold));

  const merged = new Map(products.map((p) => [p.id, p]));
  for (const p of belowThreshold) merged.set(p.id, p);

  return Array.from(merged.values()).map((p) => ({
    ...p,
    daysNegative: p.negativeSince ? Math.floor((Date.now() - new Date(p.negativeSince).getTime()) / 86_400_000) : 0,
  }));
};

const getProductBOM = async (id: string) => getBOMTree(id);

/** Replaces the entire BOM for a composite product in a single transaction. */
const replaceProductBOM = async (id: string, data: ReplaceBOMInput) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw ApiError.notFound('Product not found');

  const childIds = data.items.map((i) => i.childProductId);
  if (childIds.includes(id)) throw ApiError.badRequest('A product cannot be a component of itself', 'CIRCULAR_BOM');

  const children = await prisma.product.findMany({ where: { id: { in: childIds } } });
  if (children.length !== childIds.length) throw ApiError.badRequest('One or more childProductId values do not exist', 'INVALID_BOM_CHILD');

  await prisma.$transaction([
    prisma.productBOM.deleteMany({ where: { parentProductId: id } }),
    prisma.productBOM.createMany({
      data: data.items.map((item) => ({ parentProductId: id, childProductId: item.childProductId, quantityRequired: item.quantityRequired })),
    }),
    prisma.product.update({ where: { id }, data: { isComposite: data.items.length > 0 } }),
  ]);

  return getBOMTree(id);
};

const addOrUpdateCustomField = async (id: string, data: CustomFieldInput) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw ApiError.notFound('Product not found');

  const customFields = { ...(product.customFields as Record<string, unknown>), [data.key]: data.value };
  return prisma.product.update({ where: { id }, data: { customFields: customFields as Prisma.InputJsonObject } });
};

const removeCustomField = async (id: string, key: string) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw ApiError.notFound('Product not found');

  const customFields = { ...(product.customFields as Record<string, unknown>) };
  delete customFields[key];
  return prisma.product.update({ where: { id }, data: { customFields: customFields as Prisma.InputJsonObject } });
};

/**
 * Tracks how long a product has been in negative stock, enforcing the
 * `negative_stock_max_days` system config (business rule from
 * API_ENDPOINTS.md §"Important Business Rules").
 */
export const maybeFlagNegativeStock = async (productId: string, newStock: number, db: DbClient = prisma) => {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return product;

  if (newStock < 0 && !product.negativeSince) {
    const maxDays = Number((await getConfigValue('negative_stock_max_days')) ?? 7);
    const negativeStockAllowedUntil = new Date(Date.now() + maxDays * 86_400_000);
    return db.product.update({ where: { id: productId }, data: { negativeSince: new Date(), negativeStockAllowedUntil } });
  }

  if (newStock >= 0 && product.negativeSince) {
    return db.product.update({ where: { id: productId }, data: { negativeSince: null, negativeStockAllowedUntil: null } });
  }

  return product;
};

export const productServices = {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getManyProduct,
  getLowStockProducts,
  getProductBOM,
  replaceProductBOM,
  addOrUpdateCustomField,
  removeCustomField,
};
