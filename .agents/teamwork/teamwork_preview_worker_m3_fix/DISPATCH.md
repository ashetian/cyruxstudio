## 2026-11-14T14:26:48Z
You are Worker 3 (Remediation) for Milestone 3 (WhatsApp Ordering Flow).
Your identity: teamwork_preview_worker
Your working directory: /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_worker_m3_fix
Project root: /home/ashetian/Desktop/cyruxstudio

MANDATORY FIRST STEP: Read:
1. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/ORIGINAL_REQUEST.md
2. /home/ashetian/Desktop/cyruxstudio/PROJECT.md
3. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_reviewer_m3_2/handoff.md
4. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m3_fix_1/remediation_spec.md
5. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m3_fix_2/remediation_spec.md
6. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m3_fix_3/remediation_spec.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

SECURITY CONSTRAINT:
NEVER open, read, print, cat, or echo .env.local! Never search for secrets or hardcode API keys.

FILE OWNERSHIP:
You exclusively own:
- `src/app/api/order/whatsapp/route.ts`
- `src/lib/validations.ts`
- `src/lib/whatsapp.ts`
- `src/components/storefront/bestseller-grid.tsx`
- `tests/tier1-feature/f11-whatsapp-validation.ts`

TASKS:
1. Update `src/lib/validations.ts`:
   - Enhance `sanitizeCustomerText` to strip tags (`/<[^>]*>/g`) and dangling angle brackets (`/[<>]/g`).
   - Add sanitization to `variant` in `whatsAppOrderInputSchema` and `whatsAppOrderApiRequestSchema`.
   - Ensure `price` must be a positive number (> 0).
   - Export schemas and `validateOrderPayload`.
2. Update `src/app/api/order/whatsapp/route.ts`:
   - Use `whatsAppOrderApiRequestSchema` to validate the incoming JSON body.
   - If validation fails (e.g. `price <= 0`, missing `productId`, invalid types), return HTTP 400 with `{ success: false, error: ... }`.
   - If product is not found in database, return HTTP 404 with `{ success: false, error: ... }`.
   - Sanitize `variant` and ensure zero raw script tags reach `generateWhatsAppOrderUrl`.
3. Update `src/lib/whatsapp.ts`:
   - Ensure `generateWhatsAppOrderUrl` sanitizes `variant` so that `<script>` tags are never present in the generated URL text parameter.
4. Update `src/components/storefront/bestseller-grid.tsx`:
   - On single-variant direct order, if `/api/order/whatsapp` returns a non-200 response (or `!data.success`), halt immediately, do NOT open the WhatsApp URL, and display an accessible brutalist error alert/toast banner.
5. Update `tests/tier1-feature/f11-whatsapp-validation.ts`:
   - Import and test the actual production validator and schemas from `src/lib/validations.ts`.
6. VERIFY:
   - Run reproduction verification:
     - `POST /api/order/whatsapp` with `{ productId: "prod_1", price: -50 }` returns status 400!
     - `POST /api/order/whatsapp` with `{ productId: "prod_1", variant: "<script>alert(1)</script>" }` returns sanitized URL without raw `<script>`!
   - `npx prisma generate` -> code 0
   - `npx tsc --noEmit` -> code 0
   - `npm run lint` -> code 0
   - `npm run build` -> code 0
   - `npm test` -> 130/130 tests pass!

OUTPUT:
Write your implementation report to:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_worker_m3_fix/implementation_report.md
And write:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_worker_m3_fix/handoff.md

When finished, call send_message to report completion to parent orchestrator.
