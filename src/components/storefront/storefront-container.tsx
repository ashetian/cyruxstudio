"use client";

import React, { useState, useMemo } from "react";
import { Product, StoreSettings } from "@prisma/client";
import { HeroSection, filterProductsByQuery } from "@/components/storefront/hero-section";
import { MarqueeBar } from "@/components/storefront/marquee-bar";
import {
  FeaturedCollections,
  type FeaturedCollectionItem,
} from "@/components/storefront/featured-collections";
import { BestsellerGrid } from "@/components/storefront/bestseller-grid";
import { CampaignBlock } from "@/components/storefront/campaign-block";
import { AboutSection } from "@/components/storefront/about-section";
import { FaqSection } from "@/components/storefront/faq-section";
import { ContactSection } from "@/components/storefront/contact-section";
import { FloatingNav } from "@/components/storefront/floating-nav";
import { useCart } from "@/components/storefront/cart-provider";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { MenuDrawer } from "@/components/storefront/menu-drawer";
import { StudioFooter } from "@/components/storefront/studio-footer";
import { DEFAULT_STOREFRONT_CMS, type StorefrontCmsConfig } from "@/lib/cms";
import type { EditorialAssets } from "@/lib/editorial";
import type { DropData } from "@/lib/drops";

export interface StorefrontContainerProps {
  initialProducts: Product[];
  settings: StoreSettings | null;
  editorial?: EditorialAssets;
  activeDrop?: DropData;
  allDrops?: DropData[];
  cms?: StorefrontCmsConfig | null;
  collections?: FeaturedCollectionItem[];
}

export function StorefrontContainer(props: StorefrontContainerProps) {
  return <StorefrontInner {...props} />;
}

function StorefrontInner({
  initialProducts,
  settings,
  editorial,
  activeDrop,
  allDrops,
  cms: cmsProp,
  collections = [],
}: StorefrontContainerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { count, openCart } = useCart();

  const cms = cmsProp ?? DEFAULT_STOREFRONT_CMS;
  const currency = settings?.currency || "USD";
  const whatsappNumber =
    settings?.whatsappNumber || cms.contact.whatsappNumber || "+905551234567";
  const settingsRec = settings as unknown as {
    freeShippingThreshold?: number | null;
    shippingFee?: number;
    announcementEnabled?: boolean;
  } | null;
  const freeShippingThreshold = settingsRec?.freeShippingThreshold ?? null;
  const shippingFee = settingsRec?.shippingFee ?? 0;
  const announcementEnabled = settingsRec?.announcementEnabled ?? true;

  const brandMeta = (settings?.brandMetadata as Record<string, unknown>) || {};
  const socialLinks =
    ((brandMeta.socialLinks || brandMeta.socialHandles) as Record<string, string>) || {};
  const instagramUrl =
    cms.contact.socialLinks.instagram ||
    socialLinks.instagram ||
    "https://instagram.com/cyruxstudio";
  const announcement =
    typeof brandMeta.announcement === "string" && brandMeta.announcement.trim().length > 0
      ? brandMeta.announcement.trim()
      : undefined;

  const displayedProducts = useMemo(() => {
    return filterProductsByQuery(initialProducts, searchQuery);
  }, [initialProducts, searchQuery]);

  return (
    <main className="min-h-screen bg-black text-brand-black relative select-text">
      {/* Upper Content Shell (Curtain) */}
      <div className="relative z-10 bg-canvas shadow-[0_30px_70px_rgba(0,0,0,0.95)]">
        {/* Announcement Marquee Bar */}
        {announcementEnabled && cms.marquee.enabled && (
          <MarqueeBar marquee={cms.marquee} />
        )}

        {/* 1. Dark High-Contrast Hero */}
        <HeroSection
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={(q) => {
            if (q.trim()) {
              document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          cartCount={count}
          onOpenCart={openCart}
          onOpenMenu={() => setMenuOpen(true)}
          heroImage={cms.hero.desktopImage || editorial?.hero}
          heroDesktopImage={cms.hero.desktopImage || editorial?.heroDesktop}
          heroMobileImage={cms.hero.mobileImage || editorial?.heroMobile}
          heroCms={cms.hero}
          products={initialProducts}
          productImages={editorial?.productImages}
          currency={currency}
          announcement={announcement}
        />

        {/* 2. Featured Collections (if enabled and populated) */}
        {cms.seo.showCollectionsSection !== false && collections.length > 0 && (
          <FeaturedCollections
            collections={collections}
            collectionsSection={cms.collectionsSection}
          />
        )}

        {/* 3. Asymmetric 4-Column Bestseller Grid on Ecru Canvas */}
        <div className="scroll-mt-8">
          <BestsellerGrid
            products={displayedProducts}
            currency={currency}
            whatsappNumber={whatsappNumber}
            productImages={editorial?.productImages}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery("")}
            activeDrop={activeDrop}
            collectionsSection={cms.collectionsSection}
          />
        </div>

        {/* 4. Lookbook / Editorial Campaign Block */}
        {cms.seo.showLookbookSection !== false && cms.lookbook.enabled && (
          <CampaignBlock lookbook={cms.lookbook} />
        )}

        {/* 5. Editorial Manifesto (#about) */}
        <AboutSection
          desktopImageSrc={cms.about.desktopImage || editorial?.aboutDesktop}
          mobileImageSrc={cms.about.mobileImage || editorial?.aboutMobile}
          aboutCms={cms.about}
        />

        {/* 6. FAQ Section */}
        {cms.seo.showFaqSection !== false && cms.faq.enabled && (
          <FaqSection faqCms={cms.faq} />
        )}

        {/* 7. Contact Section */}
        {cms.seo.showContactSection !== false && cms.contact.enabled && (
          <ContactSection contactCms={cms.contact} whatsappNumber={whatsappNumber} />
        )}
      </div>

      {/* 8. Curtain-Reveal Studio Footer */}
      <StudioFooter
        whatsappNumber={whatsappNumber}
        instagramUrl={instagramUrl}
        footerCms={cms.footer}
        legalCms={cms.legal}
      />

      {/* 9. Fixed Bottom Floating Island Navigation */}
      <FloatingNav
        cartCount={count}
        onOpenCart={openCart}
        navigation={cms.navigation}
      />
      <CartDrawer
        currency={currency}
        freeShippingThreshold={freeShippingThreshold}
        shippingFee={shippingFee}
      />
      <MenuDrawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        whatsappNumber={whatsappNumber}
        instagramUrl={instagramUrl}
        drops={allDrops}
        navigation={cms.navigation}
      />
    </main>
  );
}

export default StorefrontContainer;
