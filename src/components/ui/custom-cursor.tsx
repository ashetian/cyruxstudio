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
  const hasMoved = useRef(false);

  useEffect(() => {
    // 1. Check for touch / coarse pointer support (Suppression guard)
    const isTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0));
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
      if (!hasMoved.current) {
        hasMoved.current = true;
        currentCoords.current = { ...clamped };
      }

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
      if (!hasMoved.current) return;
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
          hasLabel ? "px-3 py-1.5 min-w-[56px] h-7" : "w-3 h-3"
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

export default CustomCursor;
