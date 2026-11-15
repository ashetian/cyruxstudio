# Specification Report: WhatsApp Order Payload Zod Validation & Sanitization (Milestone 3)

**Author:** Teamwork Explorer 1 (`teamwork_preview_explorer`)  
**Date:** 2026-11-14  
**Working Directory:** `/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m3_1`  
**Target Project File:** `src/lib/validations.ts`  
**Related Files:** `src/lib/whatsapp.ts`, `src/app/api/order/whatsapp/route.ts`, `tests/tier1-feature/f11-whatsapp-validation.ts`  

---

## 1. Executive Summary

This specification establishes the authoritative Zod validation schemas, XSS sanitization contracts, error handling protocols, and unit test suites for WhatsApp orders in **cyrux studio**.

By validating order parameters before generating WhatsApp `https://wa.me/<number>?text=<encoded_order>` redirection URLs, the application prevents:
1. **Cross-Site Scripting (XSS)** through customer delivery notes.
2. **Malformed or injection payloads** that could disrupt message encoding or store operations.
3. **Price/Product spoofing** between the client-side UI and server-side ordering workflows.
4. **Boundary errors** (e.g. negative prices, empty product IDs, strings exceeding length limits).

---

## 2. Analysis of Existing Contracts & Requirements

### 2.1 Contracts Observed in `tests/tier1-feature/f11-whatsapp-validation.ts`
- **Root Object Guard:** Payload must be a non-null object (`typeof input === 'object' && !Array.isArray(input)`).
- **`productId` (Required):**
  - Must be a non-empty string.
  - Trimmed of leading/trailing whitespace.
  - If missing, empty string, or whitespace-only (`""` or `"   "`), must throw an error containing `'productId is required'`.
- **`variant` (Optional):**
  - If provided, must be a string up to 50 characters (`max(50)`).
  - Must throw `'variant must be a string up to 50 characters'` on failure.
  - Trimmed of whitespace; empty string normalizes to `undefined`.
- **`customerNotes` (Optional):**
  - If provided, must be a string up to 500 characters (`max(500)`).
  - Must throw `'customerNotes must be a string'` for non-string types.
  - Must throw `'customerNotes cannot exceed 500 characters'` if length > 500 characters (validated prior to sanitization).
  - Sanitization logic:
    - Strips all HTML/XML tags matching `<[^>]*>`.
    - Strips dangerous SQL/script injection quotes and control characters matching `['";\\]`.
    - Trims resulting text.
    - Example: `'Hello <script>alert("xss")</script> world'` $\to$ `'Hello alert(xss) world'`.
    - Example: `'Gift for friend <img src="x" onerror="steal()"/> notes'` $\to$ `'Gift for friend  notes'`.

### 2.2 Boundary & Extended Contracts from `tests/tier2-boundary/boundary-corner-cases.ts` & `PROJECT.md`
- **`productName` (Required for full order model):**
  - Non-empty string, trimmed, min 1 character, max 200 characters.
  - Full UTF-8 support: preserves multilingual unicode, Turkish characters (`ğüşıöç`), Japanese characters (`東京`), and emoji (`🖤`, `🧥`, `🚀`).
  - Rejects empty strings or whitespace-only strings.
- **`price` (Required for full order model):**
  - Must be a positive finite number (`price > 0`, e.g. `0.01` passes; `0`, `-100`, `NaN` reject).
  - Must throw `'Price must be a positive number'`.
- **`currency` (Optional / Store-driven):**
  - 3-letter currency code (e.g. `USD`, `EUR`, `TRY`, `GBP`), default `'USD'`.
- **`whatsappNumber` (StoreSettings):**
  - Validated by `sanitizePhoneNumber`: digits only, non-empty, must contain valid digits.

---

## 3. Zod Schema Specification (`src/lib/validations.ts`)

The schemas must be implemented using `zod` (v3.24.2 installed in `package.json`).

### 3.1 Core Sanitization Helper

To ensure single-source-of-truth across client, server, and test suites, the sanitization regex matches `tests/contracts.ts` and `src/lib/whatsapp.ts`:

```typescript
/**
 * Sanitizes customer-provided text to prevent HTML/XSS and script injection.
 * Strips HTML tags (<...>) and injection delimiters ('";\).
 */
export function sanitizeCustomerText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/['";\\]/g, "") // Strip script/SQL injection characters
    .trim();
}
```

