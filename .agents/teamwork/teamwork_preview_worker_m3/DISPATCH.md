## 2026-11-14T13:58:48Z
You are Worker 3 for Milestone 3 (M3: WhatsApp Ordering Flow).
Your identity: teamwork_preview_worker
Your working directory: /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_worker_m3
Project root: /home/ashetian/Desktop/cyruxstudio

MANDATORY FIRST STEP: Read:
1. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/ORIGINAL_REQUEST.md
2. /home/ashetian/Desktop/cyruxstudio/PROJECT.md
3. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m3_1/m3_validation_spec.md
4. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m3_2/m3_url_generator_spec.md
5. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m3_3/m3_ui_integration_spec.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

SECURITY CONSTRAINT:
NEVER open, read, print, cat, or echo .env.local! Never search for secrets or hardcode API keys.

FILE OWNERSHIP:
You exclusively own:
- `src/lib/validations.ts`
- `src/lib/whatsapp.ts`
- `src/app/api/order/whatsapp/route.ts`
- `src/components/storefront/variant-modal.tsx`
- `src/components/storefront/bestseller-grid.tsx`
- `src/components/ui/magnetic-cta.tsx`
- `src/components/storefront/hero-section.tsx`

TASKS:
1. Implement/update `src/lib/validations.ts`:
   - Zod schemas `whatsAppOrderInputSchema`, `whatsAppOrderApiRequestSchema`.
   - Sanitization against `<[^>]*>` and XSS vectors on `customerNotes` (<= 500 chars).
   - Strict validation of `productId`, `productName`, `variant`, `price > 0`.
   - Helper function `validateOrderPayload`.
2. Implement/update `src/lib/whatsapp.ts`:
   - Normalizing phone numbers to clean international E.164 digits without `+`, spaces, dashes.
   - Dynamic `StoreSettings` lookup via `prisma.storeSettings.findFirst()` with resilient fallback to `INITIAL_STORE_SETTINGS`.
   - Formatting order text with product, variant, price, currency, timestamp, notes, and ref ID.
   - Generating encoded `https://wa.me/<number>?text=<encoded_order>`.
3. Implement `src/app/api/order/whatsapp/route.ts`:
   - POST handler validating payload with Zod.
   - Fetching product from DB to verify stock and price.
   - Fetching dynamic StoreSettings from DB for WhatsApp number and currency.
   - Returning JSON `{ success: true, redirectUrl: "https://wa.me/..." }` or 400 Bad Request with details.
4. Update `src/components/storefront/variant-modal.tsx` & `src/components/storefront/bestseller-grid.tsx`:
   - Connect "BUY NOW →" to variant modal and direct WhatsApp order flow.
   - When order is submitted, redirect user to the generated WhatsApp URL.
5. Polish fixes:
   - `src/components/ui/magnetic-cta.tsx`: strip trailing arrows (`text.replace(/→/g, '').trim()`) to fix double arrows.
   - `src/components/storefront/hero-section.tsx`: remove `uppercase` on the "cyrux" title so it renders as lowercase display typography.
6. VERIFY:
   - `npx prisma generate` -> code 0
   - `npx tsc --noEmit` -> code 0
   - `npm run lint` -> code 0
   - `npm run build` -> code 0
   - `npm test` -> all 130 tests pass!

OUTPUT:
Write your implementation report to:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_worker_m3/implementation_report.md
And write:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_worker_m3/handoff.md

When finished, call send_message to report completion to parent orchestrator.
