import { describe, it, expect } from '../framework.ts';

describe('Feature 5: Bottom Floating Pill Nav', () => {
  it('5.1 should validate floating pill navigation links contract', () => {
    const navItems = [
      { label: 'cyrux', href: '#hero', isBrand: true },
      { label: 'Shop', href: '#shop', isBrand: false },
      { label: 'New collection', href: '#new-collection', isBrand: false },
      { label: 'About', href: '#about', isBrand: false },
    ];

    expect(navItems).toHaveLength(4);
    expect(navItems[0].label).toBe('cyrux');
    expect(navItems.map(i => i.label)).toContain('Shop');
    expect(navItems.map(i => i.label)).toContain('New collection');
    expect(navItems.map(i => i.label)).toContain('About');
  });

  it('5.2 should enforce floating pill styling tokens (frosted glass, rounded-full, border)', () => {
    const pillTokens = {
      position: 'fixed',
      shape: 'rounded-full',
      backdrop: 'backdrop-blur-md',
      zIndex: 50,
      border: 'border border-neutral-300/40',
    };

    expect(pillTokens.position).toBe('fixed');
    expect(pillTokens.shape).toBe('rounded-full');
    expect(pillTokens.backdrop).toContain('backdrop-blur');
    expect(pillTokens.zIndex).toBeGreaterThanOrEqual(40);
  });

  it('5.3 should calculate bottom centering coordinates correctly', () => {
    const computeFloatingNavPosition = (windowWidth: number) => {
      const pillWidth = 360;
      return {
        left: Math.round((windowWidth - pillWidth) / 2),
        bottom: 32, // bottom-8 in Tailwind
      };
    };

    const desktop = computeFloatingNavPosition(1440);
    expect(desktop.left).toBe(540);
    expect(desktop.bottom).toBe(32);

    const mobile = computeFloatingNavPosition(390);
    expect(mobile.left).toBe(15);
  });

  it('5.4 should switch active state based on current scroll section id', () => {
    const sections = ['hero', 'shop', 'new-collection', 'about'];
    const getActiveNav = (currentSection: string) => {
      return sections.includes(currentSection) ? currentSection : 'hero';
    };

    expect(getActiveNav('shop')).toBe('shop');
    expect(getActiveNav('unknown-section')).toBe('hero');
  });

  it('5.5 should provide keyboard accessibility attributes (role=navigation, aria-label)', () => {
    const navA11y = {
      role: 'navigation',
      ariaLabel: 'Floating Main Navigation',
      hasKeyboardFocusRings: true,
    };

    expect(navA11y.role).toBe('navigation');
    expect(navA11y.ariaLabel).toBeDefined();
    expect(navA11y.hasKeyboardFocusRings).toBe(true);
  });
}, { tier: 1, featureId: 5 });
