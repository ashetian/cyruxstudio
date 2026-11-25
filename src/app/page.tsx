import React from "react";
import prisma from "@/lib/db";
import { resolveEditorialAssets } from "@/lib/editorial";
import { getDrops } from "@/lib/drops";
import { getStorefrontCms, DEFAULT_STOREFRONT_CMS } from "@/lib/cms";
import { StorefrontContainer } from "@/components/storefront/storefront-container";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, settings, allDrops, cms] = await Promise.all([
    prisma.product.findMany({
      where: { isBestseller: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.storeSettings.findFirst(),
    getDrops(),
    getStorefrontCms().catch(() => null),
  ]);

  const activeDrop = allDrops.find((d) => d.status === "active") || allDrops[0];
  const rawMeta = (settings?.brandMetadata as Record<string, unknown> | null) || {};
  const mergedEditorialMeta: Record<string, unknown> = {
    ...rawMeta,
    ...(cms?.hero?.desktopImage &&
    cms.hero.desktopImage !== DEFAULT_STOREFRONT_CMS.hero.desktopImage &&
    !rawMeta.heroDesktopImage
      ? { heroDesktopImage: cms.hero.desktopImage }
      : {}),
    ...(cms?.hero?.mobileImage &&
    cms.hero.mobileImage !== DEFAULT_STOREFRONT_CMS.hero.mobileImage &&
    !rawMeta.heroMobileImage
      ? { heroMobileImage: cms.hero.mobileImage }
      : {}),
    ...(cms?.about?.desktopImage &&
    cms.about.desktopImage !== DEFAULT_STOREFRONT_CMS.about.desktopImage &&
    !rawMeta.aboutDesktopImage
      ? { aboutDesktopImage: cms.about.desktopImage }
      : {}),
    ...(cms?.about?.mobileImage &&
    cms.about.mobileImage !== DEFAULT_STOREFRONT_CMS.about.mobileImage &&
    !rawMeta.aboutMobileImage
      ? { aboutMobileImage: cms.about.mobileImage }
      : {}),
  };

  return (
    <StorefrontContainer
      initialProducts={products}
      settings={settings}
      activeDrop={activeDrop}
      allDrops={allDrops}
      editorial={resolveEditorialAssets(products, mergedEditorialMeta)}
    />
  );
}
