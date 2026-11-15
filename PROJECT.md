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
| M3 | WhatsApp Ordering Flow | Features 11, 12 | M1 | IN_PROGRESS |
| M4 | Secure Minimal Admin & Blob | Features 13, 14, 15, 16 | M1 | PLANNED |
| M5 | ElevenLabs Integration & 23k Credit Guard | Features 17, 18, 19, 20, 21 | M1, M4 | PLANNED |
| M6 | Final Verification & Adversarial Hardening | Features 22, 23 | M1-M5, TEST_READY.md | PLANNED |

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
