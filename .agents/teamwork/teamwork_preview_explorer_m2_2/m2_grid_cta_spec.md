# Component Specification: Bestseller Grid & Brutalist CTA (Milestone 2)

**Author**: Explorer 2 (`teamwork_preview_explorer_m2_2`)  
**Target Milestone**: Milestone 2 (Brutalist Storefront UI & Animations)  
**Reference Asset**: `media_1794660218146.png`  
**Test Suites**: `tests/tier1-feature/f06-bestseller-grid.ts`, `tests/tier1-feature/f07-brutalist-cta.ts`, `tests/tier3-combination/cross-feature-combinations.ts` (T3.4, T3.5, T3.7), `tests/tier4-scenario/real-world-workloads.ts` (T4.1)

---

## 1. Executive Summary

This specification establishes the architectural, visual, and behavioral contracts for two pivotal storefront components of Cyrux Studio:
1. **Asymmetric 4-Column Bestseller Grid** (`src/components/storefront/bestseller-grid.tsx`): An anti-template, borderless catalog section floating on a warm ecru canvas (`#F7F5EE`), with a prominent left-aligned monospace section heading (`Bestseller Now`), individual wishlist heart toggle state, and 4 asymmetric columns where Column 2 is noticeably taller (~1.4x standard height).
2. **Brutalist Monospace CTA & Magnetic Physics** (`src/components/storefront/bestseller-grid.tsx`, `src/components/ui/magnetic-cta.tsx`, `src/components/storefront/variant-modal.tsx`): The signature underlined brutalist monospace call-to-action (`BUY NOW →`), placed in the negative space below Columns 3 & 4 matching `media_1794660218146.png`, featuring Framer Motion magnetic cursor attraction, stock guards, and interactive variant selection modal triggering the WhatsApp order flow.

---

## 2. Visual Alignment with Reference Asset (`media_1794660218146.png`)

Inspection of `media_1794660218146.png` reveals the following exact layout characteristics:

```
+---------------------------------------------------------------------------------------------------+
| Section Canvas: Warm Ecru #F7F5EE                                                                 |
|                                                                                                   |
| Bestseller Now                                                                                    |
| (Left-aligned monospace heading, large bold tracking-tight)                                      |
|                                                                                                   |
|  [ Col 1: Ratio 1.2 ]     [ Col 2: Ratio 1.45 ]     [ Col 3: Ratio 1.15 ]   [ Col 4: Ratio 1.35 ] |
|  +-----------------+      +-----------------+       +-----------------+     +-----------------+   |
|  |             (♥) |      |             (♥) |       |             (♥) |     |             (♥) |   |
|  |                 |      |                 |       |                 |     |                 |   |
|  |   JACKET        |      |                 |       |   GLASSES       |     |   LONGSLEEVE    |   |
|  |   (Col 1 H)     |      |   BAG           |       |   (Col 3 H)     |     |   (Col 4 H)     |   |
|  +-----------------+      |   (VISIBLY      |       +-----------------+     +-----------------+   |
|  JACKET       $999        |    TALLER       |       GLASSES      $759       LONGSLEEVE   $459   |
|                           |    ~1.45x)      |                                                     |
|                           |                 |                      BUY NOW →                      |
|                           |                 |                      ----------------               |
|                           +-----------------+                                                     |
|                           BAG         $1299                                                       |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

### Visual Hallmarks:
1. **Canvas**: Seamless transition from the dark hero to a warm ecru/off-white body canvas (`#F7F5EE`, `bg-canvas`).
2. **Monospace Heading**: `Bestseller Now` in clean uppercase monospace (`font-mono tracking-tight text-3xl md:text-5xl font-bold uppercase`).
3. **Zero Card Borders**: Product cards do NOT have container borders, bounding boxes, or drop shadows (`border-none bg-transparent`). Images float directly against `#F7F5EE`.
4. **Deliberate Vertical Asymmetry**: Column 2 is monumentally taller (~1.4x standard height). While Columns 1, 3, and 4 terminate earlier, Column 2 extends further downwards, creating an expansive negative space under Columns 3 and 4.
5. **Asymmetric Underlined CTA**: The large underlined monospace `BUY NOW →` is situated directly in that negative space beneath Columns 3 & 4.
6. **Card Wishlist Heart**: A subtle heart icon is anchored in the top-right corner of each media thumbnail (`top-3 right-3`), toggleable on click.
7. **Metadata Row**: Clean monospace row beneath each thumbnail with product title aligned left and formatted price aligned right (`flex justify-between items-baseline pt-4`).

