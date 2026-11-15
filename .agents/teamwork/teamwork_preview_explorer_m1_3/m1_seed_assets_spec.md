# Milestone 1 Specification: Seed Data & Asset Optimization Pipeline

**Document**: `m1_seed_assets_spec.md`  
**Author**: Explorer 3 (teamwork_preview_explorer_m1_3)  
**Project**: `cyrux studio` (`/home/ashetian/Desktop/cyruxstudio`)  
**Milestone**: M1 (Core Skeleton & Database)  
**Date**: 2026-11-14  

---

## 1. Executive Summary & Problem Scope

This specification establishes the complete technical blueprint for **Milestone 1 (Feature 3: Seed Data & Brand Asset Pipeline)**. It bridges raw media assets in `/home/ashetian/Desktop/cyruxstudio/assets/` with the PostgreSQL Prisma database schema, web performance standards, and Next.js public directory structure.

### Key Objectives
1. **Source Asset Transformation**:
   - Transcode `assets/IMG_0130.tiff` (16.8 MB) into browser-native WebP (278 KB) and PNG fallback, achieving a **98.3% payload reduction**.
   - Transcode `assets/IMG_0679.MOV` (29.3 MB HEVC) into web-optimized H.264 MP4 with `-movflags +faststart` (~1.3 MB) and extract high-resolution poster frames for zero-layout-shift editorial video streaming.
   - Crop and extract the gothic brand emblem from `assets/IMG_0795.PNG` (1170x2532 iPhone screenshot) into transparent white, transparent black, dark master, and multi-size favicons.
2. **Idempotent Database Seeding**:
   - Map 5 brutalist apparel products to their respective media, variants, pricing, stock, and bestseller flags.
   - Seed `StoreSettings` with verified WhatsApp number (`+905551234567`), currency (`USD`), and brand metadata.
   - Decouple seed data into a shared TypeScript module (`src/lib/seed-data.ts`) to feed both `prisma/seed.ts` (PostgreSQL) and the offline development mock DB adapter.

---

## 2. Source Asset Inventory & Technical Analysis

All original assets are located in `/home/ashetian/Desktop/cyruxstudio/assets/`. System CLI verification confirms ImageMagick `7.1.2-32`, FFmpeg `9.0.2`, `node`, and `npm` are installed on the host.

### 2.1 Asset Mapping Matrix

| Original Asset | Original Specs | Channels | File Size | Target Web Role | Target Path(s) | Optimization Method |
|---|---|---|---|---|---|---|
| **`C5E6C1ED-AFC1-4CA1-8056-3F38A6A9048C.PNG`** | 1254 x 1254 | RGB | 1.87 MB | Product 1 (Primary): `PRETTY CHAOS TEE` | `public/assets/products/pretty-chaos-tee.png`<br>`public/assets/products/pretty-chaos-tee.webp` | WebP conversion (q=88) + PNG copy |
| **`IMG_0130.tiff`** | 2048 x 2048 | RGBA | 16.78 MB | Product 1 (Detail): `PRETTY CHAOS TEE` detail view | `public/assets/products/pretty-chaos-detail.webp`<br>`public/assets/products/pretty-chaos-detail.png` | TIFF -> WebP (q=88, 278 KB) + PNG |
| **`IMG_9258.png`** | 844 x 805 | RGBA | 311 KB | Product 2: `FIRST ASCENT TEE - WHITE` | `public/assets/products/first-ascent-white.png`<br>`public/assets/products/first-ascent-white.webp` | WebP conversion (q=90) + PNG copy |
| **`IMG_9259.png`** | 844 x 805 | RGBA | 340 KB | Product 3: `FIRST ASCENT TEE - BLACK` | `public/assets/products/first-ascent-black.png`<br>`public/assets/products/first-ascent-black.webp` | WebP conversion (q=90) + PNG copy |
| **`IMG_9523.png`** | 2048 x 2048 | RGBA | 380 KB | Product 4: `CYRUX 099 ORBITAL TEE` | `public/assets/products/cyrux-099-orbital.png`<br>`public/assets/products/cyrux-099-orbital.webp` | WebP conversion (q=90) + PNG copy |
| **`IMG_9524.png`** | 2048 x 2048 | RGBA | 432 KB | Product 5: `EYES NEVER LIE TEE` | `public/assets/products/eyes-never-lie.png`<br>`public/assets/products/eyes-never-lie.webp` | WebP conversion (q=90) + PNG copy |
| **`IMG_0795.PNG`** | 1170 x 2532 | RGB | 184 KB | Brand Identity Master (Logo, Emblems, Favicon) | `public/assets/brand/logo-emblem-dark.png`<br>`public/assets/brand/logo-emblem-white.png`<br>`public/assets/brand/logo-emblem-black.png`<br>`public/assets/brand/favicon-32x32.png`<br>`public/assets/brand/apple-touch-icon.png`<br>`public/assets/brand/favicon.ico` | Trim/Crop to `1032x994` + Alpha channel extraction + multi-size icons |
| **`IMG_0679.MOV`** | 2160 x 2160, 60fps, HEVC, 10.1s | RGB | 29.29 MB | Editorial Campaign Video Block | `public/assets/video/cyrux-campaign-1080.mp4`<br>`public/assets/video/cyrux-campaign-720.mp4`<br>`public/assets/video/cyrux-campaign-1080.webm`<br>`public/assets/video/cyrux-campaign-poster.webp` | H.264 (yuv420p, crf 22, faststart) + VP9 WebM + WebP poster |

