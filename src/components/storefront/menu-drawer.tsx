"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { useSearch } from "@/components/providers/search-provider";
import { DROPS_CATALOG, type DropData } from "@/lib/drops";
import {
  DEFAULT_STOREFRONT_CMS,
  type BilingualText,
  type NavigationCmsData,
  type NavigationDrawerLinkCms,
} from "@/lib/cms";

export interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappNumber: string;
  instagramUrl?: string;
  onOpenPastDrops?: () => void;
  drops?: DropData[];
  navigation?: NavigationCmsData | null;
  drawerLinks?: NavigationDrawerLinkCms[];
  footerStamp?: BilingualText | string;
}

const LINKS: NavigationDrawerLinkCms[] = [
  { id: "shop", label: { tr: "Mağaza", en: "Shop" }, href: "#shop" },
  { id: "about", label: { tr: "Hakkında", en: "About" }, href: "#about" },
];

export function MenuDrawer({
  isOpen,
  onClose,
  whatsappNumber,
  instagramUrl = "https://instagram.com/cyruxstudio",
  drops,
  navigation,
  drawerLinks,
  footerStamp,
}: MenuDrawerProps) {
  const { lang, setLang, t } = useLanguage();
  const { openSearch } = useSearch();
  const reduce = useReducedMotion();
  const [dropsList, setDropsList] = useState<DropData[]>(drops || DROPS_CATALOG);

  const resolvedDrawerLinks: NavigationDrawerLinkCms[] =
    drawerLinks && drawerLinks.length > 0
      ? drawerLinks
      : navigation?.drawerLinks && navigation.drawerLinks.length > 0
      ? navigation.drawerLinks
      : DEFAULT_STOREFRONT_CMS.navigation.drawerLinks.length > 0
      ? DEFAULT_STOREFRONT_CMS.navigation.drawerLinks
      : LINKS;

  const hasDropsRouteInDrawer = resolvedDrawerLinks.some((l) => l.href === "/drops");

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
      .catch(() => { });
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

  const activeDrop = useMemo(() => dropsList.find((d) => d.status === "active") || dropsList[0], [dropsList]);

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
  const wa = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
    t({
      tr: "Merhaba Cyrux Studio, bilgi almak istiyorum.",
      en: "Hello Cyrux Studio, I would like to inquire.",
    })
  )}`;

  const resolvedStamp =
    typeof footerStamp === "string"
      ? footerStamp
      : t(footerStamp ?? navigation?.drawerFooterStamp ?? DEFAULT_STOREFRONT_CMS.navigation.drawerFooterStamp);

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
            className="absolute left-0 top-0 h-[100dvh] w-full max-w-sm bg-black text-[#FAF8F3] flex flex-col justify-between px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] overflow-y-auto"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: dur, ease: [0.22, 1, 0.36, 1] }}
          >
            <div>
              <div className="flex items-center justify-between">
                {/* Language Switcher in Menu */}
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setLang("tr")}
                    className={cn(
                      "min-w-[44px] min-h-[44px] px-3 py-2 border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white flex items-center justify-center",
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
                      "min-w-[44px] min-h-[44px] px-3 py-2 border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white flex items-center justify-center",
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
                  className="min-w-11 min-h-11 -mr-2 flex items-center justify-center rounded-full hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
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
                  className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white transition-all text-xs font-mono cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-neutral-400" />
                    <span>{t({ tr: "Ara", en: "Search" })}</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700">
                    ⌘K
                  </span>
                </button>
              </div>

              <ul className="mt-6 sm:mt-8 space-y-1.5 sm:space-y-2">
                {resolvedDrawerLinks.map((l) => {
                  const href = l.href.trim() || "/";
                  const isHash = href.startsWith("#");
                  const isExternal = href.startsWith("http");

                  return (
                    <li key={l.id || href}>
                      {isHash ? (
                        <a
                          href={href}
                          onClick={(e) => go(e, href.slice(1))}
                          className="min-h-[44px] flex items-center py-1.5 font-mono text-xl sm:text-2xl font-bold uppercase tracking-tight hover:text-neutral-400 transition-colors focus:outline-none focus-visible:underline cursor-pointer"
                        >
                          {t(l.label)}
                        </a>
                      ) : isExternal ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] flex items-center py-1.5 font-mono text-xl sm:text-2xl font-bold uppercase tracking-tight hover:text-neutral-400 transition-colors focus:outline-none focus-visible:underline cursor-pointer"
                        >
                          {t(l.label)} ↗
                        </a>
                      ) : (
                        <Link
                          href={href}
                          onClick={onClose}
                          className="min-h-[44px] flex items-center py-1.5 font-mono text-xl sm:text-2xl font-bold uppercase tracking-tight hover:text-neutral-400 transition-colors focus:outline-none focus-visible:underline cursor-pointer"
                        >
                          {t(l.label)}
                        </Link>
                      )}
                    </li>
                  );
                })}
                <li>
                  <Link
                    href="/drops/latest"
                    onClick={onClose}
                    className="w-full min-h-[44px] text-left py-1.5 font-mono text-xl sm:text-2xl font-bold uppercase tracking-tight hover:text-white transition-colors focus:outline-none focus-visible:underline flex items-center justify-between group cursor-pointer"
                  >
                    <span>{t({ tr: "Son Drop", en: "Latest Drop" })}</span>
                    <span className="text-xs px-2.5 py-1 bg-white text-black font-bold uppercase tracking-wider group-hover:bg-neutral-200">
                      {activeDrop ? `DROP ${activeDrop.number}` : "LIVE"}
                    </span>
                  </Link>
                </li>
                {!hasDropsRouteInDrawer && (
                  <li>
                    <Link
                      href="/drops"
                      onClick={onClose}
                      className="w-full min-h-[44px] text-left py-1.5 font-mono text-xl sm:text-2xl font-bold uppercase tracking-tight hover:text-white transition-colors focus:outline-none focus-visible:underline flex items-center justify-between cursor-pointer"
                    >
                      <span>{t({ tr: "Tüm Droplar", en: "Drops & Archive" })}</span>
                      {dropsRangeBadge && (
                        <span className="text-xs px-2 py-0.5 border border-white/20 text-neutral-400 font-normal">
                          {dropsRangeBadge}
                        </span>
                      )}
                    </Link>
                  </li>
                )}
                <li>
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] flex items-center py-1.5 font-mono text-xl sm:text-2xl font-bold uppercase tracking-tight hover:text-neutral-400 transition-colors focus:outline-none focus-visible:underline cursor-pointer"
                  >
                    WhatsApp ↗
                  </a>
                </li>
                <li>
                  <a
                    href={instagramUrl.startsWith("http") ? instagramUrl : `https://instagram.com/${instagramUrl.replace(/^@/, "").replace(/^instagram\.com\//, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] flex items-center py-1.5 font-mono text-xl sm:text-2xl font-bold uppercase tracking-tight hover:text-neutral-400 transition-colors focus:outline-none focus-visible:underline cursor-pointer"
                  >
                    Instagram ↗
                  </a>
                </li>
              </ul>
            </div>

            <div className="pt-6 border-t border-neutral-800 font-mono text-[11px] text-neutral-500 uppercase tracking-widest">
              {resolvedStamp}
            </div>
          </motion.nav>
        </div>
      )}
    </AnimatePresence>
  );
}

export default MenuDrawer;
