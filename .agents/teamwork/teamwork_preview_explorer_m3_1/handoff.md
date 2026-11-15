# Handoff Report: WhatsApp Order Payload Zod Validation & Sanitization (Milestone 3)

**Author:** Teamwork Explorer 1 (`teamwork_preview_explorer`)  
**Directory:** `/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m3_1`  
**Date:** 2026-11-14T13:56:30Z  
**Target Milestone:** M3 (WhatsApp Ordering Flow)  

---

## 1. Observation

1. **`tests/tier1-feature/f11-whatsapp-validation.ts` (lines 4-82):**
   - The test defines `validateOrderPayload(input: any)` requiring:
     - `!input || typeof input !== 'object'` throws `'Payload must be an object'`.
     - `!input.productId || typeof input.productId !== 'string' || input.productId.trim() === ''` throws `'productId is required and cannot be empty'`.
     - `input.variant !== undefined && (typeof input.variant !== 'string' || input.variant.length > 50)` throws `'variant must be a string up to 50 characters'`.
     - `input.customerNotes !== undefined && typeof input.customerNotes !== 'string'` throws `'customerNotes must be a string'`.
     - `input.customerNotes !== undefined && input.customerNotes.length > 500` throws `'customerNotes cannot exceed 500 characters'`.
   - Test cases explicitly assert:
     - 11.1: clean order `{ productId: 'prod-hoodie-01', variant: 'Size L / Deep Black', customerNotes: 'Please deliver after 5 PM.' }` passes.
     - 11.2: malicious XSS `'Hello <script>alert("xss")</script> world'` sanitizes to `'Hello alert(xss) world'`.
     - 11.3: HTML tags `'Gift for friend <img src="x" onerror="steal()"/> notes'` strips `<img` and `onerror`.
     - 11.4: `{ productId: '' }`, `{ productId: '   ' }`, and `{}` throw error containing `'productId is required'`.
     - 11.5: notes with 501 characters throw `'customerNotes cannot exceed 500 characters'`.

2. **`tests/contracts.ts` (lines 63-97) and `src/lib/whatsapp.ts` (lines 6-50):**
   - Direct implementation of `sanitizeCustomerText(input: string)`:
     ```ts
     return input
       .replace(/<[^>]*>/g, '') // Strip HTML tags
       .replace(/['";\\]/g, '') // Strip SQL/script injection characters
       .trim();
     ```
   - WhatsApp URL generator format:
     `https://wa.me/<cleanPhone>?text=<encoded_order>`
     Where order lines are:
     `*NEW ORDER - CYRUX STUDIO*`, `Product: <name>`, `Variant: <variant>`, `Price: <price> <currency>`, `Notes: <notes>`, `Ref ID: <id>`.

3. **`tests/tier2-boundary/boundary-corner-cases.ts` (lines 16-99):**
   - `T2.1`: Product price validation rejects `<= 0` and `NaN` with `'Price must be a positive number'`; accepts `0.01`.
   - `T2.5`: Multilingual and unicode characters (Turkish `ğüşıöç`, Japanese `東京`, emojis `🖤`, `🧥`, `🚀`) must not be stripped or corrupted.
   - `T2.6`: Truncates or rejects strings over 500 characters for notes.

4. **`package.json` (line 38):**
   - `"zod": "^3.24.2"` is already installed and available.

5. **`tests/runner.ts` execution output:**
   - Ran `npx tsx tests/runner.ts --filter "whatsapp"`: 15/15 tests passed cleanly across Tier 1 (13), Tier 3 (1), and Tier 4 (1).

---

## 2. Logic Chain

1. **Requirement Mapping:**
   - From Observation 1, the validation contracts expect strict field-level constraints on `productId`, `variant`, and `customerNotes`.
   - From Observation 2, `sanitizeCustomerText` removes HTML tags and injection delimiters, which directly turns `<script>alert("xss")</script>` into `alert(xss)`.
   - From Observation 3, `productName` and `price` validation are required for full orders, enforcing `price > 0` and preserving UTF-8/emojis.
2. **Schema Separation:**
   - An API request to `POST /api/order/whatsapp` receives `{ productId, variant?, customerNotes? }` from the storefront.
   - The backend service retrieves canonical `productName` and `price` from the database to prevent client manipulation.
   - Therefore, two complementary Zod schemas are required in `src/lib/validations.ts`:
     1. `whatsAppOrderApiRequestSchema`: for the incoming POST API request.
     2. `whatsAppOrderInputSchema`: for the complete order payload model.
3. **Zod Transform Pipeline:**
   - For `customerNotes`: applying `.max(500, 'customerNotes cannot exceed 500 characters')` BEFORE the `.transform(sanitizeCustomerText)` ensures length limits are evaluated on raw input, exactly matching the contract in `f11-whatsapp-validation.ts`.
   - For `variant`: applying `.trim()` and transforming empty strings `""` to `undefined` matches the behavior in `f11-whatsapp-validation.ts`.
   - For `productId`: using `.trim().min(1, 'productId is required and cannot be empty')` ensures missing, empty, or whitespace-only inputs trigger the expected error message.

---

## 3. Caveats

1. **Client vs Server Price Authorization:**
   The frontend `VariantModal` currently reads `product.price` locally. While validating `price > 0` on client-constructed models is good, server-side route `/api/order/whatsapp` should always fetch price directly from Prisma `Product` model to prevent client manipulation.
2. **Database Connectivity:**
   In environments where `DATABASE_URL` is absent, the application relies on the in-memory fallback in `src/lib/db.ts` and `src/lib/seed-data.ts`. The validation schema itself is pure and independent of database status.

---

## 4. Conclusion

1. The exact validation and sanitization contracts have been specified in:
   `/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m3_1/m3_validation_spec.md`
2. The implementation should create `src/lib/validations.ts` exporting:
   - `sanitizeCustomerText(input: string): string`
   - `whatsAppOrderApiRequestSchema`
   - `whatsAppOrderInputSchema`
   - `validateOrderPayload(input: unknown)`
   - TypeScript types `WhatsAppOrderApiRequest` and `WhatsAppOrderInput`.
3. The downstream builder agent can immediately implement `src/lib/validations.ts` and `src/app/api/order/whatsapp/route.ts` based on this specification without ambiguity.

---

## 5. Verification Method

To independently verify the contracts and specifications:

1. **Run the WhatsApp test suite:**
   ```bash
   npx tsx tests/runner.ts --filter "whatsapp"
   ```
   *Expected result:* 15/15 tests pass.

2. **Verify Zod schema execution against test cases:**
   Run an ephemeral node check:
   ```bash
   npx tsx -e "
   import { z } from 'zod';
   const schema = z.object({
     productId: z.string().trim().min(1, 'productId is required and cannot be empty'),
     variant: z.string().max(50).trim().optional(),
     customerNotes: z.string().max(500, 'customerNotes cannot exceed 500 characters').optional()
   });
   console.log('Valid:', schema.safeParse({ productId: 'p1', variant: 'M' }).success);
   console.log('Rejects empty:', !schema.safeParse({ productId: '   ' }).success);
   "
   ```
   *Expected output:* `Valid: true`, `Rejects empty: true`.

3. **Invalidation Conditions:**
   - Any modification to `tests/tier1-feature/f11-whatsapp-validation.ts` changing error message substrings (e.g. `'productId is required'`).
   - Upgrading Zod to a major version with breaking `.transform` or `.trim` behaviors.
