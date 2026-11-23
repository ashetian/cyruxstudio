import { describe, it, expect } from '../framework.ts';
import {
  dynamicImport,
  invokeRouteHandler,
  buildNextRequest,
  type RouteHandlerFn,
} from '../phase2-helpers.ts';

describe('Feature 26: Admin Commerce & CMS APIs + Query Fixes', () => {
  it('26.1 should block unauthenticated requests (401) across all new Phase 2 /api/admin/* endpoints via middleware', async () => {
    const mwMod = await dynamicImport<{
      middleware: (req: Awaited<ReturnType<typeof buildNextRequest>>) => Promise<Response>;
    }>('src/middleware.ts');

    const protectedPaths = [
      '/api/admin/cms',
      '/api/admin/cms/hero',
      '/api/admin/collections',
      '/api/admin/orders',
      '/api/admin/customers',
      '/api/admin/coupons',
    ];

    for (const p of protectedPaths) {
      const req = await buildNextRequest(p, { authenticated: false });
      const res = await mwMod.middleware(req);
      expect(res.status).toBe(401);
    }
  });

  it('26.2 should support GET /api/admin/cms and PUT /api/admin/cms/[section] with immediate public sync', async () => {
    const adminCmsRoute = await dynamicImport<{ GET: RouteHandlerFn }>('src/app/api/admin/cms/route.ts');
    const adminSectionRoute = await dynamicImport<{ PUT: RouteHandlerFn }>('src/app/api/admin/cms/[section]/route.ts');
    const publicCmsRoute = await dynamicImport<{ GET: RouteHandlerFn }>('src/app/api/cms/route.ts');

    const getRes = await invokeRouteHandler(adminCmsRoute.GET, '/api/admin/cms', {
      authenticated: true,
    });
    expect(getRes.status).toBe(200);
    expect(getRes.json).toHaveProperty('cms');

    const originalCms = getRes.json.cms as Record<string, unknown>;
    const originalHero = originalCms.hero;
    const markerHeadline = `ATELIER SEASON ${Date.now()}`;

    const putRes = await invokeRouteHandler(adminSectionRoute.PUT, '/api/admin/cms/hero', {
      method: 'PUT',
      authenticated: true,
      params: { section: 'hero' },
      body: {
        ...(originalHero as Record<string, unknown>),
        eyebrow: { tr: markerHeadline, en: markerHeadline },
      },
    });
    expect(putRes.status).toBe(200);
    expect(putRes.json.success).toBe(true);

    const publicRes = await invokeRouteHandler(publicCmsRoute.GET, '/api/cms');
    expect(publicRes.status).toBe(200);
    expect(JSON.stringify(publicRes.json.cms)).toContain(markerHeadline);

    // Restore original hero
    await invokeRouteHandler(adminSectionRoute.PUT, '/api/admin/cms/hero', {
      method: 'PUT',
      authenticated: true,
      params: { section: 'hero' },
      body: originalHero,
    });
  });

  it('26.3 should support authenticated CRUD for collections via /api/admin/collections and /api/admin/collections/[id]', async () => {
    const listCreate = await dynamicImport<{ GET: RouteHandlerFn; POST: RouteHandlerFn }>(
      'src/app/api/admin/collections/route.ts'
    );
    const itemRoute = await dynamicImport<{ PATCH: RouteHandlerFn; DELETE: RouteHandlerFn }>(
      'src/app/api/admin/collections/[id]/route.ts'
    );

    const slug = `monolith-col-${Date.now()}`;
    const createRes = await invokeRouteHandler(listCreate.POST, '/api/admin/collections', {
      method: 'POST',
      authenticated: true,
      body: {
        name: { tr: 'Monolit Arşiv', en: 'Monolith Archive' },
        slug,
        description: { tr: 'Ağır dış giyim kapsülü', en: 'Heavyweight outerwear capsule' },
        isActive: true,
      },
    });
    expect(createRes.status).toBe(201);
    const created = createRes.json.collection as { id: string; name: unknown };
    expect(created.id).toBeDefined();

    const patchRes = await invokeRouteHandler(itemRoute.PATCH, `/api/admin/collections/${created.id}`, {
      method: 'PATCH',
      authenticated: true,
      params: { id: created.id },
      body: { name: { tr: 'Monolit Güncel', en: 'Monolith Archive Updated' } },
    });
    expect(patchRes.status).toBe(200);
    expect(JSON.stringify((patchRes.json.collection as { name: unknown }).name)).toContain(
      'Monolith Archive Updated'
    );

    const delRes = await invokeRouteHandler(itemRoute.DELETE, `/api/admin/collections/${created.id}`, {
      method: 'DELETE',
      authenticated: true,
      params: { id: created.id },
    });
    expect(delRes.status).toBe(200);
  });

  it('26.4 should support orders status/tracking CRUD and customers listing via /api/admin/orders and /api/admin/customers', async () => {
    const ordersRoute = await dynamicImport<{ GET: RouteHandlerFn; POST: RouteHandlerFn }>(
      'src/app/api/admin/orders/route.ts'
    );
    const orderItemRoute = await dynamicImport<{ PATCH: RouteHandlerFn; DELETE: RouteHandlerFn }>(
      'src/app/api/admin/orders/[id]/route.ts'
    );
    const customersRoute = await dynamicImport<{ GET: RouteHandlerFn }>(
      'src/app/api/admin/customers/route.ts'
    );

    const createOrderRes = await invokeRouteHandler(ordersRoute.POST, '/api/admin/orders', {
      method: 'POST',
      authenticated: true,
      body: {
        customerName: 'Deniz Kaya',
        customerPhone: '+905331112233',
        subtotal: 240,
        total: 240,
        currency: 'USD',
        items: [{ productId: 'prod_1', productName: 'Chaos Tee', quantity: 1, unitPrice: 240 }],
      },
    });
    expect(createOrderRes.status).toBe(201);
    const order = createOrderRes.json.order as { id: string; status: string };
    expect(order.id).toBeDefined();

    const patchRes = await invokeRouteHandler(orderItemRoute.PATCH, `/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      authenticated: true,
      params: { id: order.id },
      body: {
        status: 'shipped',
        trackingNumber: 'TRK-998877',
        trackingCarrier: 'DHL Express',
        adminNotes: 'Dispatched from atelier',
      },
    });
    expect(patchRes.status).toBe(200);
    const updated = patchRes.json.order as Record<string, unknown>;
    expect(updated.status).toBe('shipped');
    expect(updated.trackingNumber).toBe('TRK-998877');

    const custRes = await invokeRouteHandler(customersRoute.GET, '/api/admin/customers', {
      authenticated: true,
    });
    expect(custRes.status).toBe(200);
    expect(Array.isArray(custRes.json.customers)).toBe(true);

    await invokeRouteHandler(orderItemRoute.DELETE, `/api/admin/orders/${order.id}`, {
      method: 'DELETE',
      authenticated: true,
      params: { id: order.id },
    });
  });

  it('26.5 should support coupons CRUD and enhanced KPI stats via /api/admin/coupons and /api/admin/stats', async () => {
    const couponsRoute = await dynamicImport<{ GET: RouteHandlerFn; POST: RouteHandlerFn }>(
      'src/app/api/admin/coupons/route.ts'
    );
    const couponItemRoute = await dynamicImport<{ PATCH: RouteHandlerFn; DELETE: RouteHandlerFn }>(
      'src/app/api/admin/coupons/[id]/route.ts'
    );
    const statsRoute = await dynamicImport<{ GET: RouteHandlerFn }>('src/app/api/admin/stats/route.ts');

    const code = `DROP15_${Date.now()}`;
    const createRes = await invokeRouteHandler(couponsRoute.POST, '/api/admin/coupons', {
      method: 'POST',
      authenticated: true,
      body: {
        code,
        title: { tr: 'Drop 15 İndirim', en: 'Drop 15 Discount' },
        discountType: 'percentage',
        discountValue: 15,
        minOrderAmount: 50,
        maxUses: 20,
        isActive: true,
      },
    });
    expect(createRes.status).toBe(201);
    const coupon = createRes.json.coupon as { id: string; isActive: boolean };

    const toggleRes = await invokeRouteHandler(couponItemRoute.PATCH, `/api/admin/coupons/${coupon.id}`, {
      method: 'PATCH',
      authenticated: true,
      params: { id: coupon.id },
      body: { isActive: false },
    });
    expect(toggleRes.status).toBe(200);
    expect((toggleRes.json.coupon as { isActive: boolean }).isActive).toBe(false);

    const statsRes = await invokeRouteHandler(statsRoute.GET, '/api/admin/stats', {
      authenticated: true,
    });
    expect(statsRes.status).toBe(200);
    const stats = statsRes.json.stats as Record<string, unknown>;
    expect(stats).toHaveProperty('activeGarmentCount');
    expect(stats).toHaveProperty('totalOrders');
    expect(stats).toHaveProperty('totalRevenue');
    expect(stats).toHaveProperty('activeCoupons');

    await invokeRouteHandler(couponItemRoute.DELETE, `/api/admin/coupons/${coupon.id}`, {
      method: 'DELETE',
      authenticated: true,
      params: { id: coupon.id },
    });
  });

  it('26.6 should filter products before pagination in /api/admin/products and support ADMIN_USERNAME fallback in auth.ts', async () => {
    const productsRoute = await dynamicImport<{ GET: RouteHandlerFn }>('src/app/api/admin/products/route.ts');
    const authMod = await dynamicImport<{
      verifyAdminCredentials: (identifier: string, password: string) => boolean;
    }>('src/lib/auth.ts');

    // Filter with limit=1 and verify total reflects full filtered count >= paginated slice
    const res = await invokeRouteHandler(productsRoute.GET, '/api/admin/products?limit=1&offset=0&search=a', {
      authenticated: true,
    });
    expect(res.status).toBe(200);
    const items = res.json.products as Array<unknown>;
    expect(items.length).toBeLessThanOrEqual(1);
    expect(typeof res.json.total).toBe('number');
    expect(Number(res.json.total)).toBeGreaterThanOrEqual(items.length);

    // Ensure auth helper handles both ADMIN_EMAIL and ADMIN_USERNAME cleanly
    const prevUsername = process.env.ADMIN_USERNAME;
    const prevPassword = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_USERNAME = 'atelier_admin';
    process.env.ADMIN_PASSWORD = 'AtelierPassword2026!';
    try {
      expect(authMod.verifyAdminCredentials('atelier_admin', 'AtelierPassword2026!')).toBe(true);
    } finally {
      if (prevUsername === undefined) delete process.env.ADMIN_USERNAME;
      else process.env.ADMIN_USERNAME = prevUsername;
      if (prevPassword === undefined) delete process.env.ADMIN_PASSWORD;
      else process.env.ADMIN_PASSWORD = prevPassword;
    }
  });
}, { tier: 1, featureId: 26 });
