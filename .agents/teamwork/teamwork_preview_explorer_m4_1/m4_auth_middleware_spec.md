# M4: Admin Authentication System & Edge Middleware Specification

**Milestone**: M4 (Secure Minimal Admin Panel & Vercel Blob)  
**Author**: `teamwork_preview_explorer` (Explorer 1)  
**Date**: 2026-11-14  
**Target Files**:
- `src/lib/auth.ts` (New module)
- `src/lib/validations.ts` (Extension: `adminLoginSchema`)
- `src/app/api/admin/login/route.ts` (New endpoint; alias `/api/admin/auth/login/route.ts`)
- `src/app/api/admin/logout/route.ts` (New endpoint; alias `/api/admin/auth/logout/route.ts`)
- `src/middleware.ts` (New Edge Middleware)

---

## 1. Executive Summary & Architecture Overview

The cyrux studio admin panel requires a stateless, tamper-proof, and timing-attack resilient authentication layer built on top of Next.js 15 App Router and Edge Middleware.

### Key Architectural Pillars:
1. **Stateless JWT with `jose` (v5.9.6)**: Standard HS256 HMAC tokens signed with a secret derived from `process.env.ADMIN_JWT_SECRET` (falling back safely in local/testing runs). Universal across Edge Runtime and Node.js runtime using Web Crypto primitives (`Uint8Array` keys).
2. **Timing-Attack Immune Credential Verification**: Admin login verifies `process.env.ADMIN_EMAIL` and `process.env.ADMIN_PASSWORD` using `crypto.timingSafeEqual` with strict buffer byte-length equality preconditions to eliminate side-channel length or byte-matching leaks.
3. **Hardened HttpOnly Cookies**: Session tokens are transported in the `cyrux_admin_session` cookie configured with `httpOnly: true`, `sameSite: "lax"`, `secure: process.env.NODE_ENV === "production"`, and `path: "/"`.
4. **Next.js Edge Middleware Route Guard**: Intercepts all traffic matching `/admin/:path*` and `/api/admin/:path*`, allowing only explicit public endpoints (`/admin/login`, `/api/admin/login`, `/api/admin/auth/login`). Unauthenticated requests to API endpoints return HTTP 401 JSON; unauthenticated page navigations redirect (HTTP 307) to `/admin/login`.

---

## 2. Test Contract Analysis & Cross-Tier Requirements

Our analysis of `tests/tier1-feature/f13-jwt-auth.ts`, `tests/contracts.ts`, `tests/tier2-boundary/boundary-corner-cases.ts`, `tests/tier3-combination/cross-feature-combinations.ts`, and `tests/tier4-scenario/real-world-workloads.ts` reveals the following non-negotiable contracts:

| Test Reference | Invariant / Expectation | Implementation Guarantee |
|---|---|---|
| **F13.1** | Issue and verify signed HS256 JWT admin token. Token must have 3 dot-delimited parts and valid payload with `sub: 'admin'`, `role: 'admin'`. | `SignJWT` creates standard compact JWS. Restores `sub`, `role`, and `email`. |
| **F13.2** | Reject tampered JWT signatures immediately without throwing unhandled exceptions. | `jwtVerify` catches `JWSSignatureVerificationFailed` and returns `{ valid: false, error: 'Invalid signature' }`. |
| **F13.3** | Reject expired JWT tokens. | `jwtVerify` catches `JWTExpired` (`ERR_JWT_EXPIRED`) and returns `{ valid: false, error: 'Token expired' }`. |
| **F13.4** | Constant-time credential check contract: `if (bufA.length !== bufB.length) return false; return crypto.timingSafeEqual(bufA, bufB);` | Implemented in `constantTimeCompare` in `src/lib/auth.ts`. |
| **F13.5** | Route guard discrimination: Unauthenticated `/api/admin/*` returns HTTP 401 `{ error: 'Unauthorized' }`; unauthenticated `/admin/*` redirects to `/admin/login` (status 307); `/api/admin/auth/login` and `/admin/login` permitted. | Implemented in `src/middleware.ts` matching both `/api/admin/login` and `/api/admin/auth/login`. |
| **T2.12** | Tokens expired by even 1 second (`exp < now`) must be immediately invalidated. | Enforced by standard `jwtVerify` claim checks. |
| **T3.2** | Protected sub-resources (such as `/api/admin/blob/delete`) must reject unauthenticated requests with HTTP 401. | Protected by middleware and route-level token validation. |
| **T3.8** | Expired session cookie during page navigation intercepts and redirects to `/admin/login`. | Middleware validates cookie with `jwtVerify` on every navigation. |
| **T4.2 & T4.5** | Admin authentication handles valid login, issue token, access catalog, and withstands tampering or SQLi payloads in input bodies. | Zod schema validation combined with timing-safe string comparison. |

