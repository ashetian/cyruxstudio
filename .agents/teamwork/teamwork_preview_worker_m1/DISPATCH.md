## 2026-11-14T13:03:49Z
You are Worker 1 for Milestone 1 (M1: Core Skeleton & Database).
Your identity: teamwork_preview_worker
Your working directory: /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_worker_m1
Project root: /home/ashetian/Desktop/cyruxstudio

MANDATORY FIRST STEP: Read:
1. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/ORIGINAL_REQUEST.md
2. /home/ashetian/Desktop/cyruxstudio/PROJECT.md
3. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m1_1/m1_scaffold_spec.md
4. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m1_2/m1_database_spec.md
5. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m1_3/m1_seed_assets_spec.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

SECURITY CONSTRAINT:
NEVER open, read, print, cat, or echo .env.local! Never search for secrets or hardcode API keys.

FILE OWNERSHIP:
You exclusively own:
- `package.json`, `package-lock.json`
- `tsconfig.json`
- `tailwind.config.ts`, `postcss.config.mjs`
- `next.config.ts`, `eslint.config.mjs`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `scripts/prepare-assets.sh`
- `src/lib/db.ts`
- `src/lib/seed-data.ts`
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- `public/assets/**`

TASKS:
1. Initialize `package.json` with all dependencies and scripts specified by Explorer 1. Run `npm install`.
2. Configure `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.ts`, `eslint.config.mjs`.
3. Set up `prisma/schema.prisma` with `Product`, `StoreSettings`, `ElevenLabsAsset`, `CreditUsageLog` as specified by Explorer 2.
4. Run `npx prisma generate`.
5. Execute the asset conversion pipeline from Explorer 3:
   - Convert `assets/IMG_0130.tiff` to WebP (`public/assets/products/pretty-chaos-detail.webp`) and copy PNGs.
   - Transcode `assets/IMG_0679.MOV` to H.264 MP4 (`public/assets/video/cyrux-campaign-1080.mp4`) with `-movflags +faststart`.
   - Process brand emblems and favicons from `assets/IMG_0795.PNG` into `public/assets/brand/`.
6. Implement `src/lib/seed-data.ts` with the 5 apparel products and StoreSettings.
7. Implement `src/lib/db.ts` with resilient proxy fallback and singleton caching.
8. Implement `prisma/seed.ts` and run database push & seed: `npx prisma db push` and `npx prisma db seed` (ensure resilient fallback works seamlessly).
9. Create initial `src/app/globals.css`, `src/app/layout.tsx`, and `src/app/page.tsx`.
10. VERIFY:
    Run and document:
    - `npx prisma generate`
    - `npx tsc --noEmit`
    - `npm run lint`
    - `npm run build`
    All MUST exit with code 0!

OUTPUT:
Write your implementation report to:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_worker_m1/implementation_report.md
And write:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_worker_m1/handoff.md

When finished, call send_message to notify parent orchestrator.
