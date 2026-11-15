# Test Infrastructure Specification: cyrux studio

## 1. Overview & Test Philosophy

This document defines the comprehensive opaque-box End-to-End (E2E) test infrastructure for **cyrux studio**.
The test suite validates the application from an external, contract-driven perspective, treating implementation internals as an opaque box and verifying adherence to:
- User requirements (R1–R5) defined in `ORIGINAL_REQUEST.md`
- Architecture, data models, and interface contracts defined in `PROJECT.md`
- Security constraints: HttpOnly JWT cookie auth, edge middleware route protection, Zod XSS sanitization, and strict 23,000 ElevenLabs credit ceiling guard.
- Visual and interaction specifications: Brutalist styling tokens (`#F7F5EE`, `#0A0A0A`, `#FAF8F3`), Lenis smooth scroll, GSAP character split-reveal, asymmetric 4-column Bestseller grid, custom cursor, and frictionless WhatsApp direct ordering.

### Key Principles
1. **Opaque-Box Verification**: Tests validate publicly observable outputs, HTTP status codes, JSON response schemas, cryptographic properties, and DOM/CSS tokens without relying on private implementation details.
2. **Deterministic & Isolated**: Every test case sets up its own state, executes independently, and cleans up without order dependencies.
3. **Zero Security Exposure**: Tests NEVER inspect `.env.local` or hardcode sensitive API keys. Environment access follows strict runtime contract validation.
4. **Adaptive Execution**: The runner executes autonomously via `npx tsx tests/runner.ts` (or `npm test`), supporting contract validation, isolated component/module verification, and live HTTP endpoint testing against `TEST_BASE_URL` or `http://localhost:3000`.

---

## 2. Test Architecture & Runner Harness

The test harness is implemented in `tests/runner.ts` and structured into 4 distinct tiers:

```
tests/
├── framework.ts                     # Zero-dependency assertion engine & test registry
├── runner.ts                        # Master CLI test runner & reporter
├── tier1-feature/                   # Tier 1: Feature Coverage (>=5 tests per feature)
│   ├── f01-app-skeleton.ts          # Feature 1: Next.js App Router & TypeScript Skeleton
│   ├── f02-database-schema.ts       # Feature 2: PostgreSQL & Prisma/Drizzle Schema Setup
│   ├── f03-seed-assets.ts           # Feature 3: Seed Data & Brand Asset Pipeline
│   ├── f04-hero-search.ts           # Feature 4: Dark High-Contrast Hero & Search Pill
│   ├── f05-floating-nav.ts          # Feature 5: Bottom Floating Pill Nav
│   ├── f06-bestseller-grid.ts       # Feature 6: Asymmetric 4-Column Bestseller Grid
│   ├── f07-brutalist-cta.ts         # Feature 7: Brutalist Monospace CTA
│   ├── f08-campaign-block.ts        # Feature 8: Editorial Campaign Block
│   ├── f09-smooth-motion.ts         # Feature 9: Smooth Motion & Animation Engine
│   ├── f10-custom-cursor.ts         # Feature 10: Custom Brutalist Cursor
│   ├── f11-whatsapp-validation.ts   # Feature 11: WhatsApp Order Payload Validation
│   ├── f12-whatsapp-url.ts          # Feature 12: Dynamic WhatsApp URL Generation
│   ├── f13-jwt-auth.ts              # Feature 13: Jose JWT Admin Authentication
│   ├── f14-admin-crud.ts            # Feature 14: Admin Dashboard & Product CRUD
│   ├── f15-store-settings.ts        # Feature 15: Store Settings Management
│   ├── f16-vercel-blob.ts           # Feature 16: Authenticated Vercel Blob Storage
│   ├── f17-elevenlabs-generation.ts # Feature 17: ElevenLabs Image/Video Generation
│   ├── f18-credit-guard.ts          # Feature 18: Strict 23k Credit Budget Guard
│   ├── f19-prompt-dedup.ts          # Feature 19: SHA-256 Prompt Hashing Deduplication
│   ├── f20-admin-confirmation.ts    # Feature 20: Two-Phase Admin Confirmation Modal
│   └── f21-elevenlabs-cli.ts        # Feature 21: ElevenLabs CLI Onboarding Verification
├── tier2-boundary/                  # Tier 2: Boundary & Corner Cases
│   └── boundary-corner-cases.ts     # Extreme values, XSS payloads, zero/negative pricing, unicode, large blobs
├── tier3-combination/               # Tier 3: Cross-Feature Combinations
│   └── cross-feature-combinations.ts# Pairwise interactions: Order + Settings, Auth + Blob, Budget + Generation
└── tier4-scenario/                  # Tier 4: Real-World Workloads
    └── real-world-workloads.ts      # Multi-step workflows: Buyer journey, Catalog overhaul, AI studio workflow
```

