/**
 * Adversarial Verification Suite for Milestone 4 (M4)
 * cyrux studio - Reviewer 2
 */

import assert from "node:assert";
import {
  adminProductCreateSchema,
  adminProductUpdateSchema,
  adminSettingsUpdateSchema,
  blobDeleteSchema,
  allowedSlugRegex,
  ALLOWED_CURRENCIES,
  normalizeProductResponse,
} from "../../../src/lib/validations";
import {
  validateUploadFile,
  validateDeleteUrl,
  uploadBlob,
  deleteBlob,
  listAllBlobs,
  ALLOWED_BLOB_MIME_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
} from "../../../src/lib/blob";
import {
  constantTimeCompare,
  verifyAdminCredentials,
  createAdminSessionToken,
  verifyAdminSessionToken,
  FALLBACK_ADMIN_EMAIL,
  FALLBACK_ADMIN_PASSWORD,
  FALLBACK_JWT_SECRET,
} from "../../../src/lib/auth";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err: unknown) {
    console.error(`  ✖ [FAIL] ${name}:`, err instanceof Error ? err.message : err);
    failed++;
  }
}

async function run() {
  console.log("==================================================================");
  console.log("      M4 ADVERSARIAL STRESS TEST & INTEGRITY AUDIT (REV 2)        ");
  console.log("==================================================================");

  // -------------------------------------------------------------------------
  // 1. Validations: Slugs
  // -------------------------------------------------------------------------
  console.log("\n--- Section 1: Product Slug Regex & Validation ---");

  await test("allowedSlugRegex matches url-safe lowercase with hyphens", () => {
    assert.strictEqual(allowedSlugRegex.test("cyrux-jacket"), true);
    assert.strictEqual(allowedSlugRegex.test("item123"), true);
    assert.strictEqual(allowedSlugRegex.test("a-b-c-1-2-3"), true);
  });

  await test("allowedSlugRegex rejects uppercase, spaces, underscores, symbols, traversal", () => {
    assert.strictEqual(allowedSlugRegex.test("CYRUX-JACKET"), false);
    assert.strictEqual(allowedSlugRegex.test("cyrux jacket"), false);
    assert.strictEqual(allowedSlugRegex.test("cyrux_jacket"), false);
    assert.strictEqual(allowedSlugRegex.test("../etc/passwd"), false);
    assert.strictEqual(allowedSlugRegex.test("item$100"), false);
    assert.strictEqual(allowedSlugRegex.test("<script>"), false);
  });

  await test("adminProductCreateSchema rejects invalid slugs with verbatim error message", () => {
    const res = adminProductCreateSchema.safeParse({
      name: "Test Product",
      slug: "Invalid Slug!",
      price: 150,
      stock: 10,
    });
    assert.strictEqual(res.success, false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.includes("slug"));
      assert.strictEqual(issue?.message, "Slug must be URL-safe lowercase with hyphens");
    }
  });

  await test("adminProductUpdateSchema rejects invalid slugs with verbatim error message", () => {
    const res = adminProductUpdateSchema.safeParse({
      slug: "CAPITAL_SLUG",
    });
    assert.strictEqual(res.success, false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.includes("slug"));
      assert.strictEqual(issue?.message, "Slug must be URL-safe lowercase with hyphens");
    }
  });

  // -------------------------------------------------------------------------
  // 2. Validations: Pricing
  // -------------------------------------------------------------------------
  console.log("\n--- Section 2: Product Pricing Constraints ---");

  await test("adminProductCreateSchema rejects zero price with 'Price must be greater than zero'", () => {
    const res = adminProductCreateSchema.safeParse({
      name: "Free Gift",
      slug: "free-gift",
      price: 0,
      stock: 5,
    });
    assert.strictEqual(res.success, false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.includes("price"));
      assert.strictEqual(issue?.message, "Price must be greater than zero");
    }
  });

  await test("adminProductCreateSchema rejects negative price", () => {
    const res = adminProductCreateSchema.safeParse({
      name: "Exploit Item",
      slug: "exploit-item",
      price: -50,
      stock: 5,
    });
    assert.strictEqual(res.success, false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.includes("price"));
      assert.strictEqual(issue?.message, "Price must be greater than zero");
    }
  });

  await test("adminProductUpdateSchema rejects zero or negative price with 'Price must be positive'", () => {
    const resZero = adminProductUpdateSchema.safeParse({ price: 0 });
    assert.strictEqual(resZero.success, false);
    if (!resZero.success) {
      const issue = resZero.error.issues.find((i) => i.path.includes("price"));
      assert.strictEqual(issue?.message, "Price must be positive");
    }

    const resNeg = adminProductUpdateSchema.safeParse({ price: -10.5 });
    assert.strictEqual(resNeg.success, false);
    if (!resNeg.success) {
      const issue = resNeg.error.issues.find((i) => i.path.includes("price"));
      assert.strictEqual(issue?.message, "Price must be positive");
    }
  });

  await test("adminProductCreateSchema accepts valid positive float prices", () => {
    const res = adminProductCreateSchema.safeParse({
      name: "Valid Jacket",
      slug: "valid-jacket",
      price: 420.5,
      stock: 10,
    });
    assert.strictEqual(res.success, true);
  });

  // -------------------------------------------------------------------------
  // 3. Validations: Store Settings (Phone & Currency)
  // -------------------------------------------------------------------------
  console.log("\n--- Section 3: Store Settings E.164 & Currency ---");

  await test("adminSettingsUpdateSchema accepts valid E.164 phone numbers with +", () => {
    const res1 = adminSettingsUpdateSchema.safeParse({
      whatsappNumber: "+905320000000",
    });
    assert.strictEqual(res1.success, true);
    if (res1.success) {
      assert.strictEqual(res1.data.whatsappNumber, "+905320000000");
    }

    const res2 = adminSettingsUpdateSchema.safeParse({
      whatsappNumber: "+1 (555) 888-9900",
    });
    assert.strictEqual(res2.success, true);
    if (res2.success) {
      assert.strictEqual(res2.data.whatsappNumber, "+15558889900");
    }
  });

  await test("adminSettingsUpdateSchema rejects phone without leading +", () => {
    const res = adminSettingsUpdateSchema.safeParse({
      whatsappNumber: "905320000000",
    });
    assert.strictEqual(res.success, false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.includes("whatsappNumber"));
      assert.strictEqual(
        issue?.message,
        "whatsappNumber must be a valid E.164 formatted number starting with +"
      );
    }
  });

  await test("adminSettingsUpdateSchema rejects phone with invalid length or non-digits", () => {
    const resShort = adminSettingsUpdateSchema.safeParse({
      whatsappNumber: "+12345",
    });
    assert.strictEqual(resShort.success, false);

    const resAlpha = adminSettingsUpdateSchema.safeParse({
      whatsappNumber: "+90532000abcd",
    });
    assert.strictEqual(resAlpha.success, false);
  });

  await test("adminSettingsUpdateSchema validates allowed currencies [USD, EUR, TRY, GBP]", () => {
    for (const curr of ALLOWED_CURRENCIES) {
      const res = adminSettingsUpdateSchema.safeParse({ currency: curr });
      assert.strictEqual(res.success, true);
      if (res.success) {
        assert.strictEqual(res.data.currency, curr);
      }
    }
    // Case insensitivity
    const resLower = adminSettingsUpdateSchema.safeParse({ currency: "eur" });
    assert.strictEqual(resLower.success, true);
    if (resLower.success) {
      assert.strictEqual(resLower.data.currency, "EUR");
    }
  });

  await test("adminSettingsUpdateSchema rejects unauthorized currency codes with verbatim error", () => {
    const res = adminSettingsUpdateSchema.safeParse({ currency: "CAD" });
    assert.strictEqual(res.success, false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.includes("currency"));
      assert.strictEqual(issue?.message, "currency must be one of: USD, EUR, TRY, GBP");
    }
  });

  // -------------------------------------------------------------------------
  // 4. Vercel Blob: Whitelisting, Size Limits, Deletion Validation
  // -------------------------------------------------------------------------
  console.log("\n--- Section 4: Vercel Blob Storage Guards ---");

  await test("ALLOWED_BLOB_MIME_TYPES contains exact required formats", () => {
    assert.deepStrictEqual(ALLOWED_BLOB_MIME_TYPES, [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "video/mp4",
      "video/quicktime",
    ]);
  });

  await test("validateUploadFile accepts images <= 15MB", () => {
    const validImg = validateUploadFile({
      name: "hero.webp",
      type: "image/webp",
      size: MAX_IMAGE_SIZE,
    });
    assert.strictEqual(validImg.isVideo, false);
    assert.strictEqual(validImg.limit, MAX_IMAGE_SIZE);
  });

  await test("validateUploadFile rejects images > 15MB", () => {
    assert.throws(
      () =>
        validateUploadFile({
          name: "giant.png",
          type: "image/png",
          size: MAX_IMAGE_SIZE + 1,
        }),
      /exceeds maximum limit/
    );
  });

  await test("validateUploadFile accepts video <= 50MB and rejects > 50MB", () => {
    const validVideo = validateUploadFile({
      name: "campaign.mp4",
      type: "video/mp4",
      size: MAX_VIDEO_SIZE,
    });
    assert.strictEqual(validVideo.isVideo, true);
    assert.strictEqual(validVideo.limit, MAX_VIDEO_SIZE);

    assert.throws(
      () =>
        validateUploadFile({
          name: "huge.mp4",
          type: "video/mp4",
          size: MAX_VIDEO_SIZE + 1,
        }),
      /exceeds maximum limit/
    );
  });

  await test("validateUploadFile rejects unsafe MIME types (SVG, HTML, JS, EXE)", () => {
    const unsafeTypes = [
      "image/svg+xml",
      "text/html",
      "application/javascript",
      "application/x-msdownload",
      "application/pdf",
    ];
    for (const t of unsafeTypes) {
      assert.throws(
        () => validateUploadFile({ name: "file", type: t, size: 1024 }),
        /Unsupported media type/
      );
    }
  });

  await test("validateDeleteUrl accepts valid Vercel Blob HTTPS URLs", () => {
    const valid = "https://cyrux-store.public.blob.vercel-storage.com/asset-123.webp";
    const parsed = validateDeleteUrl(valid);
    assert.strictEqual(parsed.url, valid);
  });

  await test("validateDeleteUrl rejects non-HTTPS URLs", () => {
    const http = "http://cyrux-store.public.blob.vercel-storage.com/asset-123.webp";
    assert.throws(() => validateDeleteUrl(http), /Only HTTPS Vercel Blob URLs/);
  });

  await test("validateDeleteUrl rejects domain spoofing attempts", () => {
    const spoof1 = "https://evil.blob.vercel-storage.com.attacker.com/asset.png";
    assert.throws(
      () => validateDeleteUrl(spoof1),
      /Only Vercel Blob URLs \(\*\.blob\.vercel-storage\.com\) can be deleted/
    );

    const spoof2 = "https://storage.googleapis.com/cyrux-store.blob.vercel-storage.com";
    assert.throws(() => validateDeleteUrl(spoof2), /Only Vercel Blob URLs/);
  });

  await test("validateDeleteUrl rejects path traversal sequences (..)", () => {
    // When .. is in the pathname segment (e.g. foo..bar), parsed.pathname contains ..
    const traversalFilename = "https://cyrux-store.public.blob.vercel-storage.com/foo..bar.webp";
    assert.throws(
      () => validateDeleteUrl(traversalFilename),
      /Path traversal sequence detected in blob URL/
    );
  });

  await test("blobDeleteSchema mirrors validateDeleteUrl checks via Zod", () => {
    const validRes = blobDeleteSchema.safeParse({
      url: "https://my-store.public.blob.vercel-storage.com/photo.jpg",
    });
    assert.strictEqual(validRes.success, true);

    const invalidRes = blobDeleteSchema.safeParse({
      url: "https://evil.com/photo.jpg",
    });
    assert.strictEqual(invalidRes.success, false);
  });

  await test("uploadBlob & deleteBlob offline fallback executes deterministically", () => {
    return (async () => {
      const buffer = Buffer.from("dummy-image-binary-content");
      const uploadRes = await uploadBlob(buffer, "test-asset.webp", "image/webp");
      assert.strictEqual(uploadRes.contentType, "image/webp");
      assert.strictEqual(uploadRes.size, buffer.length);
      assert.strictEqual(uploadRes.url.includes(".blob.vercel-storage.com"), true);

      const listBefore = await listAllBlobs();
      assert.strictEqual(listBefore.some((b) => b.url === uploadRes.url), true);

      const delRes = await deleteBlob(uploadRes.url);
      assert.strictEqual(delRes.success, true);
      assert.strictEqual(delRes.deletedUrl, uploadRes.url);

      const listAfter = await listAllBlobs();
      assert.strictEqual(listAfter.some((b) => b.url === uploadRes.url), false);
    })();
  });

  // -------------------------------------------------------------------------
  // 5. Auth & Cryptography: Jose JWT, Timing Attacks, Sessions
  // -------------------------------------------------------------------------
  console.log("\n--- Section 5: Jose JWT & Timing Attack Defenses ---");

  await test("constantTimeCompare performs timing-safe byte equality comparison", () => {
    assert.strictEqual(constantTimeCompare("secret123", "secret123"), true);
    assert.strictEqual(constantTimeCompare("secret123", "secret124"), false);
    assert.strictEqual(constantTimeCompare("secret123", "short"), false);
    assert.strictEqual(constantTimeCompare("short", "muchLongerPassphrase"), false);
  });

  await test("verifyAdminCredentials validates against configured/fallback credentials", () => {
    assert.strictEqual(
      verifyAdminCredentials(FALLBACK_ADMIN_EMAIL, FALLBACK_ADMIN_PASSWORD),
      true
    );
    assert.strictEqual(
      verifyAdminCredentials("ADMIN@CYRUX.STUDIO", FALLBACK_ADMIN_PASSWORD),
      true
    );
    assert.strictEqual(
      verifyAdminCredentials(FALLBACK_ADMIN_EMAIL, "WrongPassword!"),
      false
    );
    assert.strictEqual(
      verifyAdminCredentials("hacker@evil.com", FALLBACK_ADMIN_PASSWORD),
      false
    );
    assert.strictEqual(verifyAdminCredentials("", ""), false);
  });

  await test("createAdminSessionToken & verifyAdminSessionToken issue and verify valid HS256 tokens", () => {
    return (async () => {
      const token = await createAdminSessionToken({
        email: "admin@cyrux.studio",
        sub: "admin",
        role: "admin",
      });

      assert.strictEqual(typeof token, "string");
      assert.strictEqual(token.split(".").length, 3);

      const verified = await verifyAdminSessionToken(token);
      assert.strictEqual(verified.valid, true);
      assert.strictEqual(verified.payload?.email, "admin@cyrux.studio");
      assert.strictEqual(verified.payload?.role, "admin");
    })();
  });

  await test("verifyAdminSessionToken rejects tampered signature tokens", () => {
    return (async () => {
      const token = await createAdminSessionToken({
        email: "admin@cyrux.studio",
        sub: "admin",
        role: "admin",
      });
      const parts = token.split(".");
      // Tamper with payload
      const tamperedPayload = Buffer.from(
        JSON.stringify({ sub: "hacker", role: "admin" })
      ).toString("base64url");
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const res = await verifyAdminSessionToken(tamperedToken);
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.error, "Invalid signature");
    })();
  });

  await test("verifyAdminSessionToken rejects expired tokens", () => {
    return (async () => {
      // Create token with negative expiration
      const expiredToken = await createAdminSessionToken(
        { email: "admin@cyrux.studio" },
        "-10s"
      );
      const res = await verifyAdminSessionToken(expiredToken);
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.error, "Token expired");
    })();
  });

  // -------------------------------------------------------------------------
  // 6. Normalization & Sanitization
  // -------------------------------------------------------------------------
  console.log("\n--- Section 6: Product Normalizer & Sanitization ---");

  await test("normalizeProductResponse guarantees all required contract properties", () => {
    const raw = {
      id: "prod-999",
      title: "BRUTALIST TEE",
      slug: "brutalist-tee",
      price: 180,
      badge: "BESTSELLER",
      images: ["https://blob.vercel.com/t1.webp"],
    };
    const normalized = normalizeProductResponse(raw);
    assert.strictEqual(normalized.id, "prod-999");
    assert.strictEqual(normalized.name, "BRUTALIST TEE");
    assert.strictEqual(normalized.title, "BRUTALIST TEE");
    assert.strictEqual(normalized.isBestseller, true);
    assert.deepStrictEqual(normalized.mediaUrls, ["https://blob.vercel.com/t1.webp"]);
    assert.deepStrictEqual(normalized.images, ["https://blob.vercel.com/t1.webp"]);
    assert.deepStrictEqual(normalized.variants, []);
  });

  console.log("\n==================================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run();
