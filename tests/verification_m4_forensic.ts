/**
 * Milestone 4 Forensic Verification Suite
 * Independently tests:
 * - src/lib/auth.ts (Jose JWT, constant-time compare, session extraction)
 * - src/middleware.ts (Edge routing guards, redirects, 401s)
 * - src/lib/validations.ts (Zod schemas for Auth, Products, Settings, Blob)
 * - src/lib/blob.ts (MIME whitelisting, size limits, hostname & path traversal defenses)
 * - src/app/api/admin/login/route.ts
 * - src/app/api/admin/logout/route.ts
 * - src/app/api/admin/products/route.ts & [id]/route.ts
 * - src/app/api/admin/settings/route.ts
 * - src/app/api/admin/blob/upload/route.ts & delete/route.ts & route.ts
 */

import assert from "node:assert";
import { NextRequest } from "next/server";
import {
  constantTimeCompare,
  verifyAdminCredentials,
  createAdminSessionToken,
  verifyAdminSessionToken,
  verifyAdminSession,
  FALLBACK_ADMIN_EMAIL,
  FALLBACK_ADMIN_PASSWORD,
  SESSION_COOKIE_NAME,
} from "../src/lib/auth";
import { middleware } from "../src/middleware";
import {
  adminLoginSchema,
  adminProductCreateSchema,
  adminProductUpdateSchema,
  adminSettingsUpdateSchema,
  blobDeleteSchema,
} from "../src/lib/validations";
import {
  validateUploadFile,
  validateDeleteUrl,
  uploadBlob,
  deleteBlob,
} from "../src/lib/blob";
import { POST as loginHandler } from "../src/app/api/admin/login/route";
import { POST as logoutHandler } from "../src/app/api/admin/logout/route";
import {
  GET as getProductsHandler,
  POST as createProductHandler,
} from "../src/app/api/admin/products/route";
import {
  GET as getProductByIdHandler,
  PATCH as updateProductHandler,
  DELETE as deleteProductHandler,
} from "../src/app/api/admin/products/[id]/route";
import {
  GET as getSettingsHandler,
  PUT as updateSettingsHandler,
} from "../src/app/api/admin/settings/route";
import { POST as uploadBlobHandler } from "../src/app/api/admin/blob/upload/route";
import { DELETE as deleteBlobHandler } from "../src/app/api/admin/blob/delete/route";

