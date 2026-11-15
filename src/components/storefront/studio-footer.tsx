"use client";

import React from "react";
import Link from "next/link";
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

  const scrollToShop = () => {
    if (typeof window !== "undefined") {
      const el = document.getElementById("shop");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <footer
      role="contentinfo"
      aria-label="Cyrux Studio Footer"
      className={cn(
        "relative z-20 w-full bg-black text-[#FAF8F3] flex flex-col justify-between overflow-hidden border-t border-neutral-900/60",
        className
      )}
    >
      {/* 2. The 3 Monumental Invert-Highlight Rows (Balanced mobile & PC spacing) */}
      <nav aria-label="Footer Primary Navigation" className="w-full flex flex-col">
        {/* Row 1: SHOP */}
        <button
          type="button"
          onClick={scrollToShop}
          className="group w-full text-left py-5 sm:py-7 md:py-9 px-5 sm:px-8 md:px-12 border-b border-neutral-900/80 transition-colors duration-200 hover:bg-[#FAF8F3] hover:text-black focus:outline-none focus-visible:bg-[#FAF8F3] focus-visible:text-black flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-baseline gap-3 sm:gap-6 md:gap-8">
            <span className="font-mono text-xs sm:text-sm text-neutral-600 group-hover:text-black/60 transition-colors">
              [01]
            </span>
            <span className="font-sans text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-none">
              {t({ tr: "MAĞAZA", en: "SHOP" })}
            </span>
          </div>
          <span className="font-mono text-xl sm:text-3xl md:text-5xl font-light transform group-hover:translate-x-3 transition-transform duration-200 text-neutral-500 group-hover:text-black">
            →
          </span>
        </button>

        {/* Row 2: DROPS */}
        <Link
          href="/drops"
          className="group w-full text-left py-5 sm:py-7 md:py-9 px-5 sm:px-8 md:px-12 border-b border-neutral-900/80 transition-colors duration-200 hover:bg-[#FAF8F3] hover:text-black focus:outline-none focus-visible:bg-[#FAF8F3] focus-visible:text-black flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-baseline gap-3 sm:gap-6 md:gap-8">
            <span className="font-mono text-xs sm:text-sm text-neutral-600 group-hover:text-black/60 transition-colors">
              [02]
            </span>
            <span className="font-sans text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-none">
              {t({ tr: "DROPLAR", en: "DROPS" })}
            </span>
          </div>
          <span className="font-mono text-xl sm:text-3xl md:text-5xl font-light transform group-hover:translate-x-3 transition-transform duration-200 text-neutral-500 group-hover:text-black">
            →
          </span>
        </Link>

        {/* Row 3: WHATSAPP */}
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="group w-full text-left py-5 sm:py-7 md:py-9 px-5 sm:px-8 md:px-12 border-b border-neutral-900/80 transition-colors duration-200 hover:bg-[#FAF8F3] hover:text-black focus:outline-none focus-visible:bg-[#FAF8F3] focus-visible:text-black flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-baseline gap-3 sm:gap-6 md:gap-8">
            <span className="font-mono text-xs sm:text-sm text-neutral-600 group-hover:text-black/60 transition-colors">
              [03]
            </span>
            <span className="font-sans text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-none">
              WHATSAPP
            </span>
          </div>
          <span className="font-mono text-xl sm:text-3xl md:text-5xl font-light transform group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-200 text-neutral-500 group-hover:text-black">
            ↗
          </span>
        </a>
      </nav>

      {/* 3. Massive Edge-to-Edge Monumental Brandmark (Clean mobile safe-area spacing) */}
      <div className="w-full select-none pointer-events-none pt-8 sm:pt-12 pb-4 sm:pb-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 sm:px-8 md:px-12 pb-2 font-mono text-[9px] sm:text-[11px] text-neutral-600 uppercase tracking-widest">
          <span>CYRUX STUDIO © {new Date().getFullYear()}</span>
          <span>ALL RIGHTS RESERVED</span>
        </div>
        <h2 className="font-sans text-[20vw] sm:text-[22vw] font-black uppercase tracking-tighter leading-[0.76] text-[#FAF8F3] text-center w-full block m-0 p-0 transform translate-y-[4%]">
          cyrux
        </h2>
      </div>
    </footer>
  );
}

export default StudioFooter;
