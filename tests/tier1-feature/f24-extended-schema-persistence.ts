import { describe, it, expect } from '../framework.ts';
import {
  fileExists,
  readFileText,
  dynamicImport,
} from '../phase2-helpers.ts';

interface PrismaLikeDelegate {
  findMany?: (args?: Record<string, unknown>) => Promise<unknown[]>;
  findUnique?: (args: Record<string, unknown>) => Promise<unknown>;
  findFirst?: (args?: Record<string, unknown>) => Promise<unknown>;
  create?: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
  update?: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
  upsert?: (args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }) => Promise<Record<string, unknown>>;
  delete?: (args: { where: Record<string, unknown> }) => Promise<Record<string, unknown>>;
}

describe('Feature 24: Extended Prisma Schema & Resilient File-Backed Store', () => {
  it('24.1 should define Phase 2 models (Collection, Order, OrderItem, Customer, Coupon, StorefrontSection) in prisma/schema.prisma', () => {
    const schema = readFileText('prisma/schema.prisma');
    const requiredModels = [
      'model Collection',
      'model Order',
      'model OrderItem',
      'model Customer',
      'model Coupon',
      'model StorefrontSection',
    ];

    for (const modelDecl of requiredModels) {
      expect(schema).toContain(modelDecl);
    }

    expect(schema).toContain('orderItems');
    expect(schema).toContain('trackingNumber');
    expect(schema).toContain('trackingCarrier');
    expect(schema).toContain('minOrderAmount');
    expect(schema).toContain('maxUses');
  });

  it('24.2 should extend Product and StoreSettings models in prisma/schema.prisma', () => {
    const schema = readFileText('prisma/schema.prisma');

    const productBlockMatch = schema.match(/model Product \{[\s\S]*?\n\}/);
    expect(productBlockMatch).not.toBeNull();
    const productBlock = productBlockMatch![0];

    expect(productBlock).toContain('discountPrice');
    expect(productBlock).toContain('category');
    expect(productBlock).toContain('badge');
    expect(productBlock).toContain('collectionId');
    expect(productBlock).toContain('sortOrder');
    expect(productBlock).toContain('isActive');

    const settingsBlockMatch = schema.match(/model StoreSettings \{[\s\S]*?\n\}/);
    expect(settingsBlockMatch).not.toBeNull();
    const settingsBlock = settingsBlockMatch![0];

    expect(settingsBlock).toContain('freeShippingThreshold');
    expect(
      settingsBlock.includes('shippingFee') || settingsBlock.includes('defaultShippingFee')
    ).toBe(true);
  });

  it('24.3 should expose resilient Prisma delegates for Collection, Order, Customer, Coupon, and StorefrontSection in src/lib/db.ts', async () => {
    const dbMod = await dynamicImport<{ prisma: Record<string, PrismaLikeDelegate> }>('src/lib/db.ts');
    const prisma = dbMod.prisma;

    for (const modelKey of ['collection', 'order', 'customer', 'coupon', 'storefrontSection']) {
      const delegate = prisma[modelKey];
      expect(delegate).toBeDefined();
      expect(typeof delegate.findMany).toBe('function');
      expect(typeof delegate.create).toBe('function');
      expect(typeof delegate.update).toBe('function');
      expect(typeof delegate.delete).toBe('function');
    }

    const col = await prisma.collection.create!({
      data: {
        name: { tr: 'Test Kapsül', en: 'Test Capsule' },
        slug: `test-capsule-${Date.now()}`,
        description: { tr: 'Test açıklaması', en: 'Limited test capsule' },
        isActive: true,
      },
    });
    expect(col.id).toBeDefined();

    const list = await prisma.collection.findMany!();
    expect(list.length).toBeGreaterThanOrEqual(1);

    await prisma.collection.delete!({ where: { id: String(col.id) } });
  });

  it('24.4 should persist resilient file-backed fallback state for CMS sections and commerce entities', async () => {
    const dbMod = await dynamicImport<{ prisma: Record<string, PrismaLikeDelegate> }>('src/lib/db.ts');
    const prisma = dbMod.prisma;

    const testSectionKey = 'marquee';
    const markerText = `RESILIENT TEST ANNOUNCEMENT ${Date.now()}`;

    await prisma.storefrontSection.upsert!({
      where: { key: testSectionKey },
      create: {
        key: testSectionKey,
        data: { visible: true, speedSeconds: 24, items: [{ text: { tr: markerText, en: markerText } }] },
      },
      update: {
        data: { visible: true, speedSeconds: 24, items: [{ text: { tr: markerText, en: markerText } }] },
      },
    });

    const fetched = (await prisma.storefrontSection.findUnique!({
      where: { key: testSectionKey },
    })) as { key?: string; section?: string; data?: Record<string, unknown> } | null;

    expect(fetched).not.toBeNull();
    expect(fetched?.key ?? fetched?.section).toBe(testSectionKey);
    expect(JSON.stringify(fetched?.data)).toContain(markerText);

    // Confirm file-backed fallback snapshot exists on disk when running offline
    const fallbackExists = fileExists('data/store-fallback.json');
    expect(fallbackExists).toBe(true);
  });

  it('24.5 should support offline blob upload, listing, and deletion for local /uploads and mock Vercel Blob URLs', async () => {
    const blobMod = await dynamicImport<{
      uploadBlob: (file: Buffer, filename: string, contentType: string) => Promise<{ url: string; pathname: string }>;
      listAllBlobs: () => Promise<Array<{ url: string; pathname: string }>>;
      deleteBlob: (url: string) => Promise<{ success: boolean; deletedUrl: string }>;
    }>('src/lib/blob.ts');

    const dummyPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const uploaded = await blobMod.uploadBlob(dummyPng, `phase2-test-${Date.now()}.png`, 'image/png');
    expect(uploaded.url).toBeDefined();

    const listedBefore = await blobMod.listAllBlobs();
    expect(listedBefore.some((b) => b.url === uploaded.url)).toBe(true);

    // Offline delete must succeed even when uploaded.url is a local /uploads/... path
    const delRes = await blobMod.deleteBlob(uploaded.url);
    expect(delRes.success).toBe(true);

    const listedAfter = await blobMod.listAllBlobs();
    expect(listedAfter.some((b) => b.url === uploaded.url)).toBe(false);
  });

  it('24.6 should preserve Phase 1 Product & StoreSettings fields alongside Phase 2 defaults', async () => {
    const dbMod = await dynamicImport<{ prisma: Record<string, PrismaLikeDelegate> }>('src/lib/db.ts');
    const products = (await dbMod.prisma.product.findMany!()) as Array<Record<string, unknown>>;
    expect(products.length).toBeGreaterThanOrEqual(3);
    expect(products[0]).toHaveProperty('name');
    expect(products[0]).toHaveProperty('price');
    expect(products[0]).toHaveProperty('variants');

    const settings = (await dbMod.prisma.storeSettings.findFirst!()) as Record<string, unknown> | null;
    expect(settings).not.toBeNull();
    expect(settings).toHaveProperty('whatsappNumber');
    expect(settings).toHaveProperty('currency');
  });
}, { tier: 1, featureId: 24 });
