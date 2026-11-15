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
              tr: "Cyrux Studio'nun sınırlı adetli, numaralandırılmış giyilebilir sanat serileri. Her parça tek seferlik üretilir ve asla tekrar basılmaz.",
              en: "Cyrux Studio's strictly numbered, limited wearable art editions. Hand-finished at our Cyprus atelier. Never restocked.",
            })}
          </p>
        </div>

        {/* 3. Active Live Drop Monumental Spotlight */}
        <section aria-label="Active Live Drop" className="mb-16 md:mb-24">
          <div className="flex items-center justify-between mb-6">
            <span className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-300 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {t({ tr: "AKTİF CANLI DROP", en: "ACTIVE LIVE DROP" })}
            </span>
            <span className="font-mono text-xs text-neutral-500">
              {activeDrop.releaseDate[lang]}
            </span>
          </div>

          <div className="relative overflow-hidden border border-black bg-black text-white group">
            {/* Split layout: Cover Visual + Narrative */}
            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[460px] lg:min-h-[520px]">
              {/* Image banner */}
              <div className="lg:col-span-7 relative min-h-[300px] sm:min-h-[400px] overflow-hidden bg-neutral-900">
                <Image
                  src={activeDrop.bannerImage}
                  alt={activeDrop.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 lg:hidden" />
              </div>

              {/* Text content */}
              <div className="lg:col-span-5 p-6 sm:p-10 md:p-12 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-neutral-800 bg-[#0d0d0d]">
                <div>
                  <p className="font-mono text-xs text-neutral-400 tracking-widest uppercase">
                    DROP {activeDrop.number} • {activeDrop.chapter}
                  </p>
                  <h2 className="font-mono text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-white mt-2">
                    {activeDrop.title}
                  </h2>
                  <p className="font-mono text-xs text-neutral-400 mt-2 tracking-wider">
                    {activeDrop.edition[lang]}
                  </p>

                  <p className="mt-6 text-xs sm:text-sm text-neutral-300 leading-relaxed font-mono">
                    {activeDrop.description[lang]}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="font-mono text-xs text-neutral-400 flex flex-wrap items-center gap-2">
                    <span className="text-white font-bold">{activeProducts.length}</span>{" "}
                    <span>{t({ tr: "Tasarım Model", en: "Garments" })}</span>
                    <span className="text-neutral-600">•</span>
                    <span className="text-white font-bold">{activeDrop.totalPieces}</span>{" "}
                    <span>{t({ tr: "Numaralı Limitli Döküm", en: "Numbered Atelier Run" })}</span>
                  </div>

                  <Link
                    href={`/drops/${activeDrop.slug}`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors"
                  >
                    <span>{t({ tr: "DROP'U İNCELE", en: "EXPLORE DROP" })}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Preview of Pieces in Active Drop */}
          {activeProducts.length > 0 && (
            <div className="mt-6">
              <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-3">
                {t({ tr: "BU DROP'TAKİ PARÇALAR:", en: "GARMENTS IN THIS DROP:" })}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {activeProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    className="group block border border-black/10 bg-[#EDEDEB] hover:border-black transition-colors p-3"
                  >
                    <div className="relative aspect-[3/4] w-full mb-2 overflow-hidden flex items-center justify-center">
                      <Image
                        src={imageFor(p)}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 20vw"
                        className="object-contain p-2 mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <p className="font-mono text-[11px] font-bold text-black truncate uppercase">
                      {p.name}
                    </p>
                    <p className="font-mono text-[10px] text-neutral-600 mt-0.5">
                      {formatProductPrice(p.price, currency)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 4. Archived & Upcoming Drops Section */}
        <section aria-label="Archived and Prototyping Drops">
          <div className="mb-6 border-b border-black/10 pb-3 flex items-center justify-between">
            <h2 className="font-mono text-lg sm:text-xl font-bold uppercase tracking-tight text-black">
              {t({ tr: "ARŞİV & ATÖLYE PROTOTİPLERİ", en: "VAULT & ATELIER PROTOTYPES" })}
            </h2>
            {otherDropBadge && (
              <span className="font-mono text-xs text-neutral-500">{otherDropBadge}</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {otherDrops.map((drop) => {
              const isArchived = drop.status === "archived";

              return (
                <article
                  key={drop.id}
                  className="border border-black/15 hover:border-black transition-colors bg-[#EDEDEB] flex flex-col justify-between"
                >
                  <div>
                    {/* Visual Card Top */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-900 border-b border-black/10">
                      <Image
                        src={drop.bannerImage}
                        alt={drop.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover object-center filter grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                      />
                      <div className="absolute top-3 left-3">
                        <span
                          className={cn(
                            "px-2.5 py-1 font-mono text-[10px] font-bold tracking-widest uppercase border",
                            isArchived
                              ? "bg-neutral-900 text-neutral-300 border-neutral-700"
                              : "bg-amber-100 text-amber-900 border-amber-300"
                          )}
                        >
                          {isArchived
                            ? t({ tr: "KASADA SAKLANDI", en: "VAULTED" })
                            : t({ tr: "PROTOTİP AŞAMASINDA", en: "PROTOTYPING" })}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-0.5 bg-black/60 text-white font-mono text-[10px]">
                          {drop.releaseDate[lang]}
                        </span>
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="p-6">
                      <p className="font-mono text-xs text-neutral-500 uppercase tracking-widest">
                        DROP {drop.number} • {drop.chapter}
                      </p>
                      <h3 className="font-mono text-xl sm:text-2xl font-bold uppercase tracking-tight text-black mt-1">
                        {drop.title}
                      </h3>
                      <p className="font-mono text-xs text-neutral-600 mt-1">
                        {drop.edition[lang]}
                      </p>
                      <p className="mt-4 text-xs text-neutral-700 font-mono leading-relaxed line-clamp-3">
                        {drop.description[lang]}
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom Action */}
                  <div className="p-6 pt-0 border-t border-black/10 flex items-center justify-between mt-4">
                    <span className="font-mono text-xs text-neutral-600">
                      {drop.totalPieces} {t({ tr: "Parça Drop", en: "Pieces Run" })}
                    </span>
                    <Link
                      href={`/drops/${drop.slug}`}
                      className="font-mono text-xs font-bold uppercase tracking-wider text-black hover:underline flex items-center gap-1.5 py-2"
                    >
                      <span>{t({ tr: "DETAYLARI GÖR", en: "VIEW DETAILS" })}</span>
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