### 3.2 Zod Schemas

#### A. `whatsAppOrderInputSchema` (Full Order Contract)
Used when generating the complete WhatsApp redirection link or validating full order objects:

```typescript
import { z } from "zod";

export const whatsAppOrderInputSchema = z.object({
  productId: z
    .string({
      required_error: "productId is required and cannot be empty",
      invalid_type_error: "productId is required and cannot be empty",
    })
    .trim()
    .min(1, "productId is required and cannot be empty"),

  productName: z
    .string({
      required_error: "productName is required and cannot be empty",
      invalid_type_error: "productName must be a string",
    })
    .trim()
    .min(1, "productName is required and cannot be empty")
    .max(200, "productName cannot exceed 200 characters"),

  variant: z
    .string({
      invalid_type_error: "variant must be a string up to 50 characters",
    })
    .max(50, "variant must be a string up to 50 characters")
    .trim()
    .transform((val) => (val === "" ? undefined : val))
    .optional(),

  price: z
    .number({
      required_error: "Price must be a positive number",
      invalid_type_error: "Price must be a positive number",
    })
    .positive("Price must be a positive number")
    .finite("Price must be a finite number"),

  currency: z
    .string({
      invalid_type_error: "currency must be a 3-letter currency code",
    })
    .trim()
    .toUpperCase()
    .min(3, "currency must be 3 characters")
    .max(4, "currency must not exceed 4 characters")
    .default("USD"),

  customerNotes: z
    .string({
      invalid_type_error: "customerNotes must be a string",
    })
    .max(500, "customerNotes cannot exceed 500 characters")
    .transform((val) => {
      const cleaned = sanitizeCustomerText(val);
      return cleaned === "" ? undefined : cleaned;
    })
    .optional(),
});

export type WhatsAppOrderInput = z.infer<typeof whatsAppOrderInputSchema>;
```

#### B. `whatsAppOrderApiRequestSchema` (API Request Payload Contract)
Used by `POST /api/order/whatsapp`. The client submits `{ productId, variant?, customerNotes? }`. The backend looks up the canonical product name and price from PostgreSQL to prevent client-side price tampering:

```typescript
export const whatsAppOrderApiRequestSchema = z.object({
  productId: z
    .string({
      required_error: "productId is required and cannot be empty",
      invalid_type_error: "productId is required and cannot be empty",
    })
    .trim()
    .min(1, "productId is required and cannot be empty"),

  variant: z
    .string({
      invalid_type_error: "variant must be a string up to 50 characters",
    })
    .max(50, "variant must be a string up to 50 characters")
    .trim()
    .transform((val) => (val === "" ? undefined : val))
    .optional(),

  customerNotes: z
    .string({
      invalid_type_error: "customerNotes must be a string",
    })
    .max(500, "customerNotes cannot exceed 500 characters")
    .transform((val) => {
      const cleaned = sanitizeCustomerText(val);
      return cleaned === "" ? undefined : cleaned;
    })
    .optional(),
});

export type WhatsAppOrderApiRequest = z.infer<typeof whatsAppOrderApiRequestSchema>;
```

#### C. Validation Helper Compatible with `f11-whatsapp-validation.ts`
To ensure exact drop-in compliance with unit test runners and callers that expect thrown errors:

```typescript
export function validateOrderPayload(input: unknown): {
  productId: string;
  variant?: string;
  customerNotes?: string;
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Payload must be an object");
  }

  const result = whatsAppOrderApiRequestSchema.safeParse(input);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue.message);
  }

  return {
    productId: result.data.productId,
    variant: result.data.variant,
    customerNotes: result.data.customerNotes,
  };
}
```

---

## 4. Error Handling & API Response Protocols

### 4.1 HTTP Response Specification (`POST /api/order/whatsapp`)

#### Successful Response (`200 OK`)
```json
{
  "success": true,
  "redirectUrl": "https://wa.me/905321234567?text=*NEW%20ORDER%20-%20CYRUX%20STUDIO*..."
}
```

#### Invalid Payload / Validation Error (`400 Bad Request`)
When Zod validation fails (e.g. empty productId, customerNotes > 500 chars, invalid types):
```json
{
  "success": false,
  "error": "Validation failed",
  "issues": [
    {
      "field": "customerNotes",
      "message": "customerNotes cannot exceed 500 characters"
    }
  ]
}
```

