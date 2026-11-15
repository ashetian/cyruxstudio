# Milestone 3 Independent Quality & Adversarial Review Report

**Reviewer:** `teamwork_preview_reviewer` (Reviewer 2)  
**Parent Orchestrator:** `6d2c4eb5-38de-4b31-91e2-cf749d8c0ff8`  
**Milestone:** M3 (WhatsApp Ordering Flow & Storefront Polish)  
**Working Directory:** `/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_reviewer_m3_2`  
**Date:** 2026-11-14T14:16:00Z  

---

## Review Summary

**Verdict: REQUEST_CHANGES**

### Executive Summary
Milestone 3 successfully established clean compilation (`npx tsc --noEmit`), zero ESLint warnings (`npm run lint`), a production Next.js 15 build (`npm run build`), and resolved Milestone 2 polish items (the double arrow in `MagneticCTA` and the monumental uppercase styling in `hero-section.tsx`).

However, an independent adversarial investigation revealed **two critical validation defects** in the server-side ordering route (`/api/order/whatsapp`) that violate the explicit acceptance requirements:
1. **Fails Negative Price Validation**: Passing an invalid payload with negative price (e.g. `{ productId: "prod_1", price: -50 }`) does **NOT** return HTTP 400. The route bypasses price validation when the product exists in the DB (returning HTTP 200 with DB price), and returns HTTP 404 when the product does not exist. It never returns HTTP 400.
2. **Fails Variant Sanitization / Script Tag Injection**: While `customerNotes` is sanitized, the `variant` field is neither sanitized nor validated against script tags. Passing `{ productId: "prod_1", variant: "<script>alert(1)</script>" }` returns HTTP 200 and directly emits the raw unsanitized `<script>alert(1)</script>` into the generated WhatsApp redirection URL.
3. **Disconnected Zod Validation**: Worker 3 defined `whatsAppOrderApiRequestSchema` in `src/lib/validations.ts` with strict positive price and length validation, but `src/app/api/order/whatsapp/route.ts` does not use this schema, relying instead on incomplete ad-hoc manual checks.
4. **Client-Side Bypass in `BestsellerGrid`**: If the API returns a non-200 error for single-variant products, `bestseller-grid.tsx` ignores the failure and unconditionally triggers the client fallback redirect, bypassing server-side validation and stock gates.
5. **Self-Certifying Test Masks**: Feature tests in `tests/tier1-feature/f11-whatsapp-validation.ts` defined a local mock `validateOrderPayload` function inside the test file rather than testing the production schemas or route handlers, allowing tests to achieve a 100% pass score while masking the defects in `route.ts`.

---

## Findings

### [Critical] Finding 1: Missing Server-Side Price Validation in `POST /api/order/whatsapp`
- **What**: Passing a negative price in the request payload fails to return HTTP 400.
- **Where**: `src/app/api/order/whatsapp/route.ts`, lines 28–30, 68–70, 94–100.
- **Empirical Evidence**:
  - Test 1: `{ productId: "prod_1", price: -50 }` $\to$ Returns `HTTP 200 OK`, body: `{ success: true, redirectUrl: "https://wa.me/905551234567?text=...Price%3A%20120.00%20USD..." }`.
  - Test 2: `{ productId: "prod_unknown", productName: "Item", price: -50 }` $\to$ Returns `HTTP 404 Not Found`, body: `{ success: false, error: "Product not found with id: prod_unknown" }`.
  - In neither case is HTTP 400 returned.
- **Why**: `route.ts` performs manual checks on `productId`, `variant`, and `customerNotes`, but never validates `price` (e.g. `typeof price === "number" && price > 0`). In `src/lib/validations.ts`, Worker 3 wrote `whatsAppOrderApiRequestSchema` which defines `price: z.number().positive().finite().optional()`, but this schema is never imported or used by `route.ts`.
- **Suggestion**: Use `whatsAppOrderApiRequestSchema.safeParse(body)` at the top of `POST /api/order/whatsapp`. If validation fails, immediately return `NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 })`.

---