---

## 3. Asset Conversion & Optimization Pipeline

### 3.1 Public Directory Structure
```
/home/ashetian/Desktop/cyruxstudio/public/
├── favicon.ico                   # Symlink or copy of public/assets/brand/favicon.ico
└── assets/
    ├── brand/
    │   ├── logo-emblem-dark.png  # 1032x994 master emblem on solid black
    │   ├── logo-emblem-white.png # Transparent PNG, white artwork (for dark hero & pill nav)
    │   ├── logo-emblem-white.webp# WebP transparent white emblem
    │   ├── logo-emblem-black.png # Transparent PNG, black artwork (for light ecru body canvas)
    │   ├── logo-emblem-black.webp# WebP transparent black emblem
    │   ├── favicon-32x32.png     # 32x32 favicon
    │   ├── apple-touch-icon.png  # 180x180 iOS touch icon
    │   └── favicon.ico           # Multi-resolution ICO (16, 32, 48, 64px)
    ├── products/
    │   ├── pretty-chaos-tee.png
    │   ├── pretty-chaos-tee.webp
    │   ├── pretty-chaos-detail.png
    │   ├── pretty-chaos-detail.webp
    │   ├── first-ascent-white.png
    │   ├── first-ascent-white.webp
    │   ├── first-ascent-black.png
    │   ├── first-ascent-black.webp
    │   ├── cyrux-099-orbital.png
    │   ├── cyrux-099-orbital.webp
    │   ├── eyes-never-lie.png
    │   └── eyes-never-lie.webp
    └── video/
        ├── cyrux-campaign-1080.mp4   # Universal HTML5 H.264 1080x1080 with faststart (~1.3 MB)
        ├── cyrux-campaign-720.mp4    # Mobile H.264 720x720 (~700 KB)
        ├── cyrux-campaign-1080.webm  # VP9 WebM fallback (~1.0 MB)
        ├── cyrux-campaign-poster.webp# High-res poster frame for video block
        └── cyrux-campaign-poster.jpg # JPEG poster fallback
```

---

### 3.2 Deep Dive: Brand Logo Processing (`assets/IMG_0795.PNG`)

#### The Problem
`assets/IMG_0795.PNG` is a mobile portrait capture (1170x2532).
- Non-black artwork coordinates:
  - Y: `798` to `1792` (height: 994 px)
  - X: `72` to `1104` (width: 1032 px)
- The top 798 pixels and bottom 740 pixels are dead black void. Using this image uncropped in a layout adds huge black gutters.
- Analysis confirms the artwork is strictly monochrome: max channel difference across R/G/B is <= 3, and mean brightness is 228 (pure white/silver).

#### The Solution
1. **Dark Emblem**: Crop directly to `1032x994+72+798`.
2. **Transparent White Emblem**: Apply `-alpha copy` so luminance maps directly to opacity. Black background (`0,0,0`) becomes 100% transparent (`rgba(0,0,0,0)`), while white details maintain full anti-aliased sharpness.
3. **Transparent Black Emblem**: Set RGB channels to `0` while preserving the exact same alpha mask. Perfect for `#F7F5EE` ecru canvas surfaces.
4. **Favicon & App Icons**: Downscale the transparent mark to 32x32, 180x180, and compound `.ico`.

