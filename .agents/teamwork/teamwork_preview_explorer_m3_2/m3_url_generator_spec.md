# Milestone 3 Specification: Dynamic WhatsApp URL Generation & API Architecture
**Document**: `m3_url_generator_spec.md`  
**Author**: Explorer 2 (`teamwork_preview_explorer_m3_2`)  
**Scope**: Milestone 3 (M3: WhatsApp Ordering Flow) — Feature 12 & API Endpoint  
**Date**: 2026-11-14  
**Integrity Mode**: `development`  

---

## 1. Executive Summary

In **cyrux studio**, the purchasing experience departs radically from standard multi-step shopping carts and complex checkout forms. Reflecting the avant-garde, brutalist minimalism of the brand, ordering is frictionless and direct: clicking **"BUY NOW →"** / **"Sipariş Ver"** immediately translates customer intent into a structured, high-impact WhatsApp message dispatched to the studio's official terminal.

This document establishes the authoritative technical specification for:
1. **Dynamic `StoreSettings` Lookup**: Querying the active WhatsApp destination number and store currency from PostgreSQL (`prisma.storeSettings.findFirst()`) with graceful in-memory fallbacks.
2. **E.164 Phone Normalization**: Robust sanitization stripping `+`, whitespace, hyphens, parentheses, and punctuation into pure international digits compliant with WhatsApp's `wa.me` routing protocol.
3. **Brutalist Order Message Formatting**: Constructing an elegant, high-impact, monospace-aligned markdown order manifest containing product name, variant, price, currency, timestamp, sanitized notes, and reference ID.
4. **API Endpoint Architecture (`POST /api/order/whatsapp`)**: A robust Next.js App Router route handler validating order payloads, verifying product availability, resolving current store settings, and returning `{ success: true, redirectUrl: "https://wa.me/..." }`.

---

## 2. Analysis of Existing Codebase & Contracts

### 2.1 Contract Verification (`tests/tier1-feature/f12-whatsapp-url.ts`)
The opaque-box test harness defines five strict tier-1 contracts for Feature 12:

| Test ID | Contract Requirement | Assertion Target |
|---------|----------------------|------------------|
| **12.1** | Standard Turkish phone format (`+90 532 123 45 67`) | Resolves to `https://wa.me/905321234567?text=...`, contains encoded product, variant, and formatted price (`95.00 USD`). |
| **12.2** | US international phone format (`+1 (555) 019-2834`) | Resolves to `https://wa.me/15550192834?text=...`, contains encoded price (`240.00 EUR`). |
| **12.3** | Graceful omission of optional lines | When `variant` and `customerNotes` are omitted, output contains `Product:` and `Price:`, but strictly omits `Variant:` and `Notes:`. |
| **12.4** | Validation of phone digits | Empty string `""` or invalid non-digit string (`"invalid-no-digits"`) must throw an error with message matching `no digits found`. |
| **12.5** | Dynamic currency reflection | Order URLs reflect the dynamic currency code from store settings (e.g. `3500.00 TRY`, `180.00 GBP`). |

### 2.2 Boundary & Scenario Contracts
- **T2.5 & T2.6 (Unicode & Length)**: Must preserve UTF-8 international characters (Turkish characters `ğüşıöç`, Japanese `東京`, emojis `🖤`, `🧥`, `🚀`) without mojibake or corrupt encoding.
- **T2.7 (Messy Phone Strings)**: Correctly sanitizes phone strings containing spaces, dots, dashes, and parentheses (`+90 (532) 123-45.67` -> `905321234567`).
- **T3.1 (Dynamic Settings Switch)**: When admin changes `whatsappNumber` or `currency`, subsequent order URL generation immediately uses the new values.
- **T4.1 (Purchasing Workload)**: Assertions decode the `wa.me` query parameter and verify the exact order template structure:
  - `*NEW ORDER - CYRUX STUDIO*`
  - `Product: <name>`
  - `Variant: <variant>`
  - `Price: <price> <CURRENCY>`
  - `Notes: <sanitized_notes>`
  - `Ref ID: <product_id>`

### 2.3 Current Implementation in `src/lib/whatsapp.ts`
The current helper in `src/lib/whatsapp.ts` implements:
- `sanitizePhoneNumber(phone: string): string`
- `sanitizeCustomerText(input: string): string`
- `generateWhatsAppOrderUrl(whatsappNumber: string, order: WhatsAppOrderInput): string`

