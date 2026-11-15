# Remediation Specification: WhatsApp Ordering Variant Sanitization & XSS Neutralization

**Author:** Fix Explorer 2 (`teamwork_preview_explorer`)  
**Target Milestone:** Milestone 3 (WhatsApp Ordering Flow Remediation)  
**Date:** 2026-11-14T14:25:00Z  
**Target Files:**
1. `src/lib/validations.ts`
2. `src/lib/whatsapp.ts`
3. `src/app/api/order/whatsapp/route.ts`
4. `tests/contracts.ts` (test harness alignment)
5. `tests/verification_m3.ts` (test assertion additions)

---

## 1. Executive Summary

During Milestone 3 adversarial review, Reviewer 2 identified that passing malicious payloads containing HTML or script tags in the `variant` field (such as `{ productId: "prod_1", variant: "<script>alert(1)</script>" }` or `<img src=x onerror=alert(1)>`) resulted in HTTP 200 with raw, unsanitized script tags encoded directly into the WhatsApp order URL:
`https://wa.me/905551234567?text=...Variant%3A%20%3Cscript%3Ealert(1)%3C%2Fscript%3E...`.

This occurs because:
1. `src/lib/validations.ts` (`whatsAppOrderInputSchema`, `whatsAppOrderApiRequestSchema`, and `validateOrderPayload`) only verified string type and `max(50)`, omitting `sanitizeCustomerText` or HTML tag stripping for `variant` (unlike `customerNotes`).
2. `src/lib/whatsapp.ts` (`generateWhatsAppOrderUrl`) formatted `order.variant.trim()` without invoking `sanitizeCustomerText`.
3. `src/app/api/order/whatsapp/route.ts` performed ad-hoc string trimming on `variant` rather than sanitizing against HTML/script injection.

This specification provides the exact, production-ready sanitization strategy and code changes to ensure that script and HTML tags are completely neutralized, and the resulting WhatsApp URL **NEVER** contains unescaped `<script>` or raw HTML tags.

---

## 2. Empirical Defect Verification

### 2.1 Direct Reproduction Execution
Executing `POST /api/order/whatsapp` with `{ productId: "prod_1", variant: "<script>alert(1)</script>" }`:
```bash
npx tsx -e '
import { POST } from "./src/app/api/order/whatsapp/route";

async function run() {
  const res = await POST(new Request("http://localhost:3000/api/order/whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: "prod_1", variant: "<script>alert(1)</script>" })
  }));
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("URL:", data.redirectUrl);
}
run();
'
```

**Observed Output:**
```
Status: 200
URL: https://wa.me/905551234567?text=*NEW%20ORDER%20-%20CYRUX%20STUDIO*%0AProduct%3A%20PRETTY%20CHAOS%20TEE%0AVariant%3A%20%3Cscript%3Ealert(1)%3C%2Fscript%3E%0APrice%3A%20120.00%20USD%0ATime%3A%202026-11-14T14%3A19%3A59.417Z%0ARef%20ID%3A%20prod_1
```
The script tag `%3Cscript%3Ealert(1)%3C%2Fscript%3E` was emitted raw.

Similarly, sending `{ productId: "prod_1", variant: "<img src=x onerror=alert(1)>" }`:
```
URL: https://wa.me/905551234567?text=...Variant%3A%20%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E...
```

---

## 3. Architecture & Fix Strategy

### 3.1 Defense-in-Depth Principle
Sanitization must be enforced across all layers of the ordering stack:
1. **Schema Layer (`src/lib/validations.ts`)**:
   - Sanitize customer text in `sanitizeCustomerText(input)` to strip both complete HTML tags (`/<[^>]*>/g`) and any dangling angle brackets (`/[<>]/g`).
   - In Zod schemas (`whatsAppOrderInputSchema` and `whatsAppOrderApiRequestSchema`), apply `.transform((val) => sanitizeCustomerText(val) || undefined)` to `variant`.
   - In `validateOrderPayload(input)`, run `sanitizeCustomerText(raw.variant) || undefined`.
2. **Business Engine Layer (`src/lib/whatsapp.ts`)**:
   - In `generateWhatsAppOrderUrl`, sanitize `order.variant` via `sanitizeCustomerText(order.variant)`.
   - If the sanitized variant is empty (e.g. input was `<img src=x onerror=alert(1)>` which strips to `""`), omit the `Variant:` line entirely.
   - If text remains (e.g. `Size L <script>alert(1)</script>` -> `Size L alert(1)`), emit `Variant: Size L alert(1)`.
3. **Route Handler Layer (`src/app/api/order/whatsapp/route.ts`)**:
   - Parse body with `whatsAppOrderApiRequestSchema` (aligned with Fix Explorer 1).
   - Ensure `resolvedVariant` is assigned the sanitized string or `undefined`.
