# Project: cyrux studio

## Architecture
- **Framework**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Database & ORM**: PostgreSQL (Neon Serverless) with Prisma ORM (`prisma/schema.prisma`) and pooled connection singleton
- **Animation & Motion**: Lenis (inertial smooth scroll), GSAP (ScrollTrigger & typography split reveal), Framer Motion (layout springs & hover physics)
- **Authentication**: JWT (`jose`) with HttpOnly cookies, Edge Middleware route guards on `/admin/*` and `/api/admin/*`, constant-time credential check
- **Asset Storage**: Local initial brand assets in `public/assets/`, dynamic uploads & AI generations in `@vercel/blob`
- **AI Media Generation**: `@elevenlabs/elevenlabs-js` (exclusively for image & video generation) with strict 23,000 credit ceiling guard, SHA-256 prompt hashing deduplication cache, and manual admin trigger
- **Ordering**: Frictionless direct WhatsApp ordering via sanitized Zod schema and dynamic `https://wa.me/<number>?text=<encoded_order>` redirection

## Code Layout
```
/home/ashetian/Desktop/cyruxstudio/
├── prisma/
│   ├── schema.prisma             # Data models (Product, StoreSettings, ElevenLabsAsset, CreditUsageLog)
│   └── seed.ts                   # Initial seed script with 5 apparel products and brand settings
├── public/
│   └── assets/                   # Web-optimized assets (converted WebP, MP4, PNG logos)
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout with LenisProvider and CustomCursor
│   │   ├── page.tsx              # Brutalist storefront home page
│   │   ├── admin/                # Minimal admin panel pages (login, dashboard, products, settings, AI studio)
│   │   │   ├── page.tsx
│   │   │   └── login/page.tsx
│   │   └── api/
│   │       ├── admin/
│   │       │   ├── auth/         # Login, logout, session verification
│   │       │   ├── products/     # Product CRUD endpoints
│   │       │   ├── settings/     # StoreSettings endpoints
│   │       │   ├── blob/         # Vercel Blob upload & delete endpoints
│   │       │   └── elevenlabs/   # Credit-guarded generation endpoints
│   │       └── order/
│   │           └── whatsapp/     # WhatsApp order URL generator endpoint
│   ├── components/
│   │   ├── providers/
│   │   │   └── smooth-scroll.tsx # Lenis smooth scroll provider
│   │   ├── ui/
│   │   │   ├── custom-cursor.tsx # Contextual brutalist magnetic cursor
│   │   │   └── magnetic-button.tsx
│   │   ├── storefront/
│   │   │   ├── hero-section.tsx  # Dark high-contrast hero, search pill, oversized display typography
│   │   │   ├── floating-nav.tsx  # Bottom floating pill nav [cyrux] Shop | New collection | About
│   │   │   ├── bestseller-grid.tsx # Asymmetric 4-column borderless product grid with BUY NOW →
│   │   │   └── campaign-block.tsx  # Editorial video block (2 stacked left + 1 large right)
│   │   └── admin/                # Admin table, forms, confirmation modals, credit gauge
│   ├── lib/
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── auth.ts               # Jose JWT session helpers
│   │   ├── validations.ts        # Zod schemas (order, product, settings, blob, ai)
│   │   ├── whatsapp.ts           # WhatsApp URL generation & phone sanitization
│   │   ├── blob.ts               # Vercel Blob wrapper
│   │   └── elevenlabs.ts         # ElevenLabs SDK wrapper with 23k budget protection guard
│   └── middleware.ts             # Next.js Edge Middleware protecting /admin/* and /api/admin/*
├── tests/
│   ├── runner.ts                 # Test runner harness
│   ├── tier1-feature/            # Tier 1 tests (>=5 per feature)
│   ├── tier2-boundary/           # Tier 2 boundary & corner tests
│   ├── tier3-combination/        # Tier 3 cross-feature pairwise tests
│   └── tier4-scenario/           # Tier 4 real-world application workload tests
└── PROJECT.md
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Next.js App Router & TypeScript Skeleton | Clean setup with Tailwind CSS, tsconfig, next.config | M1 | Survey (Codebase) |
| 2 | PostgreSQL & Prisma Schema Setup | Models: Product, StoreSettings, ElevenLabsAsset, CreditUsageLog | M1 | Survey (Arch) |
| 3 | Seed Data & Brand Asset Pipeline | Seeding 5 apparel items, converting TIFF->WebP and MOV->MP4 | M1 | Survey (UI/Assets) |
| 4 | Dark High-Contrast Hero & Search Pill | Top navigation with search pill, hamburger, edge-to-edge cream "cyrux" | M2 | Survey (UI/Assets) |
| 5 | Bottom Floating Pill Nav | `[cyrux] Shop \| New collection \| About` frosted pill navigation | M2 | Survey (UI/Assets) |
| 6 | Asymmetric 4-Column Bestseller Grid | Varying height borderless grid, top-right heart, monospace name/price | M2 | Survey (UI/Assets) |
| 7 | Brutalist Monospace CTA | Underlined brutalist monospace `BUY NOW →` button | M2 | Survey (UI/Assets) |
| 8 | Editorial Campaign Block | 2 stacked left cards + 1 large right campaign video block with play toggle | M2 | Survey (UI/Assets) |
| 9 | Smooth Motion & Animation Engine | Lenis smooth scroll, GSAP character split-reveal, scroll parallax, hover | M2 | Survey (UI/Assets) |
| 10 | Custom Brutalist Cursor | Magnetic contextual cursor with label morphing, touch device guard | M2 | Survey (UI/Assets) |
| 11 | WhatsApp Order Payload Validation | Zod schema sanitizing productName, variant, price, notes against XSS | M3 | Survey (Arch) |
| 12 | Dynamic WhatsApp URL Generation | Lookup StoreSettings whatsappNumber, E.164 sanitization, wa.me redirection | M3 | Survey (Arch) |
| 13 | Jose JWT Admin Authentication | HttpOnly cookie auth, constant-time credential check, Edge middleware | M4 | Survey (Arch) |
| 14 | Admin Dashboard & Product CRUD | Create, read, update, delete products with stock & variants | M4 | Survey (Arch) |
| 15 | Store Settings Management | Admin editing of WhatsApp number, currency, and brand metadata | M4 | Survey (Arch) |
| 16 | Authenticated Vercel Blob Storage | Upload and delete endpoints with MIME whitelisting behind admin auth | M4 | Survey (Arch) |
| 17 | ElevenLabs Image/Video Generation | `@elevenlabs/elevenlabs-js` integration reading `.env.local` securely | M5 | Survey (Arch) |
| 18 | Strict 23k Credit Budget Guard | Cumulative check on CreditUsageLog aborting if usage > 23,000 | M5 | Survey (Arch) |
| 19 | SHA-256 Prompt Hashing Deduplication | Instant cache hit lookup in DB/Blob before invoking API | M5 | Survey (Arch) |
| 20 | Two-Phase Admin Confirmation Modal | Explicit cost review and confirmation modal before generation | M5 | Survey (Arch) |
| 21 | ElevenLabs CLI Onboarding Verification | Compatibility with `elevenlabs onboard check --answered --env-path .env.local` | M5 | Survey (Codebase) |
| 22 | E2E Test Suite Execution & Acceptance | Pass 100% of Tiers 1-4 tests and pass tsc, lint, build | M6 | Survey (Arch) |
| 23 | Adversarial Coverage Hardening (Tier 5) | Challenger adversarial stress tests and forensic audit verification | M6 | Survey (Arch) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Skeleton & Database | Features 1, 2, 3 | none | DONE |
| M2 | Brutalist Storefront UI & Animations | Features 4, 5, 6, 7, 8, 9, 10 | M1 | DONE |
| M3 | WhatsApp Ordering Flow | Features 11, 12 | M1 | DONE |
| M4 | Secure Minimal Admin & Blob | Features 13, 14, 15, 16 | M1 | DONE |
| M5 | ElevenLabs Integration & 23k Credit Guard | Features 17, 18, 19, 20, 21 | M1, M4 | DONE |
| M6 | Final Verification & Adversarial Hardening | Features 22, 23 | M1-M5, TEST_READY.md | DONE |

## Interface Contracts
### Database Models ↔ Application Services
- `prisma.product`: `findMany`, `findUnique`, `create`, `update`, `delete` returning typed `Product` with `variants: Json` and `mediaUrls: string[]`.
- `prisma.storeSettings`: `findFirst`, `upsert` returning `{ whatsappNumber: string, currency: string, brandMetadata: Json }`.
- `prisma.creditUsageLog`: `aggregate({ _sum: { creditsUsed: true } })` used by `verifyCreditBudget(estimatedCost)`.

### WhatsApp Ordering Contract
- Endpoint: `POST /api/order/whatsapp`
  - Body: `{ productId: string, variant?: string, customerNotes?: string }`
  - Response: `{ success: true, redirectUrl: "https://wa.me/..." }` or `{ error: string }`

### Admin Auth & Middleware Contract
- Cookie: `cyrux_admin_session` containing signed JWT with `{ sub: "admin", exp: number }`.
- Middleware: Protects `/admin/*` (except `/admin/login`) and `/api/admin/*` (except `/api/admin/auth/login`). Unauthenticated requests return `401 Unauthorized` (for `/api/*`) or redirect to `/admin/login`.

### ElevenLabs Credit Guard Contract
- Guard function: `verifyCreditBudget(estimatedCost: number): Promise<{ allowed: boolean, currentUsed: number, remaining: number }>`
- Rule: If `currentUsed + estimatedCost > 23000`, throw error / return `403 CreditLimitExceeded`.

---

# Phase 2: White Atelier Mobile Admin & 100% Dynamic Storefront CMS (2026-11-21)

## Phase 2 Architecture & Code Layout Additions
- **White Atelier Admin Theme**: `#FFFFFF` / `#FAF8F3` surfaces, `#0A0A0A` primary ink, `#E8E4DC` subtle hairlines, zero dark-mode remnants, zero `//` labels, zero sci-fi HUD jargon, zero emojis, zero gradients/glows (`cyrux-pure-ui`).
- **Mobile-First Admin Navigation**: Fixed Bottom Navigation Bar (`src/components/admin/admin-bottom-nav.tsx`) + touch-friendly Bottom Sheet drawer (`src/components/admin/admin-bottom-sheet.tsx`) for secondary modules & quick actions, mobile card lists replacing wide tables, `>=44x44px` tap targets, `text-base` mobile inputs, `focus-visible:ring-2`, and `cursor-pointer`.
- **100% Dynamic Storefront CMS**: Typed `StorefrontSection` persistence (`src/lib/cms.ts`) backed by Prisma + file-snapshot resilient fallback (`data/store-fallback.json`) with per-section Zod validation and Next.js `revalidatePath` cache invalidation.
- **Complete E-Commerce Operations**: `Collection`, `Order`, `OrderItem`, `Customer`, and `Coupon` models + Product `discountPrice`, `category`, `badge`, `collectionId`, `sortOrder`, `isActive`.
- **Additional Files**:
  - `src/lib/cms.ts`: Typed CMS section defaults, `getStorefrontCms()`, `getCmsSection()`, `updateCmsSection()`.
  - `src/app/api/cms/route.ts`, `src/app/api/products/route.ts`, `src/app/api/coupons/validate/route.ts`.
  - `src/app/api/admin/cms/route.ts`, `src/app/api/admin/cms/[section]/route.ts`.
  - `src/app/api/admin/collections/route.ts`, `src/app/api/admin/collections/[id]/route.ts`.
  - `src/app/api/admin/orders/route.ts`, `src/app/api/admin/orders/[id]/route.ts`.
  - `src/app/api/admin/customers/route.ts`, `src/app/api/admin/customers/[id]/route.ts`.
  - `src/app/api/admin/coupons/route.ts`, `src/app/api/admin/coupons/[id]/route.ts`.
  - `src/components/admin/admin-bottom-nav.tsx`, `admin-bottom-sheet.tsx`, `admin-overview.tsx`, `collections-manager.tsx`, `orders-manager.tsx`, `customers-manager.tsx`, `coupons-manager.tsx`, `cms-studio.tsx`, `src/components/admin/cms/*.tsx`.
  - `src/components/storefront/marquee-bar.tsx`, `featured-collections.tsx`, `faq-section.tsx`, `contact-section.tsx`.
  - `src/app/shop/page.tsx`, `src/app/about/page.tsx`, `src/app/faq/page.tsx`, `src/app/contact/page.tsx`, `src/app/legal/page.tsx`.

## Phase 2 Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 24 | Extended Prisma Schema & Resilient File-Backed Store | Add `Collection`, `Order`, `OrderItem`, `Customer`, `Coupon`, `StorefrontSection`, `Product` discount/category/badge/sort/active fields, `StoreSettings` shipping/theme fields, unified `db.ts` + `data/store-fallback.json`, offline blob delete/list | M7 | Survey 3 |
| 25 | Typed CMS Service & Public Storefront APIs | `src/lib/cms.ts` defaults & Zod schemas, `GET /api/cms`, `GET /api/products`, `POST /api/coupons/validate`, order-persisting `/api/order/whatsapp*` | M7 | Survey 2, 3 |
| 26 | Admin Commerce & CMS APIs + Query Fixes | `/api/admin/cms*`, `/api/admin/collections*`, `/api/admin/orders*`, `/api/admin/customers*`, `/api/admin/coupons*`, enhanced `/api/admin/stats`, fixed `/api/admin/products` filter-before-paginate, aligned `ADMIN_EMAIL`/`ADMIN_USERNAME` | M7 | Survey 1, 3 |
| 27 | White Atelier Admin Theme & Pure UI Remediation | Light `#FFFFFF`/`#FAF8F3` surfaces, `#0A0A0A` ink, `#E8E4DC` borders across `/admin/login`, `/admin`, and all admin modals/sheets; zero `//`, HUD jargon, glows, pulsing dots, or emojis | M8 | Survey 1 |
| 28 | Mobile-First Bottom Nav, Bottom Sheets & Overview Dashboard | Fixed mobile Bottom Navigation Bar, secondary-module bottom sheet, mobile KPI overview with low-stock alerts & quick actions, `>=44px` touch targets, `text-base` inputs, zero overflow `320px–768px` | M8 | Survey 1 |
| 29 | Mobile Products, Variants, Collections & Drops Ops | Mobile cards & bottom-sheet CRUD with `discountPrice`, custom `badge`, `category`/`collectionId`, touch-accessible image reordering, and `CollectionsManager` + re-themed `DropManagement`, `MediaAssetsGrid`, `AiStudioModal` | M8 | Survey 1 |
| 30 | Mobile Orders, Customers & Coupons/Campaigns Ops | Full CRUD & filtering for Orders (status updates, tracking number/carrier, customer details), Customers directory/history, and Coupons/Campaigns (code, type, value, limits, active toggle) | M8 | Survey 1, 3 |
| 31 | Admin Hero, Marquee & Lookbook/Archive CMS Editors | White Atelier mobile editors for Hero (headlines, subcopy, CTAs, desktop/mobile images, video, 3D toggle), Marquee (items, links, speed, visibility), and Lookbook/Archive (`CampaignBlock` cards, video, labels) | M9 | Survey 1, 2 |
| 32 | Admin Brand Pages CMS Editors (Manifesto, FAQ, Contact, Legal) | White Atelier mobile editors for multi-block Manifesto/About, FAQ items, Contact details/hours/socials, and editable Legal/Policy documents | M9 | Survey 1, 2 |
| 33 | Admin Global Navigation, SEO, Footer & StoreSettings Editors | White Atelier mobile editors for Header/Floating/Drawer links, SEO title/desc/keywords/OG/lang, Footer rows/copyright/credit, and StoreSettings (WhatsApp, currency, shipping threshold/fee, theme/toggles) | M9 | Survey 1, 2 |
| 34 | Dynamic Storefront Metadata, Navigation & Hero/Marquee | Dynamic `generateMetadata()`, CMS-wired `FloatingNav` & `MenuDrawer`, `MarqueeBar`, `HeroSection` (headlines/CTAs/video/3D toggle), `StorefrontContainer` toggles | M10 | Survey 2 |
| 35 | Dynamic Storefront Catalog, Lookbook, Cart & Product Specs | `FeaturedCollections`, `BestsellerGrid` (dynamic headings, badges, discount prices), mounted CMS `CampaignBlock`, dynamic `ProductDetail` specs, `CartDrawer` coupon + shipping threshold, `SearchModal` currency fix | M10 | Survey 2 |
| 36 | Dynamic Brand Routes (`/shop`, `/about`, `/faq`, `/contact`, `/legal`) & Pure UI Cleanup | Dedicated CMS-backed subpages & homepage sections (`AboutSection`, `FaqSection`, `ContactSection`, `LegalModal`, `StudioFooter`), zero `//` in `not-found.tsx`, zero coordinates (`35.1856° N`) or sci-fi jargon, `>=44px` storefront tap targets | M10 | Survey 2 |
| 37 | Phase 2 E2E Test Suite Expansion (Tiers 1–4) | Opaque-box tests for Features 24–36, Pure UI grep invariants, mobile layout/target checks, and CMS->storefront roundtrip tests | E2E Track | Survey 1, 2, 3 |
| 38 | Final E2E Acceptance & Tier 5 Adversarial Hardening | `npm run typecheck`, `npm test` 100% pass, mobile viewport/Pure UI verification, and Challenger Tier 5 adversarial gap check + Forensic Audit | M11 | Project Pattern |

## Phase 2 Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M7 | Unified CMS & E-Commerce Backend, Schema & APIs | Features 24, 25, 26 | none | DONE |
| M8 | White Atelier Mobile Admin Shell & Commerce Ops | Features 27, 28, 29, 30 | M7 | DONE (Iter 3 Gate PASS; M8-scoped files verified) |
| M9 | Storefront CMS Studio & Global Settings Editors | Features 31, 32, 33 | M7 | DONE (Iter 2 Gate PASS; `store-settings-form.tsx`, `cms-studio.tsx`, `src/components/admin/cms/*` verified) |
| M10 | 100% Dynamic Public Storefront & Pure UI Cleanup | Features 34, 35, 36 | M7 | DONE |
| E2E | Phase 2 E2E Test Suite Expansion | Feature 37 | none (parallel) | DONE (228 tests ready) |
| M11 | Final Acceptance & Adversarial Hardening (Tier 5) | Feature 38 | M7-M10, E2E TEST_READY.md | DONE (228/228 tests PASS, zero type errors) |

## Phase 2 Interface Contracts
### M8 ↔ M9 Admin Dashboard & CMS Editors Contract
- `src/components/admin/store-settings-form.tsx` (owned by M9): exports `StoreSettingsForm({ onSaved?: () => void })`.
- `src/components/admin/cms-studio.tsx` (owned by M9): exports `CmsStudio({ initialSection?: CmsSectionKey, onSaved?: () => void })`.
- `src/components/admin/admin-dashboard.tsx` (owned by M8): renders `StoreSettingsForm` and `CmsStudio` inside the White Atelier shell tabs/bottom-sheet routes; M8 never edits `store-settings-form.tsx`, `cms-studio.tsx`, or `src/components/admin/cms/*`, and M9 never edits `admin-dashboard.tsx` or `admin-header.tsx`.

### M7 ↔ M8/M9/M10 CMS & API Contracts
- `CmsSectionKey`: `"hero" | "marquee" | "lookbook" | "about" | "faq" | "contact" | "legal" | "footer" | "navigation" | "seo" | "collectionsSection"`
- `GET /api/cms` returns `{ settings: FormattedStoreSettings, cms: StorefrontCmsConfig }`.
- `GET /api/admin/cms` & `PUT /api/admin/cms/[section]` return `{ success: true, section, data, cms }`.
- `GET/POST /api/admin/orders`, `PATCH/DELETE /api/admin/orders/[id]` support status (`pending | confirmed | preparing | shipped | delivered | cancelled`), `trackingNumber`, `trackingCarrier`, `adminNotes`.
- `GET/POST /api/admin/coupons`, `PATCH/DELETE /api/admin/coupons/[id]` & `POST /api/coupons/validate` support `percentage | fixed` discounts, `minOrderAmount`, `maxUses`, `isActive`.
- `GET/POST /api/admin/collections`, `PATCH/DELETE /api/admin/collections/[id]` manage curated collections linked to products.

