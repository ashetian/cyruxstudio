"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
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

const gridSlideVariants: Variants = {
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

function BestsellerMobileCard({
  product,
  index,
  total,
  allProducts,
  isWishlisted,
  onToggleWishlist,
  imageFor,
  currency,
  reduceMotion,
  lang,
  t,
}: {
  product: Product;
  index: number;
  total: number;
  allProducts: Product[];
  isWishlisted: boolean;
  onToggleWishlist: (id: string, e?: React.MouseEvent) => void;
  imageFor: (p: Product) => string;
  currency: string;
  reduceMotion: boolean | null;
  lang: "tr" | "en";
  t: (input: { tr: string; en: string }) => string;
}) {
  const [activeSlug, setActiveSlug] = useState(product.slug);
  const [slideDir, setSlideDir] = useState<number>(1);
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");

  useEffect(() => {
    setActiveSlug(product.slug);
    setActiveSide("front");
  }, [product.slug]);

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
  const currentImg = activeSide === "back" ? backImg : frontImg;
  const isOutOfStock = displayProduct.stock <= 0;

  return (
    <motion.article
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
        href={`/products/${displayProduct.slug}`}
        aria-label={`View ${displayProduct.name}`}
        data-cursor="VIEW"
        className="absolute inset-0 z-[5] focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
      />

      {/* Top Runway Header */}
      <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between">
        <span className="font-mono text-[11px] font-bold tracking-widest text-black bg-white/70 backdrop-blur-xs px-2.5 py-1 border border-black/10">
          [{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}]
        </span>

        {/* Center Interactive Pills: Twin Yin-Yang Colorways or Diptych Front/Back Flip */}
        <div className="relative z-20 flex items-center gap-2">
          {twin && (
            <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-2 py-1 border border-black/15 shadow-xs">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSlideDir(-1);
                  setActiveSlug(product.slug);
                }}
                className={cn(
                  "w-3.5 h-3.5 rounded-full border transition-all cursor-pointer",
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
                  "w-3.5 h-3.5 rounded-full border transition-all cursor-pointer",
                  activeSlug === twin.slug
                    ? "scale-125 ring-1.5 ring-black border-black shadow-xs"
                    : "opacity-60 hover:opacity-100 border-black/30"
                )}
                style={{ backgroundColor: twin.colorHex || "#0A0A0A" }}
                aria-label={`Switch to ${twin.color || twin.name}`}
                title={twin.color || "Twin colorway"}
              />
              <span className="font-mono text-[9px] uppercase tracking-wider text-black font-bold pl-0.5">
                {displayProduct.color || "COLOR"}
              </span>
            </div>
          )}

          {isDiptych && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveSide((s) => (s === "front" ? "back" : "front"));
              }}
              className="font-mono text-[10px] font-bold uppercase tracking-wider bg-white/90 hover:bg-white text-black px-2.5 py-1 border border-black/15 shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>{activeSide === "front" ? (lang === "tr" ? "ÖN" : "FRONT") : (lang === "tr" ? "ARKA" : "BACK")}</span>
              <span className="text-[9px] text-neutral-400">⇄</span>
            </button>
          )}
        </div>

        {/* Wishlist */}
        <button
          type="button"
          aria-label={
            isWishlisted
              ? `Remove ${displayProduct.name} from wishlist`
              : `Add ${displayProduct.name} to wishlist`
          }
          aria-pressed={isWishlisted}
          onClick={(e) => onToggleWishlist(displayProduct.id, e)}
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
      <div className="relative flex-1 w-full min-h-[360px] overflow-hidden my-auto bg-[#EDEDEB]">
        {isDiptych ? (
          <div className="grid grid-cols-2 gap-0 w-full h-full">
            <div className="relative w-full h-full border-r border-black/10 overflow-hidden">
              <Image
                src={frontImg}
                alt={`${displayProduct.name} - Front`}
                fill
                sizes="(max-width: 1024px) 50vw, 20vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute bottom-2 left-2 z-10 bg-black/80 text-white font-mono text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">
                01. {lang === "tr" ? "ÖN" : "FRONT"}
              </span>
            </div>
            <div className="relative w-full h-full overflow-hidden">
              <Image
                src={backImg}
                alt={`${displayProduct.name} - Back`}
                fill
                sizes="(max-width: 1024px) 50vw, 20vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute bottom-2 left-2 z-10 bg-black/80 text-white font-mono text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">
                02. {lang === "tr" ? "ARKA" : "BACK"}
              </span>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout" custom={slideDir} initial={false}>
            <motion.div
              key={displayProduct.id}
              custom={slideDir}
              variants={gridSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="relative w-full h-full"
            >
              <Image
                src={currentImg}
                alt={displayProduct.name}
                fill
                sizes="(max-width: 1024px) 100vw, 30vw"
                className={cn(
                  "transition-all duration-500 ease-out group-active:scale-95 group-hover:scale-105 object-cover object-center",
                  isOutOfStock && "grayscale opacity-50"
                )}
                priority={index < 2}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Bottom Information Strip */}
      <div className="relative z-10 border-t border-black/15 bg-white/60 backdrop-blur-xs px-4 py-3 flex items-center justify-between shrink-0">
        <div className="min-w-0 pr-2">
          <h3 className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-black truncate">
            {displayProduct.name}
          </h3>
          {displayProduct.color && (
            <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 block truncate">
              {displayProduct.color}
            </span>
          )}
        </div>
        <span className="font-mono text-xs sm:text-sm font-bold text-black shrink-0">
          {formatProductPrice(displayProduct.price, currency)}
        </span>
      </div>
    </motion.article>
  );
}

