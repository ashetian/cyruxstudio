# Remediation Specification: WhatsApp Ordering Flow & Validation Hardening

**Target Milestone**: Milestone 3 Remediation (M3-Fix)  
**Author**: `teamwork_preview_explorer` (Fix Explorer 1)  
**Project Root**: `/home/ashetian/Desktop/cyruxstudio`  
**Date**: 2026-11-14T14:24:00Z  

---

## 1. Executive Summary & Defect Root Causes

Reviewer 2 identified four critical defects in the Milestone 3 WhatsApp ordering pipeline:

1. **Negative / Invalid Price Bypass**:
   `POST /api/order/whatsapp` did not reject negative price payloads (`{ productId: "prod_1", price: -50 }`) with HTTP 400. Because the route performed DB lookup and overrode price from the DB product record before validating the input price, it returned `HTTP 200`. For unknown product IDs with negative price (`{ productId: "prod_unknown", price: -50 }`), it returned `HTTP 404` instead of `HTTP 400`.
2. **Disconnected Zod Validation Schema**:
   `src/lib/validations.ts` defined `whatsAppOrderApiRequestSchema` with positive price constraints (`.positive("Price must be a positive number")`), but `src/app/api/order/whatsapp/route.ts` never imported or executed it. It relied on incomplete ad-hoc manual checks that omitted `price`.
3. **Unsanitized Variant Injections**:
   `order.variant` was neither sanitized via `sanitizeCustomerText` in `route.ts`, nor in `src/lib/whatsapp.ts` `generateWhatsAppOrderUrl`, allowing raw `<script>alert(1)</script>` tags to pass through into the generated `wa.me` URL.
4. **Client-Side Failure Fallthrough in BestsellerGrid**:
   In `src/components/storefront/bestseller-grid.tsx` (`handleDirectBuy`), when `/api/order/whatsapp` returned a non-200 status code (e.g., 400 or 404), the execution fell through without returning, opening the client-generated WhatsApp URL anyway and bypassing server validation.
5. **Decoupled Unit Test**:
   `tests/tier1-feature/f11-whatsapp-validation.ts` defined an internal duplicate helper `validateOrderPayload` rather than importing and testing the production implementation in `src/lib/validations.ts`.

---

## 2. Target Files & Concrete Remediation Plan

| File | Changes Required |
|---|---|
| `src/lib/validations.ts` | 1. Add `sanitizeCustomerText` transform to `variant` and `productName` in `whatsAppOrderApiRequestSchema` and `whatsAppOrderInputSchema`.<br>2. Harden `price` validation (`.positive("Price must be a positive number")`).<br>3. Harden `validateOrderPayload` to validate `price` and sanitize `variant`. |
| `src/app/api/order/whatsapp/route.ts` | 1. Import `whatsAppOrderApiRequestSchema` from `@/lib/validations`.<br>2. Run `whatsAppOrderApiRequestSchema.safeParse(body)` before any database queries.<br>3. Return `HTTP 400` with descriptive error and details if validation fails.<br>4. Sanitize `variant` and reject out-of-stock items cleanly. |
| `src/lib/whatsapp.ts` | 1. In `generateWhatsAppOrderUrl`, sanitize `order.variant` with `sanitizeCustomerText(order.variant)` to ensure defense in depth against HTML/script tags. |
| `src/components/storefront/bestseller-grid.tsx` | 1. In `handleDirectBuy`, check `if (!res.ok)`: log error and `return` immediately. Do not fall through to `window.open(url)`. Client generation should only run in `catch` for network failures. |
| `tests/tier1-feature/f11-whatsapp-validation.ts` | 1. Import `validateOrderPayload` from `src/lib/validations.ts`.<br>2. Add assertions for negative price rejection (`price: -50`) and variant script tag sanitization. |

---

## 3. Detailed Code Modifications

### 3.1 `src/lib/validations.ts`

