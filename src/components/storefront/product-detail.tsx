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

  const variants = (product.variants as unknown as ProductVariant[]) || [];
  const soldOut = product.stock <= 0;

  const gallery = Array.from(
    new Set([productImages[product.slug], ...product.mediaUrls].filter(Boolean))
  );
  if (gallery.length === 0) gallery.push(FALLBACK_IMG);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
    setSize("");
    setQty(1);
    setHint(null);
    setHideMobileBar(false);
    hideMobileBarRef.current = false;
    hasTriggeredExit.current = false;
    router.prefetch("/");
  }, [product.id, router]);

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
    openCart();
  };

  const handleBuyNow = async () => {
    if (soldOut || busy) return;
    const v = requireSize();
    if (v === undefined) return;
    setHint(null);
    setBusy(true);
    try {
      const res = await fetch("/api/order/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variant: v || undefined,
          customerNotes: qty > 1 ? `Quantity: ${qty}` : undefined,
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
          <motion.div {...fade()} className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-3">
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

            {variants.length > 0 && (
              <div className="mt-6 sm:mt-7" role="group" aria-label="Select size">
                <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                  Size{size ? `: ${size}` : ""}
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      disabled={!v.inStock || soldOut}
                      aria-pressed={size === v.name}
                      onClick={() => {
                        setSize(v.name);
                        setHint(null);
                      }}
                      className={cn(
                        "min-w-11 h-11 px-3 font-mono text-xs uppercase border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black",
                        !v.inStock || soldOut
                          ? "border-black/10 text-black/30 line-through cursor-not-allowed"
                          : size === v.name
                          ? "border-black bg-black text-white"
                          : "border-black/30 hover:border-black"
                      )}
                    >
                      {v.name}
                    </button>
                  ))}
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
            </div>

            <div className="mt-8 border-t border-black/20">
              <Accordion title={t({ tr: "DETAYLAR", en: "DETAILS" })}>
                {product.description || t({
                  tr: "Ağır gramaj tok kumaş, mimari oversize kesim. cyrux studio sınırlı arşiv serisi.",
                  en: "Heavyweight construction, oversized fit. Part of the cyrux studio archival run.",
                })}
              </Accordion>
              <Accordion title={t({ tr: "KARGO & TESLİMAT", en: "SHIPPING" })}>
                {t({
                  tr: "Kıbrıs (Cyprus) atölyemizden tüm dünyaya express kargo ile gönderilir. Siparişler doğrudan resmi WhatsApp terminali üzerinden koordine edilir.",
                  en: "Dispatched from Cyprus with worldwide express shipping. Orders are confirmed and arranged directly over WhatsApp.",
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
