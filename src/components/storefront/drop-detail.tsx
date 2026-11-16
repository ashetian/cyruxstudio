"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Search } from "lucide-react";
import type { Product } from "@prisma/client";
import { cn } from "@/lib/utils";
import type { DropData } from "@/lib/drops";
import { useLanguage } from "@/components/providers/language-provider";
import { useCart } from "@/components/storefront/cart-provider";
import { useSearch } from "@/components/providers/search-provider";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { MenuDrawer } from "@/components/storefront/menu-drawer";
import { StudioFooter } from "@/components/storefront/studio-footer";
import { formatProductPrice } from "@/components/storefront/bestseller-grid";

export interface DropDetailProps {
  drop: DropData;
  products: Product[];
  productImages?: Record<string, string>;
  currency?: string;
  whatsappNumber?: string;
}

export function DropDetail({
  drop,
  products,
  productImages = {},
  currency = "USD",
  whatsappNumber = "+905551234567",
}: DropDetailProps) {
  const { lang, toggleLang, t } = useLanguage();
  const { count, openCart } = useCart();
  const { openSearch } = useSearch();
  const [menuOpen, setMenuOpen] = useState(false);

  const imageFor = (p: Product): string =>
    productImages[p.slug] || p.mediaUrls[0] || "/assets/brand/logo-emblem-dark.png";

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-brand-black flex flex-col justify-between selection:bg-black selection:text-white">
      {/* 1. Top Atelier Navigation Header */}
      <header className="sticky top-0 z-40 w-full bg-[#FAF8F3]/90 backdrop-blur-md border-b border-black/10 px-4 sm:px-8 md:px-12 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Toggle navigation menu"
            className="group min-w-11 min-h-11 -ml-2 px-2.5 flex flex-col justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black rounded cursor-pointer"
          >
            <span className="w-6 h-[1.5px] bg-black" />
            <span className="w-4 h-[1.5px] bg-black" />
            <span className="w-5 h-[1.5px] bg-black" />
          </button>
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest py-2">
            <Link href="/" className="hover:underline underline-offset-4">
              cyrux
            </Link>
            <span className="text-neutral-400">/</span>
            <Link href="/drops" className="text-neutral-500 hover:text-black hover:underline underline-offset-4">
              DROPS
            </Link>
            <span className="text-neutral-400">/</span>
            <span className="text-black">DROP {drop.number}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 -mr-2">
          <button
            type="button"
            onClick={() => openSearch()}
            aria-label="Open dynamic search (⌘K)"
            className="min-h-9 px-2.5 sm:px-3 py-1 rounded-full border border-black/20 text-[11px] font-mono font-bold tracking-widest hover:border-black transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[9px] text-neutral-500">⌘K</span>
          </button>
          <button
            type="button"
            onClick={toggleLang}
            aria-label={`Switch language. Current: ${lang.toUpperCase()}`}
            className="min-h-9 px-2.5 sm:px-3 py-1 rounded-full border border-black/20 text-[11px] font-mono font-bold tracking-widest hover:border-black transition-colors cursor-pointer"
          >
            {lang.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={openCart}
            aria-label={`Shopping bag, ${count} items`}
            className="relative min-w-11 min-h-11 flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5 text-black" />
            {count > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black text-white font-mono text-[10px] font-bold flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 2. Main Products Grid: Sadece Ürünler (Mobile 2'li, PC 3'lü Grid) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 md:px-12 py-5 sm:py-8 md:py-10">
        {/* Minimalist Drop Title & Counter */}
        <div className="mb-4 sm:mb-6 md:mb-8 flex items-baseline justify-between border-b border-black/10 pb-3 sm:pb-4">
          <h1 className="font-mono text-xs sm:text-sm md:text-base font-bold uppercase tracking-widest text-black">
            DROP {drop.number}: {drop.title}
          </h1>
          <span className="font-mono text-[10px] sm:text-xs text-neutral-500 uppercase tracking-widest font-semibold">
            {products.length} {t({ tr: "PARÇA", en: "GARMENTS" })}
          </span>
        </div>

        {products.length === 0 ? (
          <p className="font-mono text-xs sm:text-sm text-neutral-500 py-16 text-center uppercase tracking-widest">
            {t({ tr: "Bu drop'a ait parça bulunamadı.", en: "No pieces found for this drop." })}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 md:gap-6">
            {products.map((product) => {
              const isOutOfStock = product.stock <= 0;

              return (
                <article
                  key={product.id}
                  className="group relative flex flex-col justify-between overflow-hidden bg-[#EDEDEB] border border-black/15 transition-all duration-300 hover:border-black select-none"
                >
                  <Link
                    href={`/products/${product.slug}`}
                    aria-label={`View ${product.name}`}
                    className="absolute inset-0 z-[1] focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                  />

                  {/* Sold Out Ribbon */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 z-[2] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                      <span className="font-mono text-[10px] sm:text-xs uppercase tracking-widest bg-black text-white px-2.5 sm:px-3 py-1 font-bold">
                        {t({ tr: "TÜKENDİ", en: "SOLD OUT" })}
                      </span>
                    </div>
                  )}

                  {/* Product Image: Responsive aspect-[3/4] */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden flex items-center justify-center p-3 sm:p-6 md:p-8">
                    <Image
                      src={imageFor(product)}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className={cn(
                        "transition-all duration-500 ease-out group-hover:scale-105",
                        product.mediaUrls?.[1] && "group-hover:opacity-0",
                        imageFor(product).includes("/assets/editorial/")
                          ? "object-cover object-center"
                          : "object-contain object-center mix-blend-multiply",
                        isOutOfStock && "grayscale opacity-60"
                      )}
                    />
                    {product.mediaUrls?.[1] && (
                      <Image
                        src={product.mediaUrls[1]}
                        alt={`${product.name} - Back View`}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className={cn(
                          "transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 group-hover:scale-105 pointer-events-none",
                          product.mediaUrls[1].includes("/assets/editorial/")
                            ? "object-cover object-center"
                            : "object-contain object-center mix-blend-multiply",
                          isOutOfStock && "grayscale opacity-60"
                        )}
                      />
                    )}
                  </div>

                  {/* Bottom Info Strip */}
                  <div className="relative z-[2] border-t border-black/10 bg-white/50 backdrop-blur-xs px-2.5 sm:px-4 py-2 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2 shrink-0">
                    <h3 className="font-mono text-[11px] sm:text-xs md:text-sm font-bold uppercase tracking-wider text-black truncate">
                      {product.name}
                    </h3>
                    <span className="font-mono text-[11px] sm:text-xs md:text-sm font-bold text-black shrink-0">
                      {formatProductPrice(product.price, currency)}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* 6. Drawers */}
      <MenuDrawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        whatsappNumber={whatsappNumber}
      />
      <CartDrawer currency={currency} />

      {/* 7. Studio Footer (Clean, no top utility strip) */}
      <StudioFooter whatsappNumber={whatsappNumber} />
    </div>
  );
}

export default DropDetail;
