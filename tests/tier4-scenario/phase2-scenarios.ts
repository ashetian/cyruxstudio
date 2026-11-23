import { describe, it, expect } from '../framework.ts';
import {
  dynamicImport,
  invokeRouteHandler,
  listFilesRecursive,
  readFileText,
  findDoubleSlashUiStrings,
  findForbiddenJargon,
  findEmojiInUiCopy,
  findPulsingDotOrGlowRemnants,
  findAdminDarkThemeRemnants,
  findExplicitAnyTypes,
  hasAccessibleTouchTargets,
  FORBIDDEN_HUD_PATTERNS,
  FORBIDDEN_STOREFRONT_JARGON,
  type RouteHandlerFn,
} from '../phase2-helpers.ts';

describe('Tier 4: Phase 2 Real-World Scenarios', () => {
  it('T4.6 [Scenario 6: Mobile Admin Rebrand -> Dynamic Storefront Reflection]: admin updates Hero, Marquee, FAQ, Contact & Shipping, verified via public /api/cms', async () => {
    const adminSectionRoute = await dynamicImport<{ PUT: RouteHandlerFn }>(
      'src/app/api/admin/cms/[section]/route.ts'
    );
    const settingsRoute = await dynamicImport<{ GET: RouteHandlerFn; PATCH?: RouteHandlerFn; PUT?: RouteHandlerFn }>(
      'src/app/api/admin/settings/route.ts'
    );
    const publicCmsRoute = await dynamicImport<{ GET: RouteHandlerFn }>(
      'src/app/api/cms/route.ts'
    );
    const cmsMod = await dynamicImport<{
      getStorefrontCms: () => Promise<Record<string, unknown>>;
    }>('src/lib/cms.ts');

    const snapshot = await cmsMod.getStorefrontCms();
    const beforeSettings = (
      await invokeRouteHandler(settingsRoute.GET, '/api/admin/settings', { authenticated: true })
    ).json.settings as Record<string, unknown>;

    const rebrandMarker = `ATELIER_WINTER_${Date.now()}`;
    const updateSettingsHandler = settingsRoute.PATCH || settingsRoute.PUT!;
    const settingsMethod = settingsRoute.PATCH ? 'PATCH' : 'PUT';

    try {
      await invokeRouteHandler(adminSectionRoute.PUT, '/api/admin/cms/hero', {
        method: 'PUT',
        authenticated: true,
        params: { section: 'hero' },
        body: {
          ...(snapshot.hero as Record<string, unknown>),
          eyebrow: { tr: rebrandMarker, en: rebrandMarker },
        },
      });

      await invokeRouteHandler(adminSectionRoute.PUT, '/api/admin/cms/marquee', {
        method: 'PUT',
        authenticated: true,
        params: { section: 'marquee' },
        body: {
          visible: true,
          speedSeconds: 18,
          items: [{ id: 'm-rebrand', text: { tr: rebrandMarker, en: rebrandMarker }, href: '/shop' }],
        },
      });

      await invokeRouteHandler(adminSectionRoute.PUT, '/api/admin/cms/contact', {
        method: 'PUT',
        authenticated: true,
        params: { section: 'contact' },
        body: {
          ...(snapshot.contact as Record<string, unknown>),
          email: `atelier+${Date.now()}@cyruxstudio.com`,
        },
      });

      await invokeRouteHandler(updateSettingsHandler, '/api/admin/settings', {
        method: settingsMethod,
        authenticated: true,
        body: { freeShippingThreshold: 300 },
      });

      const pubRes = await invokeRouteHandler(publicCmsRoute.GET, '/api/cms');
      expect(pubRes.status).toBe(200);
      const serialized = JSON.stringify(pubRes.json);
      expect(serialized).toContain(rebrandMarker);
      expect(Number((pubRes.json.settings as Record<string, unknown>).freeShippingThreshold)).toBe(300);
    } finally {
      await invokeRouteHandler(adminSectionRoute.PUT, '/api/admin/cms/hero', {
        method: 'PUT',
        authenticated: true,
        params: { section: 'hero' },
        body: snapshot.hero,
      });
      await invokeRouteHandler(adminSectionRoute.PUT, '/api/admin/cms/marquee', {
        method: 'PUT',
        authenticated: true,
        params: { section: 'marquee' },
        body: snapshot.marquee,
      });
      await invokeRouteHandler(adminSectionRoute.PUT, '/api/admin/cms/contact', {
        method: 'PUT',
        authenticated: true,
        params: { section: 'contact' },
        body: snapshot.contact,
      });
      await invokeRouteHandler(updateSettingsHandler, '/api/admin/settings', {
        method: settingsMethod,
        authenticated: true,
        body: { freeShippingThreshold: beforeSettings.freeShippingThreshold ?? 200 },
      });
    }
  });

  it('T4.7 [Scenario 7: Full Commerce Lifecycle]: discounted product + coupon -> WhatsApp cart order -> fulfillment tracking -> customer aggregation', async () => {
    const prodRoute = await dynamicImport<{ POST: RouteHandlerFn }>('src/app/api/admin/products/route.ts');
    const prodItemRoute = await dynamicImport<{ DELETE: RouteHandlerFn }>('src/app/api/admin/products/[id]/route.ts');
    const couponRoute = await dynamicImport<{ POST: RouteHandlerFn }>('src/app/api/admin/coupons/route.ts');
    const couponItemRoute = await dynamicImport<{ DELETE: RouteHandlerFn }>('src/app/api/admin/coupons/[id]/route.ts');
    const validateRoute = await dynamicImport<{ POST: RouteHandlerFn }>('src/app/api/coupons/validate/route.ts');
    const cartOrderRoute = await dynamicImport<{ POST: RouteHandlerFn }>('src/app/api/order/whatsapp-cart/route.ts');
    const ordersRoute = await dynamicImport<{ GET: RouteHandlerFn }>('src/app/api/admin/orders/route.ts');
    const orderItemRoute = await dynamicImport<{ PATCH: RouteHandlerFn; DELETE: RouteHandlerFn }>('src/app/api/admin/orders/[id]/route.ts');
    const customersRoute = await dynamicImport<{ GET: RouteHandlerFn }>('src/app/api/admin/customers/route.ts');

    const prodRes = await invokeRouteHandler(prodRoute.POST, '/api/admin/products', {
      method: 'POST',
      authenticated: true,
      body: {
        name: 'Lifecycle Coat',
        slug: `lifecycle-coat-${Date.now()}`,
        price: 300,
        discountPrice: 240,
        badge: 'ARCHIVE',
        stock: 10,
        variants: [{ id: 'm', name: 'M', inStock: true }],
      },
    });
    expect(prodRes.status).toBe(201);
    const productId = (prodRes.json.product as { id: string }).id;

    const code = `LIFECYCLE10_${Date.now()}`;
    const couponRes = await invokeRouteHandler(couponRoute.POST, '/api/admin/coupons', {
      method: 'POST',
      authenticated: true,
      body: {
        code,
        title: { tr: 'Yaşam Döngüsü 10', en: 'Lifecycle 10' },
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 50,
        maxUses: 5,
        isActive: true,
      },
    });
    expect(couponRes.status).toBe(201);
    const couponId = (couponRes.json.coupon as { id: string }).id;

    let createdOrderId: string | null = null;
    try {
      const valRes = await invokeRouteHandler(validateRoute.POST, '/api/coupons/validate', {
        method: 'POST',
        body: { code, subtotal: 240 },
      });
      expect(valRes.status).toBe(200);
      expect(Number(valRes.json.discountAmount)).toBe(24);

      const phone = `+90533${String(Date.now()).slice(-7)}`;
      const orderRes = await invokeRouteHandler(cartOrderRoute.POST, '/api/order/whatsapp-cart', {
        method: 'POST',
        body: {
          items: [{ productId, variant: 'M', quantity: 1 }],
          couponCode: code,
          customerName: 'Selin Aksoy',
          customerPhone: phone,
          lang: 'en',
        },
      });
      expect(orderRes.status).toBe(200);

      const listOrders = await invokeRouteHandler(ordersRoute.GET, '/api/admin/orders', {
        authenticated: true,
      });
      const orders = listOrders.json.orders as Array<Record<string, unknown>>;
      const latestOrder = orders.find((o) => String(o.customerPhone || '').includes(phone.slice(-7)));
      expect(latestOrder).toBeDefined();
      createdOrderId = String(latestOrder!.id);

      const shipRes = await invokeRouteHandler(orderItemRoute.PATCH, `/api/admin/orders/${createdOrderId}`, {
        method: 'PATCH',
        authenticated: true,
        params: { id: createdOrderId },
        body: {
          status: 'shipped',
          trackingNumber: 'CYR-LIFE-001',
          trackingCarrier: 'DHL',
        },
      });
      expect(shipRes.status).toBe(200);
      expect((shipRes.json.order as Record<string, unknown>).status).toBe('shipped');

      const custRes = await invokeRouteHandler(customersRoute.GET, '/api/admin/customers', {
        authenticated: true,
      });
      expect(custRes.status).toBe(200);
      expect((custRes.json.customers as Array<unknown>).length).toBeGreaterThanOrEqual(1);
    } finally {
      if (createdOrderId) {
        await invokeRouteHandler(orderItemRoute.DELETE, `/api/admin/orders/${createdOrderId}`, {
          method: 'DELETE',
          authenticated: true,
          params: { id: createdOrderId },
        }).catch(() => undefined);
      }
      await invokeRouteHandler(couponItemRoute.DELETE, `/api/admin/coupons/${couponId}`, {
        method: 'DELETE',
        authenticated: true,
        params: { id: couponId },
      }).catch(() => undefined);
      await invokeRouteHandler(prodItemRoute.DELETE, `/api/admin/products/${productId}`, {
        method: 'DELETE',
        authenticated: true,
        params: { id: productId },
      }).catch(() => undefined);
    }
  });

  it('T4.8 [Scenario 8: Global Pure UI & Anti-Slop Compliance Audit Across src/]: zero // labels, zero HUD jargon, zero emojis, zero pulse dots, zero admin dark remnants', () => {
    const adminFiles = [
      ...listFilesRecursive('src/app/admin', ['.ts', '.tsx']),
      ...listFilesRecursive('src/components/admin', ['.ts', '.tsx']),
    ];
    const storefrontFiles = [
      ...listFilesRecursive('src/app', ['.ts', '.tsx']).filter(
        (f) => !f.startsWith('src/app/admin') && !f.startsWith('src/app/api')
      ),
      ...listFilesRecursive('src/components/storefront', ['.ts', '.tsx']),
    ];

    const violations: string[] = [];

    for (const file of adminFiles) {
      const content = readFileText(file);
      for (const h of findAdminDarkThemeRemnants(content)) violations.push(`${file} [admin-dark]: ${h}`);
      for (const h of findDoubleSlashUiStrings(content)) violations.push(`${file} [//]: ${h}`);
      for (const h of findForbiddenJargon(content, FORBIDDEN_HUD_PATTERNS)) violations.push(`${file} [hud]: ${h}`);
      for (const h of findEmojiInUiCopy(content)) violations.push(`${file} [emoji]: ${h}`);
      for (const h of findPulsingDotOrGlowRemnants(content)) violations.push(`${file} [pulse]: ${h}`);
    }

    for (const file of storefrontFiles) {
      const content = readFileText(file);
      for (const h of findDoubleSlashUiStrings(content)) violations.push(`${file} [//]: ${h}`);
      for (const h of findForbiddenJargon(content, FORBIDDEN_STOREFRONT_JARGON)) violations.push(`${file} [jargon]: ${h}`);
      for (const h of findEmojiInUiCopy(content)) violations.push(`${file} [emoji]: ${h}`);
      for (const h of findPulsingDotOrGlowRemnants(content)) violations.push(`${file} [pulse]: ${h}`);
    }

    expect(violations).toHaveLength(0);
  });

  it('T4.9 [Scenario 9: Phase 2 Architecture, Mobile Tap Targets & Zero-any Audit Across src/]: all Phase 2 modules wired cleanly with zero `any` types', () => {
    const requiredModules = [
      'src/lib/cms.ts',
      'src/components/admin/admin-bottom-nav.tsx',
      'src/components/admin/admin-bottom-sheet.tsx',
      'src/components/admin/admin-overview.tsx',
      'src/components/admin/collections-manager.tsx',
      'src/components/admin/orders-manager.tsx',
      'src/components/admin/customers-manager.tsx',
      'src/components/admin/coupons-manager.tsx',
      'src/components/admin/cms-studio.tsx',
      'src/components/storefront/marquee-bar.tsx',
      'src/components/storefront/featured-collections.tsx',
      'src/components/storefront/faq-section.tsx',
      'src/components/storefront/contact-section.tsx',
      'src/app/shop/page.tsx',
      'src/app/about/page.tsx',
      'src/app/faq/page.tsx',
      'src/app/contact/page.tsx',
      'src/app/legal/page.tsx',
    ];

    for (const mod of requiredModules) {
      const src = readFileText(mod);
      expect(src.length).toBeGreaterThan(0);
      if (mod.endsWith('.tsx') && src.includes('<button')) {
        expect(hasAccessibleTouchTargets(src)).toBe(true);
      }
    }

    // Check zero explicit `any` types across all src/ TypeScript files
    const allSrcFiles = listFilesRecursive('src', ['.ts', '.tsx']);
    const anyViolations: string[] = [];
    for (const file of allSrcFiles) {
      const hits = findExplicitAnyTypes(readFileText(file));
      for (const hit of hits) {
        anyViolations.push(`${file}: ${hit}`);
      }
    }
    expect(anyViolations).toHaveLength(0);
  });
}, { tier: 4 });