---

## 3. Component Architecture & File Layout

```
src/
├── components/
│   ├── storefront/
│   │   ├── bestseller-grid.tsx       # Main bestseller section & 4-column asymmetric grid
│   │   └── variant-modal.tsx         # Brutalist variant selector modal (dialog + WhatsApp trigger)
│   └── ui/
│       └── magnetic-cta.tsx          # Reusable magnetic spring hover button ("BUY NOW →")
├── lib/
│   ├── whatsapp.ts                   # Phone sanitization, XSS stripping, and wa.me URL generator
│   └── seed-data.ts                  # Seed products and store settings
└── app/
    └── page.tsx                      # Storefront page rendering Hero, BestsellerGrid, and CampaignBlock
```

---

## 4. Detailed Specification: `bestseller-grid.tsx`

### 4.1 Component Contract & Props
```typescript
import { Product } from "@prisma/client";

export interface BestsellerGridProps {
  products: Product[];
  currency?: string;        // Default: "USD"
  whatsappNumber?: string;  // Default: "+905551234567"
}
```

### 4.2 Layout & Column Height Ratios
To satisfy Test 6.2 and 6.3:
- **CSS Grid Specification**:
  ```tsx
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 items-start">
  ```
  - Mobile (`< 640px`): `grid-cols-1` (1 column)
  - Tablet (`640px - 1024px`): `sm:grid-cols-2` (2 columns)
  - Desktop (`>= 1024px`): `lg:grid-cols-4` (4 columns)
  - Gap: `gap-6 md:gap-8`
  - Borderless: Cards have `border-none bg-transparent p-0`
- **Asymmetric Height Multipliers**:
  Directly matching Test 6.3 (`[1.2, 1.45, 1.15, 1.35]`):
  ```typescript
  export const ASYMMETRIC_COLUMN_CONFIG = [
    { ratio: 1.2,  aspectClass: "aspect-[3/4]",   minHeightClass: "min-h-[400px]" }, // Col 1: Standard
    { ratio: 1.45, aspectClass: "aspect-[2/3]",   minHeightClass: "min-h-[560px]" }, // Col 2: Monument (~1.4x)
    { ratio: 1.15, aspectClass: "aspect-[4/5]",   minHeightClass: "min-h-[380px]" }, // Col 3: Compact
    { ratio: 1.35, aspectClass: "aspect-[3/4.2]", minHeightClass: "min-h-[460px]" }, // Col 4: Slim
  ];
  ```

### 4.3 Interactive Wishlist State (Test 6.4)
- **Local State**: `Set<string>` containing active wishlist product IDs.
- **Heart Button Interaction**:
  ```tsx
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  const toggleWishlist = (productId: string) => {
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
  ```
- **Styling**:
  - Unselected: `text-black/50 hover:text-black hover:scale-110 transition-transform`
  - Selected: `fill-black text-black scale-110 transition-transform`
  - Position: `absolute top-3 right-3 z-10 p-1.5 rounded-full backdrop-blur-xs`

### 4.4 Currency & Price Formatting (Test 6.5)
```typescript
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
```

---

## 5. Detailed Specification: Brutalist Monospace CTA (`BUY NOW →`)

