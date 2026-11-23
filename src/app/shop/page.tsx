import React from "react";
import Link from "next/link";
import prisma from "@/lib/db";
import { getStorefrontCms } from "@/lib/cms";
import { resolveEditorialAssets } from "@/lib/editorial";
import { getDrops } from "@/lib/drops";
import { BestsellerGrid } from "@/components/storefront/bestseller-grid";
import { FeaturedCollections } from "@/components/storefront/featured-collections";
import { StudioFooter } from "@/components/storefront/studio-footer";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [products, settings, allDrops, cms, collections] = await Promise.all([
    prisma.product.findMany({
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

  const activeProducts = products.filter(
    (p) => (p as unknown as { isActive?: boolean }).isActive !== false
  );
  const activeDrop = allDrops.find((d) => d.status === "active") || allDrops[0];
  const editorial = resolveEditorialAssets(
    activeProducts,
    settings?.brandMetadata as Record<string, unknown> | null
  );
  const currency = settings?.currency || "USD";
  const whatsappNumber =
    settings?.whatsappNumber || cms.contact.whatsappNumber || "+905551234567";

  return (
    <main className="min-h-screen bg-[#FAF8F3] text-[#0A0A0A] flex flex-col justify-between">
      <div>
        <header className="w-full max-w-7xl mx-auto px-4 md:px-12 pt-8 pb-4 flex items-center justify-between border-b border-black/15">
          <Link
            href="/"
            className="min-h-[44px] inline-flex items-center font-mono text-xs font-bold uppercase tracking-widest hover:opacity-70 cursor-pointer"
          >
            ← CYRUX STUDIO
          </Link>
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">
            ARCHIVE CATALOG ({activeProducts.length})
          </span>
        </header>

        {collections.length > 0 && (
          <FeaturedCollections
            collections={collections}
            collectionsSection={cms.collectionsSection}
          />
        )}

        <BestsellerGrid
          products={activeProducts}
          currency={currency}
          whatsappNumber={whatsappNumber}
          productImages={editorial.productImages}
          activeDrop={activeDrop}
          collectionsSection={cms.collectionsSection}
        />
      </div>

      <StudioFooter
        whatsappNumber={whatsappNumber}
        instagramUrl={cms.contact.socialLinks.instagram}
        footerCms={cms.footer}
        legalCms={cms.legal}
      />
    </main>
  );
}
