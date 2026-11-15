## 2026-11-14T12:46:45Z
You are Explorer 3 (Architecture & Requirements Explorer).
Your identity: teamwork_preview_explorer
Your working directory: /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_survey_3
Project root: /home/ashetian/Desktop/cyruxstudio

MANDATORY FIRST STEP: Read /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/ORIGINAL_REQUEST.md.

SECURITY CONSTRAINT:
NEVER open, read, print, cat, or echo .env.local! Never search for secrets or hardcode API keys.

TASK:
Map out architecture, data models, and API contracts for requirements R1-R5 and acceptance criteria:
1. R1: Database schema details:
   - Product (id, name, slug, description, price, stock, variants, mediaUrls, isBestseller, createdAt, updatedAt)
   - StoreSettings (id, whatsappNumber, currency, brandMetadata, updatedAt)
   - ElevenLabsAsset (id, promptHash, mediaUrl, mediaType, creditsUsed, status, metadata, createdAt)
   - CreditUsageLog (id, action, creditsUsed, balanceBefore, balanceAfter, timestamp)
   Recommend ORM (Prisma or Drizzle) best suited for Next.js App Router + Neon/Postgres.
2. R2: Brutalist Storefront UI architecture (components, state, animation hooks, Lenis provider, custom cursor).
3. R3: WhatsApp ordering flow:
   - Zod validation schema for order request (productName, variant, price, etc.)
   - Dynamic store settings retrieval
   - wa.me URL encoding: https://wa.me/<number>?text=<encoded_order>
4. R4: Minimal Admin Panel & Vercel Blob:
   - JWT authentication via `jose` with HttpOnly cookies & Next.js middleware.
   - Admin credentials verification against environment variables (ADMIN_EMAIL, ADMIN_PASSWORD_HASH or ADMIN_PASSWORD).
   - CRUD API routes for products and settings under /api/admin/*.
   - Vercel Blob integration for authenticated upload and delete endpoints (/api/admin/blob/upload, /api/admin/blob/delete).
5. R5: ElevenLabs image/video generation:
   - Using @elevenlabs/elevenlabs-js reading ELEVENLABS_API_KEY from process.env (never hardcoded!).
   - Strict 23,000 credit protection guard (tracking total cumulative credits used).
   - Rate limiting, manual admin-only trigger with confirmation.
   - Asset caching in DB + Vercel Blob to prevent redundant credit usage.
   - Compatibility with `npx -y @elevenlabs/cli@latest onboard check --answered --env-path .env.local`.
6. Testing architecture (opaque-box E2E test runner, Tiers 1-4).

OUTPUT:
Write your full findings to:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_survey_3/survey_architecture.md
And write:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_survey_3/handoff.md

When finished, call send_message to report completion to parent orchestrator.
