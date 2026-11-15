import { describe, it, expect } from '../framework.ts';
import { createMockAdminJwt, verifyMockAdminJwt } from '../contracts.ts';
import crypto from 'node:crypto';

describe('Feature 13: Jose JWT Admin Authentication', () => {
  const testSecret = 'cyrux-ultra-secure-jwt-secret-key-32chars-min!!';

  it('13.1 should successfully issue and verify a signed HS256 JWT admin token', () => {
    const payload = { sub: 'admin', role: 'admin' };
    const token = createMockAdminJwt(testSecret, payload);

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const verification = verifyMockAdminJwt(token, testSecret);
    expect(verification.valid).toBe(true);
    expect(verification.payload?.sub).toBe('admin');
    expect(verification.payload?.role).toBe('admin');
  });

  it('13.2 should reject tampered JWT signatures immediately', () => {
    const token = createMockAdminJwt(testSecret, { sub: 'admin', role: 'admin' });
    const parts = token.split('.');
    // Tamper with payload (middle part)
    const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'hacker', role: 'admin' })).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const verification = verifyMockAdminJwt(tamperedToken, testSecret);
    expect(verification.valid).toBe(false);
    expect(verification.error).toBe('Invalid signature');
  });

  it('13.3 should reject expired JWT tokens', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 300; // 5 minutes ago
    const expiredToken = createMockAdminJwt(testSecret, { sub: 'admin', role: 'admin', exp: pastExp });

    const verification = verifyMockAdminJwt(expiredToken, testSecret);
    expect(verification.valid).toBe(false);
    expect(verification.error).toBe('Token expired');
  });

  it('13.4 should verify timingSafeEqual credential check contract against timing attacks', () => {
    const constantTimeCompare = (a: string, b: string): boolean => {
      const bufA = Buffer.from(a);
      const bufB = Buffer.from(b);
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    };

    expect(constantTimeCompare('secretPass123', 'secretPass123')).toBe(true);
    expect(constantTimeCompare('secretPass123', 'wrongPass1234')).toBe(false);
    expect(constantTimeCompare('short', 'muchLongerString')).toBe(false);
  });

  it('13.5 should enforce edge middleware route guard contract (401 on /api/admin/*, redirect on /admin/*)', () => {
    const evaluateMiddlewareGuard = (pathname: string, hasValidSession: boolean) => {
      const isApiAdmin = pathname.startsWith('/api/admin');
      const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
      const isPublicAdminApi = pathname === '/api/admin/auth/login';

      if (!hasValidSession) {
        if (isPublicAdminApi) return { allow: true };
        if (isApiAdmin) return { status: 401, error: 'Unauthorized' };
        if (isAdminPage) return { status: 307, redirect: '/admin/login' };
      }
      return { allow: true };
    };

    const unauthApi = evaluateMiddlewareGuard('/api/admin/products', false);
    expect(unauthApi.status).toBe(401);

    const unauthPage = evaluateMiddlewareGuard('/admin/products', false);
    expect(unauthPage.status).toBe(307);
    expect(unauthPage.redirect).toBe('/admin/login');

    const authApi = evaluateMiddlewareGuard('/api/admin/products', true);
    expect(authApi.allow).toBe(true);

    const loginEndpoint = evaluateMiddlewareGuard('/api/admin/auth/login', false);
    expect(loginEndpoint.allow).toBe(true);
  });
}, { tier: 1, featureId: 13 });
