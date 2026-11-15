"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { Product } from "@prisma/client";
import { cn } from "@/lib/utils";
import { MagneticCTA } from "@/components/ui/magnetic-cta";
import { VariantModal } from "./variant-modal";
import { ProductVariant } from "@/lib/seed-data";

export interface BestsellerGridProps {
  products: Product[];
  currency?: string;
  whatsappNumber?: string;
  className?: string;
}

/**
 * Format product price with store currency symbol (F06.5 Contract)
 */
export function formatProductPrice(price: number, currency = "USD"): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    TRY: "₺",
    GBP: "£",
  };
  const sym = symbols[currency.toUpperCase()] || currency;
  return `${sym}${price.toFixed(2)}`;
}

/**
 * Column height ratios matching Test 6.3 contract ([1.2, 1.45, 1.15, 1.35])
 */
export const ASYMMETRIC_COLUMN_CONFIG = [
  { ratio: 1.2, aspectClass: "aspect-[3/4]", minHeightClass: "min-h-[400px]" },
  { ratio: 1.45, aspectClass: "aspect-[2/3]", minHeightClass: "min-h-[560px]" }, // Monumentally taller column 2
  { ratio: 1.15, aspectClass: "aspect-[4/5]", minHeightClass: "min-h-[380px]" },
  { ratio: 1.35, aspectClass: "aspect-[3/4.2]", minHeightClass: "min-h-[460px]" },
];

