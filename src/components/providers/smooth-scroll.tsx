"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, type LenisRef } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

// ============================================================================
// 1. Core Invariants & Motion Contracts (F09.1 - F09.5)
// ============================================================================

export const LENIS_CONFIG = {
  duration: 1.2,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: "vertical" as const,
  gestureOrientation: "vertical" as const,
  smoothWheel: true,
  wheelMultiplier: 1.0,
  touchMultiplier: 1.0,
  syncTouch: false,
};

export const GSAP_REVEAL_CONFIG = {
  target: ".char-split",
  y: 100,
  opacity: 0,
  stagger: 0.04,
  duration: 1.0,
  ease: "power4.out",
};

export const HOVER_SPRING = {
  type: "spring" as const,
  stiffness: 300,
  damping: 20,
  mass: 0.5,
};

/**
 * Motion preference resolver respecting WCAG prefers-reduced-motion (F09.4 Contract)
 */
export function resolveMotionPreference(prefersReduced: boolean) {
  if (prefersReduced) {
    return {
      smoothScrollEnabled: false,
      animationDuration: 0,
      fadeTransitionsOnly: true,
    };
  }
  return {
    smoothScrollEnabled: true,
    animationDuration: 1.2,
    fadeTransitionsOnly: false,
  };
}

/**
 * Scroll progress clamp utility (F09.5 Contract)
 */
export function clampProgress(progress: number): number {
  return Math.max(0, Math.min(1, progress));
}

// ============================================================================
// 2. SmoothScrollProvider Component
// ============================================================================

interface SmoothScrollContextValue {
  prefersReducedMotion: boolean;
  isReady: boolean;
}

const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  prefersReducedMotion: false,
  isReady: false,
});

export function useSmoothScrollContext() {
  return useContext(SmoothScrollContext);
}

export interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const lenisRef = useRef<LenisRef>(null);
  const pathname = usePathname();
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Immediately stop inertial scroll and reset to top on route change
  useEffect(() => {
    if (typeof window === "undefined") return;
    lenisRef.current?.lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    const id = requestAnimationFrame(() => {
      lenisRef.current?.lenis?.resize();
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mql.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setPrefersReduced(e.matches);
    };

    mql.addEventListener("change", handleMediaChange);
    setIsReady(true);

    return () => mql.removeEventListener("change", handleMediaChange);
  }, []);

  // GSAP Ticker Synchronization with Lenis RAF loop
  useEffect(() => {
    if (prefersReduced || typeof window === "undefined") return;

    function updateTicker(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    const lenis = lenisRef.current?.lenis;
    if (lenis) {
      (window as unknown as { __lenis?: unknown }).__lenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);
    }

    return () => {
      gsap.ticker.remove(updateTicker);
      if (lenis) {
        lenis.off("scroll", ScrollTrigger.update);
        if ((window as unknown as { __lenis?: unknown }).__lenis === lenis) {
          (window as unknown as { __lenis?: unknown }).__lenis = null;
        }
      }
    };
  }, [prefersReduced]);

  const motionPref = resolveMotionPreference(prefersReduced);

  if (!motionPref.smoothScrollEnabled) {
    return (
      <SmoothScrollContext.Provider
        value={{ prefersReducedMotion: prefersReduced, isReady }}
      >
        {children}
      </SmoothScrollContext.Provider>
    );
  }

  return (
    <SmoothScrollContext.Provider
      value={{ prefersReducedMotion: prefersReduced, isReady }}
    >
      <ReactLenis
        ref={lenisRef}
        root
        autoRaf={false} // Driven by GSAP ticker for precision synchronization
        options={{
          ...LENIS_CONFIG,
        }}
      >
        {children}
      </ReactLenis>
    </SmoothScrollContext.Provider>
  );
}

// ============================================================================
// 3. Reusable SplitRevealText Component
// ============================================================================

export interface SplitRevealTextProps {
  text: string;
  className?: string;
  charClassName?: string;
  delay?: number;
  triggerOnScroll?: boolean;
}

export function SplitRevealText({
  text,
  className = "",
  charClassName = "",
  delay = 0.1,
  triggerOnScroll = false,
}: SplitRevealTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const { prefersReducedMotion } = useSmoothScrollContext();

  useEffect(() => {
    if (prefersReducedMotion || !containerRef.current || typeof window === "undefined") return;

    const chars = containerRef.current.querySelectorAll(".split-char");
    if (!chars.length) return;

    if (triggerOnScroll) {
      gsap.fromTo(
        chars,
        { y: GSAP_REVEAL_CONFIG.y, opacity: GSAP_REVEAL_CONFIG.opacity },
        {
          y: 0,
          opacity: 1,
          duration: GSAP_REVEAL_CONFIG.duration,
          stagger: GSAP_REVEAL_CONFIG.stagger,
          ease: GSAP_REVEAL_CONFIG.ease,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );
    } else {
      gsap.fromTo(
        chars,
        { y: GSAP_REVEAL_CONFIG.y, opacity: GSAP_REVEAL_CONFIG.opacity },
        {
          y: 0,
          opacity: 1,
          duration: GSAP_REVEAL_CONFIG.duration,
          stagger: GSAP_REVEAL_CONFIG.stagger,
          ease: GSAP_REVEAL_CONFIG.ease,
          delay,
        }
      );
    }
  }, [delay, prefersReducedMotion, triggerOnScroll]);

  return (
    <span ref={containerRef} className={`inline-block overflow-hidden ${className}`}>
      {text.split("").map((char, index) => (
        <span key={`${char}-${index}`} className="inline-block overflow-hidden">
          <span
            className={`split-char char-split inline-block will-change-transform ${charClassName}`}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        </span>
      ))}
    </span>
  );
}

export default SmoothScrollProvider;
