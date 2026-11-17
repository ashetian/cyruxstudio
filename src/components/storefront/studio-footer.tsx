"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { LegalModal, type LegalTabId } from "@/components/storefront/legal-modal";
import { cn } from "@/lib/utils";

export function formatInstagramUrl(input?: string): string {
  if (!input) return "https://instagram.com/cyruxstudio";
  const trimmed = input.trim();
  if (!trimmed) return "https://instagram.com/cyruxstudio";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const handle = trimmed.replace(/^@/, "").replace(/^instagram\.com\//, "");
  return `https://instagram.com/${handle}`;
}

export interface StudioFooterProps {
  whatsappNumber?: string;
  instagramUrl?: string;
  onOpenPastDrops?: () => void;
  className?: string;
}

export function StudioFooter({
  whatsappNumber = "+905551234567",
  instagramUrl = "https://instagram.com/cyruxstudio",
  className = "",
}: StudioFooterProps) {
  const { t } = useLanguage();
  const formattedInstagram = formatInstagramUrl(instagramUrl);

  const [legalOpen, setLegalOpen] = React.useState(false);
  const [legalTab, setLegalTab] = React.useState<LegalTabId>("privacy");

  const openLegal = (tab: LegalTabId) => {
    setLegalTab(tab);
    setLegalOpen(true);
  };

  const wa = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
    t({
      tr: "Merhaba Cyrux Studio, mevcut parçalar ve beden ölçüleri hakkında bilgi almak istiyorum.",
      en: "Hello Cyrux Studio, I would like to inquire about current pieces and sizing.",
    })
  )}`;

  const touchStartY = React.useRef<number | null>(null);
  const touchStartX = React.useRef<number | null>(null);
  const isTouchDragging = React.useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    isTouchDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    if (dy > 8 || dx > 8) {
      isTouchDragging.current = true;
    }
  };

  const scrollToShop = (e?: React.MouseEvent) => {
    if (isTouchDragging.current) {
      e?.preventDefault();
      return;
    }
    if (typeof window !== "undefined") {
      const lenis = (window as unknown as { __lenis?: { scrollTo: (target: HTMLElement | string, options?: object) => void } }).__lenis;
      const el = document.getElementById("shop");
      if (lenis && el) {
        lenis.scrollTo(el, { duration: 1.2, offset: -20 });
      } else if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <footer
      role="contentinfo"
      aria-label="Cyrux Studio Footer"
      className={cn(
        "relative z-20 w-full bg-black text-[#FAF8F3] flex flex-col justify-between overflow-hidden border-t border-neutral-900/60 select-none",
        className
      )}
    >
      {/* 2. The 3 Monumental Invert-Highlight Rows (Balanced mobile & PC spacing) */}
      <nav aria-label="Footer Primary Navigation" className="w-full flex flex-col">
        {/* Row 1: SHOP */}
        <button
          type="button"
          onClick={scrollToShop}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          className="group w-full text-left py-5 sm:py-7 md:py-9 px-5 sm:px-8 md:px-12 border-b border-neutral-900/80 transition-colors duration-200 touch-manipulation md:hover:bg-[#FAF8F3] md:hover:text-black active:bg-[#FAF8F3] active:text-black focus:outline-none focus-visible:bg-[#FAF8F3] focus-visible:text-black flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-baseline gap-3 sm:gap-6 md:gap-8">
            <span className="font-mono text-xs sm:text-sm text-neutral-600 md:group-hover:text-black/60 group-active:text-black/60 transition-colors">
              [01]
            </span>
            <span className="font-sekuya text-2xl sm:text-4xl md:text-6xl lg:text-7xl uppercase tracking-tight leading-none">
              {t({ tr: "MAĞAZA", en: "SHOP" })}
            </span>
          </div>
          <span className="font-mono text-xl sm:text-3xl md:text-5xl font-light transform md:group-hover:translate-x-3 transition-transform duration-200 text-neutral-500 md:group-hover:text-black group-active:text-black">
            →
          </span>
        </button>

        {/* Row 2: DROPS */}
        <Link
          href="/drops"
          className="group w-full text-left py-5 sm:py-7 md:py-9 px-5 sm:px-8 md:px-12 border-b border-neutral-900/80 transition-colors duration-200 touch-manipulation md:hover:bg-[#FAF8F3] md:hover:text-black active:bg-[#FAF8F3] active:text-black focus:outline-none focus-visible:bg-[#FAF8F3] focus-visible:text-black flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-baseline gap-3 sm:gap-6 md:gap-8">
            <span className="font-mono text-xs sm:text-sm text-neutral-600 md:group-hover:text-black/60 group-active:text-black/60 transition-colors">
              [02]
            </span>
            <span className="font-sekuya text-2xl sm:text-4xl md:text-6xl lg:text-7xl uppercase tracking-tight leading-none">
              {t({ tr: "DROPLAR", en: "DROPS" })}
            </span>
          </div>
          <span className="font-mono text-xl sm:text-3xl md:text-5xl font-light transform md:group-hover:translate-x-3 transition-transform duration-200 text-neutral-500 md:group-hover:text-black group-active:text-black">
            →
          </span>
        </Link>

        {/* Row 3: WHATSAPP */}
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="group w-full text-left py-5 sm:py-7 md:py-9 px-5 sm:px-8 md:px-12 border-b border-neutral-900/80 transition-colors duration-200 touch-manipulation md:hover:bg-[#FAF8F3] md:hover:text-black active:bg-[#FAF8F3] active:text-black focus:outline-none focus-visible:bg-[#FAF8F3] focus-visible:text-black flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-baseline gap-3 sm:gap-6 md:gap-8">
            <span className="font-mono text-xs sm:text-sm text-neutral-600 md:group-hover:text-black/60 group-active:text-black/60 transition-colors">
              [03]
            </span>
            <span className="font-sekuya text-2xl sm:text-4xl md:text-6xl lg:text-7xl uppercase tracking-tight leading-none">
              WHATSAPP
            </span>
          </div>
          <span className="font-mono text-xl sm:text-3xl md:text-5xl font-light transform md:group-hover:translate-x-2 md:group-hover:-translate-y-2 transition-transform duration-200 text-neutral-500 md:group-hover:text-black group-active:text-black">
            ↗
          </span>
        </a>

        {/* Row 4: INSTAGRAM (Dynamic from Admin) */}
        <a
          href={formattedInstagram}
          target="_blank"
          rel="noopener noreferrer"
          className="group w-full text-left py-5 sm:py-7 md:py-9 px-5 sm:px-8 md:px-12 border-b border-neutral-900/80 transition-colors duration-200 touch-manipulation md:hover:bg-[#FAF8F3] md:hover:text-black active:bg-[#FAF8F3] active:text-black focus:outline-none focus-visible:bg-[#FAF8F3] focus-visible:text-black flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-baseline gap-3 sm:gap-6 md:gap-8">
            <span className="font-mono text-xs sm:text-sm text-neutral-600 md:group-hover:text-black/60 group-active:text-black/60 transition-colors">
              [04]
            </span>
            <span className="font-sekuya text-2xl sm:text-4xl md:text-6xl lg:text-7xl uppercase tracking-tight leading-none">
              INSTAGRAM
            </span>
          </div>
          <span className="font-mono text-xl sm:text-3xl md:text-5xl font-light transform md:group-hover:translate-x-2 md:group-hover:-translate-y-2 transition-transform duration-200 text-neutral-500 md:group-hover:text-black group-active:text-black">
            ↗
          </span>
        </a>
      </nav>

      {/* 3. Center Brand Logo Emblem */}
      <div className="w-full flex justify-center items-center py-10 sm:py-16 md:py-20 select-none">
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-44 md:h-44 opacity-90 hover:opacity-100 transition-opacity duration-300">
          <Image
            src="/assets/brand/logo-emblem-white.webp"
            alt="Cyrux Studio"
            fill
            sizes="(max-width: 768px) 128px, 176px"
            className="object-contain"
          />
        </div>
      </div>

      {/* 4. Bottom Legal & Credits Bar */}
      <div className="w-full border-t border-neutral-900/80 px-5 sm:px-8 md:px-12 py-4 sm:py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col md:flex-row items-center justify-between gap-3 font-mono text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-center sm:text-left">
          <span>CYRUX STUDIO © {new Date().getFullYear()}</span>
          <span className="hidden sm:inline text-neutral-800">•</span>
          <span className="hidden sm:inline">ALL RIGHTS RESERVED</span>
        </div>

        {/* Discreet Legal Links (Inconspicuous / Nizami) */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-3 gap-y-0 text-[9px] sm:text-[10px] text-neutral-600 tracking-wider">
          <button
            type="button"
            onClick={() => openLegal("privacy")}
            className="hover:text-neutral-300 transition-colors cursor-pointer py-2 px-1 min-h-[36px] sm:min-h-0 sm:py-0 inline-flex items-center"
          >
            {t({ tr: "GİZLİLİK", en: "PRIVACY" })}
          </button>
          <span className="text-neutral-800 select-none">•</span>
          <button
            type="button"
            onClick={() => openLegal("terms")}
            className="hover:text-neutral-300 transition-colors cursor-pointer py-2 px-1 min-h-[36px] sm:min-h-0 sm:py-0 inline-flex items-center"
          >
            {t({ tr: "KOŞULLAR", en: "TERMS" })}
          </button>
          <span className="text-neutral-800 select-none">•</span>
          <button
            type="button"
            onClick={() => openLegal("shipping")}
            className="hover:text-neutral-300 transition-colors cursor-pointer py-2 px-1 min-h-[36px] sm:min-h-0 sm:py-0 inline-flex items-center"
          >
            {t({ tr: "TESLİMAT & İADE", en: "SHIPPING & RETURNS" })}
          </button>
          <span className="text-neutral-800 select-none">•</span>
          <button
            type="button"
            onClick={() => openLegal("sales")}
            className="hover:text-neutral-300 transition-colors cursor-pointer py-2 px-1 min-h-[36px] sm:min-h-0 sm:py-0 inline-flex items-center"
          >
            {t({ tr: "MESAFELİ SATIŞ", en: "LEGAL NOTICE" })}
          </button>
        </div>

        <div className="flex items-center gap-1.5 lowercase text-neutral-500">
          <span>made with</span>
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline-block animate-pulse" />
          <span>by</span>
          <a
            href="https://instagram.com/ashetian_"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-neutral-400 hover:text-white underline underline-offset-4 decoration-neutral-700 hover:decoration-white transition-colors"
          >
            ashetian_
          </a>
        </div>
      </div>

      <LegalModal
        isOpen={legalOpen}
        onClose={() => setLegalOpen(false)}
        initialTab={legalTab}
      />
    </footer>
  );
}

export default StudioFooter;
