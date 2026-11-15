import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { getDropBySlug } from "@/lib/drops";
import { resolveEditorialAssets } from "@/lib/editorial";
import { DropDetail } from "@/components/storefront/drop-detail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const drop = getDropBySlug(slug);
  if (!drop) return { title: "Drop not found | cyrux studio" };

  return {
    title: `Drop ${drop.number}: ${drop.title} | cyrux studio`,
    description: `${drop.chapter} • ${drop.edition.en}. Cyprus atelier engineered archival collection.`,
    openGraph: {
      title: `Drop ${drop.number}: ${drop.title} | cyrux studio`,
      description: drop.description.en,
      images: [{ url: drop.bannerImage }],
    },
  };
}

export default async function DropDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const drop = getDropBySlug(slug);
  if (!drop) notFound();

  const [allProducts, settings] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.storeSettings.findFirst(),
  ]);

  const products =
    drop.productSlugs.length > 0
      ? allProducts.filter((p) => drop.productSlugs.includes(p.slug))
      : allProducts;

  const editorial = resolveEditorialAssets(products);

  return (
    <DropDetail
      drop={drop}
      products={products}
      productImages={editorial.productImages}
      currency={settings?.currency || "USD"}
      whatsappNumber={settings?.whatsappNumber || "+905551234567"}
    />
  );
}
