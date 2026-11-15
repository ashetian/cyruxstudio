"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Product } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatProductPrice } from "./bestseller-grid";
import { generateWhatsAppOrderUrl } from "@/lib/whatsapp";
import { ProductVariant } from "@/lib/seed-data";

export interface VariantModalProps {
  product: Product | null;
  isOpen: boolean;
  currency?: string;
  whatsappNumber?: string;
  onClose: () => void;
}

export function VariantModal({
  product,
  isOpen,
  currency = "USD",
  whatsappNumber = "+905551234567",
  onClose,
}: VariantModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [customerNotes, setCustomerNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      const variants = (product.variants as unknown as ProductVariant[]) || [];
      const firstAvailable = variants.find((v) => v.inStock);
      setSelectedVariant(firstAvailable ? firstAvailable.name : "");
      setCustomerNotes("");
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [product]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const variants = (product.variants as unknown as ProductVariant[]) || [];
  const primaryMedia = product.mediaUrls[0] || "/assets/brand/logo-emblem-dark.png";

  const fallbackClientRedirect = () => {
    if (!product) return;
    const url = generateWhatsAppOrderUrl(whatsappNumber, {
      productId: product.id,
      productName: product.name,
      variant: selectedVariant || undefined,
      price: product.price,
      currency,
      customerNotes: customerNotes.trim() || undefined,
    });
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  const handleOrder = async () => {
    if (!product || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/order/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variant: selectedVariant || undefined,
          customerNotes: customerNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.redirectUrl) {
          window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
          onClose();
          return;
        }
      }

      const errData = await res.json().catch(() => ({}));
      if (errData && errData.error) {
        setErrorMessage(errData.error);
        setIsSubmitting(false);
        return;
      }

      fallbackClientRedirect();
    } catch {
      fallbackClientRedirect();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="variant-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      >
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-canvas border-2 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_#000000] z-10"
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b border-black pb-4 mb-6">
            <div>
              <span className="font-mono text-[10px] tracking-widest uppercase text-brand-muted">
                SELECT VARIANT • CHAPTER 00
              </span>
              <h3
                id="variant-modal-title"
                className="font-mono text-lg md:text-xl font-bold uppercase tracking-tight text-brand-black"
              >
                {product.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="font-mono text-xs font-bold uppercase tracking-widest px-2 py-1 border border-black hover:bg-black hover:text-canvas transition-colors"
            >
              [ ✕ ]
            </button>
          </div>

          {/* Inline Error Message */}
          {errorMessage && (
            <div className="mb-4 p-2.5 bg-red-100 border border-red-600 font-mono text-xs text-red-700 font-bold uppercase">
              [!] {errorMessage}
            </div>
          )}

          {/* Product Media & Pricing Summary */}
          <div className="flex gap-4 items-center mb-6">
            <div className="relative w-20 h-24 bg-brand-cream border border-black/20 overflow-hidden shrink-0">
              <Image
                src={primaryMedia}
                alt={product.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-brand-black">
                {formatProductPrice(product.price, currency)}
              </div>
              <p className="font-mono text-xs text-brand-muted line-clamp-2 mt-1">
                {product.description}
              </p>
            </div>
          </div>

          {/* Variant Selector Buttons */}
          {variants.length > 0 && (
            <div className="mb-6">
              <label className="block font-mono text-xs uppercase tracking-wider font-bold mb-2">
                SIZE / VARIANT
              </label>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const isSelected = selectedVariant === v.name;
                  const isAvailable = v.inStock;
                  return (
                    <button
                      key={v.id || v.name}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedVariant(v.name)}
                      className={cn(
                        "font-mono text-xs font-bold uppercase px-4 py-2 border transition-all duration-150",
                        isAvailable
                          ? isSelected
                            ? "bg-black text-canvas border-black shadow-[2px_2px_0px_0px_#000000]"
                            : "bg-transparent text-black border-black hover:border-black/70"
                          : "opacity-40 cursor-not-allowed line-through border-neutral-400 text-neutral-400"
                      )}
                    >
                      {v.name} {!isAvailable && "(OUT)"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customer Notes */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <label className="font-mono text-xs uppercase tracking-wider font-bold">
                DELIVERY NOTES (OPTIONAL)
              </label>
              <span className="font-mono text-[10px] text-brand-muted">
                {customerNotes.length}/500
              </span>
            </div>
            <textarea
              value={customerNotes}
              maxLength={500}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Size preference, delivery instructions, gift wrapping..."
              className="w-full h-20 p-2.5 font-mono text-xs bg-white/70 border border-black rounded-none focus:outline-none focus:ring-1 focus:ring-black resize-none"
            />
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleOrder}
            disabled={isSubmitting || (variants.length > 0 && !selectedVariant)}
            className={cn(
              "w-full py-3.5 px-6 font-mono text-sm font-bold uppercase tracking-wider border-2 border-black transition-all",
              isSubmitting || (variants.length > 0 && !selectedVariant)
                ? "bg-neutral-300 text-neutral-500 border-neutral-400 cursor-not-allowed"
                : "bg-black text-canvas hover:bg-neutral-800 shadow-[4px_4px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5"
            )}
          >
            {isSubmitting ? "CONNECTING TO WHATSAPP..." : "ORDER VIA WHATSAPP →"}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default VariantModal;
