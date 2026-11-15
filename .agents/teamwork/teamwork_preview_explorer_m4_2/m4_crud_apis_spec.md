# Milestone 4 Specification: Admin CRUD API Routes & Resilient Database Integration

**Author**: Explorer 2 (`teamwork_preview_explorer`)  
**Milestone**: M4: Secure Minimal Admin Panel & Vercel Blob  
**Target Working Directory**: `/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m4_2`  
**Date**: 2026-11-14  

---

## 1. Executive Summary & Architectural Context

Milestone 4 establishes the administrative backbone of **cyrux studio**, enabling full lifecycle management of luxury streetwear products and dynamic store configurations without manual database intervention.

This specification details:
1. **Product CRUD Endpoints**:
   - `GET /api/admin/products`: Paginated, filterable catalog query (by category, stock status, bestseller status, search terms).
   - `POST /api/admin/products`: Validated product creation with Zod input sanitization, generating HTTP 201 responses.
   - `GET /api/admin/products/[id]`: Dual lookup by cuid `id` or unique `slug`, returning HTTP 404 when absent.
   - `PUT / PATCH /api/admin/products/[id]`: Partial or full updates with strict price and slug constraints.
   - `DELETE /api/admin/products/[id]`: Product removal returning `{ success: true, deletedId }`.
2. **Store Settings Endpoints**:
   - `GET /api/admin/settings`: Unified retrieval of store name, WhatsApp contact number, active currency, brand bio, and social links.
   - `PUT / POST /api/admin/settings`: Validated update of store configuration with E.164 phone validation and currency whitelisting.
3. **Resilient Database Layer (`src/lib/db.ts`)**:
   - Seamless dual-mode execution: Native pooled connection to Neon Serverless PostgreSQL when `DATABASE_URL` is configured, with zero-downtime, transparent fallback to the hot-reload safe in-memory Prisma client proxy when unconfigured or unreachable.
4. **Zod Validation Schemas (`src/lib/validations.ts`)**:
   - Type-safe, XSS-sanitized validators matching all assertions in `tests/tier1-feature/f14-admin-crud.ts` and `f15-store-settings.ts`.

---

## 2. Test Contract Analysis & Behavioral Invariants

The API routes must strictly satisfy all existing automated test suites in `tests/tier1-feature/f14-admin-crud.ts`, `f15-store-settings.ts`, and downstream cross-tier combinations (`tests/tier3-combination/cross-feature-combinations.ts` and `tests/tier4-scenario/real-world-workloads.ts`).

### 2.1 Feature 14 Contracts (`tests/tier1-feature/f14-admin-crud.ts`)

| Test ID | Scenario | Expected Input / Action | Asserted Invariant & Error Message |
|---------|----------|-------------------------|------------------------------------|
| **14.1** | Create valid product drop | `name`, `slug`, `price: 420.0`, `stock: 25`, `variants: [{size: 'M', stock: 15}]`, `mediaUrls: [...]`, `isBestseller: true` | Creates product, assigns `id`, returns created object, HTTP 201. |
| **14.2** | Reject invalid slug | Slug containing uppercase or spaces: `"Invalid Slug With Spaces!"` | Throws / returns HTTP 400 with exact error: `"Slug must be URL-safe lowercase with hyphens"`. Regex: `/^[a-z0-9-]+$/`. |
| **14.3** | Seamless update | Partial update of `price`, `stock`, `isBestseller` | Updates fields without overwriting unchanged attributes. Price must be `> 0` (error: `"Price must be positive"`). |
| **14.4** | Delete existing product | Valid `id` | Removes from database, returns `{ success: true, deletedId }`. |
| **14.5** | Delete non-existent product | Non-existent ID e.g. `'non-existent-id'` | Throws / returns HTTP 404 with message containing `"not found"`. |

### 2.2 Feature 15 Contracts (`tests/tier1-feature/f15-store-settings.ts`)

| Test ID | Scenario | Expected Input / Action | Asserted Invariant & Error Message |
|---------|----------|-------------------------|------------------------------------|
| **15.1** | Retrieve default settings | GET request | Default WhatsApp number (e.g. `+905320000000` / `+905551234567`), currency `'USD'`, storeName `'cyrux studio'`. |
| **15.2** | Update WhatsApp number | Valid E.164 string: `+905559876543` | Cleans whitespace/dashes/parentheses, matches `/^\+\d{10,15}$/`, updates database, returns updated settings. |
| **15.3** | Reject invalid phone | Missing `+` or country code: `'05320000000'` or `'invalid-text'` | Throws / returns HTTP 400 with exact error containing `"valid E.164"` (`"whatsappNumber must be a valid E.164 formatted number starting with +"`). |
| **15.4** | Switch currency | `'EUR'` or `'try'` (case-insensitive) | Uppercases to `'TRY'`, updates database, returns updated settings. |
| **15.5** | Reject unsupported currency | `'BITCOIN'`, `'XYZ'` | Throws / returns HTTP 400 with exact error containing `"currency must be one of: USD, EUR, TRY, GBP"`. |