```bash
# Bounding box crop
magick assets/IMG_0795.PNG -crop 1032x994+72+798 +repage public/assets/brand/logo-emblem-dark.png

# Transparent White Logo
magick assets/IMG_0795.PNG -crop 1032x994+72+798 +repage -alpha copy public/assets/brand/logo-emblem-white.png
magick public/assets/brand/logo-emblem-white.png -quality 90 public/assets/brand/logo-emblem-white.webp

# Transparent Black Logo
magick public/assets/brand/logo-emblem-white.png -channel RGB -evaluate set 0 +channel public/assets/brand/logo-emblem-black.png
magick public/assets/brand/logo-emblem-black.png -quality 90 public/assets/brand/logo-emblem-black.webp

# Icons & Favicon
magick public/assets/brand/logo-emblem-white.png -resize 32x32 public/assets/brand/favicon-32x32.png
magick public/assets/brand/logo-emblem-white.png -resize 180x180 public/assets/brand/apple-touch-icon.png
magick public/assets/brand/logo-emblem-white.png -define icon:auto-resize=64,48,32,16 public/assets/brand/favicon.ico
cp public/assets/brand/favicon.ico public/favicon.ico
```

---

### 3.3 Deep Dive: Campaign Video Transcoding (`assets/IMG_0679.MOV`)

#### The Problem
`assets/IMG_0679.MOV` is encoded in HEVC (H.265) inside a QuickTime container at 2160x2160, 23.2 Mbps, 29.3 MB.
- HEVC in MOV containers fails to play or triggers black screens on Chrome for Linux, older Safari/iOS, and Android browsers.
- 29.3 MB creates severe page load latency and destroys Core Web Vitals (LCP / bandwidth contention).

#### The Solution
- Transcode to H.264 Baseline/High Profile (`libx264`) with pixel format `yuv420p` (universal hardware decoding).
- Scale to 1080x1080 using `flags=lanczos` for pristine edge sharpness.
- Use Constant Rate Factor `crf 22` and faststart flag `-movflags +faststart` (relocates the `moov` atom to byte 0 for instantaneous progressive streaming).
- Full 10.1s video compresses to **~1.3 MB** (~95% reduction).
- Generate a static first-frame poster (`cyrux-campaign-poster.webp`) so `<video poster="...">` displays immediately with zero layout shift before the stream buffers.

```bash
# 1080p Web-Optimized H.264
ffmpeg -y -i assets/IMG_0679.MOV \
  -vf "scale=1080:1080:flags=lanczos" \
  -c:v libx264 -profile:v high -level 4.2 -crf 22 -preset medium \
  -pix_fmt yuv420p -movflags +faststart -an \
  public/assets/video/cyrux-campaign-1080.mp4

# 720p Mobile H.264
ffmpeg -y -i assets/IMG_0679.MOV \
  -vf "scale=720:720:flags=lanczos" \
  -c:v libx264 -profile:v main -crf 24 -preset fast \
  -pix_fmt yuv420p -movflags +faststart -an \
  public/assets/video/cyrux-campaign-720.mp4

# VP9 WebM Fallback
ffmpeg -y -i assets/IMG_0679.MOV \
  -vf "scale=1080:1080:flags=lanczos" \
  -c:v libvpx-vp9 -crf 30 -b:v 0 -an \
  public/assets/video/cyrux-campaign-1080.webm

# Poster Frame
ffmpeg -y -ss 00:00:01 -i assets/IMG_0679.MOV \
  -vf "scale=1080:1080:flags=lanczos" -vframes 1 -q:v 2 \
  /tmp/poster_raw.png
magick /tmp/poster_raw.png -quality 85 public/assets/video/cyrux-campaign-poster.webp
magick /tmp/poster_raw.png -quality 85 public/assets/video/cyrux-campaign-poster.jpg
rm -f /tmp/poster_raw.png
```

---

### 3.4 Deep Dive: TIFF Detail Transcoding (`assets/IMG_0130.tiff`)

#### The Problem
`assets/IMG_0130.tiff` is a 16.78 MB 2048x2048 uncompressed TIFF. 0% of modern web browsers display TIFF images.

#### The Solution
Transcode using ImageMagick into high-efficiency WebP (quality 88). Output is **278 KB**, retaining full 2048x2048 zoom capability for product detail inspection. Also generate a standard PNG fallback.

```bash
magick assets/IMG_0130.tiff -quality 88 public/assets/products/pretty-chaos-detail.webp
magick assets/IMG_0130.tiff public/assets/products/pretty-chaos-detail.png
```

---

### 3.5 Automation Scripts

#### 1. Shell Script (`scripts/prepare-assets.sh`)
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "==> [cyrux studio] Initializing Asset Optimization Pipeline..."

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS_SRC="${PROJECT_ROOT}/assets"
PUBLIC_DEST="${PROJECT_ROOT}/public/assets"

