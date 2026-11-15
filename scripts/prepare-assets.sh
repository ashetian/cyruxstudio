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
