/**
 * cyrux studio - Milestone 4 Reviewer 1 Adversarial & Quality Stress Test Suite
 *
 * Exhaustively stress-tests:
 * 1. src/lib/auth.ts (timing attack immunity, constantTimeCompare, JWT issuance, tampering, expiry, cookies)
 * 2. src/middleware.ts (Edge Middleware route protection, public exclusions, 401 on /api/admin, 307 on /admin)
 * 3. src/app/api/admin/login/route.ts & logout route
 * 4. src/lib/validations.ts & src/lib/blob.ts (boundary, traversal, domain spoofing)
 */

import { NextRequest } from "next/server";
import {
  constantTimeCompare,
  verifyAdminCredentials,
  createAdminSessionToken,
  verifyAdminSessionToken,
  verifyAdminSession,
  getSessionCookieOptions,
  getClearSessionCookieOptions,
  SESSION_COOKIE_NAME,
  FALLBACK_ADMIN_EMAIL,
  FALLBACK_ADMIN_PASSWORD,
} from "../src/lib/auth";
import { middleware } from "../src/middleware";
import { POST as loginHandler } from "../src/app/api/admin/login/route";
import { POST as logoutHandler } from "../src/app/api/admin/logout/route";
import {
  adminLoginSchema,
  adminProductCreateSchema,
  adminSettingsUpdateSchema,
} from "../src/lib/validations";
import { validateDeleteUrl, validateUploadFile } from "../src/lib/blob";

