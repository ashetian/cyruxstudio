## 2026-11-14T14:46:58Z

You are Explorer 2 for Milestone 4 (M4: Secure Minimal Admin Panel & Vercel Blob).
Your identity: teamwork_preview_explorer
Your working directory: /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m4_2
Project root: /home/ashetian/Desktop/cyruxstudio

MANDATORY FIRST STEP: Read:
1. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/ORIGINAL_REQUEST.md
2. /home/ashetian/Desktop/cyruxstudio/PROJECT.md
3. /home/ashetian/Desktop/cyruxstudio/tests/tier1-feature/f14-admin-product-crud.ts
4. /home/ashetian/Desktop/cyruxstudio/tests/tier1-feature/f15-admin-settings.ts
5. /home/ashetian/Desktop/cyruxstudio/prisma/schema.prisma

SECURITY CONSTRAINT:
NEVER open, read, print, cat, or echo .env.local! Never search for secrets or hardcode API keys.

TASK:
Investigate and specify the Admin CRUD API routes:
1. Analyze `tests/tier1-feature/f14-admin-product-crud.ts` and `f15-admin-settings.ts`.
2. Specify `/api/admin/products/route.ts`:
   - GET: list all products from database (`prisma.product.findMany`) with optional category or stock filters.
   - POST: create product with Zod validation (`title`, `slug`, `price`, `description`, `images`, `category`, `stock`, `variants`, `badge`, `metadata`), returns created product with HTTP 201.
3. Specify `/api/admin/products/[id]/route.ts`:
   - GET: fetch product by ID or slug. Returns 404 if not found.
   - PUT/PATCH: update product fields with Zod validation. Returns updated product.
   - DELETE: delete product by ID. Returns `{ success: true, deletedId }`.
4. Specify `/api/admin/settings/route.ts`:
   - GET: return current store settings (`storeName`, `whatsappNumber`, `currency`, `brandBio`, `socialLinks`).
   - PUT/POST: update store settings with Zod validation (ensure WhatsApp number is formatted/validated, currency is 3-letter code). Updates database and returns updated settings.
5. Detail resilient database fallback integration (`src/lib/db.ts`) so operations work both with live Neon Postgres and the in-memory Prisma client proxy.

OUTPUT:
Write your specification report to:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m4_2/m4_crud_apis_spec.md
And write:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m4_2/handoff.md
When done, call send_message to report to parent orchestrator.