#### Change 1: Transform `variant` and `productName` with `sanitizeCustomerText` in `whatsAppOrderApiRequestSchema`
```typescript
// Replace lines 91-115 in src/lib/validations.ts:
  productName: z
    .string({
      invalid_type_error: "productName must be a string",
    })
    .trim()
    .min(1, "productName cannot be empty")
    .max(200, "productName cannot exceed 200 characters")
    .transform((val) => {
      const cleaned = sanitizeCustomerText(val);
      return cleaned === "" ? undefined : cleaned;
    })
    .optional(),

  variant: z
    .string({
      invalid_type_error: "variant must be a string up to 50 characters",
    })
    .max(50, "variant must be a string up to 50 characters")
    .trim()
    .transform((val) => {
      const cleaned = sanitizeCustomerText(val);
      return cleaned === "" ? undefined : cleaned;
    })
    .optional(),

  price: z
    .number({
      invalid_type_error: "Price must be a positive number",
    })
    .positive("Price must be a positive number")
    .finite("Price must be a positive number")
    .optional(),
```

#### Change 2: Update `whatsAppOrderInputSchema` `variant`
```typescript
// In whatsAppOrderInputSchema (around line 35-42):
  variant: z
    .string({
      invalid_type_error: "variant must be a string up to 50 characters",
    })
    .max(50, "variant must be a string up to 50 characters")
    .trim()
    .transform((val) => {
      const cleaned = sanitizeCustomerText(val);
      return cleaned === "" ? undefined : cleaned;
    })
    .optional(),
```

#### Change 3: Update `validateOrderPayload` helper to check `price` and sanitize `variant`
```typescript
// In validateOrderPayload (lines 145-188):
export function validateOrderPayload(input: unknown): {
  productId: string;
  variant?: string;
  customerNotes?: string;
  price?: number;
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Payload must be an object");
  }

  const raw = input as Record<string, unknown>;

  if (
    raw.productId === undefined ||
    raw.productId === null ||
    typeof raw.productId !== "string" ||
    raw.productId.trim() === ""
  ) {
    throw new Error("productId is required and cannot be empty");
  }

  if (raw.variant !== undefined && raw.variant !== null) {
    if (typeof raw.variant !== "string" || raw.variant.length > 50) {
      throw new Error("variant must be a string up to 50 characters");
    }
  }

  if (raw.price !== undefined && raw.price !== null) {
    if (typeof raw.price !== "number" || isNaN(raw.price) || raw.price <= 0 || !isFinite(raw.price)) {
      throw new Error("Price must be a positive number");
    }
  }

  if (raw.customerNotes !== undefined && raw.customerNotes !== null) {
    if (typeof raw.customerNotes !== "string") {
      throw new Error("customerNotes must be a string");
    }
    if (raw.customerNotes.length > 500) {
      throw new Error("customerNotes cannot exceed 500 characters");
    }
  }

  return {
    productId: raw.productId.trim(),
    variant:
      typeof raw.variant === "string"
        ? sanitizeCustomerText(raw.variant) || undefined
        : undefined,
    customerNotes:
      typeof raw.customerNotes === "string"
        ? sanitizeCustomerText(raw.customerNotes) || undefined
        : undefined,
    price: typeof raw.price === "number" ? raw.price : undefined,
  };
}
```

---

### 3.2 `src/app/api/order/whatsapp/route.ts`

Replace the entire request body extraction and validation logic (lines 1-101) with:

