"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, ShoppingBag, X, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import gsap from "gsap";
import type { Product } from "@prisma/client";
import { BRAND_TOKENS } from "@/lib/constants";
import { useLanguage } from "@/components/providers/language-provider";
import { useSearch } from "@/components/providers/search-provider";
import { formatProductPrice } from "@/components/storefront/bestseller-grid";

const dropdownContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.01,
    },
  },
};

const dropdownCardVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export interface HeroSectionProps {
  onSearchChange?: (query: string) => void;
  searchQuery?: string;
  cartCount?: number;
  onOpenCart?: () => void;
  onOpenMenu?: () => void;
  onSearchSubmit?: (query: string) => void;
  heroImage?: string;
  heroDesktopImage?: string;
  heroMobileImage?: string;
  skipEntranceAnimation?: boolean;
  products?: Product[];
  productImages?: Record<string, string>;
  currency?: string;
}

/**
 * Filter catalog items by search query matching name, category, or description (F04.4 Contract)
 */
export function filterProductsByQuery<
  T extends { name: string; category?: string; description?: string }
>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
  );
}

export function HeroSection({
  onSearchChange,
  searchQuery = "",
  cartCount = 0,
  onOpenCart,
  onOpenMenu,
  onSearchSubmit,
  heroImage = "/assets/brand/hero-cyber-portrait.webp",
  heroDesktopImage,
  heroMobileImage,
  skipEntranceAnimation = false,
  products = [],
  productImages = {},
  currency = "USD",
}: HeroSectionProps) {
  const router = useRouter();
  const { lang, toggleLang, t } = useLanguage();
  const { openSearch } = useSearch();
  const [internalQuery, setInternalQuery] = useState(searchQuery);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const titleContainerRef = useRef<HTMLHeadingElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync internal search input with external prop if controlled
  useEffect(() => {
    setInternalQuery(searchQuery);
  }, [searchQuery]);

  // Click outside to dismiss live search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const matches = useMemo(() => {
    if (!internalQuery.trim()) return [];
    return filterProductsByQuery(products, internalQuery);
  }, [products, internalQuery]);

  const suggestedSearchTerms = useMemo(() => {
    if (products && products.length > 0) {
      const terms: string[] = [];
      products.forEach((p) => {
        const words = p.name.split(" ");
        if (words[0] && !terms.includes(words[0])) terms.push(words[0]);
      });
      return terms.slice(0, 4);
    }
    return ["T-Shirt", "Hoodie", "Oversize", "Pants"];
  }, [products]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalQuery(val);
    setIsDropdownOpen(Boolean(val.trim()));
    setSelectedIndex(0);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  // GSAP Character Split-Reveal Animation on Mount (F09.2 Contract)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const fromCurtain =
      skipEntranceAnimation ||
      window.sessionStorage.getItem("cyrux_curtain_reveal") === "1";

    if (!skipEntranceAnimation && fromCurtain) {
      window.sessionStorage.removeItem("cyrux_curtain_reveal");
    }

    const prefersReducedMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || fromCurtain) {
      gsap.set(".char-split", { y: 0, opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".char-split",
        {
          y: 100,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 1.0,
          stagger: 0.04,
          ease: "power4.out",
          delay: 0.15,
        }
      );
    });

    return () => ctx.revert();
  }, [skipEntranceAnimation]);

  const characters = ["c", "y", "r", "u", "x"];

  return (
    <section
      id="hero"
      aria-label="Cyrux Studio Hero"
      className="relative min-h-[100svh] w-full overflow-hidden flex flex-col justify-between selection:bg-white selection:text-black"
      style={{ backgroundColor: BRAND_TOKENS.DARK_HERO }}
    >
      {/* 1. High-Contrast Cyber-Noir Background Image (Dynamic Desktop & Mobile) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Mobile View: Vertical Portrait */}
        <div className="block md:hidden absolute inset-0 w-full h-full">
          <Image
            src={heroMobileImage || heroImage}
            alt="Cyrux Studio Cyberpunk Editorial Model"
            fill
            loading="lazy"
            unoptimized
            quality={100}
            sizes="100vw"
            className="object-cover object-center opacity-100 scale-100 transition-transform duration-1000 ease-out"
          />
        </div>
        {/* Desktop View: Widescreen Landscape */}
        <div className="hidden md:block absolute inset-0 w-full h-full">
          <Image
            src={heroDesktopImage || heroImage}
            alt="Cyrux Studio Cyberpunk Editorial Model"
            fill
            loading="lazy"
            unoptimized
            quality={100}
            sizes="100vw"
            className="object-cover object-center opacity-100 scale-100 transition-transform duration-1000 ease-out"
          />
        </div>
        {/* Cinematic Vignette & Bottom Fade to Dark */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
      </div>

      {/* 2. Top Header Navigation Bar (F04.5 Contract) */}
      <header className="relative z-30 w-full flex items-center justify-between gap-2 px-3 sm:px-8 md:px-12 py-3.5 sm:py-5 md:py-7">
        {/* Left: Hamburger Menu Trigger */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Toggle navigation menu"
            className="group min-w-11 min-h-11 -ml-1.5 flex flex-col justify-center items-start px-2.5 gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded"
          >
            <span className="w-6 h-[1.5px] bg-white transition-all duration-300 group-hover:w-7" />
            <span className="w-4 h-[1.5px] bg-white transition-all duration-300 group-hover:w-7" />
            <span className="w-5 h-[1.5px] bg-white transition-all duration-300 group-hover:w-7" />
          </button>
        </div>

        {/* Center: Search Pill Capsule (F04.2 Contract) with Live Dynamic Results Dropdown */}
        <div ref={searchContainerRef} className="relative flex justify-center flex-1 max-w-md min-w-0 mx-1 sm:mx-6">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (matches.length > 0 && selectedIndex >= 0 && matches[selectedIndex]) {
                setIsDropdownOpen(false);
                router.push(`/products/${matches[selectedIndex].slug}`);
                return;
              }
              setIsDropdownOpen(false);
              onSearchSubmit?.(internalQuery);
            }}
            className="w-full relative flex items-center rounded-full border border-neutral-700/50 bg-black/40 backdrop-blur-md px-1 py-1 sm:py-1.5 shadow-lg transition-all duration-300 hover:border-neutral-500/60 focus-within:border-white/80 focus-within:bg-black/60"
          >
            <input
              type="search"
              role="searchbox"
              value={internalQuery}
              onChange={handleInputChange}
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 640) {
                  openSearch(internalQuery);
                }
              }}
              onFocus={() => {
                if (typeof window !== "undefined" && window.innerWidth < 640) {
                  openSearch(internalQuery);
                } else if (internalQuery.trim()) {
                  setIsDropdownOpen(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsDropdownOpen(false);
                } else if (matches.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIsDropdownOpen(true);
                    setSelectedIndex((prev) => (prev + 1) % matches.length);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIsDropdownOpen(true);
                    setSelectedIndex((prev) => (prev <= 0 ? matches.length - 1 : prev - 1));
                  }
                }
              }}
              placeholder={t({ tr: "Koleksiyonda ara...", en: "Search collection..." })}
              aria-label={t({ tr: "Koleksiyon veya parça ara", en: "Search collection, garments, accessories" })}
              className="w-full min-w-0 bg-transparent px-3 sm:px-4 text-base sm:text-sm font-mono text-white placeholder:text-neutral-400 focus:outline-none tracking-wide"
            />

            {/* Clear Search Button */}
            {internalQuery && (
              <button
                type="button"
                onClick={() => {
                  setInternalQuery("");
                  onSearchChange?.("");
                  setIsDropdownOpen(false);
                }}
                aria-label="Clear search"
                className="p-1 text-neutral-400 hover:text-white transition-colors shrink-0 mr-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Global Shortcut Pill */}
            <button
              type="button"
              onClick={() => openSearch(internalQuery)}
              aria-label="Open command search (⌘K)"
              title="Dinamik Arama Modalı (⌘K)"
              className="hidden sm:inline-flex items-center text-[9px] font-mono font-bold text-neutral-400 hover:text-white bg-neutral-900/90 px-1.5 py-0.5 border border-neutral-700/60 mr-1.5 transition-colors shrink-0"
            >
              ⌘K
            </button>

            <button
              type="submit"
              aria-label="Submit search"
              className="shrink-0 w-8 h-8 sm:w-8 sm:h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </form>

          {/* Desktop Live Dynamic Dropdown */}
          {isDropdownOpen && internalQuery.trim() && (
            <div
              role="listbox"
              aria-label={t({ tr: "Canlı Arama Sonuçları", en: "Live Search Results" })}
              className="hidden sm:block absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-[520px] md:w-[600px] max-w-[95vw] z-50 border border-white/20 bg-[#0A0A0A] rounded-none shadow-[0_25px_70px_rgba(0,0,0,0.95)] p-3.5 max-h-[460px] overflow-y-auto [scrollbar-width:thin] text-left text-white"
            >
              {matches.length > 0 ? (
                <div className="space-y-2">
                  <div className="px-1 py-1 font-mono text-[10px] uppercase tracking-widest text-neutral-400 flex items-center justify-between border-b border-white/10 pb-2">
                    <span>{matches.length} {t({ tr: "ÜRÜN BULUNDU", en: "PRODUCTS FOUND" })}</span>
                    <span className="text-neutral-500">[ENTER ↵]</span>
                  </div>

                  <motion.ul
                    key={internalQuery}
                    variants={dropdownContainerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1.5"
                  >
                    {matches.slice(0, 6).map((product, idx) => {
                      const isSelected = idx === selectedIndex;
                      const image =
                        productImages[product.slug] ||
                        product.mediaUrls[0] ||
                        "/assets/brand/logo-emblem-dark.png";
                      const isOut = product.stock <= 0;

                      return (
                        <motion.li
                          key={product.id}
                          variants={dropdownCardVariants}
                          role="option"
                          aria-selected={isSelected}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          onClick={() => {
                            setIsDropdownOpen(false);
                            router.push(`/products/${product.slug}`);
                          }}
                          className={`group relative flex flex-col justify-between border bg-[#0D0D0D] p-2 transition-all duration-150 cursor-pointer rounded-none select-none ${
                            isSelected
                              ? "border-white ring-1 ring-white bg-[#141414] shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                              : "border-white/15 hover:border-white/80 hover:bg-[#111111]"
                          }`}
                        >
                          {/* Top Tag */}
                          <div className="flex items-center justify-between font-mono text-[8.5px] uppercase tracking-widest text-neutral-400 gap-1 mb-1.5">
                            <span className="truncate">
                              {(product as unknown as { category?: string }).category || "APPAREL"}
                            </span>
                            {product.isBestseller && (
                              <span className="px-1 py-0.2 border border-white/30 bg-white/10 text-white text-[7.5px] font-mono shrink-0">
                                BEST
                              </span>
                            )}
                            {isOut && (
                              <span className="px-1 py-0.2 border border-rose-500/50 bg-rose-500/10 text-rose-400 text-[7.5px] font-mono shrink-0">
                                OUT
                              </span>
                            )}
                          </div>

                          {/* Image */}
                          <div className="relative aspect-[3/4] w-full bg-[#050505] overflow-hidden border border-white/5">
                            <Image
                              src={image}
                              alt={product.name}
                              fill
                              unoptimized
                              loading="lazy"
                              sizes="180px"
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <span className="absolute bottom-1 right-1 font-mono text-[8.5px] text-neutral-400 bg-black/85 px-1 py-0.2 border border-white/10">
                              #{String(idx + 1).padStart(2, "0")}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="mt-2 flex flex-col gap-0.5">
                            <div className="font-sans font-black text-xs uppercase tracking-tight text-white line-clamp-1 group-hover:text-neutral-200">
                              {product.name}
                            </div>
                            <div className="flex items-center justify-between mt-0.5 pt-1 border-t border-white/10">
                              <span className="font-mono font-bold text-xs text-white">
                                {formatProductPrice(product.price, currency)}
                              </span>
                              <span className="font-mono text-[9px] text-neutral-500 group-hover:text-white transition-colors flex items-center gap-0.5">
                                <span>[VIEW]</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </span>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </motion.ul>

                  {/* View All Matches Action */}
                  <div className="pt-2 mt-1 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onSearchSubmit?.(internalQuery);
                      }}
                      className="w-full py-2 px-3 bg-neutral-900 hover:bg-white hover:text-black border border-white/15 hover:border-white rounded-none transition-colors font-mono text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 text-neutral-200"
                    >
                      <span>
                        {t({
                          tr: `TÜM SONUÇLARI GÖR (${matches.length})`,
                          en: `VIEW ALL RESULTS (${matches.length})`,
                        })}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 px-4 text-center border border-dashed border-white/15 my-1">
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-white mb-1">
                    {t({
                      tr: `"${internalQuery}" İÇİN PARÇA BULUNAMADI`,
                      en: `NO MATCH FOR "${internalQuery}"`,
                    })}
                  </p>
                  <p className="font-mono text-[10px] text-neutral-400 mb-3 uppercase tracking-wider">
                    {t({
                      tr: "// ÖNERİLEN ARAMALAR:",
                      en: "// SUGGESTED SEARCHES:",
                    })}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {suggestedSearchTerms.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          setInternalQuery(term);
                          onSearchChange?.(term);
                        }}
                        className="px-2.5 py-1 bg-transparent hover:bg-white hover:text-black border border-white/20 rounded-none text-neutral-300 font-mono text-[11px] uppercase tracking-wider transition-colors"
                      >
                        [{term}]
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Language Switcher & Shopping Bag */}
        <div className="flex items-center gap-2 sm:gap-3 text-white shrink-0">
          <button
            type="button"
            onClick={toggleLang}
            aria-label={`Switch language. Current: ${lang.toUpperCase()}`}
            className="min-h-9 px-2 sm:px-2.5 py-1 rounded-full border border-neutral-700/60 bg-black/40 backdrop-blur-md text-[10px] sm:text-xs font-mono font-bold tracking-widest text-white hover:border-white/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {lang.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Shopping bag, ${cartCount} items`}
            className="relative min-w-11 min-h-11 -mr-1.5 flex items-center justify-center hover:text-neutral-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-full"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white text-black font-mono text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 3. Middle Ambient Space */}
      <div className="flex-1 min-h-[18svh] sm:min-h-[28vh]" />

      {/* 4. Monumental Display Typography ("CYRUX" - Sekuya with Horizontal Overflow Bleed) */}
      <div className="relative z-10 w-full overflow-visible select-none pb-16 sm:pb-20 md:pb-24">
        <div className="flex justify-center overflow-hidden pb-3 sm:pb-6" aria-hidden="true">
          <span className="char-split inline-block will-change-transform">
            <span className="relative block w-[clamp(3.75rem,13vw,10rem)] aspect-square">
              <Image
                src="/assets/brand/logo-emblem-white.webp"
                alt=""
                fill
                sizes="(max-width: 768px) 20vw, 160px"
                className="object-contain"
              />
            </span>
          </span>
        </div>
        <h1
          ref={titleContainerRef}
          aria-label="cyrux"
          className="relative left-1/2 -translate-x-1/2 w-[110vw] sm:w-[114vw] md:w-[118vw] text-center flex justify-between px-0 font-sekuya uppercase font-normal tracking-tight leading-[0.8] pointer-events-none select-none"
          style={{
            color: BRAND_TOKENS.CREAM_DISPLAY,
            fontSize: "clamp(4.25rem, 25vw, 32rem)",
          }}
        >
          {characters.map((char, index) => (
            <span
              key={`${char}-${index}`}
              className="inline-block overflow-hidden py-1"
              style={{ lineHeight: "0.85" }}
            >
              <span className="char-split inline-block will-change-transform">
                {char}
              </span>
            </span>
          ))}
        </h1>
      </div>
    </section>
  );
}

export default HeroSection;
