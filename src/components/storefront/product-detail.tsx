"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Minus, Plus, ShoppingBag, ChevronDown, Search } from "lucide-react";
import type { Product } from "@prisma/client";
import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/lib/seed-data";
import { useCart } from "./cart-provider";
import { CartDrawer } from "./cart-drawer";
import { MenuDrawer } from "./menu-drawer";
import { HeroSection } from "./hero-section";
import { formatProductPrice } from "./bestseller-grid";
import { useLanguage } from "@/components/providers/language-provider";
import { useSearch } from "@/components/providers/search-provider";

export interface ProductDetailProps {
  product: Product;
  others: Product[];
  productImages: Record<string, string>;
  heroImage?: string;
  currency: string;
  whatsappNumber: string;
}

const FALLBACK_IMG = "/assets/brand/logo-emblem-dark.png";

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-black/20">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-3.5 font-mono text-xs font-bold uppercase tracking-widest focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
      >
        {title}
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="pb-4 font-mono text-xs leading-relaxed text-neutral-700">{children}</div>
      )}
    </div>
  );
}

export function ProductDetail({
  product,
  others,
  productImages,
  heroImage,
  currency,
  whatsappNumber,
}: ProductDetailProps) {
  const { lang, toggleLang, t } = useLanguage();
  const { openSearch } = useSearch();
  const router = useRouter();
  const { count, openCart, addItem } = useCart();
  const reduce = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [size, setSize] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hideMobileBar, setHideMobileBar] = useState(false);
  const runwayRef = useRef<HTMLDivElement | null>(null);
  const hasTriggeredExit = useRef(false);
  const hideMobileBarRef = useRef(false);

  const variants = React.useMemo(
    () => (product.variants as unknown as ProductVariant[]) || [],
    [product.variants]
  );
  const soldOut = product.stock <= 0;

  const twinProduct = product.twinProductSlug
    ? others.find((p) => p.slug === product.twinProductSlug) || null
    : null;

  const isDiptych = Boolean(
    product.isDiptych || (product.mediaUrls && product.mediaUrls.length >= 2)
  );

  const gallery = Array.from(
    new Set([productImages[product.slug], ...product.mediaUrls].filter(Boolean))
  );
  if (gallery.length === 0) gallery.push(FALLBACK_IMG);
  const [active, setActive] = useState(0);

  const colors = React.useMemo(() => {
    const list: string[] = [];
    for (const v of variants) {
      if (v.color && !list.includes(v.color)) {
        list.push(v.color);
      }
    }
    return list;
  }, [variants]);

  const [selectedColor, setSelectedColor] = useState<string>(colors[0] || "");

  useEffect(() => {
    setActive(0);
    setSize("");
    setSelectedColor(colors[0] || "");
    setQty(1);
    setHint(null);
    setHideMobileBar(false);
    hideMobileBarRef.current = false;
    hasTriggeredExit.current = false;
    router.prefetch("/");
  }, [product.id, router, colors]);

  const displayedVariants = colors.length > 1
    ? variants.filter((v) => !v.color || v.color.toLowerCase() === selectedColor.toLowerCase())
    : variants;

  // Zero-re-render scroll listener: only triggers state once on mobile bar threshold and navigates when curtain clears viewport
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      if (!runwayRef.current || hasTriggeredExit.current) return;
      const rect = runwayRef.current.getBoundingClientRect();
      const vh = window.innerHeight || 1;

      const shouldHideBar = rect.top < vh * 0.92;
      if (shouldHideBar !== hideMobileBarRef.current) {
        hideMobileBarRef.current = shouldHideBar;
        setHideMobileBar(shouldHideBar);
      }

      if (rect.top <= 16 && !hasTriggeredExit.current) {
        hasTriggeredExit.current = true;
        window.sessionStorage.setItem("cyrux_curtain_reveal", "1");
        router.push("/");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [router]);

  const requireSize = (): string | null | undefined => {
    if (variants.length === 0) return null;
    if (!size) {
      setHint("Select a size first");
      return undefined;
    }
    return size;
  };

  const handleAdd = () => {
    if (soldOut) return;
    const v = requireSize();
    if (v === undefined) return;
    setHint(null);
    const finalVariant = colors.length > 1 ? `${selectedColor} / ${v}` : v;
    addItem(
      {
        productId: product.id,
        name: product.name,
        image: gallery[active] || gallery[0],
        price: product.price,
        variant: finalVariant,
      },
      qty
    );
    openCart();
  };

  const handleAddBothTwin = () => {
    if (soldOut || !twinProduct || twinProduct.stock <= 0) return;
    const v = requireSize();
    if (v === undefined) return;
    setHint(null);

    // 1. Add current item
    addItem(
      {
        productId: product.id,
        name: product.name,
        image: gallery[0],
        price: product.price,
        variant: v,
      },
      qty
    );

    // 2. Add twin item
    const twinVariants = (twinProduct.variants as unknown as ProductVariant[]) || [];
    const matchedTwinVariant = v
      ? twinVariants.find((tv) => tv.name.toLowerCase() === v.toLowerCase() && tv.inStock) ||
        twinVariants.find((tv) => tv.inStock)
      : undefined;

    const twinImg =
      productImages[twinProduct.slug] || twinProduct.mediaUrls[0] || gallery[0];

    addItem(
      {
        productId: twinProduct.id,
        name: twinProduct.name,
        image: twinImg,
        price: twinProduct.price,
        variant: matchedTwinVariant ? matchedTwinVariant.name : v,
      },
      qty
    );

    openCart();
  };

  const handleBuyNow = async () => {
    if (soldOut || busy) return;
    const v = requireSize();
    if (v === undefined) return;
    setHint(null);
    setBusy(true);
    const finalVariant = colors.length > 1 ? `${selectedColor} / ${v}` : v;
    try {
      const res = await fetch("/api/order/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variant: finalVariant || undefined,
          customerNotes:
            qty > 1
              ? lang === "tr"
                ? `Adet: ${qty}`
                : `Quantity: ${qty}`
              : undefined,
          lang,
        }),
      });
      const data: { success?: boolean; error?: string; redirectUrl?: string } =
        await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.redirectUrl) {
        setHint(data.error || `Order service error (${res.status}).`);
        return;
      }
      window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      setHint(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const fade = (delay = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
        };

  return (
    <div className="relative min-h-screen text-brand-black">
      {/* Fixed "/" Storefront Hero Underneath — Revealed as Product Sheet Slides Up */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none" aria-hidden="true">
        <HeroSection heroImage={heroImage} cartCount={count} skipEntranceAnimation />
      </div>

      {/* Foreground Product Sheet that Slides Up on Scroll to Bottom */}
      <main className="relative z-20 min-h-screen bg-canvas text-brand-black pb-20 sm:pb-0 shadow-[0_32px_90px_rgba(0,0,0,0.75)]">
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-8 md:px-12 py-3 sm:py-4 bg-canvas/90 backdrop-blur border-b border-black/10">
          <div className="flex items-center gap-3 sm:gap-4">
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
              className="font-mono text-xs font-bold uppercase tracking-widest py-2 hover:underline underline-offset-4"
            >
              ← cyrux
            </Link>
          </div>
          <div className="flex items-center gap-2 -mr-2">
            <button
              type="button"
              onClick={() => openSearch()}
              aria-label="Open dynamic search (⌘K)"
              className="min-h-9 px-2 sm:px-2.5 py-1 rounded-full border border-black/20 text-[10px] font-mono font-bold tracking-widest hover:border-black transition-colors flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[9px] text-neutral-500">⌘K</span>
            </button>
            <button
              type="button"
              onClick={toggleLang}
              aria-label={`Switch language. Current: ${lang.toUpperCase()}`}
              className="min-h-9 px-2 sm:px-2.5 py-1 rounded-full border border-black/20 text-[10px] font-mono font-bold tracking-widest hover:border-black transition-colors"
            >
              {lang.toUpperCase()}
            </button>
            <button
              type="button"
              onClick={openCart}
              aria-label={`Shopping bag, ${count} items`}
              className="relative min-w-11 min-h-11 flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              <ShoppingBag className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black text-white font-mono text-[10px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          </div>
        </header>

        <section className="max-w-7xl mx-auto px-4 md:px-12 py-6 sm:py-8 md:py-14 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-14">
          {/* Gallery */}
          <motion.div {...fade()} className="lg:col-span-7 flex flex-col gap-3">
            {isDiptych && gallery.length >= 2 && (
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setActive(0)}
                  className={cn(
                    "px-3 py-1.5 border transition-all cursor-pointer font-bold",
                    active === 0
                      ? "border-black bg-black text-white"
                      : "border-black/20 hover:border-black text-neutral-600 bg-white/50"
                  )}
                >
                  01. {t({ tr: "ÖN GÖĞÜS BASKISI", en: "FRONT CHEST" })}
                </button>
                <button
                  type="button"
                  onClick={() => setActive(1)}
                  className={cn(
                    "px-3 py-1.5 border transition-all cursor-pointer font-bold",
                    active === 1
                      ? "border-black bg-black text-white"
                      : "border-black/20 hover:border-black text-neutral-600 bg-white/50"
                  )}
                >
                  02. {t({ tr: "ARKA SERİGRAFİ", en: "BACK SCREENPRINT" })}
                </button>
                <span className="text-neutral-400 text-[9px] hidden sm:inline ml-auto font-bold tracking-widest">
                  [DIPTYCH ARTWORK COMPOSITION]
                </span>
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row gap-3">
            {gallery.length > 1 && (
              <ul className="flex sm:flex-col gap-2 overflow-x-auto pb-1 sm:pb-0" aria-label="Product images">
                {gallery.map((src, i) => (
                  <li key={src} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      aria-label={`Show image ${i + 1}`}
                      aria-current={i === active}
                      className={cn(
                        "relative block w-16 h-20 bg-[#EDEDEF] border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black",
                        i === active ? "border-black" : "border-transparent hover:border-black/40"
                      )}
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="64px"
                        className={cn(
                          src.includes("/assets/editorial/")
                            ? "object-cover"
                            : "object-contain p-1.5 mix-blend-multiply"
                        )}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="relative flex-1 aspect-[4/5] bg-[#EDEDEF] overflow-hidden">
              <Image
                key={gallery[active]}
                src={gallery[active]}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 58vw"
                className={cn(
                  gallery[active].includes("/assets/editorial/")
                    ? "object-cover object-center"
                    : "object-contain object-center p-6 sm:p-10 mix-blend-multiply"
                )}
              />
            </div>
          </div>
        </motion.div>

          {/* Info */}
          <motion.div {...fade(0.1)} className="lg:col-span-5 lg:sticky lg:top-24 self-start">
            <h1 className="font-mono text-xl sm:text-2xl md:text-4xl font-bold uppercase tracking-tight">
              {product.name}
            </h1>
            <p className="mt-2 sm:mt-3 font-mono text-base sm:text-lg font-bold">
              {formatProductPrice(product.price, currency)}
            </p>
            <p className="mt-4 sm:mt-5 font-mono text-xs leading-relaxed text-neutral-700">
              {product.description}
            </p>

            {/* Colorway / Twin Selector */}
            {(product.color || twinProduct || colors.length > 1) && (
              <div className="mt-6 sm:mt-7" role="group" aria-label="Select color">
                <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                  {t({ tr: "RENK", en: "COLOR" })}: <strong className="text-black font-bold">{product.color || selectedColor}</strong>
                </span>
                <div className="mt-2 flex items-center gap-2.5">
                  <div className="flex items-center gap-2 px-3 py-1.5 border border-black bg-black text-white font-mono text-xs uppercase tracking-wider">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs"
                      style={{ backgroundColor: product.colorHex || "#FAF8F3" }}
                    />
                    <span>{product.color || "CURRENT"}</span>
                  </div>

                  {twinProduct && (
                    <Link
                      href={`/products/${twinProduct.slug}`}
                      className="flex items-center gap-2 px-3 py-1.5 border border-black/30 hover:border-black bg-white/70 text-black font-mono text-xs uppercase tracking-wider transition-all hover:scale-105"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs"
                        style={{ backgroundColor: twinProduct.colorHex || "#0A0A0A" }}
                      />
                      <span>{twinProduct.color || twinProduct.name}</span>
                      <span className="text-[10px] text-neutral-400 font-bold">↗</span>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {displayedVariants.length > 0 && (
              <div className="mt-6 sm:mt-7" role="group" aria-label="Select size">
                <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                  Size{size ? `: ${size}` : ""}
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {displayedVariants.map((v) => {
                    const label = v.size || v.name.replace(/^(BLACK|WHITE)\s*\/\s*/i, "");
                    const isSelected = size === label || size === v.name;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={!v.inStock || soldOut}
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSize(label);
                          setHint(null);
                        }}
                        className={cn(
                          "min-w-11 h-11 px-3 font-mono text-xs uppercase border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer",
                          !v.inStock || soldOut
                            ? "border-black/10 text-black/30 line-through cursor-not-allowed"
                            : isSelected
                            ? "border-black bg-black text-white"
                            : "border-black/30 hover:border-black"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">Qty</span>
              <div className="flex items-center border border-black/30">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="min-w-11 min-h-11 flex items-center justify-center hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-sm w-9 text-center" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => Math.min(20, q + 1))}
                  className="min-w-11 min-h-11 flex items-center justify-center hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleAdd}
                disabled={soldOut}
                className="w-full min-h-12 border border-black py-3.5 font-mono text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-[#FAF8F3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black"
              >
                {soldOut ? t({ tr: "TÜKENDİ", en: "SOLD OUT" }) : t({ tr: "SEPETE EKLE", en: "ADD TO BAG" })}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={soldOut || busy}
                className="w-full min-h-12 bg-black text-[#FAF8F3] py-3.5 font-mono text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black"
              >
                {busy
                  ? t({ tr: "İŞLENİYOR...", en: "PROCESSING..." })
                  : t({ tr: "HEMEN AL →", en: "BUY NOW →" })}
              </button>
              {hint && (
                <p role="alert" className="font-mono text-[11px] uppercase tracking-wider text-red-700">
                  {hint}
                </p>
              )}

              {/* Complementary Twin Set Duo CTA */}
              {twinProduct && (
                <div className="mt-3 p-4 border border-black bg-[#EDEDEB] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black">
                      {t({ tr: "CHAPTER 00 • TAMAMLAYICI İKİLİ SET", en: "CHAPTER 00 • COMPLEMENTARY TWIN SET" })}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600 bg-white/80 px-2 py-0.5 border border-black/10">
                      {product.color || "WHT"} + {twinProduct.color || "BLK"}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-neutral-600 leading-relaxed">
                    {t({
                      tr: "Monokromik zıtlık ikilisi (Noir & Blanc). Albino Viper serigrafisi ile birbirini tamamlayan iki parça.",
                      en: "Two monochrome inverted sculptures (Noir & Blanc). Albino Viper serigraphy designed as a complementary pair.",
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={handleAddBothTwin}
                    disabled={soldOut || twinProduct.stock <= 0}
                    className="w-full min-h-11 border-2 border-black bg-white hover:bg-black hover:text-white font-mono text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
                  >
                    <span>{t({ tr: "İKİ RENGİ BİRLİKTE SEPETE EKLE (SET)", en: "ADD BOTH COLORWAYS TO BAG (SET)" })}</span>
                    <span className="text-xs">→</span>
                  </button>
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-black/20">
              <Accordion title={t({ tr: "DETAYLAR", en: "DETAILS" })}>
                {product.description || t({
                  tr: "Ağır gramaj tok kumaş, mimari oversize kesim. cyrux studio sınırlı arşiv serisi.",
                  en: "Heavyweight construction, oversized fit. Part of the cyrux studio archival run.",
                })}
              </Accordion>
              {isDiptych && (
                <Accordion title={t({ tr: "DIPTYCH SANAT VE BASKI KONSEPTİ", en: "DIPTYCH ARTWORK SPECIFICATION" })}>
                  {t({
                    tr: "Bu parça çift taraflı diptik bir giyilebilir sanat kompozisyonudur: Ön göğüste krom mikro-stud efektli orbital yıldız kümesi, sırtta 35mm sinematik letterbox göz bakışı serigrafisi bulunur.",
                    en: "This piece is a dual-faced diptych wearable art composition: Front chest presents the chrome micro-stud orbital constellation, while the back reveals the cinematic 35mm letterbox eye gaze screenprint.",
                  })}
                </Accordion>
              )}
              <Accordion title={t({ tr: "KARGO & TESLİMAT", en: "SHIPPING" })}>
                {t({
                  tr: "Kuzey Kıbrıs (North Cyprus) atölyemizden tüm dünyaya express kargo ile gönderilir. Siparişler doğrudan resmi WhatsApp terminali üzerinden koordine edilir.",
                  en: "Dispatched from North Cyprus with worldwide express shipping. Orders are confirmed and arranged directly over WhatsApp.",
                })}
              </Accordion>
            </div>
          </motion.div>
        </section>

        {others.length > 0 && (
          <section aria-label="You may also like" className="max-w-7xl mx-auto px-4 md:px-12 pb-12 sm:pb-16">
            <h2 className="font-mono text-lg md:text-2xl font-bold uppercase tracking-tight mb-6">
              {t({ tr: "İLGİNİZİ ÇEKEBİLİR", en: "YOU MAY ALSO LIKE" })}
            </h2>
            <ul className="flex gap-4 overflow-x-auto pb-3 snap-x">
              {others.map((o) => {
                const otherImg = productImages[o.slug] || o.mediaUrls[0] || FALLBACK_IMG;
                return (
                  <li key={o.id} className="snap-start shrink-0 w-40 sm:w-52">
                    <Link href={`/products/${o.slug}`} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-black">
                      <div className="relative aspect-[3/4] bg-[#EDEDEF] overflow-hidden">
                        <Image
                          src={otherImg}
                          alt={o.name}
                          fill
                          sizes="208px"
                          className={cn(
                            "transition-transform duration-700 group-hover:scale-105",
                            otherImg.includes("/assets/editorial/")
                              ? "object-cover"
                              : "object-contain p-3 mix-blend-multiply"
                          )}
                        />
                      </div>
                      <div className="flex justify-between gap-2 pt-2 font-mono text-[11px] uppercase">
                        <span className="line-clamp-1">{o.name}</span>
                        <span className="shrink-0">{formatProductPrice(o.price, currency)}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>

      {/* Transparent Curtain Reveal Runway (Scrolling into this lifts the product page up to expose /) */}
      <div
        ref={runwayRef}
        className="relative z-10 h-screen h-[100dvh] pointer-events-none"
        aria-hidden="true"
      />

      {/* Mobile Sticky Bottom Bar (hides automatically as curtain reveal starts) */}
      <div
        className={cn(
          "fixed bottom-0 inset-x-0 z-30 sm:hidden bg-[#FAF8F3]/95 backdrop-blur-md border-t border-black/15 px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2.5 transition-all duration-200",
          hideMobileBar && "translate-y-full opacity-0 pointer-events-none"
        )}
      >
        <button
          type="button"
          onClick={handleAdd}
          disabled={soldOut}
          className="flex-1 min-h-11 border border-black font-mono text-[11px] font-bold uppercase tracking-wider active:bg-black active:text-[#FAF8F3] disabled:opacity-40"
        >
          {soldOut ? t({ tr: "TÜKENDİ", en: "SOLD OUT" }) : t({ tr: "SEPETE EKLE", en: "ADD TO BAG" })}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={soldOut || busy}
          className="flex-1 min-h-11 bg-black text-[#FAF8F3] font-mono text-[11px] font-bold uppercase tracking-wider active:bg-neutral-800 disabled:opacity-40"
        >
          {busy
            ? t({ tr: "BEKLEYİN...", en: "WAIT..." })
            : t({ tr: "HEMEN AL →", en: "BUY NOW →" })}
        </button>
      </div>

      <CartDrawer currency={currency} />
      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} whatsappNumber={whatsappNumber} />
    </div>
  );
}

export default ProductDetail;