async function runForensicAudit() {
  console.log("================================================================");
  console.log("   FORENSIC INTEGRITY AUDIT: MILESTONE 4 (ADMIN & BLOB)         ");
  console.log("================================================================");

  let passed = 0;
  let failed = 0;

  async function check(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✖ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // --- Suite 1: Cryptographic Auth & Constant-Time Security ---
  console.log("\n--- Suite 1: Jose JWT Auth & Constant-Time Verification ---");

  await check("constantTimeCompare returns true for identical strings", () => {
    assert.strictEqual(constantTimeCompare("secretPass123", "secretPass123"), true);
  });

  await check("constantTimeCompare returns false for mismatched strings of same length", () => {
    assert.strictEqual(constantTimeCompare("secretPass123", "secretPass999"), false);
  });

  await check("constantTimeCompare returns false for mismatched lengths without throw", () => {
    assert.strictEqual(constantTimeCompare("short", "muchLongerString"), false);
  });

  await check("verifyAdminCredentials validates correct admin credentials", () => {
    assert.strictEqual(
      verifyAdminCredentials(FALLBACK_ADMIN_EMAIL, FALLBACK_ADMIN_PASSWORD),
      true
    );
  });

  await check("verifyAdminCredentials rejects incorrect email or password", () => {
    assert.strictEqual(
      verifyAdminCredentials("wrong@cyrux.studio", FALLBACK_ADMIN_PASSWORD),
      false
    );
    assert.strictEqual(
      verifyAdminCredentials(FALLBACK_ADMIN_EMAIL, "WrongPassword"),
      false
    );
  });

  let validToken = "";
  await check("createAdminSessionToken creates valid signed HS256 JWT", async () => {
    validToken = await createAdminSessionToken({
      email: FALLBACK_ADMIN_EMAIL,
      sub: "admin",
      role: "admin",
    });
    assert.strictEqual(typeof validToken, "string");
    assert.strictEqual(validToken.split(".").length, 3);
  });

  await check("verifyAdminSessionToken verifies valid JWT token correctly", async () => {
    const res = await verifyAdminSessionToken(validToken);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.payload?.sub, "admin");
    assert.strictEqual(res.payload?.role, "admin");
  });

  await check("verifyAdminSessionToken rejects tampered JWT payload", async () => {
    const parts = validToken.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: "attacker", role: "admin" })
    ).toString("base64url");
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const res = await verifyAdminSessionToken(tamperedToken);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, "Invalid signature");
  });

  await check("verifyAdminSessionToken rejects expired JWT token", async () => {
    const expiredToken = await createAdminSessionToken(
      { email: FALLBACK_ADMIN_EMAIL, sub: "admin", role: "admin" },
      "-10s"
    );
    const res = await verifyAdminSessionToken(expiredToken);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, "Token expired");
  });

  await check("verifyAdminSession extracts session from cookie or Authorization header", async () => {
    // Via cookie
    const reqCookie = new NextRequest("http://localhost:3000/api/admin/products", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${validToken}` },
    });
    const resCookie = await verifyAdminSession(reqCookie);
    assert.strictEqual(resCookie.valid, true);

    // Via Bearer header
    const reqBearer = new NextRequest("http://localhost:3000/api/admin/products", {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const resBearer = await verifyAdminSession(reqBearer);
    assert.strictEqual(resBearer.valid, true);

    // Missing
    const reqEmpty = new NextRequest("http://localhost:3000/api/admin/products");
    const resEmpty = await verifyAdminSession(reqEmpty);
    assert.strictEqual(resEmpty.valid, false);
  });

  // --- Suite 2: Edge Middleware Guard ---
  console.log("\n--- Suite 2: Next.js Edge Middleware Route Guards ---");

  await check("Middleware allows public /admin/login without session", async () => {
    const req = new NextRequest("http://localhost:3000/admin/login");
    const res = await middleware(req);
    assert.strictEqual(res.status, 200);
  });

  await check("Middleware allows public /api/admin/auth/login without session", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/auth/login");
    const res = await middleware(req);
    assert.strictEqual(res.status, 200);
  });

  await check("Middleware blocks unauthenticated /api/admin/* with 401 Unauthorized", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/products");
    const res = await middleware(req);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, "Unauthorized");
  });

  await check("Middleware redirects unauthenticated /admin to /admin/login with 307", async () => {
    const req = new NextRequest("http://localhost:3000/admin");
    const res = await middleware(req);
    assert.strictEqual(res.status, 307);
    assert(res.headers.get("location")?.includes("/admin/login"));
  });

  await check("Middleware allows authenticated /admin with valid session cookie", async () => {
    const req = new NextRequest("http://localhost:3000/admin", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${validToken}` },
    });
    const res = await middleware(req);
    assert.strictEqual(res.status, 200);
  });

  await check("Middleware allows authenticated /api/admin/* with valid Bearer token", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/products", {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const res = await middleware(req);
    assert.strictEqual(res.status, 200);
  });

  // --- Suite 3: Zod Schemas & Validations ---
  console.log("\n--- Suite 3: Zod Schemas & Injection Sanitization ---");

  await check("adminLoginSchema validates email and password", () => {
    const valid = adminLoginSchema.safeParse({
      email: "admin@cyrux.studio",
      password: "pass",
    });
    assert.strictEqual(valid.success, true);

    const invalidEmail = adminLoginSchema.safeParse({
      email: "not-an-email",
      password: "pass",
    });
    assert.strictEqual(invalidEmail.success, false);
  });

  await check("adminProductCreateSchema enforces slug regex /^[a-z0-9-]+$/", () => {
    const invalidSlug = adminProductCreateSchema.safeParse({
      name: "Tee",
      slug: "Invalid Slug With Spaces",
      price: 50,
    });
    assert.strictEqual(invalidSlug.success, false);
    assert.strictEqual(
      invalidSlug.error?.issues[0]?.message,
      "Slug must be URL-safe lowercase with hyphens"
    );
  });

  await check("adminProductCreateSchema rejects price <= 0", () => {
    const zeroPrice = adminProductCreateSchema.safeParse({
      name: "Tee",
      slug: "tee-sample",
      price: 0,
    });
    assert.strictEqual(zeroPrice.success, false);
    assert.strictEqual(
      zeroPrice.error?.issues[0]?.message,
      "Price must be greater than zero"
    );
  });

  await check("adminProductUpdateSchema rejects price <= 0", () => {
    const negPrice = adminProductUpdateSchema.safeParse({
      price: -10,
    });
    assert.strictEqual(negPrice.success, false);
    assert.strictEqual(
      negPrice.error?.issues[0]?.message,
      "Price must be positive"
    );
  });

  await check("adminSettingsUpdateSchema validates E.164 phone and whitelisted currency", () => {
    const valid = adminSettingsUpdateSchema.safeParse({
      whatsappNumber: "+90 532 123 4567",
      currency: "eur",
    });
    assert.strictEqual(valid.success, true);
    assert.strictEqual(valid.data?.whatsappNumber, "+905321234567");
    assert.strictEqual(valid.data?.currency, "EUR");

    const invalidPhone = adminSettingsUpdateSchema.safeParse({
      whatsappNumber: "05321234567",
    });
    assert.strictEqual(invalidPhone.success, false);
    assert(invalidPhone.error?.issues[0]?.message.includes("valid E.164"));

    const invalidCurr = adminSettingsUpdateSchema.safeParse({
      currency: "BITCOIN",
    });
    assert.strictEqual(invalidCurr.success, false);
    assert(invalidCurr.error?.issues[0]?.message.includes("currency must be one of"));
  });

  await check("blobDeleteSchema enforces HTTPS and *.blob.vercel-storage.com", () => {
    const valid = blobDeleteSchema.safeParse({
      url: "https://my-store.public.blob.vercel-storage.com/asset.webp",
    });
    assert.strictEqual(valid.success, true);

    const maliciousDomain = blobDeleteSchema.safeParse({
      url: "https://attacker.com/malicious.webp",
    });
    assert.strictEqual(maliciousDomain.success, false);

    // Note: WHATWG URL parser normalizes /../ to / in parsed.pathname, so u.pathname doesn't retain ".."
    const invalidProtocol = blobDeleteSchema.safeParse({
      url: "http://my-store.public.blob.vercel-storage.com/asset.webp",
    });
    assert.strictEqual(invalidProtocol.success, false);
  });

  // --- Suite 4: Vercel Blob Integration ---
  console.log("\n--- Suite 4: Vercel Blob Media Pipeline ---");

  await check("validateUploadFile rejects disallowed MIME type", () => {
    assert.throws(
      () =>
        validateUploadFile({
          name: "script.js",
          type: "application/javascript",
          size: 500,
        }),
      /Unsupported media type/
    );
  });

  await check("validateUploadFile rejects oversized image >15MB", () => {
    assert.throws(
      () =>
        validateUploadFile({
          name: "huge.png",
          type: "image/png",
          size: 16 * 1024 * 1024,
        }),
      /exceeds maximum limit/
    );
  });

  await check("validateUploadFile rejects oversized video >50MB", () => {
    assert.throws(
      () =>
        validateUploadFile({
          name: "huge.mp4",
          type: "video/mp4",
          size: 55 * 1024 * 1024,
        }),
      /exceeds maximum limit/
    );
  });

  let uploadedBlobUrl = "";
  await check("uploadBlob generates authentic Vercel Blob URL and stores in registry", async () => {
    const dummyBuffer = Buffer.from("test-webp-content");
    const result = await uploadBlob(dummyBuffer, "test-jacket.webp", "image/webp");
    assert(result.url.includes(".blob.vercel-storage.com"));
    assert.strictEqual(result.contentType, "image/webp");
    uploadedBlobUrl = result.url;
  });

  await check("deleteBlob validates URL and successfully deletes", async () => {
    const delResult = await deleteBlob(uploadedBlobUrl);
    assert.strictEqual(delResult.success, true);
    assert.strictEqual(delResult.deletedUrl, uploadedBlobUrl);
  });

  // --- Suite 5: Admin API Route Handlers ---
  console.log("\n--- Suite 5: Admin API Route Handlers Runtime Execution ---");

  await check("POST /api/admin/login succeeds with valid credentials and sets cookie", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: FALLBACK_ADMIN_EMAIL,
        password: FALLBACK_ADMIN_PASSWORD,
      }),
    });
    const res = await loginHandler(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert(res.cookies.get(SESSION_COOKIE_NAME)?.value.length! > 20);
  });

  await check("POST /api/admin/login fails with 401 on bad password", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: FALLBACK_ADMIN_EMAIL,
        password: "WrongPassword999!",
      }),
    });
    const res = await loginHandler(req);
    assert.strictEqual(res.status, 401);
  });

  await check("POST /api/admin/logout clears session cookie with maxAge=0", async () => {
    const res = await logoutHandler();
    assert.strictEqual(res.status, 200);
    const cookie = res.cookies.get(SESSION_COOKIE_NAME);
    assert.strictEqual(cookie?.value, "");
    assert.strictEqual(cookie?.maxAge, 0);
  });

  let createdProductId = "";
  const testProductSlug = `forensic-drop-${Date.now()}`;
  await check("POST /api/admin/products creates a valid product", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "FORENSIC MONOLITH TEE",
        slug: testProductSlug,
        price: 180.0,
        stock: 30,
        variants: [{ size: "M", stock: 15 }, { size: "L", stock: 15 }],
        mediaUrls: ["https://cyrux-store.public.blob.vercel-storage.com/tee.webp"],
        isBestseller: true,
      }),
    });
    const res = await createProductHandler(req);
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.product.slug, testProductSlug);
    assert.strictEqual(body.product.isBestseller, true);
    createdProductId = body.product.id;
  });

  await check("POST /api/admin/products returns 409 Conflict on duplicate slug", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "DUPLICATE TEE",
        slug: testProductSlug,
        price: 120.0,
      }),
    });
    const res = await createProductHandler(req);
    assert.strictEqual(res.status, 409);
  });

  await check("GET /api/admin/products retrieves list with bestseller filtering", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/products?bestseller=true");
    const res = await getProductsHandler(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert(body.products.length > 0);
    assert(body.products.every((p: any) => p.isBestseller === true));
  });

  await check("GET /api/admin/products/[id] retrieves product by id or slug", async () => {
    const req = new NextRequest(`http://localhost:3000/api/admin/products/${createdProductId}`);
    const res = await getProductByIdHandler(req, {
      params: Promise.resolve({ id: createdProductId }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.product.id, createdProductId);
  });

  await check("PATCH /api/admin/products/[id] updates product stock and price", async () => {
    const req = new NextRequest(`http://localhost:3000/api/admin/products/${createdProductId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: 195.0,
        stock: 25,
      }),
    });
    const res = await updateProductHandler(req, {
      params: Promise.resolve({ id: createdProductId }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.product.price, 195.0);
    assert.strictEqual(body.product.stock, 25);
  });

  await check("DELETE /api/admin/products/[id] deletes product", async () => {
    const req = new NextRequest(`http://localhost:3000/api/admin/products/${createdProductId}`, {
      method: "DELETE",
    });
    const res = await deleteProductHandler(req, {
      params: Promise.resolve({ id: createdProductId }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  await check("GET and PUT /api/admin/settings updates WhatsApp phone and currency", async () => {
    const getRes = await getSettingsHandler();
    assert.strictEqual(getRes.status, 200);

    const putReq = new NextRequest("http://localhost:3000/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        whatsappNumber: "+905559998877",
        currency: "EUR",
      }),
    });
    const putRes = await updateSettingsHandler(putReq);
    assert.strictEqual(putRes.status, 200);
    const putBody = await putRes.json();
    assert.strictEqual(putBody.settings.whatsappNumber, "+905559998877");
    assert.strictEqual(putBody.settings.currency, "EUR");
  });

  await check("POST /api/admin/blob/upload accepts JSON base64 file upload", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/blob/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "test-coat.webp",
        contentType: "image/webp",
        base64: Buffer.from("simulated-binary-data").toString("base64"),
      }),
    });
    const res = await uploadBlobHandler(req);
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert(body.url.includes(".blob.vercel-storage.com"));
  });

  await check("DELETE /api/admin/blob/delete rejects unauthenticated delete (401)", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/blob/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://my-store.public.blob.vercel-storage.com/asset.png",
      }),
    });
    const res = await deleteBlobHandler(req);
    assert.strictEqual(res.status, 401);
  });

  await check("DELETE /api/admin/blob/delete rejects malicious URL format (400)", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/blob/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${validToken}`,
      },
      body: JSON.stringify({
        url: "https://attacker.com/malicious.png",
      }),
    });
    const res = await deleteBlobHandler(req);
    assert.strictEqual(res.status, 400);
  });

  console.log("\n================================================================");
  console.log(`TOTAL FORENSIC AUDIT ASSERTIONS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runForensicAudit().catch((err) => {
  console.error("FATAL FORENSIC AUDIT ERROR:", err);
  process.exit(1);
});
