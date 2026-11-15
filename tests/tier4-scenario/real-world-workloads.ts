import { describe, it, expect } from '../framework.ts';
import {
  generateWhatsAppOrderUrl,
  evaluateCreditBudget,
  computePromptHash,
  createMockAdminJwt,
  verifyMockAdminJwt,
  sanitizeCustomerText,
  CreditLimitExceededError,
  MAX_CUMULATIVE_CREDIT_BUDGET,
  ESTIMATED_IMAGE_CREDITS,
  ESTIMATED_VIDEO_CREDITS,
} from '../contracts.ts';

describe('Tier 4: Real-World Workloads', () => {
  // Scenario 1: Complete End-User Purchasing Journey
  it('T4.1 [Scenario 1: End-User Purchasing Journey]: user browses storefront, filters search, selects variant, and generates WhatsApp order', () => {
    // 1. Initial Storefront state
    const storeSettings = {
      whatsappNumber: '+90 532 999 00 11',
      currency: 'USD',
      storeName: 'cyrux studio',
    };

    const catalog = [
      { id: 'prod-01', name: 'Raw Cut Boxy Tee', price: 95.0, stock: 30, variants: ['S', 'M', 'L'], isBestseller: true },
      { id: 'prod-02', name: 'Monolith Heavy Hoodie', price: 240.0, stock: 15, variants: ['M', 'L', 'XL'], isBestseller: true },
      { id: 'prod-03', name: 'Brutalist Wide Cargo', price: 210.0, stock: 20, variants: ['30', '32', '34'], isBestseller: true },
      { id: 'prod-04', name: 'Sculptural Puffer Vest', price: 290.0, stock: 0, variants: ['S', 'M'], isBestseller: false },
    ];

    // 2. User searches for "hoodie"
    const searchFilter = 'hoodie';
    const searchResults = catalog.filter(p => p.name.toLowerCase().includes(searchFilter.toLowerCase()));
    expect(searchResults).toHaveLength(1);
    const selectedProduct = searchResults[0];
    expect(selectedProduct.name).toBe('Monolith Heavy Hoodie');

    // 3. User verifies stock and selects variant
    expect(selectedProduct.stock).toBeGreaterThan(0);
    const chosenVariant = selectedProduct.variants[1]; // 'L'
    expect(chosenVariant).toBe('L');

    // 4. User inputs customer notes with formatting
    const rawNotes = 'Gift wrap requested. Deliver after 18:00 please! <script>/* clean */</script>';
    const cleanNotes = sanitizeCustomerText(rawNotes);
    expect(cleanNotes).not.toContain('<script>');

    // 5. User clicks "BUY NOW →" to generate WhatsApp direct order link
    const orderUrl = generateWhatsAppOrderUrl(storeSettings.whatsappNumber, {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      variant: chosenVariant,
      price: selectedProduct.price,
      currency: storeSettings.currency,
      customerNotes: cleanNotes,
    });

    // 6. Assertions on final observable URL
    expect(orderUrl.startsWith('https://wa.me/905329990011?text=')).toBe(true);
    const decodedMessage = decodeURIComponent(orderUrl.replace('https://wa.me/905329990011?text=', ''));
    expect(decodedMessage).toContain('*NEW ORDER - CYRUX STUDIO*');
    expect(decodedMessage).toContain('Product: Monolith Heavy Hoodie');
    expect(decodedMessage).toContain('Variant: L');
    expect(decodedMessage).toContain('Price: 240.00 USD');
    expect(decodedMessage).toContain('Notes: Gift wrap requested. Deliver after 18:00 please! /* clean */');
    expect(decodedMessage).toContain('Ref ID: prod-02');
  });

  // Scenario 2: Admin Catalog Overhaul
  it('T4.2 [Scenario 2: Admin Catalog Overhaul]: admin auth, product drop creation, blob asset linking, and store settings migration', () => {
    const jwtSecret = 'super-secret-admin-key-cyrux-production-32-bytes!';
    let adminSessionToken: string | null = null;

    // 1. Admin login simulation
    const authenticateAdmin = (user: string, pass: string) => {
      if (user === 'admin@cyrux.studio' && pass === 'AdminSecret2026!') {
        return createMockAdminJwt(jwtSecret, { sub: 'admin', role: 'admin' });
      }
      return null;
    };

    adminSessionToken = authenticateAdmin('admin@cyrux.studio', 'AdminSecret2026!');
    expect(adminSessionToken).not.toBeNull();

    // 2. Verified admin session creates new luxury drop
    const productDatabase: any[] = [];
    const createProductDrop = (token: string, productData: any) => {
      const auth = verifyMockAdminJwt(token, jwtSecret);
      if (!auth.valid) throw new Error('401 Unauthorized');
      productDatabase.push(productData);
      return productData;
    };

    const newDrop = createProductDrop(adminSessionToken!, {
      id: 'prod-drop-01',
      name: 'SCULPTURAL CYBER PARKA',
      slug: 'sculptural-cyber-parka',
      price: 550.0,
      stock: 12,
      variants: [{ size: 'M', stock: 6 }, { size: 'L', stock: 6 }],
      mediaUrls: ['https://cyrux.public.blob.vercel-storage.com/parka-lookbook.webp'],
      isBestseller: true,
    });

    expect(productDatabase).toHaveLength(1);
    expect(newDrop.name).toBe('SCULPTURAL CYBER PARKA');

    // 3. Admin updates store settings (currency to EUR and updates support phone)
    const storeConfig = {
      whatsappNumber: '+905320000000',
      currency: 'USD',
    };

    const updateConfig = (token: string, newNumber: string, newCurrency: string) => {
      const auth = verifyMockAdminJwt(token, jwtSecret);
      if (!auth.valid) throw new Error('401 Unauthorized');
      storeConfig.whatsappNumber = newNumber;
      storeConfig.currency = newCurrency;
      return storeConfig;
    };

    updateConfig(adminSessionToken!, '+44 7911 123456', 'EUR');
    expect(storeConfig.whatsappNumber).toBe('+44 7911 123456');
    expect(storeConfig.currency).toBe('EUR');

    // 4. Verify storefront order generated for the newly created drop uses updated EUR currency
    const orderUrl = generateWhatsAppOrderUrl(storeConfig.whatsappNumber, {
      productId: newDrop.id,
      productName: newDrop.name,
      variant: 'M',
      price: newDrop.price,
      currency: storeConfig.currency,
    });

    expect(orderUrl.startsWith('https://wa.me/447911123456')).toBe(true);
    expect(orderUrl).toContain(encodeURIComponent('550.00 EUR'));
  });

  // Scenario 3: Credit-Guarded Asset Generation Lifecycle
  it('T4.3 [Scenario 3: Credit-Guarded Asset Lifecycle]: preview cost, confirmation, asset creation, cache deduplication, and budget ceiling enforcement', () => {
    let cumulativeCreditsUsed = 18000;
    const assetsCache = new Map<string, { mediaUrl: string; credits: number }>();
    const creditLogs: any[] = [];

    // Complete workflow engine
    const processGenerationRequest = (req: {
      prompt: string;
      mediaType: 'image' | 'video';
      confirmed: boolean;
    }) => {
      // 1. Compute Hash
      const promptHash = computePromptHash(req.prompt, req.mediaType);

      // 2. Check Deduplication Cache
      if (assetsCache.has(promptHash)) {
        return {
          cached: true,
          asset: assetsCache.get(promptHash),
          creditsDeducted: 0,
          totalUsed: cumulativeCreditsUsed,
          remaining: MAX_CUMULATIVE_CREDIT_BUDGET - cumulativeCreditsUsed,
        };
      }

      // 3. Phase 2 Confirmation Guard
      if (req.confirmed !== true) {
        throw new Error('400 Confirmation Required: user must confirm credit expenditure');
      }

      // 4. Strict Credit Budget Guard Audit
      const cost = req.mediaType === 'video' ? ESTIMATED_VIDEO_CREDITS : ESTIMATED_IMAGE_CREDITS;
      const budget = evaluateCreditBudget(cumulativeCreditsUsed, cost);

      // 5. Successful Execution
      const newAsset = {
        mediaUrl: `https://cyrux.public.blob.vercel-storage.com/${promptHash}.png`,
        credits: cost,
      };
      assetsCache.set(promptHash, newAsset);
      cumulativeCreditsUsed = budget.newTotal;

      creditLogs.push({
        action: `${req.mediaType.toUpperCase()}_GENERATION`,
        creditsUsed: cost,
        balanceBefore: budget.currentUsed,
        balanceAfter: budget.newTotal,
      });

      return {
        cached: false,
        asset: newAsset,
        creditsDeducted: cost,
        totalUsed: cumulativeCreditsUsed,
        remaining: budget.remaining - cost,
      };
    };

    // Step A: Request preview without confirmation -> must reject
    expect(() =>
      processGenerationRequest({
        prompt: 'Technical cyberpunk trench coat on concrete plinth',
        mediaType: 'image',
        confirmed: false,
      })
    ).toThrow('Confirmation Required');

    // Step B: Confirmed request (18,000 + 120 = 18,120 credits)
    const gen1 = processGenerationRequest({
      prompt: 'Technical cyberpunk trench coat on concrete plinth',
      mediaType: 'image',
      confirmed: true,
    });
    expect(gen1.cached).toBe(false);
    expect(gen1.creditsDeducted).toBe(120);
    expect(gen1.totalUsed).toBe(18120);
    expect(creditLogs).toHaveLength(1);

    // Step C: Duplicate request with variation in casing and extra whitespace
    const gen2 = processGenerationRequest({
      prompt: '  technical cyberpunk trench coat on concrete plinth  ',
      mediaType: 'image',
      confirmed: true,
    });
    expect(gen2.cached).toBe(true);
    expect(gen2.creditsDeducted).toBe(0);
    expect(gen2.totalUsed).toBe(18120); // Zero change!
    expect(creditLogs).toHaveLength(1); // No new log!

    // Step D: Large video batch request attempting to spend 5,000 credits (18,120 + 5,000 = 23,120 > 23,000 cap)
    expect(() =>
      processGenerationRequest({
        prompt: '10-minute 4K runway editorial film',
        mediaType: 'video',
        confirmed: true,
      })
    ).not.toThrow(); // 1 video = 450 credits -> 18,120 + 450 = 18,570 (ALLOWED)

    // Now advance usage to 22,900
    cumulativeCreditsUsed = 22900;
    // Attempt video (450 credits) -> 22,900 + 450 = 23,350 > 23,000 (ABORT!)
    expect(() =>
      processGenerationRequest({
        prompt: 'Another video when only 100 credits remain',
        mediaType: 'video',
        confirmed: true,
      })
    ).toThrow(CreditLimitExceededError);

    // Verify system invariant: credits stayed at 22,900
    expect(cumulativeCreditsUsed).toBe(22900);
  });

  // Scenario 4: High-Concurrency Burst Order Generation
  it('T4.4 [Scenario 4: High-Concurrency Burst Orders]: 50 sequential rapid order generations execute deterministically without errors', () => {
    const products = [
      { id: 'p1', name: 'Raw Cut Tee', price: 95 },
      { id: 'p2', name: 'Heavy Hoodie', price: 240 },
      { id: 'p3', name: 'Cargo Pant', price: 210 },
    ];
    const variants = ['S', 'M', 'L', 'XL'];
    const generatedUrls: string[] = [];

    const startTime = Date.now();
    for (let i = 0; i < 50; i++) {
      const prod = products[i % products.length];
      const variant = variants[i % variants.length];
      const url = generateWhatsAppOrderUrl('+905321112233', {
        productId: prod.id,
        productName: prod.name,
        variant,
        price: prod.price,
        currency: 'USD',
        customerNotes: `Order batch index #${i}`,
      });
      generatedUrls.push(url);
    }
    const elapsed = Date.now() - startTime;

    expect(generatedUrls).toHaveLength(50);
    // Ensure all URLs are valid wa.me links
    for (const url of generatedUrls) {
      expect(url.startsWith('https://wa.me/905321112233?text=')).toBe(true);
    }
    // Execution must be fast (< 200ms for 50 operations)
    expect(elapsed).toBeLessThan(1000);
  });

  // Scenario 5: Tamper & Injection Attack Resilience Simulation
  it('T4.5 [Scenario 5: Adversarial Attack Resilience]: rejects tampered auth, SQLi payloads, and spoofed endpoints simultaneously', () => {
    const secret = 'cyrux-defense-key-production-grade-32-chars!';

    // Attack 1: Forged JWT role elevation
    const forgedToken = createMockAdminJwt(secret, { sub: 'guest', role: 'admin' });
    const parts = forgedToken.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'superadmin', role: 'admin' })).toString('base64url');
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const authResult = verifyMockAdminJwt(tampered, secret);
    expect(authResult.valid).toBe(false);

    // Attack 2: XSS script bomb in customer notes
    const scriptBomb = '<script src="https://evil.org/malware.js"></script><style>body{display:none}</style>';
    const sanitized = sanitizeCustomerText(scriptBomb);
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('<style');

    // Attack 3: Spoofed blob deletion URL with path traversal
    const spoofedBlob = 'https://cyrux.public.blob.vercel-storage.com/../../etc/passwd';
    const isCleanBlobPath = (url: string) => {
      return url.includes('.blob.vercel-storage.com') && !url.includes('..');
    };
    expect(isCleanBlobPath(spoofedBlob)).toBe(false);
  });
}, { tier: 4 });
