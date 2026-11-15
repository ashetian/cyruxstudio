import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { getDropBySlugAsync } from "@/lib/drops";
import { resolveEditorialAssets } from "@/lib/editorial";
import { DropDetail } from "@/components/storefront/drop-detail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const drop = await getDropBySlugAsync(slug);
  if (!drop) return { title: "Drop Not Found" };

  const title = `Drop ${drop.number}: ${drop.title}`;
  const description = `${drop.chapter} • ${drop.edition.en}. Cyprus atelier engineered archival collection.`;
  const image = drop.bannerImage || "/og-image.jpg";

  return {
    title,
    description,
    alternates: {
      canonical: `/drops/${drop.slug}`,
    },
    openGraph: {
      title: `${title} | CYRUX STUDIO`,
      description: drop.description.en || description,
      url: `/drops/${drop.slug}`,
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
      title: `${title} | CYRUX STUDIO`,
      description: drop.description.en || description,
      images: [image],
    },
  };
}

export default async function DropDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const drop = await getDropBySlugAsync(slug);
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

  const editorial = resolveEditorialAssets(
    products,
    settings?.brandMetadata as Record<string, unknown> | null
  );

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
