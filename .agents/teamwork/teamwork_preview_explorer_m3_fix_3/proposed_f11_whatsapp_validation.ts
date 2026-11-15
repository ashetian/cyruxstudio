import { describe, it, expect } from '../framework.ts';
import {
  validateOrderPayload,
  whatsAppOrderInputSchema,
  whatsAppOrderApiRequestSchema,
  sanitizeCustomerText,
} from '../../src/lib/validations.ts';

describe('Feature 11: WhatsApp Order Payload Validation', () => {
  it('11.1 should successfully validate a clean, well-formed order payload', () => {
    const valid = {
      productId: 'prod-hoodie-01',
      variant: 'Size L / Deep Black',
      customerNotes: 'Please deliver after 5 PM.',
    };

    const sanitized = validateOrderPayload(valid);
    expect(sanitized.productId).toBe('prod-hoodie-01');
    expect(sanitized.variant).toBe('Size L / Deep Black');
    expect(sanitized.customerNotes).toBe('Please deliver after 5 PM.');

    // Exercise production Zod API request schema
    const parsedApi = whatsAppOrderApiRequestSchema.parse(valid);
    expect(parsedApi.productId).toBe('prod-hoodie-01');
    expect(parsedApi.variant).toBe('Size L / Deep Black');
    expect(parsedApi.customerNotes).toBe('Please deliver after 5 PM.');

    // Exercise production full order input schema
    const parsedFull = whatsAppOrderInputSchema.parse({
      ...valid,
      productName: 'Monolith Hoodie',
      price: 180,
    });
    expect(parsedFull.productId).toBe('prod-hoodie-01');
    expect(parsedFull.price).toBe(180);
    expect(parsedFull.currency).toBe('USD');
  });

  it('11.2 should sanitize XSS injection payload <script>alert("xss")</script> from customer notes', () => {
    const malicious = {
      productId: 'prod-01',
      customerNotes: 'Hello <script>alert("xss")</script> world',
    };

    const sanitized = validateOrderPayload(malicious);
    expect(sanitized.customerNotes).not.toContain('<script>');
    expect(sanitized.customerNotes).not.toContain('</script>');
    expect(sanitized.customerNotes).toBe('Hello alert(xss) world');

    // Exercise production sanitizeCustomerText directly
    expect(sanitizeCustomerText(malicious.customerNotes)).toBe('Hello alert(xss) world');

    // Exercise production Zod schema sanitization transform
    const parsed = whatsAppOrderApiRequestSchema.parse(malicious);
    expect(parsed.customerNotes).toBe('Hello alert(xss) world');
  });

  it('11.3 should sanitize HTML tags <img onerror=...> and quotes from customer notes', () => {
    const htmlPayload = {
      productId: 'prod-02',
      customerNotes: 'Gift for friend <img src="x" onerror="steal()"/> notes',
    };

    const sanitized = validateOrderPayload(htmlPayload);
    expect(sanitized.customerNotes).not.toContain('<img');
    expect(sanitized.customerNotes).not.toContain('onerror');

    // Exercise production Zod schema transform
    const parsed = whatsAppOrderApiRequestSchema.parse(htmlPayload);
    expect(parsed.customerNotes).not.toContain('<img');
    expect(parsed.customerNotes).not.toContain('onerror');
  });

  it('11.4 should reject payloads with missing or empty productId', () => {
    expect(() => validateOrderPayload({ productId: '' })).toThrow('productId is required');
    expect(() => validateOrderPayload({ productId: '   ' })).toThrow('productId is required');
    expect(() => validateOrderPayload({})).toThrow('productId is required');

    // Exercise production Zod schemas rejection
    expect(whatsAppOrderApiRequestSchema.safeParse({ productId: '' }).success).toBe(false);
    expect(whatsAppOrderApiRequestSchema.safeParse({}).success).toBe(false);
    expect(
      whatsAppOrderInputSchema.safeParse({ productId: '', productName: 'Tee', price: 10 }).success
    ).toBe(false);
  });

  it('11.5 should reject payloads where customerNotes exceed maximum 500 character limit', () => {
    const oversizedNotes = 'A'.repeat(501);
    expect(() =>
      validateOrderPayload({
        productId: 'prod-01',
        customerNotes: oversizedNotes,
      })
    ).toThrow('customerNotes cannot exceed 500 characters');

    // Exercise production Zod schemas rejection on oversized notes and invalid price
    expect(
      whatsAppOrderApiRequestSchema.safeParse({
        productId: 'prod-01',
        customerNotes: oversizedNotes,
      }).success
    ).toBe(false);

    expect(
      whatsAppOrderInputSchema.safeParse({
        productId: 'prod-01',
        productName: 'Tee',
        price: -50,
      }).success
    ).toBe(false);
  });
}, { tier: 1, featureId: 11 });
