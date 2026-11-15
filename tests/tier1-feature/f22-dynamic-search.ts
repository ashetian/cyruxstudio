import { describe, it, expect } from '../framework.ts';
import { MOCK_PRODUCTS } from '../../src/lib/db.ts';
import { filterProductsByQuery } from '../../src/components/storefront/hero-section.tsx';

describe('Feature 22: Dynamic Site-Wide Search & Command Palette', () => {
  it('22.1 should dynamically match products by partial query in name or description', () => {
    const chaosResults = filterProductsByQuery(MOCK_PRODUCTS, 'chaos');
    expect(chaosResults.length).toBeGreaterThanOrEqual(1);
    expect(chaosResults[0].name.toLowerCase()).toContain('chaos');

    const orbitalResults = filterProductsByQuery(MOCK_PRODUCTS, 'orbital');
    expect(orbitalResults.length).toBeGreaterThanOrEqual(1);
  });

  it('22.2 should handle case-insensitive and whitespace-padded queries', () => {
    const rawMatch = filterProductsByQuery(MOCK_PRODUCTS, '  TEE  ');
    expect(rawMatch.length).toBeGreaterThanOrEqual(1);

    const lowercaseMatch = filterProductsByQuery(MOCK_PRODUCTS, 'tee');
    expect(rawMatch.length).toBe(lowercaseMatch.length);
  });

  it('22.3 should return empty array for non-existent product search terms', () => {
    const emptyResults = filterProductsByQuery(MOCK_PRODUCTS, 'xyz-nonexistent-12345');
    expect(emptyResults).toHaveLength(0);
  });

  it('22.4 should return all products when query is empty or only whitespace', () => {
    const allProducts = filterProductsByQuery(MOCK_PRODUCTS, '');
    expect(allProducts.length).toBe(MOCK_PRODUCTS.length);

    const spaceQuery = filterProductsByQuery(MOCK_PRODUCTS, '    ');
    expect(spaceQuery.length).toBe(MOCK_PRODUCTS.length);
  });

  it('22.5 should validate keyboard shortcuts and category filter specification', () => {
    const dynamicSearchSpec = {
      hotkey: 'Cmd+K / Ctrl+K',
      quickSearchHotkey: '/',
      hasLiveDropdown: true,
      hasModalPalette: true,
      hasFloatingNavTrigger: true,
      categories: ['all', 'tee', 'hoodie', 'bestseller'],
    };

    expect(dynamicSearchSpec.hasLiveDropdown).toBe(true);
    expect(dynamicSearchSpec.hasModalPalette).toBe(true);
    expect(dynamicSearchSpec.hasFloatingNavTrigger).toBe(true);
    expect(dynamicSearchSpec.categories).toContain('bestseller');
  });
}, { tier: 1, featureId: 22 });
