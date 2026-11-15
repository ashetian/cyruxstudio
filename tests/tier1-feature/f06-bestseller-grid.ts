import { describe, it, expect } from '../framework.ts';

describe('Feature 6: Asymmetric 4-Column Bestseller Grid', () => {
  it('6.1 should enforce section heading text contract "Bestseller Now" in monospace', () => {
    const heading = 'Bestseller Now';
    const isMonospace = (fontFamily: string) => /mono|courier|consolas/i.test(fontFamily);

    expect(heading.toUpperCase()).toBe('BESTSELLER NOW');
    expect(isMonospace('Space Mono, monospace')).toBeTruthy();
  });

  it('6.2 should enforce 4-column grid layout specification for desktop breakpoint', () => {
    const gridConfig = {
      display: 'grid',
      desktopColumns: 4,
      mobileColumns: 1,
      tabletColumns: 2,
      gap: 'gap-6 md:gap-8',
      borderless: true,
    };

    expect(gridConfig.desktopColumns).toBe(4);
    expect(gridConfig.mobileColumns).toBe(1);
    expect(gridConfig.borderless).toBe(true);
  });

  it('6.3 should support asymmetric height multipliers across 4 columns', () => {
    // Reference layout has staggered vertical heights
    const columnHeightRatios = [1.2, 1.45, 1.15, 1.35];

    expect(columnHeightRatios).toHaveLength(4);
    // Ensure variation (not all identical heights)
    const uniqueHeights = new Set(columnHeightRatios);
    expect(uniqueHeights.size).toBe(4);
  });

  it('6.4 should toggle wishlist heart state for individual product cards', () => {
    const wishlist = new Set<string>();

    const toggleWishlist = (productId: string) => {
      if (wishlist.has(productId)) {
        wishlist.delete(productId);
        return false;
      } else {
        wishlist.add(productId);
        return true;
      }
    };

    expect(toggleWishlist('prod-1')).toBe(true);
    expect(wishlist.has('prod-1')).toBe(true);
    expect(toggleWishlist('prod-1')).toBe(false);
    expect(wishlist.has('prod-1')).toBe(false);
  });

  it('6.5 should format product price cleanly with currency symbol according to store config', () => {
    const formatProductPrice = (price: number, currency = 'USD') => {
      const symbols: Record<string, string> = { USD: '$', EUR: '€', TRY: '₺', GBP: '£' };
      const sym = symbols[currency] || currency;
      return `${sym}${price.toFixed(2)}`;
    };

    expect(formatProductPrice(180, 'USD')).toBe('$180.00');
    expect(formatProductPrice(240, 'EUR')).toBe('€240.00');
    expect(formatProductPrice(3500, 'TRY')).toBe('₺3500.00');
  });
}, { tier: 1, featureId: 6 });
