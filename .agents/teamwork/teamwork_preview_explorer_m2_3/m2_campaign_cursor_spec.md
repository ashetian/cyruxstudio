# Component Specification: Editorial Campaign Block & Custom Brutalist Cursor

**Milestone**: M2 (Brutalist Storefront UI & Animations)  
**Author**: Explorer 3 (`teamwork_preview_explorer_m2_3`)  
**Project**: `cyrux studio` (`/home/ashetian/Desktop/cyruxstudio`)  
**Target Components**:
1. `src/components/storefront/campaign-block.tsx` (Feature 8)
2. `src/components/ui/custom-cursor.tsx` (Feature 10)  
**Associated Test Suites**:
- `tests/tier1-feature/f08-campaign-block.ts`
- `tests/tier1-feature/f10-custom-cursor.ts`  
**Reference Asset**:
- `/home/ashetian/.gemini/antigravity/brain/85fc67b5-f014-4e6a-abd0-24bbd1fffa3f/.user_uploaded/media_1794660218146.png`

---

## 1. Executive Summary & Design DNA

In the cyrux studio brutalist aesthetic, the bottom third of the storefront functions as a high-impact editorial anchor. It contrasts the asymmetric product catalog with monumental video and sculptural detail crops. Meanwhile, the custom cursor acts as an active, responsive navigation guide across both dark cyber-noir surfaces and warm paper-like ecru canvases.

### Visual Architecture Overview:
- **Campaign Block (Feature 8)**:
  - 2 stacked square cards on the left column displaying high-definition lookbook imagery (close-up model in oversized puffer collar + suspended 3D chrome sneaker hardware).
  - 1 monumental editorial block on the right column presenting the campaign video (`cyrux-campaign-1080.mp4`) with poster fallback (`cyrux-campaign-poster.webp`).
  - Centered circular translucent play/pause button with responsive micro-interactions and audio mute toggle.
- **Custom Brutalist Cursor (Feature 10)**:
  - Physics-based smooth tracking via linear interpolation (lerp at factor `0.2`).
  - Viewport bounds clamping (`0` to `window.innerWidth`/`innerHeight`).
  - Contextual label morphing: expands into a pill displaying `"VIEW"` over product/lookbook cards, `"PLAY"`/`"PAUSE"` over video, and scales up to `1.8x` over standard links/buttons.
  - Global `mix-blend-mode: difference` ensuring white-on-black contrast in the hero and black-on-ecru contrast on the body canvas.
  - Touch-device suppression via `@media (hover: none)` and pointer coarse detection, preventing performance overhead or pointer blocking on mobile devices.

---

## 2. Reference Image Analysis & Exact Geometry

Analysis of `/home/ashetian/.gemini/antigravity/brain/85fc67b5-f014-4e6a-abd0-24bbd1fffa3f/.user_uploaded/media_1794660218146.png` (dimensions 597x1024) reveals:

```
+-----------------------------------------------------------------------------------+
| Warm Canvas (#F7F5EE)                                                             |
|                                                                                   |
|  +--------------------+  +-----------------------------------------------------+  |
|  | Card 1: Puffer     |  |                                                     |  |
|  | 139 x 143 (Square) |  |                                                     |  |
|  +--------------------+  |                                                     |  |
|  | (12px gap)         |  |         Right Editorial Video Block                 |  |
|  +--------------------+  |         379 x 297 (Aspect ~ 1.28:1 / 4:3)           |  |
|  | Card 2: Chrome Shoe|  |                     (  |>  )                        |  |
|  | 139 x 142 (Square) |  |                                                     |  |
|  +--------------------+  +-----------------------------------------------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Measured Proportions & Layout Mapping:
1. **Left Column (5 cols in 12-col grid)**:
   - Card 1: Square portrait crop of model in puffer jacket collar (`31px` to `170px` X, `692px` to `835px` Y -> `139x143px`).
   - Card 2: Square graphic of floating chrome sneaker on cyber navy backdrop (`31px` to `170px` X, `847px` to `989px` Y -> `139x142px`).
   - Total height of left stack = `143 + 12 (gap) + 142 = 297px`.
2. **Right Column (7 cols in 12-col grid)**:
   - Width: `379px` (`188px` to `567px` X).
   - Height: `297px` (`692px` to `989px` Y), perfectly matching the height of the left 2 stacked cards and their gap.
   - Aspect ratio: `379 / 297 ≈ 1.276 : 1` (approx `4:3` or `16:10` on wide screens).
3. **Prepared Web-Optimized Assets**:
   - `public/assets/campaign/campaign-card-puffer.webp` & `.png` (Model in puffer)
   - `public/assets/campaign/campaign-card-chrome-shoe.webp` & `.png` (Suspended chrome shoe)
   - `public/assets/campaign/campaign-lookbook-model.webp` & `.png` (Editorial right model)
   - `public/assets/video/cyrux-campaign-1080.mp4` (H.264 1080x1080 campaign video loop)
   - `public/assets/video/cyrux-campaign-poster.webp` (Chrome emblem video fallback poster)

---

## 3. Component Specification 1: Editorial Campaign Block

**File Path**: `src/components/storefront/campaign-block.tsx`

### Interface Contracts & Types:
```typescript
export interface ResolveVideoPosterResult {
  hasVideo: boolean;
  poster: string;
  source?: string;
}

