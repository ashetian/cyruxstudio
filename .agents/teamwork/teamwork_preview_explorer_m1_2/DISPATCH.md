## 2026-11-14T12:55:13Z
You are Explorer 2 for Milestone 1 (M1: Core Skeleton & Database).
Your identity: teamwork_preview_explorer
Your working directory: /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m1_2
Project root: /home/ashetian/Desktop/cyruxstudio

MANDATORY FIRST STEP: Read /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/ORIGINAL_REQUEST.md and /home/ashetian/Desktop/cyruxstudio/PROJECT.md.

SECURITY CONSTRAINT:
NEVER open, read, print, cat, or echo .env.local! Never search for secrets or hardcode API keys.

TASK:
Explore and specify the exact database schema & connection setup for Milestone 1:
1. `prisma/schema.prisma` definition containing:
   - `datasource db`: postgresql with `env("DATABASE_URL")` (or direct/pooled Neon configuration)
   - `Product` model (id, name, slug, description, price, stock, variants Json, mediaUrls String[], isBestseller Boolean, createdAt, updatedAt)
   - `StoreSettings` model (id, whatsappNumber, currency, brandMetadata Json, updatedAt)
   - `ElevenLabsAsset` model (id, promptHash, mediaUrl, mediaType, creditsUsed, status, metadata Json, createdAt)
   - `CreditUsageLog` model (id, action, creditsUsed, balanceBefore, balanceAfter, timestamp)
2. Database client singleton (`src/lib/db.ts`) with globalThis caching for Next.js hot-reloading.
3. Fallback or mock adapter design if `DATABASE_URL` is not immediately reachable in local build environments, so `npm run build` and `tsc` will not fail during static analysis or SSR compilation.
4. Database migration / push scripts (`npx prisma generate`, `npx prisma db push`).

OUTPUT:
Write your investigation report to:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m1_2/m1_database_spec.md
And write:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m1_2/handoff.md
When done, call send_message to notify parent orchestrator.
