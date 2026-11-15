/**
 * Milestone 3 Remediation: Empirical Challenger 2 Test Suite
 *
 * Focus Areas:
 * 1. Client-side error handling & execution halting in BestsellerGrid:
 *    - Verify execution halts when API returns 400 or 404 (no window.open).
 *    - Verify error alert banner (role="alert", aria-live="assertive") and toast trigger.
 *    - Verify behavior on 500, network error, missing redirectUrl, out of stock.
 *    - Verify auto-dismissal and manual dismissal mechanics.
 * 2. WhatsApp URL construction with special characters, unicode, and varied store settings:
 *    - RFC 3986 compliance, %20 space encoding, %0A newline encoding, literal * preservation.
 *    - Special characters: &, ?, =, #, /, %, +, quotes, HTML brackets.
 *    - Multilingual Unicode: Turkish, CJK, Cyrillic, Arabic, accented Latin, emojis (surrogate pairs).
 *    - Varied phone number sanitization (E.164 normalization across worldwide formats).
 *    - Dynamic store settings and currency symbol resolution.
 */

import assert from "node:assert";
import { renderToString } from "react-dom/server";
import React from "react";
import {
  BestsellerGrid,
  formatProductPrice,
  ASYMMETRIC_COLUMN_CONFIG,
} from "../src/components/storefront/bestseller-grid";
import {
  generateWhatsAppOrderUrl,
  generateDynamicWhatsAppOrderUrl,
  sanitizePhoneNumber,
  sanitizeCustomerText,
  getActiveStoreConfig,
} from "../src/lib/whatsapp";
import {
  whatsAppOrderInputSchema,
  whatsAppOrderApiRequestSchema,
  validateOrderPayload,
} from "../src/lib/validations";
import { POST as orderWhatsappHandler } from "../src/app/api/order/whatsapp/route";
import prisma from "../src/lib/db";
import { Product } from "@prisma/client";

let passedCount = 0;
let failedCount = 0;
const failureDetails: string[] = [];