#### Product Not Found / Out of Stock (`404 Not Found` or `422 Unprocessable Entity`)
```json
{
  "success": false,
  "error": "Product not found or currently out of stock"
}
```

#### Internal Server Error (`500 Internal Server Error`)
```json
{
  "success": false,
  "error": "Failed to generate WhatsApp order redirect"
}
```

---

## 5. Test Matrix & Verification Coverage

| ID | Test Scenario | Input Payload | Expected Outcome |
|---|---|---|---|
| **V1** | Valid standard order | `{ productId: 'p1', variant: 'Size L', customerNotes: 'Deliver 5pm' }` | Sanitized & validated: all fields preserved |
| **V2** | Missing optional fields | `{ productId: 'p1' }` | Valid; `variant` and `customerNotes` resolve to `undefined` |
| **V3** | Missing productId | `{ variant: 'M' }` | Fails with `"productId is required and cannot be empty"` |
| **V4** | Empty string productId | `{ productId: '' }` | Fails with `"productId is required and cannot be empty"` |
| **V5** | Whitespace productId | `{ productId: '   ' }` | Fails with `"productId is required and cannot be empty"` |
| **V6** | Non-string productId | `{ productId: 12345 }` | Fails with `"productId is required and cannot be empty"` |
| **V7** | Variant over 50 chars | `{ productId: 'p1', variant: 'A'.repeat(51) }` | Fails with `"variant must be a string up to 50 characters"` |
| **V8** | Variant non-string | `{ productId: 'p1', variant: { size: 'L' } }` | Fails with `"variant must be a string up to 50 characters"` |
| **V9** | Empty variant string | `{ productId: 'p1', variant: '   ' }` | Valid; trims and normalizes to `undefined` |
| **V10** | Script tag XSS in notes | `{ productId: 'p1', customerNotes: 'Hi <script>alert("xss")</script>' }` | Sanitized to `"Hi alert(xss)"` |
| **V11** | Img tag onerror XSS | `{ productId: 'p1', customerNotes: 'Hi <img src="x" onerror="alert(1)"/>' }` | Sanitized; tags and quotes stripped |
| **V12** | SQL injection in notes | `{ productId: 'p1', customerNotes: "'; DROP TABLE products; --" }` | Quotes/semicolons stripped |
| **V13** | Notes > 500 characters | `{ productId: 'p1', customerNotes: 'A'.repeat(501) }` | Fails with `"customerNotes cannot exceed 500 characters"` |
| **V14** | Notes non-string | `{ productId: 'p1', customerNotes: ['urgent'] }` | Fails with `"customerNotes must be a string"` |
| **V15** | Multilingual & Emoji | `{ productId: 'p1', customerNotes: 'Kargo acil 🖤 🚀' }` | Preserves all emojis and unicode characters |
| **V16** | Non-object root | `"invalid string"` or `null` | Fails with `"Payload must be an object"` |

---

## 6. Recommended Next Steps for Milestone 3 Implementation

1. **Implement `src/lib/validations.ts`**:
   - Export `sanitizeCustomerText`, `whatsAppOrderInputSchema`, `whatsAppOrderApiRequestSchema`, `validateOrderPayload`.
   - Export types `WhatsAppOrderInput`, `WhatsAppOrderApiRequest`.
2. **Create Endpoint `src/app/api/order/whatsapp/route.ts`**:
   - Receive POST JSON body.
   - Run `whatsAppOrderApiRequestSchema.safeParse(body)`.
   - On error, return `NextResponse.json({ success: false, error: ... }, { status: 400 })`.
   - Query `prisma.product.findUnique` for canonical name and price.
   - Query `prisma.storeSettings.findFirst` for store `whatsappNumber` and `currency`.
   - Generate WhatsApp URL using `generateWhatsAppOrderUrl`.
   - Return `NextResponse.json({ success: true, redirectUrl })`.
3. **Connect Frontend `VariantModal`**:
   - In `src/components/storefront/variant-modal.tsx`, update `handleOrder` to either call `/api/order/whatsapp` or directly use `validateOrderPayload` prior to `generateWhatsAppOrderUrl`.
4. **Run Master Test Suite**:
   - Verify `npx tsx tests/runner.ts --filter "whatsapp"` passes 100%.
