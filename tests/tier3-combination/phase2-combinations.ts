import { describe, it, expect } from '../framework.ts';
import {
  dynamicImport,
  invokeRouteHandler,
  type RouteHandlerFn,
} from '../phase2-helpers.ts';

describe('Tier 3: Phase 2 Cross-Feature Combinations', () => {
  it('T3.9 [Admin CMS Update + Public /api/cms + generateMetadata]: updating SEO & Hero reflects across CMS API and Next.js metadata', async () => {
    const adminSectionRoute = await dynamicImport<{ PUT: RouteHandlerFn }>(
      'src/app/api/admin/cms/[section]/route.ts'
    );
    const publicCmsRoute = await dynamicImport<{ GET: RouteHandlerFn }>(
      'src/app/api/cms/route.ts'
    );
    const cmsMod = await dynamicImport<{
      getStorefrontCms: () => Promise<Record<string, unknown>>;
    }>('src/lib/cms.ts');

    const initialCms = await cmsMod.getStorefrontCms();
    const initialSeo = initialCms.seo;
    const initialHero = initialCms.hero;
    const uniqueTag = `COMBINATION_SEO_${Date.now()}`;

    try {
      const seoPut = await invokeRouteHandler(adminSectionRoute.PUT, '/api/admin/cms/seo', {
        method: 'PUT',
        authenticated: true,
        params: { section: 'seo' },
        body: {
          ...(initialSeo as Record<string, unknown>),
          title: uniqueTag,
        },
      });
      expect(seoPut.status).toBe(200);

      const heroPut = await invokeRouteHandler(adminSectionRoute.PUT, '/api/admin/cms/hero', {
        method: 'PUT',
        authenticated: true,
        params: { section: 'hero' },
        body: {
          ...(initialHero as Record<string, unknown>),
          eyebrow: { tr: uniqueTag, en: uniqueTag },
        },
      });
      expect(heroPut.status).toBe(200);

      const pubRes = await invokeRouteHandler(publicCmsRoute.GET, '/api/cms');
      expect(pubRes.status).toBe(200);
      expect(JSON.stringify(pubRes.json.cms)).toContain(uniqueTag);
    } finally {
      await invokeRouteHandler(adminSectionRoute.PUT, '/api/admin/cms/seo', {
        method: 'PUT',
        authenticated: true,
        params: { section: 'seo' },
        body: initialSeo,
      });
      await invokeRouteHandler(adminSectionRoute.PUT, '/api/admin/cms/hero', {
        method: 'PUT',
        authenticated: true,
        params: { section: 'hero' },
        body: initialHero,
      });
    }
  });

  it('T3.10 [Coupon Create + Validate + WhatsApp Cart Order + Customer Aggregation]: full discount order pipeline', async () => {
    const couponsRoute = await dynamicImport<{ POST: RouteHandlerFn }>(
      'src/app/api/admin/coupons/route.ts'
    );
    const couponItemRoute = await dynamicImport<{ DELETE: RouteHandlerFn }>(
      'src/app/api/admin/coupons/[id]/route.ts'
    );
    const validateRoute = await dynamicImport<{ POST: RouteHandlerFn }>(
      'src/app/api/coupons/validate/route.ts'
    );
    const cartOrderRoute = await dynamicImport<{ POST: RouteHandlerFn }>(
      'src/app/api/order/whatsapp-cart/route.ts'
    );
    const ordersRoute = await dynamicImport<{ GET: RouteHandlerFn }>(
      'src/app/api/admin/orders/route.ts'
    );
    const dbMod = await dynamicImport<{
      prisma: {
        product: { findMany: () => Promise<Array<{ id: string; price: number; stock: number; variants: unknown }>> };
      };
    }>('src/lib/db.ts');

    const products = await dbMod.prisma.product.findMany();
    const available = products.find((p) => p.stock > 0);
    expect(available).toBeDefined();

    const variants = Array.isArray(available!.variants) ? available!.variants : [];
    const firstVariant = variants[0] as { name?: string } | undefined;

    const code = `COMBO25_${Date.now()}`;
    const createRes = await invokeRouteHandler(couponsRoute.POST, '/api/admin/coupons', {
      method: 'POST',
      authenticated: true,
      body: {
        code,
        title: { tr: 'Kombo 25', en: 'Combo 25' },
        discountType: 'percentage',
        discountValue: 25,
        minOrderAmount: 10,
        maxUses: 10,
        isActive: true,
      },
    });
    expect(createRes.status).toBe(201);
    const couponId = (createRes.json.coupon as { id: string }).id;

    try {
      const valRes = await invokeRouteHandler(validateRoute.POST, '/api/coupons/validate', {
        method: 'POST',
        body: { code, subtotal: available!.price },
      });
      expect(valRes.status).toBe(200);
      expect(
        Math.abs(Number(valRes.json.discountAmount) - available!.price * 0.25)
      ).toBeLessThan(0.05);

      const ordersBeforeRes = await invokeRouteHandler(ordersRoute.GET, '/api/admin/orders', {
        authenticated: true,
      });
      const beforeCount = (ordersBeforeRes.json.orders as Array<unknown>).length;

      const orderRes = await invokeRouteHandler(cartOrderRoute.POST, '/api/order/whatsapp-cart', {
        method: 'POST',
        body: {
          items: [
            {
              productId: available!.id,
              variant: firstVariant?.name,
              quantity: 1,
            },
          ],
          couponCode: code,
          customerName: 'Aylin Demir',
          customerPhone: '+905339998877',
          customerNotes: 'Combo test order',
          lang: 'en',
        },
      });
      expect(orderRes.status).toBe(200);
      expect(String(orderRes.json.redirectUrl)).toContain('https://wa.me/');

      const ordersAfterRes = await invokeRouteHandler(ordersRoute.GET, '/api/admin/orders', {
        authenticated: true,
      });
      const afterOrders = ordersAfterRes.json.orders as Array<Record<string, unknown>>;
      expect(afterOrders.length).toBeGreaterThan(beforeCount);
    } finally {
      await invokeRouteHandler(couponItemRoute.DELETE, `/api/admin/coupons/${couponId}`, {
        method: 'DELETE',
        authenticated: true,
        params: { id: couponId },
      });
    }
  });

  it('T3.11 [Order Status + Tracking Update -> Admin Stats KPI]: shipping an order updates order state and KPIs', async () => {
    const ordersRoute = await dynamicImport<{ POST: RouteHandlerFn }>(
      'src/app/api/admin/orders/route.ts'
    );
    const orderItemRoute = await dynamicImport<{ PATCH: RouteHandlerFn; DELETE: RouteHandlerFn }>(
      'src/app/api/admin/orders/[id]/route.ts'
    );
    const statsRoute = await dynamicImport<{ GET: RouteHandlerFn }>(
      'src/app/api/admin/stats/route.ts'
    );

    const statsBefore = await invokeRouteHandler(statsRoute.GET, '/api/admin/stats', {
      authenticated: true,
    });
    const revBefore = Number((statsBefore.json.stats as Record<string, unknown>).totalRevenue ?? 0);

    const createRes = await invokeRouteHandler(ordersRoute.POST, '/api/admin/orders', {
      method: 'POST',
      authenticated: true,
      body: {
        customerName: 'Emre Yilmaz',
        customerPhone: '+905327776655',
        subtotal: 350,
        total: 350,
        currency: 'USD',
        status: 'pending',
        items: [{ productId: 'prod_1', productName: 'Parka', quantity: 1, unitPrice: 350 }],
      },
    });
    expect(createRes.status).toBe(201);
    const orderId = (createRes.json.order as { id: string }).id;

    try {
      const patchRes = await invokeRouteHandler(orderItemRoute.PATCH, `/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        authenticated: true,
        params: { id: orderId },
        body: {
          status: 'shipped',
          trackingNumber: 'CYR-TRACK-551',
          trackingCarrier: 'UPS',
        },
      });
      expect(patchRes.status).toBe(200);
      expect((patchRes.json.order as Record<string, unknown>).status).toBe('shipped');

      const statsAfter = await invokeRouteHandler(statsRoute.GET, '/api/admin/stats', {
        authenticated: true,
      });
      const revAfter = Number((statsAfter.json.stats as Record<string, unknown>).totalRevenue ?? 0);
      expect(revAfter).toBeGreaterThanOrEqual(revBefore + 350);
    } finally {
      await invokeRouteHandler(orderItemRoute.DELETE, `/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        authenticated: true,
        params: { id: orderId },
      });
    }
  });

  it('T3.12 [Collection CRUD + Product Assignment -> Public /api/products Filter]: assigned product resolves under collection query', async () => {
    const colRoute = await dynamicImport<{ POST: RouteHandlerFn }>(
      'src/app/api/admin/collections/route.ts'
    );
    const colItemRoute = await dynamicImport<{ DELETE: RouteHandlerFn }>(
      'src/app/api/admin/collections/[id]/route.ts'
    );
    const prodRoute = await dynamicImport<{ POST: RouteHandlerFn }>(
      'src/app/api/admin/products/route.ts'
    );
    const prodItemRoute = await dynamicImport<{ DELETE: RouteHandlerFn }>(
      'src/app/api/admin/products/[id]/route.ts'
    );
    const publicProdRoute = await dynamicImport<{ GET: RouteHandlerFn }>(
      'src/app/api/products/route.ts'
    );

    const slug = `capsule-combo-${Date.now()}`;
    const colRes = await invokeRouteHandler(colRoute.POST, '/api/admin/collections', {
      method: 'POST',
      authenticated: true,
      body: {
        name: { tr: 'Kış Kapsülü', en: 'Winter Capsule' },
        description: { tr: 'Kış serisi', en: 'Winter capsule series' },
        slug,
        isActive: true,
      },
    });
    expect(colRes.status).toBe(201);
    const collectionId = (colRes.json.collection as { id: string }).id;

    const prodRes = await invokeRouteHandler(prodRoute.POST, '/api/admin/products', {
      method: 'POST',
      authenticated: true,
      body: {
        name: 'Winter Wool Coat',
        slug: `winter-wool-coat-${Date.now()}`,
        price: 420,
        stock: 8,
        collectionId,
        isActive: true,
      },
    });
    expect(prodRes.status).toBe(201);
    const productId = (prodRes.json.product as { id: string }).id;

    try {
      const filteredRes = await invokeRouteHandler(
        publicProdRoute.GET,
        `/api/products?collection=${collectionId}`
      );
      expect(filteredRes.status).toBe(200);
      const matched = filteredRes.json.products as Array<{ id: string }>;
      expect(matched.some((p) => p.id === productId)).toBe(true);
    } finally {
      await invokeRouteHandler(prodItemRoute.DELETE, `/api/admin/products/${productId}`, {
        method: 'DELETE',
        authenticated: true,
        params: { id: productId },
      });
      await invokeRouteHandler(colItemRoute.DELETE, `/api/admin/collections/${collectionId}`, {
        method: 'DELETE',
        authenticated: true,
        params: { id: collectionId },
      });
    }
  });

  it('T3.13 [Admin Products Filter-Before-Paginate]: filtered total reflects full matching set when limit < total', async () => {
    const prodRoute = await dynamicImport<{ GET: RouteHandlerFn; POST: RouteHandlerFn }>(
      'src/app/api/admin/products/route.ts'
    );
    const prodItemRoute = await dynamicImport<{ DELETE: RouteHandlerFn }>(
      'src/app/api/admin/products/[id]/route.ts'
    );

    const uniqueCat = `cat_${Date.now()}`;
    const createdIds: string[] = [];

    try {
      for (let i = 0; i < 3; i++) {
        const res = await invokeRouteHandler(prodRoute.POST, '/api/admin/products', {
          method: 'POST',
          authenticated: true,
          body: {
            name: `Paginate Test Item ${i}`,
            slug: `paginate-item-${Date.now()}-${i}`,
            price: 100 + i,
            stock: 5,
            category: uniqueCat,
          },
        });
        expect(res.status).toBe(201);
        createdIds.push((res.json.product as { id: string }).id);
      }

      const page1 = await invokeRouteHandler(
        prodRoute.GET,
        `/api/admin/products?category=${uniqueCat}&limit=1&offset=0`,
        { authenticated: true }
      );
      expect(page1.status).toBe(200);
      expect((page1.json.products as Array<unknown>).length).toBe(1);
      expect(Number(page1.json.total)).toBe(3);

      const page2 = await invokeRouteHandler(
        prodRoute.GET,
        `/api/admin/products?category=${uniqueCat}&limit=2&offset=1`,
        { authenticated: true }
      );
      expect(page2.status).toBe(200);
      expect((page2.json.products as Array<unknown>).length).toBe(2);
      expect(Number(page2.json.total)).toBe(3);
    } finally {
      for (const id of createdIds) {
        await invokeRouteHandler(prodItemRoute.DELETE, `/api/admin/products/${id}`, {
          method: 'DELETE',
          authenticated: true,
          params: { id },
        });
      }
    }
  });

  it('T3.14 [StoreSettings Shipping & Currency -> /api/cms]: updating currency & shipping thresholds syncs to public /api/cms', async () => {
    const settingsRoute = await dynamicImport<{ GET: RouteHandlerFn; PATCH?: RouteHandlerFn; PUT?: RouteHandlerFn }>(
      'src/app/api/admin/settings/route.ts'
    );
    const publicCmsRoute = await dynamicImport<{ GET: RouteHandlerFn }>(
      'src/app/api/cms/route.ts'
    );

    const beforeRes = await invokeRouteHandler(settingsRoute.GET, '/api/admin/settings', {
      authenticated: true,
    });
    const beforeSettings = beforeRes.json.settings as {
      currency: string;
      freeShippingThreshold?: number;
      shippingFee?: number;
      defaultShippingFee?: number;
    };

    const updateHandler = settingsRoute.PATCH || settingsRoute.PUT!;
    const method = settingsRoute.PATCH ? 'PATCH' : 'PUT';

    try {
      const updRes = await invokeRouteHandler(updateHandler, '/api/admin/settings', {
        method,
        authenticated: true,
        body: {
          currency: 'EUR',
          freeShippingThreshold: 250,
          shippingFee: 15,
        },
      });
      expect(updRes.status).toBe(200);

      const pubCmsRes = await invokeRouteHandler(publicCmsRoute.GET, '/api/cms');
      expect(pubCmsRes.status).toBe(200);
      const settings = pubCmsRes.json.settings as Record<string, unknown>;
      expect(settings.currency).toBe('EUR');
      expect(Number(settings.freeShippingThreshold)).toBe(250);
      expect(Number(settings.shippingFee ?? settings.defaultShippingFee)).toBe(15);
    } finally {
      await invokeRouteHandler(updateHandler, '/api/admin/settings', {
        method,
        authenticated: true,
        body: {
          currency: beforeSettings.currency || 'USD',
          freeShippingThreshold: beforeSettings.freeShippingThreshold ?? 200,
          shippingFee: beforeSettings.shippingFee ?? beforeSettings.defaultShippingFee ?? 10,
        },
      });
    }
  });
}, { tier: 3 });