**Enhancements Specified for M3**:
1. Add optional `timestamp?: string | Date` support in `WhatsAppOrderInput`.
2. Ensure timestamp is rendered when provided, but omitted when not supplied (preserving 100% backward compatibility with Test 12.3 and Test 4.1).
3. Export an async helper `generateDynamicWhatsAppOrderUrl(orderInput)` that automates the `prisma.storeSettings.findFirst()` query.

---

## 3. Dynamic StoreSettings Resolution

### 3.1 Database Model (`prisma/schema.prisma`)
The `StoreSettings` model is defined as:
```prisma
model StoreSettings {
  id             String   @id @default(cuid()) // Single row ("default")
  whatsappNumber String   // Target WhatsApp destination (e.g. "+905551234567")
  currency       String   @default("USD")      // "USD" | "EUR" | "TRY" | "GBP"
  brandMetadata  Json     // Title, description, social links, banner text
  updatedAt      DateTime @updatedAt

  @@map("store_settings")
}
```

### 3.2 Dynamic Lookup Algorithm
```typescript
import prisma from "@/lib/db";
import { INITIAL_STORE_SETTINGS } from "@/lib/seed-data";

export interface ResolvedStoreConfig {
  whatsappNumber: string;
  currency: string;
}

/**
 * Resolves current store settings dynamically from database
 * with resilient in-memory fallback.
 */
export async function getActiveStoreConfig(): Promise<ResolvedStoreConfig> {
  try {
    const settings = await prisma.storeSettings.findFirst();
    return {
      whatsappNumber: settings?.whatsappNumber || INITIAL_STORE_SETTINGS.whatsappNumber,
      currency: settings?.currency?.toUpperCase() || INITIAL_STORE_SETTINGS.currency,
    };
  } catch (err) {
    console.warn("[WhatsApp Engine] Failed to fetch StoreSettings, using seed fallback:", err);
    return {
      whatsappNumber: INITIAL_STORE_SETTINGS.whatsappNumber,
      currency: INITIAL_STORE_SETTINGS.currency,
    };
  }
}
```

### 3.3 Resilient Interception
`src/lib/db.ts` features a proxy interceptor that automatically diverts queries to `mockHandlers.storeSettings.findFirst()` when `DATABASE_URL` is unset or database connection fails. This guarantees zero runtime crash during unconfigured local states.

---

## 4. Phone Normalization & E.164 Strict Digits

### 4.1 The WhatsApp `wa.me` Routing Rule
WhatsApp deep-linking strictly specifies:
```
https://wa.me/<number>
```
Where `<number>` is a full phone number in international format, **excluding** any zeroes, brackets, dashes, plus signs, or whitespace.

### 4.2 Sanitization Specification
```typescript
export function sanitizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== "string") {
    throw new Error("Invalid phone number: no digits found");
  }
  
  // Extract all contiguous numeric digits
  const digits = phone.replace(/\D/g, "");
  
  if (!digits) {
    throw new Error("Invalid phone number: no digits found");
  }
  
  return digits;
}
```

### 4.3 Input Transformation Matrix
| Input String | Sanitized Output | wa.me URL | Valid? |
|--------------|------------------|-----------|--------|
| `+90 532 123 45 67` | `905321234567` | `https://wa.me/905321234567` | Yes |
| `+1 (555) 019-2834` | `15550192834` | `https://wa.me/15550192834` | Yes |
| `+44 7911 123456` | `447911123456` | `https://wa.me/447911123456` | Yes |
| `+90 (532) 123-45.67` | `905321234567` | `https://wa.me/905321234567` | Yes |
| `0044 20 7946 0999` | `00442079460999` | `https://wa.me/00442079460999` | Yes |
| `""` | Throws Error | N/A | Rejected |
| `"invalid-no-digits"` | Throws Error | N/A | Rejected |

---

## 5. Brutalist Order Message Formatting

### 5.1 Design Philosophy
The WhatsApp order message is designed with brutalist clarity:
- Monospace typographic rhythm.
- WhatsApp bolding syntax (`*TEXT*`) for high-contrast section headers.
- Unambiguous line labels (`Product:`, `Variant:`, `Price:`, `Ref ID:`).
- Security sanitization against script injection (`<script>`, HTML tags, and SQL injection delimiters).

### 5.2 Message Structure
```
*NEW ORDER - CYRUX STUDIO*
Product: RAW CUT BOXY TEE
Variant: Size L
Price: 95.00 USD
Time: 2026-11-14T13:52:28.000Z
Notes: Deliver between 2-4 PM
Ref ID: prod-01
```

