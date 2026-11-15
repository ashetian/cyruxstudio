# Orchestration Plan: cyrux studio

## Overview
Build a brutalist, minimalist, animation-rich e-commerce web application for cyrux studio fulfilling requirements R1 through R5 and passing all acceptance criteria.

## Phases
1. **Phase 0: Scope Survey & Codebase Reconnaissance**
   - Dispatch 3 Explorers in parallel to inspect:
     - Explorer 1: Project structure, package.json, installed dependencies, configuration, DB setup, environment assumptions.
     - Explorer 2: UI assets, reference image analysis (`media_1794660218146.png`, `assets/*`), typography, color palette, layout specs.
     - Explorer 3: Requirements R1-R5, API contracts (Next.js App Router, ElevenLabs SDK, WhatsApp flow, Vercel Blob, Jose JWT auth).
   - Merge findings into `PROJECT.md` Feature Inventory & Architecture.

2. **Phase 1: Dual Track Execution**
   - **Track A: E2E Testing Track**
     - Dispatch E2E Testing agent to build opaque-box test runner and Tiers 1-4 test suites according to ORIGINAL_REQUEST.md.
     - Publishes `TEST_READY.md`.
   - **Track B: Implementation Milestones**
     - **Milestone 1 (M1): DB Schema & Core Next.js Skeleton (R1)**
       - Schema (Product, StoreSettings, ElevenLabsAsset, CreditUsageLog), DB client (Prisma/Drizzle), basic seed/setup.
     - **Milestone 2 (M2): Brutalist Storefront UI & Animations (R2)**
       - Oversized cyrux hero, asymmetric Bestseller grid, Lenis/GSAP/Framer Motion animations, custom cursor.
     - **Milestone 3 (M3): WhatsApp Ordering Flow (R3)**
       - Zod validation, order payload formatting, wa.me redirection with dynamic store settings.
     - **Milestone 4 (M4): Minimal Admin Panel & Vercel Blob (R4)**
       - JWT auth (`jose`) middleware, product CRUD, settings update, Vercel Blob authenticated uploads/deletes.
     - **Milestone 5 (M5): Credit-Conscious ElevenLabs Image/Video Integration (R5)**
       - `@elevenlabs/elevenlabs-js` integration for images/videos, 23k credit protection guard, caching, manual admin trigger.

3. **Phase 2: Final Milestone & Hardening**
   - Run 100% of E2E test suite (Tiers 1-4).
   - Tier 5 adversarial testing & coverage hardening (Challengers + Workers + Reviewers + Auditors).
   - Type check (`npx tsc --noEmit`), lint (`npm run lint`), build (`npm run build`).
   - ElevenLabs CLI check verification (`npx -y @elevenlabs/cli@latest onboard check --answered --env-path .env.local`).

4. **Phase 3: Delivery & Handover**
   - Final report to Sentinel.