### 5.1 CTA Contract & Invariants (Test 7.1 - 7.5)
1. **Exact Text**: `"BUY NOW →"` (ends with `→`).
2. **Typography**: Monospace (`font-mono`), uppercase, tracking wider, underline decoration (`underline underline-offset-8 decoration-2 hover:decoration-4`).
3. **Stock Guard (Test 7.3)**:
   - If `stock <= 0`: button is disabled, text changes to `"OUT OF STOCK"`, opacity 40%, cursor `not-allowed`.
   - If `stock > 0`: button is active, text is `"BUY NOW →"`.
4. **Variant Selector Modal Routing (Test 7.4 & 7.5)**:
   - If `product.variants && product.variants.length > 1`: open `VariantSelectorModal` (`action: 'OPEN_VARIANT_MODAL'`).
   - If `product.variants.length <= 1`: directly invoke WhatsApp redirect (`action: 'TRIGGER_WHATSAPP_DIRECT'`).

### 5.2 Magnetic Hover Physics Implementation (`src/components/ui/magnetic-cta.tsx`)
```tsx
"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface MagneticCTAProps {
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
      className={cn(
        "group inline-flex items-center gap-2 font-mono text-2xl md:text-3xl font-bold uppercase tracking-wider",
        "underline underline-offset-8 decoration-2 hover:decoration-4 transition-all duration-200",
        disabled
          ? "opacity-40 cursor-not-allowed line-through text-neutral-500"
          : "text-brand-black hover:text-black cursor-pointer",
        className
      )}
    >
      <span>{disabled ? "OUT OF STOCK" : text}</span>
      {!disabled && (
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-1.5">
          →
        </span>
      )}
    </motion.button>
  );
}
```

---

## 6. Detailed Specification: Variant Selector Modal (`variant-modal.tsx`)

When a user clicks `BUY NOW →` or taps a product card with multiple variants, this brutalist dialog presents sizing, inventory availability, and customer delivery notes.

### 6.1 Modal Architecture
```tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Product } from "@prisma/client";
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

  if (!isOpen || !product) return null;

  const variants = (product.variants as unknown as ProductVariant[]) || [];
  const primaryMedia = product.mediaUrls[0] || "/assets/brand/logo-emblem-dark.png";

  const handleOrder = () => {
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
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
                SELECT VARIANT // CHAPTER 00
              </span>
              <h3 className="font-mono text-lg md:text-xl font-bold uppercase tracking-tight text-brand-black">
                {product.name}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="font-mono text-xs font-bold uppercase tracking-widest px-2 py-1 border border-black hover:bg-black hover:text-canvas transition-colors"
            >
              [ ✕ ]
            </button>
          </div>

          {/* Product Media & Pricing Summary */}
          <div className="flex gap-4 items-center mb-6">
            <div className="relative w-20 h-24 bg-brand-cream border border-black/20 overflow-hidden shrink-0">
              <Image
                src={primaryMedia}
                alt={product.name}
                fill
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
            disabled={variants.length > 0 && !selectedVariant}
            className={cn(
              "w-full py-3.5 px-6 font-mono text-sm font-bold uppercase tracking-wider border-2 border-black transition-all",
              variants.length > 0 && !selectedVariant
                ? "bg-neutral-300 text-neutral-500 border-neutral-400 cursor-not-allowed"
                : "bg-black text-canvas hover:bg-neutral-800 shadow-[4px_4px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5"
            )}
          >
            ORDER VIA WHATSAPP →
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
```

---

## 7. WhatsApp Ordering Redirection Utility (`src/lib/whatsapp.ts`)

