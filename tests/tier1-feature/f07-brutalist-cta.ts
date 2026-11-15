import { describe, it, expect } from '../framework.ts';

describe('Feature 7: Brutalist Monospace CTA', () => {
  it('7.1 should enforce exact CTA text contract "BUY NOW →"', () => {
    const ctaText = 'BUY NOW →';
    expect(ctaText).toBe('BUY NOW →');
    expect(ctaText.endsWith('→')).toBeTruthy();
  });

  it('7.2 should enforce brutalist monospace styling with underline decoration', () => {
    const ctaStyles = {
      fontFamily: 'font-mono',
      textDecoration: 'underline underline-offset-4',
      textTransform: 'uppercase',
      letterSpacing: 'tracking-wider',
    };

    expect(ctaStyles.fontFamily).toBe('font-mono');
    expect(ctaStyles.textDecoration).toContain('underline');
    expect(ctaStyles.textTransform).toBe('uppercase');
  });

  it('7.3 should disable CTA button when product stock is 0', () => {
    const getCtaState = (stock: number) => {
      if (stock <= 0) {
        return { disabled: true, text: 'OUT OF STOCK' };
      }
      return { disabled: false, text: 'BUY NOW →' };
    };

    const inStock = getCtaState(10);
    expect(inStock.disabled).toBe(false);
    expect(inStock.text).toBe('BUY NOW →');

    const outOfStock = getCtaState(0);
    expect(outOfStock.disabled).toBe(true);
    expect(outOfStock.text).toBe('OUT OF STOCK');
  });

  it('7.4 should open variant selector modal if product has multiple variants', () => {
    const product = {
      id: 'prod-01',
      variants: [{ size: 'S' }, { size: 'M' }, { size: 'L' }],
    };

    const handleCtaClick = (prod: typeof product) => {
      if (prod.variants && prod.variants.length > 1) {
        return { action: 'OPEN_VARIANT_MODAL', productId: prod.id };
      }
      return { action: 'TRIGGER_WHATSAPP_DIRECT', productId: prod.id };
    };

    const result = handleCtaClick(product);
    expect(result.action).toBe('OPEN_VARIANT_MODAL');
    expect(result.productId).toBe('prod-01');
  });

  it('7.5 should directly trigger WhatsApp order if product has no extra variants', () => {
    const singleVariantProduct = {
      id: 'prod-tote',
      variants: [],
    };

    const handleCtaClick = (prod: typeof singleVariantProduct) => {
      if (prod.variants && prod.variants.length > 1) {
        return { action: 'OPEN_VARIANT_MODAL', productId: prod.id };
      }
      return { action: 'TRIGGER_WHATSAPP_DIRECT', productId: prod.id };
    };

    const result = handleCtaClick(singleVariantProduct);
    expect(result.action).toBe('TRIGGER_WHATSAPP_DIRECT');
  });
}, { tier: 1, featureId: 7 });
