"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, type Variants } from "framer-motion";
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

const dropSlideVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: "spring" as const, stiffness: 320, damping: 32 },
      opacity: { duration: 0.2 },
    },
  },
  exit: (dir: number) => ({
    x: dir < 0 ? "100%" : "-100%",
    opacity: 0,
    transition: {
      x: { type: "spring" as const, stiffness: 320, damping: 32 },
      opacity: { duration: 0.2 },
    },
  }),
};

function DropProductCard({
  product,
  allProducts,
  imageFor,
  currency,
  lang,
  t,
}: {
  product: Product;
  allProducts: Product[];
  imageFor: (p: Product) => string;
  currency: string;
  lang: "tr" | "en";
  t: (input: { tr: string; en: string }) => string;
}) {
  const [activeSlug, setActiveSlug] = useState(product.slug);
  const [slideDir, setSlideDir] = useState<number>(1);

  const displayProduct =
    activeSlug === product.slug
      ? product
      : allProducts.find((p) => p.slug === activeSlug) || product;

  const twin = displayProduct.twinProductSlug
    ? allProducts.find((p) => p.slug === displayProduct.twinProductSlug)
    : null;

  const isDiptych = Boolean(
    displayProduct.isDiptych ||
      (displayProduct.mediaUrls && displayProduct.mediaUrls.length >= 2)
  );

  const frontImg = imageFor(displayProduct);
  const backImg = displayProduct.mediaUrls?.[1] || frontImg;
  const currentImg = frontImg;
  const isOutOfStock = displayProduct.stock <= 0;

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden bg-[#EDEDEB] border border-black/15 transition-all duration-300 hover:border-black select-none">
      <Link
        href={`/products/${displayProduct.slug}`}
        aria-label={`View ${displayProduct.name}`}
        className="absolute inset-0 z-[1] focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
      />

      {/* Top Interactive Badges (Twin Colorways & Diptych Flip) */}
      <div className="relative z-10 px-2.5 sm:px-3 pt-2.5 flex items-center justify-between pointer-events-none">
        {twin ? (
          <div className="pointer-events-auto flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-2 py-0.5 border border-black/15 shadow-xs">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSlideDir(-1);
                setActiveSlug(product.slug);
              }}
              className={cn(
                "w-3 h-3 rounded-full border transition-all cursor-pointer",
                activeSlug === product.slug
                  ? "scale-125 ring-1.5 ring-black border-black shadow-xs"
                  : "opacity-60 hover:opacity-100 border-black/30"
              )}
              style={{ backgroundColor: product.colorHex || "#FAF8F3" }}
              aria-label={`Switch to ${product.color || product.name}`}
              title={product.color || "Primary colorway"}
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSlideDir(1);
                setActiveSlug(twin.slug);
              }}
              className={cn(
                "w-3 h-3 rounded-full border transition-all cursor-pointer",
                activeSlug === twin.slug
                  ? "scale-125 ring-1.5 ring-black border-black shadow-xs"
                  : "opacity-60 hover:opacity-100 border-black/30"
              )}
              style={{ backgroundColor: twin.colorHex || "#0A0A0A" }}
              aria-label={`Switch to ${twin.color || twin.name}`}
              title={twin.color || "Twin colorway"}
            />
            <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-wider text-black font-bold pl-0.5">
              {displayProduct.color || "COLOR"}
            </span>
          </div>
        ) : (
          <span />
        )}

        {isDiptych && (
          <div className="pointer-events-auto font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-white/90 text-black px-2 py-0.5 border border-black/15 shadow-xs flex items-center gap-1">
            <span>{lang === "tr" ? "ÖN + ARKA YAPISIK" : "FRONT + BACK"}</span>
          </div>
        )}
      </div>

      {/* Sold Out Ribbon */}
      {isOutOfStock && (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-widest bg-black text-white px-2.5 sm:px-3 py-1 font-bold">
            {t({ tr: "TÜKENDİ", en: "SOLD OUT" })}
          </span>
        </div>
      )}

      {/* Product Image: Responsive aspect-square, 0 padding, no margin */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#EDEDEF]">
        {isDiptych ? (
          /* Diptych Dual Panel (ÖN + ARKA YAPISIK - ZERO GAP, ZERO MARGIN) */
          <div className="grid grid-cols-2 gap-0 w-full h-full">
            <div className="relative w-full h-full overflow-hidden border-r border-black/10">
              <Image
                src={frontImg}
                alt={`${displayProduct.name} - Front`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className={cn(
                  "transition-all duration-500 ease-out group-hover:scale-105 object-cover object-center",
                  isOutOfStock && "grayscale opacity-60"
                )}
              />
              <span className="absolute bottom-1.5 left-1.5 z-10 bg-black/80 text-white font-mono text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wider">
                01. {lang === "tr" ? "ÖN" : "FRONT"}
              </span>
            </div>
            <div className="relative w-full h-full overflow-hidden">
              <Image
                src={backImg}
                alt={`${displayProduct.name} - Back`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className={cn(
                  "transition-all duration-500 ease-out group-hover:scale-105 object-cover object-center",
                  isOutOfStock && "grayscale opacity-60"
                )}
              />
              <span className="absolute bottom-1.5 left-1.5 z-10 bg-black/80 text-white font-mono text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wider">
                02. {lang === "tr" ? "ARKA" : "BACK"}
              </span>
            </div>
          </div>
        ) : (
          /* Single Image with Horizontal Slide Transition on Colorway Change */
          <AnimatePresence mode="popLayout" custom={slideDir} initial={false}>
            <motion.div
              key={displayProduct.id}
              custom={slideDir}
              variants={dropSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="relative w-full h-full"
            >
              <Image
                src={currentImg}
                alt={displayProduct.name}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className={cn(
                  "transition-all duration-500 ease-out group-hover:scale-105 object-cover object-center",
                  isOutOfStock && "grayscale opacity-60"
                )}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Bottom Info Strip */}
      <div className="relative z-[2] border-t border-black/10 bg-white/50 backdrop-blur-xs px-2.5 sm:px-4 py-2 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2 shrink-0">
        <div className="min-w-0 pr-1">
          <h3 className="font-mono text-[11px] sm:text-xs md:text-sm font-bold uppercase tracking-wider text-black truncate">
            {displayProduct.name}
          </h3>
          {displayProduct.color && (
            <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 block truncate">
              {displayProduct.color}
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] sm:text-xs md:text-sm font-bold text-black shrink-0">
          {formatProductPrice(displayProduct.price, currency)}
        </span>
      </div>
    </article>
  );
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
            {products.map((product) => (
              <DropProductCard
                key={product.id}
                product={product}
                allProducts={products}
                imageFor={imageFor}
                currency={currency}
                lang={lang}
                t={t}
              />
            ))}
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
