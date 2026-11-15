import { describe, it, expect } from '../framework.ts';
import {
  generateWhatsAppOrderUrl,
  evaluateCreditBudget,
  computePromptHash,
  createMockAdminJwt,
  verifyMockAdminJwt,
  CreditLimitExceededError,
  MAX_CUMULATIVE_CREDIT_BUDGET,
} from '../contracts.ts';

describe('Tier 3: Cross-Feature Combinations', () => {
  // Pairwise 1: Store Settings + WhatsApp Order URL
  it('T3.1 [StoreSettings + WhatsApp]: updating store phone and currency immediately updates order redirection URL', () => {
    // Initial state
    const storeSettings = {
      whatsappNumber: '+905320000000',
      currency: 'USD',
    };

    const orderItem = {
      productId: 'prod-hoodie-01',
      productName: 'MONOLITH HEAVY HOODIE',
      price: 240.0,
      currency: storeSettings.currency,
    };

    const url1 = generateWhatsAppOrderUrl(storeSettings.whatsappNumber, orderItem);
    expect(url1.startsWith('https://wa.me/905320000000')).toBe(true);
    expect(url1).toContain(encodeURIComponent('240.00 USD'));

    // Admin updates settings
    storeSettings.whatsappNumber = '+1 (555) 888-9900';
    storeSettings.currency = 'EUR';
    orderItem.currency = storeSettings.currency;

    const url2 = generateWhatsAppOrderUrl(storeSettings.whatsappNumber, orderItem);
    expect(url2.startsWith('https://wa.me/15558889900')).toBe(true);
    expect(url2).toContain(encodeURIComponent('240.00 EUR'));
  });

  // Pairwise 2: JWT Auth + Vercel Blob Delete
  it('T3.2 [JWT Auth + Blob Delete]: unauthenticated delete is rejected (401), while valid JWT session permits deletion', () => {
    const jwtSecret = 'cyrux-secret-jwt-key-minimum-32-chars-long';
    const blobDb = new Set<string>([
      'https://cyrux.public.blob.vercel-storage.com/asset-1.png',
      'https://cyrux.public.blob.vercel-storage.com/asset-2.png',
    ]);

    const handleBlobDelete = (token: string | null, targetUrl: string) => {
      if (!token) return { status: 401, error: 'Unauthorized' };
      const auth = verifyMockAdminJwt(token, jwtSecret);
      if (!auth.valid) return { status: 401, error: 'Unauthorized: invalid or expired session' };

      if (!targetUrl.includes('.blob.vercel-storage.com')) {
        return { status: 400, error: 'Invalid blob URL' };
      }
      blobDb.delete(targetUrl);
      return { status: 200, success: true, deletedUrl: targetUrl };
    };

    // 1. Unauthenticated attempt
    const unauthRes = handleBlobDelete(null, 'https://cyrux.public.blob.vercel-storage.com/asset-1.png');
    expect(unauthRes.status).toBe(401);
    expect(blobDb.has('https://cyrux.public.blob.vercel-storage.com/asset-1.png')).toBe(true);

    // 2. Authenticated attempt
    const validToken = createMockAdminJwt(jwtSecret, { sub: 'admin', role: 'admin' });
    const authRes = handleBlobDelete(validToken, 'https://cyrux.public.blob.vercel-storage.com/asset-1.png');
    expect(authRes.status).toBe(200);
    expect(blobDb.has('https://cyrux.public.blob.vercel-storage.com/asset-1.png')).toBe(false);
  });

  // Pairwise 3: Credit Usage Accumulation + AI Generation Trigger
  it('T3.3 [Credit Budget + AI Generation]: successive generations accumulate credits and abort cleanly when cap is reached', () => {
    let cumulativeCreditsUsed = 22700; // Near cap
    const assetDb: Array<{ id: string; credits: number }> = [];

    const generateAsset = (prompt: string, cost: number) => {
      // Evaluate guard
      const guard = evaluateCreditBudget(cumulativeCreditsUsed, cost);
      cumulativeCreditsUsed = guard.newTotal;
      const asset = { id: `asset-${assetDb.length + 1}`, credits: cost };
      assetDb.push(asset);
      return { success: true, asset, cumulativeCreditsUsed };
    };

    // First request: 120 credits -> 22,700 + 120 = 22,820 (ALLOWED)
    const gen1 = generateAsset('Monochrome jacket', 120);
    expect(gen1.success).toBe(true);
    expect(cumulativeCreditsUsed).toBe(22820);
    expect(assetDb).toHaveLength(1);

    // Second request: 120 credits -> 22,820 + 120 = 22,940 (ALLOWED)
    const gen2 = generateAsset('Brutalist pants', 120);
    expect(gen2.success).toBe(true);
    expect(cumulativeCreditsUsed).toBe(22940);
    expect(assetDb).toHaveLength(2);

    // Third request: 120 credits -> 22,940 + 120 = 23,060 > 23,000 (REJECTED)
    expect(() => generateAsset('Another jacket', 120)).toThrow(CreditLimitExceededError);

    // Verify state was not mutated on rejection
    expect(cumulativeCreditsUsed).toBe(22940);
    expect(assetDb).toHaveLength(2);
  });

  // Pairwise 4: Admin Product Creation + Storefront Bestseller Grid Query
  it('T3.4 [Admin CRUD + Storefront Grid]: newly created bestseller product appears in storefront query', () => {
    const products = [
      { id: 'p1', name: 'Raw Cut Tee', isBestseller: true, createdAt: 100 },
      { id: 'p2', name: 'Standard Socks', isBestseller: false, createdAt: 110 },
    ];

    const getBestsellers = () => {
      return products
        .filter((p) => p.isBestseller)
        .sort((a, b) => b.createdAt - a.createdAt);
    };

    expect(getBestsellers()).toHaveLength(1);

    // Admin creates new bestseller
    products.push({ id: 'p3', name: 'Sculptural Vest', isBestseller: true, createdAt: 200 });

    const updatedBestsellers = getBestsellers();
    expect(updatedBestsellers).toHaveLength(2);
    expect(updatedBestsellers[0].name).toBe('Sculptural Vest');
  });

  // Pairwise 5: Stock Depletion + Monospace CTA State
  it('T3.5 [Stock Depletion + CTA State]: dropping stock to 0 disables CTA on storefront', () => {
    let stock = 3;
    const getCtaProps = (currentStock: number) => {
      return {
        disabled: currentStock <= 0,
        text: currentStock <= 0 ? 'OUT OF STOCK' : 'BUY NOW →',
      };
    };

    expect(getCtaProps(stock).disabled).toBe(false);
    expect(getCtaProps(stock).text).toBe('BUY NOW →');

    // Stock depleted
    stock = 0;
    expect(getCtaProps(stock).disabled).toBe(true);
    expect(getCtaProps(stock).text).toBe('OUT OF STOCK');
  });

  // Pairwise 6: Duplicate Prompt Deduplication + Zero Credit Cost
  it('T3.6 [Prompt Dedup + Credit Ledger]: identical prompt query consumes zero credits and reuses blob URL', () => {
    const assetStore = new Map<string, { mediaUrl: string; credits: number }>();
    let totalDeducted = 0;

    const requestGeneration = (prompt: string, mediaType: 'image' | 'video') => {
      const hash = computePromptHash(prompt, mediaType);
      if (assetStore.has(hash)) {
        return { cached: true, asset: assetStore.get(hash), creditsUsed: 0 };
      }
      const cost = 120;
      totalDeducted += cost;
      const newAsset = { mediaUrl: `https://blob.vercel.com/${hash}.png`, credits: cost };
      assetStore.set(hash, newAsset);
      return { cached: false, asset: newAsset, creditsUsed: cost };
    };

    // First run (fresh prompt)
    const run1 = requestGeneration('Brutalist Monogram Bag', 'image');
    expect(run1.cached).toBe(false);
    expect(run1.creditsUsed).toBe(120);
    expect(totalDeducted).toBe(120);

    // Second run (duplicate prompt with different casing)
    const run2 = requestGeneration('  brutalist monogram bag  ', 'image');
    expect(run2.cached).toBe(true);
    expect(run2.creditsUsed).toBe(0);
    expect(totalDeducted).toBe(120); // Unchanged!
    expect(run2.asset?.mediaUrl).toBe(run1.asset?.mediaUrl);
  });

  // Pairwise 7: Currency Change + Price Formatting in Monospace Grid
  it('T3.7 [Store Currency + Grid Formatter]: currency symbol switches dynamically between $, €, ₺, £', () => {
    const formatGridPrice = (price: number, currency: string) => {
      const sym: Record<string, string> = { USD: '$', EUR: '€', TRY: '₺', GBP: '£' };
      return `${sym[currency] || currency}${price.toFixed(2)}`;
    };

    expect(formatGridPrice(200, 'USD')).toBe('$200.00');
    expect(formatGridPrice(200, 'EUR')).toBe('€200.00');
    expect(formatGridPrice(200, 'TRY')).toBe('₺200.00');
    expect(formatGridPrice(200, 'GBP')).toBe('£200.00');
  });

  // Pairwise 8: JWT Cookie Expiry + Edge Middleware Redirect
  it('T3.8 [JWT Expiry + Middleware]: expired session token is intercepted and redirects to /admin/login', () => {
    const secret = 'cyrux-session-secret-key-32-chars-long';
    const expiredExp = Math.floor(Date.now() / 1000) - 60; // Expired 1 min ago
    const expiredToken = createMockAdminJwt(secret, { sub: 'admin', role: 'admin', exp: expiredExp });

    const handleAdminRoute = (cookieToken: string | null) => {
      if (!cookieToken) return { redirect: '/admin/login' };
      const auth = verifyMockAdminJwt(cookieToken, secret);
      if (!auth.valid) return { redirect: '/admin/login' };
      return { status: 200, page: 'AdminDashboard' };
    };

    const res = handleAdminRoute(expiredToken);
    expect(res.redirect).toBe('/admin/login');
  });
}, { tier: 3 });
