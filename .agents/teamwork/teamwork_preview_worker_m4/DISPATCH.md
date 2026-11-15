## 2026-11-14T14:53:24Z
[Message] timestamp=2026-11-14T14:53:24Z sender=6d2c4eb5-38de-4b31-91e2-cf749d8c0ff8 priority=MESSAGE_PRIORITY_HIGH content=You are Worker 4 for Milestone 4 (M4: Secure Minimal Admin Panel & Vercel Blob).
Your identity: teamwork_preview_worker
Your working directory: /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_worker_m4
Project root: /home/ashetian/Desktop/cyruxstudio

MANDATORY FIRST STEP: Read:
1. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/ORIGINAL_REQUEST.md
2. /home/ashetian/Desktop/cyruxstudio/PROJECT.md
3. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m4_1/m4_auth_middleware_spec.md
4. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m4_2/m4_crud_apis_spec.md
5. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m4_3/m4_blob_admin_ui_spec.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

SECURITY CONSTRAINT:
NEVER open, read, print, cat, or echo .env.local! Never search for secrets or hardcode API keys. Always access credentials through `process.env`.

FILE OWNERSHIP:
You exclusively own:
- `src/lib/auth.ts`
- `src/lib/validations.ts`
- `src/lib/blob.ts`
- `src/lib/db.ts`
- `src/middleware.ts`
- `src/app/api/admin/login/route.ts`
- `src/app/api/admin/auth/login/route.ts`
- `src/app/api/admin/logout/route.ts`
- `src/app/api/admin/auth/logout/route.ts`
- `src/app/api/admin/products/route.ts`
- `src/app/api/admin/products/[id]/route.ts`
- `src/app/api/admin/settings/route.ts`
- `src/app/api/admin/blob/upload/route.ts`
- `src/app/api/admin/blob/delete/route.ts`
- `src/app/api/admin/blob/route.ts`
- `src/app/admin/layout.tsx`
- `src/app/admin/login/page.tsx`
- `src/app/admin/page.tsx`
- `src/components/admin/admin-header.tsx`
- `src/components/admin/product-catalog-table.tsx`
- `src/components/admin/new-product-modal.tsx`
- `src/components/admin/store-settings-form.tsx`
- `src/components/admin/media-assets-grid.tsx`
- `src/components/admin/blob-uploader.tsx`

TASKS:
1. Implement `src/lib/auth.ts`:
   - `jose` JWT creation (`SignJWT`) and verification (`jwtVerify`) using HS256.
   - Constant-time credential checking (`constantTimeCompare`) with `crypto.timingSafeEqual` comparing `process.env.ADMIN_EMAIL` and `process.env.ADMIN_PASSWORD` (with safe fallbacks: `admin@cyrux.studio`, `AdminSecret2026!`, and JWT secret key).
   - Cookie options: name `cyrux_admin_session`, `httpOnly: true`, `secure`, `sameSite: "lax"`, 24h duration.
2. Update `src/lib/validations.ts`:
   - Add `adminLoginSchema` (email, password).
   - Add `adminProductCreateSchema` and `adminProductUpdateSchema` (enforcing positive price, URL-safe lowercase slug `/^[a-z0-9-]+$/` with verbatim error `"Slug must be URL-safe lowercase with hyphens"`, `"Price must be positive"` / `"Price must be greater than zero"`).
   - Add `adminSettingsUpdateSchema` (validating E.164 phone with `"whatsappNumber must be a valid E.164 formatted number starting with +"` and currency in `['USD', 'EUR', 'TRY', 'GBP']` with `"currency must be one of: USD, EUR, TRY, GBP"`).
   - Add `blobDeleteSchema`.
3. Implement `src/lib/blob.ts`:
   - MIME validation against allowed types (`image/jpeg`, `image/png`, `image/webp`, `image/avif`, `video/mp4`, `video/quicktime`).
   - Size limit enforcement (<= 15MB images, <= 50MB videos).
   - Domain check on delete: requires HTTPS and hostname ending with `.blob.vercel-storage.com` (rejects spoofed domains and path traversal).
   - Offline fallback when `BLOB_READ_WRITE_TOKEN` is unset.
4. Update `src/lib/db.ts`:
   - Enhance `mockHandlers.product.findMany` to support `stock` filter, `OR: [{ id }, { slug }]`, and sorting.
5. Implement `src/middleware.ts`:
   - Next.js Edge Middleware route guards on `/admin/:path*` and `/api/admin/:path*`.
   - Excludes `/admin/login`, `/api/admin/login`, `/api/admin/auth/login`.
   - Returns HTTP 401 `{ success: false, error: "Unauthorized" }` for unauthenticated `/api/admin/*`.
   - Redirects to `/admin/login` for unauthenticated `/admin/*`.
6. Implement Admin API routes:
   - Login & logout: `/api/admin/login/route.ts`, `/api/admin/auth/login/route.ts`, `/api/admin/logout/route.ts`, `/api/admin/auth/logout/route.ts`.
   - Product CRUD: `/api/admin/products/route.ts` (GET list, POST create HTTP 201), `/api/admin/products/[id]/route.ts` (GET by id/slug, PUT update, DELETE delete).
   - Settings: `/api/admin/settings/route.ts` (GET, PUT/POST).
   - Blob: `/api/admin/blob/upload/route.ts`, `/api/admin/blob/delete/route.ts`, `/api/admin/blob/route.ts`.
7. Implement Brutalist Admin UI:
   - `src/app/admin/layout.tsx`: Root admin layout with brutalist styles.
   - `src/app/admin/login/page.tsx`: Dark canvas `#0A0A0A`, monospace typography, credentials form, error banner, redirects to `/admin` upon login.
   - `src/app/admin/page.tsx`: Brutalist Admin Dashboard with Products, Store Settings, and Media Assets tabs.
   - Helper components in `src/components/admin/`.
8. VERIFY:
   - `npx prisma generate` -> code 0
   - `npx tsc --noEmit` -> code 0
   - `npm run lint` -> code 0
   - `npm run build` -> code 0
   - `npm test` -> all 130 tests pass!
