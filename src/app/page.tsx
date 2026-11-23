import React from "react";
import type { Metadata } from "next";
import prisma from "@/lib/db";
import { resolveEditorialAssets } from "@/lib/editorial";
import { getDrops } from "@/lib/drops";
import { getStorefrontCms } from "@/lib/cms";
import { StorefrontContainer } from "@/components/storefront/storefront-container";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getStorefrontCms().catch(() => null);
  const seo = cms?.seo;
  const resolvedSiteUrl =
    seo?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://cyruxstudio.com";
  const resolvedTitle =
    (seo as unknown as { title?: string })?.title ||
    seo?.titleDefault ||
    "CYRUX STUDIO | Wearable Art & Archival Streetwear";
  const resolvedTemplate = seo?.titleTemplate || "%s | CYRUX STUDIO";
  const resolvedDescription =
    seo?.description ||
    "Avant-garde archival streetwear, high-contrast monochrome silhouettes and sculptural physical garments crafted at our North Cyprus atelier.";
  const resolvedKeywords =
    seo?.keywords && seo.keywords.length > 0
      ? seo.keywords
      : [
          "cyrux studio",
          "cyrux",
          "wearable art",
          "archival streetwear",
          "archival fashion",
          "avant-garde streetwear",
          "north cyprus atelier",
          "monochrome fashion",
          "heavyweight cotton tee",
          "limited drops",
          "luxury streetwear",
        ];
  const resolvedOgImage = seo?.ogImage || "/og-image.jpg";
  const resolvedOgAlt =
    seo?.ogAlt || "CYRUX STUDIO - Wearable Art & Archival Streetwear";

  return {
    metadataBase: new URL(resolvedSiteUrl),
    title: {
      default: resolvedTitle,
      template: resolvedTemplate,
    },
    description: resolvedDescription,
    keywords: resolvedKeywords,
    openGraph: {
      type: "website",
      locale: seo?.defaultLang === "en" ? "en_US" : "tr_TR",
      url: resolvedSiteUrl,
      siteName: "CYRUX STUDIO",
      title: resolvedTitle,
      description: resolvedDescription,
      images: [
        {
          url: resolvedOgImage,
          width: 1200,
          height: 630,
          alt: resolvedOgAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      creator: seo?.twitterCreator || "@ashetian_",
      site: seo?.twitterSite || "@cyruxstudio",
      images: [resolvedOgImage],
    },
  };
}

export default async function Home() {
  const [products, settings, allDrops, cms, collections] = await Promise.all([
    prisma.product.findMany({
      where: { isBestseller: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.storeSettings.findFirst(),
    getDrops(),
    getStorefrontCms(),
    prisma.collection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const activeDrop = allDrops.find((d) => d.status === "active") || allDrops[0];

  return (
    <StorefrontContainer
      initialProducts={products}
      settings={settings}
      activeDrop={activeDrop}
      allDrops={allDrops}
      cms={cms}
      collections={collections}
      editorial={resolveEditorialAssets(
        products,
        settings?.brandMetadata as Record<string, unknown> | null
      )}
    />
  );
}