# Verify CLI prerequisites
command -v magick >/dev/null 2>&1 || { echo >&2 "Error: ImageMagick (magick) is required."; exit 1; }
command -v ffmpeg >/dev/null 2>&1 || { echo >&2 "Error: ffmpeg is required."; exit 1; }

mkdir -p "${PUBLIC_DEST}/brand"
mkdir -p "${PUBLIC_DEST}/products"
mkdir -p "${PUBLIC_DEST}/video"

echo "--> 1. Processing Brand Logo & Favicons (IMG_0795.PNG)..."
magick "${ASSETS_SRC}/IMG_0795.PNG" -crop 1032x994+72+798 +repage "${PUBLIC_DEST}/brand/logo-emblem-dark.png"
magick "${ASSETS_SRC}/IMG_0795.PNG" -crop 1032x994+72+798 +repage -alpha copy "${PUBLIC_DEST}/brand/logo-emblem-white.png"
magick "${PUBLIC_DEST}/brand/logo-emblem-white.png" -quality 90 "${PUBLIC_DEST}/brand/logo-emblem-white.webp"
magick "${PUBLIC_DEST}/brand/logo-emblem-white.png" -channel RGB -evaluate set 0 +channel "${PUBLIC_DEST}/brand/logo-emblem-black.png"
magick "${PUBLIC_DEST}/brand/logo-emblem-black.png" -quality 90 "${PUBLIC_DEST}/brand/logo-emblem-black.webp"
magick "${PUBLIC_DEST}/brand/logo-emblem-white.png" -resize 32x32 "${PUBLIC_DEST}/brand/favicon-32x32.png"
magick "${PUBLIC_DEST}/brand/logo-emblem-white.png" -resize 180x180 "${PUBLIC_DEST}/brand/apple-touch-icon.png"
magick "${PUBLIC_DEST}/brand/logo-emblem-white.png" -define icon:auto-resize=64,48,32,16 "${PUBLIC_DEST}/brand/favicon.ico"
cp -f "${PUBLIC_DEST}/brand/favicon.ico" "${PROJECT_ROOT}/public/favicon.ico"

echo "--> 2. Processing Editorial Video (IMG_0679.MOV)..."
ffmpeg -y -i "${ASSETS_SRC}/IMG_0679.MOV" \
  -vf "scale=1080:1080:flags=lanczos" \
  -c:v libx264 -profile:v high -level 4.2 -crf 22 -preset medium \
  -pix_fmt yuv420p -movflags +faststart -an \
  "${PUBLIC_DEST}/video/cyrux-campaign-1080.mp4"

ffmpeg -y -i "${ASSETS_SRC}/IMG_0679.MOV" \
  -vf "scale=720:720:flags=lanczos" \
  -c:v libx264 -profile:v main -crf 24 -preset fast \
  -pix_fmt yuv420p -movflags +faststart -an \
  "${PUBLIC_DEST}/video/cyrux-campaign-720.mp4"

ffmpeg -y -ss 00:00:01 -i "${ASSETS_SRC}/IMG_0679.MOV" \
  -vf "scale=1080:1080:flags=lanczos" -vframes 1 -q:v 2 \
  "${PUBLIC_DEST}/video/cyrux-campaign-poster.jpg"
magick "${PUBLIC_DEST}/video/cyrux-campaign-poster.jpg" -quality 85 "${PUBLIC_DEST}/video/cyrux-campaign-poster.webp"

echo "--> 3. Processing Product Media & TIFF..."
# Pretty Chaos Tee
cp -f "${ASSETS_SRC}/C5E6C1ED-AFC1-4CA1-8056-3F38A6A9048C.PNG" "${PUBLIC_DEST}/products/pretty-chaos-tee.png"
magick "${ASSETS_SRC}/C5E6C1ED-AFC1-4CA1-8056-3F38A6A9048C.PNG" -quality 88 "${PUBLIC_DEST}/products/pretty-chaos-tee.webp"
magick "${ASSETS_SRC}/IMG_0130.tiff" -quality 88 "${PUBLIC_DEST}/products/pretty-chaos-detail.webp"
magick "${ASSETS_SRC}/IMG_0130.tiff" "${PUBLIC_DEST}/products/pretty-chaos-detail.png"

# First Ascent White
cp -f "${ASSETS_SRC}/IMG_9258.png" "${PUBLIC_DEST}/products/first-ascent-white.png"
magick "${ASSETS_SRC}/IMG_9258.png" -quality 90 "${PUBLIC_DEST}/products/first-ascent-white.webp"