---

## 3. Feature Inventory Mapping to Test Tiers

| # | Feature Name | Tier 1 Suite | Tier 2 Boundary | Tier 3 Combination | Tier 4 Scenario |
|---|--------------|--------------|-----------------|--------------------|-----------------|
| 1 | Next.js Skeleton & App Router | `f01-app-skeleton.ts` (5 tests) | Malformed configs | Skeleton + Routing | App boot |
| 2 | PostgreSQL & Prisma Schema | `f02-database-schema.ts` (5 tests) | Boundary types | Model cascades | Schema migration |
| 3 | Seed Data & Asset Pipeline | `f03-seed-assets.ts` (5 tests) | Corrupted media | DB Seed + Media URLs | Catalog seeding |
| 4 | Dark Hero & Search Pill | `f04-hero-search.ts` (5 tests) | Blank search query | Search + Grid | Storefront landing |
| 5 | Bottom Floating Pill Nav | `f05-floating-nav.ts` (5 tests) | Viewport extremes | Nav + Scroll position | Sticky nav navigation |
| 6 | Asymmetric 4-Col Grid | `f06-bestseller-grid.ts` (5 tests) | Empty product list | Grid + Stock badge | Product discovery |
| 7 | Brutalist Monospace CTA | `f07-brutalist-cta.ts` (5 tests) | Rapid click spam | CTA + Variant modal | Instant buy trigger |
| 8 | Editorial Campaign Block | `f08-campaign-block.ts` (5 tests) | Missing video source | Video toggle + Audio | Media consumption |
| 9 | Smooth Motion (Lenis/GSAP) | `f09-smooth-motion.ts` (5 tests) | Reduced motion mode | Lenis + Parallax | Smooth scroll load |
| 10 | Custom Brutalist Cursor | `f10-custom-cursor.ts` (5 tests) | Touch device mode | Cursor + Magnetic hover | Hover interactions |
| 11 | WhatsApp Zod Validation | `f11-whatsapp-validation.ts` (5 tests) | XSS injection payloads | Zod + Order formatting | Direct checkout |
| 12 | Dynamic WhatsApp URL Gen | `f12-whatsapp-url.ts` (5 tests) | International phones | Order URL + Settings | Redirect generation |
| 13 | Jose JWT Admin Auth | `f13-jwt-auth.ts` (5 tests) | Expired/tampered JWT | Auth + Admin routes | Admin session |
| 14 | Admin Dashboard & CRUD | `f14-admin-crud.ts` (5 tests) | Price = 0, stock < 0 | CRUD + Storefront sync | Catalog overhaul |
| 15 | Store Settings Management | `f15-store-settings.ts` (5 tests) | Invalid E.164 phone | Settings + Order URL | Settings update |
| 16 | Authenticated Vercel Blob | `f16-vercel-blob.ts` (5 tests) | Oversized & disallowed MIME | Blob + Admin Auth | Asset upload/delete |
| 17 | ElevenLabs Generation | `f17-elevenlabs-generation.ts` (5 tests) | Max length prompt | API Key + DB logging | AI generation studio |
| 18 | Strict 23k Credit Guard | `f18-credit-guard.ts` (5 tests) | 23,000 edge off-by-one | Guard + Log balance | Budget enforcement |
| 19 | SHA-256 Prompt Dedup Cache | `f19-prompt-dedup.ts` (5 tests) | Normalization spaces/casing | Cache hit + 0 credits | Asset reuse |
| 20 | Two-Phase Confirmation Modal| `f20-admin-confirmation.ts` (5 tests) | `confirmed: false` rejection | Modal + Cost preview | Guarded generation |
| 21 | ElevenLabs CLI Check | `f21-elevenlabs-cli.ts` (5 tests) | Missing key handling | CLI check + Runtime | Pre-flight validation |

