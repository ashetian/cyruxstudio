import React from "react";
import type { Metadata } from "next";
import prisma from "@/lib/db";
import { getDropsSync } from "@/lib/drops";
import { resolveEditorialAssets } from "@/lib/editorial";
import { DropsIndex } from "@/components/storefront/drops-index";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Drops & Archive | cyrux studio",
  description:
    "Cyrux Studio archival garment drops. Avant-garde wearable art and brutalist streetwear engineered at our Cyprus atelier.",
  openGraph: {
    title: "Drops & Archive | cyrux studio",
    description:
      "Cyrux Studio archival garment drops. Avant-garde wearable art and brutalist streetwear.",
  },
};

export default async function DropsPage() {
  const [products, settings] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.storeSettings.findFirst(),
  ]);

  const drops = getDropsSync();
  const editorial = resolveEditorialAssets(products);

  return (
    <DropsIndex
      drops={drops}
      products={products}
      productImages={editorial.productImages}
      currency={settings?.currency || "USD"}
      whatsappNumber={settings?.whatsappNumber || "+905551234567"}
    />
  );
}
