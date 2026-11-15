"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Search } from "lucide-react";
import { BRAND_TOKENS } from "@/lib/constants";
import { useLanguage } from "@/components/providers/language-provider";
import { useSearch } from "@/components/providers/search-provider";
import { cn } from "@/lib/utils";

export interface NavItem {
  id: string;
  label: { tr: string; en: string } | string;
  href: string;
  isBrand: boolean;
}

export const FLOATING_NAV_ITEMS = [
  { id: "hero", label: { tr: "cyrux", en: "cyrux" }, href: "#hero", isBrand: true },
  { id: "shop", label: { tr: "Mağaza", en: "Shop" }, href: "#shop", isBrand: false },
  { id: "about", label: { tr: "Hakkında", en: "About" }, href: "#about", isBrand: false },
];

export const VALID_SECTIONS = ["hero", "shop", "about"] as const;
export type NavSection = (typeof VALID_SECTIONS)[number];

/**
 * Determine active navigation target based on current visible section (F05.4 Contract)
 */
export function getActiveNav(currentSection: string): NavSection {
  return VALID_SECTIONS.includes(currentSection as NavSection)
    ? (currentSection as NavSection)
    : "hero";
}

/**
 * Centering offset calculator for testing & layout (F05.3 Contract)
 */
export function computeFloatingNavPosition(windowWidth: number) {
  const pillWidth = 360;
  return {
    left: Math.round((windowWidth - pillWidth) / 2),
    bottom: 32, // bottom-8
  };
}

export interface FloatingNavProps {
  cartCount?: number;
  onOpenCart?: () => void;
}

export function FloatingNav({ cartCount = 0, onOpenCart }: FloatingNavProps = {}) {
  const { lang } = useLanguage();
  const { openSearch } = useSearch();
  const [activeSection, setActiveSection] = useState<NavSection>("hero");
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  // High-performance scrollspy to sync active link and handle footer visibility
  useEffect(() => {
    if (typeof window === "undefined") return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const windowHeight = window.innerHeight;

          // 1. Scrolled past hero detection for search button
          setIsScrolledPastHero(scrollY > 200);

          // 2. Hide floating nav only when user has scrolled deeply into footer
          const footerEl = document.querySelector("footer");
          if (footerEl) {
            const footerRect = footerEl.getBoundingClientRect();
            // Hide only when footer top is well inside the lower part of viewport
            setIsFooterVisible(footerRect.top <= windowHeight * 0.75);
          }

          // 3. Robust Scrollspy Section Detection (works reliably regardless of section height)
          if (scrollY < 120) {
            setActiveSection("hero");
            ticking = false;
            return;
          }

          const aboutEl = document.getElementById("about");
          const shopEl = document.getElementById("shop");
          const heroEl = document.getElementById("hero");

          const probeY = windowHeight * 0.45; // 45% down from top (focus line)

          const aboutRect = aboutEl?.getBoundingClientRect();
          const shopRect = shopEl?.getBoundingClientRect();
          const heroRect = heroEl?.getBoundingClientRect();

          // Check sections in reverse DOM order (bottom-up):
          if (aboutRect && aboutRect.top <= probeY && aboutRect.bottom > 60) {
            setActiveSection("about");
          } else if (shopRect && shopRect.top <= probeY && shopRect.bottom > 60) {
            setActiveSection("shop");
          } else if (heroRect && heroRect.top <= probeY && heroRect.bottom > 60) {
            setActiveSection("hero");
          } else if (scrollY < 350) {
            setActiveSection("hero");
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.replace("#", "");
    const targetEl = document.getElementById(targetId);

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(getActiveNav(targetId));
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", href);
      }
    }
  };

  return (
    <nav
      role="navigation"
      aria-label="Floating Main Navigation"
      className={cn(
        "fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-8 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-1.5rem)] whitespace-nowrap rounded-full border border-neutral-300/40 bg-black/85 backdrop-blur-md px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-0.5 sm:gap-2 text-[9.5px] sm:text-xs font-mono tracking-normal sm:tracking-widest text-white shadow-2xl transition-all duration-300",
        isFooterVisible && "opacity-0 pointer-events-none translate-y-8"
      )}
    >
      {FLOATING_NAV_ITEMS.map((item) => {
        const targetId = item.href.replace("#", "");
        const isActive = activeSection === targetId;

        const labelText = typeof item.label === "string" ? item.label : item.label[lang];

        if (item.isBrand) {
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              aria-current={isActive ? "page" : undefined}
              className="group shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <span
                className={cn(
                  "inline-block px-2.5 sm:px-3.5 py-1 rounded-full font-bold text-[9.5px] sm:text-[11px] tracking-normal sm:tracking-wider uppercase transition-all duration-200 group-hover:scale-105 group-active:scale-95 shadow-sm",
                  isActive
                    ? "opacity-100 ring-1 ring-white/60 shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                    : "opacity-75 hover:opacity-100"
                )}
                style={{
                  backgroundColor: BRAND_TOKENS.CREAM_DISPLAY,
                  color: BRAND_TOKENS.DARK_HERO,
                }}
              >
                [{labelText}]
              </span>
            </a>
          );
        }

        return (
          <React.Fragment key={item.href}>
            {/* Minimalist vertical divider */}
            <span className="text-neutral-500/40 select-none text-[9px] sm:text-[10px] px-0.5 sm:px-1 shrink-0">|</span>

            <a
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative shrink-0 px-2 sm:px-2.5 py-1 text-[9.5px] sm:text-[11px] uppercase tracking-normal sm:tracking-wider transition-colors duration-200 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
                isActive
                  ? "text-white font-bold"
                  : "text-neutral-400 hover:text-white"
              )}
            >
              {labelText}
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
              )}
            </a>
          </React.Fragment>
        );
      })}

      {/* Global Dynamic Search Trigger with Spring Slide-in Animation */}
      <AnimatePresence initial={false}>
        {isScrolledPastHero && (
          <motion.div
            key="floating-search-spring"
            initial={{ width: 0, opacity: 0, scale: 0.8 }}
            animate={{ width: "auto", opacity: 1, scale: 1 }}
            exit={{ width: 0, opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="flex items-center overflow-hidden shrink-0"
          >
            <span className="text-neutral-500/40 select-none text-[9px] sm:text-[10px] px-0.5 sm:px-1 shrink-0">
              |
            </span>
            <button
              type="button"
              onClick={() => openSearch()}
              aria-label="Open search (⌘K)"
              title="Dinamik Arama (⌘K)"
              className="relative shrink-0 p-1.5 sm:p-2 rounded-full text-neutral-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 flex items-center justify-center"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {onOpenCart && (
        <>
          <span className="text-neutral-500/40 select-none text-[9px] sm:text-[10px] px-0.5 sm:px-1 shrink-0">|</span>
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Shopping bag, ${cartCount} items`}
            className="relative shrink-0 p-1.5 sm:p-2 rounded-full text-neutral-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 flex items-center justify-center"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-0.5 min-w-[13px] h-[13px] sm:min-w-[14px] sm:h-[14px] px-0.5 rounded-full bg-white text-black text-[8.5px] sm:text-[9px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </>
      )}
    </nav>
  );
}

export default FloatingNav;
