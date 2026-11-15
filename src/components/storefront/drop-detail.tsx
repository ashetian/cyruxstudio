"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Search, ArrowRight, ShieldCheck, ArrowLeft, MessageSquare } from "lucide-react";
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

  const isArchived = drop.status === "archived";
  const isUpcoming = drop.status === "upcoming";
  const isActive = drop.status === "active";

  const imageFor = (p: Product): string =>
    productImages[p.slug] || p.mediaUrls[0] || "/assets/brand/logo-emblem-dark.png";

  const waInquiryUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hello Cyrux Studio, I am inquiring about Drop ${drop.number}: ${drop.title} (${drop.chapter}).`
  )}`;

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

      {/* 2. Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-10 sm:py-16">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/drops"
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-neutral-600 hover:text-black hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t({ tr: "Tüm Droplara Dön", en: "Back to All Drops" })}</span>
          </Link>
        </div>

        {/* Hero Editorial Header */}
        <section aria-label="Drop Overview" className="mb-14 md:mb-20">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span
              className={cn(
                "px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest border",
                isActive && "bg-emerald-50 text-emerald-700 border-emerald-300",
                isArchived && "bg-neutral-900 text-neutral-200 border-neutral-700",
                isUpcoming && "bg-amber-100 text-amber-900 border-amber-300"
              )}
            >
              {isActive && (
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
              )}
              {isActive
                ? t({ tr: "CANLI DROP", en: "LIVE DROP" })
                : isArchived
                ? t({ tr: "KASADA SAKLANDI / TÜKENDİ", en: "VAULTED / SOLD OUT" })
                : t({ tr: "ATÖLYE PROTOTİP DROPU", en: "ATELIER PROTOTYPING" })}
            </span>
            <span className="font-mono text-xs text-neutral-500">
              {drop.releaseDate[lang]}
            </span>
            {products.length > 0 && (
              <>
                <span className="font-mono text-xs text-neutral-400">•</span>
                <span className="font-mono text-xs text-neutral-500">
                  {products.length} {t({ tr: "Model", en: "Garments" })}
                </span>
              </>
            )}
          </div>

          <h1 className="font-mono text-3xl sm:text-5xl md:text-6xl font-bold uppercase tracking-tight text-black">
            DROP {drop.number} • {drop.title}
          </h1>
          <p className="font-mono text-sm sm:text-base text-neutral-600 font-semibold tracking-wider uppercase mt-2">
            {drop.chapter} — {drop.edition[lang]}
          </p>

          {/* Visual Showcase Banner */}
          <div className="relative aspect-[21/9] sm:aspect-[2.6/1] w-full my-8 overflow-hidden bg-neutral-900 border border-black">
            <Image
              src={drop.bannerImage}
              alt={drop.title}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1200px"
              className={cn(
                "object-cover object-center",
                isArchived && "filter grayscale opacity-75"
              )}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 flex items-end justify-between text-white font-mono text-xs">
              <span className="tracking-widest uppercase">
                CYPRUS ATELIER ARCHIVE • DROP #{drop.number}
              </span>
              <span className="hidden sm:inline opacity-70">
                CYRUX STUDIO
              </span>
            </div>
          </div>

          {/* Editorial Narrative Manifesto */}
          <div className="max-w-3xl">
            <h2 className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">
              {t({ tr: "DROP MANİFESTOSU", en: "DROP MANIFESTO" })}
            </h2>
            <p className="font-mono text-sm sm:text-base text-neutral-800 leading-relaxed">
              {drop.description[lang]}
            </p>
          </div>
        </section>

        {/* 3. Drop Garments Section (Active Drop) */}
        {isActive && (
          <section aria-label="Drop Products" className="mb-16">
            <div className="border-b border-black/10 pb-4 mb-8 flex items-baseline justify-between">
              <div>
                <h2 className="font-mono text-2xl sm:text-3xl font-bold uppercase tracking-tight text-black">
                  {t({ tr: "Drop Parçaları", en: "Garments in this Drop" })}
                </h2>
                <p className="font-mono text-xs text-neutral-500 mt-1 uppercase tracking-wider">
                  {products.length} {t({ tr: "Özel Tasarım Giyilebilir Sanat Eseri", en: "Engineered Art Pieces" })}
                </p>
              </div>
            </div>

            {products.length === 0 ? (
              <p className="font-mono text-sm text-neutral-500 py-12 text-center uppercase tracking-widest">
                {t({ tr: "Bu drop'a ait parça bulunamadı.", en: "No pieces found for this drop." })}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
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
                          <span className="font-mono text-xs uppercase tracking-widest bg-black text-white px-3 py-1 font-bold">
                            {t({ tr: "TÜKENDİ", en: "SOLD OUT" })}
                          </span>
                        </div>
                      )}

                      {/* Product Image: 100% Uncropped & Razor-Sharp */}
                      <div className="relative aspect-[3/4] w-full min-h-[320px] overflow-hidden flex items-center justify-center">
                        <Image
                          src={imageFor(product)}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className={cn(
                            "transition-transform duration-700 ease-out group-hover:scale-105",
                            imageFor(product).includes("/assets/editorial/")
                              ? "object-cover object-center"
                              : "object-contain object-center p-8 mix-blend-multiply",
                            isOutOfStock && "grayscale opacity-60"
                          )}
                        />
                      </div>

                      {/* Bottom Info Strip */}
                      <div className="relative z-[2] border-t border-black/10 bg-white/50 backdrop-blur-xs px-4 py-3 flex items-center justify-between shrink-0">
                        <h3 className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-black truncate pr-2">
                          {product.name}
                        </h3>
                        <span className="font-mono text-xs sm:text-sm font-bold text-black shrink-0">
                          {formatProductPrice(product.price, currency)}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 4. Vaulted / Archived Notice Section */}
        {isArchived && (
          <section className="mb-16 border border-neutral-900 bg-black text-white p-8 sm:p-12 max-w-3xl">
            <div className="flex items-center gap-3 font-mono text-xs text-neutral-400 mb-4 uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-neutral-300" />
              <span>ARŞİV KASASI PROTOKOLÜ (VAULT PERMANENT ARCHIVE)</span>
            </div>
            <h3 className="font-mono text-xl sm:text-2xl font-bold uppercase tracking-tight text-white mb-3">
              {t({ tr: "Bu Drop'un Tüm Parçaları Tükenmiştir", en: "All Pieces from This Drop Are Vaulted" })}
            </h3>
            <p className="font-mono text-xs sm:text-sm text-neutral-300 leading-relaxed">
              {t({
                tr: `${drop.chapter} ${drop.title} dropunun tüm parçaları stüdyo koleksiyoncuları tarafından rezerve edildi. Cyrux Studio felsefesi gereği geçmiş droplar asla tekrar üretilmez.`,
                en: `All pieces from the ${drop.chapter} ${drop.title} drop were reserved by studio collectors. Per Cyrux Studio philosophy, archived runs are vaulted permanently and never reissued.`,
              })}
            </p>
            <div className="mt-6 pt-6 border-t border-neutral-800 flex items-center gap-4">
              <Link
                href="/drops"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black font-mono text-xs uppercase tracking-wider font-bold hover:bg-neutral-200 transition-colors"
              >
                <span>{t({ tr: "TÜM DROPLARI GÖR", en: "VIEW ALL DROPS" })}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>
        )}

        {/* 5. Upcoming Atelier Prototyping Section */}
        {isUpcoming && (
          <section className="mb-16 border border-black/20 bg-[#EDEDEB] p-8 sm:p-12 max-w-3xl">
            <div className="flex items-center gap-2 font-mono text-xs text-amber-900 mb-4 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>ATÖLYE DROP TAKVİMİ (ATELIER ROADMAP)</span>
            </div>
            <h3 className="font-mono text-xl sm:text-2xl font-bold uppercase tracking-tight text-black mb-3">
              {t({ tr: "Prototipleme Devam Ediyor", en: "Currently Under Atelier Prototyping" })}
            </h3>
            <p className="font-mono text-xs sm:text-sm text-neutral-700 leading-relaxed mb-6">
              {drop.description[lang] || t({
                tr: "Kıbrıs atölyemizde prototip üretimi devam etmektedir. Drop tarihi duyurusu ve VIP parça rezervasyonu için WhatsApp üzerinden iletişime geçebilirsiniz.",
                en: "Currently under atelier prototyping at Cyprus studio. Inquire via WhatsApp for VIP reservation list and release updates.",
              })}
            </p>
            <a
              href={waInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-mono text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t({ tr: "WHATSAPP VIP BİLDİRİM LİSTESİ", en: "WHATSAPP VIP INQUIRY" })}</span>
            </a>
          </section>
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