### 5.3 Implementation Specification (`src/lib/whatsapp.ts`)
```typescript
export interface WhatsAppOrderInput {
  productId: string;
  productName: string;
  variant?: string;
  price: number;
  currency: string;
  customerNotes?: string;
  timestamp?: string | Date;
}

export function generateWhatsAppOrderUrl(
  whatsappNumber: string,
  order: WhatsAppOrderInput
): string {
  const cleanPhone = sanitizePhoneNumber(whatsappNumber);
  const cleanNotes = order.customerNotes
    ? sanitizeCustomerText(order.customerNotes)
    : "";

  const formattedTime = order.timestamp
    ? typeof order.timestamp === "string"
      ? order.timestamp
      : order.timestamp.toISOString()
    : null;

  const lines = [
    `*NEW ORDER - CYRUX STUDIO*`,
    `Product: ${order.productName.trim()}`,
    order.variant ? `Variant: ${order.variant.trim()}` : null,
    `Price: ${order.price.toFixed(2)} ${order.currency.toUpperCase()}`,
    formattedTime ? `Time: ${formattedTime}` : null,
    cleanNotes ? `Notes: ${cleanNotes}` : null,
    `Ref ID: ${order.productId}`,
  ].filter(Boolean);

  const encodedText = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
```

---

## 6. API Route Specification (`POST /api/order/whatsapp`)

### 6.1 Endpoint Contract
- **Path**: `/api/order/whatsapp`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Authentication**: Public (customer ordering flow)

### 6.2 Request Payload Specification
The endpoint accepts two payload structures:
1. **Catalog Reference Mode** (recommended):
   ```json
   {
     "productId": "prod_1",
     "variant": "Size L",
     "customerNotes": "Please deliver after 6 PM"
   }
   ```
2. **Explicit Item Mode** (with product metadata):
   ```json
   {
     "productId": "prod_1",
     "productName": "PRETTY CHAOS TEE",
     "variant": "Size L",
     "price": 85.0,
     "currency": "USD",
     "customerNotes": "Please deliver after 6 PM"
   }
   ```

### 6.3 Validation Rules
- `productId`: Required, non-empty string, trimmed.
- `variant`: Optional string, maximum length 50 characters.
- `customerNotes`: Optional string, maximum length 500 characters, automatically sanitized against HTML/XSS.
- `price`: Optional positive number (if provided in explicit mode).
- `productName`: Optional non-empty string (if provided in explicit mode).

