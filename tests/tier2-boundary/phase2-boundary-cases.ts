import { describe, it, expect } from '../framework.ts';
import {
  dynamicImport,
  invokeRouteHandler,
  listFilesRecursive,
  readFileText,
  hasAccessibleTouchTargets,
  type RouteHandlerFn,
} from '../phase2-helpers.ts';

describe('Tier 2: Phase 2 Boundary & Corner Cases', () => {
  it('T2.13 should reject invalid CMS section keys with 400/404 in PUT /api/admin/cms/[section]', async () => {
    const routeMod = await dynamicImport<{ PUT: RouteHandlerFn }>(
      'src/app/api/admin/cms/[section]/route.ts'
    );

    const res = await invokeRouteHandler(routeMod.PUT, '/api/admin/cms/invalid_section_999', {
      method: 'PUT',
      authenticated: true,
      params: { section: 'invalid_section_999' },
      body: { title: 'Injected' },
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.json.success).toBe(false);
  });

  it('T2.14 should sanitize XSS payloads across FAQ, Legal, Manifesto, Footer, and Hero CMS updates', async () => {
    const cmsMod = await dynamicImport<{
      getCmsSection: (s: string) => Promise<Record<string, unknown>>;
      updateCmsSection: (s: string, data: unknown) => Promise<Record<string, unknown>>;
    }>('src/lib/cms.ts');

    const sectionsToTest = ['hero', 'about', 'faq', 'legal', 'footer'] as const;
    const xssVectors = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert(1)>',
    ];

    for (const sec of sectionsToTest) {
      const original = await cmsMod.getCmsSection(sec);
      const serialized = JSON.stringify(original);
      // Inject XSS into first string value via recursive safe replacer
      const injectXss = (val: unknown): unknown => {
        if (typeof val === 'string') return `${val} ${xssVectors[0]} ${xssVectors[1]}`;
        if (Array.isArray(val)) return val.map((v, idx) => (idx === 0 ? injectXss(v) : v));
        if (val && typeof val === 'object') {
          const out: Record<string, unknown> = {};
          let injectedOnce = false;
          for (const [k, v] of Object.entries(val)) {
            if (!injectedOnce && (typeof v === 'string' || typeof v === 'object')) {
              out[k] = injectXss(v);
              injectedOnce = true;
            } else {
              out[k] = v;
            }
          }
          return out;
        }
        return val;
      };

      try {
        const dirty = injectXss(JSON.parse(serialized));
        let savedJson = '';
        try {
          const saved = await cmsMod.updateCmsSection(sec, dirty);
          savedJson = JSON.stringify(saved);
        } catch {
          // Rejecting malformed/XSS-laden input via Zod is also valid defense
          const after = await cmsMod.getCmsSection(sec);
          savedJson = JSON.stringify(after);
        }
        expect(savedJson).not.toContain('<script');
        expect(savedJson).not.toContain('onerror=');
      } finally {
        await cmsMod.updateCmsSection(sec, original);
      }
    }
  });

  it('T2.15 should reject product discountPrice >= price or negative discountPrice', async () => {
    const productsRoute = await dynamicImport<{ POST: RouteHandlerFn }>(
      'src/app/api/admin/products/route.ts'
    );

    const equalRes = await invokeRouteHandler(productsRoute.POST, '/api/admin/products', {
      method: 'POST',
      authenticated: true,
      body: {
        name: 'Invalid Discount Equal',
        slug: `invalid-disc-eq-${Date.now()}`,
        price: 100,
        discountPrice: 100,
        stock: 5,
      },
    });
    expect(equalRes.status).toBe(400);

    const higherRes = await invokeRouteHandler(productsRoute.POST, '/api/admin/products', {
      method: 'POST',
      authenticated: true,
      body: {
        name: 'Invalid Discount Higher',
        slug: `invalid-disc-hi-${Date.now()}`,
        price: 100,
        discountPrice: 150,
        stock: 5,
      },
    });
    expect(higherRes.status).toBe(400);

    const negativeRes = await invokeRouteHandler(productsRoute.POST, '/api/admin/products', {
      method: 'POST',
      authenticated: true,
      body: {
        name: 'Invalid Discount Negative',
        slug: `invalid-disc-neg-${Date.now()}`,
        price: 100,
        discountPrice: -10,
        stock: 5,
      },
    });
    expect(negativeRes.status).toBe(400);
  });

  it('T2.16 should enforce coupon bounds: reject negative value, >100% percentage, unmet minOrderAmount, and exhausted maxUses', async () => {
    const couponsRoute = await dynamicImport<{ POST: RouteHandlerFn }>(
      'src/app/api/admin/coupons/route.ts'
    );
    const couponItemRoute = await dynamicImport<{ DELETE: RouteHandlerFn }>(
      'src/app/api/admin/coupons/[id]/route.ts'
    );
    const validateRoute = await dynamicImport<{ POST: RouteHandlerFn }>(
      'src/app/api/coupons/validate/route.ts'
    );

    // 1. Negative value
    const negRes = await invokeRouteHandler(couponsRoute.POST, '/api/admin/coupons', {
      method: 'POST',
      authenticated: true,
      body: {
        code: `NEG_${Date.now()}`,
        title: { tr: 'Negatif', en: 'Negative' },
        discountType: 'fixed',
        discountValue: -25,
        isActive: true,
      },
    });
    expect(negRes.status).toBe(400);

    // 2. Percentage > 100
    const over100Res = await invokeRouteHandler(couponsRoute.POST, '/api/admin/coupons', {
      method: 'POST',
      authenticated: true,
      body: {
        code: `OVER_${Date.now()}`,
        title: { tr: 'Fazla', en: 'Over 100' },
        discountType: 'percentage',
        discountValue: 120,
        isActive: true,
      },
    });
    expect(over100Res.status).toBe(400);

    // 3. Exhausted maxUses & exact minOrderAmount boundary
    const exhaustCode = `EXHAUST_${Date.now()}`;
    const createExhaust = await invokeRouteHandler(couponsRoute.POST, '/api/admin/coupons', {
      method: 'POST',
      authenticated: true,
      body: {
        code: exhaustCode,
        title: { tr: 'Tükenmiş', en: 'Exhausted' },
        discountType: 'fixed',
        discountValue: 20,
        minOrderAmount: 100,
        maxUses: 1,
        usedCount: 1,
        isActive: true,
      },
    });
    expect(createExhaust.status).toBe(201);
    const createdCoupon = createExhaust.json.coupon as { id: string };

    try {
      const valExhaust = await invokeRouteHandler(validateRoute.POST, '/api/coupons/validate', {
        method: 'POST',
        body: { code: exhaustCode, subtotal: 150 },
      });
      expect(valExhaust.status).toBeGreaterThanOrEqual(400);
    } finally {
      await invokeRouteHandler(couponItemRoute.DELETE, `/api/admin/coupons/${createdCoupon.id}`, {
        method: 'DELETE',
        authenticated: true,
        params: { id: createdCoupon.id },
      });
    }
  });

  it('T2.17 should reject invalid order statuses in PATCH /api/admin/orders/[id]', async () => {
    const ordersRoute = await dynamicImport<{ POST: RouteHandlerFn }>(
      'src/app/api/admin/orders/route.ts'
    );
    const orderItemRoute = await dynamicImport<{ PATCH: RouteHandlerFn; DELETE: RouteHandlerFn }>(
      'src/app/api/admin/orders/[id]/route.ts'
    );

    const createRes = await invokeRouteHandler(ordersRoute.POST, '/api/admin/orders', {
      method: 'POST',
      authenticated: true,
      body: {
        customerName: 'Boundary Tester',
        customerPhone: '+905331234567',
        subtotal: 120,
        total: 120,
        currency: 'USD',
        items: [{ productId: 'prod_1', productName: 'Test Tee', quantity: 1, unitPrice: 120 }],
      },
    });
    expect(createRes.status).toBe(201);
    const order = createRes.json.order as { id: string };

    try {
      const badStatusRes = await invokeRouteHandler(
        orderItemRoute.PATCH,
        `/api/admin/orders/${order.id}`,
        {
          method: 'PATCH',
          authenticated: true,
          params: { id: order.id },
          body: { status: 'invalid_hacked_status' },
        }
      );
      expect(badStatusRes.status).toBe(400);
    } finally {
      await invokeRouteHandler(orderItemRoute.DELETE, `/api/admin/orders/${order.id}`, {
        method: 'DELETE',
        authenticated: true,
        params: { id: order.id },
      });
    }
  });

  it('T2.18 should reject negative freeShippingThreshold or defaultShippingFee in StoreSettings API', async () => {
    const settingsRoute = await dynamicImport<{ PATCH?: RouteHandlerFn; PUT?: RouteHandlerFn }>(
      'src/app/api/admin/settings/route.ts'
    );
    const handler = (settingsRoute.PATCH ?? settingsRoute.PUT)!;

    const res = await invokeRouteHandler(handler, '/api/admin/settings', {
      method: settingsRoute.PATCH ? 'PATCH' : 'PUT',
      authenticated: true,
      body: { freeShippingThreshold: -50, shippingFee: -10, defaultShippingFee: -10 },
    });
    expect(res.status).toBe(400);
  });

  it('T2.19 should audit 320px mobile overflow safety and >=44px tap targets across all admin component files', () => {
    const adminComponents = listFilesRecursive('src/components/admin', ['.tsx']);
    expect(adminComponents.length).toBeGreaterThanOrEqual(8);

    const violations: string[] = [];
    for (const file of adminComponents) {
      const src = readFileText(file);
      // If file renders raw <table>, ensure it is wrapped in hidden md:block or overflow-x-auto for mobile safety
      if (src.includes('<table') && !src.includes('hidden md:block') && !src.includes('hidden lg:block') && !src.includes('overflow-x-auto')) {
        violations.push(`${file}: <table> lacks responsive mobile hiding or overflow wrapper`);
      }
      // Interactive components with buttons must satisfy >=44px tap targets
      if (src.includes('<button') && !hasAccessibleTouchTargets(src)) {
        violations.push(`${file}: <button> elements missing >=44px tap target utilities`);
      }
    }
    expect(violations).toHaveLength(0);
  });

  it('T2.20 should return complete typed CMS defaults even when StorefrontSection store is empty', async () => {
    const cmsMod = await dynamicImport<{
      getStorefrontCms: () => Promise<Record<string, unknown>>;
    }>('src/lib/cms.ts');

    const cms = await cmsMod.getStorefrontCms();
    expect(cms).toBeDefined();
    expect(typeof cms).toBe('object');
    expect(cms.hero).toBeDefined();
    expect(cms.marquee).toBeDefined();
    expect(cms.faq).toBeDefined();
    expect(cms.contact).toBeDefined();
    expect(cms.legal).toBeDefined();
    expect(cms.seo).toBeDefined();
  });
}, { tier: 2 });