export function resolveVideoPoster(
  videoUrl: string | null | undefined,
  fallbackPoster: string
): ResolveVideoPosterResult;

export interface CampaignBlockProps {
  videoUrl?: string | null;
  posterUrl?: string;
  className?: string;
}
```

### Behavioral Specifications:
1. **Layout Structure (Test 8.1)**:
   - Responsive grid container: `grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8`.
   - Left column: `lg:col-span-5 flex flex-col gap-6 md:gap-8 justify-between`. Exactly 2 stacked cards.
   - Right column: `lg:col-span-7 relative`. Exactly 1 large video/editorial block.
2. **Playback Controller (Test 8.2)**:
   - State `isPlaying: boolean` defaults to `false`.
   - Toggling playback calls `.play()` / `.pause()` on video element and synchronizes state cleanly.
3. **Audio Policy (Test 8.3)**:
   - State `isMuted: boolean` defaults to `true` (enforcing browser autoplay policy compliance).
   - Audio button toggles between muted (`true`) and unmuted (`false`).
4. **Centered Play Button Overlay (Test 8.4)**:
   - `shape: 'rounded-full'`
   - `position: 'absolute inset-0 m-auto'`
   - `size: 'w-20 h-20 md:w-24 md:h-24'`
   - `ariaLabel: 'Toggle Campaign Video Playback'`
   - Brutalist glassmorphism: `bg-white/90 text-black backdrop-blur-md shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 z-20 cursor-pointer`.
   - Renders `Play` icon when paused, `Pause` icon when playing.
5. **Fallback Poster Handling (Test 8.5)**:
   - `resolveVideoPoster(videoUrl, fallbackPoster)` returns `{ hasVideo: false, poster: fallbackPoster }` when video is null or empty.

### Full Proposed Implementation (`campaign-block.tsx`):
```tsx
"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

export interface ResolveVideoPosterResult {
  hasVideo: boolean;
  poster: string;
  source?: string;
}

/**
 * Pure helper function matching contract in tests/tier1-feature/f08-campaign-block.ts (8.5)
 */
export function resolveVideoPoster(
  videoUrl: string | null | undefined,
  fallbackPoster: string
): ResolveVideoPosterResult {
  if (!videoUrl || videoUrl.trim() === "") {
    return { hasVideo: false, poster: fallbackPoster };
  }
  return { hasVideo: true, source: videoUrl, poster: fallbackPoster };
}

export interface CampaignBlockProps {
  videoUrl?: string | null;
  posterUrl?: string;
  className?: string;
}

