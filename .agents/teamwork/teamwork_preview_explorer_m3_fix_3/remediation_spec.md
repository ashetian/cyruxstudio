# Remediation Specification: Client Error Handling & Test Alignment (Fix Cycle 3)

**Author:** Fix Explorer 3 (`teamwork_preview_explorer_m3_fix_3`)  
**Target Milestone:** M3 (WhatsApp Ordering Flow Remediation)  
**Date:** 2026-11-14T17:25:00Z  
**Target Files:**
1. `src/components/storefront/bestseller-grid.tsx`
2. `tests/tier1-feature/f11-whatsapp-validation.ts`
**Accompanying Artifacts:**
- `proposed_bestseller_grid.tsx` (Complete replacement)
- `bestseller_grid.patch` (Unified diff patch)
- `proposed_f11_whatsapp_validation.ts` (Complete replacement)
- `f11_whatsapp_validation.patch` (Unified diff patch)

---

## 1. Executive Summary

During the Milestone 3 review, Reviewer 2 identified two critical architectural defects:
1. **Client-Side Validation Bypass in `bestseller-grid.tsx`**: In single-variant product purchases, if `/api/order/whatsapp` returns a non-200 response (e.g. 400 validation error, 404 missing product, 500 server error), lines 80–109 silently catch or drop out of the `if (res.ok)` block and unconditionally execute `window.open(generateWhatsAppOrderUrl(...))` anyway. This completely bypasses server-side price verification, out-of-stock validation, and input sanitization.
2. **Test Decoupling in `tests/tier1-feature/f11-whatsapp-validation.ts`**: The test suite tested a 24-line local inline mock closure (`validateOrderPayload`) rather than importing the production validator and Zod schemas from `src/lib/validations.ts`. This created a false sense of test pass rates while leaving the production route unexercised by Feature 11 tests.

This specification details the root causes, the exact remediation design, the patch implementation, and independent verification procedures to ensure all 130 tests pass.

---

## 2. Defect Analysis & Root Causes

### 2.1 Defect 1: Client Validation Bypass in `bestseller-grid.tsx`
- **Location**: `src/components/storefront/bestseller-grid.tsx` lines 80–109.
- **Observed Behavior**:
  ```tsx
  // Existing flawed code
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

  // Dropped out of try/catch or res.ok === false!
  const url = generateWhatsAppOrderUrl(whatsappNumber, {
    productId: product.id,
    productName: product.name,
    variant: singleVariant,
    price: product.price,
    currency,
  });
  window.open(url, "_blank", "noopener,noreferrer"); // <-- RUNS ANYWAY!
  ```
- **Consequence**:
  - If a product is out of stock in the database, `/api/order/whatsapp` returns `400 { success: false, error: "Product is out of stock" }`. The client ignores the 400 and opens WhatsApp anyway.
  - If the product was deleted from the database, `/api/order/whatsapp` returns `404 { success: false, error: "Product not found" }`. The client ignores the 404 and opens WhatsApp anyway.
  - Server validation is rendered inert for all single-variant products on the homepage grid.

### 2.2 Defect 2: Mock Function Decoupling in `f11-whatsapp-validation.ts`
- **Location**: `tests/tier1-feature/f11-whatsapp-validation.ts` lines 5–28.
- **Observed Behavior**:
  ```ts
  // Existing flawed code in test file
  import { describe, it, expect } from '../framework.ts';
  import { sanitizeCustomerText } from '../contracts.ts';

  describe('Feature 11: WhatsApp Order Payload Validation', () => {
    const validateOrderPayload = (input: any) => {
      // Local copy of logic, NOT testing src/lib/validations.ts!
      ...
    };
  ```
- **Consequence**:
  - The production `validateOrderPayload`, `whatsAppOrderInputSchema`, and `whatsAppOrderApiRequestSchema` in `src/lib/validations.ts` were not exercised by the official Tier 1 Feature 11 test suite.
  - If production schemas in `src/lib/validations.ts` had bugs, Feature 11 tests would still report green.

---

## 3. Remediation Design

### 3.1 `bestseller-grid.tsx` Remediation

