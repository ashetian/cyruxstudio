"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Heart, Search, X } from "lucide-react";
import { Product } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { CURRENT_ACTIVE_DROP, type DropData } from "@/lib/drops";

export interface BestsellerGridProps {
  products: Product[];
  currency?: string;
  whatsappNumber?: string;
  className?: string;
  /** Slug -> resolved (editorial or fallback) image URL */
  productImages?: Record<string, string>;
  searchQuery?: string;
  onClearSearch?: () => void;
  activeDrop?: DropData;
}

/**
 * Format product price with store currency symbol (F06.5 Contract)
 */
export function formatProductPrice(price: number, currency = "USD"): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    TRY: "₺",
    GBP: "£",
  };
  const sym = symbols[currency.toUpperCase()] || currency;
  return `${sym}${price.toFixed(2)}`;
}

/**
 * Asymmetric editorial column configuration matching brutalist high-fashion reference (Photo 2)
 * Tests require:
 * - exactly 4 columns
 * - ratios: [1.2, 1.45, 1.15, 1.35]
 * - Column 2: ratio 1.45, aspect-[2/3], minHeightClass: "min-h-[560px]"
 */
export const ASYMMETRIC_COLUMN_CONFIG = [
  { ratio: 1.2, aspectClass: "aspect-[3/4]", minHeightClass: "min-h-[400px]", offsetClass: "" },
  { ratio: 1.45, aspectClass: "aspect-[2/3]", minHeightClass: "min-h-[560px]", offsetClass: "" }, // Monumentally taller column 2
  { ratio: 1.15, aspectClass: "aspect-[4/5]", minHeightClass: "min-h-[380px]", offsetClass: "lg:pt-6" },
  { ratio: 1.35, aspectClass: "aspect-[3/4.2]", minHeightClass: "min-h-[460px]", offsetClass: "lg:-mt-2" },
];

export const CARD_LAYOUT = ASYMMETRIC_COLUMN_CONFIG;

function getProductWatermark(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && w !== "THE" && w !== "AND" && w !== "TEE");
  return words[0] || "CYRUX";
}