export function BestsellerGrid({
  products,
  currency = "USD",
  whatsappNumber = "+905551234567",
  className = "",
}: BestsellerGridProps) {
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);

  // Auto-dismiss order error alert after 7 seconds
  useEffect(() => {
    if (orderError) {
      const timer = setTimeout(() => {
        setOrderError(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [orderError]);

  // Wishlist toggle state (F06.4 Contract)
  const toggleWishlist = (productId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // CTA Click Handler routing (F07.4 & F07.5 Contract with Strict Error Gating)
  const handleProductCta = async (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (product.stock <= 0 || isOrdering) return;

    // Reset previous errors before attempting new order
    setOrderError(null);

    const variants = (product.variants as unknown as ProductVariant[]) || [];
    if (variants && variants.length > 1) {
      setActiveModalProduct(product);
      setIsModalOpen(true);
      return;
    }

    const singleVariant = variants[0]?.name;
    setIsOrdering(true);

    try {
      const res = await fetch("/api/order/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variant: singleVariant || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      // Server returned error (e.g. 400 validation error, out of stock, 404, 500)
      if (!res.ok || !data.success) {
        const message =
          data.error ||
          (res.status === 400
            ? "Order validation failed. Please check product details."
            : res.status === 404
            ? "Product not found in catalog."
            : `Order service error (${res.status}).`);
        setOrderError(message);
        return;
      }

      // Valid response with redirect URL
      if (data.redirectUrl) {
        window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
      } else {
        setOrderError("Server did not return a valid WhatsApp redirection link.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Network error contacting order server. Please check your connection.";
      setOrderError(message);
    } finally {
      setIsOrdering(false);
    }
  };

  // Take up to 4 products for the 4-column asymmetric grid
  const gridProducts = products.slice(0, 4);

  // Primary product for the featured CTA in negative space beneath Col 3 & 4
  const featuredProduct = gridProducts[2] || gridProducts[0] || null;

  return (
    <section
      id="shop"
      aria-label="Bestseller Catalog Grid"
      className={cn("w-full max-w-7xl mx-auto px-4 md:px-12 py-16 md:py-24 relative", className)}
    >
      {/* 1. Monospace Section Heading (F06.1 Contract) */}
      <div className="mb-10 md:mb-16">
        <h2 className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-brand-black">
          Bestseller Now
        </h2>
        <div className="mt-2 h-[1px] w-16 bg-black" />
      </div>

      {/* Brutalist Order Error Alert Banner (Inline) */}
      {orderError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-8 p-3.5 sm:p-4 bg-red-50 border-2 border-red-600 font-mono text-xs text-red-700 uppercase flex items-center justify-between gap-3 shadow-[4px_4px_0px_0px_#dc2626]"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">[!]</span>
            <span className="font-bold">ORDER ERROR:</span>
            <span className="font-medium text-red-800">{orderError}</span>
          </div>
          <button
            type="button"
            onClick={() => setOrderError(null)}
            aria-label="Dismiss order error"
            className="font-bold px-2 py-0.5 border border-red-600 hover:bg-red-200 transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Brutalist Toast Alert (Viewport persistent for scrolled users) */}
      {orderError && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-6 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md bg-[#FAF8F3] border-2 border-black p-4 shadow-[6px_6px_0px_0px_#000000] flex items-start justify-between gap-3"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-red-600">
                [!] ORDER FAILED
              </span>
            </div>
            <p className="font-mono text-xs text-brand-black leading-relaxed">
              {orderError}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOrderError(null)}
            aria-label="Dismiss notification"
            className="font-mono text-xs font-bold uppercase px-1.5 py-0.5 border border-black hover:bg-black hover:text-[#FAF8F3] transition-colors shrink-0"
          >
            [ ✕ ]
          </button>
        </div>
      )}

      {/* 2. Asymmetric 4-Column Borderless Grid (F06.2 & F06.3 Contract) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 items-start">
        {gridProducts.map((product, index) => {
          const colConfig =
            ASYMMETRIC_COLUMN_CONFIG[index % ASYMMETRIC_COLUMN_CONFIG.length];
          const isWishlisted = wishlist.has(product.id);
          const isOutOfStock = product.stock <= 0;
          const mediaUrl = product.mediaUrls[0] || "/assets/brand/logo-emblem-dark.png";

          return (
            <article
              key={product.id}
              className="group border-none bg-transparent p-0 flex flex-col justify-start relative select-none"
            >
              {/* Media Thumbnail Container with Asymmetric Aspect Ratio */}
              <div
                data-cursor="VIEW"
                onClick={() => handleProductCta(product)}
                className={cn(
                  "relative w-full overflow-hidden bg-[#ECE8DF]/40 cursor-pointer transition-all duration-300",
                  colConfig.aspectClass,
                  colConfig.minHeightClass
                )}
              >
                {/* Product Image */}
                <Image
                  src={mediaUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className={cn(
                    "object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105",
                    isOutOfStock && "grayscale opacity-60"
                  )}
                  priority={index < 2}
                />

                {/* Wishlist Heart Toggle (F06.4 Contract) */}
                <button
                  type="button"
                  aria-label={
                    isWishlisted
                      ? `Remove ${product.name} from wishlist`
                      : `Add ${product.name} to wishlist`
                  }
                  onClick={(e) => toggleWishlist(product.id, e)}
                  className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/70 backdrop-blur-xs hover:bg-white text-black transition-transform duration-200 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  <Heart
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isWishlisted
                        ? "fill-black text-black scale-110"
                        : "text-black/60 hover:text-black"
                    )}
                  />
                </button>

                {/* Out of Stock Ribbon */}
                {isOutOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <span className="font-mono text-xs uppercase tracking-widest bg-black text-white px-3 py-1 font-bold">
                      OUT OF STOCK
                    </span>
                  </div>
                )}
              </div>

              {/* Monospace Metadata Row (Title Left, Price Right) */}
              <div className="flex justify-between items-baseline pt-4">
                <h3 className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-brand-black line-clamp-1 pr-2">
                  {product.name}
                </h3>
                <span className="font-mono text-xs sm:text-sm font-bold text-brand-black shrink-0">
                  {formatProductPrice(product.price, currency)}
                </span>
              </div>

              {/* Per-card discrete buy action on hover / touch */}
              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  disabled={isOutOfStock || isOrdering}
                  onClick={(e) => handleProductCta(product, e)}
                  className={cn(
                    "font-mono text-[11px] uppercase tracking-wider transition-colors",
                    isOutOfStock
                      ? "text-neutral-400 line-through cursor-not-allowed"
                      : isOrdering
                      ? "text-neutral-400 cursor-wait"
                      : "text-neutral-600 hover:text-black underline underline-offset-4"
                  )}
                >
                  {isOutOfStock ? "SOLD OUT" : isOrdering ? "PROCESSING..." : "ORDER →"}
                </button>
                <span className="font-mono text-[10px] text-brand-muted uppercase">
                  STK: {product.stock}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {/* 3. Negative Space Under Columns 3 & 4: Signature BUY NOW → CTA */}
      {featuredProduct && (
        <div className="mt-8 md:mt-12 flex justify-end pr-2 md:pr-4">
          <div className="flex flex-col items-end">
            <MagneticCTA
              text={isOrdering ? "PROCESSING..." : "BUY NOW →"}
              disabled={featuredProduct.stock <= 0 || isOrdering}
              onClick={() => handleProductCta(featuredProduct)}
            />
            <span className="font-mono text-[10px] uppercase tracking-widest text-brand-muted mt-2">
              Featured: {featuredProduct.name} ({formatProductPrice(featuredProduct.price, currency)})
            </span>
          </div>
        </div>
      )}

      {/* 4. Brutalist Variant Selection Modal */}
      <VariantModal
        product={activeModalProduct}
        isOpen={isModalOpen}
        currency={currency}
        whatsappNumber={whatsappNumber}
        onClose={() => {
          setIsModalOpen(false);
          setActiveModalProduct(null);
        }}
      />
    </section>
  );
}

export default BestsellerGrid;
