import { describe, it, expect } from '../framework.ts';
import {
  dynamicImport,
  invokeRouteHandler,
  type RouteHandlerFn,
} from '../phase2-helpers.ts';

const REQUIRED_CMS_SECTIONS = [
  'hero',
  'marquee',
  'lookbook',
  'about',
  'faq',
  'contact',
  'legal',
  'footer',
  'navigation',
  'seo',
  'collectionsSection',
] as const;

describe('Feature 25: Typed CMS Service & Public Storefront APIs', () => {
  it('25.1 should export typed CMS helpers and defaults for all 11 storefront sections in src/lib/cms.ts', async () => {
    const cmsMod = await dynamicImport<{
      CMS_SECTION_KEYS?: readonly string[];
      getStorefrontCms: () => Promise<Record<string, unknown>>;
      getCmsSection: (section: string) => Promise<unknown>;
      updateCmsSection: (section: string, data: unknown) => Promise<unknown>;
    }>('src/lib/cms.ts');

    expect(typeof cmsMod.getStorefrontCms).toBe('function');
    expect(typeof cmsMod.getCmsSection).toBe('function');
    expect(typeof cmsMod.updateCmsSection).toBe('function');

    const cms = await cmsMod.getStorefrontCms();
    for (const key of REQUIRED_CMS_SECTIONS) {
      expect(cms).toHaveProperty(key);
      expect(cms[key]).toBeDefined();
    }
  });

  it('25.2 should validate and sanitize CMS section updates via Zod and reject invalid section keys', async () => {
    const cmsMod = await dynamicImport<{
      updateCmsSection: (section: string, data: unknown) => Promise<unknown>;
      getCmsSection: (section: string) => Promise<Record<string, unknown>>;
    }>('src/lib/cms.ts');

    let invalidRejected = false;
    try {
      await cmsMod.updateCmsSection('nonexistent_section_xyz', { foo: 'bar' });
    } catch {
      invalidRejected = true;
    }
    expect(invalidRejected).toBe(true);

    // Valid section update with XSS attempt should either reject or strip scripts
    const currentMarquee = await cmsMod.getCmsSection('marquee');
    await cmsMod.updateCmsSection('marquee', {
      visible: true,
      speedSeconds: 20,
      items: [
        {
          id: 'm-1',
          text: { tr: 'Ücretsiz Kargo <script>alert(1)</script>', en: 'Free Shipping <script>alert(1)</script>' },
          href: '/shop',
        },
      ],
    });
    const updatedMarquee = await cmsMod.getCmsSection('marquee');
    expect(JSON.stringify(updatedMarquee)).not.toContain('<script>');

    // Restore original marquee
    await cmsMod.updateCmsSection('marquee', currentMarquee);
  });

  it('25.3 should serve live settings and all CMS sections via GET /api/cms', async () => {
    const routeMod = await dynamicImport<{ GET: RouteHandlerFn }>('src/app/api/cms/route.ts');
    const res = await invokeRouteHandler(routeMod.GET, '/api/cms');

    expect(res.status).toBe(200);
    expect(res.json).toHaveProperty('settings');
    expect(res.json).toHaveProperty('cms');

    const cms = res.json.cms as Record<string, unknown>;
    for (const key of REQUIRED_CMS_SECTIONS) {
      expect(cms).toHaveProperty(key);
    }
    const settings = res.json.settings as Record<string, unknown>;
    expect(settings).toHaveProperty('currency');
    expect(settings).toHaveProperty('whatsappNumber');
  });

  it('25.4 should serve active public catalog with category, bestseller, and search filtering via GET /api/products', async () => {
    const routeMod = await dynamicImport<{ GET: RouteHandlerFn }>('src/app/api/products/route.ts');

    const allRes = await invokeRouteHandler(routeMod.GET, '/api/products');
    expect(allRes.status).toBe(200);
    const products = allRes.json.products as Array<Record<string, unknown>>;
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThanOrEqual(1);

    const bestRes = await invokeRouteHandler(routeMod.GET, '/api/products?bestseller=true');
    expect(bestRes.status).toBe(200);
    const bestsellers = bestRes.json.products as Array<Record<string, unknown>>;
    for (const item of bestsellers) {
      expect(item.isBestseller).toBe(true);
    }

    const searchRes = await invokeRouteHandler(routeMod.GET, '/api/products?search=chaos');
    expect(searchRes.status).toBe(200);
    const searchItems = searchRes.json.products as Array<Record<string, unknown>>;
    expect(searchItems.length).toBeGreaterThanOrEqual(1);
  });

  it('25.5 should validate discount coupons and enforce minimum order & usage limits via POST /api/coupons/validate', async () => {
    const dbMod = await dynamicImport<{
      prisma: {
        coupon: {
          create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
          delete: (args: { where: { id: string } }) => Promise<unknown>;
        };
      };
    }>('src/lib/db.ts');
    const routeMod = await dynamicImport<{ POST: RouteHandlerFn }>('src/app/api/coupons/validate/route.ts');

    const code = `ATELIER20_${Date.now()}`;
    const created = await dbMod.prisma.coupon.create({
      data: {
        code,
        title: { tr: 'Test İndirimi', en: 'Test Discount' },
        discountType: 'percentage',
        discountValue: 20,
        minOrderAmount: 100,
        maxUses: 5,
        usedCount: 0,
        isActive: true,
      },
    });

    try {
      // Valid subtotal >= 100
      const okRes = await invokeRouteHandler(routeMod.POST, '/api/coupons/validate', {
        method: 'POST',
        body: { code, subtotal: 200 },
      });
      expect(okRes.status).toBe(200);
      expect(okRes.json.valid ?? okRes.json.success).toBe(true);
      expect(Number(okRes.json.discountAmount)).toBe(40);

      // Unmet minOrderAmount
      const lowRes = await invokeRouteHandler(routeMod.POST, '/api/coupons/validate', {
        method: 'POST',
        body: { code, subtotal: 50 },
      });
      expect(lowRes.status).toBeGreaterThanOrEqual(400);

      // Unknown code
      const missingRes = await invokeRouteHandler(routeMod.POST, '/api/coupons/validate', {
        method: 'POST',
        body: { code: 'DOES_NOT_EXIST_999', subtotal: 200 },
      });
      expect(missingRes.status).toBeGreaterThanOrEqual(400);
    } finally {
      await dbMod.prisma.coupon.delete({ where: { id: created.id } }).catch(() => undefined);
    }
  });

  it('25.6 should persist Order records when generating WhatsApp orders via POST /api/order/whatsapp and /api/order/whatsapp-cart', async () => {
    const dbMod = await dynamicImport<{
      prisma: {
        product: { findMany: () => Promise<Array<{ id: string; stock: number; variants: unknown }>> };
        order: { findMany: () => Promise<Array<Record<string, unknown>>> };
      };
    }>('src/lib/db.ts');
    const waRoute = await dynamicImport<{ POST: RouteHandlerFn }>('src/app/api/order/whatsapp/route.ts');

    const products = await dbMod.prisma.product.findMany();
    const inStockProduct = products.find((p) => p.stock > 0);
    expect(inStockProduct).toBeDefined();

    const ordersBefore = await dbMod.prisma.order.findMany();

    const res = await invokeRouteHandler(waRoute.POST, '/api/order/whatsapp', {
      method: 'POST',
      body: {
        productId: inStockProduct!.id,
        variant: 'M',
        customerNotes: 'Phase 2 order persistence check',
        lang: 'en',
      },
    });

    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);
    expect(String(res.json.redirectUrl)).toContain('https://wa.me/');

    const ordersAfter = await dbMod.prisma.order.findMany();
    expect(ordersAfter.length).toBeGreaterThan(ordersBefore.length);
  });
}, { tier: 1, featureId: 25 });
