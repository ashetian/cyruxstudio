## 2026-11-14T14:46:58Z
You are Explorer 1 for Milestone 4 (M4: Secure Minimal Admin Panel & Vercel Blob).
Your identity: teamwork_preview_explorer
Your working directory: /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m4_1
Project root: /home/ashetian/Desktop/cyruxstudio

MANDATORY FIRST STEP: Read:
1. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/ORIGINAL_REQUEST.md
2. /home/ashetian/Desktop/cyruxstudio/PROJECT.md
3. /home/ashetian/Desktop/cyruxstudio/tests/tier1-feature/f13-admin-auth.ts

SECURITY CONSTRAINT:
NEVER open, read, print, cat, or echo .env.local! Never search for secrets or hardcode API keys. Always access credentials via `process.env`.

TASK:
Investigate and specify the authentication system and Next.js Edge Middleware route guards:
1. Review `tests/tier1-feature/f13-admin-auth.ts` to identify all test expectations and contracts.
2. Specify `src/lib/auth.ts`:
   - JWT creation and verification using `jose` (`SignJWT`, `jwtVerify`).
   - Constant-time credential comparison with `crypto.timingSafeEqual` comparing against `process.env.ADMIN_EMAIL` and `process.env.ADMIN_PASSWORD` (with safe buffer length matching).
   - Cookie management: HttpOnly, Secure, SameSite=Lax, cookie name `cyrux_admin_session`.
   - Token payload: `{ email, role: "admin", exp }` (e.g. 24h expiration).
   - Secret key: derived from `process.env.ADMIN_JWT_SECRET` (fallback to a secure default if undefined in test environments).
3. Specify API routes `/api/admin/login` and `/api/admin/logout`:
   - POST `/api/admin/login`: validates email and password with Zod, checks credentials in constant time, sets HttpOnly cookie, returns `{ success: true }` or 401 Unauthorized.
   - POST `/api/admin/logout`: clears `cyrux_admin_session` cookie, returns `{ success: true }`.
4. Specify Edge Middleware `src/middleware.ts`:
   - Matchers for `/admin/:path*` and `/api/admin/:path*`.
   - Exclude `/admin/login` and `/api/admin/login`.
   - For `/api/admin/*`: if session token missing or invalid, return HTTP 401 `{ success: false, error: "Unauthorized" }`.
   - For `/admin/*`: if session token missing or invalid, redirect to `/admin/login`.
5. Ensure compatibility with Edge Runtime and Next.js 15.

OUTPUT:
Write your specification report to:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m4_1/m4_auth_middleware_spec.md
And write:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m4_1/handoff.md
When done, call send_message to report to parent orchestrator.