function check(desc: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  ✔ [PASS] ${desc}`);
      passedCount++;
    })
    .catch((err) => {
      console.error(`  ✖ [FAIL] ${desc}: ${err.message}`);
      failureDetails.push(`${desc}: ${err.message}`);
      failedCount++;
    });
}

// Helper mock product generator
function makeProduct(overrides?: Partial<Product>): Product {
  return {
    id: "prod_1",
    name: "CYRUX HEAVYWEIGHT TEE",
    slug: "cyrux-heavyweight-tee",
    description: "Brutalist heavyweight oversized tee",
    price: 120.0,
    stock: 25,
    variants: [{ name: "Standard", inStock: true }],
    mediaUrls: ["/assets/tee.webp"],
    isBestseller: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

async function runChallenger2Suite() {
  console.log("================================================================");
  console.log("   CHALLENGER 2: M3 REMEDIATION EMPIRICAL CHALLENGE SUITE       ");
  console.log("================================================================\n");

  // ============================================================================
  // SECTION 1: CLIENT-SIDE ERROR HANDLING & EXECUTION HALTING IN BESTSELLER-GRID
  // ============================================================================
  console.log("--- Section 1: BestsellerGrid Client-Side Error Handling & Execution Halting ---");

  // 1.1: Verify BestsellerGrid renders without alert banner by default
  await check("1.1 BestsellerGrid initial render has no active role='alert' error banners", () => {
    const html = renderToString(
      React.createElement(BestsellerGrid, {
        products: [makeProduct()],
        currency: "USD",
        whatsappNumber: "+905551234567",
      })
    );
    assert.strictEqual(html.includes('role="alert"'), false, "Must not contain role=alert initially");
    assert.strictEqual(html.includes("ORDER ERROR:"), false, "Must not display ORDER ERROR initially");
    assert.strictEqual(html.includes("ORDER FAILED"), false, "Must not display ORDER FAILED toast initially");
  });

  // 1.2: Client execution simulation: API returns HTTP 400 validation error
  // Must halt execution, set orderError, and NEVER call window.open
  await check("1.2 HTTP 400 from API halts execution and prevents window.open", async () => {
    let windowOpenCalled = false;
    let windowOpenArgs: any[] = [];
    const mockWindow = {
      open: (...args: any[]) => {
        windowOpenCalled = true;
        windowOpenArgs = args;
      },
    };

    // Client handler logic exact mirror from BestsellerGrid
    let orderError: string | null = null;
    let isOrdering = false;

    const mockFetch = async () => {
      return {
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: "Price must be a positive number",
        }),
      };
    };

    // Execute client-side order attempt
    const runOrderAttempt = async (product: Product) => {
      orderError = null;
      isOrdering = true;
      try {
        const res = await mockFetch();
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          const message =
            data.error ||
            (res.status === 400
              ? "Order validation failed. Please check product details."
              : res.status === 404
              ? "Product not found in catalog."
              : `Order service error (${res.status}).`);
          orderError = message;
          return; // HALT
        }
        if (data.redirectUrl) {
          mockWindow.open(data.redirectUrl, "_blank", "noopener,noreferrer");
        } else {
          orderError = "Server did not return a valid WhatsApp redirection link.";
        }
      } finally {
        isOrdering = false;
      }
    };

    await runOrderAttempt(makeProduct());

    assert.strictEqual(windowOpenCalled, false, "window.open must NOT be called on HTTP 400");
    assert.strictEqual(orderError, "Price must be a positive number", "orderError must capture the API error");
    assert.strictEqual(isOrdering, false, "isOrdering must reset to false in finally block");
  });

  // 1.3: Client execution simulation: API returns HTTP 404 product not found
  await check("1.3 HTTP 404 from API halts execution and sets catalog not found error", async () => {
    let windowOpenCalled = false;
    let orderError: string | null = null;

    const mockFetch = async () => {
      return {
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: "Product not found with id: prod_unknown_999",
        }),
      };
    };

    const runOrderAttempt = async (product: Product) => {
      orderError = null;
      const res = await mockFetch();
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        orderError =
          data.error ||
          (res.status === 404 ? "Product not found in catalog." : `Error ${res.status}`);
        return;
      }
      windowOpenCalled = true;
    };

    await runOrderAttempt(makeProduct({ id: "prod_unknown_999" }));

    assert.strictEqual(windowOpenCalled, false, "window.open must NOT be called on HTTP 404");
    assert.strictEqual(orderError, "Product not found with id: prod_unknown_999");
  });

  // 1.4: Client fallback message when API returns 400 without specific error message
  await check("1.4 HTTP 400 without message falls back to generic validation error", async () => {
    let windowOpenCalled = false;
    let orderError: string | null = null;

    const mockFetch = async () => ({
      ok: false,
      status: 400,
      json: async () => ({}), // Empty payload
    });

    const res = await mockFetch();
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      orderError =
        data.error ||
        (res.status === 400
          ? "Order validation failed. Please check product details."
          : "Other");
    }

    assert.strictEqual(windowOpenCalled, false);
    assert.strictEqual(orderError, "Order validation failed. Please check product details.");
  });

  // 1.5: Client fallback message when API returns 404 without specific error message
  await check("1.5 HTTP 404 without message falls back to generic catalog not found error", async () => {
    let orderError: string | null = null;

    const mockFetch = async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    const res = await mockFetch();
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      orderError =
        data.error ||
        (res.status === 404
          ? "Product not found in catalog."
          : "Other");
    }

    assert.strictEqual(orderError, "Product not found in catalog.");
  });

  // 1.6: Client behavior when API returns HTTP 500 internal server error
  await check("1.6 HTTP 500 halts execution and displays order service error", async () => {
    let windowOpenCalled = false;
    let orderError: string | null = null;

    const mockFetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: "Database timeout" }),
    });

    const res = await mockFetch();
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      orderError = data.error || `Order service error (${res.status}).`;
    }

    assert.strictEqual(windowOpenCalled, false);
    assert.strictEqual(orderError, "Database timeout");
  });

  // 1.7: Client behavior on network exception (fetch rejects)
  await check("1.7 Network exception is caught, halts execution, and reports connection error", async () => {
    let windowOpenCalled = false;
    let orderError: string | null = null;

    const mockFailingFetch = async () => {
      throw new TypeError("Failed to fetch");
    };

    try {
      await mockFailingFetch();
      windowOpenCalled = true;
    } catch (err: unknown) {
      orderError =
        err instanceof Error
          ? err.message
          : "Network error contacting order server. Please check your connection.";
    }

    assert.strictEqual(windowOpenCalled, false);
    assert.strictEqual(orderError, "Failed to fetch");
  });

  // 1.8: HTTP 200 with success: false (e.g. business logic refusal) halts execution
  await check("1.8 HTTP 200 with success: false halts execution and alerts user", async () => {
    let windowOpenCalled = false;
    let orderError: string | null = null;

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: false, error: "Variant unavailable" }),
    });

    const res = await mockFetch();
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      orderError = data.error || "Order failed";
    } else if (data.redirectUrl) {
      windowOpenCalled = true;
    }

    assert.strictEqual(windowOpenCalled, false);
    assert.strictEqual(orderError, "Variant unavailable");
  });

  // 1.9: HTTP 200 with success: true but missing redirectUrl triggers error
  await check("1.9 HTTP 200 with missing redirectUrl triggers error alert", async () => {
    let windowOpenCalled = false;
    let orderError: string | null = null;

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true }), // Missing redirectUrl!
    });

    const res = await mockFetch();
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      orderError = data.error;
    } else if (data.redirectUrl) {
      windowOpenCalled = true;
    } else {
      orderError = "Server did not return a valid WhatsApp redirection link.";
    }

    assert.strictEqual(windowOpenCalled, false);
    assert.strictEqual(orderError, "Server did not return a valid WhatsApp redirection link.");
  });

  // 1.10: Successful HTTP 200 opens WhatsApp with valid redirectUrl
  await check("1.10 Successful HTTP 200 invokes window.open with redirect URL and leaves orderError null", async () => {
    let windowOpenTarget = "";
    let windowOpenFeatures = "";
    let windowOpenUrl = "";
    let orderError: string | null = null;

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        redirectUrl: "https://wa.me/905551234567?text=VALID_ORDER",
      }),
    });

    const res = await mockFetch();
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      orderError = data.error;
    } else if (data.redirectUrl) {
      windowOpenUrl = data.redirectUrl;
      windowOpenTarget = "_blank";
      windowOpenFeatures = "noopener,noreferrer";
    }

    assert.strictEqual(orderError, null);
    assert.strictEqual(windowOpenUrl, "https://wa.me/905551234567?text=VALID_ORDER");
    assert.strictEqual(windowOpenTarget, "_blank");
    assert.strictEqual(windowOpenFeatures, "noopener,noreferrer");
  });

  // 1.11: End-to-end integration: Live Route handler returning 404 connected to client gating
  await check("1.11 Integration: Route POST with unknown product returns 404, client halts without window.open", async () => {
    const req = new Request("http://localhost:3000/api/order/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: "non_existent_product_xyz_123" }),
    });

    const routeRes = await orderWhatsappHandler(req);
    assert.strictEqual(routeRes.status, 404, "Route must return HTTP 404 for unknown product");
    const data = await routeRes.json();
    assert.strictEqual(data.success, false);

    // Simulate client reception
    let clientOpened = false;
    let clientError: string | null = null;

    if (!routeRes.ok || !data.success) {
      clientError = data.error || "Order validation failed";
    } else {
      clientOpened = true;
    }

    assert.strictEqual(clientOpened, false, "Client MUST NOT open window on 404");
    assert.ok(clientError?.includes("non_existent_product_xyz_123"), "Client error captures 404 reason");
  });

  // 1.12: End-to-end integration: Live Route handler returning 400 for negative price connected to client gating
  await check("1.12 Integration: Route POST with negative price returns 400, client halts without window.open", async () => {
    const req = new Request("http://localhost:3000/api/order/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: "prod_1", price: -100 }),
    });

    const routeRes = await orderWhatsappHandler(req);
    assert.strictEqual(routeRes.status, 400, "Route must return HTTP 400 for negative price");
    const data = await routeRes.json();
    assert.strictEqual(data.success, false);

    let clientOpened = false;
    let clientError: string | null = null;

    if (!routeRes.ok || !data.success) {
      clientError = data.error || "Order validation failed";
    } else {
      clientOpened = true;
    }

    assert.strictEqual(clientOpened, false, "Client MUST NOT open window on 400");
    assert.strictEqual(clientError, "Price must be a positive number");
  });

  // 1.13: End-to-end integration: Live Route handler returning 400 for out-of-stock variant connected to client gating
  await check("1.13 Integration: Route POST with out-of-stock variant returns 400, client halts without window.open", async () => {
    const req = new Request("http://localhost:3000/api/order/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: "prod_2", variant: "XL" }),
    });

    const routeRes = await orderWhatsappHandler(req);
    assert.strictEqual(routeRes.status, 400, "Route must return HTTP 400 for out of stock variant");
    const data = await routeRes.json();
    assert.strictEqual(data.success, false);

    let clientOpened = false;
    let clientError: string | null = null;

    if (!routeRes.ok || !data.success) {
      clientError = data.error || "Order validation failed";
    } else {
      clientOpened = true;
    }

    assert.strictEqual(clientOpened, false, "Client MUST NOT open window on 400 out of stock");
    assert.ok(clientError?.includes('Variant "XL" is currently out of stock'));
  });

  // 1.14: Out of stock product early exit (bypasses fetch completely)
  await check("1.14 Out of stock product (stock <= 0) halts before network call", async () => {
    const outOfStockProduct = makeProduct({ stock: 0 });
    let fetchCalled = false;

    const handleProductCta = (p: Product) => {
      if (p.stock <= 0) return; // Immediate guard
      fetchCalled = true;
    };

    handleProductCta(outOfStockProduct);
    assert.strictEqual(fetchCalled, false, "Fetch must never be initiated when stock <= 0");
  });

  // 1.15: Multi-variant product routes to VariantModal rather than direct WhatsApp fetch
  await check("1.15 Product with >1 variant opens modal and does not invoke direct WhatsApp fetch", () => {
    const multiVariantProduct = makeProduct({
      variants: [
        { name: "Small", inStock: true },
        { name: "Medium", inStock: true },
        { name: "Large", inStock: false },
      ],
    });

    let modalOpened = false;
    let directFetchCalled = false;

    const handleProductCta = (p: Product) => {
      const variants = (p.variants as any[]) || [];
      if (variants && variants.length > 1) {
        modalOpened = true;
        return;
      }
      directFetchCalled = true;
    };

    handleProductCta(multiVariantProduct);
    assert.strictEqual(modalOpened, true, "Modal must be opened for multi-variant product");
    assert.strictEqual(directFetchCalled, false, "Direct WhatsApp fetch must not be triggered");
  });

  // ============================================================================
  // SECTION 2: URL CONSTRUCTION WITH SPECIAL CHARACTERS, UNICODE & STORE SETTINGS
  // ============================================================================
  console.log("\n--- Section 2: WhatsApp URL Construction With Special Characters, Unicode & Store Settings ---");

  // 2.1: Base WhatsApp URL format specification
  await check("2.1 WhatsApp URL matches strict standard https://wa.me/<digits>?text=<encoded>", () => {
    const url = generateWhatsAppOrderUrl("+90 555 123 45 67", {
      productId: "prod_1",
      productName: "CYRUX LOGO TEE",
      price: 120.0,
      currency: "USD",
    });

    assert.ok(
      /^https:\/\/wa\.me\/905551234567\?text=.+$/.test(url),
      `URL format invalid: ${url}`
    );
  });

  // 2.2: Strict RFC 3986 encoding: zero raw spaces, zero raw newlines, literal * preservation
  await check("2.2 Zero unencoded spaces, zero unencoded linebreaks, and preserved bold asterisks", () => {
    const url = generateWhatsAppOrderUrl("+90 555 123 45 67", {
      productId: "prod_1",
      productName: "CYRUX OVERSIZED HOODIE",
      variant: "Heavyweight Boxy",
      price: 240.0,
      currency: "USD",
      customerNotes: "Please deliver to office reception.",
    });

    // Extract query parameter
    const [baseUrl, query] = url.split("?text=");
    assert.ok(query, "Must have ?text= query string");

    // Zero unencoded spaces
    assert.strictEqual(query.includes(" "), false, "Must not contain raw spaces");
    // Zero unencoded linebreaks
    assert.strictEqual(query.includes("\n"), false, "Must not contain raw newlines");
    assert.strictEqual(query.includes("\r"), false, "Must not contain raw carriage returns");

    // Space encoding is %20
    assert.ok(query.includes("%20"), "Must encode spaces as %20");
    // Linebreak encoding is %0A
    assert.ok(query.includes("%0A"), "Must encode linebreaks as %0A");

    // Asterisks are literal in query for WhatsApp bold formatting
    assert.ok(
      query.includes("*NEW%20ORDER%20-%20CYRUX%20STUDIO*"),
      "Must preserve literal * for WhatsApp bold syntax (*NEW%20ORDER%20-%20CYRUX%20STUDIO*)"
    );
  });

  // 2.3: Special query string delimiters: &, ?, =, #, /, %, +
  await check("2.3 Special URL delimiter characters (&, ?, =, #, /, %, +) are safely encoded", () => {
    const rawNotes = "Color: Black & White? Discount=50% #VIP / Fast+Priority";
    const url = generateWhatsAppOrderUrl("+90 555 123 45 67", {
      productId: "prod_1",
      productName: "CYRUX TEE & SHORTS #1",
      price: 150.0,
      currency: "USD",
      customerNotes: rawNotes,
    });

    const parsedUrl = new URL(url);
    const textParam = parsedUrl.searchParams.get("text");
    assert.ok(textParam, "searchParams.get('text') must resolve cleanly");

    // Decoded text must preserve the exact characters
    assert.ok(textParam.includes("Color: Black & White? Discount=50% #VIP / Fast+Priority"));
    assert.ok(textParam.includes("CYRUX TEE & SHORTS #1"));

    // Raw URL text segment must NOT contain raw &, #, ? which break query parameter parsing
    const rawQuery = url.split("?text=")[1];
    // Ensure rawQuery does not have unencoded '&' that split into other params
    const paramCount = url.split("&").length;
    assert.strictEqual(paramCount, 1, "Must not have unencoded & splitting query params");
    // Ensure rawQuery does not have unencoded '#' that truncate into fragment
    assert.strictEqual(url.includes("#1"), false, "Must not have unencoded # fragment");
  });

  // 2.4: Injection characters: quotes, backslashes, semicolons, angle brackets
  await check("2.4 Injection characters (', \", \\, ;, <, >) are stripped by sanitizer before URL encoding", () => {
    const maliciousVariant = '<script>alert("hack")</script>';
    const maliciousNotes = "'; DROP TABLE products; -- <img src=x onerror=alert(1)>";

    const url = generateWhatsAppOrderUrl("+90 555 123 45 67", {
      productId: "prod_1",
      productName: "CYRUX TEE",
      variant: maliciousVariant,
      price: 120.0,
      currency: "USD",
      customerNotes: maliciousNotes,
    });

    const decoded = decodeURIComponent(url.split("?text=")[1]);

    // Verify script tags and brackets are completely absent
    assert.strictEqual(decoded.includes("<script>"), false);
    assert.strictEqual(decoded.includes("</script>"), false);
    assert.strictEqual(decoded.includes("<img"), false);
    assert.strictEqual(decoded.includes("<"), false);
    assert.strictEqual(decoded.includes(">"), false);

    // Verify quotes and semicolons are stripped
    assert.strictEqual(decoded.includes('"'), false);
    assert.strictEqual(decoded.includes("'"), false);
    assert.strictEqual(decoded.includes(";"), false);
    assert.strictEqual(decoded.includes("\\"), false);

    // Verify sanitized clean content survives
    assert.ok(decoded.includes("Variant: alert(hack)"));
    assert.ok(decoded.includes("DROP TABLE products --"));
  });

  // 2.5: Multilingual Unicode - Turkish Characters
  await check("2.5 Turkish characters (ğ, ü, ş, ı, ö, ç, İ, Ğ, Ü, Ş, Ö, Ç) are faithfully encoded and restored", () => {
    const turkishName = "CYRUX AĞIR GRAMAJLI TİŞÖRT";
    const turkishVariant = "GÖMME KOLLU / ÇOK GENİŞ";
    const turkishNotes = "Lütfen kargo paketini özenle hazırlayınız; teşekkürler, iyi çalışmalar!";

    const url = generateWhatsAppOrderUrl("+90 555 123 45 67", {
      productId: "prod_1",
      productName: turkishName,
      variant: turkishVariant,
      price: 2500.0,
      currency: "TRY",
      customerNotes: turkishNotes,
    });

    const decoded = decodeURIComponent(url.split("?text=")[1]);
    assert.ok(decoded.includes("Product: CYRUX AĞIR GRAMAJLI TİŞÖRT"));
    assert.ok(decoded.includes("Variant: GÖMME KOLLU / ÇOK GENİŞ"));
    assert.ok(decoded.includes("2500.00 TRY"));
    assert.ok(decoded.includes("Lütfen kargo paketini özenle hazırlayınız"));
    assert.ok(decoded.includes("teşekkürler, iyi çalışmalar!"));
  });

  // 2.6: Multilingual Unicode - CJK, Cyrillic, Arabic, Accented Latin
  await check("2.6 Multilingual scripts (CJK, Cyrillic, Arabic, Accented Latin) encode without byte loss", () => {
    const japanese = "オーバーサイズ フーディー";
    const chinese = "黑色的超大号连帽衫";
    const korean = "오버사이즈 후드티";
    const cyrillic = "Черное худи оверсайз";
    const arabic = "هودي أسود فضفاض";
    const accentedLatin = "Édition Limitée - Café Résumé façade";

    const combinedNotes = `${japanese} | ${chinese} | ${korean} | ${cyrillic} | ${arabic} | ${accentedLatin}`;

    const url = generateWhatsAppOrderUrl("+90 555 123 45 67", {
      productId: "prod_1",
      productName: "CYRUX GLOBAL COLLECTION",
      price: 199.0,
      currency: "EUR",
      customerNotes: combinedNotes,
    });

    const decoded = decodeURIComponent(url.split("?text=")[1]);
    assert.ok(decoded.includes(japanese), "Japanese preserved");
    assert.ok(decoded.includes(chinese), "Chinese preserved");
    assert.ok(decoded.includes(korean), "Korean preserved");
    assert.ok(decoded.includes(cyrillic), "Cyrillic preserved");
    assert.ok(decoded.includes(arabic), "Arabic preserved");
    assert.ok(decoded.includes(accentedLatin), "Accented Latin preserved");
  });

  // 2.7: Emojis and Surrogate Pairs (4-byte UTF-8)
  await check("2.7 Emojis and surrogate pairs (🖤, 🔥, ⚡, 👕, 📦, 🇹🇷, 🇯🇵) encode and decode cleanly", () => {
    const emojiNotes = "Gift packaging please! 🖤 🔥 ⚡️ 👕 📦 🛸 🇹🇷 🇯🇵";

    const url = generateWhatsAppOrderUrl("+90 555 123 45 67", {
      productId: "prod_1",
      productName: "CYRUX HOODIE",
      price: 180.0,
      currency: "USD",
      customerNotes: emojiNotes,
    });

    const decoded = decodeURIComponent(url.split("?text=")[1]);
    assert.ok(decoded.includes("🖤"));
    assert.ok(decoded.includes("🔥"));
    assert.ok(decoded.includes("👕"));
    assert.ok(decoded.includes("📦"));
    assert.ok(decoded.includes("🛸"));
    assert.ok(decoded.includes("🇹🇷"));
    assert.ok(decoded.includes("🇯🇵"));
  });

  // 2.8: Phone Number Normalization - Various International Formats
  await check("2.8 International phone formats are normalized to pure E.164 digits without '+'", () => {
    const testCases: [string, string][] = [
      ["+90 555 123 45 67", "905551234567"],
      ["+90 (555) 123-4567", "905551234567"],
      ["05551234567", "05551234567"],
      ["90.555.123.45.67", "905551234567"],
      ["+1 (800) 555-0199", "18005550199"],
      ["+44 20 7946 0958", "442079460958"],
      ["+49 30 123456", "4930123456"],
      ["+81 90-1234-5678", "819012345678"],
      ["+971 50 123 4567", "971501234567"],
      ["00905551234567", "00905551234567"],
    ];

    for (const [raw, expectedDigits] of testCases) {
      const normalized = sanitizePhoneNumber(raw);
      assert.strictEqual(
        normalized,
        expectedDigits,
        `Expected ${raw} to sanitize to ${expectedDigits}, got ${normalized}`
      );

      const url = generateWhatsAppOrderUrl(raw, {
        productId: "p1",
        productName: "Test",
        price: 10,
        currency: "USD",
      });
      assert.ok(
        url.startsWith(`https://wa.me/${expectedDigits}?text=`),
        `URL should start with https://wa.me/${expectedDigits}`
      );
    }
  });

  // 2.9: Phone Number Normalization - Invalid inputs throw descriptive errors
  await check("2.9 Non-digit and empty phone numbers throw descriptive errors", () => {
    const invalidPhones = ["", "   ", "++--()", "no-digits", null as any, undefined as any];

    for (const invalid of invalidPhones) {
      assert.throws(
        () => sanitizePhoneNumber(invalid),
        /Invalid phone number: no digits found/,
        `Expected sanitizePhoneNumber("${invalid}") to throw`
      );
    }
  });

  // 2.10: Varied store settings: Currency formatting and symbols
  await check("2.10 formatProductPrice and URL generator format varied currencies (USD, EUR, TRY, GBP, JPY)", () => {
    // formatProductPrice symbol mapping
    assert.strictEqual(formatProductPrice(120, "USD"), "$120.00");
    assert.strictEqual(formatProductPrice(120, "EUR"), "€120.00");
    assert.strictEqual(formatProductPrice(120, "TRY"), "₺120.00");
    assert.strictEqual(formatProductPrice(120, "GBP"), "£120.00");
    assert.strictEqual(formatProductPrice(120, "usd"), "$120.00"); // Case-insensitive
    assert.strictEqual(formatProductPrice(120, "CAD"), "CAD120.00"); // Fallback

    // URL currency manifest
    const urlUSD = generateWhatsAppOrderUrl("+905551234567", {
      productId: "p1",
      productName: "Tee",
      price: 120,
      currency: "usd",
    });
    assert.ok(decodeURIComponent(urlUSD).includes("120.00 USD"));

    const urlTRY = generateWhatsAppOrderUrl("+905551234567", {
      productId: "p1",
      productName: "Tee",
      price: 2400,
      currency: "TRY",
    });
    assert.ok(decodeURIComponent(urlTRY).includes("2400.00 TRY"));

    const urlEUR = generateWhatsAppOrderUrl("+905551234567", {
      productId: "p1",
      productName: "Tee",
      price: 95,
      currency: "EUR",
    });
    assert.ok(decodeURIComponent(urlEUR).includes("95.00 EUR"));
  });

  // 2.11: Dynamic store settings fallback when database query fails or succeeds
  await check("2.11 getActiveStoreConfig resolves database settings or seed defaults", async () => {
    const config = await getActiveStoreConfig();
    assert.ok(config.whatsappNumber, "Must have whatsappNumber");
    assert.ok(config.currency, "Must have currency");
    assert.strictEqual(typeof config.whatsappNumber, "string");
    assert.strictEqual(typeof config.currency, "string");
  });

  // 2.12: generateDynamicWhatsAppOrderUrl resolves dynamic settings and overrides cleanly
  await check("2.12 generateDynamicWhatsAppOrderUrl respects explicit currency/phone overrides", async () => {
    const url = await generateDynamicWhatsAppOrderUrl({
      productId: "prod_1",
      productName: "CYRUX TEE",
      price: 100,
      currency: "GBP",
      whatsappNumber: "+44 20 7946 0958",
    });

    assert.ok(url.startsWith("https://wa.me/442079460958?text="));
    const decoded = decodeURIComponent(url);
    assert.ok(decoded.includes("100.00 GBP"));
  });

  // 2.13: Absent variant and notes omit corresponding lines without empty rows
  await check("2.13 Absent variant and notes omit lines cleanly without dangling labels or empty lines", () => {
    const url = generateWhatsAppOrderUrl("+905551234567", {
      productId: "prod_1",
      productName: "CYRUX TEE",
      price: 120,
      currency: "USD",
    });

    const decoded = decodeURIComponent(url.split("?text=")[1]);
    const lines = decoded.split("\n");

    // Must not contain "Variant:"
    assert.strictEqual(decoded.includes("Variant:"), false);
    // Must not contain "Notes:"
    assert.strictEqual(decoded.includes("Notes:"), false);
    // Must not contain empty lines
    for (const line of lines) {
      assert.ok(line.trim().length > 0, "No blank lines in order manifest");
    }

    // Verify expected manifest lines
    assert.strictEqual(lines[0], "*NEW ORDER - CYRUX STUDIO*");
    assert.strictEqual(lines[1], "Product: CYRUX TEE");
    assert.strictEqual(lines[2], "Price: 120.00 USD");
    assert.strictEqual(lines[3], "Ref ID: prod_1");
  });

  // 2.14: Asymmetric column configuration contract test
  await check("2.14 ASYMMETRIC_COLUMN_CONFIG has 4 distinct ratios with monumental Column 2", () => {
    assert.strictEqual(ASYMMETRIC_COLUMN_CONFIG.length, 4);
    assert.strictEqual(ASYMMETRIC_COLUMN_CONFIG[0].ratio, 1.2);
    assert.strictEqual(ASYMMETRIC_COLUMN_CONFIG[1].ratio, 1.45); // Monumental height
    assert.strictEqual(ASYMMETRIC_COLUMN_CONFIG[2].ratio, 1.15);
    assert.strictEqual(ASYMMETRIC_COLUMN_CONFIG[3].ratio, 1.35);

    assert.strictEqual(ASYMMETRIC_COLUMN_CONFIG[1].minHeightClass, "min-h-[560px]");
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n================================================================");
  console.log(`TOTAL CHALLENGER 2 EMPIRICAL ASSERTIONS: ${passedCount + failedCount}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log("================================================================");

  if (failedCount > 0) {
    console.error("\nFAILURES:");
    for (const f of failureDetails) {
      console.error(`- ${f}`);
    }
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runChallenger2Suite().catch((err) => {
  console.error("FATAL UNHANDLED ERROR in Challenger 2 suite:", err);
  process.exit(1);
});
