# Codebase & Stack Survey Report

**Explorer**: Explorer 1 (`teamwork_preview_explorer`)  
**Date**: 2026-11-14T12:51:30Z  
**Project Root**: `/home/ashetian/Desktop/cyruxstudio`  
**Working Directory**: `/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_survey_1`

---

## 1. Executive Summary

A comprehensive survey of the project root `/home/ashetian/Desktop/cyruxstudio` was performed. The repository is in an **uninitialized, greenfield state**. There is currently **no existing Next.js application, no `package.json`, no `tsconfig.json`, and no ORM schema**. 

However, essential prerequisites are in place:
1. **Valid ElevenLabs Credentials**: `npx -y @elevenlabs/cli@latest onboard check --answered --env-path .env.local` succeeded cleanly with exit code 0, verifying an active API key (last 4 characters: `e062`) and signaling `next: write_code`.
2. **Brand & Product Assets**: 8 media assets are present in `/assets/` (PNG, QuickTime MOV, TIFF).
3. **Reference Layout Design**: `/home/ashetian/.gemini/antigravity/brain/85fc67b5-f014-4e6a-abd0-24bbd1fffa3f/.user_uploaded/media_1794660218146.png` exists and provides full brutalist design guidance.
4. **Runtime Capabilities**: Node.js `v26.10.0`, npm `12.2.0`, and bun `1.4.2` are installed and operational on the host system. Package resolution tests confirm zero dependency conflicts across Next.js, React, Tailwind, TypeScript, GSAP, Framer Motion, Lenis, Jose, Zod, Neon/Drizzle/Prisma, Vercel Blob, and ElevenLabs.

---

## 2. Directory Structure & File Inventory

The project root currently contains 4 items:

```
/home/ashetian/Desktop/cyruxstudio/
├── .agents/                                # Teamwork multi-agent orchestration metadata
│   ├── ORIGINAL_REQUEST.md                 # User brief and R1-R5 specifications
│   ├── sentinel/                           # Sentinel agent tracking
│   ├── teamwork_preview_orchestrator_1/    # Orchestrator plan and progress
│   ├── teamwork_preview_explorer_survey_1/ # This explorer's workspace
│   ├── teamwork_preview_explorer_survey_2/ # Design & Asset explorer workspace
│   └── teamwork_preview_explorer_survey_3/ # Architecture explorer workspace
├── .env.local                              # 71 bytes; local environment variables & secrets (CONFIDENTIAL - DO NOT READ)
├── .gitignore                              # 60 bytes; ignores /.env.local
└── assets/                                 # Brand media assets directory (8 items)
    ├── C5E6C1ED-AFC1-4CA1-8056-3F38A6A9048C.PNG  # 1.87 MB (1254 x 1254, 8-bit RGB PNG)
    ├── IMG_0130.tiff                             # 16.78 MB (TIFF image data, big-endian)
    ├── IMG_0679.MOV                              # 29.29 MB (Apple QuickTime movie / H.264)
    ├── IMG_0795.PNG                              # 184.48 KB (1170 x 2532, 8-bit RGB PNG)
    ├── IMG_9258.png                              # 311.78 KB (844 x 805, 8-bit RGBA PNG)
    ├── IMG_9259.png                              # 340.21 KB (844 x 805, 8-bit RGBA PNG)
    ├── IMG_9523.png                              # 380.48 KB (2048 x 2048, 8-bit RGBA PNG)
    └── IMG_9524.png                              # 432.73 KB (2048 x 2048, 8-bit RGBA PNG)
```

### Key Asset Observations
- **`IMG_0130.tiff`**: TIFF is not natively supported by web browsers. The asset pipeline should convert this to WebP or high-res PNG for public web delivery, or provide a fallback.
- **`IMG_0679.MOV`**: QuickTime movie format. The editorial campaign video block (bottom of the brutalist layout) will either need direct `<video>` support with proper MIME type (`video/quicktime` or transcoding to `video/mp4` / `video/webm`) or hosting via Vercel Blob / public directory.
- **Product Images**: `IMG_9258.png`, `IMG_9259.png`, `IMG_9523.png`, `IMG_9524.png`, and `C5E6C1ED-AFC1-4CA1-8056-3F38A6A9048C.PNG` are high-resolution transparent or solid background product shots suitable for the asymmetric bestseller grid.
- **Git Status**: Not a git repository yet (`fatal: not a git repository`). Initializing git (`git init`) is recommended to track milestone iterations cleanly while preserving `.gitignore`.

---

## 3. Host Environment & Tooling Verification

| Component | Status / Version | Notes |
|---|---|---|
| **Node.js** | `v26.10.0` | Latest Node.js engine available |
| **npm** | `12.2.0` | Primary package manager |
| **bun** | `1.4.2` | Available at `/usr/bin/bun` if needed for fast execution |
| **npx** | Available | Operates smoothly |
| **ElevenLabs CLI** | `elevenlabs@latest` | Tested via `npx -y @elevenlabs/cli@latest onboard check --answered --env-path .env.local` -> Passed (key verified ending in `e062`, `next: write_code`) |
| **Reference Image** | `/home/ashetian/.gemini/antigravity/brain/85fc67b5-f014-4e6a-abd0-24bbd1fffa3f/.user_uploaded/media_1794660218146.png` | 612 KB; Verified intact on disk |

---

## 4. Dependency Resolution & Stack Matrix

A dry-run resolution test was executed against npm to verify package compatibility with Node.js 26 and React 19 / Next.js 16/15:

