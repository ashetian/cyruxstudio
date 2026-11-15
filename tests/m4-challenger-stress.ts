/**
 * cyrux studio - Challenger 1 Empirical Stress Test Harness for Milestone 4
 * Focus: Secure Minimal Admin Panel, Jose JWT Authentication, and Edge Middleware Route Guards
 *
 * Exhaustively stress-tests:
 * 1. JWT verification with tampered signatures, expired tokens (even 1s expired), malformed headers, and "none" alg.
 * 2. Constant-time credential comparison with matching strings, different lengths, identical prefixes, and empty strings.
 * 3. Edge Middleware route guards on /api/admin/* and /admin/* with various unauthenticated, authenticated, and expired states.
 * 4. Vercel Blob URL validation against spoofing, SSRF, path traversal, and MIME/size limits.
 * 5. Admin data validation schemas (Product slug/price/stock and Settings E.164 phone/currency).
 */

import { SignJWT, errors as joseErrors } from "jose";
import { NextRequest } from "next/server";
import crypto from "node:crypto";
import {
  constantTimeCompare,
  verifyAdminCredentials,
  createAdminSessionToken,
  verifyAdminSessionToken,
  verifyAdminSession,
  getJwtSecretKey,
  FALLBACK_JWT_SECRET,
  SESSION_COOKIE_NAME,
} from "../src/lib/auth";
import { middleware } from "../src/middleware";
import {
  validateDeleteUrl,
  ALLOWED_BLOB_MIME_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
} from "../src/lib/blob";
import {
  adminLoginSchema,
  adminProductCreateSchema,
  adminProductUpdateSchema,
  adminSettingsUpdateSchema,
  blobDeleteSchema,
} from "../src/lib/validations";
import { POST as adminLoginHandler } from "../src/app/api/admin/login/route";
import { POST as authLoginHandler } from "../src/app/api/admin/auth/login/route";
import { POST as adminLogoutHandler } from "../src/app/api/admin/logout/route";
import { POST as blobDeleteHandler } from "../src/app/api/admin/blob/delete/route";
import {
  GET as adminProductsGetHandler,
  POST as adminProductsPostHandler,
} from "../src/app/api/admin/products/route";
import {
  GET as adminSettingsGetHandler,
  PUT as adminSettingsPutHandler,
} from "../src/app/api/admin/settings/route";
import prisma from "../src/lib/db";