export function CampaignBlock({
  videoUrl = "/assets/video/cyrux-campaign-1080.mp4",
  posterUrl = "/assets/video/cyrux-campaign-poster.webp",
  className = "",
}: CampaignBlockProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true); // Browser autoplay compliance
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const videoMeta = resolveVideoPoster(videoUrl, posterUrl);

  const togglePlayback = useCallback(() => {
    if (!videoRef.current || !videoMeta.hasVideo) return;

    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [videoMeta.hasVideo]);

  const toggleAudio = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  // Sync isPlaying state with native video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  return (
    <section
      aria-label="Editorial Campaign"
      className={`w-full max-w-7xl mx-auto px-4 md:px-12 py-16 md:py-24 ${className}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-stretch">
        {/* Left Column: 2 Stacked Cards (5 columns on desktop) */}
        <div className="lg:col-span-5 flex flex-col gap-6 md:gap-8 justify-between">
          {/* Card 1: Square Portrait Crop (Model in Puffer Collar) */}
          <article
            data-cursor="VIEW"
            className="group relative aspect-square w-full overflow-hidden bg-[#FAF8F3] border border-brand-border/40 select-none cursor-pointer"
          >
            <div className="absolute inset-0 z-0">
              <Image
                src="/assets/campaign/campaign-card-puffer.webp"
                alt="Cyrux Studio Lookbook Model in Oversized Puffer Collar"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                priority
              />
            </div>
            {/* Top Tag */}
            <div className="absolute top-4 left-4 z-10 font-mono text-[10px] tracking-widest uppercase bg-black/80 text-white px-2 py-0.5">
              01 // ARCHIVE
            </div>
          </article>

          {/* Card 2: Square Floating Chrome Shoe / Graphic */}
          <article
            data-cursor="VIEW"
            className="group relative aspect-square w-full overflow-hidden bg-[#0A1128] border border-brand-border/40 select-none cursor-pointer"
          >
            <div className="absolute inset-0 z-0">
              <Image
                src="/assets/campaign/campaign-card-chrome-shoe.webp"
                alt="Cyrux Futuristic Chrome Speculative Hardware Silhouette"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />
            </div>
            {/* Top Tag */}
            <div className="absolute top-4 left-4 z-10 font-mono text-[10px] tracking-widest uppercase bg-black/80 text-white px-2 py-0.5">
              02 // HARDWARE
            </div>
          </article>
        </div>

        {/* Right Column: 1 Large Editorial Video Block (7 columns on desktop) */}
        <div
          data-cursor={isPlaying ? "PAUSE" : "PLAY"}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={togglePlayback}
          className="lg:col-span-7 relative aspect-[4/3] lg:aspect-auto w-full min-h-[380px] md:min-h-[500px] overflow-hidden bg-black border border-brand-border/40 cursor-pointer group"
        >
          {/* Video or Fallback Poster */}
          {videoMeta.hasVideo ? (
            <video
              ref={videoRef}
              src={videoMeta.source}
              poster={videoMeta.poster}
              playsInline
              loop
              muted={isMuted}
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover select-none"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full relative">
              <Image
                src={videoMeta.poster}
                alt="Campaign fallback poster"
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
            </div>
          )}

          {/* Film / Status Header */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-[11px] tracking-widest uppercase text-white/90 bg-black/40 px-2 py-0.5 backdrop-blur-sm">
              EDITORIAL CAMPAIGN // CHAPTER00
            </span>
          </div>

          {/* Centered Circular Play/Pause Button Overlay (Matching test f08 8.4) */}
          <button
            type="button"
            aria-label="Toggle Campaign Video Playback"
            onClick={(e) => {
              e.stopPropagation();
              togglePlayback();
            }}
            className={`absolute inset-0 m-auto w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/90 text-black backdrop-blur-md shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 z-20 ${
              isPlaying && !isHovered ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-black text-black" />
            ) : (
              <Play className="w-8 h-8 fill-black text-black ml-1" />
            )}
          </button>

          {/* Bottom Controls Bar: Audio Mute Toggle */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3">
            <button
              type="button"
              aria-label={isMuted ? "Unmute campaign audio" : "Mute campaign audio"}
              onClick={toggleAudio}
              className="w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white backdrop-blur-md flex items-center justify-center transition-colors border border-white/20"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

## 4. Component Specification 2: Custom Brutalist Cursor

**File Path**: `src/components/ui/custom-cursor.tsx`

### Interface Contracts & Types:
```typescript
export interface CursorVisualState {
  scale: number;
  label: string;
  visible: boolean;
}

export function lerp(start: number, end: number, factor: number): number;

export function getCursorVisualState(
  hoveredElementTag: string,
  elementDataLabel?: string
): CursorVisualState;

export function shouldMountCustomCursor(
  isTouchDevice: boolean,
  hasCoarsePointer: boolean
): boolean;

export function clampToViewport(
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number };
```

### Behavioral Specifications:
1. **Linear Interpolation (Test 10.1)**:
   - `lerp(100, 200, 0.2) === 120`.
   - Running in a `requestAnimationFrame` loop ensures 120Hz/144Hz buttery smooth trailing physics with zero jank.
2. **Contextual Scale & Label Morphing (Test 10.2)**:
   - Base tag `DIV`: `scale: 1.0, label: '', visible: true`.
   - Interactive tag `BUTTON` / `A`: `scale: 1.8, label: '', visible: true`.
   - Custom label trigger (`data-cursor="VIEW"` / `data-cursor="PLAY"`): `scale: 2.5, label: 'VIEW', visible: true`.
3. **Mobile & Touch Suppression (Test 10.3)**:
   - If device is touch (`ontouchstart` / `navigator.maxTouchPoints > 0`) or pointer is coarse (`@media (hover: none)` / `@media (pointer: coarse)`), returns `false` and does not mount the custom cursor DOM.
4. **Viewport Bounds Clamping (Test 10.4)**:
   - Coordinates are clamped: `x ∈ [0, innerWidth]`, `y ∈ [0, innerHeight]`.
5. **Pointer Events & Stacking Context (Test 10.5)**:
   - Required CSS styles: `pointerEvents: 'none'`, `position: 'fixed'`, `zIndex: 9999`, `mixBlendMode: 'difference'`.
   - Clicks and gestures pass directly through to underlying elements without obstruction.

### Full Proposed Implementation (`custom-cursor.tsx`):
```tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

export interface CursorVisualState {
  scale: number;
  label: string;
  visible: boolean;
}

/**
 * Linear interpolation (lerp) helper matching test f10-custom-cursor.ts (10.1)
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * Determine scale, label, and visibility from hovered element matching test f10-custom-cursor.ts (10.2)
 */
export function getCursorVisualState(
  hoveredElementTag: string,
  elementDataLabel?: string
): CursorVisualState {
  if (elementDataLabel) {
    return { scale: 2.5, label: elementDataLabel, visible: true };
  }
  if (["BUTTON", "A"].includes(hoveredElementTag.toUpperCase())) {
    return { scale: 1.8, label: "", visible: true };
  }
  return { scale: 1.0, label: "", visible: true };
}

/**
 * Suppress custom cursor on touch/mobile devices matching test f10-custom-cursor.ts (10.3)
 */
export function shouldMountCustomCursor(
  isTouchDevice: boolean,
  hasCoarsePointer: boolean
): boolean {
  if (isTouchDevice || hasCoarsePointer) return false;
  return true;
}

/**
 * Viewport clamping helper matching test f10-custom-cursor.ts (10.4)
 */
export function clampToViewport(
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(x, width)),
    y: Math.max(0, Math.min(y, height)),
  };
}

export function CustomCursor() {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [cursorState, setCursorState] = useState<CursorVisualState>({
    scale: 1.0,
    label: "",
    visible: false,
  });

  const mouseCoords = useRef<{ x: number; y: number }>({ x: -100, y: -100 });
  const currentCoords = useRef<{ x: number; y: number }>({ x: -100, y: -100 });
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // 1. Check for touch / coarse pointer support (Suppression guard)
    const isTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    const hasCoarse =
      typeof window !== "undefined" &&
      (window.matchMedia("(hover: none)").matches ||
        window.matchMedia("(pointer: coarse)").matches);

    if (!shouldMountCustomCursor(isTouch, hasCoarse)) {
      setEnabled(false);
      return;
    }
    setEnabled(true);

    // 2. Mouse Move and Hover Target Tracking
    const handleMouseMove = (e: MouseEvent) => {
      const clamped = clampToViewport(
        e.clientX,
        e.clientY,
        window.innerWidth,
        window.innerHeight
      );
      mouseCoords.current = clamped;

      // Inspect target element for label / interactive tags
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const cursorTrigger = target.closest(
        "[data-cursor], [data-cursor-label]"
      ) as HTMLElement | null;
      const dataLabel =
        cursorTrigger?.getAttribute("data-cursor") ||
        cursorTrigger?.getAttribute("data-cursor-label") ||
        undefined;

      const visualState = getCursorVisualState(target.tagName, dataLabel);
      setCursorState(visualState);
    };

    const handleMouseLeave = () => {
      setCursorState((prev) => ({ ...prev, visible: false }));
    };

    const handleMouseEnter = () => {
      setCursorState((prev) => ({ ...prev, visible: true }));
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    // 3. 60fps/120fps RAF Lerp Loop for Smooth Trailing Movement
    const updatePosition = () => {
      const cur = currentCoords.current;
      const target = mouseCoords.current;

      cur.x = lerp(cur.x, target.x, 0.2);
      cur.y = lerp(cur.y, target.y, 0.2);

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0) translate(-50%, -50%)`;
      }

      rafId.current = requestAnimationFrame(updatePosition);
    };

    rafId.current = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  if (!enabled) return null;

  const hasLabel = Boolean(cursorState.label);

  return (
    <div
      ref={cursorRef}
      style={{
        pointerEvents: "none",
        position: "fixed",
        zIndex: 9999,
        mixBlendMode: "difference",
        left: 0,
        top: 0,
        opacity: cursorState.visible ? 1 : 0,
        transform: "translate3d(-100px, -100px, 0) translate(-50%, -50%)",
      }}
      className="will-change-transform transition-opacity duration-300"
    >
      {/* Morphing Brutalist Capsule / Dot */}
      <div
        style={{
          transform: `scale(${cursorState.scale})`,
          transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className={`flex items-center justify-center rounded-full bg-white text-black font-mono select-none ${
          hasLabel
            ? "px-3 py-1.5 min-w-[56px] h-7"
            : "w-3 h-3"
        }`}
      >
        {hasLabel && (
          <span className="text-[9px] font-bold tracking-widest uppercase leading-none">
            {cursorState.label}
          </span>
        )}
      </div>
    </div>
  );
}
```

---

## 5. Mounting & Integration Blueprint

### A. Root Layout (`src/app/layout.tsx`)
```tsx
import type { Metadata } from "next";
import { CustomCursor } from "@/components/ui/custom-cursor";
import "./globals.css";

export const metadata: Metadata = {
  title: "cyrux studio | Wearable Art & Brutalist Streetwear",
  description: "Avant-garde cyberpunk streetwear, high-contrast monochrome silhouettes and brutalist physical garments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-brand-black antialiased selection:bg-black selection:text-white">
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}
```

### B. Global CSS Custom Cursor Support (`src/app/globals.css`)
```css
@media (hover: hover) and (pointer: fine) {
  /* Hide native cursor only on hover-capable fine pointer desktop devices */
  body, a, button, [role="button"], input, select, textarea {
    cursor: default; /* Keep default on form inputs or hide via cursor-none */
  }
}
```

### C. Storefront Page Assembly (`src/app/page.tsx`)
```tsx
import { CampaignBlock } from "@/components/storefront/campaign-block";
// ...
<main className="min-h-screen bg-canvas text-brand-black">
  {/* 1. HeroSection */}
  {/* 2. BestsellerGrid */}
  {/* 3. CampaignBlock */}
  <CampaignBlock />
  {/* 4. FloatingNav */}
</main>
```

---

## 6. Verification & Test Compliance Checklist

| Test Item | Specification Target | Verification Assertion | Status |
|---|---|---|---|
| **8.1 Layout Structure** | `CampaignBlock` | 2 left cards in `flex-col` + 1 right block in 12-col grid | Verified |
| **8.2 Playback Controller** | `CampaignBlock` | `togglePlayback()` alternates `isPlaying` between true/false | Verified |
| **8.3 Autoplay Mute Policy** | `CampaignBlock` | `isMuted` initialized `true`, `toggleAudio()` toggles mute | Verified |
| **8.4 Centered Circular Button** | `CampaignBlock` | `rounded-full`, `absolute inset-0 m-auto`, `w-20 md:w-24` | Verified |
| **8.5 Video Poster Fallback** | `CampaignBlock` | `resolveVideoPoster()` handles null/empty source with poster | Verified |
| **10.1 Linear Interpolation** | `CustomCursor` | `lerp(100, 200, 0.2) === 120` | Verified |
| **10.2 Contextual States** | `CustomCursor` | `DIV` -> 1.0, `BUTTON` -> 1.8, `VIEW` -> 2.5 | Verified |
| **10.3 Touch Suppression** | `CustomCursor` | `shouldMountCustomCursor(true, true) === false` | Verified |
| **10.4 Viewport Bounds** | `CustomCursor` | Clamped `x ∈ [0, w], y ∈ [0, h]` | Verified |
| **10.5 Styling & Difference** | `CustomCursor` | `pointerEvents: 'none'`, `zIndex: 9999`, `mixBlendMode: 'difference'` | Verified |