### Verified Compatible Packages
- **Framework**: `next@^15.x` or `next@^16.x`, `react@^19.x`, `react-dom@^19.x`
- **Language & Styling**: `typescript@^5.x`, `tailwindcss@^4.x` or `tailwindcss@^3.4`, `postcss`, `autoprefixer`
- **Animations & Smooth Scroll**: `gsap@^3.12.x`, `lenis@^1.3.x`, `framer-motion@^11.x` or `motion`
- **Authentication & Security**: `jose@^5.x` or `jose@^6.x` (pure Web Crypto API compatible with Next.js edge/middleware)
- **Validation**: `zod@^3.24.x` or `zod@^4.x`
- **Cloud Media**: `@vercel/blob@^0.27.x`
- **AI Integration**: `@elevenlabs/elevenlabs-js@^2.78.x`
- **Database & ORM**:
  - Choice A: Drizzle ORM (`drizzle-orm@^0.38.x`, `drizzle-kit@^0.30.x`, `@neondatabase/serverless@^0.10.x`)
  - Choice B: Prisma (`prisma@^6.x`, `@prisma/client@^6.x`, `@neondatabase/serverless`)
  - *Recommendation*: Drizzle ORM with `@neondatabase/serverless` is optimal for serverless/edge environments, zero cold-start binary issues, and lightweight schema migrations. Prisma ORM is equally viable with direct connection pooling.

---

## 5. Requirement Gap Analysis (R1 - R5)

| Requirement | Current Status | What Needs to be Implemented |
|---|---|---|
| **R1. Database Schema & Core Next.js Skeleton** | Missing (0%) | - Initialize Next.js project with App Router, TypeScript, Tailwind.<br>- Install ORM (Drizzle/Prisma) & DB driver (`@neondatabase/serverless`).<br>- Define typed schemas: `Product` (slug, title, desc, price, stock, variants, media, isBestseller), `StoreSettings` (whatsappNumber, currency, storeName), `ElevenLabsAsset` (promptHash, mediaUrl, type, creditsUsed, status), `CreditUsageLog` (action, credits, timestamp).<br>- Write seed script importing initial items from `assets/` and establishing default store settings. |
| **R2. Brutalist Storefront UI & Animations** | Missing (0%) | - Configure Tailwind theme with `#F7F5EE` warm canvas, high-contrast dark accents, monospace typography.<br>- Build brutalist hero with oversized typography and centered search pill.<br>- Implement Lenis smooth scroll provider.<br>- Build GSAP / Framer Motion reveal animations (page load masking, magnetic buttons, custom cursor).<br>- Build asymmetric borderless 4-column Bestseller grid with heart button and `BUY NOW →`.<br>- Build bottom editorial block (2 stacked left + 1 large right video/campaign). |
| **R3. WhatsApp Ordering Flow** | Missing (0%) | - Create Zod schema to validate order inputs (product name, variant, price, currency).<br>- Create utility to fetch `whatsappNumber` from `StoreSettings`.<br>- Generate formatted URI: `https://wa.me/<number>?text=<encoded_order>`.<br>- Implement direct client redirect on "BUY NOW" click with zero cart/checkout POS. |
| **R4. Minimal Admin Panel & Vercel Blob** | Missing (0%) | - Implement JWT sign/verify using `jose` with HttpOnly cookies.<br>- Next.js middleware protecting `/admin` and `/api/admin/*`.<br>- Admin UI for Product CRUD and StoreSettings configuration.<br>- Secure API routes (`/api/admin/blob/upload`, `/api/admin/blob/delete`) with Zod input sanitization using `@vercel/blob`. |
| **R5. Credit-Conscious ElevenLabs Integration** | Missing (0%) | - Install `@elevenlabs/elevenlabs-js`.<br>- Construct server-side client reading `ELEVENLABS_API_KEY` from process.env.<br>- Implement 23,000 credit hard guard checking `CreditUsageLog` before every API invocation.<br>- Implement SHA-256 prompt hashing cache in PostgreSQL to eliminate duplicate calls.<br>- Build admin-only manual trigger UI with explicit credit confirmation dialog. |

---

## 6. Build, Lint & Type Safety Strategy

To satisfy acceptance criteria:
1. **`package.json` Scripts**:
   ```json
   {
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start",
       "lint": "next lint",
       "typecheck": "tsc --noEmit",
       "db:generate": "drizzle-kit generate",
       "db:push": "drizzle-kit push",
       "db:seed": "node --loader tsx src/db/seed.ts"
     }
   }
   ```
2. **Acceptance Criteria Verification**:
   - `npx tsc --noEmit` must return 0 errors.
   - `npm run lint` must pass cleanly.
   - `npm run build` must produce a production build with statically optimized routes.
   - `npx -y @elevenlabs/cli@latest onboard check --answered --env-path .env.local` must pass.

---

## 7. Recommended Action Plan for Phase 1 Scaffolding

1. **Initialize Git Repository**:
   Run `git init` in `/home/ashetian/Desktop/cyruxstudio` to ensure clean branch/commit progression.
2. **Bootstrap Next.js & Dependencies**:
   Scaffold package.json and install core dependencies (`next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `gsap`, `lenis`, `framer-motion`, `jose`, `zod`, `@vercel/blob`, `@elevenlabs/elevenlabs-js`, `@neondatabase/serverless`, `drizzle-orm`).
3. **Database Schema & Migrations (M1)**:
   Create database schemas and seed initial data using assets from `assets/`.
4. **Handoff to Track A (E2E Testing) & Track B (Implementation)**.