let totalPassed = 0;
let totalFailed = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${testName}`);
    totalPassed++;
  } else {
    const msg = `✖ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`;
    console.error(`  ${msg}`);
    failures.push(msg);
    totalFailed++;
  }
}

async function runM4ChallengerSuite() {
  console.log("================================================================");
  console.log("   CHALLENGER 1: M4 EMPIRICAL STRESS & ADVERSARIAL SUITE        ");
  console.log("================================================================\n");

  // ============================================================================
  // 1. JWT HANDLING & VERIFICATION ADVERSARIAL STRESS TESTS
  // ============================================================================
  console.log("--- 1. JWT Handling & Verification Adversarial Tests ---");

  // 1.1: Standard valid token issuance and verification
  const validToken = await createAdminSessionToken({
    email: "admin@cyrux.studio",
    sub: "admin",
    role: "admin",
  });
  const validRes = await verifyAdminSessionToken(validToken);
  assert(
    validRes.valid === true &&
      validRes.payload?.sub === "admin" &&
      validRes.payload?.email === "admin@cyrux.studio" &&
      validRes.payload?.role === "admin",
    "1.1 Valid JWT session token issues and verifies cleanly",
    `valid: ${validRes.valid}, sub: ${validRes.payload?.sub}`
  );

  // 1.2: Tampered payload attack (modify payload without re-signing)
  const tokenParts = validToken.split(".");
  const decodedPayload = JSON.parse(
    Buffer.from(tokenParts[1], "base64url").toString("utf8")
  );
  decodedPayload.sub = "attacker_root";
  decodedPayload.email = "hacker@evil.com";
  const tamperedPayloadB64 = Buffer.from(
    JSON.stringify(decodedPayload)
  ).toString("base64url");
  const tamperedPayloadToken = `${tokenParts[0]}.${tamperedPayloadB64}.${tokenParts[2]}`;

  const tamperedPayloadRes = await verifyAdminSessionToken(tamperedPayloadToken);
  assert(
    tamperedPayloadRes.valid === false &&
      (tamperedPayloadRes.error === "Invalid signature" ||
        tamperedPayloadRes.error?.toLowerCase().includes("signature")),
    "1.2 Reject payload tampering (sub altered to attacker_root)",
    `valid: ${tamperedPayloadRes.valid}, error: ${tamperedPayloadRes.error}`
  );

  // 1.3: Tampered signature attack (corrupted signature bits)
  const corruptSigToken = `${tokenParts[0]}.${tokenParts[1]}.${tokenParts[2].slice(0, -4)}XXXX`;
  const corruptSigRes = await verifyAdminSessionToken(corruptSigToken);
  assert(
    corruptSigRes.valid === false &&
      (corruptSigRes.error === "Invalid signature" ||
        corruptSigRes.error?.toLowerCase().includes("signature")),
    "1.3 Reject tampered/corrupted signature bytes",
    `valid: ${corruptSigRes.valid}, error: ${corruptSigRes.error}`
  );

  // 1.4: "none" algorithm attack
  const noneHeaderB64 = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" })
  ).toString("base64url");
  const noneAlgToken = `${noneHeaderB64}.${tokenParts[1]}.`;
  const noneAlgRes = await verifyAdminSessionToken(noneAlgToken);
  assert(
    noneAlgRes.valid === false,
    "1.4 Reject alg: 'none' signature bypass attempt",
    `valid: ${noneAlgRes.valid}, error: ${noneAlgRes.error}`
  );

  // 1.5: Algorithm confusion attack (HS512 or RS256 instead of HS256)
  const hs512HeaderB64 = Buffer.from(
    JSON.stringify({ alg: "HS512", typ: "JWT" })
  ).toString("base64url");
  const hs512Token = `${hs512HeaderB64}.${tokenParts[1]}.${tokenParts[2]}`;
  const hs512Res = await verifyAdminSessionToken(hs512Token);
  assert(
    hs512Res.valid === false,
    "1.5 Reject unexpected algorithm (alg: HS512)",
    `valid: ${hs512Res.valid}, error: ${hs512Res.error}`
  );

  // 1.6: Expired token: exactly 1 second in the past
  const secretKey = getJwtSecretKey();
  const pastExp1Sec = Math.floor(Date.now() / 1000) - 1;
  const expired1SecToken = await new SignJWT({
    sub: "admin",
    email: "admin@cyrux.studio",
    role: "admin",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(pastExp1Sec - 3600)
    .setExpirationTime(pastExp1Sec)
    .sign(secretKey);

  const expired1SecRes = await verifyAdminSessionToken(expired1SecToken);
  assert(
    expired1SecRes.valid === false && expired1SecRes.error === "Token expired",
    "1.6 Reject token expired exactly 1 second ago",
    `valid: ${expired1SecRes.valid}, error: ${expired1SecRes.error}`
  );

  // 1.7: Expired token: 60 seconds in the past
  const pastExp60Sec = Math.floor(Date.now() / 1000) - 60;
  const expired60SecToken = await new SignJWT({
    sub: "admin",
    email: "admin@cyrux.studio",
    role: "admin",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(pastExp60Sec - 3600)
    .setExpirationTime(pastExp60Sec)
    .sign(secretKey);

  const expired60SecRes = await verifyAdminSessionToken(expired60SecToken);
  assert(
    expired60SecRes.valid === false && expired60SecRes.error === "Token expired",
    "1.7 Reject token expired 60 seconds ago",
    `valid: ${expired60SecRes.valid}, error: ${expired60SecRes.error}`
  );

  // 1.8: Token expiring in the near future (e.g. +30 seconds) is valid
  const futureExp = Math.floor(Date.now() / 1000) + 30;
  const futureToken = await new SignJWT({
    sub: "admin",
    email: "admin@cyrux.studio",
    role: "admin",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(futureExp)
    .sign(secretKey);

  const futureRes = await verifyAdminSessionToken(futureToken);
  assert(
    futureRes.valid === true,
    "1.8 Token expiring 30 seconds in future validates successfully",
    `valid: ${futureRes.valid}`
  );

  // 1.9: Malformed header: not valid base64url JSON
  const invalidHeaderToken = `NotBase64Header!.${tokenParts[1]}.${tokenParts[2]}`;
  const invalidHeaderRes = await verifyAdminSessionToken(invalidHeaderToken);
  assert(
    invalidHeaderRes.valid === false,
    "1.9 Reject malformed non-JSON header",
    `valid: ${invalidHeaderRes.valid}, error: ${invalidHeaderRes.error}`
  );

  // 1.10: Malformed token structure: invalid part counts
  const singlePartRes = await verifyAdminSessionToken("single_part_token");
  assert(
    singlePartRes.valid === false &&
      singlePartRes.error === "Malformed token structure",
    "1.10 Reject 1-part token string",
    `error: ${singlePartRes.error}`
  );

  const twoPartsRes = await verifyAdminSessionToken("header.payload");
  assert(
    twoPartsRes.valid === false &&
      twoPartsRes.error === "Malformed token structure",
    "1.11 Reject 2-part token string",
    `error: ${twoPartsRes.error}`
  );

  const fourPartsRes = await verifyAdminSessionToken("part1.part2.part3.part4");
  assert(
    fourPartsRes.valid === false &&
      fourPartsRes.error === "Malformed token structure",
    "1.12 Reject 4-part token string",
    `error: ${fourPartsRes.error}`
  );

  const emptyTokenRes = await verifyAdminSessionToken("");
  assert(
    emptyTokenRes.valid === false &&
      emptyTokenRes.error === "Missing or invalid token format",
    "1.13 Reject empty token string",
    `error: ${emptyTokenRes.error}`
  );

  // 1.14: verifyAdminSession with NextRequest cookie vs Bearer header
  const reqWithCookie = new NextRequest("http://localhost:3000/api/admin/products", {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${validToken}`,
    },
  });
  const sessionCookieRes = await verifyAdminSession(reqWithCookie);
  assert(
    sessionCookieRes.valid === true && sessionCookieRes.payload?.sub === "admin",
    "1.14 verifyAdminSession extracts and validates token from cookie",
    `valid: ${sessionCookieRes.valid}`
  );

  const reqWithBearer = new NextRequest("http://localhost:3000/api/admin/products", {
    headers: {
      authorization: `Bearer ${validToken}`,
    },
  });
  const sessionBearerRes = await verifyAdminSession(reqWithBearer);
  assert(
    sessionBearerRes.valid === true && sessionBearerRes.payload?.sub === "admin",
    "1.15 verifyAdminSession extracts and validates token from Authorization header",
    `valid: ${sessionBearerRes.valid}`
  );

  const reqWithoutAuth = new NextRequest("http://localhost:3000/api/admin/products");
  const sessionEmptyRes = await verifyAdminSession(reqWithoutAuth);
  assert(
    sessionEmptyRes.valid === false && sessionEmptyRes.error === "Unauthorized",
    "1.16 verifyAdminSession returns Unauthorized when neither cookie nor header present",
    `valid: ${sessionEmptyRes.valid}, error: ${sessionEmptyRes.error}`
  );

  // ============================================================================
  // 2. CONSTANT-TIME CREDENTIAL COMPARISON TESTS
  // ============================================================================
  console.log("\n--- 2. Constant-Time Credential Comparison Tests ---");

  // 2.1: Matching strings
  assert(
    constantTimeCompare("secretPass123", "secretPass123") === true,
    "2.1 Identical ASCII strings match"
  );
  assert(
    constantTimeCompare("", "") === true,
    "2.2 Identical empty strings match"
  );
  assert(
    constantTimeCompare("Şifre🔒2026!€", "Şifre🔒2026!€") === true,
    "2.3 Identical UTF-8 multilingual and emoji strings match"
  );
  const largeStringA = "A".repeat(10000);
  const largeStringB = "A".repeat(10000);
  assert(
    constantTimeCompare(largeStringA, largeStringB) === true,
    "2.4 Identical 10,000-character strings match"
  );

  // 2.2: Different lengths
  assert(
    constantTimeCompare("short", "muchLongerString") === false,
    "2.5 Strings of different lengths return false"
  );
  assert(
    constantTimeCompare("admin", "adminPass") === false,
    "2.6 Common prefix with different lengths returns false"
  );
  assert(
    constantTimeCompare("", "nonEmpty") === false,
    "2.7 Empty vs non-empty returns false"
  );
  assert(
    constantTimeCompare("nonEmpty", "") === false,
    "2.8 Non-empty vs empty returns false"
  );

  // 2.3: Identical prefixes with single character divergence
  assert(
    constantTimeCompare("secureAdminPass1", "secureAdminPass2") === false,
    "2.9 Divergence at last character returns false"
  );
  assert(
    constantTimeCompare("1secureAdminPass", "2secureAdminPass") === false,
    "2.10 Divergence at first character returns false"
  );
  assert(
    constantTimeCompare("secureAdmin1Pass", "secureAdmin2Pass") === false,
    "2.11 Divergence at middle character returns false"
  );

  // 2.4: Timing attack resistance simulation (100 permutations of differing suffixes)
  const basePrefix = "MasterSecretPasswordConstantTime_";
  let timingAttackPassed = true;
  for (let i = 0; i < 100; i++) {
    const candidateA = `${basePrefix}${i.toString().padStart(4, "0")}`;
    const candidateB = `${basePrefix}${(i + 1).toString().padStart(4, "0")}`;
    if (constantTimeCompare(candidateA, candidateB) !== false) {
      timingAttackPassed = false;
      break;
    }
  }
  assert(
    timingAttackPassed,
    "2.12 100 permutations with identical 33-char prefix all return false"
  );

  // 2.5: verifyAdminCredentials verification
  const defaultEmail = process.env.ADMIN_EMAIL || "admin@cyrux.studio";
  const defaultPass = process.env.ADMIN_PASSWORD || "AdminSecret2026!";

  assert(
    verifyAdminCredentials(defaultEmail, defaultPass) === true,
    "2.13 verifyAdminCredentials accepts valid credentials"
  );
  assert(
    verifyAdminCredentials(defaultEmail.toUpperCase(), defaultPass) === true,
    "2.14 verifyAdminCredentials is email case-insensitive"
  );
  assert(
    verifyAdminCredentials(`  ${defaultEmail}  `, defaultPass) === true,
    "2.15 verifyAdminCredentials trims email whitespace"
  );
  assert(
    verifyAdminCredentials(defaultEmail, "WrongPassword123!") === false,
    "2.16 verifyAdminCredentials rejects wrong password"
  );
  assert(
    verifyAdminCredentials("wrong@cyrux.studio", defaultPass) === false,
    "2.17 verifyAdminCredentials rejects wrong email"
  );
  assert(
    verifyAdminCredentials(defaultEmail, defaultPass.toLowerCase()) === false,
    "2.18 verifyAdminCredentials is password case-sensitive"
  );
  assert(
    verifyAdminCredentials(defaultEmail, `${defaultPass} `) === false,
    "2.19 verifyAdminCredentials rejects trailing space in password"
  );
  assert(
    verifyAdminCredentials("", defaultPass) === false,
    "2.20 verifyAdminCredentials rejects empty email"
  );
  assert(
    verifyAdminCredentials(defaultEmail, "") === false,
    "2.21 verifyAdminCredentials rejects empty password"
  );

  // ============================================================================
  // 3. EDGE MIDDLEWARE ROUTE GUARDS STRESS TESTS
  // ============================================================================
  console.log("\n--- 3. Edge Middleware Route Guards Stress Tests ---");

  // 3.1: Unauthenticated requests to /api/admin/* routes return HTTP 401 { success: false, error: "Unauthorized" }
  const protectedApiEndpoints = [
    "/api/admin/products",
    "/api/admin/settings",
    "/api/admin/blob/upload",
    "/api/admin/blob/delete",
    "/api/admin/products/item_123",
  ];

  for (const endpoint of protectedApiEndpoints) {
    const req = new NextRequest(`http://localhost:3000${endpoint}`);
    const res = await middleware(req);
    const body = await res.json();
    assert(
      res.status === 401 &&
        body.success === false &&
        body.error === "Unauthorized",
      `3.1 Unauthenticated ${endpoint} returns HTTP 401 Unauthorized`,
      `status: ${res.status}, body: ${JSON.stringify(body)}`
    );
  }

  // 3.2: Unauthenticated requests to /admin/* pages redirect (HTTP 307) to /admin/login
  const unauthAdminReq = new NextRequest("http://localhost:3000/admin");
  const unauthAdminRes = await middleware(unauthAdminReq);
  assert(
    unauthAdminRes.status === 307 &&
      unauthAdminRes.headers.get("location") === "http://localhost:3000/admin/login",
    "3.2 Unauthenticated /admin redirects with HTTP 307 to /admin/login",
    `status: ${unauthAdminRes.status}, location: ${unauthAdminRes.headers.get("location")}`
  );

  const unauthProductsReq = new NextRequest("http://localhost:3000/admin/products");
  const unauthProductsRes = await middleware(unauthProductsReq);
  assert(
    unauthProductsRes.status === 307 &&
      unauthProductsRes.headers.get("location") ===
        "http://localhost:3000/admin/login?redirect=%2Fadmin%2Fproducts",
    "3.3 Unauthenticated /admin/products redirects with HTTP 307 and preserved redirect param",
    `status: ${unauthProductsRes.status}, location: ${unauthProductsRes.headers.get("location")}`
  );

  // 3.3: Public routes allowed through without token
  const publicPaths = [
    "/admin/login",
    "/api/admin/login",
    "/api/admin/auth/login",
  ];
  for (const pubPath of publicPaths) {
    const req = new NextRequest(`http://localhost:3000${pubPath}`);
    const res = await middleware(req);
    assert(
      res.status === 200 && res.headers.get("x-middleware-next") === "1",
      `3.4 Public route ${pubPath} is allowed through without authentication`,
      `status: ${res.status}, x-middleware-next: ${res.headers.get("x-middleware-next")}`
    );
  }

  // 3.4: Authenticated requests via cookie are allowed through
  for (const endpoint of protectedApiEndpoints) {
    const req = new NextRequest(`http://localhost:3000${endpoint}`, {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${validToken}`,
      },
    });
    const res = await middleware(req);
    assert(
      res.status === 200 && res.headers.get("x-middleware-next") === "1",
      `3.5 Authenticated (cookie) request to ${endpoint} is allowed through`,
      `status: ${res.status}`
    );
  }

  // 3.5: Authenticated requests via Authorization: Bearer header are allowed through
  for (const endpoint of ["/api/admin/products", "/api/admin/settings"]) {
    const req = new NextRequest(`http://localhost:3000${endpoint}`, {
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    });
    const res = await middleware(req);
    assert(
      res.status === 200 && res.headers.get("x-middleware-next") === "1",
      `3.6 Authenticated (Bearer) request to ${endpoint} is allowed through`,
      `status: ${res.status}`
    );
  }

  // 3.6: Authenticated request to /admin/login redirects to /admin dashboard
  const authLoginReq = new NextRequest("http://localhost:3000/admin/login", {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${validToken}`,
    },
  });
  const authLoginRes = await middleware(authLoginReq);
  assert(
    authLoginRes.status === 307 ||
      authLoginRes.status === 302 ||
      authLoginRes.headers.get("location")?.endsWith("/admin"),
    "3.7 Authenticated user visiting /admin/login is redirected to /admin dashboard",
    `status: ${authLoginRes.status}, location: ${authLoginRes.headers.get("location")}`
  );

  // 3.7: Expired token in middleware returns 401 on API and 307 on page
  const expiredApiReq = new NextRequest("http://localhost:3000/api/admin/products", {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${expired1SecToken}`,
    },
  });
  const expiredApiRes = await middleware(expiredApiReq);
  assert(
    expiredApiRes.status === 401,
    "3.8 Expired token to /api/admin/products returns HTTP 401",
    `status: ${expiredApiRes.status}`
  );

  const expiredPageReq = new NextRequest("http://localhost:3000/admin/products", {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${expired1SecToken}`,
    },
  });
  const expiredPageRes = await middleware(expiredPageReq);
  assert(
    expiredPageRes.status === 307 &&
      expiredPageRes.headers.get("location")?.includes("/admin/login"),
    "3.9 Expired token to /admin/products redirects to /admin/login",
    `status: ${expiredPageRes.status}`
  );

  // 3.8: Tampered token in middleware returns 401 on API and 307 on page
  const tamperedApiReq = new NextRequest("http://localhost:3000/api/admin/products", {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${tamperedPayloadToken}`,
    },
  });
  const tamperedApiRes = await middleware(tamperedApiReq);
  assert(
    tamperedApiRes.status === 401,
    "3.10 Tampered token to /api/admin/products returns HTTP 401",
    `status: ${tamperedApiRes.status}`
  );

  // 3.9: Non-admin role in valid token (privilege escalation check)
  const userRoleToken = await new SignJWT({
    sub: "customer_123",
    email: "customer@gmail.com",
    role: "customer" as any,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secretKey);

  const userRoleReq = new NextRequest("http://localhost:3000/api/admin/products", {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${userRoleToken}`,
    },
  });
  const userRoleRes = await middleware(userRoleReq);
  assert(
    userRoleRes.status === 401,
    "3.11 Token with non-admin role (role: 'customer') rejected with HTTP 401",
    `status: ${userRoleRes.status}`
  );

  // 3.10: Public storefront routes unaffected by admin middleware
  const storefrontReq = new NextRequest("http://localhost:3000/");
  const storefrontRes = await middleware(storefrontReq);
  assert(
    storefrontRes.headers.get("x-middleware-next") === "1" || storefrontRes.status === 200,
    "3.12 Storefront home / route passes through middleware cleanly"
  );

  // ============================================================================
  // 4. VERCEL BLOB VALIDATION & SECURITY TESTS
  // ============================================================================
  console.log("\n--- 4. Vercel Blob Validation & Security Tests ---");

  // 4.1: Delete URL validation against domain spoofing
  const validBlobUrl = "https://my-store.public.blob.vercel-storage.com/garment-123.webp";
  const validatedDelete = validateDeleteUrl(validBlobUrl);
  assert(
    validatedDelete.url === validBlobUrl && validatedDelete.pathname === "/garment-123.webp",
    "4.1 Accept legitimate *.blob.vercel-storage.com URL for deletion",
    `url: ${validatedDelete.url}`
  );

  const spoofedDomainUrl = "https://my-store.public.blob.vercel-storage.com.evilattacker.com/garment.webp";
  let rejectedSpoof = false;
  try {
    validateDeleteUrl(spoofedDomainUrl);
  } catch (err: any) {
    rejectedSpoof = err.message.includes(".blob.vercel-storage.com");
  }
  assert(
    rejectedSpoof,
    "4.2 Reject spoofed subdomain suffix attack (*.blob.vercel-storage.com.evilattacker.com)"
  );

  const httpInsecureUrl = "http://my-store.public.blob.vercel-storage.com/garment.webp";
  let rejectedInsecure = false;
  try {
    validateDeleteUrl(httpInsecureUrl);
  } catch (err: any) {
    rejectedInsecure = err.message.includes("HTTPS");
  }
  assert(rejectedInsecure, "4.3 Reject non-HTTPS blob URL");

  const pathTraversalUrl = "https://my-store.public.blob.vercel-storage.com/foo/..%2fetc/passwd";
  let rejectedTraversal = false;
  try {
    validateDeleteUrl(pathTraversalUrl);
  } catch (err: any) {
    rejectedTraversal = err.message.includes("Path traversal");
  }
  assert(rejectedTraversal, "4.4 Reject path traversal (..) in blob URL");

  // 4.2: MIME type and size boundaries
  assert(
    ALLOWED_BLOB_MIME_TYPES.includes("image/webp") &&
      ALLOWED_BLOB_MIME_TYPES.includes("image/jpeg") &&
      ALLOWED_BLOB_MIME_TYPES.includes("image/png") &&
      ALLOWED_BLOB_MIME_TYPES.includes("image/avif") &&
      ALLOWED_BLOB_MIME_TYPES.includes("video/mp4") &&
      ALLOWED_BLOB_MIME_TYPES.includes("video/quicktime"),
    "4.5 Whitelist contains required WebP, PNG, JPEG, AVIF, MP4, QuickTime"
  );
  assert(
    !ALLOWED_BLOB_MIME_TYPES.includes("text/html" as any) &&
      !ALLOWED_BLOB_MIME_TYPES.includes("application/javascript" as any) &&
      !ALLOWED_BLOB_MIME_TYPES.includes("application/x-msdownload" as any),
    "4.6 Disallows dangerous executable and script MIME types"
  );

  assert(
    MAX_IMAGE_SIZE === 15 * 1024 * 1024,
    "4.7 Image size ceiling is exactly 15MB (15,728,640 bytes)"
  );
  assert(
    MAX_VIDEO_SIZE === 50 * 1024 * 1024,
    "4.8 Video size ceiling is exactly 50MB (52,428,800 bytes)"
  );

  // ============================================================================
  // 5. ADMIN ZOD VALIDATION SCHEMAS TESTS
  // ============================================================================
  console.log("\n--- 5. Admin Zod Validation Schemas Stress Tests ---");

  // 5.1: Product Create Schema
  const validProduct = {
    name: "CYRUX ARCHIVE VEST",
    slug: "cyrux-archive-vest",
    description: "Brutalist utility vest in heavy nylon canvas.",
    price: 320.0,
    stock: 15,
    variants: [{ name: "Size L", inStock: true }],
    mediaUrls: ["/assets/vest.webp"],
    isBestseller: true,
  };
  const prodParsed = adminProductCreateSchema.safeParse(validProduct);
  assert(prodParsed.success === true, "5.1 adminProductCreateSchema accepts valid product");

  const invalidSlugProd = { ...validProduct, slug: "INVALID SLUG WITH SPACES!" };
  const slugParsed = adminProductCreateSchema.safeParse(invalidSlugProd);
  assert(
    slugParsed.success === false &&
      slugParsed.error.issues.some((i) =>
        i.message.includes("Slug must be URL-safe lowercase with hyphens")
      ),
    "5.2 Reject uppercase and spaces in product slug"
  );

  const zeroPriceProd = { ...validProduct, price: 0 };
  const zeroPriceParsed = adminProductCreateSchema.safeParse(zeroPriceProd);
  assert(
    zeroPriceParsed.success === false &&
      zeroPriceParsed.error.issues.some((i) =>
        i.message.includes("Price must be greater than zero")
      ),
    "5.3 Reject price <= 0 on create"
  );

  const negativeStockProd = { ...validProduct, stock: -5 };
  const negStockParsed = adminProductCreateSchema.safeParse(negativeStockProd);
  assert(
    negStockParsed.success === false,
    "5.4 Reject negative stock count"
  );

  // 5.2: Settings Update Schema
  const validSettings = {
    whatsappNumber: "+905551234567",
    currency: "TRY",
    brandMetadata: { tagline: "Architectural Precision" },
  };
  const settingsParsed = adminSettingsUpdateSchema.safeParse(validSettings);
  assert(
    settingsParsed.success === true,
    "5.5 adminSettingsUpdateSchema accepts valid E.164 phone and TRY currency"
  );

  const nonE164Settings = { ...validSettings, whatsappNumber: "05551234567" }; // Missing + and country code
  const nonE164Parsed = adminSettingsUpdateSchema.safeParse(nonE164Settings);
  assert(
    nonE164Parsed.success === false &&
      nonE164Parsed.error.issues.some((i) =>
        i.message.includes("must be a valid E.164 formatted number starting with +")
      ),
    "5.6 Reject non-E.164 domestic phone format without plus"
  );

  const invalidCurrencySettings = { ...validSettings, currency: "BTC" };
  const currencyParsed = adminSettingsUpdateSchema.safeParse(invalidCurrencySettings);
  assert(
    currencyParsed.success === false &&
      currencyParsed.error.issues.some((i) =>
        i.message.includes("currency must be one of: USD, EUR, TRY, GBP")
      ),
    "5.7 Reject unsupported currency (BTC)"
  );

  // ============================================================================
  // 6. ADMIN API ENDPOINTS DIRECT INTEGRATION & AUTHENTICATION STRESS
  // ============================================================================
  console.log("\n--- 6. Admin API Endpoints Direct Integration & Auth Tests ---");

  // 6.1: POST /api/admin/login with correct credentials sets session cookie
  const loginReq = new NextRequest("http://localhost:3000/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: defaultEmail,
      password: defaultPass,
    }),
  });
  const loginRes = await adminLoginHandler(loginReq);
  const loginData = await loginRes.json();
  const setCookieHeader = loginRes.headers.get("set-cookie") || "";
  assert(
    loginRes.status === 200 &&
      loginData.success === true &&
      setCookieHeader.includes(SESSION_COOKIE_NAME) &&
      setCookieHeader.toLowerCase().includes("httponly"),
    "6.1 POST /api/admin/login issues HttpOnly session cookie on successful auth",
    `status: ${loginRes.status}, cookie: ${setCookieHeader.slice(0, 50)}...`
  );

  // 6.2: POST /api/admin/login with invalid password returns 401
  const badLoginReq = new NextRequest("http://localhost:3000/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: defaultEmail,
      password: "WrongPassword123!",
    }),
  });
  const badLoginRes = await adminLoginHandler(badLoginReq);
  const badLoginData = await badLoginRes.json();
  assert(
    badLoginRes.status === 401 && badLoginData.success === false,
    "6.2 POST /api/admin/login rejects incorrect password with HTTP 401",
    `status: ${badLoginRes.status}, error: ${badLoginData.error}`
  );

  // 6.3: POST /api/admin/auth/login re-exported endpoint works identically
  const authLoginReq2 = new NextRequest("http://localhost:3000/api/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: defaultEmail,
      password: defaultPass,
    }),
  });
  const authLoginRes2 = await authLoginHandler(authLoginReq2);
  assert(
    authLoginRes2.status === 200,
    "6.3 POST /api/admin/auth/login works identically to /api/admin/login",
    `status: ${authLoginRes2.status}`
  );

  // 6.4: POST /api/admin/logout clears session cookie
  const logoutRes = await adminLogoutHandler();
  const logoutCookie = logoutRes.headers.get("set-cookie") || "";
  assert(
    logoutRes.status === 200 &&
      logoutCookie.includes(SESSION_COOKIE_NAME) &&
      (logoutCookie.includes("Max-Age=0") || logoutCookie.includes("max-age=0")),
    "6.4 POST /api/admin/logout sets cookie Max-Age=0 to invalidate session",
    `status: ${logoutRes.status}, cookie: ${logoutCookie}`
  );

  // 6.5: POST /api/admin/blob/delete enforces defense-in-depth auth check
  const unauthBlobReq = new NextRequest("http://localhost:3000/api/admin/blob/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: validBlobUrl }),
  });
  const unauthBlobRes = await blobDeleteHandler(unauthBlobReq);
  assert(
    unauthBlobRes.status === 401,
    "6.5 POST /api/admin/blob/delete handler directly rejects unauthenticated calls with 401",
    `status: ${unauthBlobRes.status}`
  );

  const authBlobReq = new NextRequest("http://localhost:3000/api/admin/blob/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `${SESSION_COOKIE_NAME}=${validToken}`,
    },
    body: JSON.stringify({ url: validBlobUrl }),
  });
  const authBlobRes = await blobDeleteHandler(authBlobReq);
  assert(
    authBlobRes.status === 200,
    "6.6 POST /api/admin/blob/delete succeeds when called with valid admin session",
    `status: ${authBlobRes.status}`
  );

  // 6.7: POST /api/admin/products enforces uniqueness on slug
  const testSlug = "test-drop-" + Date.now();
  const newProductPayload = {
    name: "CYRUX EXPERIMENTAL TEE",
    slug: testSlug,
    description: "Stress test garment.",
    price: 150.0,
    stock: 10,
    variants: [{ name: "Standard", inStock: true }],
    mediaUrls: ["/assets/test.webp"],
    isBestseller: true,
  };

  const createProdReq1 = new NextRequest("http://localhost:3000/api/admin/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `${SESSION_COOKIE_NAME}=${validToken}`,
    },
    body: JSON.stringify(newProductPayload),
  });
  const createProdRes1 = await adminProductsPostHandler(createProdReq1);
  assert(
    createProdRes1.status === 201,
    "6.7 POST /api/admin/products creates valid product drop",
    `status: ${createProdRes1.status}`
  );

  // Attempt duplicate slug creation -> HTTP 409
  const createProdReq2 = new NextRequest("http://localhost:3000/api/admin/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `${SESSION_COOKIE_NAME}=${validToken}`,
    },
    body: JSON.stringify(newProductPayload),
  });
  const createProdRes2 = await adminProductsPostHandler(createProdReq2);
  const dupData = await createProdRes2.json();
  assert(
    createProdRes2.status === 409 && dupData.error?.includes("already exists"),
    "6.8 POST /api/admin/products rejects duplicate slug with HTTP 409",
    `status: ${createProdRes2.status}, error: ${dupData.error}`
  );

  // Clean up test product
  await prisma.product.deleteMany({ where: { slug: testSlug } });

  // 6.9: PUT /api/admin/settings updates settings successfully
  const updateSettingsReq = new NextRequest("http://localhost:3000/api/admin/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      cookie: `${SESSION_COOKIE_NAME}=${validToken}`,
    },
    body: JSON.stringify({
      whatsappNumber: "+905321234567",
      currency: "EUR",
      storeName: "cyrux studio atelier",
    }),
  });
  const updateSettingsRes = await adminSettingsPutHandler(updateSettingsReq);
  const updateSettingsData = await updateSettingsRes.json();
  assert(
    updateSettingsRes.status === 200 &&
      updateSettingsData.settings?.whatsappNumber === "+905321234567" &&
      updateSettingsData.settings?.currency === "EUR",
    "6.9 PUT /api/admin/settings updates whatsappNumber and currency",
    `status: ${updateSettingsRes.status}, currency: ${updateSettingsData.settings?.currency}`
  );

  // Restore default settings
  await prisma.storeSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      whatsappNumber: "+905550000000",
      currency: "USD",
      brandMetadata: {},
    },
    update: {
      whatsappNumber: "+905550000000",
      currency: "USD",
    },
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n================================================================");
  console.log(`TOTAL M4 CHALLENGER ASSERTIONS: ${totalPassed + totalFailed}`);
  console.log(`PASSED: ${totalPassed}`);
  console.log(`FAILED: ${totalFailed}`);
  console.log("================================================================");

  if (totalFailed > 0) {
    console.error("\nFAILED ASSERTIONS:");
    failures.forEach((f) => console.error("  " + f));
    process.exit(1);
  }
}

runM4ChallengerSuite().catch((err) => {
  console.error("FATAL UNCAUGHT ERROR IN M4 CHALLENGER SUITE:", err);
  process.exit(1);
});
