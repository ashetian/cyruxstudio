import { POST } from "../../../src/app/api/order/whatsapp/route";
import {
  validateOrderPayload,
  sanitizeCustomerText,
  whatsAppOrderApiRequestSchema,
  whatsAppOrderInputSchema,
} from "../../../src/lib/validations";
import { generateWhatsAppOrderUrl, sanitizePhoneNumber } from "../../../src/lib/whatsapp";
import assert from "node:assert";

async function independentAudit() {
  console.log("=== INDEPENDENT FORENSIC AUDIT TESTS ===");

  // 1. Negative price with valid product ID
  const res1 = await POST(new Request("http://localhost:3000/api/order/whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: "prod_1", price: -50 })
  }));
  const data1 = await res1.json();
  console.log("Test 1 (negative price with valid ID): status =", res1.status, "data =", data1);
  assert.strictEqual(res1.status, 400, "Must return HTTP 400 on negative price");
  assert.strictEqual(data1.success, false);
  assert(data1.error.includes("positive number"), "Error must mention positive number");

  // 2. Negative price with non-existent product ID (must fail validation before DB lookup)
  const res2 = await POST(new Request("http://localhost:3000/api/order/whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: "non_existent_999", price: -50 })
  }));
  const data2 = await res2.json();
  console.log("Test 2 (negative price with non-existent ID): status =", res2.status, "data =", data2);
  assert.strictEqual(res2.status, 400, "Must return HTTP 400 on negative price even if ID is not in DB");
  assert.strictEqual(data2.success, false);

  // 3. Zero price
  const res3 = await POST(new Request("http://localhost:3000/api/order/whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: "prod_1", price: 0 })
  }));
  const data3 = await res3.json();
  console.log("Test 3 (zero price): status =", res3.status, "data =", data3);
  assert.strictEqual(res3.status, 400, "Must return HTTP 400 on zero price");

  // 4. Variant with XSS <script>alert(1)</script>
  const res4 = await POST(new Request("http://localhost:3000/api/order/whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: "prod_1", variant: "<script>alert(1)</script>" })
  }));
  const data4 = await res4.json();
  console.log("Test 4 (variant XSS): status =", res4.status, "data =", data4);
  assert.strictEqual(res4.status, 200, "Must return HTTP 200 after sanitizing variant");
  assert.strictEqual(data4.success, true);
  assert(!data4.redirectUrl.includes("%3Cscript%3E"), "URL must NOT contain %3Cscript%3E");
  assert(!data4.redirectUrl.includes("<script>"), "URL must NOT contain <script>");
  const decoded4 = decodeURIComponent(data4.redirectUrl);
  console.log("Decoded variant line in URL:", decoded4.split("\n").find(l => l.startsWith("Variant:")));
  assert(decoded4.includes("Variant: alert(1)"), "Variant should be sanitized to alert(1)");

  // 5. Variant with dangling angle brackets (e.g. "Size M <")
  const res5 = await POST(new Request("http://localhost:3000/api/order/whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: "prod_1", variant: "Size M <" })
  }));
  const data5 = await res5.json();
  assert.strictEqual(res5.status, 200);
  const decoded5 = decodeURIComponent(data5.redirectUrl);
  console.log("Decoded variant line for dangling bracket:", decoded5.split("\n").find(l => l.startsWith("Variant:")));
  assert(!decoded5.includes("<") && !decoded5.includes(">"), "Dangling angle brackets must be stripped");
  assert(decoded5.includes("Variant: Size M"), "Variant should be Size M");

  // 6. Unknown product ID with valid payload
  const res6 = await POST(new Request("http://localhost:3000/api/order/whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: "unknown_id_test_404" })
  }));
  const data6 = await res6.json();
  console.log("Test 6 (unknown product): status =", res6.status, "data =", data6);
  assert.strictEqual(res6.status, 404, "Must return HTTP 404 for unknown product");
  assert.strictEqual(data6.success, false);
  assert(data6.error.includes("Product not found with id: unknown_id_test_404"));

  // 7. Directly test validateOrderPayload with negative price
  assert.throws(() => validateOrderPayload({ productId: "prod_1", price: -10 }), /Price must be a positive number/);
  assert.throws(() => validateOrderPayload({ productId: "prod_1", price: 0 }), /Price must be a positive number/);

  // 8. Directly test sanitizeCustomerText
  const testSanitize = sanitizeCustomerText('<b onmouseover=evil()>bold</b> <script>alert(1)</script> ";DROP TABLE;--');
  console.log("Test 8 (sanitizeCustomerText):", testSanitize);
  assert(!testSanitize.includes("<"), "No <");
  assert(!testSanitize.includes(">"), "No >");
  assert(!testSanitize.includes(";"), "No ;");
  assert(!testSanitize.includes('"'), 'No "');
  assert(!testSanitize.includes("'"), "No '");

  console.log("=== ALL INDEPENDENT TESTS PASSED! ===");
}

independentAudit().catch(err => {
  console.error("Audit failure:", err);
  process.exit(1);
});