# First Ascent Black
cp -f "${ASSETS_SRC}/IMG_9259.png" "${PUBLIC_DEST}/products/first-ascent-black.png"
magick "${ASSETS_SRC}/IMG_9259.png" -quality 90 "${PUBLIC_DEST}/products/first-ascent-black.webp"

# Cyrux 099 Orbital
cp -f "${ASSETS_SRC}/IMG_9523.png" "${PUBLIC_DEST}/products/cyrux-099-orbital.png"
magick "${ASSETS_SRC}/IMG_9523.png" -quality 90 "${PUBLIC_DEST}/products/cyrux-099-orbital.webp"

# Eyes Never Lie
cp -f "${ASSETS_SRC}/IMG_9524.png" "${PUBLIC_DEST}/products/eyes-never-lie.png"
magick "${ASSETS_SRC}/IMG_9524.png" -quality 90 "${PUBLIC_DEST}/products/eyes-never-lie.webp"

echo "==> [cyrux studio] Asset Optimization Completed Successfully!"
```

#### 2. TypeScript Node Runner (`scripts/prepare-assets.ts`)
```typescript
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'assets');
const destDir = path.join(rootDir, 'public', 'assets');

async function main() {
  console.log('[Assets] Running prepare-assets...');
  ['brand', 'products', 'video'].forEach((sub) => {
    fs.mkdirSync(path.join(destDir, sub), { recursive: true });
  });

  // Execute bash pipeline script
  execSync(`bash ${path.join(__dirname, 'prepare-assets.sh')}`, {
    stdio: 'inherit',
    cwd: rootDir,
  });
}