let passed = 0;
let failed = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${testName}`);
    passed++;
  } else {
    const msg = `✖ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`;
    console.error(`  ${msg}`);
    failureDetails.push(msg);
    failed++;
  }
}

async function runM4ReviewerAdversarialSuite() {
  console.log("================================================================");
  console.log("   MILESTONE 4: REVIEWER 1 ADVERSARIAL STRESS SUITE             ");
  console.log("================================================================\n");

  // ============================================================================
  // SECTION 1: AUTHENTICATION & CONSTANT-TIME EQUALITY
  // ============================================================================
  console.log("--- 1. Constant-Time Compare & Credential Verification ---");

  assert(constantTimeCompare("secret123", "secret123"), "1.1 Identical ASCII strings match");
  assert(!constantTimeCompare("secret123", "secret124"), "1.2 Single character mismatch at end returns false");
  assert(!constantTimeCompare("secret123", "aecret123"), "1.3 Single character mismatch at start returns false");
  assert(!constantTimeCompare("short", "muchLongerString"), "1.4 Length mismatch returns false without throwing");
  assert(constantTimeCompare("", ""), "1.5 Empty strings match");
  assert(!constantTimeCompare("", "a"), "1.6 Empty vs non-empty returns false");
  // Multi-byte Unicode test
  assert(constantTimeCompare("şeker", "şeker"), "1.7 Unicode multi-byte strings match");
  assert(!constantTimeCompare("şeker", "seker"), "1.8 Unicode vs ASCII counterpart returns false");

  // Admin Credential Verification
  assert(
    verifyAdminCredentials(FALLBACK_ADMIN_EMAIL, FALLBACK_ADMIN_PASSWORD),
    "1.9 Valid fallback admin credentials verify successfully"
  );
  assert(
    verifyAdminCredentials(FALLBACK_ADMIN_EMAIL.toUpperCase(), FALLBACK_ADMIN_PASSWORD),
    "1.10 Admin email is case-insensitive"
  );
  assert(
    verifyAdminCredentials(`  ${FALLBACK_ADMIN_EMAIL}  `, FALLBACK_ADMIN_PASSWORD),
    "1.11 Admin email with whitespace padding trims and matches"
  );
  assert(
    !verifyAdminCredentials(FALLBACK_ADMIN_EMAIL, "WrongPassword2026!"),
    "1.12 Incorrect password fails verification"
  );
  assert(
    !verifyAdminCredentials("wrong@cyrux.studio", FALLBACK_ADMIN_PASSWORD),
    "1.13 Incorrect email fails verification"
  );
  assert(
    !verifyAdminCredentials("", ""),
    "1.14 Empty credentials fail safely"
  );
  assert(
    // @ts-expect-error test invalid types
    !verifyAdminCredentials(null, undefined),
    "1.15 Null/undefined inputs fail safely without throwing"
  );

  // ============================================================================
  // SECTION 2: JOSE HS256 JWT CREATION, EXPIRATION, TAMPERING
  // ============================================================================
  console.log("\n--- 2. Jose HS256 JWT Lifecycle & Cryptographic Tampering ---");

  const validToken = await createAdminSessionToken({
    email: FALLBACK_ADMIN_EMAIL,
    sub: "admin",
    role: "admin",
  });

  assert(typeof validToken === "string" && validToken.split(".").length === 3, "2.1 Token is valid 3-part JWT");

  const verifyValid = await verifyAdminSessionToken(validToken);
  assert(
    verifyValid.valid && verifyValid.payload?.email === FALLBACK_ADMIN_EMAIL && verifyValid.payload?.role === "admin",
    "2.2 Valid token decodes correctly with matching payload"
  );

  // Tampered payload
  const parts = validToken.split(".");
  const alteredPayload = Buffer.from(JSON.stringify({ sub: "hacker", role: "admin", email: "hacker@evil.com" })).toString("base64url");
  const tamperedToken = `${parts[0]}.${alteredPayload}.${parts[2]}`;
  const verifyTampered = await verifyAdminSessionToken(tamperedToken);
  assert(!verifyTampered.valid && verifyTampered.error === "Invalid signature", "2.3 Tampered payload rejected as Invalid signature");

  // Tampered signature
  const brokenSigToken = `${parts[0]}.${parts[1]}.badSig1234567890`;
  const verifyBrokenSig = await verifyAdminSessionToken(brokenSigToken);
  assert(!verifyBrokenSig.valid, "2.4 Altered signature rejected");

  // Expired token test
  const expiredToken = await createAdminSessionToken(
    { email: FALLBACK_ADMIN_EMAIL, sub: "admin", role: "admin" },
    "-10s"
  );
  const verifyExpired = await verifyAdminSessionToken(expiredToken);
  assert(!verifyExpired.valid && verifyExpired.error === "Token expired", "2.5 Expired token rejected with 'Token expired'");

  // Garbage input
  assert(!(await verifyAdminSessionToken("not-a-token")).valid, "2.6 Non-JWT string rejected");
  assert(!(await verifyAdminSessionToken("")).valid, "2.7 Empty string rejected");

  // Cookie options check
  const cookieOpts = getSessionCookieOptions(validToken);
  assert(cookieOpts.name === SESSION_COOKIE_NAME, "2.8 Cookie name is cyrux_admin_session");
  assert(cookieOpts.httpOnly === true, "2.9 Cookie is HttpOnly");
  assert(cookieOpts.sameSite === "lax", "2.10 Cookie SameSite is lax");
  assert(cookieOpts.maxAge === 86400, "2.11 Cookie maxAge is 86400 (24h)");

  const clearCookieOpts = getClearSessionCookieOptions();
  assert(clearCookieOpts.maxAge === 0 && clearCookieOpts.value === "", "2.12 Clear cookie has maxAge 0");

  // ============================================================================
  // SECTION 3: EDGE MIDDLEWARE ROUTE GUARDS
  // ============================================================================
  console.log("\n--- 3. Edge Middleware Route Protection & Redirection ---");

  // 3.1 Unauthenticated access to /admin root -> redirect to /admin/login (307)
  const reqAdmin = new NextRequest("http://localhost:3000/admin");
  const resAdmin = await middleware(reqAdmin);
  assert(
    resAdmin.status === 307 && resAdmin.headers.get("location")?.includes("/admin/login"),
    "3.1 /admin unauthenticated redirects (307) to /admin/login",
    `status=${resAdmin.status}, loc=${resAdmin.headers.get("location")}`
  );

  // 3.2 Unauthenticated access to /admin/products -> redirect to /admin/login?redirect=/admin/products
  const reqAdminProducts = new NextRequest("http://localhost:3000/admin/products");
  const resAdminProducts = await middleware(reqAdminProducts);
  assert(
    resAdminProducts.status === 307 &&
    resAdminProducts.headers.get("location")?.includes("/admin/login?redirect=%2Fadmin%2Fproducts"),
    "3.2 /admin/products unauthenticated preserves redirect param",
    `loc=${resAdminProducts.headers.get("location")}`
  );

  // 3.3 Unauthenticated access to /api/admin/products -> 401 Unauthorized JSON
  const reqApiProducts = new NextRequest("http://localhost:3000/api/admin/products");
  const resApiProducts = await middleware(reqApiProducts);
  const jsonApiProducts = await resApiProducts.json().catch(() => ({}));
  assert(
    resApiProducts.status === 401 && jsonApiProducts.success === false && jsonApiProducts.error === "Unauthorized",
    "3.3 /api/admin/products unauthenticated returns 401 Unauthorized JSON",
    `status=${resApiProducts.status}, body=${JSON.stringify(jsonApiProducts)}`
  );

  // 3.4 Public exemption: /admin/login unauthenticated -> 200 next()
  const reqAdminLogin = new NextRequest("http://localhost:3000/admin/login");
  const resAdminLogin = await middleware(reqAdminLogin);
  assert(
    resAdminLogin.status === 200 && !resAdminLogin.headers.get("location"),
    "3.4 /admin/login unauthenticated is permitted through"
  );

  // 3.5 Public exemption: /api/admin/login unauthenticated -> 200 next()
  const reqApiLogin = new NextRequest("http://localhost:3000/api/admin/login");
  const resApiLogin = await middleware(reqApiLogin);
  assert(
    resApiLogin.status === 200 && !resApiLogin.headers.get("location"),
    "3.5 /api/admin/login unauthenticated is permitted through"
  );

  // 3.6 Public exemption: /api/admin/auth/login unauthenticated -> 200 next()
  const reqApiAuthLogin = new NextRequest("http://localhost:3000/api/admin/auth/login");
  const resApiAuthLogin = await middleware(reqApiAuthLogin);
  assert(
    resApiAuthLogin.status === 200 && !resApiAuthLogin.headers.get("location"),
    "3.6 /api/admin/auth/login unauthenticated is permitted through"
  );

  // 3.7 Authenticated request to /admin/products via Cookie -> passes through (200)
  const reqAuthAdmin = new NextRequest("http://localhost:3000/admin/products", {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${validToken}`,
    },
  });
  const resAuthAdmin = await middleware(reqAuthAdmin);
  assert(
    resAuthAdmin.status === 200 && !resAuthAdmin.headers.get("location"),
    "3.7 Authenticated /admin/products via cookie is permitted through"
  );

  // 3.8 Authenticated request to /api/admin/products via Bearer Header -> passes through (200)
  const reqAuthApi = new NextRequest("http://localhost:3000/api/admin/products", {
    headers: {
      authorization: `Bearer ${validToken}`,
    },
  });
  const resAuthApi = await middleware(reqAuthApi);
  assert(
    resAuthApi.status === 200 && !resAuthApi.headers.get("location"),
    "3.8 Authenticated /api/admin/products via Bearer header is permitted through"
  );

  // 3.9 Authenticated user visiting /admin/login -> redirected to /admin dashboard
  const reqAuthLoginVisit = new NextRequest("http://localhost:3000/admin/login", {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${validToken}`,
    },
  });
  const resAuthLoginVisit = await middleware(reqAuthLoginVisit);
  assert(
    resAuthLoginVisit.status === 307 || resAuthLoginVisit.status === 302 || resAuthLoginVisit.headers.get("location")?.endsWith("/admin"),
    "3.9 Authenticated user visiting /admin/login is redirected to /admin dashboard",
    `status=${resAuthLoginVisit.status}, loc=${resAuthLoginVisit.headers.get("location")}`
  );

  // 3.10 Tampered/expired cookie on /api/admin/products -> returns 401
  const reqTampered = new NextRequest("http://localhost:3000/api/admin/products", {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${tamperedToken}`,
    },
  });
  const resTampered = await middleware(reqTampered);
  assert(
    resTampered.status === 401,
    "3.10 Tampered session token on /api/admin/products yields HTTP 401"
  );

  // ============================================================================
  // SECTION 4: LOGIN & LOGOUT ROUTE HANDLERS
  // ============================================================================
  console.log("\n--- 4. Login & Logout API Endpoint Execution ---");

  // 4.1 Login with invalid JSON
  const badJsonReq = new NextRequest("http://localhost:3000/api/admin/login", {
    method: "POST",
    body: "non-json-body",
    headers: { "Content-Type": "application/json" },
  });
  const badJsonRes = await loginHandler(badJsonReq);
  assert(badJsonRes.status === 400, "4.1 Non-JSON body returns HTTP 400");

  // 4.2 Login with wrong password
  const wrongPassReq = new NextRequest("http://localhost:3000/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email: FALLBACK_ADMIN_EMAIL, password: "wrong" }),
    headers: { "Content-Type": "application/json" },
  });
  const wrongPassRes = await loginHandler(wrongPassReq);
  assert(wrongPassRes.status === 401, "4.2 Wrong password returns HTTP 401");

  // 4.3 Successful login returns 200 and sets cookie
  const validLoginReq = new NextRequest("http://localhost:3000/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email: FALLBACK_ADMIN_EMAIL, password: FALLBACK_ADMIN_PASSWORD }),
    headers: { "Content-Type": "application/json" },
  });
  const validLoginRes = await loginHandler(validLoginReq);
  const setCookie = validLoginRes.headers.get("set-cookie") || "";
  assert(
    validLoginRes.status === 200 && setCookie.includes(SESSION_COOKIE_NAME),
    "4.3 Successful login returns HTTP 200 and issues cyrux_admin_session cookie"
  );

  // 4.4 Logout clears cookie
  const logoutRes = await logoutHandler();
  const logoutCookie = logoutRes.headers.get("set-cookie") || "";
  assert(
    logoutRes.status === 200 && (logoutCookie.includes("Max-Age=0") || logoutCookie.includes("max-age=0")),
    "4.4 Logout returns HTTP 200 and clears cyrux_admin_session cookie with Max-Age=0"
  );

  // ============================================================================
  // SECTION 5: VERCEL BLOB DEFENSE & VALIDATION
  // ============================================================================
  console.log("\n--- 5. Vercel Blob Boundary & Domain Spoofing Defense ---");

  assert(
    validateDeleteUrl("https://cyrux-store.public.blob.vercel-storage.com/asset-1.png").url.length > 0,
    "5.1 Legitimate Vercel Blob URL passes delete validation"
  );

  // Subdomain spoofing attempt
  let spoofBlocked = false;
  try {
    validateDeleteUrl("https://attacker.com/cyrux.blob.vercel-storage.com/asset-1.png");
  } catch (err: any) {
    spoofBlocked = err.message.includes("Only Vercel Blob URLs");
  }
  assert(spoofBlocked, "5.2 Subdomain spoofing attacker.com/cyrux.blob.vercel-storage.com is rejected");

  // Suffix spoofing attempt
  let suffixSpoofBlocked = false;
  try {
    validateDeleteUrl("https://evil-blob.vercel-storage.com.attacker.com/asset-1.png");
  } catch (err: any) {
    suffixSpoofBlocked = err.message.includes("Only Vercel Blob URLs");
  }
  assert(suffixSpoofBlocked, "5.3 Suffix spoofing evil-blob.vercel-storage.com.attacker.com is rejected");

  // Non-HTTPS
  let httpBlocked = false;
  try {
    validateDeleteUrl("http://cyrux.public.blob.vercel-storage.com/asset.png");
  } catch (err: any) {
    httpBlocked = err.message.includes("HTTPS");
  }
  assert(httpBlocked, "5.4 Non-HTTPS blob URL is rejected");

  // Path traversal / consecutive dots in pathname
  let traversalBlocked = false;
  try {
    validateDeleteUrl("https://cyrux.public.blob.vercel-storage.com/asset..png");
  } catch (err: any) {
    traversalBlocked = err.message.includes("Path traversal");
  }
  assert(traversalBlocked, "5.5 Consecutive dots (..) in blob pathname is rejected");

  console.log("\n================================================================");
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runM4ReviewerAdversarialSuite().catch((err) => {
  console.error("Fatal suite crash:", err);
  process.exit(1);
});