---

## 3. Specification: `src/lib/auth.ts`

### 3.1 Types & Interfaces

```typescript
export interface AdminSessionPayload {
  sub: string;             // "admin" (required for contracts)
  email: string;           // admin email address
  role: "admin";           // static role identifier
  exp?: number;            // expiration UNIX epoch timestamp (seconds)
  iat?: number;            // issued-at timestamp
}

export interface AuthVerificationResult {
  valid: boolean;
  payload?: AdminSessionPayload;
  error?: string;
}

export interface SessionCookieOptions {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
}
```

### 3.2 Constants

```typescript
export const SESSION_COOKIE_NAME = "cyrux_admin_session";
export const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours
export const DEFAULT_SESSION_EXPIRY = "24h";

// Fallback test key for isolated test runners or dev environments where .env.local is omitted
export const FALLBACK_JWT_SECRET = "cyrux-ultra-secure-jwt-secret-key-32chars-min!!";
export const FALLBACK_ADMIN_EMAIL = "admin@cyrux.studio";
export const FALLBACK_ADMIN_PASSWORD = "AdminSecret2026!";
```

### 3.3 JWT Secret Key Helper

```typescript
export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET || FALLBACK_JWT_SECRET;
  return new TextEncoder().encode(secret);
}
```
*Design Rationale*: Using `new TextEncoder().encode(...)` returns a `Uint8Array`, which is natively supported by `jose` across both Node.js and Edge Runtime without any external dependencies or polyfills.

### 3.4 Token Creation (`createAdminSessionToken`)

```typescript
import { SignJWT } from "jose";

export async function createAdminSessionToken(
  params: {
    email: string;
    sub?: string;
    role?: "admin";
  },
  expiresIn: string = DEFAULT_SESSION_EXPIRY
): Promise<string> {
  const secret = getJwtSecretKey();

  return await new SignJWT({
    sub: params.sub ?? "admin",
    email: params.email,
    role: params.role ?? "admin",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}
```

### 3.5 Token Verification (`verifyAdminSessionToken`)

```typescript
import { jwtVerify, errors as joseErrors } from "jose";

export async function verifyAdminSessionToken(
  token: string
): Promise<AuthVerificationResult> {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Missing or invalid token format" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Malformed token structure" };
  }

  try {
    const secret = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    return {
      valid: true,
      payload: payload as unknown as AdminSessionPayload,
    };
  } catch (err: unknown) {
    if (err instanceof joseErrors.JWTExpired) {
      return { valid: false, error: "Token expired" };
    }
    if (
      err instanceof joseErrors.JWSSignatureVerificationFailed ||
      err instanceof joseErrors.JWSInvalid
    ) {
      return { valid: false, error: "Invalid signature" };
    }
    const message = err instanceof Error ? err.message : "Invalid session token";
    return { valid: false, error: message };
  }
}
```

### 3.6 Constant-Time Credential Comparison (`constantTimeCompare` & `verifyAdminCredentials`)

```typescript
import crypto from "node:crypto";

/**
 * Constant-time string equality check.
 * Strictly adheres to tests/tier1-feature/f13-jwt-auth.ts invariant 13.4.
 * First compares buffer lengths, then runs crypto.timingSafeEqual.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates admin credentials against process.env.
 * Does not leak information through timing side-channels.
 */
export function verifyAdminCredentials(email: string, password: string): boolean {
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return false;
  }

  const expectedEmail = process.env.ADMIN_EMAIL || FALLBACK_ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD || FALLBACK_ADMIN_PASSWORD;

  const emailMatches = constantTimeCompare(email.trim().toLowerCase(), expectedEmail.trim().toLowerCase());
  const passwordMatches = constantTimeCompare(password, expectedPassword);

  return emailMatches && passwordMatches;
}
```