4. **Client & Fallback Resilience (`bestseller-grid.tsx` & `variant-modal.tsx`)**:
   - Because `generateWhatsAppOrderUrl` is hardened at line 1, client-side fallback URL generation is also automatically protected against raw script tags.

---

## 4. Concrete Code Modifications

### 4.1 Target 1: `src/lib/validations.ts`

#### A. Enhanced `sanitizeCustomerText` (Lines 7-12)
Ensure complete tag removal and strip any dangling angle brackets:
```ts
// BEFORE (Lines 7-12):
export function sanitizeCustomerText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/['";\\]/g, "") // Strip script/SQL injection characters
    .trim();
}

// AFTER:
export function sanitizeCustomerText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // Strip complete HTML tags
    .replace(/[<>]/g, "")    // Strip any remaining dangling angle brackets
    .replace(/['";\\]/g, "") // Strip script/SQL injection characters
    .trim();
}
```

#### B. `whatsAppOrderInputSchema` (Lines 35-42)
Apply `sanitizeCustomerText` transformation to `variant`:
```ts
// BEFORE (Lines 35-42):
  variant: z
    .string({
      invalid_type_error: "variant must be a string up to 50 characters",
    })
    .max(50, "variant must be a string up to 50 characters")
    .trim()
    .transform((val) => (val === "" ? undefined : val))
    .optional(),

// AFTER:
  variant: z
    .string({
      invalid_type_error: "variant must be a string up to 50 characters",
    })
    .max(50, "variant must be a string up to 50 characters")
    .transform((val) => {
      const cleaned = sanitizeCustomerText(val);
      return cleaned === "" ? undefined : cleaned;
    })
    .optional(),
```

#### C. `whatsAppOrderApiRequestSchema` (Lines 99-106)
Apply `sanitizeCustomerText` transformation to `variant`:
```ts
// BEFORE (Lines 99-106):
  variant: z
    .string({
      invalid_type_error: "variant must be a string up to 50 characters",
    })
    .max(50, "variant must be a string up to 50 characters")
    .trim()
    .transform((val) => (val === "" ? undefined : val))
    .optional(),

// AFTER:
  variant: z
    .string({
      invalid_type_error: "variant must be a string up to 50 characters",
    })
    .max(50, "variant must be a string up to 50 characters")
    .transform((val) => {
      const cleaned = sanitizeCustomerText(val);
      return cleaned === "" ? undefined : cleaned;
    })
    .optional(),
```

#### D. `validateOrderPayload` (Lines 180-188)
Sanitize `raw.variant`:
```ts
// BEFORE (Lines 180-188):
  return {
    productId: raw.productId.trim(),
    variant: typeof raw.variant === "string" ? (raw.variant.trim() || undefined) : undefined,
    customerNotes:
      typeof raw.customerNotes === "string"
        ? sanitizeCustomerText(raw.customerNotes) || undefined
        : undefined,
  };

// AFTER:
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
  };
```

---

### 4.2 Target 2: `src/lib/whatsapp.ts`

#### `generateWhatsAppOrderUrl` (Lines 65-92)
Sanitize `order.variant` before assembling manifest lines:
```ts
// BEFORE (Lines 65-92):
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

// AFTER:
export function generateWhatsAppOrderUrl(
  whatsappNumber: string,
  order: WhatsAppOrderInput
): string {
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

  const encodedText = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
```

---

### 4.3 Target 3: `src/app/api/order/whatsapp/route.ts`

#### Variant Resolution in Route (Lines 136-140)
Ensure `resolvedVariant` passes through `sanitizeCustomerText`:
```ts
// BEFORE (Lines 136-140):
    const resolvedVariant =
      variant && typeof variant === "string" && variant.trim() !== ""
        ? variant.trim()
        : undefined;

// AFTER:
    const resolvedVariant =
      variant && typeof variant === "string"
        ? sanitizeCustomerText(variant) || undefined
        : undefined;
```

*(Note: When Fix Explorer 1 integrates `whatsAppOrderApiRequestSchema.safeParse(body)`, `parsedBody.data.variant` will also already be sanitized).*

---

### 4.4 Target 4: `tests/contracts.ts`