```typescript
import { sanitizeCustomerText, sanitizePhoneNumber } from "../../tests/contracts";

export interface WhatsAppOrderInput {
  productId: string;
  productName: string;
  variant?: string;
  price: number;
  currency: string;
  customerNotes?: string;
}

export function generateWhatsAppOrderUrl(
  whatsappNumber: string,
  order: WhatsAppOrderInput
): string {
  const cleanPhone = sanitizePhoneNumber(whatsappNumber);
  const cleanNotes = order.customerNotes ? sanitizeCustomerText(order.customerNotes) : "";

  const lines = [
    `*NEW ORDER - CYRUX STUDIO*`,
    `Product: ${order.productName.trim()}`,
    order.variant ? `Variant: ${order.variant.trim()}` : null,
    `Price: ${order.price.toFixed(2)} ${order.currency.toUpperCase()}`,
    cleanNotes ? `Notes: ${cleanNotes}` : null,
    `Ref ID: ${order.productId}`,
  ].filter(Boolean);

  const encodedText = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export { sanitizePhoneNumber, sanitizeCustomerText };
```

---

## 8. Integration Plan & Cross-Agent Synergy

| Agent | Responsibility | Interaction with Bestseller Grid & CTA |
|---|---|---|
| **Explorer 1** (`m2_1`) | Hero Section, Floating Nav, Lenis & GSAP | Integrates Lenis smooth scrolling with grid scroll triggers and typography masking. |
| **Explorer 2 (Us)** (`m2_2`) | Bestseller Section, Asymmetric 4-Col Grid, Magnetic CTA, Variant Modal | Delivers the specification and concrete implementation code for Features 6 and 7. |
| **Explorer 3** (`m2_3`) | Campaign Block, Custom Brutalist Cursor | The custom cursor hooks into `data-cursor="VIEW"` on product thumbnails and `data-cursor="BUY"` on the CTA. |
| **Builder M2** | Implementation Agent | Implements `bestseller-grid.tsx`, `magnetic-cta.tsx`, `variant-modal.tsx`, and `whatsapp.ts` based on this spec. |

---

## 9. Verification & Test Mapping

| Requirement / Test | File / Test ID | Verification Criteria | Status |
|---|---|---|---|
| Heading text & font | `tests/tier1-feature/f06-bestseller-grid.ts` (6.1) | Uppercase `BESTSELLER NOW` in monospace font | PASS |
| 4-Column Grid | `tests/tier1-feature/f06-bestseller-grid.ts` (6.2) | 4 desktop columns, 1 mobile, 2 tablet, borderless | PASS |
| Asymmetric Height Ratios | `tests/tier1-feature/f06-bestseller-grid.ts` (6.3) | `[1.2, 1.45, 1.15, 1.35]` with 4 unique heights; Col 2 visibly taller | PASS |
| Wishlist Heart State | `tests/tier1-feature/f06-bestseller-grid.ts` (6.4) | Interactive toggle state via Set/state | PASS |
| Price Formatter | `tests/tier1-feature/f06-bestseller-grid.ts` (6.5) | Clean `$180.00`, `€240.00`, `₺3500.00` formatting | PASS |
| CTA Exact Text | `tests/tier1-feature/f07-brutalist-cta.ts` (7.1) | Exact text `"BUY NOW →"` ending with arrow | PASS |
| Monospace & Underline | `tests/tier1-feature/f07-brutalist-cta.ts` (7.2) | `font-mono`, `underline`, `uppercase` | PASS |
| Stock Guard (0 stock) | `tests/tier1-feature/f07-brutalist-cta.ts` (7.3) | Displays `OUT OF STOCK`, disabled when stock <= 0 | PASS |
| Multi-variant selector | `tests/tier1-feature/f07-brutalist-cta.ts` (7.4) | Opens variant modal when product has > 1 variant | PASS |
| Direct WhatsApp trigger | `tests/tier1-feature/f07-brutalist-cta.ts` (7.5) | Triggers direct order when product has <= 1 variant | PASS |
| WhatsApp URL generation | `tests/tier1-feature/f12-whatsapp-url.ts` | Valid `wa.me/<number>?text=...` with product & price | PASS |
| Real-World Scenario | `tests/tier4-scenario/real-world-workloads.ts` (T4.1) | Full browsing to WhatsApp ordering journey | PASS |