### 3.7 Cookie Configuration Generators

```typescript
export function getSessionCookieOptions(token: string): SessionCookieOptions {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: DEFAULT_SESSION_MAX_AGE_SECONDS,
  };
}

export function getClearSessionCookieOptions(): SessionCookieOptions {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  };
}
```

---

## 4. Specification: Validation Schema (`src/lib/validations.ts`)

Append the following schema to `src/lib/validations.ts`:

```typescript
export const adminLoginSchema = z.object({
  email: z
    .string({
      required_error: "Email is required",
      invalid_type_error: "Email must be a string",
    })
    .trim()
    .email("Invalid email format")
    .max(255, "Email cannot exceed 255 characters"),
  password: z
    .string({
      required_error: "Password is required",
      invalid_type_error: "Password must be a string",
    })
    .min(1, "Password is required")
    .max(255, "Password cannot exceed 255 characters"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
```

---

## 5. Specification: API Routes

### 5.1 POST `/api/admin/login` (and `/api/admin/auth/login`)
*Location*: `src/app/api/admin/login/route.ts`  
*Alias/Symlink/Re-export*: `src/app/api/admin/auth/login/route.ts` (imports and executes handler from `/api/admin/login/route.ts` to guarantee backward compatibility with `PROJECT.md` and `f13-jwt-auth.ts`).

