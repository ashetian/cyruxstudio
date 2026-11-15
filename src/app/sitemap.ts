import type { MetadataRoute } from "next";
import prisma from "@/lib/db";
import { getDrops } from "@/lib/drops";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cyruxstudio.com";

  let products: { slug: string; updatedAt: Date }[] = [];
  let drops: { slug: string; releaseDate?: { tr: string; en: string } }[] = [];

  try {
    const [dbProducts, dbDrops] = await Promise.all([
      prisma.product.findMany({ select: { slug: true, updatedAt: true } }),
      getDrops(),
    ]);
    products = dbProducts;
    drops = dbDrops;
  } catch (error) {
    console.error("Failed to generate dynamic sitemap entries:", error);
  }

  const productUrls: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteUrl}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const dropUrls: MetadataRoute.Sitemap = drops.map((drop) => ({
    url: `${siteUrl}/drops/${drop.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/drops`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...productUrls,
    ...dropUrls,
  ];
}
