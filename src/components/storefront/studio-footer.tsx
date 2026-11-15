"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

export interface StudioFooterProps {
  whatsappNumber?: string;
  onOpenPastDrops?: () => void;
  className?: string;
}

export function StudioFooter({
  whatsappNumber = "+905551234567",
  className = "",
}: StudioFooterProps) {
  const { t } = useLanguage();

  const wa = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
    "Hello Cyrux Studio, I would like to inquire about current pieces and sizing."
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
      <div className="w-full border-t border-neutral-900/80 px-5 sm:px-8 md:px-12 py-4 sm:py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col sm:flex-row items-center justify-between gap-2.5 font-mono text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider">
        <div>
          <span>CYRUX STUDIO © {new Date().getFullYear()}</span>
          <span className="hidden sm:inline mx-2 text-neutral-700">•</span>
          <span className="hidden sm:inline">ALL RIGHTS RESERVED</span>
        </div>

        <div className="flex items-center gap-1.5 lowercase">
          <span>made with</span>
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline-block animate-pulse" />
          <span>by</span>
          <a
            href="https://instagram.com/ashetian_"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-neutral-300 hover:text-white underline underline-offset-4 decoration-neutral-600 hover:decoration-white transition-colors"
          >
            ashetian_
          </a>
        </div>
      </div>
    </footer>
  );
}

export default StudioFooter;
