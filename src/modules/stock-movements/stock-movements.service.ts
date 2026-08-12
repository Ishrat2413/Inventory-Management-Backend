import prisma from '../../utils/prisma/prisma-client';
import { Prisma } from '@prisma/client';
import ApiError from '../../utils/errors/api-error';
import { buildPagination, totalPagesOf } from '../../helpers/pagination';
import { explodeBOM } from '../products/bom.util';
import { maybeFlagNegativeStock } from '../products/products.service';
import { CreateMovementInput, ConsumeInput, MovementSearchQueryInput, AssembleInput } from './stock-movements.validation';

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Throws INSUFFICIENT_STOCK if a product's negative-stock grace period has already lapsed. */
const assertWithinNegativeStockLimit = async (productId: string, db: DbClient = prisma) => {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound('Product not found');

  if (product.negativeStockAllowedUntil && new Date() > product.negativeStockAllowedUntil) {
    throw ApiError.badRequest('Product is below allowed negative stock limit', 'INSUFFICIENT_STOCK', {
      productId,
      negativeSince: product.negativeSince,
    });
  }
  return product;
};

/**
 * Creates a manual stock movement (PURCHASE / ADJUSTMENT / WRITE_OFF / RETURN)
 * and applies its delta to the product's currentStock.
 */
const createMovement = async (data: CreateMovementInput, performedById?: string, relatedRequestId?: string) => {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: data.productId } });
    if (!product) throw ApiError.notFound('Product not found');

    if (data.quantity < 0) await assertWithinNegativeStockLimit(data.productId, tx);

    const totalCost = Number((data.quantity * data.unitCost).toFixed(2));

    const movement = await tx.stockMovement.create({
      data: {
        productId: data.productId,
        type: data.type,
        quantity: data.quantity,
        unitCost: data.unitCost,
        totalCost,
        notes: data.notes,
        performedById,
        relatedRequestId,
      },
    });
    const updated = await tx.product.update({ where: { id: data.productId }, data: { currentStock: { increment: data.quantity } } });
    await maybeFlagNegativeStock(data.productId, Number(updated.currentStock), tx);

    return movement;
  }, {
    timeout: 30000
  });
};

/**
 * Consumes a product, auto-exploding its BOM (if composite) into leaf-level
 * CONSUMPTION movements. All resulting movements + stock decrements are
 * applied atomically.
 */
const consumeProduct = async (data: ConsumeInput, performedById?: string, relatedRequestId?: string) => {
  return prisma.$transaction(async (tx) => {
    const lines = await explodeBOM(data.productId, data.quantity, 0, tx);

    for (const line of lines) {
      if (line.quantity > 0) await assertWithinNegativeStockLimit(line.productId, tx);
    }

    const movements = [];
    for (const line of lines) {
      const totalCost = Number((line.quantity * line.unitPrice).toFixed(2));
      const movement = await tx.stockMovement.create({
        data: {
          productId: line.productId,
          type: 'CONSUMPTION',
          quantity: -line.quantity,
          unitCost: line.unitPrice,
          totalCost,
          relatedTaskId: data.relatedTaskId,
          relatedRequestId,
          notes: data.notes,
          performedById,
        },
      });
      const updated = await tx.product.update({ where: { id: line.productId }, data: { currentStock: { decrement: line.quantity } } });
      await maybeFlagNegativeStock(line.productId, Number(updated.currentStock), tx);
      movements.push(movement);
    }

    return { explodedLines: lines, movements };
  }, {
    timeout: 30000
  });
};

const getManyMovement = async (query: MovementSearchQueryInput) => {
  const { skip, take, showPerPage } = buildPagination(query);

  const where = {
    ...(query.productId && { productId: query.productId }),
    ...(query.type && { type: query.type }),
    ...(query.taskId && { relatedTaskId: query.taskId }),
    ...((query.from || query.to) && {
      createdAt: {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      },
    }),
  };

  const [totalData, movements] = await prisma.$transaction([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      skip,
      take,
      include: { product: { select: { id: true, name: true, sku: true } }, performedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { movements, totalData, totalPages: totalPagesOf(totalData, showPerPage) };
};

const getMovementsForProduct = async (productId: string) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound('Product not found');

  return prisma.stockMovement.findMany({
    where: { productId },
    include: { performedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

const assembleProduct = async (data: AssembleInput, performedById?: string, relatedRequestId?: string) => {
  return prisma.$transaction(async (tx) => {
    // 1. Load parent product and its BOM components
    const product = await tx.product.findUnique({
      where: { id: data.productId },
      include: {
        bomAsParent: {
          include: {
            childProduct: true,
          },
        },
      },
    });

    if (!product) throw ApiError.notFound('Product not found');
    if (!product.isComposite || product.bomAsParent.length === 0) {
      throw ApiError.badRequest('Product is not a compound product or has no Bill of Materials configured', 'NOT_COMPOUND_PRODUCT');
    }

    // 2. Validate component stock levels
    for (const entry of product.bomAsParent) {
      const requiredQty = Number(entry.quantityRequired) * data.quantity;
      const currentStock = Number(entry.childProduct.currentStock);
      if (currentStock < requiredQty) {
        throw ApiError.badRequest(
          `Insufficient stock for component product "${entry.childProduct.name}". Required: ${requiredQty}, Available: ${currentStock}`,
          'INSUFFICIENT_STOCK',
          {
            productId: entry.childProductId,
            componentName: entry.childProduct.name,
            required: requiredQty,
            available: currentStock,
          }
        );
      }
    }

    // 3. Deduct component stocks and record CONSUMPTION movements
    const movements = [];
    let calculatedMaterialCost = 0;

    for (const entry of product.bomAsParent) {
      const qtyRequired = Number(entry.quantityRequired) * data.quantity;
      const unitCost = Number(entry.childProduct.unitPrice);
      calculatedMaterialCost += Number(entry.quantityRequired) * unitCost;

      const totalCost = Number((qtyRequired * unitCost).toFixed(2));

      const movement = await tx.stockMovement.create({
        data: {
          productId: entry.childProductId,
          type: 'CONSUMPTION',
          quantity: -qtyRequired,
          unitCost,
          totalCost,
          relatedRequestId,
          notes: `Assembled parent product: ${product.name} (Qty: ${data.quantity})`,
          performedById,
        },
      });

      const updatedComponent = await tx.product.update({
        where: { id: entry.childProductId },
        data: { currentStock: { decrement: qtyRequired } },
      });

      await maybeFlagNegativeStock(entry.childProductId, Number(updatedComponent.currentStock), tx);
      movements.push(movement);
    }

    // 4. Increment parent stock and record ASSEMBLY movement
    const assemblyTotalCost = Number((data.quantity * calculatedMaterialCost).toFixed(2));

    const assemblyMovement = await tx.stockMovement.create({
      data: {
        productId: data.productId,
        type: 'ASSEMBLY',
        quantity: data.quantity,
        unitCost: calculatedMaterialCost,
        totalCost: assemblyTotalCost,
        relatedRequestId,
        notes: data.notes ?? `Assembled ${data.quantity} units manually`,
        performedById,
      },
    });

    const updatedParent = await tx.product.update({
      where: { id: data.productId },
      data: { currentStock: { increment: data.quantity } },
    });

    await maybeFlagNegativeStock(data.productId, Number(updatedParent.currentStock), tx);

    return {
      product: updatedParent,
      assemblyMovement,
      componentMovements: movements,
    };
  }, {
    timeout: 30000
  });
};

export const stockMovementServices = {
  createMovement,
  consumeProduct,
  assembleProduct,
  getManyMovement,
  getMovementsForProduct,
};