---

## 4. Test Tiers Detail

### Tier 1: Feature Coverage (>=5 test cases per feature)
- Minimum 105 tests across all 21 features.
- Each test exercises the contract, interface parameters, expected status code, return schema, and deterministic behavior.

### Tier 2: Boundary & Corner Cases
- Empty string fields (`""`), whitespaces only, null/undefined inputs.
- Extreme numerical boundaries: negative prices (`-99.99`), extreme prices (`99999999.99`), fractional stocks (`0.5`).
- XSS and HTML injection payloads: `<script>alert('xss')</script>`, `<img src=x onerror=alert(1)>`, SQL injection strings (`' OR '1'='1`).
- International phone numbers: Turkish format (`+90 532 123 45 67`), US format (`(555) 123-4567`), E.164 (`+905321234567`), invalid characters.
- ElevenLabs credit ceiling boundary: exact 23,000 threshold (`22,900 + 100` -> PASS; `22,901 + 100` -> FAIL).
- Tampered JWT payloads, expired expiration timestamps (`exp` in the past), missing bearer headers.

### Tier 3: Cross-Feature Combinations
- **Order Flow + Dynamic Settings**: Admin updates WhatsApp phone number in `StoreSettings`; subsequent order triggers reflect the newly updated phone number in `https://wa.me/<number>`.
- **JWT Auth + Vercel Blob Delete**: Unauthenticated request to delete blob URL returns `401 Unauthorized`; authenticated admin request validates target URL domain and succeeds.
- **Credit Budget Limit + AI Generation Trigger**: Rapid consecutive generation requests accumulate credits; when budget reaches limit, system terminates with `403 CreditLimitExceededError` without mutating media table.
- **Product Stock Depletion + Order Flow**: Product stock reduced to zero; order payload indicates out-of-stock notification or triggers pre-order messaging.
- **Admin Product Creation + Storefront Discovery**: Product created via Admin API with `isBestseller: true` immediately appears in Bestseller grid query.

### Tier 4: Real-World Workloads
- **Scenario 1: Complete End-User Purchasing Journey**:
  User lands on homepage -> observes hero typography & search pill -> scrolls through asymmetric Bestseller grid -> selects product -> clicks "BUY NOW →" -> receives sanitized `https://wa.me` order URL with product name, price, variant, and store currency.
- **Scenario 2: Admin Catalog Overhaul**:
  Admin logs in via Jose JWT -> creates new product drop with variants -> uploads asset -> updates store WhatsApp phone -> confirms storefront queries return updated catalog.
- **Scenario 3: Credit-Guarded Asset Generation Lifecycle**:
  Admin opens AI studio -> submits prompt -> previews estimated credit cost -> confirms modal (`confirmed: true`) -> asset generated and cached -> submits identical prompt -> verifies 0 credit deduction and instant cache hit -> attempts batch generation exceeding 23,000 credits -> verifies graceful budget ceiling rejection.

---

## 5. Pass/Fail Criteria & Quality Gates

The test runner evaluates suites against strict quality gates:
1. **Pass Rate**: 100% of test assertions must pass. Any failure terminates runner with non-zero exit code (`1`).
2. **Error Hygiene**: Zero uncaught exceptions, unhandled Promise rejections, or unhandled rejection warnings.
3. **Security Boundary Enforcement**: All unauthorized attempts to access `/api/admin/*` must strictly return HTTP `401 Unauthorized`.
4. **Credit Budget Invariant**: Cumulative credit expenditure must NEVER exceed `23,000` credits under any condition.
5. **Sanitization Invariant**: Customer notes and user inputs must never allow unsanitized HTML/script execution.

---

## 6. Execution Commands

```bash
# Run complete test suite (Tiers 1-4)
npx tsx tests/runner.ts

# Run via npm script (once configured in package.json)
npm test

# Run individual tiers
npx tsx tests/runner.ts --tier 1
npx tsx tests/runner.ts --tier 2
npx tsx tests/runner.ts --tier 3
npx tsx tests/runner.ts --tier 4

# Run with verbose output or regex filter
npx tsx tests/runner.ts --filter "whatsapp"
npx tsx tests/runner.ts --filter "credit"
```
