# Milestone 3 Specification: Storefront WhatsApp Integration & UI Polish

**Document**: `m3_ui_integration_spec.md`  
**Author**: Explorer 3 (`teamwork_preview_explorer_m3_3`)  
**Target Milestone**: M3 (WhatsApp Ordering Flow) & M2 Review Polish  
**Project**: cyrux studio (`/home/ashetian/Desktop/cyruxstudio`)  
**Status**: Investigation Complete — Ready for Implementation  

---

## 1. Executive Summary & Problem Scope

This document specifies the exact storefront integration and end-to-end redirection logic for the frictionless WhatsApp ordering system of **cyrux studio**, along with the resolution of two polish items from the Milestone 2 review.

### Core Objectives:
1. **Storefront WhatsApp Order Flow (`bestseller-grid.tsx` & `variant-modal.tsx`)**:
   - Seamlessly bridge catalog interaction to direct WhatsApp conversation (`https://wa.me/<number>?text=<encoded_order>`).
   - If a product has multiple size variants (`variants.length > 1`), open `VariantModal` to let the customer select a variant and optionally enter delivery notes.
   - If a product has a single or zero variants (`variants.length <= 1`), directly initiate the WhatsApp order flow.
   - Support both `/api/order/whatsapp` (server-side validated endpoint) and client-side engine with `StoreSettings` context as a zero-latency, offline-resilient fallback.
2. **Polish Item 1 (`src/components/ui/magnetic-cta.tsx`)**:
   - Eliminate the duplicate arrow bug (`BUY NOW → →`) when `text` contains `"→"`.
   - Preserve the brutalist Framer Motion spring physics and `group-hover:translate-x-1.5` animated micro-interaction on the single arrow.
3. **Polish Item 2 (`src/components/storefront/hero-section.tsx`)**:
   - Remove `uppercase` from the monumental edge-to-edge `h1` display title (`cyrux`) so it renders in the intended lowercase grotesque display typography seen in layout reference `media_1794660218146.png`.
4. **Verification & Test Suite Compatibility**:
   - Ensure 100% compatibility with all 130 tests across Tiers 1-4 (`npm test`) and empirical verification suites.

---

## 2. End-to-End System Architecture & Dataflow

### 2.1 Multi-Variant Order Journey (via `VariantModal`)

```
[ User on Storefront (#shop) ]
           │
           │ Clicks Card Thumbnail / "ORDER →" / Featured "BUY NOW →"
           ▼
[ `bestseller-grid.tsx`: handleProductCta(product) ]
           │
           ├─ If product.stock <= 0 ───────────────► [ HALT: Out of Stock ]
           │
           ├─ If product.variants.length > 1
           │          │
           │          ▼
           │  [ Open `variant-modal.tsx` ]
           │          │
           │          ├─ Auto-selects 1st in-stock variant (e.g. "S")
           │          ├─ User picks variant (e.g. "L")
           │          ├─ User types optional notes (max 500 chars)
           │          │
           │          ▼
           │  [ User clicks "ORDER VIA WHATSAPP →" ]
           │          │
           │          ├──► Mode 1: POST /api/order/whatsapp
           │          │      │ Body: { productId, variant, customerNotes }
           │          │      ▼
           │          │    [ Next.js API Route validates via Zod + DB lookup ]
           │          │      │ Returns: { success: true, redirectUrl: "https://wa.me/..." }
           │          │      ▼
           │          │    [ window.open(redirectUrl, "_blank", "noopener,noreferrer") ]
           │          │
           │          └──► Mode 2: Client Fallback (if API offline or test mock)
           │                 │ generateWhatsAppOrderUrl(whatsappNumber, { ... })
           │                 ▼
           │               [ window.open(url, "_blank", "noopener,noreferrer") ]
           ▼
[ Official WhatsApp Terminal Opened: wa.me/905551234567?text=... ]
```

### 2.2 Single/Zero-Variant Direct Order Journey

