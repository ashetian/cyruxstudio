# Original User Request

## 2026-11-14T12:44:17Z

Build a brutalist, minimalist, animation-rich e-commerce web application for **cyrux studio** using Next.js (App Router), React, Tailwind CSS, TypeScript, GSAP, Framer Motion, Lenis, PostgreSQL (Neon/Vercel Postgres), Vercel Blob, and ElevenLabs (`@elevenlabs/elevenlabs-js`).

Requested team: Multi-agent orchestration (delegate simple tasks to flash agents, complex tasks to standard/pro models).
Working directory: `/home/ashetian/Desktop/cyruxstudio`
Integrity mode: `development`

Reference assets:
- `/home/ashetian/.gemini/antigravity/brain/85fc67b5-f014-4e6a-abd0-24bbd1fffa3f/.user_uploaded/media_1794660218146.png` (primary layout reference: dark high-contrast hero with centered pill Search bar, edge-to-edge giant cream display "cyrux" typography, bottom floating pill nav `[cyrux] Shop | New collection | About`, warm off-white `#F7F5EE` canvas, monospace `Bestseller Now` heading, asymmetric borderless 4-column product grid with varying heights + top-right heart + `BUY NOW →`, and lower 2-left-stacked + 1-large-right video/campaign editorial block)
- `assets/C5E6C1ED-AFC1-4CA1-8056-3F38A6A9048C.PNG` and initial product/brand media (`IMG_0130.tiff`, `IMG_0679.MOV`, `IMG_0795.PNG`, `IMG_9258.png`, `IMG_9259.png`, `IMG_9523.png`, `IMG_9524.png`) in `assets/`.

## Requirements

### R1. Database Schema & Core Next.js Skeleton
Configure Next.js (App Router, TypeScript, Tailwind CSS) and PostgreSQL (Neon / Vercel Postgres with Prisma or Drizzle) with typed schemas for `Product` (name, slug, description, price, stock, variants, media URLs, bestseller flag), `StoreSettings` (admin-configurable WhatsApp number, currency, brand metadata), and `ElevenLabsAsset` / `CreditUsageLog` (prompt hash, media URL, credits used, status).

### R2. Brutalist Storefront UI & Smooth Animations
Match the reference visual style in `/home/ashetian/.gemini/antigravity/brain/85fc67b5-f014-4e6a-abd0-24bbd1fffa3f/.user_uploaded/media_1794660218146.png`: oversized "cyrux" hero typography, minimalist header/footer, generous whitespace, and a sharp borderless asymmetric "Bestseller" product grid. Implement smooth GSAP, Framer Motion, and Lenis animations: page-load typography masking/reveal, scroll parallax & fade-up on product media, magnetic hover buttons/cards, and a custom cursor.

### R3. WhatsApp Ordering Flow
No cart or checkout POS. Clicking "Buy Now" / "Sipariş Ver" validates and sanitizes product name, selected variant, and price using Zod, reads the admin-configured WhatsApp number from `StoreSettings`, and redirects to `https://wa.me/<number>?text=<encoded_order>`.

### R4. Secure Minimal Admin Panel & Vercel Blob
Implement JWT (`jose`) HttpOnly cookie authentication + Next.js middleware using `.env.local` admin credentials. Provide a minimal admin panel to create/update/delete products (price, stock, variants, images) and update `StoreSettings` (WhatsApp number, currency). Initial media is read from `assets/`; dynamic uploads and generated media are stored in Vercel Blob behind authenticated upload/delete endpoints with Zod input sanitization.

### R5. Credit-Conscious ElevenLabs Image/Video Integration
Integrate `@elevenlabs/elevenlabs-js` (reading `ELEVENLABS_API_KEY` from `.env.local`) exclusively for **image and video generation (especially images)** for brand/product visuals. Enforce strict 23,000-credit protection: cache generated assets in PostgreSQL + Vercel Blob, require manual admin-only triggering with confirmation, and enforce rate-limiting/budget tracking before calling the API. Note: Do NOT open, print, or cat `.env.local`, and never put `ELEVENLABS_API_KEY` in code.

## Acceptance Criteria

### Build, Type Safety & Linting
- [ ] `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass with zero errors.
- [ ] Database schema and client generation succeed cleanly.

### Security & Validation
- [ ] Unauthenticated requests to `/api/admin/*`, Vercel Blob upload/delete routes, and ElevenLabs generation routes return `401 Unauthorized`; authenticated JWT sessions succeed.
- [ ] Zod schemas sanitize and reject invalid or XSS-laden inputs on product, settings, and WhatsApp order payloads.

### Features & Integrations
- [ ] Storefront renders oversized "cyrux" hero, asymmetric Bestseller grid, GSAP/Framer Motion/Lenis animations, custom cursor, and valid `wa.me` order links using admin-configured settings.
- [ ] `npx -y @elevenlabs/cli@latest onboard check --answered --env-path .env.local` passes; ElevenLabs image/video generation is gated by manual admin trigger, caching, and the 23k credit budget guard.


## 2026-11-14T14:48:33Z

USER CLARIFICATION for Milestone 5 (ElevenLabs):
The user clarified: "o görsel oluşturma entegrasyonu değil siteyi tasarlarken mağaza konseptli asset gerekirse diye" (meaning ElevenLabs is NOT meant to be a mandatory runtime visual-generation feature/product for end users; it was meant in case store-concept assets are needed while designing the site, with strict 23k credit protection).

Please ensure Milestone 5:
1. Still keeps `@elevenlabs/elevenlabs-js` installed in `package.json` and imported in a clean server-side module (so `npx -y @elevenlabs/cli@latest onboard check --answered --env-path .env.local` passes with `sdk_declared: true` and `sdk_imported: true`).
2. Keeps the 23,000-credit budget guard, caching, and manual-only trigger (no automatic API calls) in place so zero credits are wasted, and focuses on the store-concept asset/audio utility rather than an over-engineered runtime image/video studio if not needed.