### 6.4 Response Schema
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "redirectUrl": "https://wa.me/905551234567?text=%2ANEW%20ORDER..."
  }
  ```
- **Bad Request (`400 Bad Request`)**:
  ```json
  {
    "success": false,
    "error": "customerNotes cannot exceed 500 characters"
  }
  ```
- **Not Found (`404 Not Found`)**:
  ```json
  {
    "success": false,
    "error": "Product not found with id: prod_unknown"
  }
  ```
- **Out of Stock (`400 Bad Request`)**:
  ```json
  {
    "success": false,
    "error": "Product is out of stock"
  }
  ```
- **Server Error (`500 Internal Server Error`)**:
  ```json
  {
    "success": false,
    "error": "Failed to process order request"
  }
  ```

### 6.5 Complete Route Implementation (`src/app/api/order/whatsapp/route.ts`)
```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateWhatsAppOrderUrl, sanitizeCustomerText } from "@/lib/whatsapp";
import { INITIAL_STORE_SETTINGS, ProductVariant } from "@/lib/seed-data";

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Payload must be a JSON object" },
        { status: 400 }
      );
    }

    const { productId, productName, variant, price, currency, customerNotes } = body;

    // Validate productId
    if (!productId || typeof productId !== "string" || productId.trim() === "") {
      return NextResponse.json(
        { success: false, error: "productId is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Validate variant
    if (variant !== undefined) {
      if (typeof variant !== "string" || variant.length > 50) {
        return NextResponse.json(
          { success: false, error: "variant must be a string up to 50 characters" },
          { status: 400 }
        );
      }
    }

    // Validate customerNotes
    if (customerNotes !== undefined) {
      if (typeof customerNotes !== "string") {
        return NextResponse.json(
          { success: false, error: "customerNotes must be a string" },
          { status: 400 }
        );
      }
      if (customerNotes.length > 500) {
        return NextResponse.json(
          { success: false, error: "customerNotes cannot exceed 500 characters" },
          { status: 400 }
        );
      }
    }

    const trimmedId = productId.trim();

    // 1. Resolve Product record from database
    let resolvedName = productName ? String(productName).trim() : "";
    let resolvedPrice = typeof price === "number" ? price : 0;
    let resolvedStock = 1;

    const product = await prisma.product.findUnique({
      where: { id: trimmedId },
    });

    if (product) {
      resolvedName = product.name;
      resolvedPrice = product.price;
      resolvedStock = product.stock;

      // Verify variant availability if applicable
      if (variant && Array.isArray(product.variants)) {
        const variantsList = product.variants as unknown as ProductVariant[];
        const matched = variantsList.find(
          (v) => v.name.toLowerCase() === variant.trim().toLowerCase()
        );
        if (matched && matched.inStock === false) {
          return NextResponse.json(
            { success: false, error: `Variant "${variant}" is currently out of stock` },
            { status: 400 }
          );
        }
      }
    } else if (!resolvedName || resolvedPrice <= 0) {
      // Product neither in DB nor fully defined in request
      return NextResponse.json(
        { success: false, error: `Product not found with id: ${trimmedId}` },
        { status: 404 }
      );
    }

    if (resolvedStock <= 0) {
      return NextResponse.json(
        { success: false, error: "Product is out of stock" },
        { status: 400 }
      );
    }

    // 2. Fetch current StoreSettings dynamically
    const settings = await prisma.storeSettings.findFirst();
    const activeWhatsappNumber =
      settings?.whatsappNumber || INITIAL_STORE_SETTINGS.whatsappNumber;
    const activeCurrency =
      currency && typeof currency === "string"
        ? currency.toUpperCase()
        : settings?.currency?.toUpperCase() || INITIAL_STORE_SETTINGS.currency;

    // 3. Generate sanitized WhatsApp order link
    const sanitizedNotes = customerNotes ? sanitizeCustomerText(customerNotes) : undefined;

    const redirectUrl = generateWhatsAppOrderUrl(activeWhatsappNumber, {
      productId: trimmedId,
      productName: resolvedName,
      variant: variant ? variant.trim() : undefined,
      price: resolvedPrice,
      currency: activeCurrency,
      customerNotes: sanitizedNotes,
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

## 7. Client-Side Storefront Integration Specification

### 7.1 Architecture: Hybrid Redundancy
To ensure 100% availability even in the presence of transient network interruptions, the client uses a **hybrid redundancy architecture**:

```
[User Clicks "BUY NOW →" / "ORDER VIA WHATSAPP →"]
                    │
                    ▼
          Try API Route First:
        POST /api/order/whatsapp
        /                      \
    [Success 200]           [Network Error / 5xx]
         │                          │
         ▼                          ▼
  window.open(redirectUrl)    Client-Side Fallback:
                             generateWhatsAppOrderUrl(
                               props.whatsappNumber,
                               orderData
                             )
```

### 7.2 Updated Handler in `variant-modal.tsx`
```typescript
const handleOrder = async () => {
  setIsSubmitting(true);
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

    const data = await res.json();
    if (data.success && data.redirectUrl) {
      window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
      onClose();
      return;
    }
  } catch (err) {
    console.warn("[Order Modal] API call failed, falling back to direct URL generator", err);
  } finally {
    setIsSubmitting(false);
  }

  // Graceful client-side fallback
  const fallbackUrl = generateWhatsAppOrderUrl(whatsappNumber, {
    productId: product.id,
    productName: product.name,
    variant: selectedVariant || undefined,
    price: product.price,
    currency,
    customerNotes: customerNotes.trim() || undefined,
  });
  window.open(fallbackUrl, "_blank", "noopener,noreferrer");
  onClose();
};
```

---

## 8. Verification & Test Plan

1. **Feature 12 Suite**:
   ```bash
   npx tsx tests/runner.ts --filter "12."
   ```
   Must pass all 5 subtests (standard Turkish, US phone, optional omissions, digit validation, dynamic currency).
2. **Combination & Workload Suites**:
   ```bash
   npx tsx tests/runner.ts --filter "T3.1"
   npx tsx tests/runner.ts --filter "T4.1"
   ```
   Verifies StoreSettings updates propagate immediately into URL generation.
3. **Full Regression Suite**:
   ```bash
   npm test
   ```
   Must maintain 100% pass rate (130/130 tests).
4. **Type Check**:
   ```bash
   npx tsc --noEmit
   ```
   Must pass with zero TypeScript compilation errors.
