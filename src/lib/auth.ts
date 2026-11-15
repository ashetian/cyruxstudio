import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import crypto from "node:crypto";
import type { NextRequest } from "next/server";

export interface AdminSessionPayload {
  sub: string;
  email: string;
  role: "admin";
  exp?: number;
  iat?: number;
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

export const SESSION_COOKIE_NAME = "cyrux_admin_session";
export const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours
export const DEFAULT_SESSION_EXPIRY = "24h";

export const FALLBACK_JWT_SECRET = "cyrux-ultra-secure-jwt-secret-key-32chars-min!!";
export const FALLBACK_ADMIN_EMAIL = "admin@cyrux.studio";
export const FALLBACK_ADMIN_PASSWORD = "AdminSecret2026!";

export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET || FALLBACK_JWT_SECRET;
  return new TextEncoder().encode(secret);
}

/**
 * Constant-time string equality comparison using crypto.timingSafeEqual.
 * Checks byte length first to prevent side-channel timing leaks.
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
 * Validates admin credentials against environment variables with timing-attack immunity.
 */
export function verifyAdminCredentials(email: string, password: string): boolean {
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return false;
  }

  const expectedEmail = process.env.ADMIN_EMAIL || FALLBACK_ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD || FALLBACK_ADMIN_PASSWORD;

  const emailMatches = constantTimeCompare(
    email.trim().toLowerCase(),
    expectedEmail.trim().toLowerCase()
  );
  const passwordMatches = constantTimeCompare(password, expectedPassword);

  return emailMatches && passwordMatches;
}

/**
 * Generates a signed HS256 JWT for admin sessions.
 */
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

/**
 * Verifies and decodes a signed HS256 JWT admin token.
 */
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

/**
 * Extracts and verifies the admin session from a NextRequest or raw token string.
 */
export async function verifyAdminSession(
  requestOrToken: NextRequest | string
): Promise<AuthVerificationResult> {
  let token: string | undefined;

  if (typeof requestOrToken === "string") {
    token = requestOrToken;
  } else {
    token = requestOrToken.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = requestOrToken.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
  }

  if (!token) {
    return { valid: false, error: "Unauthorized" };
  }

  return await verifyAdminSessionToken(token);
}

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
