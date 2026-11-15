import React from "react";
import type { Metadata } from "next";
import prisma from "@/lib/db";
import { getDrops } from "@/lib/drops";
import { resolveEditorialAssets } from "@/lib/editorial";
import { DropsIndex } from "@/components/storefront/drops-index";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Drops & Archive",
  description:
    "Cyrux Studio archival garment drops. Avant-garde wearable art and brutalist streetwear engineered at our Cyprus atelier.",
  alternates: {
    canonical: "/drops",
  },
  openGraph: {
    title: "Drops & Archive | CYRUX STUDIO",
    description:
      "Cyrux Studio archival garment drops. Avant-garde wearable art and brutalist streetwear.",
    url: "/drops",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "CYRUX STUDIO Drops & Archive",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Drops & Archive | CYRUX STUDIO",
    description:
      "Cyrux Studio archival garment drops. Avant-garde wearable art and brutalist streetwear.",
    images: ["/og-image.jpg"],
  },
};

export default async function DropsPage() {
  const [products, settings, drops] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.storeSettings.findFirst(),
    getDrops(),
  ]);

  const editorial = resolveEditorialAssets(
    products,
    settings?.brandMetadata as Record<string, unknown> | null
  );

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