### 2.3 Cross-Feature & Real-World Contracts (T3.1, T3.4, T3.5, T4.1, T4.2)
- **T3.1 & T4.2**: Updating store settings via `/api/admin/settings` must immediately alter the currency and recipient phone used by `/api/order/whatsapp`.
- **T3.4**: When an admin marks `isBestseller: true` on a newly created product, it must immediately be returned in storefront queries.
- **T3.5**: Setting `stock: 0` must cause storefront queries to flag the product as out of stock.
- **T4.2**: Admin session authentication (`cyrux_admin_session` JWT cookie) guards all `/api/admin/*` routes. Unauthenticated requests must receive HTTP 401.

---

## 3. Schema & Data Normalization Strategy

### 3.1 Existing Prisma Schema (`prisma/schema.prisma`)
The existing database schema defines:
```prisma
model Product {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique
  description  String   @db.Text
  price        Float
  stock        Int      @default(0)
  variants     Json     // Array of variants: [{ id: "s", name: "S", inStock: true }]
  mediaUrls    String[] // Native Postgres string array for product gallery
  isBestseller Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([isBestseller])
  @@index([createdAt])
  @@map("products")
}

model StoreSettings {
  id             String   @id @default(cuid()) // Single row (e.g. "default")
  whatsappNumber String   // Target WhatsApp destination (e.g. "+905551234567")
  currency       String   @default("USD")
  brandMetadata  Json     // Title, description, social links, banner text
  updatedAt      DateTime @updatedAt

  @@map("store_settings")
}
```

### 3.2 Dual-Naming Normalization Strategy
The UI forms and client requests may use modern e-commerce aliases (`title` for `name`, `images` for `mediaUrls`, `badge` for `isBestseller`). To achieve 100% compatibility with both existing database tables and all UI components:

1. **Title / Name**:
   - Inbound: Accepts `title` OR `name`. (If `title` is supplied without `name`, `name` is assigned `title`).
   - Outbound: API responses include both `name` and `title` with identical values.
2. **Images / MediaUrls**:
   - Inbound: Accepts `images` OR `mediaUrls` (array of URL strings).
   - Outbound: API responses include both `mediaUrls` and `images`.
3. **Badge / Bestseller**:
   - Inbound: `isBestseller: boolean` OR `badge: string` (if `badge === "BESTSELLER"`, `isBestseller = true`).
   - Outbound: API responses include both `isBestseller: boolean` and `badge: "BESTSELLER" | null`.
4. **Category & Metadata**:
   - Inbound: `category` (e.g. `"t-shirts"`, `"hoodies"`, `"pants"`, `"outerwear"`, `"accessories"`), `metadata` (arbitrary object).
   - Persistence: Embedded cleanly into the `variants` JSON payload under `_metadata: { category, ... }` or directly on the product document in the in-memory mock store, preserving compatibility with PostgreSQL without requiring a destructive schema migration.
   - Outbound: `category` is exposed at the root level of the product object.

### 3.3 StoreSettings Mapping
- Top-level database columns: `whatsappNumber`, `currency`.
- JSON column `brandMetadata`: contains `storeName`, `brandName`, `title`, `tagline`, `brandBio`, `description`, `socialLinks`, `socialHandles`.
- On `GET /api/admin/settings`: Returns a flattened, highly ergonomic JSON payload:
  ```json
  {
    "success": true,
    "settings": {
      "storeName": "cyrux studio",
      "whatsappNumber": "+905551234567",
      "currency": "USD",
      "brandBio": "wearable art & brutalist luxury",
      "socialLinks": {
        "instagram": "https://instagram.com/cyruxstudio",
        "twitter": "https://x.com/cyruxstudio",
        "tiktok": "https://tiktok.com/@cyruxstudio"
      },
      "brandMetadata": { ... },
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  }
  ```

---

## 4. API Endpoints Specification

