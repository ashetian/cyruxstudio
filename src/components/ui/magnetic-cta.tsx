"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export interface MagneticCTAProps {
  text?: string;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MagneticCTA({
  text = "BUY NOW →",
  disabled = false,
  onClick,
  className,
}: MagneticCTAProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth elastic spring damping
  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !ref.current) return;
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Normalized magnetic pull (max ~14px displacement)
    x.set((e.clientX - centerX) * 0.25);
    y.set((e.clientY - centerY) * 0.25);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      data-cursor="BUY"
      type="button"
      className={cn(
        "group inline-flex items-center gap-2 font-mono text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-wider select-none",
        "underline underline-offset-8 decoration-2 hover:decoration-4 transition-all duration-200",
        disabled
          ? "opacity-40 cursor-not-allowed line-through text-neutral-500"
          : "text-brand-black hover:text-black cursor-pointer",
        className
      )}
    >
      <span>{disabled ? "OUT OF STOCK" : text.replace(/→/g, "").trim()}</span>
      {!disabled && (
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-200 group-hover:translate-x-1.5"
        >
          →
        </span>
      )}
    </motion.button>
  );
}

export default MagneticCTA;