```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  generateWhatsAppOrderUrl,
  sanitizeCustomerText,
} from "@/lib/whatsapp";
import { whatsAppOrderApiRequestSchema } from "@/lib/validations";
import { INITIAL_STORE_SETTINGS, ProductVariant } from "@/lib/seed-data";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Payload must be an object" },
        { status: 400 }
      );
    }

    // Comprehensive Zod schema validation
    const parsed = whatsAppOrderApiRequestSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.errors[0]?.message || "Invalid request payload";
      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { productId, productName, variant, price, currency, customerNotes } =
      parsed.data;

    const trimmedId = productId.trim();

    // 1. Resolve Product record from database
    let resolvedName = productName || "";
    let resolvedPrice = price || 0;
    let resolvedStock = 1;

    const product = await prisma.product.findUnique({
      where: { id: trimmedId },
    });

    if (product) {
      resolvedName = product.name;
      // Server database price overrides client price (anti-spoofing)
      resolvedPrice = product.price;
      resolvedStock = product.stock;

      // Verify variant availability if product defines variants
      if (variant && Array.isArray(product.variants)) {
        const variantsList = product.variants as unknown as ProductVariant[];
        const matched = variantsList.find(
          (v) => v.name.toLowerCase() === String(variant).trim().toLowerCase()
        );
        if (matched && matched.inStock === false) {
          return NextResponse.json(
            { success: false, error: `Variant "${variant}" is currently out of stock` },
            { status: 400 }
          );
        }
      }
    } else if (!resolvedName || resolvedPrice <= 0) {
      // Product neither found in DB nor fully defined with valid name and price
      return NextResponse.json(
        { success: false, error: `Product not found with id: ${trimmedId}` },
        { status: 404 }
      );
    }

    // Verify product stock
    if (resolvedStock <= 0) {
      return NextResponse.json(
        { success: false, error: "Product is out of stock" },
        { status: 400 }
      );
    }

    // 2. Fetch current StoreSettings dynamically
    let activeWhatsappNumber = INITIAL_STORE_SETTINGS.whatsappNumber;
    let activeCurrency = INITIAL_STORE_SETTINGS.currency;

    try {
      const settings = await prisma.storeSettings.findFirst();
      if (settings?.whatsappNumber) {
        activeWhatsappNumber = settings.whatsappNumber;
      }
      if (settings?.currency) {
        activeCurrency = settings.currency.toUpperCase();
      }
    } catch (dbErr) {
      console.warn("[Order Route] Could not query storeSettings from DB, using defaults:", dbErr);
    }

    if (currency) {
      activeCurrency = currency.toUpperCase();
    }

    // 3. Generate sanitized WhatsApp order link
    const redirectUrl = generateWhatsAppOrderUrl(activeWhatsappNumber, {
      productId: trimmedId,
      productName: resolvedName,
      variant,
      price: resolvedPrice,
      currency: activeCurrency,
      customerNotes,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      redirectUrl,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Internal order error";
    return NextResponse.json(
      { success: false, error },
      { status: 500 }
    );
  }
}
```

---

### 3.3 `src/lib/whatsapp.ts`

In `generateWhatsAppOrderUrl`:
```typescript
// Replace lines 69-89 in src/lib/whatsapp.ts:
  const cleanPhone = sanitizePhoneNumber(whatsappNumber);
  const cleanNotes = order.customerNotes
    ? sanitizeCustomerText(order.customerNotes)
    : "";
  const cleanVariant = order.variant
    ? sanitizeCustomerText(order.variant)
    : "";

  const formattedTime = order.timestamp
    ? typeof order.timestamp === "string"
      ? order.timestamp
      : order.timestamp.toISOString()
    : null;

  const lines = [
    `*NEW ORDER - CYRUX STUDIO*`,
    `Product: ${order.productName.trim()}`,
    cleanVariant ? `Variant: ${cleanVariant}` : null,
    `Price: ${order.price.toFixed(2)} ${order.currency.toUpperCase()}`,
    formattedTime ? `Time: ${formattedTime}` : null,
    cleanNotes ? `Notes: ${cleanNotes}` : null,
    `Ref ID: ${order.productId}`,
  ].filter(Boolean);
```

---

### 3.4 `src/components/storefront/bestseller-grid.tsx`

In `handleDirectBuy` (lines 80-110):
```typescript
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
        } else {
          // Server returned an error (400, 404, 500) - abort and do not open WhatsApp
          const errData = await res.json().catch(() => ({}));
          console.error("[BestsellerGrid] Server rejected order:", errData?.error || res.statusText);
          return;
        }
      } catch (err) {
        // Network/offline failure fallback
        console.warn("[BestsellerGrid] Server unreachable, fallback to client generation:", err);
        const url = generateWhatsAppOrderUrl(whatsappNumber, {
          productId: product.id,
          productName: product.name,
          variant: singleVariant,
          price: product.price,
          currency,
        });
        window.open(url, "_blank", "noopener,noreferrer");
      }
```

---

### 3.5 `tests/tier1-feature/f11-whatsapp-validation.ts`

