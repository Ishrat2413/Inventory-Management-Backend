import prisma from '../../utils/prisma/prisma-client';
import ApiError from '../../utils/errors/api-error';
import { Prisma } from '@prisma/client';

/** Either the singleton PrismaClient or an interactive $transaction callback client. */
type DbClient = Prisma.TransactionClient | typeof prisma;

export interface BOMTreeNode {
  productId: string;
  name: string;
  sku: string | null;
  isComposite: boolean;
  quantityRequired: number;
  currentStock: number;
  children: BOMTreeNode[];
}

const MAX_BOM_DEPTH = 10;

/**
 * Recursively builds the full multi-level BOM tree for a product.
 * Guards against accidental circular references with a depth limit.
 */
export const getBOMTree = async (productId: string, depth = 0, db: DbClient = prisma): Promise<BOMTreeNode> => {
  if (depth > MAX_BOM_DEPTH) {
    throw ApiError.unprocessable('BOM tree exceeds maximum depth — possible circular reference', 'BOM_TOO_DEEP');
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { bomAsParent: { include: { childProduct: true } } },
  });
  if (!product) throw ApiError.notFound('Product not found');

  const children = await Promise.all(
    product.bomAsParent.map(async (entry) => {
      const childTree = await getBOMTree(entry.childProductId, depth + 1, db);
      return { ...childTree, quantityRequired: Number(entry.quantityRequired) };
    }),
  );

  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    isComposite: product.isComposite,
    quantityRequired: 1,
    currentStock: Number(product.currentStock),
    children,
  };
};

export interface ExplodedLine {
  productId: string;
  name: string;
  sku: string | null;
  unitPrice: number;
  quantity: number;
}

/**
 * Explodes a (possibly composite/multi-level) product + quantity into the
 * flat list of leaf (non-composite) products and quantities that must
 * actually be deducted from stock. Non-composite products explode to
 * themselves. Quantities for the same leaf product across different
 * branches of the tree are merged.
 */
export const explodeBOM = async (productId: string, quantity: number, depth = 0, db: DbClient = prisma): Promise<ExplodedLine[]> => {
  if (depth > MAX_BOM_DEPTH) {
    throw ApiError.unprocessable('BOM tree exceeds maximum depth — possible circular reference', 'BOM_TOO_DEEP');
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { bomAsParent: { include: { childProduct: true } } },
  });
  if (!product) throw ApiError.notFound('Product not found');

  if (!product.isComposite || product.bomAsParent.length === 0) {
    return [
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: Number(product.unitPrice),
        quantity,
      },
    ];
  }

  const lines: ExplodedLine[] = [];
  for (const entry of product.bomAsParent) {
    const childQuantity = Number(entry.quantityRequired) * quantity;
    const childLines = await explodeBOM(entry.childProductId, childQuantity, depth + 1, db);
    lines.push(...childLines);
  }

  // Merge duplicate leaf products (same part used in multiple sub-assemblies)
  const merged = new Map<string, ExplodedLine>();
  for (const line of lines) {
    const existing = merged.get(line.productId);
    if (existing) {
      existing.quantity += line.quantity;
    } else {
      merged.set(line.productId, { ...line });
    }
  }

  return Array.from(merged.values());
};

/**
 * Detects whether adding a set of child product IDs to a parent product
 * would create a circular reference. Walks each child's BOM tree to see
 * if the parentId appears anywhere downstream.
 *
 * Returns `true` if a cycle is detected.
 */
export const detectCircularBOM = async (parentId: string, childIds: string[], db: DbClient = prisma): Promise<boolean> => {
  const visited = new Set<string>();

  const walk = async (productId: string): Promise<boolean> => {
    if (productId === parentId) return true;
    if (visited.has(productId)) return false;
    visited.add(productId);

    const entries = await db.productBOM.findMany({ where: { parentProductId: productId } });
    for (const entry of entries) {
      if (await walk(entry.childProductId)) return true;
    }
    return false;
  };

  for (const childId of childIds) {
    if (await walk(childId)) return true;
    visited.clear(); // reset per top-level child
  }

  return false;
};
