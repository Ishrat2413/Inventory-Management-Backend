import { PrismaClient } from '@prisma/client';
import { getIO } from '../socket/socket';

const basePrisma = new PrismaClient();

// Low-stock alert queue: debounce to avoid spamming emails
let lowStockCheckTimeout: NodeJS.Timeout | null = null;
const alertedProductIds = new Set<string>();

async function checkAndAlertLowStock(client: PrismaClient) {
  try {
    const activeProducts = await client.product.findMany({
      where: {
        isDiscontinued: false,
        lowStockThreshold: { not: null },
      },
      select: { id: true, name: true, sku: true, currentStock: true, lowStockThreshold: true },
    });

    const newlyAlerted: typeof activeProducts = [];

    for (const p of activeProducts) {
      const isLowStock = Number(p.currentStock) < Number(p.lowStockThreshold);
      if (isLowStock) {
        if (!alertedProductIds.has(p.id)) {
          newlyAlerted.push(p);
          alertedProductIds.add(p.id);
        }
      } else {
        // Reset the alert state once the stock is replenished
        alertedProductIds.delete(p.id);
      }
    }

    if (newlyAlerted.length === 0) return;

    // Get all admin emails
    const admins = await client.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { email: true },
    });

    if (admins.length === 0) return;

    const { default: SendEmail } = await import('../email/send-email');
    const { templates } = await import('../email/templates');

    const products = newlyAlerted.map((p) => ({
      name: p.name,
      sku: p.sku || '',
      currentStock: Number(p.currentStock),
      lowStockThreshold: Number(p.lowStockThreshold),
    }));

    const html = templates.lowStockAlert({ products });

    for (const admin of admins) {
      SendEmail({
        to: admin.email,
        subject: `⚠️ Low Stock Alert — ${products.length} product(s) need restocking`,
        text: `Low stock alert: ${products.map((p) => p.name).join(', ')}`,
        html,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[LowStock] Failed to check/alert low stock:', err);
  }
}

const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const result = await query(args);

        // Emit real-time socket events for all mutations
        const mutations = ['create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert'];
        if (mutations.includes(operation)) {
          try {
            const io = getIO();
            const modelName = model?.toLowerCase();
            if (modelName) {
              io.emit(`${modelName}:changed`, { operation });
              io.emit('db:changed', { model: modelName, operation });
            }
          } catch (_e) {
            // Ignore if Socket.io is not initialized yet
          }

          // Debounce low-stock email check when stock movements happen
          if (model === 'StockMovement' || model === 'Product') {
            if (lowStockCheckTimeout) clearTimeout(lowStockCheckTimeout);
            lowStockCheckTimeout = setTimeout(() => {
              checkAndAlertLowStock(basePrisma).catch(() => {});
              lowStockCheckTimeout = null;
            }, 5000); // 5s debounce
          }
        }

        return result;
      },
    },
  },
}) as unknown as PrismaClient;

export default prisma;
