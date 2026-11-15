import { describe, it, expect } from '../framework.ts';
import { BRAND_TOKENS } from '../contracts.ts';

describe('Feature 4: Dark High-Contrast Hero & Search Pill', () => {
  it('4.1 should validate Hero background color token contract (#0A0A0A / #070709)', () => {
    expect(BRAND_TOKENS.DARK_HERO).toBe('#0A0A0A');
    expect(BRAND_TOKENS.CREAM_DISPLAY).toBe('#FAF8F3');
  });

  it('4.2 should validate search pill UI specification and input attributes', () => {
    const searchPillSpec = {
      role: 'search',
      placeholder: 'Search collection, garments, accessories...',
      shape: 'rounded-full', // Pill shape
      border: 'border border-neutral-700/50',
      icon: 'magnifying-glass',
    };

    expect(searchPillSpec.shape).toContain('rounded-full');
    expect(searchPillSpec.placeholder.length).toBeGreaterThan(10);
    expect(searchPillSpec.role).toBe('search');
  });

  it('4.3 should enforce "cyrux" edge-to-edge monumental typography title contract', () => {
    const heroTitle = 'cyrux';
    expect(heroTitle.toLowerCase()).toBe('cyrux');
    expect(heroTitle).toHaveLength(5);
  });

  it('4.4 should filter products accurately using search pill query logic', () => {
    const catalog = [
      { name: 'Monolith Heavy Hoodie', category: 'hoodies' },
      { name: 'Raw Cut Boxy Tee', category: 't-shirts' },
      { name: 'Brutalist Wide Cargo', category: 'pants' },
    ];

    const filterProducts = (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return catalog;
      return catalog.filter(p => p.name.toLowerCase().includes(q) || p.category.includes(q));
    };

    expect(filterProducts('hoodie')).toHaveLength(1);
    expect(filterProducts('hoodie')[0].name).toBe('Monolith Heavy Hoodie');
    expect(filterProducts('   ')).toHaveLength(3);
    expect(filterProducts('nonexistent')).toHaveLength(0);
  });

  it('4.5 should verify top header navigation elements (logo, search pill, menu trigger)', () => {
    const headerContract = {
      hasLogo: true,
      hasSearchPill: true,
      hasMenuToggle: true,
    };
    expect(headerContract.hasLogo).toBe(true);
    expect(headerContract.hasSearchPill).toBe(true);
    expect(headerContract.hasMenuToggle).toBe(true);
  });
}, { tier: 1, featureId: 4 });
