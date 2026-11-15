"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Search, ArrowRight } from "lucide-react";
import type { Product } from "@prisma/client";
import { cn } from "@/lib/utils";
import { DROPS_CATALOG, type DropData } from "@/lib/drops";
import { useLanguage } from "@/components/providers/language-provider";
import { useCart } from "@/components/storefront/cart-provider";
import { useSearch } from "@/components/providers/search-provider";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { MenuDrawer } from "@/components/storefront/menu-drawer";
import { StudioFooter } from "@/components/storefront/studio-footer";
import { formatProductPrice } from "@/components/storefront/bestseller-grid";

export interface DropsIndexProps {
  products: Product[];
  productImages?: Record<string, string>;
  currency?: string;
  whatsappNumber?: string;
  drops?: DropData[];
}

export function DropsIndex({
  products,
  productImages = {},
  currency = "USD",
  whatsappNumber = "+905551234567",
  drops,
}: DropsIndexProps) {
  const { lang, toggleLang, t } = useLanguage();
  const { count, openCart } = useCart();
  const { openSearch } = useSearch();
  const [menuOpen, setMenuOpen] = useState(false);

  const catalog = drops && drops.length > 0 ? drops : DROPS_CATALOG;
  const activeDrop = catalog.find((d) => d.status === "active") || catalog[0];
  const otherDrops = catalog.filter((d) => d.id !== activeDrop.id);

  const otherDropBadge = useMemo(() => {
    if (otherDrops.length === 0) return null;
    const nums = otherDrops.map((d) => d.number?.trim()).filter(Boolean);
    if (nums.length === 0) return null;
    if (nums.length === 1) return `DROP ${nums[0]}`;
    if (nums.length === 2) return `${nums[0]} & ${nums[1]}`;
    return `${nums.slice(0, -1).join(", ")} & ${nums[nums.length - 1]}`;
  }, [otherDrops]);

  // Products belonging to the active drop
  const activeProducts = products.filter((p) =>
    activeDrop.productSlugs.includes(p.slug)
  );

  const imageFor = (p: Product): string =>
    productImages[p.slug] || p.mediaUrls[0] || "/assets/brand/logo-emblem-dark.png";

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-brand-black flex flex-col justify-between selection:bg-black selection:text-white">
      {/* 1. Atelier Top Navigation Header */}
      <header className="sticky top-0 z-40 w-full bg-[#FAF8F3]/90 backdrop-blur-md border-b border-black/10 px-4 sm:px-8 md:px-12 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Toggle navigation menu"
            className="group min-w-11 min-h-11 -ml-2 px-2.5 flex flex-col justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black rounded"
          >
            <span className="w-6 h-[1.5px] bg-black" />
            <span className="w-4 h-[1.5px] bg-black" />
            <span className="w-5 h-[1.5px] bg-black" />
          </button>
          <Link
            href="/"
            className="font-mono text-xs font-bold uppercase tracking-widest py-2 hover:underline underline-offset-4 flex items-center gap-2"
          >
            <span>← cyrux</span>
            <span className="text-neutral-400">/</span>
            <span className="text-neutral-600">DROPS</span>
          </Link>
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

      {/* 2. Main Drops Showcase */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-10 sm:py-16">
        {/* Title & Introduction */}
        <div className="mb-12 md:mb-16 border-b border-black/10 pb-8">
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">
            CYPRUS ATELIER ARCHIVE & RELEASES
          </p>
          <h1 className="font-mono text-3xl sm:text-5xl md:text-6xl font-bold uppercase tracking-tight text-black">
            {t({ tr: "Drop Kataloğu", en: "Drops Catalog" })}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-neutral-600 max-w-2xl font-mono leading-relaxed">
            {t({
              tr: "Cyrux Studio'nun giyilebilir sanat serileri. Her parça tek seferlik üretilir ve asla tekrar basılmaz.",
              en: "Cyrux Studio's wearable art collections. Hand-finished at our Cyprus atelier. Never restocked.",
            })}
          </p>
        </div>

        {/* 3. Drops Gallery Grid (Minimalist 2'li Kolon Grid / Galeri Fihristi) */}
        <section aria-label="Atelier Drops Gallery" className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {catalog.map((drop) => {
              const isArchived = drop.status === "archived";
              const isUpcoming = drop.status === "upcoming";
              const isActive = drop.status === "active";
              const dropProducts = products.filter((p) =>
                drop.productSlugs.includes(p.slug)
              );

              return (
                <article
                  key={drop.id}
                  className="group flex flex-col justify-between border border-black/15 hover:border-black transition-colors duration-300 bg-[#FAF8F3]"
                >
                  <div>
                    {/* Widescreen Archival Photo */}
                    <Link
                      href={`/drops/${drop.slug}`}
                      className="block relative aspect-[16/10] w-full overflow-hidden bg-black/5 border-b border-black/15 cursor-pointer"
                    >
                      <Image
                        src={drop.bannerImage}
                        alt={drop.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className={cn(
                          "object-cover object-center transition-all duration-700 ease-out group-hover:scale-105",
                          isArchived
                            ? "filter grayscale contrast-110 opacity-75 group-hover:opacity-90"
                            : "filter grayscale-[20%] contrast-105 group-hover:grayscale-0"
                        )}
                      />
                    </Link>

                    {/* Editorial Details */}
                    <div className="p-6 sm:p-8">
                      <div className="flex items-baseline justify-between gap-4 mb-2">
                        <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 font-bold">
                          DROP {drop.number} // {drop.chapter}
                        </span>
                        <span className="font-mono text-[11px] text-neutral-500 uppercase tracking-widest">
                          {drop.releaseDate[lang]}
                        </span>
                      </div>

                      <h2 className="font-mono text-2xl sm:text-3xl font-bold uppercase tracking-tight text-black group-hover:text-neutral-800 transition-colors">
                        <Link href={`/drops/${drop.slug}`}>
                          {drop.title}
                        </Link>
                      </h2>

                      <p className="font-mono text-xs text-neutral-600 uppercase tracking-wider mt-1">
                        {drop.edition[lang]}
                      </p>

                      <p className="mt-4 text-xs text-neutral-700 font-mono leading-relaxed line-clamp-3">
                        {drop.description[lang]}
                      </p>

                      {/* Boxless Minimalist Technical Spec Table (Sıfır yeşil, sıfır rozet) */}
                      <div className="mt-6 pt-5 border-t border-black/10 grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 font-mono text-[11px]">
                        <div>
                          <span className="block text-neutral-400 uppercase text-[9px] tracking-widest">
                            {t({ tr: "DURUM", en: "STATUS" })}
                          </span>
                          <span className="font-bold text-black uppercase tracking-wider">
                            {isActive
                              ? t({ tr: "CANLI DROP", en: "ACTIVE RELEASE" })
                              : isArchived
                              ? t({ tr: "ARŞİV // KASADA", en: "VAULTED" })
                              : t({ tr: "ATÖLYE PROTOTİP", en: "PROTOTYPING" })}
                          </span>
                        </div>

                        <div>
                          <span className="block text-neutral-400 uppercase text-[9px] tracking-widest">
                            {t({ tr: "PARÇA", en: "GARMENTS" })}
                          </span>
                          <span className="font-bold text-black">
                            {dropProducts.length > 0
                              ? `${dropProducts.length} ${t({ tr: "MODEL", en: "PIECES" })}`
                              : t({ tr: "ÖZEL SERİ", en: "STUDIO RUN" })}
                          </span>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <span className="block text-neutral-400 uppercase text-[9px] tracking-widest">
                            {t({ tr: "LOKASYON", en: "ATELIER" })}
                          </span>
                          <span className="font-bold text-black uppercase">
                            CYPRUS
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Link */}
                  <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0">
                    <Link
                      href={`/drops/${drop.slug}`}
                      className="w-full inline-flex items-center justify-between py-3 px-4 border border-black/20 hover:border-black bg-white/60 hover:bg-black hover:text-white font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200"
                    >
                      <span>{t({ tr: "DROP'U VE PARÇALARI İNCELE", en: "EXPLORE DROP & PIECES" })}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {/* 5. Drawers */}
      <MenuDrawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        whatsappNumber={whatsappNumber}
        drops={catalog}
      />
      <CartDrawer currency={currency} />

      {/* 6. Studio Footer (Utility bar cleanly removed) */}
      <StudioFooter whatsappNumber={whatsappNumber} />
    </div>
  );
}

export default DropsIndex;
