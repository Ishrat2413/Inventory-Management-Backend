import prisma from '../../utils/prisma/prisma-client';
import ApiError from '../../utils/errors/api-error';
import { productServices } from '../products/products.service';
import { MonthlyQueryInput, DateRangeQueryInput, GenerateMonthlyInput, MonthlyParamsInput } from './reports.validation';

const monthRange = (year: number, month: number) => {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  return { from, to };
};

const sumMovements = async (type: string, from: Date, to: Date) => {
  const result = await prisma.stockMovement.aggregate({
    where: { type: type as never, createdAt: { gte: from, lte: to } },
    _sum: { totalCost: true, quantity: true },
  });
  return { totalCost: Math.abs(Number(result._sum.totalCost ?? 0)), totalQuantity: Math.abs(Number(result._sum.quantity ?? 0)) };
};

const getInventoryValue = async () => {
  const products = await prisma.product.findMany({ where: { isDiscontinued: false } });
  const byCategory: Record<string, number> = {};
  let total = 0;

  for (const p of products) {
    const value = Number(p.currentStock) * Number(p.unitPrice);
    total += value;
    const category = (p.customFields as Record<string, unknown>)?.category as string | undefined;
    const key = category ?? 'Uncategorized';
    byCategory[key] = (byCategory[key] ?? 0) + value;
  }

  return { total: Number(total.toFixed(2)), byCategory, currency: 'MNT', productCount: products.length };
};

/**
 * On-demand monthly report. Note: `inventoryValue` reflects current stock
 * valuation at generation time (the system doesn't keep historical stock
 * snapshots), while `totalPurchases`/`totalCogs` are correctly scoped to
 * the requested month via StockMovement timestamps.
 */
const getMonthlyReport = async (query: MonthlyQueryInput) => {
  const { from, to } = monthRange(query.year, query.month);
  const [purchases, cogs, inventoryValue] = await Promise.all([
    sumMovements('PURCHASE', from, to),
    sumMovements('CONSUMPTION', from, to),
    getInventoryValue(),
  ]);

  return {
    year: query.year,
    month: query.month,
    totalPurchases: purchases.totalCost,
    totalCogs: cogs.totalCost,
    inventoryValue: inventoryValue.total,
    currency: 'MNT',
  };
};

const getSpendingReport = async (query: DateRangeQueryInput) => {
  const from = query.from ? new Date(query.from) : new Date(0);
  const to = query.to ? new Date(query.to) : new Date();

  const [purchases, cogs, adjustments, writeOffs, returns] = await Promise.all([
    sumMovements('PURCHASE', from, to),
    sumMovements('CONSUMPTION', from, to),
    sumMovements('ADJUSTMENT', from, to),
    sumMovements('WRITE_OFF', from, to),
    sumMovements('RETURN', from, to),
  ]);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    purchases,
    cogs,
    adjustments,
    writeOffs,
    returns,
    currency: 'MNT',
  };
};

const getCOGSReport = async (query: DateRangeQueryInput) => {
  const from = query.from ? new Date(query.from) : new Date(0);
  const to = query.to ? new Date(query.to) : new Date();

  const grouped = await prisma.stockMovement.groupBy({
    by: ['productId'],
    where: { type: 'CONSUMPTION', createdAt: { gte: from, lte: to } },
    _sum: { totalCost: true, quantity: true },
  });

  const products = await prisma.product.findMany({ where: { id: { in: grouped.map((g) => g.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const byProduct = grouped
    .map((g) => {
      const product = productMap.get(g.productId);
      return {
        productId: g.productId,
        name: product?.name ?? 'Unknown',
        sku: product?.sku ?? null,
        quantityConsumed: Math.abs(Number(g._sum.quantity ?? 0)),
        cogs: Math.abs(Number(g._sum.totalCost ?? 0)),
      };
    })
    .sort((a, b) => b.cogs - a.cogs);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    totalCogs: Number(byProduct.reduce((sum, p) => sum + p.cogs, 0).toFixed(2)),
    byProduct,
    currency: 'MNT',
  };
};

const getLowStockReport = async () => productServices.getLowStockProducts();

/** Force-generates and persists a monthly snapshot (idempotent — upserts by year+month). */
const generateMonthlyReport = async (data: GenerateMonthlyInput, generatedById?: string) => {
  const { from, to } = monthRange(data.year, data.month);
  const [purchases, cogs, inventoryValue, cogsBreakdown] = await Promise.all([
    sumMovements('PURCHASE', from, to),
    sumMovements('CONSUMPTION', from, to),
    getInventoryValue(),
    getCOGSReport({ from: from.toISOString(), to: to.toISOString() }),
  ]);

  return prisma.monthlyReport.upsert({
    where: { year_month: { year: data.year, month: data.month } },
    create: {
      year: data.year,
      month: data.month,
      totalPurchases: purchases.totalCost,
      totalCogs: cogs.totalCost,
      inventoryValue: inventoryValue.total,
      reportData: { purchases, cogs, inventoryValue, cogsBreakdown } as never,
      generatedById,
    },
    update: {
      totalPurchases: purchases.totalCost,
      totalCogs: cogs.totalCost,
      inventoryValue: inventoryValue.total,
      reportData: { purchases, cogs, inventoryValue, cogsBreakdown } as never,
      generatedById,
      generatedAt: new Date(),
    },
  });
};

const getStoredMonthlyReport = async (params: MonthlyParamsInput) => {
  const report = await prisma.monthlyReport.findUnique({ where: { year_month: { year: params.year, month: params.month } } });
  if (!report) throw ApiError.notFound('No stored report found for this year/month — try POST /reports/generate-monthly first', 'REPORT_NOT_FOUND');
  return report;
};

export const reportServices = {
  getMonthlyReport,
  getSpendingReport,
  getCOGSReport,
  getInventoryValue,
  getLowStockReport,
  generateMonthlyReport,
  getStoredMonthlyReport,
};