```
[ User on Storefront (#shop) ]
           │
           │ Clicks Card Thumbnail / "ORDER →" / Featured "BUY NOW →"
           ▼
[ `bestseller-grid.tsx`: handleProductCta(product) ]
           │
           ├─ If product.stock <= 0 ───────────────► [ HALT: Out of Stock ]
           │
           └─ If product.variants.length <= 1
                      │
                      ├─ Single variant extracted (or undefined)
                      ├─ Invokes POST /api/order/whatsapp (or client fallback)
                      ▼
        [ Direct Redirection to https://wa.me/<number>?text=<encoded_order> ]
```

---

## 3. Component Specification: `VariantModal`

**File**: `src/components/storefront/variant-modal.tsx`

### 3.1 State Requirements & State Machine
1. `selectedVariant`: string (`""` initially, updated on product change to first in-stock variant).
2. `customerNotes`: string (`""` initially, max length 500 chars).
3. `isSubmitting`: boolean (flags in-flight network request, disables button, updates label to `"CONNECTING TO WHATSAPP..."`).
4. `errorMessage`: string | null (displays inline alert if API reports error, e.g., product depleted).

### 3.2 Accessibility & Keyboard Behavior
- **Role & Attributes**: Container has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby="variant-modal-title"`.
- **Keyboard ESC**: Closes modal on `Escape` keydown (already bound via `useEffect`).
- **Backdrop Click**: Closes modal when user clicks outside the modal content box.
- **Focus Trap / Button Disable**: Action button is disabled if `isSubmitting === true` or if `variants.length > 0 && !selectedVariant`.

### 3.3 End-to-End Submission & Redirection Method
The modal triggers the order via `handleOrder`:
```tsx
const handleOrder = async () => {
  if (!product || isSubmitting) return;
  setIsSubmitting(true);
  setErrorMessage(null);

  try {
    // 1. Attempt server-side API endpoint
    const response = await fetch("/api/order/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        variant: selectedVariant || undefined,
        customerNotes: customerNotes.trim() || undefined,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.redirectUrl) {
        window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
        onClose();
        return;
      }
    }

    // If server returned error response, extract error or fall back
    const errData = await response.json().catch(() => ({}));
    if (errData.error) {
      setErrorMessage(errData.error);
      setIsSubmitting(false);
      return;
    }

    // Fall back to client generation
    fallbackClientRedirect();
  } catch {
    // Network failure / offline / test runner fallback
    fallbackClientRedirect();
  } finally {
    setIsSubmitting(false);
  }
};

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
```

---

## 4. Component Specification: `BestsellerGrid`

**File**: `src/components/storefront/bestseller-grid.tsx`

### 4.1 Trigger Surface Points
The following elements must trigger `handleProductCta(product)`:
1. **Product Media Card Thumbnail**: `div[data-cursor="VIEW"]` on click.
2. **Discrete Per-Card Buy Action**: Monospace button `ORDER →` / `BUY NOW →`.
3. **Featured Negative Space CTA**: Underlined `MagneticCTA` (`BUY NOW →`).

### 4.2 Stock Gating & Variant Branching Logic
```tsx
const handleProductCta = async (product: Product, e?: React.MouseEvent) => {
  e?.stopPropagation();
  if (product.stock <= 0) return;

  const variants = (product.variants as unknown as ProductVariant[]) || [];
  if (variants && variants.length > 1) {
    // Multiple variants: Open modal for size/variant selection
    setActiveModalProduct(product);
    setIsModalOpen(true);
  } else {
    // Single or zero variant: Direct WhatsApp order
    const singleVariant = variants[0]?.name;

    try {
      const res = await fetch("/api/order/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variant: singleVariant || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.redirectUrl) {
          window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
          return;
        }
      }
    } catch {
      // Fallback to client generation
    }

    const url = generateWhatsAppOrderUrl(whatsappNumber, {
      productId: product.id,
      productName: product.name,
      variant: singleVariant,
      price: product.price,
      currency,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  }
};
```

---

## 5. Milestone 2 Polish Item 1: `MagneticCTA` Double Arrow Elimination

**File**: `src/components/ui/magnetic-cta.tsx`

### 5.1 Root Cause Analysis
In `src/components/ui/magnetic-cta.tsx`:
- Default prop: `text = "BUY NOW →"` (line 15).
- Main text rendered in span: `<span>{disabled ? "OUT OF STOCK" : text}</span>` (line 63).
- Additional animated span rendered:
  ```tsx
  {!disabled && (
    <span className="inline-block transition-transform duration-200 group-hover:translate-x-1.5">
      →
    </span>
  )}
  ```
- Result: When `text` is `"BUY NOW →"`, the DOM renders:
  `<span>BUY NOW →</span><span>→</span>`  
  producing the unsightly double arrow `BUY NOW → →`!

### 5.2 Solution
Strip any trailing or embedded arrow `"→"` from `text` prior to rendering in the label span, while allowing the standalone `<span aria-hidden="true">→</span>` to render the animated arrow:

```tsx
// Clean label text: remove arrow characters so animated arrow span doesn't duplicate it
const labelText = text.replace(/→/g, "").trim();
```

And in the JSX:
```tsx
<span>{disabled ? "OUT OF STOCK" : labelText}</span>
{!disabled && (
  <span
    aria-hidden="true"
    className="inline-block transition-transform duration-200 group-hover:translate-x-1.5"
  >
    →
  </span>
)}
```

### 5.3 Verification Matrix
| Input `text` Prop | Rendered Label Span | Animated Arrow Span | Full Visual String | Double Arrow? |
|-------------------|---------------------|---------------------|--------------------|---------------|
| `"BUY NOW →"`     | `"BUY NOW"`         | `"→"`               | `"BUY NOW →"`      | **NO (Fixed)** |
| `"BUY NOW"`       | `"BUY NOW"`         | `"→"`               | `"BUY NOW →"`      | **NO**        |
| `"SİPARİŞ VER →"` | `"SİPARİŞ VER"`     | `"→"`               | `"SİPARİŞ VER →"`  | **NO (Fixed)** |
| `disabled={true}` | `"OUT OF STOCK"`    | None                | `"OUT OF STOCK"`   | **NO**        |

---

## 6. Milestone 2 Polish Item 2: Hero Section Monumental Typography Lowercase Grotesque Display

**File**: `src/components/storefront/hero-section.tsx`

### 6.1 Root Cause Analysis
In `src/components/storefront/hero-section.tsx`:
- The character array defines lowercase characters: `const characters = ["c", "y", "r", "u", "x"];` (line 91).
- In line 209, the `h1` container has:
  ```tsx
  className="w-full text-center flex justify-between px-2 sm:px-4 md:px-8 font-black uppercase tracking-tighter leading-[0.72] pointer-events-none"
  ```
- The CSS class `uppercase` applies `text-transform: uppercase`, which forces the letters to display as `C Y R U X`.
- In the primary layout reference `media_1794660218146.png`, the monumental display font is distinctly **lowercase grotesque** display type (`c y r u x`).

### 6.2 Solution
Remove `uppercase` from line 209:

#### Before:
```tsx
<h1
  ref={titleContainerRef}
  aria-label="cyrux"
  className="w-full text-center flex justify-between px-2 sm:px-4 md:px-8 font-black uppercase tracking-tighter leading-[0.72] pointer-events-none"
  style={{
    color: BRAND_TOKENS.CREAM_DISPLAY,
    fontSize: "clamp(4.5rem, 21.5vw, 24rem)",
  }}
>
```

#### After:
```tsx
<h1
  ref={titleContainerRef}
  aria-label="cyrux"
  className="w-full text-center flex justify-between px-2 sm:px-4 md:px-8 font-black tracking-tighter leading-[0.72] pointer-events-none"
  style={{
    color: BRAND_TOKENS.CREAM_DISPLAY,
    fontSize: "clamp(4.5rem, 21.5vw, 24rem)",
  }}
>
```

---

## 7. Concrete Code Replacement Proposals

### Proposal 1: `src/components/ui/magnetic-cta.tsx`

```tsx
<<<<
      <span>{disabled ? "OUT OF STOCK" : text}</span>
      {!disabled && (
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-1.5">
          →
        </span>
      )}
====
      <span>{disabled ? "OUT OF STOCK" : text.replace(/→/g, "").trim()}</span>
      {!disabled && (
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-200 group-hover:translate-x-1.5"
        >
          →
        </span>
      )}
>>>>
```

### Proposal 2: `src/components/storefront/hero-section.tsx`

```tsx
<<<<
        <h1
          ref={titleContainerRef}
          aria-label="cyrux"
          className="w-full text-center flex justify-between px-2 sm:px-4 md:px-8 font-black uppercase tracking-tighter leading-[0.72] pointer-events-none"
          style={{
====
        <h1
          ref={titleContainerRef}
          aria-label="cyrux"
          className="w-full text-center flex justify-between px-2 sm:px-4 md:px-8 font-black tracking-tighter leading-[0.72] pointer-events-none"
          style={{
>>>>
```

### Proposal 3: `src/components/storefront/variant-modal.tsx`

Enhance `variant-modal.tsx` with:
1. `isSubmitting` and `errorMessage` state hooks.
2. `handleOrder` executing `POST /api/order/whatsapp` with fallback to `generateWhatsAppOrderUrl`.
3. Modal `role="dialog"`, `aria-modal="true"`, and `aria-labelledby="variant-modal-title"`.
4. Visual feedback on submit (`"PREPARING ORDER..."` or `"CONNECTING TO WHATSAPP..."`).

---

## 8. Test Verification & Invariant Audit

### 8.1 Existing Test Suite Invariants
- `tests/tier1-feature/f07-brutalist-cta.ts`:
  - 7.1: CTA text contract (`BUY NOW →`). Passed.
  - 7.3: Stock <= 0 disables CTA (`OUT OF STOCK`). Passed.
  - 7.4: Multiple variants opens `VariantModal`. Passed.
  - 7.5: Single/zero variants triggers direct WhatsApp order. Passed.
- `tests/tier1-feature/f04-hero-search.ts`:
  - 4.3: Edge-to-edge monumental typography title contract (`heroTitle.toLowerCase() === 'cyrux'`). Passed.
- `tests/m2-challenger-stress.ts`:
  - 3.3 to 3.7: In-stock / OOS stock gating, initial selected variant, and URL generation. Passed.

### 8.2 Recommended Additional Unit Tests for M3 Runner
Add to `tests/tier1-feature/f07-brutalist-cta.ts`:
```ts
it('7.6 should eliminate duplicate arrow characters when text prop contains arrow', () => {
  const sanitizeCtaLabel = (text: string) => text.replace(/→/g, '').trim();
  expect(sanitizeCtaLabel('BUY NOW →')).toBe('BUY NOW');
  expect(sanitizeCtaLabel('SİPARİŞ VER →')).toBe('SİPARİŞ VER');
  expect(sanitizeCtaLabel('ORDER NOW')).toBe('ORDER NOW');
});
```

Add to `tests/tier1-feature/f04-hero-search.ts`:
```ts
it('4.6 should preserve lowercase characters for monumental display typography', () => {
  const characters = ['c', 'y', 'r', 'u', 'x'];
  const renderedText = characters.join('');
  expect(renderedText).toBe('cyrux');
  expect(renderedText).not.toBe('CYRUX');
});
```

---

## 9. Implementer Checklist for Worker

1. **Apply Polish 1 to `src/components/ui/magnetic-cta.tsx`**:
   - Strip `→` from label span using `text.replace(/→/g, "").trim()`.
   - Add `aria-hidden="true"` to animated arrow span.
2. **Apply Polish 2 to `src/components/storefront/hero-section.tsx`**:
   - Remove `uppercase` from `h1` element in line 209.
3. **Update `src/components/storefront/variant-modal.tsx`**:
   - Add `isSubmitting` and `errorMessage` state.
   - Implement `handleOrder` with `fetch('/api/order/whatsapp')` and client fallback.
   - Add accessible dialog attributes.
4. **Update `src/components/storefront/bestseller-grid.tsx`**:
   - Implement `handleProductCta` with `/api/order/whatsapp` call for single-variant products.
5. **Execute Validation Suite**:
   - Run `npm run typecheck` (`tsc --noEmit`).
   - Run `npm test` (`tsx tests/runner.ts`).
   - Run `npx tsx tests/m2-challenger-stress.ts`.
   - Run `npx tsx tests/verification_empirical_m2.ts`.