### 4.1 `GET /api/admin/products`
- **File**: `src/app/api/admin/products/route.ts`
- **Method**: `GET`
- **Authentication**: Required (`cyrux_admin_session` cookie verified by Edge Middleware or route helper).
- **Query Parameters**:
  - `category` *(optional, string)*: Filter products by category (case-insensitive match against product category or name).
  - `stock` *(optional, string)*:
    - `"in_stock"` / `"available"`: `stock > 0`
    - `"out_of_stock"` / `"depleted"`: `stock <= 0`
    - Numeric string (e.g. `"10"`): filter by threshold.
  - `bestseller` *(optional, `"true"` | `"false"`)*: Filter by `isBestseller`.
  - `search` / `q` *(optional, string)*: Substring search across `name`, `slug`, and `description`.
  - `limit` *(optional, integer, default 50, max 100)*: Pagination page size.
  - `offset` *(optional, integer, default 0)*: Pagination offset.
  - `orderBy` *(optional, string, default `"createdAt_desc"`)*: `"createdAt_desc"`, `"createdAt_asc"`, `"price_asc"`, `"price_desc"`, `"name_asc"`.

- **Implementation Logic**:
  ```ts
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category")?.toLowerCase();
  const stockFilter = searchParams.get("stock")?.toLowerCase();
  const bestseller = searchParams.get("bestseller");
  const q = searchParams.get("search") || searchParams.get("q");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

  // Build where filter
  const where: any = {};
  if (bestseller !== null && bestseller !== undefined) {
    where.isBestseller = bestseller === "true";
  }
  if (stockFilter === "in_stock" || stockFilter === "available") {
    where.stock = { gt: 0 };
  } else if (stockFilter === "out_of_stock" || stockFilter === "depleted") {
    where.stock = 0;
  }

  const rawProducts = await prisma.product.findMany({
    where,
    take: limit,
    skip: offset,
    orderBy: { createdAt: "desc" },
  });

  // Client-side filtering for category / search if not fully indexed in Prisma
  let products = rawProducts.map(normalizeProductResponse);
  if (category) {
    products = products.filter(p => 
      p.category?.toLowerCase() === category || 
      p.name.toLowerCase().includes(category)
    );
  }
  if (q) {
    const term = q.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.slug.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term)
    );
  }
  ```

- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "products": [
        {
          "id": "prod_1",
          "name": "PRETTY CHAOS TEE",
          "title": "PRETTY CHAOS TEE",
          "slug": "pretty-chaos-tee",
          "description": "Heavyweight 280 GSM cotton jersey oversized tee...",
          "price": 120.0,
          "stock": 45,
          "variants": [
            { "id": "pc-s", "name": "S", "inStock": true, "sku": "PC-TEE-S" },
            { "id": "pc-m", "name": "M", "inStock": true, "sku": "PC-TEE-M" }
          ],
          "mediaUrls": ["/assets/products/pretty-chaos-tee.png"],
          "images": ["/assets/products/pretty-chaos-tee.png"],
          "isBestseller": true,
          "badge": "BESTSELLER",
          "category": "t-shirts",
          "createdAt": "2026-01-01T00:00:00.000Z",
          "updatedAt": "2026-01-01T00:00:00.000Z"
        }
      ],
      "total": 5
    }
    ```

---

### 4.2 `POST /api/admin/products`
- **File**: `src/app/api/admin/products/route.ts`
- **Method**: `POST`
- **Authentication**: Required.
- **Request Body**:
  ```json
  {
    "title": "CYRUX SCULPTURAL JACKET",
    "slug": "cyrux-sculptural-jacket",
    "price": 420.0,
    "description": "Tailored brutalist silhouette jacket with liquid metal closures.",
    "images": ["https://blob.vercel.com/jacket-1.webp"],
    "category": "outerwear",
    "stock": 25,
    "variants": [
      { "size": "M", "stock": 15 },
      { "size": "L", "stock": 10 }
    ],
    "badge": "BESTSELLER",
    "isBestseller": true,
    "metadata": { "releaseSeason": "Chapter 00" }
  }
  ```
- **Validation Rules (via `adminProductCreateSchema`)**:
  1. `name` / `title`: Non-empty string, min 1 char, max 200 chars. Sanitized against dangerous HTML injection. Error: `"Name is required"`.
  2. `slug`: String, regex `/^[a-z0-9-]+$/`. Error: `"Slug must be URL-safe lowercase with hyphens"`.
  3. `price`: Number, `> 0`, finite. Error: `"Price must be greater than zero"`.
  4. `stock`: Integer, `>= 0`. Error: `"Stock must be >= 0"`.
  5. `variants`: Array of variant items (either `{ size: string, stock: number }` or `{ id: string, name: string, inStock: boolean, sku?: string }`). Default: `[]`.
  6. `mediaUrls` / `images`: Array of string URLs. Default: `[]`.
  7. `isBestseller`: Boolean, default `false`.
  8. `description`: String, default `""`.
  9. `category`: String, optional.
  10. `metadata`: Record, optional.

- **Implementation Logic**:
  1. Parse request JSON. If malformed, return HTTP 400 `{ success: false, error: "Invalid JSON in request body" }`.
  2. Validate with `adminProductCreateSchema.safeParse(body)`. If invalid, return HTTP 400 with first error message.
  3. Check slug uniqueness: `await prisma.product.findUnique({ where: { slug: data.slug } })`. If exists, return HTTP 409 `{ success: false, error: "Product with this slug already exists" }`.
  4. Create product via Prisma:
     ```ts
     const created = await prisma.product.create({
       data: {
         name: data.name,
         slug: data.slug,
         description: data.description || "",
         price: data.price,
         stock: data.stock,
         variants: data.variants || [],
         mediaUrls: data.mediaUrls || [],
         isBestseller: Boolean(data.isBestseller || data.badge === "BESTSELLER"),
       },
     });
     ```
  5. Return HTTP 201 with `{ success: true, product: normalizeProductResponse(created) }`.

- **Responses**:
  - `201 Created`:
    ```json
    {
      "success": true,
      "product": {
        "id": "prod_1731600000000",
        "name": "CYRUX SCULPTURAL JACKET",
        "title": "CYRUX SCULPTURAL JACKET",
        "slug": "cyrux-sculptural-jacket",
        "price": 420.0,
        "stock": 25,
        "variants": [{ "size": "M", "stock": 15 }, { "size": "L", "stock": 10 }],
        "mediaUrls": ["https://blob.vercel.com/jacket-1.webp"],
        "images": ["https://blob.vercel.com/jacket-1.webp"],
        "isBestseller": true,
        "badge": "BESTSELLER",
        "description": "Tailored brutalist silhouette jacket with liquid metal closures.",
        "category": "outerwear",
        "createdAt": "2026-11-14T14:47:00.000Z",
        "updatedAt": "2026-11-14T14:47:00.000Z"
      }
    }
    ```
  - `400 Bad Request`:
    ```json
    {
      "success": false,
      "error": "Slug must be URL-safe lowercase with hyphens"
    }
    ```
  - `409 Conflict`:
    ```json
    {
      "success": false,
      "error": "Product with this slug already exists"
    }
    ```

---

### 4.3 `GET /api/admin/products/[id]`
- **File**: `src/app/api/admin/products/[id]/route.ts`
- **Method**: `GET`
- **Authentication**: Required.
- **Parameters**: `id` from route path. Note: in Next.js 15 App Router, `context.params` is an asynchronous Promise.
  ```ts
  type RouteContext = { params: Promise<{ id: string }> | { id: string } };
  const resolvedParams = await Promise.resolve(context.params);
  const { id } = resolvedParams;
  ```
- **Lookup Logic**:
  1. Try finding by unique ID: `await prisma.product.findUnique({ where: { id } })`.
  2. If null, try finding by unique slug: `await prisma.product.findUnique({ where: { slug: id } })`.
  3. If still null, return HTTP 404 `{ success: false, error: "Product not found" }`.
- **Responses**:
  - `200 OK`: `{ success: true, product: normalizeProductResponse(product) }`
  - `404 Not Found`: `{ success: false, error: "Product not found" }`

---

### 4.4 `PUT / PATCH /api/admin/products/[id]`
- **File**: `src/app/api/admin/products/[id]/route.ts`
- **Method**: `PUT` or `PATCH`
- **Authentication**: Required.
- **Request Body**: Partial product update object.
  ```json
  {
    "price": 85.0,
    "stock": 35,
    "isBestseller": true
  }
  ```
- **Validation Rules (via `adminProductUpdateSchema`)**:
  - All fields optional.
  - If `price` provided: must be number `> 0`. Error: `"Price must be positive"`.
  - If `slug` provided: must match `/^[a-z0-9-]+$/`. Error: `"Slug must be URL-safe lowercase with hyphens"`.
  - If `stock` provided: integer `>= 0`. Error: `"Stock must be >= 0"`.
  - If `name` / `title` provided: non-empty string.
- **Implementation Logic**:
  1. Resolve `id` from `context.params`.
  2. Verify product exists:
     ```ts
     const existing = await prisma.product.findFirst({
       where: { OR: [{ id }, { slug: id }] },
     });
     if (!existing) {
       return NextResponse.json(
         { success: false, error: `Product ${id} not found` },
         { status: 404 }
       );
     }
     ```
  3. Parse and validate updates with `adminProductUpdateSchema.safeParse(body)`.
  4. If `slug` is being changed, verify no conflict with another product:
     ```ts
     if (updates.slug && updates.slug !== existing.slug) {
       const conflict = await prisma.product.findUnique({ where: { slug: updates.slug } });
       if (conflict && conflict.id !== existing.id) {
         return NextResponse.json(
           { success: false, error: "Product with this slug already exists" },
           { status: 409 }
         );
       }
     }
     ```
  5. Perform update:
     ```ts
     const updated = await prisma.product.update({
       where: { id: existing.id },
       data: updatePayload,
     });
     ```
  6. Return HTTP 200 `{ success: true, product: normalizeProductResponse(updated) }`.

- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "product": {
        "id": "prod_1",
        "name": "ARCHITECTURAL CAP",
        "price": 85.0,
        "stock": 35,
        "isBestseller": true,
        "updatedAt": "2026-11-14T14:48:00.000Z"
      }
    }
    ```
  - `400 Bad Request`: `{ success: false, error: "Price must be positive" }`
  - `404 Not Found`: `{ success: false, error: "Product non-existent-id not found" }`
  - `409 Conflict`: `{ success: false, error: "Product with this slug already exists" }`

