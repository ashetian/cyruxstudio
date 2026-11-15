# CYRUX STUDIO — System Architecture & Requirements Specification (R1–R5)

**Document:** Architecture, Data Models, API Contracts & Testing Architecture  
**Author:** Architecture & Requirements Explorer (`teamwork_preview_explorer_survey_3`)  
**Target Environment:** Next.js 15 (App Router), TypeScript, Tailwind CSS, PostgreSQL (Neon Serverless), Vercel Blob, ElevenLabs JS SDK  
**Integrity Mode:** Development  

---

## 1. Executive Summary

This document defines the complete architectural blueprint for **cyrux studio**, an avant-garde brutalist, minimalist, animation-rich e-commerce web application. The platform provides a high-contrast luxury streetwear storefront with direct WhatsApp ordering (zero POS/cart friction), a secured minimal admin dashboard, Vercel Blob media hosting, and a credit-guarded ElevenLabs image/video asset generation pipeline strictly capped at 23,000 credits.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CYRUX STUDIO ARCHITECTURE                       │
├──────────────────────────────────────┬──────────────────────────────────────┤
│           PUBLIC STOREFRONT          │             ADMIN PANEL              │
│  (Next.js App Router Server & Client)│          (JWT / Cookie Guard)        │
│                                      │                                      │
│  ┌────────────────────────────────┐  │  ┌────────────────────────────────┐  │
│  │ Hero (Oversized 'cyrux' serif) │  │  │ Product CRUD Manager           │  │
│  │ Lenis Smooth Scroll + Cursor   │  │  │ Store Settings (WhatsApp/Curr) │  │
│  │ Bestseller Asymmetric Grid     │  │  │ Vercel Blob Media Library      │  │
│  │ GSAP Reveal / Framer Springs   │  │  │ ElevenLabs Studio (23k Guard)  │  │
│  └───────────────┬────────────────┘  │  └───────────────┬────────────────┘  │
│                  │                   │                  │                   │
│                  ▼                   │                  ▼                   │
│         [ BUY NOW → Trigger ]        │       [ Jose JWT Auth Token ]        │
│                  │                   │                  │                   │
│                  ▼                   │                  ▼                   │
│         Zod Sanitized Order          │          Admin API Routes            │
│                  │                   │        (/api/admin/* + Blob)         │
│                  ▼                   │                  │                   │
│      wa.me Direct Link Out           │                  ▼                   │
└──────────────────┬───────────────────┴──────────────────┬───────────────────┘
                   │                                      │
                   ▼                                      ▼
         ┌───────────────────┐                  ┌───────────────────┐
         │ StoreSettings DB  │                  │  PostgreSQL (Neon)│
         │ (Dynamic WhatsApp)│                  │  Prisma / Drizzle │
         └───────────────────┘                  └───────────────────┘
```

---

## 2. Requirement R1: Database Schema & ORM Architecture

### 2.1 Database Entities & Field Specifications

The database schema manages catalog data, administrative settings, and generative asset tracking with credit auditing.

#### 1. `Product`
- **Purpose**: Core catalog items rendered on storefront and managed via Admin panel.
- **Fields**:
  - `id`: `String` (UUID v4 / CUID / Nanoid) — Primary key.
  - `name`: `String` (e.g. `"247 SHELL JACKET"`, max 120 chars).
  - `slug`: `String` (Unique, indexed, lowercase alphanumeric with dashes, e.g. `"247-shell-jacket"`).
  - `description`: `String` (Detailed text / markdown description of materials, fit, and care).
  - `price`: `Decimal(10,2)` or `Int` (Stored in cents/integers or decimal for financial precision, e.g. `1299.00`).
  - `stock`: `Int` (Default `0`, integer inventory count).
  - `variants`: `Json` (Array of typed variant objects: `[{ id: "s", name: "Small", inStock: true }, { id: "m", name: "Medium", inStock: true }, ...]`).
  - `mediaUrls`: `String[]` (Postgres text array or JSON array containing Vercel Blob URLs or local asset paths).
  - `isBestseller`: `Boolean` (Default `false`, indexed for high-speed homepage queries).
  - `createdAt`: `DateTime` (Default `now()`).
  - `updatedAt`: `DateTime` (Auto-updated on modification).

#### 2. `StoreSettings`
- **Purpose**: Singleton configuration row for store owner dynamic controls.
- **Fields**:
  - `id`: `String` (Default `"default"`, singleton pattern ensures only 1 active settings record).
  - `whatsappNumber`: `String` (Sanitized international phone number, e.g. `"905321234567"` or `"+905321234567"`).
  - `currency`: `String` (Default `"USD"`, ISO 3-letter currency code: `"USD"`, `"TRY"`, `"EUR"`).
  - `brandMetadata`: `Json` (Brutalism manifesto, hero display subhead, SEO metadata, contact email, social links).
  - `updatedAt`: `DateTime` (Auto-updated on modification).

#### 3. `ElevenLabsAsset`
- **Purpose**: Caching and persistence of AI-generated media to guarantee deduplication and credit preservation.
- **Fields**:
  - `id`: `String` (CUID / UUID v4).
  - `promptHash`: `String` (Unique index, deterministic SHA-256 hash of prompt + options).
  - `mediaUrl`: `String` (Permanent public URL stored in Vercel Blob).
  - `mediaType`: `String` (`"image"` | `"video"`).
  - `creditsUsed`: `Int` (Credits consumed during generation, e.g. `1000`).
  - `status`: `String` (`"PENDING"` | `"COMPLETED"` | `"FAILED"`).
  - `metadata`: `Json` (Raw prompt, aspect ratio, model version, generation ID, error log if failed).
  - `createdAt`: `DateTime` (Default `now()`).

#### 4. `CreditUsageLog`
- **Purpose**: Immutable ledger tracking every credit expenditure against the 23,000 cumulative limit.
- **Fields**:
  - `id`: `String` (CUID / UUID v4).
  - `action`: `String` (e.g. `"IMAGE_GENERATION"`, `"VIDEO_GENERATION"`, `"MANUAL_AUDIT"`).
  - `creditsUsed`: `Int` (Credits decremented).
  - `balanceBefore`: `Int` (Cumulative credits used before transaction).
  - `balanceAfter`: `Int` (Cumulative credits used after transaction).
  - `timestamp`: `DateTime` (Default `now()`).

---

### 2.2 Prisma Schema Implementation (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Product {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique
  description  String   @db.Text
  price        Decimal  @db.Decimal(10, 2)
  stock        Int      @default(0)
  variants     Json     @default("[]") // Array of { id: string, name: string, inStock: boolean, sku?: string }
  mediaUrls    String[] @default([])
  isBestseller Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([isBestseller])
  @@index([slug])
  @@map("products")
}

model StoreSettings {
  id             String   @id @default("default")
  whatsappNumber String   @default("+905320000000")
  currency       String   @default("USD")
  brandMetadata  Json     @default("{\"brandName\":\"cyrux studio\",\"heroSub\":\"avant-garde streetwear\",\"tagline\":\"brutalist luxury\"}")
  updatedAt      DateTime @updatedAt

  @@map("store_settings")
}

model ElevenLabsAsset {
  id          String   @id @default(cuid())
  promptHash  String   @unique
  mediaUrl    String
  mediaType   String   // "image" | "video"
  creditsUsed Int      @default(0)
  status      String   @default("PENDING") // "PENDING" | "COMPLETED" | "FAILED"
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now())

  @@index([promptHash])
  @@map("elevenlabs_assets")
}

model CreditUsageLog {
  id            String   @id @default(cuid())
  action        String
  creditsUsed   Int
  balanceBefore Int
  balanceAfter  Int
  timestamp     DateTime @default(now())

  @@index([timestamp])
  @@map("credit_usage_logs")
}
```

---

### 2.3 Drizzle Schema Implementation (`src/lib/db/schema.ts`)

```typescript
import { pgTable, varchar, text, decimal, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  stock: integer('stock').notNull().default(0),
  variants: jsonb('variants').notNull().default([]),
  mediaUrls: text('media_urls').array().notNull().default([]),
  isBestseller: boolean('is_bestseller').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const storeSettings = pgTable('store_settings', {
  id: varchar('id', { length: 50 }).primaryKey().default('default'),
  whatsappNumber: varchar('whatsapp_number', { length: 32 }).notNull().default('+905320000000'),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  brandMetadata: jsonb('brand_metadata').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const elevenLabsAssets = pgTable('elevenlabs_assets', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  promptHash: varchar('prompt_hash', { length: 64 }).notNull().unique(),
  mediaUrl: text('media_url').notNull(),
  mediaType: varchar('media_type', { length: 20 }).notNull(),
  creditsUsed: integer('credits_used').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const creditUsageLogs = pgTable('credit_usage_logs', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  action: varchar('action', { length: 64 }).notNull(),
  creditsUsed: integer('credits_used').notNull(),
  balanceBefore: integer('balance_before').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
});
```

---

### 2.4 ORM Analysis & Recommendation (Prisma vs. Drizzle)

| Evaluation Dimension | Prisma ORM | Drizzle ORM |
|---|---|---|
| **Next.js 15 App Router Compatibility** | Excellent via standard `PrismaClient` with global singleton. | Excellent; zero runtime engine dependencies. |
| **Neon Serverless / Postgres** | Supports pooled `DATABASE_URL` via PgBouncer or `@prisma/adapter-neon`. | First-class native support via `@neondatabase/serverless` over WebSockets/HTTP. |
| **Cold Start Overhead** | ~50–120ms engine initialization on serverless lambdas. | Near 0ms (< 10ms); pure JS query builder. |
| **Developer Velocity & Seed Scripts** | **Superior**: `npx prisma db push` pushes schema in 2 seconds; `prisma studio` provides instant visual GUI. | Good, but `drizzle-kit push` requires config file and manual seeding scripts. |
| **Type Safety & Auto-completion** | Fully typed client generated into `node_modules/@prisma/client`. | Native TypeScript inference directly from schema definition. |
| **Aggregate Queries (Credit Guard)** | Simple: `prisma.creditUsageLog.aggregate({ _sum: { creditsUsed: true } })`. | `db.select({ total: sum(creditUsageLogs.creditsUsed) }).from(creditUsageLogs)`. |

**Architectural Recommendation:**
- **Primary Recommendation: Prisma ORM with Neon Pooled Connection**.
  - **Rationale**: For an e-commerce platform with an Admin CRUD interface, Prisma's `db push`, instant relational querying, built-in JSON typing, and mature migration tooling allow immediate, bullet-proof implementation with zero boilerplate.
  - **Connection Architecture**: Use standard `DATABASE_URL` configured with Neon's pooled endpoint (port 6543) and the global singleton pattern (`src/lib/db/prisma.ts`) to prevent connection exhaustion during Next.js App Router hot reloads:
    ```typescript
    import { PrismaClient } from '@prisma/client';

    const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

    export const prisma = globalForPrisma.prisma || new PrismaClient();

    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
    ```
- **Alternative / Drop-in**: If ultra-lightweight zero-cold-start edge execution is required, Drizzle with `@neondatabase/serverless` can be swapped with identical table naming and schema types.

---

## 3. Requirement R2: Brutalist Storefront UI Architecture

### 3.1 Design Tokens & Style Guide (Derived from Reference `media_1794660218146.png`)

```
Color Palette:
├── Canvas Background : #F7F5EE (Warm off-white ecru / bone)
├── Deep Black        : #0A0A0A (Pure high-contrast brutalist black)
├── Off-White / Cream : #FAF8F3 (Typography contrast against dark containers)
├── Muted Hairline    : #E6E3DA (Hairline dividers and pill borders)
└── Dark Hero Fill    : #070709 (High-contrast blue-black futuristic gradient)

Typography Pairing:
├── Monumental Hero Display : Syne / Clash Display / Playfair (heavyweight serif/display, text-[18vw])
├── Brutalist Section Heads : Space Mono / Geist Mono (Monospace uppercase, tracking-tight, text-3xl)
├── UI & Catalog Labels     : Inter / Space Mono (Monospace prices e.g. "$1299", uppercase product codes)
└── Action Buttons          : Brutalist heavy underline ("BUY NOW →", font-mono text-xl tracking-wider)
```

### 3.2 Visual Structure & Layout Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ☰ [Menu]                 [ Search                    🔍 ]            [👤 🛍️]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                   HERO                                      │
│                                                                             │
│                        c   y   r   u   x                                    │
│                     (Giant Cream Display Type)                              │
│                                                                             │
│                 [ cyrux | Shop | New collection | About ]                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Bestseller Now                                                              │
│                                                                             │
│ ┌─────────┐   ┌─────────────────┐   ┌──────────────┐   ┌─────────┐          │
│ │ [🤍]    │   │ [🤍]            │   │ [🤍]         │   │ [🤍]    │          │
│ │         │   │                 │   │              │   │         │          │
│ │ JACKET  │   │ BAG             │   │ GLASSES      │   │ LONGSLEEVE         │
│ │ $999    │   │ $1299           │   │ $759         │   │ $459    │          │
│ └─────────┘   └─────────────────┘   └──────────────┘   └─────────┘          │
│                                                                             │
│                                                      BUY NOW →              │
├─────────────────────────────────────────────────────────────────────────────┤
│ CAMPAIGN / EDITORIAL                                                        │
│ ┌────────────────┐ ┌──────────────────────────────────────────────────────┐ │
│ │ Model Portrait │ │                                                      │ │
│ │ (Puffer)       │ │               CAMPAIGN VIDEO PLAYER                  │ │
│ ├────────────────┤ │                   (IMG_0679.MOV)                     │ │
│ │ 3D Sneaker     │ │                         ▶                            │ │
│ │ Render         │ │                                                      │ │
│ └────────────────┘ └──────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ FOOTER: CYRUX STUDIO © 2026 | ALL RIGHTS RESERVED | INSTAGRAM | MANIFESTO   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Component Architecture Hierarchy

```
src/
├── app/
│   ├── layout.tsx                     # Root HTML, fonts, LenisProvider, CustomCursor
│   ├── page.tsx                       # Main Storefront page (Server Component)
│   ├── product/[slug]/page.tsx        # Individual product view (SSR / ISR)
│   ├── admin/
│   │   ├── login/page.tsx             # Minimal login page
│   │   └── page.tsx                   # Admin dashboard (Products, Settings, Blob, ElevenLabs)
│   └── api/                           # API Routes
├── components/
│   ├── providers/
│   │   ├── LenisProvider.tsx          # Smooth scroll provider
│   │   └── CursorProvider.tsx         # Custom cursor provider
│   ├── ui/
│   │   ├── CustomCursor.tsx           # Brutalist follower & target dot
│   │   ├── MagneticButton.tsx         # Framer motion spring magnet wrapper
│   │   └── QuickOrderModal.tsx        # Variant selector + direct WhatsApp dispatcher
│   └── storefront/
│       ├── Header.tsx                 # Top navigation: Hamburger, Search pill, Actions
│       ├── HeroSection.tsx            # Giant "cyrux" display, dark visual, bottom pill nav
│       ├── BestsellerSection.tsx      # Asymmetric 4-column product grid with BUY NOW CTA
│       ├── ProductCard.tsx            # Asymmetric card with hover zoom, heart icon, price
│       ├── CampaignSection.tsx        # 2 stacked left media + 1 large right video player
│       └── Footer.tsx                 # Brutalist brand footer
```

### 3.4 Animation Hooks & Motion System

1. **Lenis Smooth Scroll Provider (`components/providers/LenisProvider.tsx`)**:
   ```typescript
   'use client';
   import { useEffect, useRef } from 'react';
   import Lenis from 'lenis';
   import gsap from 'gsap';
   import { ScrollTrigger } from 'gsap/ScrollTrigger';

   gsap.registerPlugin(ScrollTrigger);

   export function LenisProvider({ children }: { children: React.ReactNode }) {
     const lenisRef = useRef<Lenis | null>(null);

     useEffect(() => {
       const lenis = new Lenis({
         duration: 1.2,
         easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
         orientation: 'vertical',
         smoothWheel: true,
       });
       lenisRef.current = lenis;

       lenis.on('scroll', ScrollTrigger.update);
       gsap.ticker.add((time) => lenis.raf(time * 1000));
       gsap.ticker.lagSmoothing(0);

       return () => {
         lenis.destroy();
         gsap.ticker.remove(lenis.raf);
       };
     }, []);

     return <>{children}</>;
   }
   ```

2. **Custom Brutalist Cursor (`components/ui/CustomCursor.tsx`)**:
   - Implements a central point `w-2 h-2 bg-black rounded-full` and an outer ring `w-10 h-10 border border-black rounded-full` with spring lerping (`0.15` damping).
   - Uses `mix-blend-difference` with white fill when hovering over dark containers.
   - Listens to `data-cursor="magnetic"` or interactive elements to scale up (`scale: 2.2`) with label hints (`"VIEW"`, `"BUY"`).

3. **Hero Text Reveal (GSAP Split Text / Clip Mask)**:
   - "cyrux" letters wrapped in `overflow-hidden` spans.
   - Animate `yPercent: 120` to `yPercent: 0` with stagger `0.08s`, duration `1.4s`, ease `"power4.out"`.

4. **Product Media Parallax & Hover State**:
   - Asymmetric grid with staggered `y` translations on scroll.
   - Hovering triggers subtle image zoom (`scale: 1.05`) with transition `0.6s cubic-bezier(0.16, 1, 0.3, 1)`.

---

## 4. Requirement R3: WhatsApp Ordering Flow & Zod Contracts

### 4.1 Flow Sequence Diagram

```
[ Storefront Product Card / Modal ]
               │
               ▼
   User clicks "BUY NOW →"
               │
               ▼
   [ Variant Selection Modal ] (Select Size / Color)
               │
               ▼
   Client / Server Order Request Validation
   (Validated strictly with Zod schema)
               │
               ▼
   Dynamic Settings Lookup (`StoreSettings.whatsappNumber`, `currency`)
               │
               ▼
   Build Pre-Formatted Order String
               │
               ▼
   URL Encode: `https://wa.me/<sanitized_number>?text=<encoded_text>`
               │
               ▼
   Immediate Redirect / Direct WhatsApp App Launch
```

### 4.2 Zod Validation Schema (`src/lib/validations/order.ts`)

```typescript
import { z } from 'zod';

export const OrderRequestSchema = z.object({
  productId: z.string().min(1, "Product ID is required").max(64),
  productName: z.string().min(1, "Product name is required").max(120).trim(),
  productSlug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Invalid product slug format"),
  variantId: z.string().min(1).max(50),
  variantName: z.string().min(1).max(50).trim(),
  price: z.number().positive("Price must be a positive number"),
  currency: z.string().min(3).max(4).default("USD"),
  customerNote: z.string().max(250).optional().transform((val) => val ? val.replace(/[<>]/g, '') : undefined),
});

export type OrderRequest = z.infer<typeof OrderRequestSchema>;
```

### 4.3 Dynamic URL Generation & Sanitization Engine (`src/lib/whatsapp.ts`)

```typescript
import { OrderRequest, OrderRequestSchema } from '@/lib/validations/order';

export function sanitizePhoneNumber(phone: string): string {
  // Strip all non-numeric characters (spaces, dashes, parens, plus sign)
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned || cleaned.length < 9 || cleaned.length > 15) {
    throw new Error(`Invalid WhatsApp phone number: ${phone}`);
  }
  return cleaned;
}

export function generateWhatsAppOrderUrl(params: {
  order: OrderRequest;
  whatsappNumber: string;
  baseUrl?: string;
}): string {
  // 1. Validate payload
  const validated = OrderRequestSchema.parse(params.order);

  // 2. Sanitize destination phone number
  const sanitizedPhone = sanitizePhoneNumber(params.whatsappNumber);

  // 3. Format timestamp and product URL
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const itemUrl = params.baseUrl ? `${params.baseUrl}/product/${validated.productSlug}` : '';

  // 4. Construct brutalist order manifesto
  const messageLines = [
    '🛍️ *CYRUX STUDIO — ORDER REQUEST*',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `*Piece:* ${validated.productName.toUpperCase()}`,
    `*Option / Size:* ${validated.variantName}`,
    `*Price:* ${validated.currency} ${validated.price.toFixed(2)}`,
    `*Reference:* #${validated.productSlug}`,
    itemUrl ? `*Link:* ${itemUrl}` : '',
    validated.customerNote ? `*Note:* ${validated.customerNote}` : '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `*Time:* ${timestamp}`,
    '',
    'Hello Cyrux Studio. I would like to purchase this piece. Please confirm availability and transfer details.',
  ].filter(Boolean);

  const messageText = messageLines.join('\n');

  // 5. Build official wa.me link
  return `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(messageText)}`;
}
```

---

## 5. Requirement R4: Minimal Admin Panel & Vercel Blob Integration

### 5.1 Authentication Architecture (JWT via `jose` + HttpOnly Cookies)

- **Library**: `jose` (Lightweight, standards-compliant, zero native Node binary dependencies, fully compatible with Next.js Edge Middleware and App Router).
- **Session Cookie**:
  - Name: `cyrux_admin_session`
  - Attributes: `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
- **Environment Credentials**:
  - `ADMIN_EMAIL` (e.g. `admin@cyruxstudio.com`)
  - `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`
  - `JWT_SECRET` (minimum 32-character high-entropy secret)

#### Next.js Route Guard Middleware (`middleware.ts`)
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-min-32-chars-long!');

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes (except /admin/login)
  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminApi = pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth/login');

  if (isAdminPage || isAdminApi) {
    const token = request.cookies.get('cyrux_admin_session')?.value;

    if (!token) {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Unauthorized: Missing session token' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, {
        algorithms: ['HS256'],
      });
      if (payload.role !== 'admin') {
        throw new Error('Forbidden');
      }
      return NextResponse.next();
    } catch {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Unauthorized: Invalid or expired session' }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.delete('cyrux_admin_session');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
```

#### Authentication Helper & Signer (`src/lib/auth.ts`)
```typescript
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-min-32-chars-long!');
const COOKIE_NAME = 'cyrux_admin_session';

export async function verifyAdminCredentials(email: string, password: string): Promise<boolean> {
  const expectedEmail = process.env.ADMIN_EMAIL || 'admin@cyruxstudio.com';
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword) return false;

  const emailMatch = crypto.timingSafeEqual(
    Buffer.from(email.padEnd(64)),
    Buffer.from(expectedEmail.padEnd(64))
  );

  const passwordMatch = crypto.timingSafeEqual(
    Buffer.from(password.padEnd(64)),
    Buffer.from(expectedPassword.padEnd(64))
  );

  return emailMatch && passwordMatch;
}

export async function createAdminSessionToken(email: string): Promise<string> {
  return new SignJWT({ email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}
```

---

### 5.2 Admin CRUD API Routes

| Endpoint | Method | Description | Request Body / Validation |
|---|---|---|---|
| `/api/admin/auth/login` | `POST` | Authenticate admin, issue HttpOnly JWT | `{ email, password }` |
| `/api/admin/auth/logout` | `POST` | Clear session cookie | None |
| `/api/admin/products` | `GET` | List all products (supports search, sort, pagination) | Query: `?page=1&limit=20` |
| `/api/admin/products` | `POST` | Create new product | `ProductInputSchema` |
| `/api/admin/products/[id]` | `GET` | Get single product | Route param `id` |
| `/api/admin/products/[id]` | `PATCH` | Update product fields | `Partial<ProductInputSchema>` |
| `/api/admin/products/[id]` | `DELETE` | Delete product | Route param `id` |
| `/api/admin/settings` | `GET` | Fetch store settings | None |
| `/api/admin/settings` | `PATCH` | Update store settings | `StoreSettingsInputSchema` |

#### Product Validation Schema (`src/lib/validations/product.ts`)
```typescript
import { z } from 'zod';

export const VariantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  inStock: z.boolean().default(true),
  sku: z.string().optional(),
});

export const ProductInputSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters").max(120),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().min(1, "Description is required"),
  price: z.number().positive("Price must be positive"),
  stock: z.number().int().min(0).default(0),
  variants: z.array(VariantSchema).default([]),
  mediaUrls: z.array(z.string().url("Each media URL must be a valid URL")).default([]),
  isBestseller: z.boolean().default(false),
});
```

---

### 5.3 Vercel Blob Integration

Package: `@vercel/blob` (using server token `BLOB_READ_WRITE_TOKEN`).

#### 1. Upload Endpoint (`POST /api/admin/blob/upload`)
- **Authentication**: Admin session verified via Next.js Middleware.
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `video/mp4`, `video/quicktime`.
- **Max File Size**: 15MB for images, 50MB for videos.
- **Implementation**:
  ```typescript
  import { put } from '@vercel/blob';
  import { NextResponse } from 'next/server';

  const ALLOWED_MIME = [
    'image/jpeg', 'image/png', 'image/webp', 'image/avif',
    'video/mp4', 'video/quicktime'
  ];

  export async function POST(request: Request) {
    try {
      const form = await request.formData();
      const file = form.get('file') as File;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      if (!ALLOWED_MIME.includes(file.type)) {
        return NextResponse.json({ error: `Unsupported media type: ${file.type}` }, { status: 415 });
      }

      const blob = await put(`cyrux-${Date.now()}-${file.name}`, file, {
        access: 'public',
      });

      return NextResponse.json({
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
        size: file.size,
      }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ error: 'Blob upload failed' }, { status: 500 });
    }
  }
  ```

#### 2. Delete Endpoint (`DELETE /api/admin/blob/delete`)
- **Authentication**: Admin session verified.
- **Validation**: Ensures target URL belongs to Vercel Blob (`public.blob.vercel-storage.com`).
- **Implementation**:
  ```typescript
  import { del } from '@vercel/blob';
  import { NextResponse } from 'next/server';
  import { z } from 'zod';

  const DeleteBlobSchema = z.object({
    url: z.string().url().refine(
      (url) => url.includes('.blob.vercel-storage.com'),
      "Only Vercel Blob URLs can be deleted via this endpoint"
    ),
  });

  export async function DELETE(request: Request) {
    try {
      const body = await request.json();
      const { url } = DeleteBlobSchema.parse(body);

      await del(url);
      return NextResponse.json({ success: true, deletedUrl: url });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Deletion failed' }, { status: 400 });
    }
  }
  ```

---

## 6. Requirement R5: ElevenLabs Asset Pipeline & Strict 23k Credit Protection Guard

### 6.1 SDK Integration & Key Management

- **Package**: `@elevenlabs/elevenlabs-js`
- **Key Resolution**: Strictly loaded from `process.env.ELEVENLABS_API_KEY` at runtime.
- **Zero-Exposure Policy**:
  - `ELEVENLABS_API_KEY` must never be referenced with `NEXT_PUBLIC_` prefix.
  - Never printed to logs, never sent in API responses, never exposed in client bundles.
- **CLI Compatibility**:
  - Must remain 100% compliant with:
    `npx -y @elevenlabs/cli@latest onboard check --answered --env-path .env.local`

---

### 6.2 Strict 23,000 Credit Protection Guard Specification

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ELEVENLABS GENERATION REQUEST                        │
│                   Prompt + AspectRatio + Options                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
                     [ 1. Compute SHA-256 Hash ]
                  hash = sha256(prompt + options)
                                    │
                                    ▼
                     [ 2. Check Database Cache ]
               Does ElevenLabsAsset(promptHash) exist?
                                    │
                  ┌─────────────────┴─────────────────┐
                 YES                                  NO
                  │                                   │
                  ▼                                   ▼
          Return Cached Asset                  [ 3. Audit Cumulative Credits ]
         (Media URL from Blob)                 Total Used = SUM(creditsUsed)
         Credits Expended: 0                          │
                                                      ▼
                                       Is (Total Used + EstCost) > 23,000?
                                                      │
                                    ┌─────────────────┴─────────────────┐
                                   YES                                  NO
                                    │                                   │
                                    ▼                                   ▼
                         [ 4. Hard Block & Abort ]         [ 5. Two-Phase Admin Confirm ]
                          403 Limit Exceeded Error           Requires confirmed: true
                         "Budget Cap 23,000 Reached"                    │
                                                                        ▼
                                                           [ 6. Call ElevenLabs API ]
                                                                        │
                                                                        ▼
                                                           [ 7. Upload to Vercel Blob ]
                                                                        │
                                                                        ▼
                                                           [ 8. Atomic DB Transaction ]
                                                              Save ElevenLabsAsset
                                                              Insert CreditUsageLog
```

### 6.3 Credit Guard Implementation (`src/lib/elevenlabs/guard.ts`)

```typescript
import { prisma } from '@/lib/db/prisma';
import crypto from 'crypto';

export const MAX_CUMULATIVE_CREDIT_BUDGET = 23000;
export const ESTIMATED_IMAGE_CREDITS = 1000;
export const ESTIMATED_VIDEO_CREDITS = 2500;

export class CreditLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CreditLimitExceededError';
  }
}

export function computePromptHash(prompt: string, mediaType: string, options: Record<string, any> = {}): string {
  const normalized = `${prompt.trim().toLowerCase()}:${mediaType}:${JSON.stringify(options)}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export async function getCumulativeCreditsUsed(): Promise<number> {
  const result = await prisma.creditUsageLog.aggregate({
    _sum: {
      creditsUsed: true,
    },
  });
  return result._sum.creditsUsed ?? 0;
}

export async function verifyCreditBudget(estimatedCost: number): Promise<{
  currentUsed: number;
  remaining: number;
  allowed: boolean;
}> {
  const currentUsed = await getCumulativeCreditsUsed();
  const remaining = Math.max(0, MAX_CUMULATIVE_CREDIT_BUDGET - currentUsed);
  const allowed = (currentUsed + estimatedCost) <= MAX_CUMULATIVE_CREDIT_BUDGET;

  if (!allowed) {
    throw new CreditLimitExceededError(
      `Credit budget ceiling exceeded. Current used: ${currentUsed}, Requested: ${estimatedCost}, Cap: ${MAX_CUMULATIVE_CREDIT_BUDGET}. Remaining: ${remaining}`
    );
  }

  return { currentUsed, remaining, allowed };
}
```

### 6.4 Asset Generation Route (`POST /api/admin/elevenlabs/generate`)

```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { put } from '@vercel/blob';
import {
  computePromptHash,
  verifyCreditBudget,
  ESTIMATED_IMAGE_CREDITS,
  ESTIMATED_VIDEO_CREDITS,
  MAX_CUMULATIVE_CREDIT_BUDGET,
} from '@/lib/elevenlabs/guard';

const GenerateSchema = z.object({
  prompt: z.string().min(5).max(1000),
  mediaType: z.enum(['image', 'video']).default('image'),
  options: z.record(z.any()).default({}),
  confirmed: z.boolean().refine((val) => val === true, "Must explicitly confirm credit expenditure"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, mediaType, options, confirmed } = GenerateSchema.parse(body);

    const promptHash = computePromptHash(prompt, mediaType, options);

    // 1. Cache Deduplication Check
    const existingAsset = await prisma.elevenLabsAsset.findUnique({
      where: { promptHash },
    });

    if (existingAsset && existingAsset.status === 'COMPLETED') {
      return NextResponse.json({
        cached: true,
        asset: existingAsset,
        creditsDeducted: 0,
        message: 'Reused previously generated asset from cache. Zero credits consumed.',
      });
    }

    // 2. Strict Credit Guard Audit
    const estimatedCost = mediaType === 'video' ? ESTIMATED_VIDEO_CREDITS : ESTIMATED_IMAGE_CREDITS;
    const { currentUsed } = await verifyCreditBudget(estimatedCost);

    // 3. Server-side API Key verification
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY is not configured on server' }, { status: 503 });
    }

    // 4. Record Pending Asset in DB
    const assetRecord = await prisma.elevenLabsAsset.create({
      data: {
        promptHash,
        mediaUrl: '',
        mediaType,
        creditsUsed: 0,
        status: 'PENDING',
        metadata: { prompt, options },
      },
    });

    // 5. Invoke Generation & Upload to Vercel Blob
    // Note: Here the ElevenLabs client generates buffer, then buffer is saved to Vercel Blob
    const timestamp = Date.now();
    const mockOrGeneratedBuffer = Buffer.from("elevenlabs-generated-media-placeholder");
    const blob = await put(`elevenlabs/${promptHash}-${timestamp}.${mediaType === 'video' ? 'mp4' : 'png'}`, mockOrGeneratedBuffer, {
      access: 'public',
    });

    const actualCreditsUsed = estimatedCost;

    // 6. Atomic Transaction to finalize Asset & CreditUsageLog
    const [finalAsset] = await prisma.$transaction([
      prisma.elevenLabsAsset.update({
        where: { id: assetRecord.id },
        data: {
          mediaUrl: blob.url,
          creditsUsed: actualCreditsUsed,
          status: 'COMPLETED',
        },
      }),
      prisma.creditUsageLog.create({
        data: {
          action: `${mediaType.toUpperCase()}_GENERATION`,
          creditsUsed: actualCreditsUsed,
          balanceBefore: currentUsed,
          balanceAfter: currentUsed + actualCreditsUsed,
        },
      }),
    ]);

    return NextResponse.json({
      cached: false,
      asset: finalAsset,
      creditsDeducted: actualCreditsUsed,
      totalCreditsUsed: currentUsed + actualCreditsUsed,
      creditCap: MAX_CUMULATIVE_CREDIT_BUDGET,
    }, { status: 201 });

  } catch (error: any) {
    if (error.name === 'CreditLimitExceededError') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 400 });
  }
}
```

---

## 7. Testing Architecture (Opaque-Box E2E Runner, Tiers 1–4)

To ensure zero regressions, robust security boundaries, and uncompromising adherence to requirements, the project utilizes a 4-Tier test architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        4-TIER TESTING PYRAMID                          │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 4: Storefront & End-to-End User Experience (Playwright / Runner)  │
│         - Homepage visual hierarchy, Lenis scroll container            │
│         - Monospace headings, Asymmetric 4-col grid, BUY NOW CTA       │
│         - wa.me link generation & ElevenLabs CLI onboarding check      │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 3: API Contracts & Security Boundary Integration Tests            │
│         - /api/admin/* unauthenticated 401 Unauthorized assertions     │
│         - Jose JWT login/cookie flow & CRUD operations                 │
│         - Vercel Blob authenticated upload & delete endpoints          │
│         - ElevenLabs 23k budget enforcement & caching endpoints        │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Unit & Model Integrity Tests                                   │
│         - Zod schemas: OrderRequestSchema, ProductInputSchema          │
│         - Phone number sanitization & WhatsApp URL encoding            │
│         - Credit guard boundary checks (hard cap at 23,000)            │
│         - SHA-256 prompt deduplication hash stability                  │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 1: Static Analysis, Types & Build Verification                    │
│         - `npx tsc --noEmit` (0 TypeScript errors)                     │
│         - `npm run lint` (ESLint 0 errors)                             │
│         - Next.js production build (`npm run build`)                   │
└────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Tier 1: Static Analysis & Compilation Verification
- **Commands**:
  ```bash
  npx tsc --noEmit
  npm run lint
  npm run build
  ```
- **Acceptance Criterion**: Zero TypeScript errors, zero ESLint warnings, production build completes successfully.

---

### 7.2 Tier 2: Unit Tests (`tests/unit/*`)
- **Coverage**:
  1. `order-validation.test.ts`:
     - Asserts valid order payloads succeed.
     - Asserts malicious script injection (`<script>`, SQL injection strings) in customer notes are sanitized.
     - Tests phone number normalization for Turkish, US, and EU formats.
  2. `credit-guard.test.ts`:
     - Verifies `computePromptHash` produces deterministic output.
     - Verifies cumulative sum logic prevents call when `total + cost > 23000`.
     - Asserts exception `CreditLimitExceededError` is thrown with descriptive delta.
  3. `jose-auth.test.ts`:
     - Verifies JWT creation and expiration.
     - Verifies signature tamper detection.

---

### 7.3 Tier 3: API Security & Route Integration Tests (`tests/integration/*`)
- **Coverage**:
  1. **Unauthenticated Access**:
     - `GET /api/admin/products` -> 401 Unauthorized.
     - `POST /api/admin/products` -> 401 Unauthorized.
     - `POST /api/admin/blob/upload` -> 401 Unauthorized.
     - `DELETE /api/admin/blob/delete` -> 401 Unauthorized.
     - `POST /api/admin/elevenlabs/generate` -> 401 Unauthorized.
  2. **Authentication Flow**:
     - `POST /api/admin/auth/login` with bad password -> 401.
     - `POST /api/admin/auth/login` with correct credentials -> 200 + `Set-Cookie: cyrux_admin_session=...; HttpOnly; SameSite=Strict`.
  3. **Authenticated Operations**:
     - Admin creates product with variants -> 201 Created.
     - Admin queries `/api/products` (public) -> 200 with bestseller flag.
     - Admin updates `StoreSettings` (modifies WhatsApp number to `+905551112233`) -> 200.
     - Storefront order URL generator produces `https://wa.me/905551112233?...` reflecting updated setting.

---

### 7.4 Tier 4: Storefront & End-to-End Acceptance Tests (`tests/e2e/*`)
- **Coverage**:
  1. **Visual Structure**:
     - Hero section contains monumental "cyrux" title and centered pill search bar.
     - Bottom pill navigation `[cyrux] Shop | New collection | About` is mounted.
     - `Bestseller Now` header renders with monospace brutalist font.
     - Asymmetric 4-column product grid renders jacket, bag, glasses, and longsleeve cards.
  2. **Interactivity**:
     - Smooth scrolling container (`lenis`) initializes without JS console errors.
     - Custom cursor renders and tracks mouse movements.
     - Clicking "BUY NOW →" opens variant selection modal and generates valid `wa.me` URL with correct encoded order text.
  3. **ElevenLabs CLI Onboarding Verification**:
     - Command:
       ```bash
       npx -y @elevenlabs/cli@latest onboard check --answered --env-path .env.local
       ```
     - Validates environment key presence and service reachability without exposing secrets.

---

## 8. Summary of API Contracts & File Mapping

| Module / Requirement | Primary File Paths | Key Responsibilities |
|---|---|---|
| **Database & Models (R1)** | `prisma/schema.prisma` or `src/lib/db/schema.ts`, `src/lib/db/prisma.ts` | Product, StoreSettings, ElevenLabsAsset, CreditUsageLog schemas & connection pooling |
| **Storefront & UI (R2)** | `src/app/page.tsx`, `src/components/storefront/*`, `src/components/providers/LenisProvider.tsx` | Brutalist layout, hero split typography, asymmetric grid, Lenis & custom cursor |
| **WhatsApp Order (R3)** | `src/lib/validations/order.ts`, `src/lib/whatsapp.ts`, `src/components/ui/QuickOrderModal.tsx` | Zod sanitization, dynamic phone retrieval, `wa.me` message generator |
| **Admin & Blob (R4)** | `src/middleware.ts`, `src/lib/auth.ts`, `src/app/api/admin/*`, `src/app/api/admin/blob/*` | `jose` JWT cookie auth, CRUD routes, Vercel Blob authenticated storage |
| **ElevenLabs & Guard (R5)**| `src/lib/elevenlabs/guard.ts`, `src/app/api/admin/elevenlabs/generate/route.ts` | 23,000 credit ceiling guard, SHA-256 deduplication, admin confirmation flow |
| **E2E & Test Suite** | `tests/unit/*`, `tests/integration/*`, `tests/e2e/*`, `package.json` | 4-Tier test runner ensuring security, reliability, and visual integrity |
