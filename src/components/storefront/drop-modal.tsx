"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import type { Product } from "@prisma/client";
import { CURRENT_ACTIVE_DROP, type DropData } from "@/lib/drops";
import { useLanguage } from "@/components/providers/language-provider";
import { formatProductPrice } from "@/components/storefront/bestseller-grid";

export interface DropModalProps {
  isOpen: boolean;
  onClose: () => void;
  products?: Product[];
  productImages?: Record<string, string>;
  currency?: string;
  whatsappNumber?: string;
  drop?: DropData;
}

export function DropModal({
  isOpen,
  onClose,
  products = [],
  productImages = {},
  currency = "USD",
  whatsappNumber = "+905551234567",
  drop: dropProp,
}: DropModalProps) {
  const { lang, t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const drop = dropProp || CURRENT_ACTIVE_DROP;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  const dropProducts = products.filter((p) =>
    drop.productSlugs.includes(p.slug)
  );

  const wa = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
    t({
      tr: `Merhaba Cyrux Studio, Drop ${drop.number} (${drop.chapter}: ${drop.title}) hakkında bilgi almak istiyorum.`,
      en: `Hello Cyrux Studio, I am inquiring about Drop ${drop.number} (${drop.chapter}: ${drop.title}).`,
    })
  )}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={drop.title}
          className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-4 md:p-6"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-4xl max-h-[100dvh] sm:max-h-[90vh] bg-[#0A0A0A] text-[#FAF8F3] border-0 sm:border border-neutral-800 shadow-2xl flex flex-col overflow-hidden font-mono"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-neutral-800 bg-neutral-950/80 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-[#FAF8F3]">
                  {drop.chapter} • DROP {drop.number}: {drop.title}
                </span>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 border border-white/20 text-neutral-300 font-bold uppercase tracking-wider">
                  {t({ tr: "AKTİF DROP", en: "LIVE DROP" })}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Kapat"
                className="min-w-10 min-h-10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800/60 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-5 sm:p-8 space-y-6 sm:space-y-8 [scrollbar-width:thin]">
              {/* Drop Hero Card */}
              <div className="relative w-full h-48 sm:h-64 overflow-hidden border border-neutral-800">
                <Image
                  src={drop.bannerImage}
                  alt={drop.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="object-cover object-center brightness-[0.75]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex flex-col justify-end">
                  <span className="text-[11px] uppercase tracking-widest text-neutral-300 font-bold mb-1">
                    {drop.edition[lang]}
                  </span>
                  <h3 className="font-sans text-2xl sm:text-4xl font-black uppercase tracking-tight text-white leading-none">
                    {drop.title}
                  </h3>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-widest mt-1">
                    {drop.releaseDate[lang]} • {t({ tr: "KUZEY KIBRIS ATÖLYESİ (35.1856° N)", en: "NORTH CYPRUS ATELIER (35.1856° N)" })}
                  </span>
                </div>
              </div>

              {/* Drop Manifesto / Narrative */}
              <div className="bg-neutral-950 p-5 border border-neutral-800/80 space-y-2">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest block font-bold">
                  {t({ tr: "DROP MANİFESTOSU", en: "DROP MANIFESTO" })}
                </span>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
                  {drop.description[lang]}
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-[10px] text-neutral-400 uppercase tracking-wider">
                  <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800">
                    {t({ tr: "280-300 GSM AĞIR TARANMIŞ PAMUK", en: "280-300 GSM COMBED COTTON" })}
                  </span>
                  <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800">
                    {t({ tr: "TEKRAR BASILMAYACAK", en: "NEVER RESTOCKED" })}
                  </span>
                  <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800">
                    {t({ tr: "KUZEY KIBRIS ATÖLYESİNDEN EXPRESS GÖNDERİM", en: "EXPRESS DISPATCH FROM NORTH CYPRUS" })}
                  </span>
                </div>
              </div>

              {/* Drop Pieces Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    {t({ tr: "BU DROP'TAKİ PARÇALAR", en: "PIECES IN THIS DROP" })} ({dropProducts.length})
                  </span>
                  <span className="text-[10px] text-neutral-500 uppercase">
                    {t({ tr: "SINIRLI STOK", en: "STRICT ALLOCATION" })}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dropProducts.map((p) => {
                    const img = productImages[p.slug] || p.mediaUrls[0];
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 p-3 bg-neutral-950 border border-neutral-800/80 hover:border-neutral-600 transition-colors"
                      >
                        <div className="relative w-16 h-20 bg-[#EDEDEF] shrink-0 overflow-hidden">
                          <Image
                            src={img}
                            alt={p.name}
                            fill
                            sizes="80px"
                            className="object-contain p-1 mix-blend-multiply"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold uppercase tracking-tight text-white truncate">
                            {p.name}
                          </h4>
                          <span className="text-[11px] text-neutral-400 font-bold block mt-0.5">
                            {formatProductPrice(p.price, currency)}
                          </span>
                          <span className="text-[9px] text-neutral-400 block mt-1 uppercase">
                            {p.stock > 0 ? t({ tr: "STOKTA VAR", en: "IN STOCK" }) : t({ tr: "TÜKENDİ", en: "SOLD OUT" })}
                          </span>
                        </div>
                        <Link
                          href={`/products/${p.slug}`}
                          onClick={onClose}
                          className="shrink-0 p-2 border border-neutral-700 bg-neutral-900 hover:bg-white hover:text-black transition-colors"
                          aria-label={`View ${p.name}`}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Bottom Sticky Action Bar */}
            <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-neutral-400 uppercase tracking-widest text-center sm:text-left">
                {t({
                  tr: "DROP PARÇALARI DOĞRUDAN WHATSAPP ATÖLYESİNDEN SİPARİŞ EDİLEBİLİR",
                  en: "OFFICIAL DROP ALLOCATION DIRECTLY VIA WHATSAPP TERMINAL",
                })}
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none text-center px-5 py-2.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  {t({ tr: "WHATSAPP'TAN DROP'U SOR ↗", en: "INQUIRE ON WHATSAPP ↗" })}
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 text-xs font-bold uppercase transition-colors"
                >
                  {t({ tr: "KAPAT", en: "CLOSE" })}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default DropModal;