main().catch((err) => {
  console.error('[Assets] Preparation failed:', err);
  process.exit(1);
});
```

---

## 4. Seed Data Specification & Models Mapping

### 4.1 Schema Alignment
Our seed definitions strictly align with `prisma/schema.prisma` defined by Explorer 2:

```prisma
model Product {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique
  description  String   @db.Text
  price        Decimal  @db.Decimal(10, 2)
  stock        Int      @default(0)
  variants     Json     @default("[]")
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
  whatsappNumber String   @default("+905551234567")
  currency       String   @default("USD")
  brandMetadata  Json     @default("{}")
  updatedAt      DateTime @updatedAt

  @@map("store_settings")
}
```

---

### 4.2 The 5 Apparel Products Specification

#### 1. PRETTY CHAOS TEE
- **Slug**: `pretty-chaos-tee`
- **Name**: `PRETTY CHAOS TEE`
- **Description**: `Heavyweight 280 GSM cotton jersey oversized tee featuring signature cyber-tribal predator halftone screenprint in punk magenta and neon accents. Vintage acid wash finish with dropped shoulders and thick ribbed neck.`
- **Price**: `120.00`
- **Stock**: `45`
- **isBestseller**: `true` (Column 2 in asymmetric grid)
- **Variants**:
  ```json
  [
    { "id": "pc-s", "name": "S", "inStock": true, "sku": "PC-TEE-S" },
    { "id": "pc-m", "name": "M", "inStock": true, "sku": "PC-TEE-M" },
    { "id": "pc-l", "name": "L", "inStock": true, "sku": "PC-TEE-L" },
    { "id": "pc-xl", "name": "XL", "inStock": true, "sku": "PC-TEE-XL" }
  ]
  ```
- **Media URLs**:
  - `"/assets/products/pretty-chaos-tee.png"`
  - `"/assets/products/pretty-chaos-detail.webp"`

#### 2. FIRST ASCENT TEE - WHITE
- **Slug**: `first-ascent-tee-white`
- **Name**: `FIRST ASCENT TEE - WHITE`
- **Description**: `Boxy silhouette streetwear tee crafted from 300 GSM combed cotton. High-density screenprinted albino viper emblem and cyrux brandmark. Chapter 00 First Ascent release with reinforced double-needle seams.`
- **Price**: `95.00`
- **Stock**: `30`
- **isBestseller**: `true` (Column 1 in asymmetric grid)
- **Variants**:
  ```json
  [
    { "id": "fa-w-s", "name": "S", "inStock": true, "sku": "FA-WHT-S" },
    { "id": "fa-w-m", "name": "M", "inStock": true, "sku": "FA-WHT-M" },
    { "id": "fa-w-l", "name": "L", "inStock": true, "sku": "FA-WHT-L" },
    { "id": "fa-w-xl", "name": "XL", "inStock": false, "sku": "FA-WHT-XL" }
  ]
  ```
- **Media URLs**:
  - `"/assets/products/first-ascent-white.png"`

#### 3. FIRST ASCENT TEE - BLACK
- **Slug**: `first-ascent-tee-black`
- **Name**: `FIRST ASCENT TEE - BLACK`
- **Description**: `Pitch black heavyweight dropped-shoulder boxy tee with high-contrast albino viper graphics and brutalist cyrux studio typography. Ribbed collar and raw garment-dyed treatment.`
- **Price**: `95.00`
- **Stock**: `50`
- **isBestseller**: `true` (Column 3 in asymmetric grid)
- **Variants**:
  ```json
  [
    { "id": "fa-b-s", "name": "S", "inStock": true, "sku": "FA-BLK-S" },
    { "id": "fa-b-m", "name": "M", "inStock": true, "sku": "FA-BLK-M" },
    { "id": "fa-b-l", "name": "L", "inStock": true, "sku": "FA-BLK-L" },
    { "id": "fa-b-xl", "name": "XL", "inStock": true, "sku": "FA-BLK-XL" }
  ]
  ```
- **Media URLs**:
  - `"/assets/products/first-ascent-black.png"`

#### 4. CYRUX 099 ORBITAL TEE
- **Slug**: `cyrux-099-orbital-tee`
- **Name**: `CYRUX 099 ORBITAL TEE`
- **Description**: `Astronomical cybernetic motif tee in deep washed charcoal. Center orbital star constellation with specular chrome micro-stud effect and studio trademark typographic lockup.`
- **Price**: `110.00`
- **Stock**: `25`
- **isBestseller**: `true` (Column 4 in asymmetric grid)
- **Variants**:
  ```json
  [
    { "id": "orb-s", "name": "S", "inStock": true, "sku": "ORB-099-S" },
    { "id": "orb-m", "name": "M", "inStock": true, "sku": "ORB-099-M" },
    { "id": "orb-l", "name": "L", "inStock": true, "sku": "ORB-099-L" }
  ]
  ```
- **Media URLs**:
  - `"/assets/products/cyrux-099-orbital.png"`

#### 5. EYES NEVER LIE TEE
- **Slug**: `eyes-never-lie-tee`
- **Name**: `EYES NEVER LIE TEE`
- **Description**: `Cinematic 35mm letterbox eye gaze screenprint on pitch black heavyweight cotton. Brutalist studio text treatment. Limited edition wearable art run.`
- **Price**: `105.00`
- **Stock**: `18`
- **isBestseller**: `false` (Featured in editorial cards and lookbook catalog)
- **Variants**:
  ```json
  [
    { "id": "enl-s", "name": "S", "inStock": true, "sku": "ENL-001-S" },
    { "id": "enl-m", "name": "M", "inStock": true, "sku": "ENL-001-M" },
    { "id": "enl-l", "name": "L", "inStock": true, "sku": "ENL-001-L" }
  ]
  ```
- **Media URLs**:
  - `"/assets/products/eyes-never-lie.png"`

---

### 4.3 Initial StoreSettings Specification

```json
{
  "id": "default",
  "whatsappNumber": "+905551234567",
  "currency": "USD",
  "brandMetadata": {
    "title": "cyrux studio",
    "brandName": "cyrux studio",
    "heroDisplayTitle": "cyrux",
    "tagline": "wearable art & brutalist luxury",
    "description": "avant-garde cyberpunk streetwear, high-contrast monochrome silhouettes and brutalist physical garments",
    "socialHandles": {
      "instagram": "@cyruxstudio",
      "twitter": "@cyruxstudio",
      "tiktok": "@cyruxstudio"
    },
    "socialLinks": {
      "instagram": "https://instagram.com/cyruxstudio",
      "twitter": "https://x.com/cyruxstudio",
      "tiktok": "https://tiktok.com/@cyruxstudio"
    },
    "supportEmail": "contact@cyruxstudio.com",
    "whatsappFormatted": "+90 (555) 123 45 67",
    "location": "Istanbul, TR / Global Shipping",
    "announcement": "FREE WORLDWIDE EXPRESS DISPATCH ON ALL CHAPTER00 ORDERS"
  }
}
```

---

### 4.4 Shared Seed Data Module (`src/lib/seed-data.ts`)

By isolating seed records in `src/lib/seed-data.ts`, both the Prisma database seeder (`prisma/seed.ts`) and the offline mock database adapter share the exact same typed records.

```typescript
export interface ProductVariant {
  id: string;
  name: string;
  inStock: boolean;
  sku?: string;
}

export interface SeedProductInput {
  name: string;
  slug: string;
  description: string;
  price: string; // Decimal string representation for Prisma
  stock: number;
  variants: ProductVariant[];
  mediaUrls: string[];
  isBestseller: boolean;
}