function BestsellerDesktopItem({
  product,
  index,
  total,
  allProducts,
  isExpanded,
  isWishlisted,
  onSelect,
  onToggleWishlist,
  imageFor,
  currency,
  reduceMotion,
  drop,
  lang,
  t,
}: {
  product: Product;
  index: number;
  total: number;
  allProducts: Product[];
  isExpanded: boolean;
  isWishlisted: boolean;
  onSelect: () => void;
  onToggleWishlist: (id: string, e?: React.MouseEvent) => void;
  imageFor: (p: Product) => string;
  currency: string;
  reduceMotion: boolean | null;
  drop: DropData;
  lang: "tr" | "en";
  t: (input: { tr: string; en: string }) => string;
}) {
  const [activeSlug, setActiveSlug] = useState(product.slug);
  const [slideDir, setSlideDir] = useState<number>(1);
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");

  useEffect(() => {
    setActiveSlug(product.slug);
    setActiveSide("front");
  }, [product.slug]);

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
  const currentImg = activeSide === "back" ? backImg : frontImg;
  const isOutOfStock = displayProduct.stock <= 0;

  return (
    <motion.article
      layout
      onClick={onSelect}
      onMouseEnter={onSelect}
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
            href={`/products/${displayProduct.slug}`}
            aria-label={`View ${displayProduct.name}`}
            data-cursor="VIEW"
            className="absolute inset-x-0 top-14 bottom-16 z-[5] focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
          />

          {/* Top Header Strip */}
          <div className="relative z-10 p-4 xl:p-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[11px] font-bold tracking-widest text-black bg-white/70 backdrop-blur-xs px-2.5 py-1 border border-black/10">
                [{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}]
              </span>

              {/* Yin-Yang Twin Colorway Switcher */}
              {twin && (
                <div className="relative z-20 flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-2 py-1 border border-black/15 shadow-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSlideDir(-1);
                      setActiveSlug(product.slug);
                    }}
                    className={cn(
                      "w-3.5 h-3.5 rounded-full border transition-all cursor-pointer",
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
                      "w-3.5 h-3.5 rounded-full border transition-all cursor-pointer",
                      activeSlug === twin.slug
                        ? "scale-125 ring-1.5 ring-black border-black shadow-xs"
                        : "opacity-60 hover:opacity-100 border-black/30"
                    )}
                    style={{ backgroundColor: twin.colorHex || "#0A0A0A" }}
                    aria-label={`Switch to ${twin.color || twin.name}`}
                    title={twin.color || "Twin colorway"}
                  />
                  <span className="font-mono text-[9px] uppercase tracking-wider text-black font-bold pl-0.5">
                    {displayProduct.color || "COLOR"}
                  </span>
                </div>
              )}

              {/* Diptych Front/Back Indicator */}
              {isDiptych && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveSide((s) => (s === "front" ? "back" : "front"));
                  }}
                  className="relative z-20 font-mono text-[10px] font-bold uppercase tracking-wider bg-white/90 hover:bg-white text-black px-2.5 py-1 border border-black/15 shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span>{activeSide === "front" ? (lang === "tr" ? "ÖN" : "FRONT") : (lang === "tr" ? "ARKA" : "BACK")}</span>
                  <span className="text-[9px] text-neutral-400">⇄</span>
                </button>
              )}

              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 hidden xl:inline">
                [DROP {drop.number} • ATELIER SPECIMEN]
              </span>
            </div>

            <button
              type="button"
              aria-label={
                isWishlisted
                  ? `Remove ${displayProduct.name} from wishlist`
                  : `Add ${displayProduct.name} to wishlist`
              }
              aria-pressed={isWishlisted}
              onClick={(e) => onToggleWishlist(displayProduct.id, e)}
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
          <div className="relative flex-1 w-full min-h-0 overflow-hidden my-auto bg-[#EDEDEB]">
            {isDiptych ? (
              <div className="grid grid-cols-2 gap-0 w-full h-full">
                <div className="relative w-full h-full border-r border-black/10 overflow-hidden">
                  <Image
                    src={frontImg}
                    alt={`${displayProduct.name} - Front`}
                    fill
                    sizes="(max-width: 1536px) 25vw, 20vw"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  />
                  <span className="absolute bottom-2 left-2 z-10 bg-black/80 text-white font-mono text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">
                    01. {lang === "tr" ? "ÖN" : "FRONT"}
                  </span>
                </div>
                <div className="relative w-full h-full overflow-hidden">
                  <Image
                    src={backImg}
                    alt={`${displayProduct.name} - Back`}
                    fill
                    sizes="(max-width: 1536px) 25vw, 20vw"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  />
                  <span className="absolute bottom-2 left-2 z-10 bg-black/80 text-white font-mono text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">
                    02. {lang === "tr" ? "ARKA" : "BACK"}
                  </span>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="popLayout" custom={slideDir} initial={false}>
                <motion.div
                  key={displayProduct.id}
                  custom={slideDir}
                  variants={gridSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="relative w-full h-full"
                >
                  <Image
                    src={currentImg}
                    alt={displayProduct.name}
                    fill
                    sizes="(max-width: 1536px) 50vw, 40vw"
                    className={cn(
                      "transition-transform duration-700 ease-out group-hover:scale-105 object-cover object-center",
                      isOutOfStock && "grayscale opacity-50"
                    )}
                    priority={index === 0}
                  />
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Bottom Information Strip */}
          <div className="relative z-10 border-t border-black/15 bg-white/75 backdrop-blur-xs px-5 py-3.5 flex items-center justify-between shrink-0">
            <div className="min-w-0 pr-4">
              <h3 className="font-mono text-sm xl:text-base font-bold uppercase tracking-tight text-black truncate">
                {displayProduct.name}
              </h3>
              {displayProduct.color && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 block truncate">
                  {displayProduct.color}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="font-mono text-sm xl:text-base font-bold text-black">
                {formatProductPrice(displayProduct.price, currency)}
              </span>
              <Link
                href={`/products/${displayProduct.slug}`}
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
          <span className="font-mono text-[11px] font-bold text-black/60 bg-white/50 px-2 py-0.5 border border-black/10">
            [{String(index + 1).padStart(2, "0")}]
          </span>

          <div className="relative w-14 h-24 my-auto opacity-35 grayscale group-hover:opacity-70 transition-opacity">
            <Image
              src={imageFor(product)}
              alt={product.name}
              fill
              className="object-contain mix-blend-multiply"
            />
          </div>

          <div className="[writing-mode:vertical-rl] rotate-180 font-mono text-xs font-bold uppercase tracking-widest text-black/80 my-auto py-2 truncate max-h-[260px]">
            {product.name}
          </div>

          <div className="w-full pt-2 border-t border-black/10 text-center">
            <span className="font-mono text-[11px] font-bold text-black/70 block truncate">
              {formatProductPrice(product.price, currency)}
            </span>
          </div>
        </div>
      )}
    </motion.article>
  );
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
  const { lang, t } = useLanguage();
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
            {gridProducts.map((product, index) => (
              <BestsellerMobileCard
                key={`mobile-${product.id}`}
                product={product}
                index={index}
                total={gridProducts.length}
                allProducts={gridProducts}
                isWishlisted={wishlist.has(product.id)}
                onToggleWishlist={toggleWishlist}
                imageFor={imageFor}
                currency={currency}
                reduceMotion={reduceMotion}
                lang={lang}
                t={t}
              />
            ))}
          </div>

          {/* =========================================================================
              DESKTOP: INTERACTIVE MORPHING LUNCHBOX TRAY (Accordion Bento)
              ========================================================================= */}
          <div
            className="hidden lg:flex w-full h-[640px] xl:h-[700px] bg-[#E8E7E3] border border-black/20 p-2 gap-2 overflow-hidden select-none"
            onMouseLeave={() => setActiveIdx(0)}
          >
            {gridProducts.map((product, index) => (
              <BestsellerDesktopItem
                key={`desktop-${product.id}`}
                product={product}
                index={index}
                total={gridProducts.length}
                allProducts={gridProducts}
                isExpanded={index === activeIdx}
                isWishlisted={wishlist.has(product.id)}
                onSelect={() => setActiveIdx(index)}
                onToggleWishlist={toggleWishlist}
                imageFor={imageFor}
                currency={currency}
                reduceMotion={reduceMotion}
                drop={drop}
                lang={lang}
                t={t}
              />
            ))}
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
