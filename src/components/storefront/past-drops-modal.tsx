"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, ArrowRight, Lock, Clock } from "lucide-react";
import { DROPS_CATALOG, type DropData } from "@/lib/drops";
import { useLanguage } from "@/components/providers/language-provider";

export interface PastDropsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCurrentDrop?: () => void;
  whatsappNumber?: string;
  drops?: DropData[];
}

export function PastDropsModal({
  isOpen,
  onClose,
  onSelectCurrentDrop,
  whatsappNumber = "+905551234567",
  drops,
}: PastDropsModalProps) {
  const { lang, t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [dropsList, setDropsList] = useState<DropData[]>(drops || DROPS_CATALOG);

  useEffect(() => {
    if (drops && drops.length > 0) {
      setDropsList(drops);
      return;
    }
    if (!isOpen) return;
    let mounted = true;
    fetch("/api/drops")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data?.drops && Array.isArray(data.drops) && data.drops.length > 0) {
          setDropsList(data.drops);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [drops, isOpen]);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Past Drops Archive"
          className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-4 md:p-6"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
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
                  {t({ tr: "DROP ARŞİVİ • TÜM KOLEKSİYONLAR", en: "DROP ARCHIVE • ALL COLLECTIONS" })}
                </span>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 border border-neutral-700 text-neutral-400 uppercase tracking-wider">
                  CYRUX STUDIO ARCHIVE
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
            <div className="overflow-y-auto p-5 sm:p-8 space-y-6 [scrollbar-width:thin]">
              <p className="text-xs text-neutral-400 leading-relaxed font-sans max-w-2xl">
                {t({
                  tr: "Cyrux Studio dropları bağımsız koleksiyon serileri halinde üretilir. Bir drop tükendiğinde kalıplar ve serigrafi baskı şablonları stüdyo kasasına kaldırılır; üretim asla tekrarlanmaz.",
                  en: "Cyrux Studio drops operate as standalone atelier collections. Once a drop is exhausted, screens and garment cuts are permanently vaulted; designs are never restocked.",
                })}
              </p>

              {/* Drops List */}
              <div className="space-y-4">
                {dropsList.map((drop) => {
                  const isActive = drop.status === "active";
                  const isArchived = drop.status === "archived";
                  const isUpcoming = drop.status === "upcoming";

                  return (
                    <div
                      key={drop.id}
                      className={`relative border p-5 sm:p-6 transition-all ${
                        isActive
                          ? "border-white/30 bg-white/[0.03]"
                          : isArchived
                          ? "border-neutral-800 bg-neutral-950/80 opacity-80"
                          : "border-neutral-800/80 bg-neutral-950/40"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2.5">
                          {isArchived && <Lock className="w-3.5 h-3.5 text-neutral-500" />}
                          {isUpcoming && <Clock className="w-3.5 h-3.5 text-neutral-400" />}

                          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                            {drop.chapter} • DROP {drop.number}
                          </span>

                          <span
                            className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider ${
                              isActive
                                ? "bg-white text-black border border-white"
                                : isArchived
                                ? "bg-neutral-900 text-neutral-500 border border-neutral-800"
                                : "bg-neutral-900 text-neutral-400 border border-neutral-700"
                            }`}
                          >
                            {isActive
                              ? t({ tr: "CANLI DROP", en: "LIVE DROP" })
                              : isArchived
                              ? t({ tr: "KASADA / TÜKENDİ", en: "VAULTED" })
                              : t({ tr: "YAKINDA / PROTO", en: "UPCOMING" })}
                          </span>
                        </div>

                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
                          {drop.releaseDate[lang]}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-8">
                          <h4 className="font-sans text-xl sm:text-2xl font-black uppercase tracking-tight text-white mb-1.5">
                            {drop.title}
                          </h4>
                          <p className="text-xs text-neutral-300 font-sans leading-relaxed mb-3">
                            {drop.description[lang]}
                          </p>
                          <div className="text-[11px] text-neutral-400 uppercase tracking-wider">
                            <span className="font-bold text-white">{drop.edition[lang]}</span>
                          </div>
                        </div>

                        <div className="md:col-span-4 flex justify-start md:justify-end">
                          {isActive && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onSelectCurrentDrop?.();
                              }}
                              className="w-full md:w-auto px-5 py-2.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                            >
                              <span>{t({ tr: "DROP'U İNCELE", en: "SEE THIS DROP" })}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isArchived && (
                            <Link
                              href={`/drops/${drop.slug}`}
                              onClick={onClose}
                              className="w-full md:w-auto px-4 py-2 border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs uppercase font-bold text-center inline-flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <span>{t({ tr: "ARŞİVİ GÖR", en: "VIEW ARCHIVE" })}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          )}

                          {isUpcoming && (
                            <a
                              href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
                                t({
                                  tr: `Merhaba, Cyrux Drop ${drop.number}: ${drop.title} için erken bildirim almak istiyorum.`,
                                  en: `Hello, I'd like early notification for Cyrux Drop ${drop.number}: ${drop.title}.`,
                                })
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full md:w-auto px-4 py-2.5 border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-bold uppercase tracking-wider transition-colors text-center"
                            >
                              {t({ tr: "ÖN BİLDİRİM AL ↗", en: "EARLY ACCESS ↗" })}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-neutral-500 uppercase tracking-widest">
                CYRUX ARCHIVAL RECORD • NORTH CYPRUS ATELIER
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 text-xs font-bold uppercase transition-colors"
              >
                {t({ tr: "KAPAT", en: "CLOSE" })}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default PastDropsModal;