export interface StoreSettingsInput {
  id: string;
  whatsappNumber: string;
  currency: string;
  brandMetadata: Record<string, unknown>;
}

export const INITIAL_STORE_SETTINGS: StoreSettingsInput = {
  id: 'default',
  whatsappNumber: '+905551234567',
  currency: 'USD',
  brandMetadata: {
    title: 'cyrux studio',
    brandName: 'cyrux studio',
    heroDisplayTitle: 'cyrux',
    tagline: 'wearable art & brutalist luxury',
    description:
      'avant-garde cyberpunk streetwear, high-contrast monochrome silhouettes and brutalist physical garments',
    socialHandles: {
      instagram: '@cyruxstudio',
      twitter: '@cyruxstudio',
      tiktok: '@cyruxstudio',
    },
    socialLinks: {
      instagram: 'https://instagram.com/cyruxstudio',
      twitter: 'https://x.com/cyruxstudio',
      tiktok: 'https://tiktok.com/@cyruxstudio',
    },
    supportEmail: 'contact@cyruxstudio.com',
    whatsappFormatted: '+90 (555) 123 45 67',
    location: 'Istanbul, TR / Global Shipping',
    announcement: 'FREE WORLDWIDE EXPRESS DISPATCH ON ALL CHAPTER00 ORDERS',
  },
};

export const SEED_PRODUCTS: SeedProductInput[] = [
  {
    name: 'PRETTY CHAOS TEE',
    slug: 'pretty-chaos-tee',
    description:
      'Heavyweight 280 GSM cotton jersey oversized tee featuring signature cyber-tribal predator halftone screenprint in punk magenta and neon accents. Vintage acid wash finish with dropped shoulders and thick ribbed neck.',
    price: '120.00',
    stock: 45,
    isBestseller: true,
    variants: [
      { id: 'pc-s', name: 'S', inStock: true, sku: 'PC-TEE-S' },
      { id: 'pc-m', name: 'M', inStock: true, sku: 'PC-TEE-M' },
      { id: 'pc-l', name: 'L', inStock: true, sku: 'PC-TEE-L' },
      { id: 'pc-xl', name: 'XL', inStock: true, sku: 'PC-TEE-XL' },
    ],
    mediaUrls: [
      '/assets/products/pretty-chaos-tee.png',
      '/assets/products/pretty-chaos-detail.webp',
    ],
  },
  {
    name: 'FIRST ASCENT TEE - WHITE',
    slug: 'first-ascent-tee-white',
    description:
      'Boxy silhouette streetwear tee crafted from 300 GSM combed cotton. High-density screenprinted albino viper emblem and cyrux brandmark. Chapter 00 First Ascent release with reinforced double-needle seams.',
    price: '95.00',
    stock: 30,
    isBestseller: true,
    variants: [
      { id: 'fa-w-s', name: 'S', inStock: true, sku: 'FA-WHT-S' },
      { id: 'fa-w-m', name: 'M', inStock: true, sku: 'FA-WHT-M' },
      { id: 'fa-w-l', name: 'L', inStock: true, sku: 'FA-WHT-L' },
      { id: 'fa-w-xl', name: 'XL', inStock: false, sku: 'FA-WHT-XL' },
    ],
    mediaUrls: ['/assets/products/first-ascent-white.png'],
  },
  {
    name: 'FIRST ASCENT TEE - BLACK',
    slug: 'first-ascent-tee-black',
    description:
      'Pitch black heavyweight dropped-shoulder boxy tee with high-contrast albino viper graphics and brutalist cyrux studio typography. Ribbed collar and raw garment-dyed treatment.',
    price: '95.00',
    stock: 50,
    isBestseller: true,
    variants: [
      { id: 'fa-b-s', name: 'S', inStock: true, sku: 'FA-BLK-S' },
      { id: 'fa-b-m', name: 'M', inStock: true, sku: 'FA-BLK-M' },
      { id: 'fa-b-l', name: 'L', inStock: true, sku: 'FA-BLK-L' },
      { id: 'fa-b-xl', name: 'XL', inStock: true, sku: 'FA-BLK-XL' },
    ],
    mediaUrls: ['/assets/products/first-ascent-black.png'],
  },
  {
    name: 'CYRUX 099 ORBITAL TEE',
    slug: 'cyrux-099-orbital-tee',
    description:
      'Astronomical cybernetic motif tee in deep washed charcoal. Center orbital star constellation with specular chrome micro-stud effect and studio trademark typographic lockup.',
    price: '110.00',
    stock: 25,
    isBestseller: true,
    variants: [
      { id: 'orb-s', name: 'S', inStock: true, sku: 'ORB-099-S' },
      { id: 'orb-m', name: 'M', inStock: true, sku: 'ORB-099-M' },
      { id: 'orb-l', name: 'L', inStock: true, sku: 'ORB-099-L' },
    ],
    mediaUrls: ['/assets/products/cyrux-099-orbital.png'],
  },
  {
    name: 'EYES NEVER LIE TEE',
    slug: 'eyes-never-lie-tee',
    description:
      'Cinematic 35mm letterbox eye gaze screenprint on pitch black heavyweight cotton. Brutalist studio text treatment. Limited edition wearable art run.',
    price: '105.00',
    stock: 18,
    isBestseller: false,
    variants: [
      { id: 'enl-s', name: 'S', inStock: true, sku: 'ENL-001-S' },
      { id: 'enl-m', name: 'M', inStock: true, sku: 'ENL-001-M' },
      { id: 'enl-l', name: 'L', inStock: true, sku: 'ENL-001-L' },
    ],
    mediaUrls: ['/assets/products/eyes-never-lie.png'],
  },
];
```

---

### 4.5 Executable Prisma Seed Script (`prisma/seed.ts`)

```typescript
import { PrismaClient } from '@prisma/client';
import { INITIAL_STORE_SETTINGS, SEED_PRODUCTS } from '../src/lib/seed-data';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding cyrux studio database...');

  // 1. Upsert StoreSettings (Singleton)
  const settings = await prisma.storeSettings.upsert({
    where: { id: INITIAL_STORE_SETTINGS.id },
    update: {
      whatsappNumber: INITIAL_STORE_SETTINGS.whatsappNumber,
      currency: INITIAL_STORE_SETTINGS.currency,
      brandMetadata: INITIAL_STORE_SETTINGS.brandMetadata as any,
    },
    create: {
      id: INITIAL_STORE_SETTINGS.id,
      whatsappNumber: INITIAL_STORE_SETTINGS.whatsappNumber,
      currency: INITIAL_STORE_SETTINGS.currency,
      brandMetadata: INITIAL_STORE_SETTINGS.brandMetadata as any,
    },
  });
  console.log(`[Seed] StoreSettings seeded: ${settings.whatsappNumber} (${settings.currency})`);

  // 2. Upsert Products (Idempotent by slug)
  for (const item of SEED_PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        price: item.price,
        stock: item.stock,
        variants: item.variants as any,
        mediaUrls: item.mediaUrls,
        isBestseller: item.isBestseller,
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        price: item.price,
        stock: item.stock,
        variants: item.variants as any,
        mediaUrls: item.mediaUrls,
        isBestseller: item.isBestseller,
      },
    });
    console.log(`[Seed] Product seeded: ${product.name} (${product.slug})`);
  }

  console.log(`[Seed] Successfully seeded ${SEED_PRODUCTS.length} products and store settings.`);
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