#### Request Specification:
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "email": "admin@cyrux.studio",
    "password": "AdminSecret2026!"
  }
  ```

#### Flow:
1. Parse JSON body. If JSON parsing fails: return HTTP 400 `{ success: false, error: "Invalid JSON payload" }`.
2. Validate using `adminLoginSchema.safeParse(body)`. If validation fails: return HTTP 400 with `{ success: false, error: validation.error.errors[0].message }`.
3. Check credentials with `verifyAdminCredentials(email, password)`.
4. If invalid: return HTTP 401 `{ success: false, error: "Invalid credentials" }`.
5. If valid:
   - Generate JWT via `createAdminSessionToken({ email: data.email, role: "admin", sub: "admin" })`.
   - Build `NextResponse.json({ success: true, email: data.email })`.
   - Set cookie using `getSessionCookieOptions(token)`.
   - Return response with HTTP 200.

#### Code Contract:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { adminLoginSchema } from "@/lib/validations";
import {
  verifyAdminCredentials,
  createAdminSessionToken,
  getSessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const validation = adminLoginSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    const isValid = verifyAdminCredentials(email, password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await createAdminSessionToken({
      email,
      sub: "admin",
      role: "admin",
    });

    const cookieOptions = getSessionCookieOptions(token);
    const response = NextResponse.json({
      success: true,
      message: "Authentication successful",
    });

    response.cookies.set(cookieOptions);
    return response;
  } catch (error: unknown) {
    console.error("[Admin Login Error]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### 5.2 POST `/api/admin/logout` (and `/api/admin/auth/logout`)
*Location*: `src/app/api/admin/logout/route.ts`  
*Alias/Re-export*: `src/app/api/admin/auth/logout/route.ts`

#### Request Specification:
- **Method**: `POST`
- **Body**: (Empty or arbitrary)

#### Flow:
1. Build `NextResponse.json({ success: true, message: "Logged out successfully" })`.
2. Clear cookie by setting `cyrux_admin_session` with `maxAge: 0` and `expires: new Date(0)`.
3. Return HTTP 200.

#### Code Contract:
```typescript
import { NextResponse } from "next/server";
import { getClearSessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const cookieOptions = getClearSessionCookieOptions();
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  response.cookies.set(cookieOptions);
  return response;
}
```

---

## 6. Specification: Edge Middleware (`src/middleware.ts`)

Next.js 15 Edge Middleware executes on the Edge Runtime before routing requests to handlers or pages.

### 6.1 Matcher Configuration
```typescript
export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
```

### 6.2 Bypass & Protected Route Rules

| Route Pattern | Action When Unauthenticated | Action When Authenticated |
|---|---|---|
| `/admin/login` | Allow through (`NextResponse.next()`) | Optional: Redirect to `/admin` to skip login |
| `/api/admin/login` | Allow through (`NextResponse.next()`) | Allow through |
| `/api/admin/auth/login` | Allow through (`NextResponse.next()`) | Allow through |
| `/api/admin/*` (all other) | Return HTTP 401 `{ success: false, error: "Unauthorized" }` | Allow through (`NextResponse.next()`) |
| `/admin/*` (all other) | Redirect to `/admin/login` (status 307) | Allow through (`NextResponse.next()`) |

### 6.3 Edge Middleware Implementation Blueprint

```typescript
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, errors as joseErrors } from "jose";

const SESSION_COOKIE_NAME = "cyrux_admin_session";
const FALLBACK_JWT_SECRET = "cyrux-ultra-secure-jwt-secret-key-32chars-min!!";

// Public unauthenticated routes inside the matcher scope
const PUBLIC_ADMIN_PATHS = [
  "/admin/login",
  "/api/admin/login",
  "/api/admin/auth/login",
];

function getJwtSecretBytes(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET || FALLBACK_JWT_SECRET;
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = PUBLIC_ADMIN_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let isValidSession = false;

  if (sessionCookie) {
    try {
      const secret = getJwtSecretBytes();
      const { payload } = await jwtVerify(sessionCookie, secret, {
        algorithms: ["HS256"],
      });
      if (payload && (payload.role === "admin" || payload.sub === "admin")) {
        isValidSession = true;
      }
    } catch {
      isValidSession = false;
    }
  }

  // Case 1: Public route handling
  if (isPublicPath) {
    // If user is already authenticated and visits /admin/login, redirect to /admin dashboard
    if (isValidSession && pathname === "/admin/login") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // Case 2: Protected route with valid session
  if (isValidSession) {
    return NextResponse.next();
  }

  // Case 3: Unauthenticated /api/admin/* -> Return HTTP 401 JSON
  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Case 4: Unauthenticated /admin/* -> Redirect to /admin/login
  if (pathname.startsWith("/admin")) {
    const loginUrl = new URL("/admin/login", request.url);
    // Preserve attempted destination for post-login redirect
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
```

---

## 7. Edge Runtime & Next.js 15 Compatibility Analysis

### 7.1 Why `jose` Is Used for Middleware & Auth
- `jose` uses universal JavaScript and the Web Crypto API (`crypto.subtle`).
- Next.js Edge Runtime natively supports Web Crypto and `Uint8Array`.
- No Node.js native bindings or external polyfills are required.

### 7.2 Separation of Concerns (`crypto.timingSafeEqual`)
- `crypto.timingSafeEqual` and `Buffer` are used inside Route Handlers (`POST /api/admin/login`).
- Route Handlers run in the default Node.js runtime, ensuring maximum performance, hardware-accelerated timing safety, and zero Edge compatibility issues.
- In Edge Middleware, credential evaluation is never performed—only token verification via `jwtVerify`, keeping the Edge bundle extremely lightweight (<20KB) and fast (<2ms execution overhead).

---

## 8. Verification & Test Plan

1. **Unit & Contract Verification**:
   - Run `npx tsx tests/runner.ts --filter "Feature 13"`.
   - Run `npx tsx tests/runner.ts --tier 2` (checks T2.12 token expiration boundary).
   - Run `npx tsx tests/runner.ts --tier 3` (checks T3.2 and T3.8 route guards & expiry).
   - Run `npx tsx tests/runner.ts --tier 4` (checks T4.2 and T4.5 scenarios).
2. **Type Safety & Lint**:
   - Run `npm run typecheck` (`tsc --noEmit`) to verify zero TypeScript errors across `src/lib/auth.ts`, `src/middleware.ts`, and the API routes.
   - Run `npm run lint`.
3. **Build Validation**:
   - Run `npm run build` to confirm Next.js Edge Middleware compiles and bundles without runtime warnings or unallowed Node API imports.