#### A. State Management
Introduce dedicated state for handling error messages and in-flight request locking:
```tsx
const [orderError, setOrderError] = useState<string | null>(null);
const [isOrdering, setIsOrdering] = useState(false);

// Auto-dismiss order error notification after 7 seconds
useEffect(() => {
  if (orderError) {
    const timer = setTimeout(() => {
      setOrderError(null);
    }, 7000);
    return () => clearTimeout(timer);
  }
}, [orderError]);
```

#### B. Strict Error Interception in `handleProductCta`
```tsx
const handleProductCta = async (product: Product, e?: React.MouseEvent) => {
  e?.stopPropagation();
  if (product.stock <= 0 || isOrdering) return;

  // Clear previous errors
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

    // Server returned error (non-200 or data.success === false)
    if (!res.ok || !data.success) {
      const message =
        data.error ||
        (res.status === 400
          ? "Order validation failed. Please check product details."
          : res.status === 404
          ? "Product not found in catalog."
          : `Order service error (${res.status}).`);
      setOrderError(message);
      return; // CRITICAL: RETURN IMMEDIATELY, DO NOT FALL THROUGH!
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
```

#### C. Accessible Brutalist Error UI (Inline Banner + Floating Toast)
Render dual notifications:
1. **Inline Alert Banner** directly below the section heading:
```tsx
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
```
2. **Floating Brutalist Toast** pinned to viewport bottom-right for users who have scrolled down:
```tsx
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
```

---

### 3.2 `tests/tier1-feature/f11-whatsapp-validation.ts` Remediation

#### A. Import Alignment
Replace the local mock closure with direct imports from `src/lib/validations.ts`:
```ts
import { describe, it, expect } from '../framework.ts';
import {
  validateOrderPayload,
  whatsAppOrderInputSchema,
  whatsAppOrderApiRequestSchema,
  sanitizeCustomerText,
} from '../../src/lib/validations.ts';
```

#### B. Test Suite Assertions (Maintaining Exact 5 Tests / 130 Suite Total)
- **11.1**: Exercises `validateOrderPayload(valid)`, `whatsAppOrderApiRequestSchema.parse(valid)`, and `whatsAppOrderInputSchema.parse(...)`.
- **11.2**: Exercises `validateOrderPayload(malicious)`, `sanitizeCustomerText(notes)`, and `whatsAppOrderApiRequestSchema.parse(malicious)` ensuring `<script>` neutralization.
- **11.3**: Exercises `validateOrderPayload(htmlPayload)` and `whatsAppOrderApiRequestSchema.parse(htmlPayload)` ensuring `<img onerror=...>` stripping.
- **11.4**: Exercises `validateOrderPayload` throwing on empty/whitespace/missing `productId`, plus `whatsAppOrderApiRequestSchema.safeParse` and `whatsAppOrderInputSchema.safeParse` returning `success: false`.
- **11.5**: Exercises `validateOrderPayload` throwing on >500 character notes, plus `whatsAppOrderApiRequestSchema` rejecting >500 character notes and `whatsAppOrderInputSchema` rejecting negative price (`-50`).

---

## 4. Invalidation & Verification Strategy

The implementation worker can independently verify the solution using:

1. **Verify Test Suite**:
   ```bash
   npm test
   ```
   **Expected**: Exactly 130 tests pass (105 Tier 1, 12 Tier 2, 8 Tier 3, 5 Tier 4).

2. **Verify Type Safety & Linting**:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   ```
   **Expected**: Code 0, zero errors, zero warnings.

3. **Verify Empirical M3 Verification Harness**:
   ```bash
   npx tsx tests/verification_m3.ts
   npx tsx tests/m3-challenger-stress.ts
   npx tsx tests/m3-challenger-empirical.ts
   ```
   **Expected**: All M3 assertions pass with code 0.

4. **Verify Client Error Gating Simulation**:
   ```bash
   npx tsx -e '
   import { BestsellerGrid } from "./src/components/storefront/bestseller-grid";
   console.log("BestsellerGrid successfully exported:", typeof BestsellerGrid === "function");
   '
   ```
