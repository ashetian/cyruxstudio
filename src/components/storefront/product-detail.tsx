"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
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

export interface ColorOptionItem {
  name: string;
  hex: string;
  imageUrl: string;
  targetProduct?: Product;
}

const slideFromRightVariants: Variants = {
  enter: {
    x: "100%",
    opacity: 0,
  },
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: "spring" as const, stiffness: 320, damping: 32 },
      opacity: { duration: 0.2 },
    },
  },
  exit: {
    x: "-100%",
    opacity: 0,
    transition: {
      x: { type: "spring" as const, stiffness: 320, damping: 32 },
      opacity: { duration: 0.2 },
    },
  },
};

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

  const [currentProduct, setCurrentProduct] = useState<Product>(product);

  useEffect(() => {
    setCurrentProduct(product);
  }, [product]);

  const variants = React.useMemo(
    () => (currentProduct.variants as unknown as ProductVariant[]) || [],
    [currentProduct.variants]
  );
  const soldOut = currentProduct.stock <= 0;

  const allProductsList = React.useMemo(
    () => [product, ...others],
    [product, others]
  );

  const twinProduct = currentProduct.twinProductSlug
    ? allProductsList.find((p) => p.slug === currentProduct.twinProductSlug && p.id !== currentProduct.id) || null
    : null;

  const isDiptych = Boolean(
    currentProduct.isDiptych ||
    currentProduct.slug === "cyrux-099-orbital-tee" ||
    (currentProduct.mediaUrls && currentProduct.mediaUrls.length >= 2 && currentProduct.slug.includes("099"))
  );

  const gallery = Array.from(
    new Set([productImages[currentProduct.slug], ...currentProduct.mediaUrls].filter(Boolean))
  );
  if (gallery.length === 0) gallery.push(FALLBACK_IMG);
  const [active, setActive] = useState(0);

  const colorOptions = React.useMemo<ColorOptionItem[]>(() => {
    // 1. From variants if variants define colors:
    const fromVariants: ColorOptionItem[] = [];
    for (const v of variants) {
      if (v.color && !fromVariants.some((o) => o.name.toLowerCase() === v.color!.toLowerCase())) {
        const hex = v.colorHex || (v.color.toLowerCase().includes("white") ? "#FAF8F3" : "#0A0A0A");
        const img =
          v.imageUrl ||
          gallery.find((g) => g.toLowerCase().includes(v.color!.toLowerCase())) ||
          gallery[fromVariants.length] ||
          gallery[0];
        fromVariants.push({
          name: v.color.toUpperCase(),
          hex,
          imageUrl: img,
        });
      }
    }
    if (fromVariants.length > 1) return fromVariants;

    // 2. Twin product pairing:
    if (twinProduct) {
      const curColor = (currentProduct.color || "BLACK").toUpperCase();
      const twinColor = (twinProduct.color || "WHITE").toUpperCase();
      const curImg = gallery[0] || productImages[currentProduct.slug];
      const twinImg = productImages[twinProduct.slug] || twinProduct.mediaUrls?.[0] || curImg;
      return [
        {
          name: curColor,
          hex: currentProduct.colorHex || (curColor.includes("WHITE") ? "#FAF8F3" : "#0A0A0A"),
          imageUrl: curImg,
          targetProduct: currentProduct,
        },
        {
          name: twinColor,
          hex: twinProduct.colorHex || (twinColor.includes("WHITE") ? "#FAF8F3" : "#0A0A0A"),
          imageUrl: twinImg,
          targetProduct: twinProduct,
        },
      ];
    }

    if (currentProduct.color) {
      return [
        {
          name: currentProduct.color.toUpperCase(),
          hex: currentProduct.colorHex || "#0A0A0A",
          imageUrl: gallery[0],
        },
      ];
    }

    return [];
  }, [variants, currentProduct, twinProduct, gallery, productImages]);

  const isFrontBackDiptych = Boolean(
    isDiptych && (currentProduct.slug === "cyrux-099-orbital-tee" || colorOptions.length <= 1)
  );

  const [selectedColor, setSelectedColor] = useState<string>(() => {
    return colorOptions[0]?.name || (currentProduct.color || "BLACK").toUpperCase();
  });

  useEffect(() => {
    if (colorOptions.length > 0 && !colorOptions.some((o) => o.name.toLowerCase() === selectedColor.toLowerCase())) {
      setSelectedColor(colorOptions[0].name);
    }
  }, [colorOptions, selectedColor]);

  useEffect(() => {
    setActive(0);
    setSize("");
    setQty(1);
    setHint(null);
    setHideMobileBar(false);
    hideMobileBarRef.current = false;
    hasTriggeredExit.current = false;
    router.prefetch("/");
  }, [currentProduct.id, router]);

  const activeImageSrc = React.useMemo(() => {
    if (gallery[active]) return gallery[active];
    const matched = colorOptions.find((o) => o.name.toLowerCase() === selectedColor.toLowerCase());
    if (matched?.imageUrl) return matched.imageUrl;
    return gallery[0] || FALLBACK_IMG;
  }, [gallery, active, colorOptions, selectedColor]);

  const displayedVariants = React.useMemo(() => {
    if (colorOptions.length > 1) {
      const filtered = variants.filter(
        (v) => !v.color || v.color.toLowerCase() === selectedColor.toLowerCase()
      );
      if (filtered.length > 0) return filtered;
    }
    return variants;
  }, [variants, colorOptions, selectedColor]);

  const handleColorOptionClick = (opt: ColorOptionItem) => {
    if (opt.name.toLowerCase() === selectedColor.toLowerCase()) return;
    setSelectedColor(opt.name);

    if (opt.targetProduct && opt.targetProduct.id !== currentProduct.id) {
      setCurrentProduct(opt.targetProduct);
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", `/products/${opt.targetProduct.slug}`);
      }
      return;
    }

    if (opt.imageUrl) {
      const idx = gallery.findIndex((src) => src === opt.imageUrl);
      if (idx !== -1) {
        setActive(idx);
        return;
      }
    }
    const optIdx = colorOptions.findIndex((o) => o.name.toLowerCase() === opt.name.toLowerCase());
    if (optIdx !== -1 && gallery[optIdx]) {
      setActive(optIdx);
    }
  };

  const handleThumbnailClick = (src: string, index: number) => {
    setActive(index);
    const matched = colorOptions.find(
      (o) => o.imageUrl === src || src.toLowerCase().includes(o.name.toLowerCase())
    );
    if (matched && matched.name.toLowerCase() !== selectedColor.toLowerCase()) {
      setSelectedColor(matched.name);
      if (matched.targetProduct && matched.targetProduct.id !== currentProduct.id) {
        setCurrentProduct(matched.targetProduct);
        if (typeof window !== "undefined") {
          window.history.pushState(null, "", `/products/${matched.targetProduct.slug}`);
        }
      }
    }
  };

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
    const finalVariant = colorOptions.length > 1 ? `${selectedColor} / ${v}` : v;
    addItem(
      {
        productId: currentProduct.id,
        name: currentProduct.name,
        image: gallery[active] || gallery[0],
        price: currentProduct.price,
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
        productId: currentProduct.id,
        name: currentProduct.name,
        image: gallery[0],
        price: currentProduct.price,
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
    const finalVariant = colorOptions.length > 1 ? `${selectedColor} / ${v}` : v;
    try {
      const res = await fetch("/api/order/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: currentProduct.id,
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
            {isDiptych && gallery.length >= 2 ? (
              <div className="flex flex-col border border-black/20 bg-[#EDEDEF] w-full overflow-hidden shadow-xs">
                {/* Continuous Seamless Diptych (0 gap, 0 border between images) */}
                <div className="relative grid grid-cols-2 gap-0 w-full aspect-[2/1] overflow-hidden m-0 p-0">
                  {/* Panel 01: Front */}
                  <div className="relative aspect-square w-full h-full m-0 p-0 overflow-hidden">
                    <div className="absolute top-2.5 sm:top-3.5 left-2.5 sm:left-3.5 z-10 pointer-events-none select-none">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black text-[#FAF8F3] font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] shadow-xs">
                        {isFrontBackDiptych
                          ? `01 • ${t({ tr: "ÖN", en: "FRONT" })}`
                          : `01 • ${colorOptions[0]?.name || "NOIR"}`}
                      </span>
                    </div>
                    <Image
                      src={gallery[0]}
                      alt={`${currentProduct.name} - ${isFrontBackDiptych ? t({ tr: "Ön", en: "Front" }) : "1"}`}
                      fill
                      priority
                      sizes="(max-width: 1024px) 50vw, 35vw"
                      className="w-full h-full m-0 p-0 object-cover object-center mix-blend-multiply select-none"
                    />
                  </div>

                  {/* Panel 02: Back */}
                  <div className="relative aspect-square w-full h-full m-0 p-0 overflow-hidden">
                    <div className="absolute top-2.5 sm:top-3.5 right-2.5 sm:right-3.5 z-10 pointer-events-none select-none">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black text-[#FAF8F3] font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] shadow-xs">
                        {isFrontBackDiptych
                          ? `02 • ${t({ tr: "ARKA", en: "BACK" })}`
                          : `02 • ${colorOptions[1]?.name || "BLANC"}`}
                      </span>
                    </div>
                    <Image
                      src={gallery[1]}
                      alt={`${currentProduct.name} - ${isFrontBackDiptych ? t({ tr: "Arka", en: "Back" }) : "2"}`}
                      fill
                      priority
                      sizes="(max-width: 1024px) 50vw, 35vw"
                      className="w-full h-full m-0 p-0 object-cover object-center mix-blend-multiply select-none"
                    />
                  </div>
                </div>

                {/* Archival Diptych Status Bar */}
                <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-t border-black/10 bg-[#FAF8F3]/90 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-neutral-600">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                    <span className="font-bold text-black">
                      {isFrontBackDiptych
                        ? t({ tr: "DİPTİK GÖRÜNÜM", en: "DIPTYCH STUDY" })
                        : t({ tr: "MONOKROM İKİLİ", en: "MONOCHROME DUO" })}
                    </span>
                    <span className="text-neutral-400 hidden sm:inline">•</span>
                    <span className="text-neutral-500 hidden sm:inline">
                      {isFrontBackDiptych
                        ? t({ tr: "ÖN VE ARKA PERSPEKTİF", en: "FRONT & REVERSE PERSPECTIVE" })
                        : t({ tr: "ÇİFT VARYANT EŞLEŞMESİ", en: "DUAL COLORWAY PAIRING" })}
                    </span>
                  </div>
                  <span className="text-neutral-500 font-medium tracking-widest">
                    {isFrontBackDiptych
                      ? t({ tr: "ÇİFT YÜZLÜ SANAT", en: "DUAL PERSPECTIVE" })
                      : t({ tr: "İKİLİ KOLEKSİYON", en: "TWIN COLLECTION" })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                {gallery.length > 1 && (
                  <ul className="flex sm:flex-col gap-2 overflow-x-auto pb-1 sm:pb-0 m-0 p-0" aria-label="Product options & images">
                    {gallery.map((src, i) => {
                      const isCurrent = i === active || activeImageSrc === src;
                      return (
                        <li key={src} className="shrink-0 m-0 p-0">
                          <button
                            type="button"
                            onClick={() => handleThumbnailClick(src, i)}
                            aria-label={`Option image ${i + 1}`}
                            aria-current={isCurrent}
                            className={cn(
                              "relative block w-16 h-16 sm:w-20 sm:h-20 aspect-square bg-[#EDEDEF] border transition-all cursor-pointer m-0 p-0 overflow-hidden",
                              isCurrent
                                ? "border-black ring-1 ring-black"
                                : "border-black/20 hover:border-black/60"
                            )}
                          >
                            <Image
                              src={src}
                              alt=""
                              fill
                              sizes="80px"
                              className="w-full h-full m-0 p-0 object-cover mix-blend-multiply"
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Main Photo: Always Square (aspect-square), Zero Margin (m-0 p-0), Slide in Right to Left */}
                <div className="relative flex-1 aspect-square bg-[#EDEDEF] overflow-hidden border border-black/15 shadow-xs m-0 p-0">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={`${selectedColor}-${activeImageSrc}`}
                      variants={reduce ? {} : slideFromRightVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="relative w-full h-full m-0 p-0"
                    >
                      <Image
                        src={activeImageSrc}
                        alt={`${currentProduct.name} - ${selectedColor}`}
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 58vw"
                        className={cn(
                          "w-full h-full m-0 p-0 object-cover object-center",
                          activeImageSrc.includes("/assets/editorial/") ? "" : "mix-blend-multiply"
                        )}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div {...fade(0.1)} className="lg:col-span-5 lg:sticky lg:top-24 self-start">
            {/* Provenance & Series Tag */}
            <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-neutral-500 font-bold">
                CHAPTER 00 • ARCHIVE
              </span>
              {isDiptych && (
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 bg-black text-[#FAF8F3] font-bold">
                  {isFrontBackDiptych ? "DIPTYCH STUDY" : "DUAL COLORWAY"}
                </span>
              )}
              {currentProduct.stock <= 5 && currentProduct.stock > 0 && (
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 font-bold">
                  {t({ tr: `SON ${currentProduct.stock} ADET`, en: `ONLY ${currentProduct.stock} LEFT` })}
                </span>
              )}
            </div>

            <h1 className="font-mono text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold uppercase tracking-tight leading-[1.05]">
              {currentProduct.name}
            </h1>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-mono text-lg sm:text-xl font-bold tracking-tight">
                {formatProductPrice(currentProduct.price, currency)}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                {t({ tr: "KDV DAHİL • EXPRESS KARGO", en: "VAT INCL. • EXPRESS DISPATCH" })}
              </span>
            </div>
            <p className="mt-4 sm:mt-5 font-mono text-xs leading-relaxed text-neutral-700">
              {currentProduct.description}
            </p>

            {/* Colorway Options (Only rendered when there are genuinely multiple colors to pick from) */}
            {colorOptions.length > 1 && (
              <div className="mt-6 sm:mt-7" role="group" aria-label="Select color">
                <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                  {t({ tr: "RENK", en: "COLOR" })}: <strong className="text-black font-bold">{selectedColor}</strong>
                </span>
                <div className="mt-2 flex items-center gap-2.5 flex-wrap">
                  {colorOptions.map((opt) => {
                    const isSel = selectedColor.toLowerCase() === opt.name.toLowerCase();
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => handleColorOptionClick(opt)}
                        className={cn(
                          "flex items-center gap-2 px-3.5 py-2 border font-mono text-xs uppercase tracking-wider transition-all cursor-pointer",
                          isSel
                            ? "border-black bg-black text-white"
                            : "border-black/30 hover:border-black bg-white/70 text-black hover:scale-105"
                        )}
                      >
                        <span
                          className={cn(
                            "w-3.5 h-3.5 rounded-full border shadow-xs shrink-0",
                            isSel ? "border-white/50" : "border-black/40"
                          )}
                          style={{ backgroundColor: opt.hex }}
                        />
                        <span className="font-bold">{opt.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {displayedVariants.length > 0 && (
              <div className="mt-6 sm:mt-7" role="group" aria-label="Select size">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                    {t({ tr: "BEDEN", en: "SIZE" })}{size ? `: ${size}` : ""}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                    ARCHIVAL OVERSIZED FIT
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
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
                          "min-w-12 h-11 px-3.5 font-mono text-xs font-bold uppercase border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer",
                          !v.inStock || soldOut
                            ? "border-black/10 text-black/30 line-through cursor-not-allowed bg-neutral-100"
                            : isSelected
                            ? "border-black bg-black text-[#FAF8F3] shadow-xs"
                            : "border-black/25 hover:border-black bg-white hover:bg-neutral-50"
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
                      {currentProduct.color || "WHT"} + {twinProduct.color || "BLK"}
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
                <div className="space-y-3 font-mono text-xs">
                  <p className="leading-relaxed text-neutral-700">
                    {currentProduct.description || t({
                      tr: "Ağır gramaj tok kumaş, mimari oversize kesim. cyrux studio sınırlı arşiv serisi.",
                      en: "Heavyweight construction, oversized fit. Part of the cyrux studio archival run.",
                    })}
                  </p>
                  <div className="pt-2 border-t border-black/10 grid grid-cols-2 gap-y-1.5 gap-x-2 text-[11px]">
                    <span className="text-neutral-500 uppercase">{t({ tr: "KUMAŞ", en: "FABRIC" })}:</span>
                    <span className="font-semibold text-black">100% Cotton (280-300 GSM)</span>
                    <span className="text-neutral-500 uppercase">{t({ tr: "KESİM", en: "FIT" })}:</span>
                    <span className="font-semibold text-black">Architectural Oversize</span>
                    {currentProduct.color && (
                      <>
                        <span className="text-neutral-500 uppercase">{t({ tr: "RENK", en: "COLOR" })}:</span>
                        <span className="font-semibold text-black">{currentProduct.color}</span>
                      </>
                    )}
                    <span className="text-neutral-500 uppercase">{t({ tr: "BASKI TEKNİĞİ", en: "PRINT TECHNIQUE" })}:</span>
                    <span className="font-semibold text-black">Precision Halftone Serigraphy</span>
                    <span className="text-neutral-500 uppercase">{t({ tr: "MENŞEİ", en: "EDITION" })}:</span>
                    <span className="font-semibold text-black">Atelier Cyprus / Limited Archive</span>
                  </div>
                </div>
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
                      <div className="relative aspect-square bg-[#EDEDEF] overflow-hidden">
                        <Image
                          src={otherImg}
                          alt={o.name}
                          fill
                          sizes="208px"
                          className={cn(
                            "transition-transform duration-700 group-hover:scale-105",
                            otherImg.includes("/assets/editorial/")
                              ? "object-cover"
                              : "object-cover mix-blend-multiply"
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