---

### 4.5 `DELETE /api/admin/products/[id]`
- **File**: `src/app/api/admin/products/[id]/route.ts`
- **Method**: `DELETE`
- **Authentication**: Required.
- **Implementation Logic**:
  1. Resolve `id` from `context.params`.
  2. Check existence:
     ```ts
     const existing = await prisma.product.findFirst({
       where: { OR: [{ id }, { slug: id }] },
     });
     if (!existing) {
       return NextResponse.json(
         { success: false, error: `Product ${id} not found` },
         { status: 404 }
       );
     }
     ```
  3. Delete product:
     ```ts
     await prisma.product.delete({
       where: { id: existing.id },
     });
     ```
  4. Return HTTP 200:
     ```json
     {
       "success": true,
       "deletedId": existing.id,
       "message": "Product successfully deleted"
     }
     ```

- **Responses**:
  - `200 OK`: `{ success: true, deletedId: "prod_123", message: "Product successfully deleted" }`
  - `404 Not Found`: `{ success: false, error: "Product non-existent-id not found" }`

---

### 4.6 `GET /api/admin/settings`
- **File**: `src/app/api/admin/settings/route.ts`
- **Method**: `GET`
- **Authentication**: Required.
- **Implementation Logic**:
  1. Query database: `const record = await prisma.storeSettings.findFirst();`
  2. If record is null, use `INITIAL_STORE_SETTINGS` from `src/lib/seed-data.ts`.
  3. Extract and normalize fields:
     ```ts
     const brandMeta = (record?.brandMetadata as Record<string, any>) || INITIAL_STORE_SETTINGS.brandMetadata;
     const settings = {
       id: record?.id || "default",
       whatsappNumber: record?.whatsappNumber || INITIAL_STORE_SETTINGS.whatsappNumber,
       currency: record?.currency || INITIAL_STORE_SETTINGS.currency,
       storeName: brandMeta.storeName || brandMeta.brandName || brandMeta.title || "cyrux studio",
       brandBio: brandMeta.tagline || brandMeta.brandBio || brandMeta.description || "wearable art & brutalist luxury",
       socialLinks: brandMeta.socialLinks || brandMeta.socialHandles || {
         instagram: "https://instagram.com/cyruxstudio",
         twitter: "https://x.com/cyruxstudio",
         tiktok: "https://tiktok.com/@cyruxstudio",
       },
       brandMetadata: brandMeta,
       updatedAt: record?.updatedAt || new Date("2026-01-01T00:00:00Z"),
     };
     ```
  4. Return HTTP 200 with `{ success: true, settings }`.

- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "settings": {
        "storeName": "cyrux studio",
        "whatsappNumber": "+905320000000",
        "currency": "USD",
        "brandBio": "Brutalist Monolith",
        "socialLinks": {
          "instagram": "https://instagram.com/cyruxstudio",
          "twitter": "https://x.com/cyruxstudio",
          "tiktok": "https://tiktok.com/@cyruxstudio"
        },
        "brandMetadata": { ... },
        "updatedAt": "2026-01-01T00:00:00.000Z"
      }
    }
    ```

---

### 4.7 `PUT / POST /api/admin/settings`
- **File**: `src/app/api/admin/settings/route.ts`
- **Method**: `PUT` or `POST`
- **Authentication**: Required.
- **Request Body**:
  ```json
  {
    "whatsappNumber": "+905559876543",
    "currency": "EUR",
    "storeName": "cyrux studio",
    "brandBio": "Brutalist Monolith",
    "socialLinks": {
      "instagram": "https://instagram.com/cyruxstudio",
      "twitter": "https://x.com/cyruxstudio"
    }
  }
  ```
- **Validation Rules (via `adminStoreSettingsUpdateSchema`)**:
  1. `whatsappNumber`:
     - Cleaned: remove spaces, hyphens, parentheses `[\s()-]`.
     - Validates regex: `/^\+\d{10,15}$/`.
     - Error: `"whatsappNumber must be a valid E.164 formatted number starting with +"`.
  2. `currency`:
     - Trimmed and normalized to uppercase.
     - Allowed set: `['USD', 'EUR', 'TRY', 'GBP']`.
     - Error: `"currency must be one of: USD, EUR, TRY, GBP"`.
  3. `storeName`: Optional string, max 100 chars.
  4. `brandBio`: Optional string, max 500 chars.
  5. `socialLinks`: Optional record of string URLs.
  6. `brandMetadata`: Optional record.

- **Implementation Logic**:
  ```ts
  const parsed = adminStoreSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message || "Invalid settings input" },
      { status: 400 }
    );
  }

  const { whatsappNumber, currency, storeName, brandBio, socialLinks, brandMetadata } = parsed.data;

  // Retrieve current settings
  const existing = await prisma.storeSettings.findFirst();
  const currentMeta = (existing?.brandMetadata as Record<string, any>) || INITIAL_STORE_SETTINGS.brandMetadata;

  const mergedMeta: Record<string, any> = {
    ...currentMeta,
    ...(storeName ? { storeName, brandName: storeName, title: storeName } : {}),
    ...(brandBio ? { tagline: brandBio, brandBio, description: brandBio } : {}),
    ...(socialLinks ? { socialLinks: { ...(currentMeta.socialLinks || {}), ...socialLinks } } : {}),
    ...(brandMetadata || {}),
  };

  const updated = await prisma.storeSettings.upsert({
    where: { id: existing?.id || "default" },
    create: {
      id: "default",
      whatsappNumber: whatsappNumber || existing?.whatsappNumber || INITIAL_STORE_SETTINGS.whatsappNumber,
      currency: currency || existing?.currency || INITIAL_STORE_SETTINGS.currency,
      brandMetadata: mergedMeta,
    },
    update: {
      ...(whatsappNumber ? { whatsappNumber } : {}),
      ...(currency ? { currency } : {}),
      brandMetadata: mergedMeta,
    },
  });
  ```

- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Store settings updated successfully",
      "settings": {
        "storeName": "cyrux studio",
        "whatsappNumber": "+905559876543",
        "currency": "EUR",
        "brandBio": "Brutalist Monolith",
        "socialLinks": { ... },
        "brandMetadata": { ... },
        "updatedAt": "2026-11-14T14:49:00.000Z"
      }
    }
    ```
  - `400 Bad Request`:
    ```json
    {
      "success": false,
      "error": "whatsappNumber must be a valid E.164 formatted number starting with +"
    }
    ```
    or
    ```json
    {
      "success": false,
      "error": "currency must be one of: USD, EUR, TRY, GBP"
    }
    ```

---

## 5. Zod Validation Engine Specifications (`src/lib/validations.ts`)

The following TypeScript code must be incorporated into `src/lib/validations.ts`:

