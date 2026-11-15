import React from "react";
import prisma from "@/lib/db";
import { resolveEditorialAssets } from "@/lib/editorial";
import { getDrops } from "@/lib/drops";
import { StorefrontContainer } from "@/components/storefront/storefront-container";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, settings, allDrops] = await Promise.all([
    prisma.product.findMany({
      where: { isBestseller: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.storeSettings.findFirst(),
    getDrops(),
  ]);

  const activeDrop = allDrops.find((d) => d.status === "active") || allDrops[0];


  return (
    <StorefrontContainer
      initialProducts={products}
      settings={settings}
      activeDrop={activeDrop}
      allDrops={allDrops}
      editorial={resolveEditorialAssets(
        products,
        settings?.brandMetadata as Record<string, unknown> | null
      )}
    />
  );
}
