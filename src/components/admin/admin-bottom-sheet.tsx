"use client";

import React, { useEffect, useId } from "react";
import { X } from "lucide-react";

export interface AdminBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AdminBottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: AdminBottomSheetProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Panel */}
      <div className="relative z-10 w-full md:max-w-2xl bg-[#FFFFFF] text-[#0A0A0A] border-t md:border border-[#E8E4DC] rounded-t-2xl md:rounded-none max-h-[88vh] flex flex-col shadow-xl pb-[env(safe-area-inset-bottom)]">
        {/* Mobile Handle */}
        <div className="md:hidden pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-[#E8E4DC] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-[#E8E4DC] shrink-0">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-base font-semibold tracking-tight text-[#0A0A0A] truncate"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[#525252] mt-0.5 truncate">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E8E4DC] bg-[#FAF8F3] text-[#0A0A0A] hover:border-[#0A0A0A] cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-4 sm:px-6 py-3.5 border-t border-[#E8E4DC] bg-[#FAF8F3] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
