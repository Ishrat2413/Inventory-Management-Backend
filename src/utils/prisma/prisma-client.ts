import { PrismaClient } from '@prisma/client';
import { getIO } from '../socket/socket';

const basePrisma = new PrismaClient();

const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const result = await query(args);

        // If this is a mutation operation, emit a real-time event
        const mutations = ['create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert'];
        if (mutations.includes(operation)) {
          try {
            const io = getIO();
            const modelName = model?.toLowerCase();
            if (modelName) {
              io.emit(`${modelName}:changed`, { operation });
              io.emit('db:changed', { model: modelName, operation }); // Global fallback
            }
          } catch (e) {
            // Ignore if Socket.io is not initialized yet (e.g., during seeding or tests)
          }
        }

        return result;
      },
    },
  },
}) as unknown as PrismaClient; // Cast to PrismaClient to avoid breaking existing strict types

export default prisma;