```typescript
import { z } from "zod";

// =============================================================================
// Helper Sanitizers
// =============================================================================
export function sanitizeAdminText(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

// =============================================================================
// Feature 14: Product CRUD Zod Schemas
// =============================================================================

export const allowedSlugRegex = /^[a-z0-9-]+$/;

export const productVariantItemSchema = z.union([
  z.object({
    id: z.string().optional(),
    name: z.string(),
    inStock: z.boolean().default(true),
    sku: z.string().optional(),
    priceModifier: z.number().optional(),
  }),
  z.object({
    size: z.string(),
    stock: z.number().int().min(0, "Stock must be >= 0"),
  }),
]);

export const adminProductCreateSchema = z
  .object({
    name: z.string().trim().optional(),
    title: z.string().trim().optional(),
    slug: z
      .string({
        required_error: "Slug is required",
        invalid_type_error: "Slug must be a string",
      })
      .trim()
      .regex(allowedSlugRegex, "Slug must be URL-safe lowercase with hyphens"),
    price: z
      .number({
        required_error: "Price is required",
        invalid_type_error: "Price must be a number",
      })
      .refine((val) => val > 0, {
        message: "Price must be greater than zero",
      }),
    stock: z
      .number({
        required_error: "Stock is required",
        invalid_type_error: "Stock must be an integer",
      })
      .int("Stock must be an integer")
      .min(0, "Stock must be >= 0")
      .default(0),
    description: z.string().trim().default(""),
    variants: z.array(productVariantItemSchema).default([]),
    mediaUrls: z.array(z.string().trim()).default([]),
    images: z.array(z.string().trim()).optional(),
    isBestseller: z.boolean().default(false),
    badge: z.string().optional(),
    category: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine(
    (data) => Boolean((data.name && data.name.trim().length > 0) || (data.title && data.title.trim().length > 0)),
    {
      message: "Name is required",
      path: ["name"],
    }
  )
  .transform((data) => {
    const resolvedName = sanitizeAdminText(data.name || data.title || "");
    const resolvedMedia = data.mediaUrls.length > 0 ? data.mediaUrls : data.images || [];
    const isBestsellerResolved = Boolean(
      data.isBestseller || (data.badge && data.badge.toUpperCase() === "BESTSELLER")
    );
    return {
      ...data,
      name: resolvedName,
      title: resolvedName,
      mediaUrls: resolvedMedia,
      images: resolvedMedia,
      isBestseller: isBestsellerResolved,
    };
  });

export const adminProductUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Name cannot be empty").optional(),
    title: z.string().trim().min(1, "Title cannot be empty").optional(),
    slug: z
      .string()
      .trim()
      .regex(allowedSlugRegex, "Slug must be URL-safe lowercase with hyphens")
      .optional(),
    price: z
      .number()
      .refine((val) => val > 0, {
        message: "Price must be positive",
      })
      .optional(),
    stock: z
      .number()
      .int("Stock must be an integer")
      .min(0, "Stock must be >= 0")
      .optional(),
    description: z.string().trim().optional(),
    variants: z.array(productVariantItemSchema).optional(),
    mediaUrls: z.array(z.string().trim()).optional(),
    images: z.array(z.string().trim()).optional(),
    isBestseller: z.boolean().optional(),
    badge: z.string().optional(),
    category: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .transform((data) => {
    const resolvedName = data.name || data.title;
    const resolvedMedia = data.mediaUrls || data.images;
    const isBestsellerResolved =
      data.isBestseller !== undefined
        ? data.isBestseller
        : data.badge !== undefined
        ? data.badge.toUpperCase() === "BESTSELLER"
        : undefined;

    return {
      ...data,
      ...(resolvedName ? { name: sanitizeAdminText(resolvedName), title: sanitizeAdminText(resolvedName) } : {}),
      ...(resolvedMedia ? { mediaUrls: resolvedMedia, images: resolvedMedia } : {}),
      ...(isBestsellerResolved !== undefined ? { isBestseller: isBestsellerResolved } : {}),
    };
  });

// =============================================================================
// Feature 15: Store Settings Zod Schemas
// =============================================================================

export const ALLOWED_CURRENCIES = ["USD", "EUR", "TRY", "GBP"] as const;

export const adminStoreSettingsUpdateSchema = z.object({
  whatsappNumber: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const cleaned = val.replace(/[\s()-]/g, "");
        return /^\+\d{10,15}$/.test(cleaned);
      },
      {
        message: "whatsappNumber must be a valid E.164 formatted number starting with +",
      }
    )
    .transform((val) => (val ? val.replace(/[\s()-]/g, "") : undefined)),

  currency: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return (ALLOWED_CURRENCIES as readonly string[]).includes(val.toUpperCase());
      },
      {
        message: "currency must be one of: USD, EUR, TRY, GBP",
      }
    )
    .transform((val) => (val ? val.toUpperCase() : undefined)),

  storeName: z.string().trim().max(100).optional(),
  brandBio: z.string().trim().max(500).optional(),
  socialLinks: z.record(z.string()).optional(),
  brandMetadata: z.record(z.unknown()).optional(),
});
```

---

## 6. Resilient Database Fallback Integration (`src/lib/db.ts`)

The singleton client in `src/lib/db.ts` uses a Proxy interceptor pattern. To ensure 100% compliance with Admin CRUD operations in both real Neon Postgres and the in-memory fallback, the following enhancements are required:

### 6.1 Enhancing `mockHandlers.product`
1. **`findMany`**:
   - Support `category` filtering.
   - Support `stock` condition queries (`{ gt: 0 }`, `{ lte: 0 }`, `0`).
   - Support `orderBy: { createdAt: "desc" }` and `{ price: "asc" | "desc" }`.
   - Support `OR: [{ id: ... }, { slug: ... }]`.
