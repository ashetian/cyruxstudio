import prisma from "../src/lib/db";
import { INITIAL_STORE_SETTINGS, SEED_PRODUCTS } from "../src/lib/seed-data";

async function main() {
  console.log("[Seed] Seeding cyrux studio database...");

  // 1. Upsert StoreSettings (Singleton)
  const settings = await prisma.storeSettings.upsert({
    where: { id: INITIAL_STORE_SETTINGS.id },
    update: {
      whatsappNumber: INITIAL_STORE_SETTINGS.whatsappNumber,
      currency: INITIAL_STORE_SETTINGS.currency,
      brandMetadata: INITIAL_STORE_SETTINGS.brandMetadata as any,
    },
    create: {
      id: INITIAL_STORE_SETTINGS.id,
      whatsappNumber: INITIAL_STORE_SETTINGS.whatsappNumber,
      currency: INITIAL_STORE_SETTINGS.currency,
      brandMetadata: INITIAL_STORE_SETTINGS.brandMetadata as any,
    },
  });
  console.log(
    `[Seed] StoreSettings seeded: ${settings.whatsappNumber} (${settings.currency})`
  );

  // 2. Upsert Products (Idempotent by slug)
  for (const item of SEED_PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        price: item.price,
        stock: item.stock,
        variants: item.variants as any,
        mediaUrls: item.mediaUrls,
        isBestseller: item.isBestseller,
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        price: item.price,
        stock: item.stock,
        variants: item.variants as any,
        mediaUrls: item.mediaUrls,
        isBestseller: item.isBestseller,
      },
    });
    console.log(`[Seed] Product seeded: ${product.name} (${product.slug})`);
  }

  console.log(
    `[Seed] Successfully seeded ${SEED_PRODUCTS.length} products and store settings.`
  );
}

main()
  .catch((e) => {
    console.error("[Seed] Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // Ignore disconnect error if connection was never opened
    }
  });
