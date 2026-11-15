import { describe, it, expect } from '../framework.ts';
import { generateWhatsAppOrderUrl, sanitizePhoneNumber } from '../contracts.ts';

describe('Feature 12: Dynamic WhatsApp URL Generation', () => {
  it('12.1 should generate a valid wa.me URL for standard Turkish phone format (+90 532 123 45 67)', () => {
    const rawPhone = '+90 532 123 45 67';
    const order = {
      productId: 'prod-01',
      productName: 'RAW CUT BOXY TEE',
      variant: 'Size L',
      price: 95.0,
      currency: 'USD',
      customerNotes: 'Deliver between 2-4 PM',
    };

    const url = generateWhatsAppOrderUrl(rawPhone, order);
    expect(url.startsWith('https://wa.me/905321234567?text=')).toBeTruthy();
    expect(url).toContain(encodeURIComponent('RAW CUT BOXY TEE'));
    expect(url).toContain(encodeURIComponent('Size L'));
    expect(url).toContain(encodeURIComponent('95.00 USD'));
  });

  it('12.2 should generate valid wa.me URL for US international phone (+1 (555) 019-2834)', () => {
    const rawPhone = '+1 (555) 019-2834';
    const order = {
      productId: 'prod-hoodie',
      productName: 'MONOLITH HEAVY HOODIE',
      price: 240.0,
      currency: 'EUR',
    };

    const url = generateWhatsAppOrderUrl(rawPhone, order);
    expect(url.startsWith('https://wa.me/15550192834?text=')).toBeTruthy();
    expect(url).toContain(encodeURIComponent('MONOLITH HEAVY HOODIE'));
    expect(url).toContain(encodeURIComponent('240.00 EUR'));
  });

  it('12.3 should omit variant and notes lines gracefully when not provided', () => {
    const rawPhone = '+905320000000';
    const order = {
      productId: 'prod-tote',
      productName: 'LEATHER MONOGRAM TOTE',
      price: 160.0,
      currency: 'USD',
    };

    const url = generateWhatsAppOrderUrl(rawPhone, order);
    const decodedText = decodeURIComponent(url.replace('https://wa.me/905320000000?text=', ''));

    expect(decodedText).toContain('Product: LEATHER MONOGRAM TOTE');
    expect(decodedText).toContain('Price: 160.00 USD');
    expect(decodedText).not.toContain('Variant:');
    expect(decodedText).not.toContain('Notes:');
  });

  it('12.4 should throw error when phone number has no valid digits', () => {
    expect(() => sanitizePhoneNumber('invalid-no-digits')).toThrow('no digits found');
    expect(() => sanitizePhoneNumber('')).toThrow('no digits found');
  });

  it('12.5 should correctly reflect dynamic store currency from store settings in the order URL', () => {
    const orderTRY = {
      productId: 'prod-01',
      productName: 'CARGO PANT',
      price: 3500.0,
      currency: 'TRY',
    };

    const urlTRY = generateWhatsAppOrderUrl('+905321112233', orderTRY);
    expect(urlTRY).toContain(encodeURIComponent('3500.00 TRY'));

    const orderGBP = {
      productId: 'prod-01',
      productName: 'CARGO PANT',
      price: 180.0,
      currency: 'GBP',
    };

    const urlGBP = generateWhatsAppOrderUrl('+905321112233', orderGBP);
    expect(urlGBP).toContain(encodeURIComponent('180.00 GBP'));
  });

  it('12.6 should format message in Turkish when lang is "tr"', () => {
    const orderTR = {
      productId: 'prod-01',
      productName: 'RAW CUT BOXY TEE',
      variant: 'Size L',
      price: 95.0,
      currency: 'USD',
      customerNotes: 'Acil teslimat',
      lang: 'tr' as const,
    };

    const url = generateWhatsAppOrderUrl('+90 532 123 45 67', orderTR);
    const decoded = decodeURIComponent(url.replace('https://wa.me/905321234567?text=', ''));

    expect(decoded).toContain('*YENİ SİPARİŞ - CYRUX STUDIO*');
    expect(decoded).toContain('Ürün: RAW CUT BOXY TEE');
    expect(decoded).toContain('Beden: Size L');
    expect(decoded).toContain('Fiyat: 95.00 USD');
    expect(decoded).toContain('Not: Acil teslimat');
    expect(decoded).toContain('Ref ID: prod-01');
  });
}, { tier: 1, featureId: 12 });
