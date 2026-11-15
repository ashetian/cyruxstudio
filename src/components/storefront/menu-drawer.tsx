"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { useSearch } from "@/components/providers/search-provider";
import { DROPS_CATALOG, type DropData } from "@/lib/drops";

export interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappNumber: string;
  onOpenPastDrops?: () => void;
  drops?: DropData[];
}

const LINKS = [
  { label: { tr: "Mağaza", en: "Shop" }, id: "shop" },
  { label: { tr: "Hakkında", en: "About" }, id: "about" },
];

export function MenuDrawer({
  isOpen,
  onClose,
  whatsappNumber,
  drops,
}: MenuDrawerProps) {
  const { lang, setLang, t } = useLanguage();
  const { openSearch } = useSearch();
  const reduce = useReducedMotion();
  const [dropsList, setDropsList] = useState<DropData[]>(drops || DROPS_CATALOG);

  useEffect(() => {
    if (drops && drops.length > 0) {
      setDropsList(drops);
      return;
    }
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
  }, [drops]);

  const dropsRangeBadge = useMemo(() => {
    if (!dropsList || dropsList.length === 0) return null;
    const nums = dropsList
      .map((d) => d.number?.trim())
      .filter((n): n is string => Boolean(n));
    if (nums.length === 0) return null;
    if (nums.length === 1) return nums[0];

    const sorted = [...nums].sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
    return `${sorted[0]}–${sorted[sorted.length - 1]}`;
  }, [dropsList]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    onClose();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (typeof window !== "undefined") {
      window.location.assign(`/#${id}`);
    }
  };

  const dur = reduce ? 0 : 0.35;
  const wa = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70]">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.nav
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            className="absolute left-0 top-0 h-[100dvh] w-full max-w-sm bg-black text-[#FAF8F3] flex flex-col justify-between px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: dur, ease: [0.22, 1, 0.36, 1] }}
          >
            <div>
              <div className="flex items-center justify-between">
                {/* Language Switcher in Menu */}
                <div className="flex items-center gap-1 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setLang("tr")}
                    className={cn(
                      "px-2.5 py-1 border transition-colors",
                      lang === "tr"
                        ? "border-white bg-white text-black font-bold"
                        : "border-neutral-800 text-neutral-400 hover:text-white"
                    )}
                  >
                    TR
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang("en")}
                    className={cn(
                      "px-2.5 py-1 border transition-colors",
                      lang === "en"
                        ? "border-white bg-white text-black font-bold"
                        : "border-neutral-800 text-neutral-400 hover:text-white"
                    )}
                  >
                    EN
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close menu"
                  className="min-w-11 min-h-11 -mr-2 flex items-center justify-center rounded-full hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Dynamic Search Quick Trigger */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openSearch();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white transition-all text-xs font-mono"
                >
                  <span className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-neutral-400" />
                    <span>{t({ tr: "Dinamik Arama", en: "Dynamic Search" })}</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700">
                    ⌘K
                  </span>
                </button>
              </div>

              <ul className="mt-6 sm:mt-8 space-y-4 sm:space-y-5">
                {LINKS.map((l) => (
                  <li key={l.id}>
                    <a
                      href={`#${l.id}`}
                      onClick={(e) => go(e, l.id)}
                      className="inline-block py-1 font-mono text-2xl sm:text-3xl font-bold uppercase tracking-tight hover:text-neutral-400 transition-colors focus:outline-none focus-visible:underline"
                    >
                      {l.label[lang]}
                    </a>
                  </li>
                ))}
                <li>
                  <Link
                    href="/drops"
                    onClick={onClose}
                    className="w-full text-left py-1 font-mono text-2xl sm:text-3xl font-bold uppercase tracking-tight hover:text-white transition-colors focus:outline-none focus-visible:underline flex items-center justify-between"
                  >
                    <span>{t({ tr: "Droplar", en: "Drops" })}</span>
                    {dropsRangeBadge && (
                      <span className="text-xs px-2 py-0.5 border border-white/20 text-neutral-400 font-normal">
                        {dropsRangeBadge}
                      </span>
                    )}
                  </Link>
                </li>
                <li>
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block py-1 font-mono text-2xl sm:text-3xl font-bold uppercase tracking-tight hover:text-neutral-400 transition-colors focus:outline-none focus-visible:underline"
                  >
                    WhatsApp ↗
                  </a>
                </li>
              </ul>
            </div>

            <div className="pt-6 border-t border-neutral-800 font-mono text-[11px] text-neutral-500 uppercase tracking-widest">
              CYPRUS ATELIER • CYRUX STUDIO
            </div>
          </motion.nav>
        </div>
      )}
    </AnimatePresence>
  );
}

export default MenuDrawer;