export function BestsellerGrid({
  products,
  currency = "USD",
  className = "",
  productImages = {},
  searchQuery = "",
  onClearSearch,
  activeDrop,
}: BestsellerGridProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const drop = activeDrop || CURRENT_ACTIVE_DROP;
  const imageFor = (p: Product): string =>
    productImages[p.slug] || p.mediaUrls[0] || "/assets/brand/logo-emblem-dark.png";
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [activeIdx, setActiveIdx] = useState<number>(0);

  // Wishlist toggle state (F06.4 Contract)
  const toggleWishlist = (productId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const gridProducts = products;

  return (
    <section
      id="shop"
      aria-label="Bestseller Catalog Grid"
      className={cn("w-full max-w-7xl mx-auto px-4 md:px-12 py-16 md:py-24 relative", className)}
    >
      {/* 1. Monospace Section Heading & Active Drop Indicator (F06.1 Contract) */}
      <div className="mb-8 md:mb-14 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h2 className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-brand-black">
            {t({ tr: "Bestseller Now", en: "Bestseller Now" })}
          </h2>
          <p className="font-mono text-xs text-neutral-500 uppercase tracking-widest mt-1">
            {t({
              tr: "Stüdyo Seçkisi • Koleksiyon Parçaları",
              en: "Studio Selection • Collection Pieces",
            })}
          </p>
        </div>

        {/* Drop System Active Status Indicator - Minimal & Sleek */}
        <Link
          href={`/drops/${drop.slug}`}
          className="group inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-neutral-600 hover:text-black transition-colors self-start sm:self-auto cursor-pointer"
        >
          <span className="font-bold tracking-wider">
            DROP {drop.number}: {drop.title}
          </span>
          <span className="text-neutral-400 group-hover:translate-x-0.5 transition-transform text-[10px]">
            →
          </span>
        </Link>
      </div>

      {/* Dynamic Search Active Filter Indicator */}
      {searchQuery.trim() && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black text-[#FAF8F3] font-mono text-[11px] font-bold tracking-wider uppercase">
            <Search className="w-3 h-3 text-neutral-400" />
            <span>{t({ tr: `Filtre: "${searchQuery.trim()}"`, en: `Filter: "${searchQuery.trim()}"` })}</span>
            <span className="text-neutral-400 font-normal">({gridProducts.length})</span>
            {onClearSearch && (
              <button
                type="button"
                onClick={onClearSearch}
                aria-label="Aramayı temizle"
                className="ml-1 p-0.5 rounded-full hover:bg-neutral-800 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        </div>
      )}

      {gridProducts.length === 0 ? (
        <div role="status" className="py-20 text-center font-mono text-sm uppercase tracking-widest flex flex-col items-center justify-center">
          <p>
            {searchQuery.trim()
              ? t({
                  tr: `"${searchQuery.trim()}" için parça bulunamadı`,
                  en: `No results for "${searchQuery.trim()}"`,
                })
              : t({ tr: "Mevcut parça bulunmuyor", en: "No products available" })}
          </p>
          {searchQuery.trim() && onClearSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className="mt-6 px-4 py-2 border-2 border-black bg-black text-[#FAF8F3] hover:bg-transparent hover:text-black font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-[4px_4px_0px_0px_#000000]"
            >
              {t({ tr: "Aramayı Temizle [✕]", en: "Clear Search [✕]" })}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* =========================================================================
              MOBILE: PODYUM POSTER AKIŞI (Fullscreen Runway Poster Scroll)
              ========================================================================= */}
          <div className="flex flex-col gap-6 lg:hidden">
            {gridProducts.map((product, index) => {
              const isWishlisted = wishlist.has(product.id);
              const isOutOfStock = product.stock <= 0;
              const watermark = getProductWatermark(product.name);

              return (
                <motion.article
                  key={`mobile-${product.id}`}
                  initial={reduceMotion ? false : { opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.6,
                    delay: reduceMotion ? 0 : (index % 3) * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="group relative flex flex-col justify-between overflow-hidden bg-[#EDEDEB] border border-black/15 transition-all duration-300 hover:border-black cursor-pointer select-none min-h-[76vh] sm:min-h-[82vh]"
                >
                  {/* Full Card Tap Link */}
                  <Link
                    href={`/products/${product.slug}`}
                    aria-label={`View ${product.name}`}
                    data-cursor="VIEW"
                    className="absolute inset-0 z-[5] focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                  />

                  {/* Gigantic Architectural Tone-on-Tone Watermark */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden"
                  >
                    <span className="font-mono text-[20vw] font-black uppercase text-black/[0.04] tracking-tighter leading-none select-none">
                      {watermark}
                    </span>
                  </div>

                  {/* Top Runway Header */}
                  <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold tracking-widest text-black bg-white/70 backdrop-blur-xs px-2.5 py-1 border border-black/10">
                      [{String(index + 1).padStart(2, "0")} / {String(gridProducts.length).padStart(2, "0")}]
                    </span>

                    <button
                      type="button"
                      aria-label={
                        isWishlisted
                          ? `Remove ${product.name} from wishlist`
                          : `Add ${product.name} to wishlist`
                      }
                      aria-pressed={isWishlisted}
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className="relative z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-black border border-black/10 shadow-xs flex items-center justify-center transition-all duration-200 active:scale-90"
                    >
                      <Heart
                        className={cn(
                          "w-4 h-4 transition-colors",
                          isWishlisted ? "fill-black text-black" : "text-black/70"
                        )}
                      />
                    </button>
                  </div>

                  {/* Out of Stock Overlay */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 z-[6] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                      <span className="font-mono text-xs uppercase tracking-widest bg-black text-white px-4 py-1.5 font-bold border border-white/20">
                        {t({ tr: "TÜKENDİ", en: "SOLD OUT" })}
                      </span>
                    </div>
                  )}

                  {/* Center Massive Garment Presentation */}
                  <div className="relative flex-1 w-full min-h-[360px] flex items-center justify-center p-6 sm:p-10 my-auto">
                    <Image
                      src={imageFor(product)}
                      alt={product.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 30vw"
                      className={cn(
                        "transition-transform duration-500 ease-out group-active:scale-95 group-hover:scale-105",
                        imageFor(product).includes("/assets/editorial/")
                          ? "object-cover object-center"
                          : "object-contain object-center mix-blend-multiply p-4 sm:p-8",
                        isOutOfStock && "grayscale opacity-50"
                      )}
                      priority={index < 2}
                    />
                  </div>

                  {/* Bottom Information Strip */}
                  <div className="relative z-10 border-t border-black/15 bg-white/60 backdrop-blur-xs px-4 py-3 flex items-center justify-between shrink-0">
                    <h3 className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-black truncate pr-2">
                      {product.name}
                    </h3>
                    <span className="font-mono text-xs sm:text-sm font-bold text-black shrink-0">
                      {formatProductPrice(product.price, currency)}
                    </span>
                  </div>
                </motion.article>
              );
            })}
          </div>

          {/* =========================================================================
              DESKTOP: INTERACTIVE MORPHING LUNCHBOX TRAY (Accordion Bento)
              ========================================================================= */}
          <div
            className="hidden lg:flex w-full h-[640px] xl:h-[700px] bg-[#E8E7E3] border border-black/20 p-2 gap-2 overflow-hidden select-none"
            onMouseLeave={() => setActiveIdx(0)}
          >
            {gridProducts.map((product, index) => {
              const isExpanded = index === activeIdx;
              const isWishlisted = wishlist.has(product.id);
              const isOutOfStock = product.stock <= 0;
              const watermark = getProductWatermark(product.name);

              return (
                <motion.article
                  key={`desktop-${product.id}`}
                  layout
                  onClick={() => setActiveIdx(index)}
                  onMouseEnter={() => setActiveIdx(index)}
                  transition={{
                    layout: { duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] },
                  }}
                  className={cn(
                    "group relative overflow-hidden border transition-colors duration-300 flex flex-col justify-between cursor-pointer",
                    isExpanded
                      ? "flex-[4] bg-[#EDEDEB] border-black/30 shadow-xs"
                      : "flex-[1] bg-[#F1EFEA] hover:bg-[#EAE8E2] border-black/10 hover:border-black/30"
                  )}
                >
                  {isExpanded ? (
                    <>
                      {/* Full Card Direct Link on Visual Area */}
                      <Link
                        href={`/products/${product.slug}`}
                        aria-label={`View ${product.name}`}
                        data-cursor="VIEW"
                        className="absolute inset-x-0 top-14 bottom-16 z-[5] focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                      />

                      {/* Giant Subtle Tone-on-Tone Watermark */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden"
                      >
                        <span className="font-mono text-[14vw] font-black uppercase text-black/[0.035] tracking-tighter leading-none select-none">
                          {watermark}
                        </span>
                      </div>

                      {/* Top Header Strip */}
                      <div className="relative z-10 p-4 xl:p-5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold tracking-widest text-black bg-white/70 backdrop-blur-xs px-2.5 py-1 border border-black/10">
                            [{String(index + 1).padStart(2, "0")} / {String(gridProducts.length).padStart(2, "0")}]
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 hidden xl:inline">
                            [DROP {drop.number} • ATELIER SPECIMEN]
                          </span>
                        </div>

                        <button
                          type="button"
                          aria-label={
                            isWishlisted
                              ? `Remove ${product.name} from wishlist`
                              : `Add ${product.name} to wishlist`
                          }
                          aria-pressed={isWishlisted}
                          onClick={(e) => toggleWishlist(product.id, e)}
                          className="relative z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-black border border-black/10 shadow-xs flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                        >
                          <Heart
                            className={cn(
                              "w-3.5 h-3.5 transition-colors",
                              isWishlisted ? "fill-black text-black" : "text-black/60 hover:text-black"
                            )}
                          />
                        </button>
                      </div>

                      {/* Out of Stock Overlay */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 z-[6] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                          <span className="font-mono text-xs uppercase tracking-widest bg-black text-white px-4 py-1.5 font-bold border border-white/20">
                            {t({ tr: "TÜKENDİ", en: "SOLD OUT" })}
                          </span>
                        </div>
                      )}

                      {/* Center Massive Garment Presentation */}
                      <div className="relative flex-1 w-full min-h-0 overflow-hidden flex items-center justify-center p-6 xl:p-10 my-auto">
                        <Image
                          src={imageFor(product)}
                          alt={product.name}
                          fill
                          sizes="(max-width: 1536px) 50vw, 40vw"
                          className={cn(
                            "transition-transform duration-700 ease-out group-hover:scale-105",
                            imageFor(product).includes("/assets/editorial/")
                              ? "object-cover object-center"
                              : "object-contain object-center mix-blend-multiply p-4 xl:p-8",
                            isOutOfStock && "grayscale opacity-50"
                          )}
                          priority={index === 0}
                        />
                      </div>

                      {/* Bottom Information Strip */}
                      <div className="relative z-10 border-t border-black/15 bg-white/75 backdrop-blur-xs px-5 py-3.5 flex items-center justify-between shrink-0">
                        <div className="min-w-0 pr-4">
                          <h3 className="font-mono text-sm xl:text-base font-bold uppercase tracking-tight text-black truncate">
                            {product.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="font-mono text-sm xl:text-base font-bold text-black">
                            {formatProductPrice(product.price, currency)}
                          </span>
                          <Link
                            href={`/products/${product.slug}`}
                            data-cursor="VIEW"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-black text-white hover:bg-neutral-800 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors"
                          >
                            <span>{t({ tr: "İNCELE", en: "EXPLORE" })}</span>
                            <span className="text-xs">→</span>
                          </Link>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Collapsed Compartment State */
                    <div className="w-full h-full flex flex-col justify-between items-center py-4 px-1">
                      {/* Top Compartment Index */}
                      <span className="font-mono text-[11px] font-bold text-black/60 bg-white/50 px-2 py-0.5 border border-black/10">
                        [{String(index + 1).padStart(2, "0")}]
                      </span>

                      {/* Faint Garment Silhouette Preview */}
                      <div className="relative w-14 h-24 my-auto opacity-35 grayscale group-hover:opacity-70 transition-opacity">
                        <Image
                          src={imageFor(product)}
                          alt={product.name}
                          fill
                          className="object-contain mix-blend-multiply"
                        />
                      </div>

                      {/* Vertical Rotated Typography */}
                      <div className="[writing-mode:vertical-rl] rotate-180 font-mono text-xs font-bold uppercase tracking-widest text-black/80 my-auto py-2 truncate max-h-[260px]">
                        {product.name}
                      </div>

                      {/* Bottom Price Tag */}
                      <div className="w-full pt-2 border-t border-black/10 text-center">
                        <span className="font-mono text-[11px] font-bold text-black/70 block truncate">
                          {formatProductPrice(product.price, currency)}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.article>
              );
            })}
          </div>
        </>
      )}

      {/* 3. Drop Showcase CTA - Ultra Minimal */}
      <div className="mt-12 md:mt-16 pt-6 border-t border-black/15 flex items-center justify-between font-mono text-xs">
        <span className="uppercase tracking-widest text-neutral-500 font-bold">
          DROP {drop.number} • {drop.title}
        </span>
        <Link
          href={`/drops/${drop.slug}`}
          className="group inline-flex items-center gap-2 font-bold uppercase tracking-widest text-black hover:opacity-50 transition-opacity"
        >
          <span>SEE DROP</span>
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </section>
  );
}

export default BestsellerGrid;
