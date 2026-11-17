import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { getActiveDropAsync } from "@/lib/drops";
import { resolveEditorialAssets } from "@/lib/editorial";
import { DropDetail } from "@/components/storefront/drop-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const drop = await getActiveDropAsync();
  if (!drop) return { title: "Latest Drop | CYRUX STUDIO" };

  const title = `Latest Drop ${drop.number}: ${drop.title} | CYRUX STUDIO`;
  const description = `${drop.chapter} • ${drop.edition.en}. Avant-garde wearable art engineered at our North Cyprus atelier.`;
  const image = drop.bannerImage || "/og-image.jpg";

  return {
    title,
    description,
    alternates: {
      canonical: "/drops/latest",
    },
    openGraph: {
      title,
      description: drop.description.en || description,
      url: "/drops/latest",
      type: "website",
      images: [
        {
          url: image,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: drop.description.en || description,
      images: [image],
    },
  };
}

export default async function LatestDropPage() {
  const drop = await getActiveDropAsync();
  if (!drop) notFound();

  const [allProducts, settings] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.storeSettings.findFirst(),
  ]);

  const editorial = resolveEditorialAssets(
    allProducts,
    settings?.brandMetadata as Record<string, unknown> | null
  );

  return (
    <DropDetail
      drop={drop}
      products={allProducts}
      productImages={editorial.productImages}
      currency={settings?.currency || "USD"}
      whatsappNumber={settings?.whatsappNumber || "+905338737712"}
    />
  );
}
