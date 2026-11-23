"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useLanguage } from "@/components/providers/language-provider";
import { formatProductPrice } from "@/components/storefront/bestseller-grid";

export interface SearchProductResult {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  isBestseller?: boolean;
  category: string;
  image: string;
}

export interface DynamicSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  currency?: string;
  popularTags?: string[];
}

const POPULAR_TAGS = [
  "T-Shirt",
  "Hoodie",
  "Oversize",
  "Jacket",
  "Pants",
  "Archive",
];

const CATEGORY_TABS = [
  { id: "all", label: { tr: "Tümü", en: "All" } },
  { id: "tee", label: { tr: "T-Shirt", en: "Tees" } },
  { id: "hoodie", label: { tr: "Hoodie", en: "Hoodies" } },
  { id: "bestseller", label: { tr: "Çok Satanlar", en: "Bestsellers" } },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.02,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export function DynamicSearchModal({
  isOpen,
  onClose,
  initialQuery = "",
  currency = "USD",
  popularTags,
}: DynamicSearchModalProps) {
  const { lang, t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [results, setResults] = useState<SearchProductResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, startTransition] = useTransition();

  // Reset and autofocus on modal open
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialQuery]);

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Live dynamic fetch
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setIsLoading(true);

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const param = encodeURIComponent(query.trim());
        const res = await fetch(`/api/products/search?q=${param}&limit=16`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (active && data.success && Array.isArray(data.products)) {
          startTransition(() => {
            setResults(data.products);
            setSelectedIndex(0);
          });
        }
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }, 100);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  // Filter results by category
  const displayedResults = results.filter((p) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "bestseller") return Boolean(p.isBestseller);
    return (
      p.category.toLowerCase().includes(selectedCategory) ||
      p.name.toLowerCase().includes(selectedCategory)
    );
  });

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (displayedResults.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % displayedResults.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev <= 0 ? displayedResults.length - 1 : prev - 1
        );
      } else if (e.key === "Enter" && displayedResults[selectedIndex]) {
        e.preventDefault();
        const selected = displayedResults[selectedIndex];
        onClose();
        router.push(`/products/${selected.slug}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, displayedResults, selectedIndex, onClose, router]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t({ tr: "Dinamik Arama", en: "Dynamic Search" })}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-start sm:p-4 md:pt-16 md:pb-10"
    >
      {/* Dark Ambient Backdrop (Desktop) */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 hidden sm:block"
      />

      {/* Main Search Panel: Fullscreen on mobile, centered modal on desktop */}
      <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[88vh] sm:max-w-3xl bg-[#0A0A0A] text-[#FAF8F3] border-none sm:border sm:border-white/20 sm:rounded-none shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col z-10 overflow-hidden">
        {/* 1. Brutalist Search Input Header */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 bg-[#0A0A0A] shrink-0">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="searchbox"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t({
              tr: "ÜRÜN VEYA KOLEKSİYON ARA...",
              en: "SEARCH PRODUCTS / DROPS...",
            })}
            aria-label={t({ tr: "Ürün ara", en: "Search products" })}
            className="w-full bg-transparent font-mono text-xs sm:text-sm tracking-wider uppercase text-white placeholder:text-neutral-600 focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear query"
              className="px-2 py-1 font-mono text-[10px] text-neutral-400 hover:text-white border border-transparent hover:border-white/20 uppercase transition-colors shrink-0"
            >
              [✕]
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-neutral-400 hover:text-white border border-white/20 hover:border-white transition-colors shrink-0 flex items-center gap-1"
          >
            <span>ESC</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2. Brutalist Category Filter Tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 border-b border-white/10 bg-[#060606] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0">
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1 font-mono text-[10px] sm:text-xs uppercase tracking-widest transition-all rounded-none border shrink-0 ${
                  isActive
                    ? "bg-white text-black border-white font-bold"
                    : "bg-transparent text-neutral-400 border-white/15 hover:border-white/50 hover:text-white"
                }`}
              >
                [{tab.label[lang]}]
              </button>
            );
          })}
        </div>

        {/* 3. Brutalist Results Cards Grid (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-neutral-800">
          {isLoading && displayedResults.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-neutral-400 font-mono text-xs uppercase tracking-widest">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
              <span>{t({ tr: "Aranıyor...", en: "Searching..." })}</span>
            </div>
          ) : displayedResults.length > 0 ? (
            <motion.ul
              ref={listRef}
              key={`${query}-${selectedCategory}`}
              variants={containerVariants}
              initial={prefersReducedMotion ? false : "hidden"}
              animate="visible"
              className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pb-2"
              role="listbox"
            >
              {displayedResults.map((product, idx) => {
                const isSelected = idx === selectedIndex;
                const isOut = product.stock <= 0;

                return (
                  <motion.li
                    key={product.id}
                    variants={cardVariants}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => {
                      onClose();
                      router.push(`/products/${product.slug}`);
                    }}
                    className={`group relative flex flex-col justify-between border bg-[#0D0D0D] p-2.5 sm:p-3 transition-all duration-150 cursor-pointer rounded-none select-none ${
                      isSelected
                        ? "border-white ring-1 ring-white bg-[#141414]"
                        : "border-white/15 hover:border-white/80 hover:bg-[#111111]"
                    }`}
                  >
                    {/* Top Metadata Header */}
                    <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-neutral-400 gap-1 mb-2">
                      <span className="truncate">
                        {product.category || "APPAREL"}
                      </span>
                      {product.isBestseller && (
                        <span className="px-1 py-0.5 border border-white/30 bg-white/10 text-white text-[8px] font-mono shrink-0">
                          BEST
                        </span>
                      )}
                      {isOut && (
                        <span className="px-1 py-0.5 border border-rose-500/50 bg-rose-500/10 text-rose-400 text-[8px] font-mono shrink-0">
                          OUT
                        </span>
                      )}
                    </div>

                    {/* Product Image Frame */}
                    <div className="relative aspect-[3/4] w-full bg-[#050505] overflow-hidden border border-white/5">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        unoptimized
                        loading="lazy"
                        sizes="(max-width: 640px) 50vw, 300px"
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Corner Index Stamp */}
                      <span className="absolute bottom-1 right-1 font-mono text-[9px] text-neutral-400 bg-black/85 px-1 py-0.5 border border-white/10">
                        #{String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Bottom Card Content */}
                    <div className="mt-2.5 flex flex-col gap-1">
                      <div className="font-sans font-black text-xs sm:text-sm uppercase tracking-tight text-white line-clamp-1 group-hover:text-neutral-200">
                        {product.name}
                      </div>

                      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/10">
                        <span className="font-mono font-bold text-xs sm:text-sm text-white">
                          {formatProductPrice(product.price, currency)}
                        </span>
                        <span className="font-mono text-[10px] text-neutral-500 group-hover:text-white transition-colors flex items-center gap-0.5">
                          <span>[VIEW]</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </motion.ul>
          ) : (
            /* Empty State */
            <div className="py-16 sm:py-20 text-center flex flex-col items-center justify-center px-4 border border-dashed border-white/15 my-4">
              <div className="font-mono text-xs sm:text-sm text-neutral-500 uppercase tracking-widest mb-2">
                {t({ tr: "SONUÇ BULUNAMADI", en: "NO MATCH FOUND" })}
              </div>
              <div className="font-sans text-base sm:text-lg font-black uppercase tracking-tight text-white mb-1">
                {t({
                  tr: query ? `"${query}" İÇİN PARÇA BULUNAMADI` : "ARAMAK İÇİN PARÇA ADI GİRİN",
                  en: query ? `NO RESULTS FOR "${query}"` : "ENTER PRODUCT NAME TO SEARCH",
                })}
              </div>
              <p className="font-mono text-[11px] text-neutral-400 max-w-sm mb-6 uppercase tracking-wider">
                {t({
                  tr: "Farklı bir terim deneyin veya popüler etiketleri seçin.",
                  en: "Try a different term or select from curated tags.",
                })}
              </p>

              {/* Brutalist Popular Tags */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-md">
                {(popularTags && popularTags.length > 0 ? popularTags : POPULAR_TAGS).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setQuery(tag)}
                    className="min-h-[44px] px-3 py-1 font-mono text-[11px] uppercase tracking-wider border border-white/20 hover:border-white hover:bg-white hover:text-black text-neutral-300 transition-all rounded-none cursor-pointer"
                  >
                    [{tag}]
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Minimal Brutalist Footer */}
        <div className="hidden sm:flex items-center justify-between px-6 py-2.5 border-t border-white/10 bg-[#060606] font-mono text-[10px] uppercase tracking-widest text-neutral-500 shrink-0">
          <span>
            {displayedResults.length > 0 &&
              t({
                tr: `${displayedResults.length} PARÇA BULUNDU`,
                en: `${displayedResults.length} PIECES FOUND`,
              })}
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-white/20 rounded-none text-[10px] text-neutral-300 font-mono">
                ↑↓
              </kbd>
              <span>{t({ tr: "GEZİN", en: "NAVIGATE" })}</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-white/20 rounded-none text-[10px] text-neutral-300 font-mono">
                ↵
              </kbd>
              <span>{t({ tr: "SEÇ", en: "SELECT" })}</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-white/20 rounded-none text-[10px] text-neutral-300 font-mono">
                ESC
              </kbd>
              <span>{t({ tr: "KAPAT", en: "CLOSE" })}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DynamicSearchModal;