#### `generateWhatsAppOrderUrl` in Test Contracts (Lines 79-97)
Keep test contracts in lockstep with `src/lib/whatsapp.ts`:
```ts
// BEFORE (Lines 79-97):
export function generateWhatsAppOrderUrl(
  whatsappNumber: string,
  order: WhatsAppOrderInput
): string {
  const cleanPhone = sanitizePhoneNumber(whatsappNumber);
  const cleanNotes = order.customerNotes ? sanitizeCustomerText(order.customerNotes) : '';

  const lines = [
    `*NEW ORDER - CYRUX STUDIO*`,
    `Product: ${order.productName.trim()}`,
    order.variant ? `Variant: ${order.variant.trim()}` : null,
    `Price: ${order.price.toFixed(2)} ${order.currency.toUpperCase()}`,
    cleanNotes ? `Notes: ${cleanNotes}` : null,
    `Ref ID: ${order.productId}`,
  ].filter(Boolean);

  const encodedText = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

// AFTER:
export function generateWhatsAppOrderUrl(
  whatsappNumber: string,
  order: WhatsAppOrderInput
): string {
  const cleanPhone = sanitizePhoneNumber(whatsappNumber);
  const cleanNotes = order.customerNotes ? sanitizeCustomerText(order.customerNotes) : '';
  const cleanVariant = order.variant ? sanitizeCustomerText(order.variant) : '';

  const lines = [
    `*NEW ORDER - CYRUX STUDIO*`,
    `Product: ${order.productName.trim()}`,
    cleanVariant ? `Variant: ${cleanVariant}` : null,
    `Price: ${order.price.toFixed(2)} ${order.currency.toUpperCase()}`,
    cleanNotes ? `Notes: ${cleanNotes}` : null,
    `Ref ID: ${order.productId}`,
  ].filter(Boolean);

  const encodedText = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
```

---

## 5. Alternative Strategy: Strict HTTP 400 Rejection

If the orchestrator or project rules prefer rejecting payloads containing HTML tags with HTTP 400 instead of stripping:
In `src/lib/validations.ts`:
```ts
  variant: z
    .string({
      invalid_type_error: "variant must be a string up to 50 characters",
    })
    .max(50, "variant must be a string up to 50 characters")
    .refine((val) => !/<[^>]*>/g.test(val) && !/[<>]/.test(val), {
      message: "variant cannot contain HTML or script tags",
    })
    .transform((val) => {
      const cleaned = sanitizeCustomerText(val);
      return cleaned === "" ? undefined : cleaned;
    })
    .optional(),
```
When `{ productId: "prod_1", variant: "<script>alert(1)</script>" }` is sent:
- Schema parse fails with `"variant cannot contain HTML or script tags"`.
- Route returns HTTP 400 with `{ success: false, error: "variant cannot contain HTML or script tags" }`.

**Recommendation**: The primary strategy (Universal Sanitization via `sanitizeCustomerText`) is recommended because:
1. It is 100% consistent with how `customerNotes` is handled across the entire codebase.
2. It satisfies Reviewer 2's explicit condition: *"must either return status: 400 or have all HTML/script tags stripped from the resulting WhatsApp URL."*
3. It does not break user checkout on benign character combinations while guaranteeing zero raw script/HTML tags in the WhatsApp URL.

---

## 6. Verification Test Plan

### 6.1 Test Assertions to Add to `tests/verification_m3.ts`

```ts
  await test("variant HTML and script tags are sanitized cleanly from WhatsApp URL", async () => {
    const req = new Request("http://localhost:3000/api/order/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: "prod_1",
        variant: "<script>alert(1)</script>",
      }),
    });
    const res = await orderWhatsappHandler(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(!data.redirectUrl.includes("<script>"));
    assert(!data.redirectUrl.includes("%3Cscript%3E"));
    assert(!data.redirectUrl.includes("%3C%2Fscript%3E"));
    const decoded = decodeURIComponent(data.redirectUrl);
    assert(!decoded.includes("<script>"));
    assert(!decoded.includes("</script>"));
    assert(decoded.includes("Variant: alert(1)"));
  });

  await test("variant img onerror payload is sanitized and stripped", async () => {
    const req = new Request("http://localhost:3000/api/order/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: "prod_1",
        variant: "<img src=x onerror=alert(1)>",
      }),
    });
    const res = await orderWhatsappHandler(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(!data.redirectUrl.includes("onerror"));
    const decoded = decodeURIComponent(data.redirectUrl);
    assert(!decoded.includes("<img"));
    assert(!decoded.includes("onerror"));
    assert(!decoded.includes("Variant:"));
  });
```

### 6.2 Regression Verification Commands
1. `npm test`: All 130 tests pass cleanly.
2. `npx tsx tests/verification_m3.ts`: All assertions pass.
3. `npx tsx tests/m3-challenger-stress.ts`: All stress assertions pass.
4. `npx tsc --noEmit`: 0 TypeScript errors.
5. `npm run lint`: 0 ESLint errors.
6. Empirical script execution:
   ```bash
   npx tsx -e '
   import { POST } from "./src/app/api/order/whatsapp/route";
   async function run() {
     const res = await POST(new Request("http://localhost:3000/api/order/whatsapp", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ productId: "prod_1", variant: "<script>alert(1)</script>" })
     }));
     const data = await res.json();
     console.log("Status:", res.status);
     console.log("Contains <script>:", decodeURIComponent(data.redirectUrl).includes("<script>"));
     console.log("Contains raw HTML:", /<[^>]*>/.test(decodeURIComponent(data.redirectUrl)));
   }
   run();
   '
   ```
   **Expected Output:**
   ```
   Status: 200
   Contains <script>: false
   Contains raw HTML: false
   ```