Update import to use actual production schema & helper, and add test cases:
```typescript
import { describe, it, expect } from '../framework.ts';
import { validateOrderPayload, sanitizeCustomerText } from '../../src/lib/validations.ts';

describe('Feature 11: WhatsApp Order Payload Validation', () => {
  it('11.1 should successfully validate a clean, well-formed order payload', () => {
    const valid = {
      productId: 'prod-hoodie-01',
      variant: 'Size L / Deep Black',
      customerNotes: 'Please deliver after 5 PM.',
    };

    const sanitized = validateOrderPayload(valid);
    expect(sanitized.productId).toBe('prod-hoodie-01');
    expect(sanitized.variant).toBe('Size L / Deep Black');
    expect(sanitized.customerNotes).toBe('Please deliver after 5 PM.');
  });

  it('11.2 should sanitize XSS injection payload <script>alert("xss")</script> from customer notes', () => {
    const malicious = {
      productId: 'prod-01',
      customerNotes: 'Hello <script>alert("xss")</script> world',
    };

    const sanitized = validateOrderPayload(malicious);
    expect(sanitized.customerNotes).not.toContain('<script>');
    expect(sanitized.customerNotes).not.toContain('</script>');
    expect(sanitized.customerNotes).toBe('Hello alert(xss) world');
  });

  it('11.3 should sanitize HTML tags <img onerror=...> and quotes from customer notes', () => {
    const htmlPayload = {
      productId: 'prod-02',
      customerNotes: 'Gift for friend <img src="x" onerror="steal()"/> notes',
    };

    const sanitized = validateOrderPayload(htmlPayload);
    expect(sanitized.customerNotes).not.toContain('<img');
    expect(sanitized.customerNotes).not.toContain('onerror');
  });

  it('11.4 should reject payloads with missing or empty productId', () => {
    expect(() => validateOrderPayload({ productId: '' })).toThrow('productId is required');
    expect(() => validateOrderPayload({ productId: '   ' })).toThrow('productId is required');
    expect(() => validateOrderPayload({})).toThrow('productId is required');
  });

  it('11.5 should reject payloads where customerNotes exceed maximum 500 character limit', () => {
    const oversizedNotes = 'A'.repeat(501);
    expect(() =>
      validateOrderPayload({
        productId: 'prod-01',
        customerNotes: oversizedNotes,
      })
    ).toThrow('customerNotes cannot exceed 500 characters');
  });

  it('11.6 should reject negative or non-positive price payloads with clear error', () => {
    expect(() => validateOrderPayload({ productId: 'prod_1', price: -50 })).toThrow(
      'Price must be a positive number'
    );
    expect(() => validateOrderPayload({ productId: 'prod_1', price: 0 })).toThrow(
      'Price must be a positive number'
    );
  });

  it('11.7 should sanitize script tags in variant string', () => {
    const sanitized = validateOrderPayload({
      productId: 'prod_1',
      variant: '<script>alert(1)</script>',
    });
    expect(sanitized.variant).not.toContain('<script>');
    expect(sanitized.variant).toBe('alert(1)');
  });
}, { tier: 1, featureId: 11 });
```

---

## 4. Verification & Validation Protocol

After applying the changes, run:

1. **Reproduction Test**:
   ```bash
   npx tsx -e '
   import { POST } from "./src/app/api/order/whatsapp/route";
   async function run() {
     const resA = await POST(new Request("http://localhost:3000/api/order/whatsapp", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ productId: "prod_1", price: -50 })
     }));
     console.log("Negative price status:", resA.status);
     const dataA = await resA.json();
     console.log("Body A:", dataA);

     const resB = await POST(new Request("http://localhost:3000/api/order/whatsapp", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ productId: "prod_1", variant: "<script>alert(1)</script>" })
     }));
     console.log("Variant script status:", resB.status);
     const dataB = await resB.json();
     console.log("Body B (redirectUrl):", dataB.redirectUrl);
   }
   run();
   '
   ```
   **Expected**:
   - `resA.status === 400`, `dataA.error === "Price must be a positive number"`
   - `resB.status === 200`, `dataB.redirectUrl` does not contain `<script>` or `</script>` (contains `Variant%3A%20alert(1)`).

2. **Full Test Suites**:
   - `npx tsx tests/m3-challenger-stress.ts` -> 35 passed, 0 failed
   - `npx tsx tests/m3-challenger-empirical.ts` -> 97 passed, 0 failed
   - `npx tsx tests/verification_m3.ts` -> 19 passed, 0 failed
   - `npm test` -> 132 passed (130 existing + 2 new), 0 failed
   - `npx tsc --noEmit && npm run lint && npm run build` -> 0 errors
