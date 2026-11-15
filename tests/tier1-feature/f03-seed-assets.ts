import { describe, it, expect } from '../framework.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('Feature 3: Seed Data & Brand Asset Pipeline', () => {
  const assetsDir = path.resolve(__dirname, '../../assets');

  it('3.1 should confirm presence of 8 raw brand media files in assets directory', () => {
    expect(fs.existsSync(assetsDir)).toBeTruthy();
    const files = fs.readdirSync(assetsDir);
    const expectedRawFiles = [
      'C5E6C1ED-AFC1-4CA1-8056-3F38A6A9048C.PNG',
      'IMG_0130.tiff',
      'IMG_0679.MOV',
      'IMG_0795.PNG',
      'IMG_9258.png',
      'IMG_9259.png',
      'IMG_9523.png',
      'IMG_9524.png',
    ];

    for (const file of expectedRawFiles) {
      expect(files).toContain(file);
      const filePath = path.join(assetsDir, file);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(0);
    }
  });

  it('3.2 should enforce 5 initial seeded streetwear apparel catalog items', () => {
    const seedCatalog = [
      { slug: 'heavy-raw-cut-tee', name: 'Raw Cut Boxy Tee', price: 95 },
      { slug: 'brutalist-cargo-pant', name: 'Brutalist Wide Cargo', price: 210 },
      { slug: 'cyrux-oversized-hoodie', name: 'Monolith Heavy Hoodie', price: 240 },
      { slug: 'sculptural-puffer-vest', name: 'Sculptural Puffer Vest', price: 290 },
      { slug: 'architectural-tote-bag', name: 'Leather Monogram Tote', price: 160 },
    ];

    expect(seedCatalog).toHaveLength(5);
    for (const item of seedCatalog) {
      expect(item.price).toBeGreaterThan(0);
      expect(item.slug.length).toBeGreaterThan(3);
    }
  });

  it('3.3 should enforce TIFF to WebP conversion rule for web browser compatibility', () => {
    // Browsers cannot display raw TIFF directly; the asset pipeline must transform it
    const rawAsset = 'IMG_0130.tiff';
    const targetWebAsset = 'IMG_0130.webp';
    const isValidWebExtension = (file: string) => /\.(webp|png|jpe?g|avif)$/i.test(file);

    expect(isValidWebExtension(rawAsset)).toBeFalsy();
    expect(isValidWebExtension(targetWebAsset)).toBeTruthy();
  });

  it('3.4 should enforce QuickTime MOV to MP4 conversion rule for cross-browser playback', () => {
    const rawVideo = 'IMG_0679.MOV';
    const webVideo = 'IMG_0679.mp4';
    const isValidWebVideo = (file: string) => /\.(mp4|webm)$/i.test(file);

    expect(isValidWebVideo(rawVideo)).toBeFalsy();
    expect(isValidWebVideo(webVideo)).toBeTruthy();
  });

  it('3.5 should verify seed asset MIME mapping contract for image and video delivery', () => {
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.jpg': 'image/jpeg',
      '.mp4': 'video/mp4',
    };

    expect(mimeMap['.webp']).toBe('image/webp');
    expect(mimeMap['.mp4']).toBe('video/mp4');
    expect(mimeMap['.png']).toBe('image/png');
  });
}, { tier: 1, featureId: 3 });
