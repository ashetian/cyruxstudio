"use client";

import React, { useState, useMemo } from "react";
import { Product, StoreSettings } from "@prisma/client";
import { HeroSection, filterProductsByQuery } from "@/components/storefront/hero-section";
import { BestsellerGrid } from "@/components/storefront/bestseller-grid";
import { AboutSection } from "@/components/storefront/about-section";
import { FloatingNav } from "@/components/storefront/floating-nav";
import { useCart } from "@/components/storefront/cart-provider";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { MenuDrawer } from "@/components/storefront/menu-drawer";
import { StudioFooter } from "@/components/storefront/studio-footer";
import type { EditorialAssets } from "@/lib/editorial";
import type { DropData } from "@/lib/drops";

export interface StorefrontContainerProps {
  initialProducts: Product[];
  settings: StoreSettings | null;
  editorial?: EditorialAssets;
  activeDrop?: DropData;
  allDrops?: DropData[];
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
}: StorefrontContainerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { count, openCart } = useCart();

  const currency = settings?.currency || "USD";
  const whatsappNumber = settings?.whatsappNumber || "+905551234567";

  // Real live filtering based on search pill input
  const displayedProducts = useMemo(() => {
    return filterProductsByQuery(initialProducts, searchQuery);
  }, [initialProducts, searchQuery]);

  return (
    <main className="min-h-screen bg-black text-brand-black relative select-text">
      {/* Upper Content Shell (Curtain): Pins over the sticky footer with relative z-10 */}
      <div className="relative z-10 bg-canvas shadow-[0_30px_70px_rgba(0,0,0,0.95)]">
        {/* 1. Dark High-Contrast Hero with Live Search Pill and Monumental "cyrux" */}
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
          heroImage={editorial?.hero}
          heroDesktopImage={editorial?.heroDesktop}
          heroMobileImage={editorial?.heroMobile}
          products={initialProducts}
          productImages={editorial?.productImages}
          currency={currency}
        />

        {/* 2. Asymmetric 4-Column Bestseller Grid on Ecru Canvas */}
        <div className="scroll-mt-8">
          <BestsellerGrid
            products={displayedProducts}
            currency={currency}
            whatsappNumber={whatsappNumber}
            productImages={editorial?.productImages}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery("")}
            activeDrop={activeDrop}
          />
        </div>

        {/* 3. Editorial Manifesto (#about) */}
        <AboutSection
          desktopImageSrc={editorial?.aboutDesktop}
          mobileImageSrc={editorial?.aboutMobile}
        />
      </div>

      {/* 4. Brutalist Curtain-Reveal Studio Footer */}
      <StudioFooter
        whatsappNumber={whatsappNumber}
      />

      {/* 5. Fixed Bottom Floating Island Navigation */}
      <FloatingNav cartCount={count} onOpenCart={openCart} />
      <CartDrawer currency={currency} />
      <MenuDrawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        whatsappNumber={whatsappNumber}
        drops={allDrops}
      />
    </main>
  );
}

export default StorefrontContainer;