### [Critical] Finding 2: Unsanitized Variant Script Tag Injection
- **What**: Script tags in the `variant` parameter are neither sanitized nor rejected with HTTP 400, resulting in unescaped script injection in the generated WhatsApp message.
- **Where**: `src/app/api/order/whatsapp/route.ts` lines 40–47 & 136–140; `src/lib/whatsapp.ts` line 83; `src/lib/validations.ts` lines 35–42.
- **Empirical Evidence**:
  - Sending payload `{ productId: "prod_1", variant: "<script>alert(1)</script>" }` to `POST /api/order/whatsapp` returns `HTTP 200 OK` with:
    `redirectUrl: "https://wa.me/905551234567?text=...Variant%3A%20%3Cscript%3Ealert(1)%3C%2Fscript%3E..."`.
- **Why**: Sanitization via `sanitizeCustomerText` was only applied to `customerNotes`. `variant` is neither sanitized nor checked against HTML/script tags.
- **Suggestion**: Apply `sanitizeCustomerText` to `variant` (or add a Zod regex/refinement check rejecting HTML tags `/<[^>]*>/` with HTTP 400) both in `src/lib/validations.ts` and in `generateWhatsAppOrderUrl`.

---

### [Major] Finding 3: `BestsellerGrid` Ignores API Error Responses on Single-Variant Products
- **What**: When single-variant products are ordered from `BestsellerGrid`, any non-200 response from `/api/order/whatsapp` is ignored, and the component immediately falls back to opening WhatsApp directly via client-side generation.
- **Where**: `src/components/storefront/bestseller-grid.tsx`, lines 80–109.
- **Why**: In `VariantModal`, `errData.error` is checked and displayed to the user via `setErrorMessage`. In `BestsellerGrid`, the code only checks `if (res.ok) { ... return; }` and falls through to `window.open(url)` even when the server returned HTTP 400 (e.g. variant out of stock) or HTTP 404.
- **Suggestion**: In `bestseller-grid.tsx`, if `res.ok` is false, inspect the error response and abort without opening WhatsApp, matching `VariantModal`'s defensive posture. Client-side fallback should only occur on catastrophic network fetch exceptions.

---

### [Major / Integrity Finding] Finding 4: Self-Certifying Test Suites Masking Implementation Gaps
- **What**: `tests/tier1-feature/f11-whatsapp-validation.ts` lines 5–28 and `tests/tier2-boundary/boundary-corner-cases.ts` lines 17–28 use locally defined functions rather than testing actual application code.
- **Where**: `tests/tier1-feature/f11-whatsapp-validation.ts` (lines 5–28); `tests/verification_m3.ts` (lines 182–240).
- **Why**: The test harness achieves 100% pass rates by testing internal mock closures rather than testing `src/app/api/order/whatsapp/route.ts` and `src/lib/validations.ts`. Furthermore, `tests/verification_m3.ts` only asserted missing `productId` and oversized `customerNotes`, failing to verify negative prices or script tags against the actual route.
- **Suggestion**: Update test suites to import `whatsAppOrderApiRequestSchema` and `orderWhatsappHandler` directly, verifying true end-to-end API behavior.

---

## Verified Claims

| Claim from Worker Handoff | Independent Verification Method | Result | Notes |
|---|---|---|---|
| `npx tsc --noEmit` exits 0 | Executed `npx tsc --noEmit` | **PASS** | Clean compile, zero errors |
| `npm run lint` exits 0 | Executed `npm run lint` | **PASS** | Zero ESLint warnings or errors |
| `npm run build` exits 0 | Executed `npm run build` | **PASS** | Dynamic `/api/order/whatsapp` compiled |
| `npm test` passes 130/130 | Executed `npm test` | **PASS** | 130 tests pass (note Finding 4 regarding mocks) |
| Double arrow bug fixed in `MagneticCTA` | Inspected `src/components/ui/magnetic-cta.tsx` line 63 | **PASS** | `text.replace(/→/g, '').trim()` prevents `BUY NOW → →` |
| Hero title casing fixed in `hero-section.tsx` | Inspected `hero-section.tsx` line 209 | **PASS** | Removed `uppercase`, restores lowercase grotesque `cyrux` |
| Route returns 400 on empty `productId` | Invoked `POST /api/order/whatsapp` with `{ productId: "" }` | **PASS** | Returns HTTP 400 with descriptive error |
| Route returns 400 on negative price | Invoked `POST /api/order/whatsapp` with `{ productId: "prod_1", price: -50 }` | **FAIL** | Returns HTTP 200 (Finding 1) |
| Route returns 400 on script tags | Invoked `POST /api/order/whatsapp` with script tags in `variant` | **FAIL** | Returns HTTP 200 with unsanitized tags (Finding 2) |