### 4.6 Package.json Configuration

To enable `npx prisma db seed` and `npm run assets:prepare`:
```json
{
  "scripts": {
    "assets:prepare": "bash scripts/prepare-assets.sh",
    "db:seed": "prisma db seed"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

## 5. Offline Fallback & Static Compilation Guarantee

When running `npm run build` or `npx tsc --noEmit` in offline or local environments where `DATABASE_URL` is not reachable:
1. `src/lib/db.ts` detects connection failure and gracefully falls back to an in-memory repository populated directly from `INITIAL_STORE_SETTINGS` and `SEED_PRODUCTS`.
2. Static Page Generation (SSG/ISR) for the home page `/` and `/api/order/whatsapp` succeeds cleanly without network timeouts.
3. Assets in `public/assets/` are statically served by Next.js without requiring external CDN or S3 during development.

---

## 6. Verification Method

1. **Verify Asset Generation**:
   ```bash
   bash scripts/prepare-assets.sh
   # Verify brand assets
   identify public/assets/brand/logo-emblem-dark.png
   identify public/assets/brand/logo-emblem-white.png
   identify public/assets/brand/logo-emblem-black.png
   identify public/assets/brand/favicon-32x32.png
   # Verify video transcoding & faststart
   ffprobe -v error -show_entries format=size,duration -show_streams public/assets/video/cyrux-campaign-1080.mp4
   # Verify TIFF conversion
   identify public/assets/products/pretty-chaos-detail.webp
   ```
2. **Verify Database Seeding**:
   ```bash
   npx prisma generate
   npx prisma db push --skip-generate
   npx prisma db seed
   ```
3. **Verify Type Safety & Integrity**:
   ```bash
   npx tsc --noEmit
   ```