2. **`findFirst` & `findUnique`**:
   - Support `{ OR: [{ id }, { slug: id }] }`.
3. **`update`**:
   - Deep merge of `variants` and partial fields.
   - Throws `Error("Product not found")` when target product is missing.
4. **`delete`**:
   - Removes item from `mockStore.products`.
   - Throws `Error("Product not found")` when target product is missing.

### 6.2 Code Blueprint for `src/lib/db.ts` Mock Interceptors
```typescript
// Inside mockHandlers.product in src/lib/db.ts:
findMany: async (args?: {
  where?: {
    isBestseller?: boolean;
    slug?: string;
    id?: string;
    category?: string;
    stock?: number | { gt?: number; lte?: number };
    OR?: Array<{ id?: string; slug?: string }>;
  };
  take?: number;
  skip?: number;
  orderBy?: Record<string, "asc" | "desc">;
}) => {
  let list = [...mockStore.products];
  if (args?.where) {
    const { isBestseller, slug, id, stock, OR } = args.where;
    if (isBestseller !== undefined) {
      list = list.filter((p) => p.isBestseller === isBestseller);
    }
    if (slug) {
      list = list.filter((p) => p.slug === slug);
    }
    if (id) {
      list = list.filter((p) => p.id === id);
    }
    if (typeof stock === "number") {
      list = list.filter((p) => p.stock === stock);
    } else if (stock && typeof stock === "object") {
      if (stock.gt !== undefined) list = list.filter((p) => p.stock > stock.gt!);
      if (stock.lte !== undefined) list = list.filter((p) => p.stock <= stock.lte!);
    }
    if (OR && Array.isArray(OR)) {
      list = list.filter((p) =>
        OR.some((condition) =>
          (condition.id && p.id === condition.id) ||
          (condition.slug && p.slug === condition.slug)
        )
      );
    }
  }
  if (args?.orderBy) {
    const [key, order] = Object.entries(args.orderBy)[0] || [];
    if (key === "createdAt") {
      list.sort((a, b) =>
        order === "desc"
          ? b.createdAt.getTime() - a.createdAt.getTime()
          : a.createdAt.getTime() - b.createdAt.getTime()
      );
    } else if (key === "price") {
      list.sort((a, b) =>
        order === "desc" ? b.price - a.price : a.price - b.price
      );
    }
  }
  if (args?.skip) list = list.slice(args.skip);
  if (args?.take) list = list.slice(0, args.take);
  return list;
},
```

---

## 7. Security, Auth Guard & Edge Middleware Integration

All `/api/admin/*` endpoints must be guarded by JWT session authentication:
1. **Edge Middleware (`src/middleware.ts`)**:
   - Specified by Explorer 1 (`m4_1`).
   - Route pattern: `/api/admin/:path*` (except `/api/admin/auth/login`).
   - Inspects `cyrux_admin_session` cookie. If missing or invalid, immediately returns HTTP 401 `{ success: false, error: "Unauthorized" }`.
2. **Defense-in-Depth in Route Handlers**:
   - If invoked in an environment where middleware might be bypassed or in unit test harnesses, each route can optionally call a lightweight auth guard helper `verifyAdminSession(request)` to ensure zero leakage.

---

## 8. Implementation Checklist for Developer Agent

The implementing developer should execute these concrete steps in order:

1. [ ] **Update `src/lib/validations.ts`**:
   - Append `adminProductCreateSchema`, `adminProductUpdateSchema`, and `adminStoreSettingsUpdateSchema`.
   - Export helper functions `sanitizeAdminText`.
2. [ ] **Update `src/lib/db.ts`**:
   - Enhance `mockHandlers.product.findMany` to handle `stock`, `OR`, and `orderBy`.
   - Enhance `mockHandlers.product.findFirst` to support `OR` conditions.
3. [ ] **Create `src/app/api/admin/products/route.ts`**:
   - Implement `GET` (list products with filters) and `POST` (create product with Zod validation, HTTP 201).
4. [ ] **Create `src/app/api/admin/products/[id]/route.ts`**:
   - Implement `GET` (fetch by ID/slug, 404), `PUT`/`PATCH` (update with validation), and `DELETE` (delete, return `{ success: true, deletedId }`).
5. [ ] **Create `src/app/api/admin/settings/route.ts`**:
   - Implement `GET` (return current store settings) and `PUT`/`POST` (update with E.164 and currency validation).
6. [ ] **Self-Verification**:
   - Run `npx tsx tests/runner.ts` (verify all 130 tests pass).
   - Run `npx tsc --noEmit` to verify zero TypeScript errors.
   - Run integration verification testing the newly created API endpoints directly.
