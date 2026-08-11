import prisma from './utils/prisma/prisma-client';

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      imageUrl: true,
      imageStorageId: true,
      isDiscontinued: true,
    }
  });
  console.log("ALL PRODUCTS IN DB:", JSON.stringify(products, null, 2));
}

main().catch(console.error);
