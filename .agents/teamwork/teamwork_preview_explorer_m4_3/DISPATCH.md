## 2026-11-14T14:46:59Z
You are Explorer 3 for Milestone 4 (M4: Secure Minimal Admin Panel & Vercel Blob).
Your identity: teamwork_preview_explorer
Your working directory: /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m4_3
Project root: /home/ashetian/Desktop/cyruxstudio

MANDATORY FIRST STEP: Read:
1. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/ORIGINAL_REQUEST.md
2. /home/ashetian/Desktop/cyruxstudio/PROJECT.md
3. /home/ashetian/Desktop/cyruxstudio/tests/tier1-feature/f16-blob-upload.ts

SECURITY CONSTRAINT:
NEVER open, read, print, cat, or echo .env.local! Never search for secrets or hardcode API keys.

TASK:
Investigate and specify Vercel Blob integration and the brutalist Admin UI:
1. Analyze `tests/tier1-feature/f16-blob-upload.ts`:
   - MIME type whitelisting (`image/webp`, `image/jpeg`, `image/png`, `video/mp4`, `image/*`, `video/*`).
   - File size limits (<= 15MB for images, <= 50MB for video). Reject oversized files with HTTP 413 or 400.
   - Endpoints:
     - `POST /api/admin/blob/upload`: handles multipart form-data or direct buffer upload using `@vercel/blob` `put()` (with mock/fallback if `BLOB_READ_WRITE_TOKEN` is not configured during offline builds).
     - `DELETE /api/admin/blob/delete`: deletes blob by URL using `del()`.
2. Specify Admin UI pages:
   - `src/app/admin/login/page.tsx`: Brutalist high-contrast login screen with dark canvas `#0A0A0A`, monospace typography, email & password inputs, loading states, and error banner.
   - `src/app/admin/page.tsx`: Brutalist Admin Dashboard:
     - Header with store badge, active admin email, and Logout button.
     - Tabs or sections:
       - Products: catalog table, quick stock toggle, "New Product" modal with image upload and variant management.
       - Store Settings: WhatsApp phone number editor, currency selector, brand bio editor, with instant save.
       - Media Assets: visual grid of uploaded images/videos with Vercel Blob URL copy and delete buttons.
3. Verify test compatibility with `npm test` and build compatibility with Next.js 15 App Router.

OUTPUT:
Write your specification report to:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m4_3/m4_blob_admin_ui_spec.md
And write:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m4_3/handoff.md
When done, call send_message to report to parent orchestrator.
