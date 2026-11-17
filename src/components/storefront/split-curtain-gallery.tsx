"use client";

import React, { useRef, useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface SplitCurtainGalleryProps {
  frontImage: string;
  backImage: string;
  productName: string;
  t: (key: { tr: string; en: string }) => string;
  className?: string;
}

export function SplitCurtainGallery({
  frontImage,
  backImage,
  productName,
  t,
  className,
}: SplitCurtainGalleryProps) {
  const [mode, setMode] = useState<"curtain" | "pair" | "front" | "back">("curtain");
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = clientX - rect.left;
    const percentage = Math.min(Math.max((rawX / rect.width) * 100, 0), 100);
    setSliderPos(percentage);
    setHasInteracted(true);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      updatePosition(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSliderPos((p) => Math.max(0, p - 5));
      setHasInteracted(true);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSliderPos((p) => Math.min(100, p + 5));
      setHasInteracted(true);
    } else if (e.key === "Home") {
      e.preventDefault();
      setSliderPos(0);
      setHasInteracted(true);
    } else if (e.key === "End") {
      e.preventDefault();
      setSliderPos(100);
      setHasInteracted(true);
    }
  };

  const isFrontEditorial = frontImage.includes("/assets/editorial/");
  const isBackEditorial = backImage.includes("/assets/editorial/");

  return (
    <div className={cn("flex flex-col gap-3 w-full", className)}>
      {/* Atelier Mode Switcher Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-[10px] uppercase tracking-wider flex-wrap">
        <button
          type="button"
          onClick={() => setMode("curtain")}
          className={cn(
            "min-h-9 px-3 py-1.5 border transition-all cursor-pointer font-bold flex items-center gap-1.5",
            mode === "curtain"
              ? "border-black bg-black text-white"
              : "border-black/20 hover:border-black text-neutral-600 bg-white/50"
          )}
        >
          <span>{t({ tr: "ETKİLEŞİMLİ PERDE", en: "SPLIT CURTAIN" })}</span>
          <span className="text-[11px] font-mono opacity-80">⇄</span>
        </button>

        <button
          type="button"
          onClick={() => setMode("pair")}
          className={cn(
            "min-h-9 px-3 py-1.5 border transition-all cursor-pointer font-bold",
            mode === "pair"
              ? "border-black bg-black text-white"
              : "border-black/20 hover:border-black text-neutral-600 bg-white/50"
          )}
        >
          {t({ tr: "DİPTİK (PANORAMA)", en: "DIPTYCH (PANORAMA)" })}
        </button>

        <button
          type="button"
          onClick={() => setMode("front")}
          className={cn(
            "min-h-9 px-3 py-1.5 border transition-all cursor-pointer font-bold",
            mode === "front"
              ? "border-black bg-black text-white"
              : "border-black/20 hover:border-black text-neutral-600 bg-white/50"
          )}
        >
          01. {t({ tr: "ÖN", en: "FRONT" })}
        </button>

        <button
          type="button"
          onClick={() => setMode("back")}
          className={cn(
            "min-h-9 px-3 py-1.5 border transition-all cursor-pointer font-bold",
            mode === "back"
              ? "border-black bg-black text-white"
              : "border-black/20 hover:border-black text-neutral-600 bg-white/50"
          )}
        >
          02. {t({ tr: "ARKA", en: "BACK" })}
        </button>

        <span className="text-neutral-400 text-[9px] hidden sm:inline ml-auto font-bold tracking-widest">
          [DIPTYCH ARTWORK • SEAMLESS]
        </span>
      </div>

      {/* Mode 1: Interactive Split-Curtain */}
      {mode === "curtain" && (
        <div
          ref={containerRef}
          role="slider"
          tabIndex={0}
          aria-label={t({
            tr: "Ön ve arka sanat baskısı arasında geçiş yapmak için perdeyi kaydırın",
            en: "Slide curtain to reveal front and back artwork composition",
          })}
          aria-valuenow={Math.round(sliderPos)}
          aria-valuemin={0}
          aria-valuemax={100}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onKeyDown={handleKeyDown}
          className="relative w-full aspect-square bg-[#EDEDEF] overflow-hidden select-none cursor-ew-resize border border-black/15 shadow-xs touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          {/* Base Layer: Back Image */}
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            <Image
              src={backImage}
              alt={`${productName} - Back`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className={cn(
                "object-cover object-center",
                !isBackEditorial && "mix-blend-multiply"
              )}
            />
          </div>

          {/* Overlay Layer: Front Image (Clipped) */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            <Image
              src={frontImage}
              alt={`${productName} - Front`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className={cn(
                "object-cover object-center",
                !isFrontEditorial && "mix-blend-multiply"
              )}
            />
          </div>

          {/* Minimalist Split Divider Line */}
          <div
            className="absolute top-0 bottom-0 w-[1.5px] bg-black shadow-[0_0_10px_rgba(0,0,0,0.35)] pointer-events-none z-20"
            style={{ left: `${sliderPos}%` }}
          >
            {/* Center Drag Handle Badge */}
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-black text-white shadow-md border border-white/20 font-mono text-[11px] font-bold">
              ⇄
            </div>
          </div>

          {/* Corner Atelier Badges */}
          <div
            className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-black/90 backdrop-blur-xs text-white font-mono text-[9px] font-bold uppercase tracking-widest border border-white/10 pointer-events-none transition-opacity duration-200"
            style={{ opacity: sliderPos < 15 ? 0.25 : 1 }}
          >
            01. {t({ tr: "ÖN GÖĞÜS", en: "FRONT" })}
          </div>
          <div
            className="absolute top-3 right-3 z-10 px-2.5 py-1 bg-black/90 backdrop-blur-xs text-white font-mono text-[9px] font-bold uppercase tracking-widest border border-white/10 pointer-events-none transition-opacity duration-200"
            style={{ opacity: sliderPos > 85 ? 0.25 : 1 }}
          >
            02. {t({ tr: "ARKA SERİGRAFİ", en: "BACK" })}
          </div>

          {/* Floating Guidance Badge (Fades Out After First Touch) */}
          {!hasInteracted && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-black/85 text-white font-mono text-[9px] font-bold uppercase tracking-widest pointer-events-none animate-pulse border border-white/15">
              {t({ tr: "← KAYDIRARAK GEÇİŞ YAPIN →", en: "← DRAG TO REVEAL →" })}
            </div>
          )}

          {/* Atelier Manifesto Banner Across Bottom (Covers Sliced Typography Gracefully) */}
          <div className="absolute bottom-0 inset-x-0 h-9 sm:h-10 bg-[#EDEDEF]/95 backdrop-blur-xs border-t border-black/10 flex items-center justify-between px-3 sm:px-4 z-20 font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-black font-bold pointer-events-none">
            <span>CYRUX STUDIO®</span>
            <span className="hidden sm:inline text-neutral-500 font-normal">
              THE NEW ERA OF WEARABLE ART
            </span>
            <span className="text-neutral-500 font-normal">
              {Math.round(sliderPos)}% • {100 - Math.round(sliderPos)}%
            </span>
          </div>
        </div>
      )}

      {/* Mode 2: Diptych Seamless Dual Square Panel (Zero Gap) */}
      {mode === "pair" && (
        <div className="relative w-full aspect-[2/1] grid grid-cols-2 gap-0 border border-black/20 bg-[#EDEDEF] overflow-hidden shadow-xs">
          {/* Front Square Panel */}
          <div className="relative w-full h-full aspect-square border-r border-black/15 overflow-hidden bg-[#EDEDEF]">
            <Image
              src={frontImage}
              alt={`${productName} - Front`}
              fill
              priority
              sizes="(max-width: 1024px) 50vw, 30vw"
              className={cn(
                "object-cover object-center",
                !isFrontEditorial && "mix-blend-multiply"
              )}
            />
            <span className="absolute bottom-2.5 left-2.5 z-10 px-2 py-0.5 bg-black/90 backdrop-blur-xs text-white font-mono text-[9px] font-bold uppercase tracking-widest border border-white/20">
              01. {t({ tr: "ÖN", en: "FRONT" })}
            </span>
          </div>

          {/* Back Square Panel (Zero Gap) */}
          <div className="relative w-full h-full aspect-square overflow-hidden bg-[#EDEDEF]">
            <Image
              src={backImage}
              alt={`${productName} - Back`}
              fill
              sizes="(max-width: 1024px) 50vw, 30vw"
              className={cn(
                "object-cover object-center",
                !isBackEditorial && "mix-blend-multiply"
              )}
            />
            <span className="absolute bottom-2.5 left-2.5 z-10 px-2 py-0.5 bg-black/90 backdrop-blur-xs text-white font-mono text-[9px] font-bold uppercase tracking-widest border border-white/20">
              02. {t({ tr: "ARKA", en: "BACK" })}
            </span>
          </div>
        </div>
      )}

      {/* Mode 3: Solitary Front View */}
      {mode === "front" && (
        <div className="relative w-full aspect-square bg-[#EDEDEF] overflow-hidden border border-black/15 shadow-xs">
          <Image
            src={frontImage}
            alt={`${productName} - Front`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 58vw"
            className={cn(
              "object-cover object-center",
              !isFrontEditorial && "mix-blend-multiply"
            )}
          />
          <span className="absolute bottom-2.5 left-2.5 z-10 px-2 py-0.5 bg-black/90 backdrop-blur-xs text-white font-mono text-[9px] font-bold uppercase tracking-widest border border-white/20">
            01. {t({ tr: "ÖN GÖĞÜS BASKISI", en: "FRONT CHEST" })}
          </span>
        </div>
      )}

      {/* Mode 4: Solitary Back View */}
      {mode === "back" && (
        <div className="relative w-full aspect-square bg-[#EDEDEF] overflow-hidden border border-black/15 shadow-xs">
          <Image
            src={backImage}
            alt={`${productName} - Back`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 58vw"
            className={cn(
              "object-cover object-center",
              !isBackEditorial && "mix-blend-multiply"
            )}
          />
          <span className="absolute bottom-2.5 left-2.5 z-10 px-2 py-0.5 bg-black/90 backdrop-blur-xs text-white font-mono text-[9px] font-bold uppercase tracking-widest border border-white/20">
            02. {t({ tr: "ARKA SERİGRAFİ", en: "BACK SCREENPRINT" })}
          </span>
        </div>
      )}
    </div>
  );
}
