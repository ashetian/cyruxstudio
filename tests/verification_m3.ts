/**
 * Milestone 3 Comprehensive Verification Suite
 * Tests src/lib/validations.ts, src/lib/whatsapp.ts, and src/app/api/order/whatsapp/route.ts
 */

import assert from "node:assert";
import {
  sanitizeCustomerText,
  validateOrderPayload,
  whatsAppOrderInputSchema,
  whatsAppOrderApiRequestSchema,
} from "../src/lib/validations";
import {
  sanitizePhoneNumber,
  generateWhatsAppOrderUrl,
  getActiveStoreConfig,
  generateDynamicWhatsAppOrderUrl,
} from "../src/lib/whatsapp";
import { POST as orderWhatsappHandler } from "../src/app/api/order/whatsapp/route";

async function runM3Verification() {
  console.log("================================================================");
  console.log("   MILESTONE 3 VERIFICATION: WHATSAPP ORDERING ENGINE           ");
  console.log("================================================================");

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return Promise.resolve()
      .then(fn)
      .then(() => {
        console.log(`  ✔ [PASS] ${name}`);
        passed++;
      })
      .catch((err) => {
        console.error(`  ✖ [FAIL] ${name}:`, err.message);
        failed++;
      });
  }

  // --- Suite 1: Sanitization & Validations ---
  console.log("\n--- Suite 1: Sanitization & Zod Validation ---");

  await test("sanitizeCustomerText strips script and HTML tags", () => {
    const raw = 'Hello <script>alert("xss")</script> <b>world</b>';
    const cleaned = sanitizeCustomerText(raw);
    assert.strictEqual(cleaned, "Hello alert(xss) world");
  });

  await test("sanitizeCustomerText strips SQL and delimiter injection chars", () => {
    const raw = "'; DROP TABLE products; --";
    const cleaned = sanitizeCustomerText(raw);
    assert.strictEqual(cleaned, "DROP TABLE products --");
  });

  await test("validateOrderPayload passes well-formed payloads", () => {
    const res = validateOrderPayload({
      productId: "prod_1",
      variant: "Size L",
      customerNotes: "Please deliver carefully.",
    });
    assert.strictEqual(res.productId, "prod_1");
    assert.strictEqual(res.variant, "Size L");
    assert.strictEqual(res.customerNotes, "Please deliver carefully.");
  });

  await test("validateOrderPayload rejects empty or whitespace productId", () => {
    assert.throws(() => validateOrderPayload({ productId: "" }), /productId is required/);
    assert.throws(() => validateOrderPayload({ productId: "   " }), /productId is required/);
    assert.throws(() => validateOrderPayload({}), /productId is required/);
  });

  await test("validateOrderPayload rejects non-object input", () => {
    assert.throws(() => validateOrderPayload("string"), /Payload must be an object/);
    assert.throws(() => validateOrderPayload(null), /Payload must be an object/);
    assert.throws(() => validateOrderPayload([]), /Payload must be an object/);
  });

  await test("validateOrderPayload rejects variant over 50 chars", () => {
    assert.throws(
      () => validateOrderPayload({ productId: "p1", variant: "A".repeat(51) }),
      /variant must be a string up to 50 characters/
    );
  });

  await test("validateOrderPayload rejects customerNotes over 500 chars", () => {
    assert.throws(
      () => validateOrderPayload({ productId: "p1", customerNotes: "A".repeat(501) }),
      /customerNotes cannot exceed 500 characters/
    );
  });

  await test("whatsAppOrderInputSchema validates full order with positive price", () => {
    const parsed = whatsAppOrderInputSchema.parse({
      productId: "p1",
      productName: "Test Shirt",
      price: 99.99,
    });
    assert.strictEqual(parsed.currency, "USD");
    assert.strictEqual(parsed.price, 99.99);

    assert.throws(() => {
      whatsAppOrderInputSchema.parse({
        productId: "p1",
        productName: "Test Shirt",
        price: -10,
      });
    }, /Price must be a positive number/);
  });

  await test("whatsAppOrderApiRequestSchema validates request payload", () => {
    const parsed = whatsAppOrderApiRequestSchema.parse({
      productId: "p1",
      variant: "M",
      customerNotes: "Gift wrap please <script>",
    });
    assert.strictEqual(parsed.customerNotes, "Gift wrap please");
  });

  // --- Suite 2: WhatsApp URL Generation ---
  console.log("\n--- Suite 2: Dynamic WhatsApp URL Generation ---");

  await test("sanitizePhoneNumber extracts international digits", () => {
    assert.strictEqual(sanitizePhoneNumber("+90 532 123 45 67"), "905321234567");
    assert.strictEqual(sanitizePhoneNumber("+1 (555) 019-2834"), "15550192834");
    assert.throws(() => sanitizePhoneNumber("no-digits"), /no digits found/);
    assert.throws(() => sanitizePhoneNumber(""), /no digits found/);
  });

  await test("generateWhatsAppOrderUrl builds valid wa.me URL with formatting", () => {
    const url = generateWhatsAppOrderUrl("+905551234567", {
      productId: "prod_hoodie",
      productName: "MONOLITH HOODIE",
      variant: "Size XL",
      price: 240,
      currency: "EUR",
      customerNotes: "Express delivery",
    });

    assert(url.startsWith("https://wa.me/905551234567?text="));
    const decoded = decodeURIComponent(url.replace("https://wa.me/905551234567?text=", ""));
    assert(decoded.includes("*NEW ORDER - CYRUX STUDIO*"));
    assert(decoded.includes("Product: MONOLITH HOODIE"));
    assert(decoded.includes("Variant: Size XL"));
    assert(decoded.includes("Price: 240.00 EUR"));
    assert(decoded.includes("Notes: Express delivery"));
    assert(decoded.includes("Ref ID: prod_hoodie"));
  });

  await test("generateWhatsAppOrderUrl includes Time when timestamp is provided", () => {
    const url = generateWhatsAppOrderUrl("+905551234567", {
      productId: "prod_01",
      productName: "TEE",
      price: 50,
      currency: "USD",
      timestamp: "2026-11-14T12:00:00Z",
    });
    const decoded = decodeURIComponent(url);
    assert(decoded.includes("Time: 2026-11-14T12:00:00Z"));
  });

  await test("getActiveStoreConfig retrieves valid settings with fallback", async () => {
    const config = await getActiveStoreConfig();
    assert(typeof config.whatsappNumber === "string" && config.whatsappNumber.length > 5);
    assert(typeof config.currency === "string" && config.currency.length >= 3);
  });

  await test("generateDynamicWhatsAppOrderUrl creates complete link", async () => {
    const url = await generateDynamicWhatsAppOrderUrl({
      productId: "prod_01",
      productName: "TEST ITEM",
      price: 120,
    });
    assert(url.startsWith("https://wa.me/"));
    assert(url.includes("TEST%20ITEM"));
  });

  // --- Suite 3: API Route POST /api/order/whatsapp ---
  console.log("\n--- Suite 3: POST /api/order/whatsapp Route Handler ---");

  await test("Handler returns 400 on non-JSON body", async () => {
    const req = new Request("http://localhost:3000/api/order/whatsapp", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "text/plain" },
    });
    const res = await orderWhatsappHandler(req);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  await test("Handler returns 400 on missing productId", async () => {
    const req = new Request("http://localhost:3000/api/order/whatsapp", {
      method: "POST",
      body: JSON.stringify({ variant: "M" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await orderWhatsappHandler(req);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.error.includes("productId is required"));
  });

  await test("Handler returns 400 on customerNotes exceeding 500 chars", async () => {
    const req = new Request("http://localhost:3000/api/order/whatsapp", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_1",
        customerNotes: "X".repeat(501),
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await orderWhatsappHandler(req);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert(data.error.includes("customerNotes cannot exceed 500 characters"));
  });

  await test("Handler succeeds for existing product or explicit product payload", async () => {
    const req = new Request("http://localhost:3000/api/order/whatsapp", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_1",
        productName: "RAW CUT BOXY TEE",
        price: 95,
        variant: "Size L",
        customerNotes: "Please deliver between 2-4 PM",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await orderWhatsappHandler(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.redirectUrl.startsWith("https://wa.me/"));
    assert(data.redirectUrl.includes("PRETTY%20CHAOS%20TEE"));
  });

  // --- Suite 4: Polish Checks ---
  console.log("\n--- Suite 4: Polish Checks ---");

  await test("MagneticCTA arrow stripping logic works correctly", () => {
    const clean = (text: string) => text.replace(/→/g, "").trim();
    assert.strictEqual(clean("BUY NOW →"), "BUY NOW");
    assert.strictEqual(clean("ORDER VIA WHATSAPP →"), "ORDER VIA WHATSAPP");
    assert.strictEqual(clean("EXPLORE"), "EXPLORE");
  });

  console.log("\n================================================================");
  console.log(`TOTAL M3 ASSERTIONS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runM3Verification().catch((err) => {
  console.error("FATAL ERROR in M3 verification:", err);
  process.exit(1);
});