---

## Adversarial Challenge & Stress Test Results

### 1. Adversarial Probe Matrix on `POST /api/order/whatsapp`

| # | Test Scenario / Payload | Expected Status | Actual Status | Actual Behavior / Body | Evaluation |
|---|---|---|---|---|---|
| P1 | `{ productId: "" }` | 400 | **400** | `{ error: "productId is required and cannot be empty" }` | PASS |
| P2 | `{ productId: "   " }` | 400 | **400** | `{ error: "productId is required and cannot be empty" }` | PASS |
| P3 | Missing `productId` (`{ variant: "M" }`) | 400 | **400** | `{ error: "productId is required and cannot be empty" }` | PASS |
| P4 | `{ productId: "prod_1", price: -50 }` | 400 | **200** | Returns 200 OK; DB price used, negative price ignored | **CRITICAL FAIL** |
| P5 | `{ productId: "unknown", price: -50 }` | 400 | **404** | Returns 404 Product not found | **FAIL** |
| P6 | `{ productId: "prod_1", price: "free" }` | 400 | **200** | Returns 200 OK; string price ignored | **FAIL** |
| P7 | `{ productId: "prod_1", variant: "<script>alert(1)</script>" }` | 400 or Sanitized | **200** | Returns 200 OK; `<script>` inserted into wa.me URL | **CRITICAL FAIL** |
| P8 | `{ productId: "<script>alert(1)</script>" }` | 400 | **404** | Searches DB for script string, returns 404 | MINOR |
| P9 | `{ productId: "prod_1", customerNotes: "<script>alert(1)</script>" }` | Sanitized / 400 | **200** | Strips tag, outputs `Notes: alert(1)` | ACCEPTABLE |
| P10| `{ productId: "prod_1", variant: "V".repeat(51) }` | 400 | **400** | `{ error: "variant must be a string up to 50 characters" }` | PASS |
| P11| `{ productId: "prod_1", customerNotes: "N".repeat(501) }` | 400 | **400** | `{ error: "customerNotes cannot exceed 500 characters" }` | PASS |
| P12| Non-JSON body (`"invalid"`) | 400 | **400** | `{ error: "Payload must be an object" }` | PASS |

---

## Actionable Remediation Guidance

To bring Milestone 3 to full approval:

1. **In `src/lib/validations.ts`**:
   - Ensure `variant` in `whatsAppOrderApiRequestSchema` and `whatsAppOrderInputSchema` is sanitized or validated against HTML tags:
     ```ts
     variant: z
       .string({ invalid_type_error: "variant must be a string up to 50 characters" })
       .max(50, "variant must be a string up to 50 characters")
       .trim()
       .transform((val) => (val === "" ? undefined : sanitizeCustomerText(val)))
       .optional(),
     ```
   - Ensure `price` is validated as positive number:
     ```ts
     price: z
       .number({ invalid_type_error: "Price must be a positive number" })
       .positive("Price must be a positive number")
       .finite("Price must be a finite number")
       .optional(),
     ```

2. **In `src/app/api/order/whatsapp/route.ts`**:
   - Import and invoke `whatsAppOrderApiRequestSchema.safeParse(body)` at the start of the handler:
     ```ts
     const validation = whatsAppOrderApiRequestSchema.safeParse(body);
     if (!validation.success) {
       return NextResponse.json(
         { success: false, error: validation.error.issues[0]?.message || "Invalid payload" },
         { status: 400 }
       );
     }
     const { productId, productName, variant, price, currency, customerNotes } = validation.data;
     ```

3. **In `src/lib/whatsapp.ts`**:
   - Sanitize `order.variant` inside `generateWhatsAppOrderUrl`:
     ```ts
     const cleanVariant = order.variant ? sanitizeCustomerText(order.variant) : undefined;
     ```

4. **In `src/components/storefront/bestseller-grid.tsx`**:
   - If `/api/order/whatsapp` returns `res.ok === false`, do NOT trigger `window.open(url)`. Handle the error gracefully.

5. **In `tests/verification_m3.ts`**:
   - Add explicit test assertions verifying that negative prices and script tags in `variant` return HTTP 400 or sanitized results.
