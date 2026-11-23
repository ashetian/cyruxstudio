"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { LegalModal, type LegalTabId } from "@/components/storefront/legal-modal";
import { cn } from "@/lib/utils";
import {
  DEFAULT_STOREFRONT_CMS,
  type FooterCmsData,
  type LegalCmsData,
} from "@/lib/cms";

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
  footerCms?: FooterCmsData | null;
  legalCms?: LegalCmsData | null;
  cms?: FooterCmsData | null;
  className?: string;
}

export function StudioFooter({
  whatsappNumber = "+905551234567",
  instagramUrl = "https://instagram.com/cyruxstudio",
  footerCms,
  legalCms,
  cms,
  className = "",
}: StudioFooterProps) {
  const { t } = useLanguage();
  const formattedInstagram = formatInstagramUrl(instagramUrl);
  const resolvedFooter = footerCms ?? cms ?? DEFAULT_STOREFRONT_CMS.footer;
  const rows = resolvedFooter.navRows || DEFAULT_STOREFRONT_CMS.footer.navRows;

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

  const scrollToTarget = (targetId: string, e?: React.MouseEvent) => {
    if (isTouchDragging.current) {
      e?.preventDefault();
      return;
    }
    if (typeof window !== "undefined") {
      const cleanId = targetId.replace(/^#/, "") || "shop";
      const lenis = (window as unknown as { __lenis?: { scrollTo: (target: HTMLElement | string, options?: object) => void } }).__lenis;
      const el = document.getElementById(cleanId);
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
      {/* Monumental Invert-Highlight Rows */}
      <nav aria-label="Footer Primary Navigation" className="w-full flex flex-col">
        {rows.map((row) => {
          const rowClass =
            "group w-full min-h-[44px] text-left py-5 sm:py-7 md:py-9 px-5 sm:px-8 md:px-12 border-b border-neutral-900/80 transition-colors duration-200 touch-manipulation md:hover:bg-[#FAF8F3] md:hover:text-black active:bg-[#FAF8F3] active:text-black focus:outline-none focus-visible:bg-[#FAF8F3] focus-visible:text-black flex items-center justify-between cursor-pointer";

          if (row.actionType === "scroll" || row.href.startsWith("#")) {
            return (
              <button
                key={row.id}
                type="button"
                onClick={(e) => scrollToTarget(row.href, e)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                className={rowClass}
              >
                <div className="flex items-baseline gap-3 sm:gap-6 md:gap-8">
                  <span className="font-mono text-xs sm:text-sm text-neutral-600 md:group-hover:text-black/60 group-active:text-black/60 transition-colors">
                    [{row.index}]
                  </span>
                  <span className="font-sekuya text-2xl sm:text-4xl md:text-6xl lg:text-7xl uppercase tracking-tight leading-none">
                    {t(row.label)}
                  </span>
                </div>
                <span className="font-mono text-xl sm:text-3xl md:text-5xl font-light transform md:group-hover:translate-x-3 transition-transform duration-200 text-neutral-500 md:group-hover:text-black group-active:text-black">
                  →
                </span>
              </button>
            );
          }

          if (row.actionType === "route" && row.href.startsWith("/")) {
            return (
              <Link key={row.id} href={row.href} className={rowClass}>
                <div className="flex items-baseline gap-3 sm:gap-6 md:gap-8">
                  <span className="font-mono text-xs sm:text-sm text-neutral-600 md:group-hover:text-black/60 group-active:text-black/60 transition-colors">
                    [{row.index}]
                  </span>
                  <span className="font-sekuya text-2xl sm:text-4xl md:text-6xl lg:text-7xl uppercase tracking-tight leading-none">
                    {t(row.label)}
                  </span>
                </div>
                <span className="font-mono text-xl sm:text-3xl md:text-5xl font-light transform md:group-hover:translate-x-3 transition-transform duration-200 text-neutral-500 md:group-hover:text-black group-active:text-black">
                  →
                </span>
              </Link>
            );
          }

          const externalHref =
            row.actionType === "whatsapp"
              ? wa
              : row.id.toLowerCase().includes("instagram")
              ? formattedInstagram
              : row.href || formattedInstagram;

          return (
            <a
              key={row.id}
              href={externalHref}
              target="_blank"
              rel="noopener noreferrer"
              className={rowClass}
            >
              <div className="flex items-baseline gap-3 sm:gap-6 md:gap-8">
                <span className="font-mono text-xs sm:text-sm text-neutral-600 md:group-hover:text-black/60 group-active:text-black/60 transition-colors">
                  [{row.index}]
                </span>
                <span className="font-sekuya text-2xl sm:text-4xl md:text-6xl lg:text-7xl uppercase tracking-tight leading-none">
                  {t(row.label)}
                </span>
              </div>
              <span className="font-mono text-xl sm:text-3xl md:text-5xl font-light transform md:group-hover:translate-x-2 md:group-hover:-translate-y-2 transition-transform duration-200 text-neutral-500 md:group-hover:text-black group-active:text-black">
                ↗
              </span>
            </a>
          );
        })}
      </nav>

      {/* Center Brand Logo Emblem */}
      <div className="w-full flex justify-center items-center py-10 sm:py-16 md:py-20 select-none">
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-44 md:h-44 opacity-90 hover:opacity-100 transition-opacity duration-300">
          <Image
            src={resolvedFooter.logoUrl || "/assets/brand/logo-emblem-white.webp"}
            alt={resolvedFooter.logoAlt || "Cyrux Studio"}
            fill
            sizes="(max-width: 768px) 128px, 176px"
            className="object-contain"
          />
        </div>
      </div>

      {/* Bottom Legal & Credits Bar */}
      <div className="w-full border-t border-neutral-900/80 px-5 sm:px-8 md:px-12 py-4 sm:py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col md:flex-row items-center justify-between gap-3 font-mono text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-center sm:text-left">
          <span>
            {resolvedFooter.copyrightText || `CYRUX STUDIO © ${new Date().getFullYear()}`}
          </span>
          <span className="hidden sm:inline text-neutral-800">•</span>
          <span className="hidden sm:inline">{t(resolvedFooter.rightsText)}</span>
        </div>

        {/* Legal Links (>=44px touch targets) */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-3 gap-y-0 text-[9px] sm:text-[10px] text-neutral-600 tracking-wider">
          <button
            type="button"
            onClick={() => openLegal("privacy")}
            className="hover:text-neutral-300 transition-colors cursor-pointer py-2 px-1.5 min-h-[44px] inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {t(resolvedFooter.legalLabels.privacy)}
          </button>
          <span className="text-neutral-800 select-none">•</span>
          <button
            type="button"
            onClick={() => openLegal("terms")}
            className="hover:text-neutral-300 transition-colors cursor-pointer py-2 px-1.5 min-h-[44px] inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {t(resolvedFooter.legalLabels.terms)}
          </button>
          <span className="text-neutral-800 select-none">•</span>
          <button
            type="button"
            onClick={() => openLegal("shipping")}
            className="hover:text-neutral-300 transition-colors cursor-pointer py-2 px-1.5 min-h-[44px] inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {t(resolvedFooter.legalLabels.shipping)}
          </button>
          <span className="text-neutral-800 select-none">•</span>
          <button
            type="button"
            onClick={() => openLegal("sales")}
            className="hover:text-neutral-300 transition-colors cursor-pointer py-2 px-1.5 min-h-[44px] inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {t(resolvedFooter.legalLabels.sales)}
          </button>
        </div>

        <div className="flex items-center gap-1.5 lowercase text-neutral-500">
          <span>{resolvedFooter.creditPrefix || "made with"}</span>
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline-block" />
          <span>by</span>
          <a
            href={resolvedFooter.creditUrl || "https://instagram.com/ashetian_"}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center font-bold text-neutral-400 hover:text-white underline underline-offset-4 decoration-neutral-700 hover:decoration-white transition-colors cursor-pointer"
          >
            {resolvedFooter.creditAuthor || "ashetian_"}
          </a>
        </div>
      </div>

      <LegalModal
        isOpen={legalOpen}
        onClose={() => setLegalOpen(false)}
        initialTab={legalTab}
        legalCms={legalCms}
      />
    </footer>
  );
}

export default StudioFooter;
