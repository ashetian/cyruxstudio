import { describe, it, expect } from '../framework.ts';
import {
  fileExists,
  readFileText,
  hasWhiteAtelierTokens,
  hasAccessibleTouchTargets,
  findAdminDarkThemeRemnants,
} from '../phase2-helpers.ts';

describe('Feature 30: Mobile Orders, Customers & Coupons/Campaigns Ops', () => {
  it('30.1 should implement OrdersManager in orders-manager.tsx with status, tracking, and notes controls', () => {
    expect(fileExists('src/components/admin/orders-manager.tsx')).toBe(true);

    const src = readFileText('src/components/admin/orders-manager.tsx');
    expect(src).toContain('/api/admin/orders');
    expect(src).toContain('trackingNumber');
    expect(src).toContain('trackingCarrier');
    expect(src).toContain('adminNotes');

    for (const status of ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled']) {
      expect(src).toContain(status);
    }

    const dashboardSrc = readFileText('src/components/admin/admin-dashboard.tsx');
    expect(dashboardSrc).toContain('OrdersManager');
  });

  it('30.2 should implement CustomersManager in customers-manager.tsx and wire it into admin-dashboard.tsx', () => {
    expect(fileExists('src/components/admin/customers-manager.tsx')).toBe(true);

    const src = readFileText('src/components/admin/customers-manager.tsx');
    expect(src).toContain('/api/admin/customers');
    expect(
      src.toLowerCase().includes('search') ||
        src.toLowerCase().includes('ara') ||
        src.includes('query')
    ).toBe(true);

    const dashboardSrc = readFileText('src/components/admin/admin-dashboard.tsx');
    expect(dashboardSrc).toContain('CustomersManager');
  });

  it('30.3 should implement CouponsManager in coupons-manager.tsx with percentage/fixed CRUD & active toggle', () => {
    expect(fileExists('src/components/admin/coupons-manager.tsx')).toBe(true);

    const src = readFileText('src/components/admin/coupons-manager.tsx');
    expect(src).toContain('/api/admin/coupons');
    expect(src).toContain('percentage');
    expect(src).toContain('fixed');
    expect(src).toContain('minOrderAmount');
    expect(src).toContain('maxUses');
    expect(src).toContain('isActive');

    const dashboardSrc = readFileText('src/components/admin/admin-dashboard.tsx');
    expect(dashboardSrc).toContain('CouponsManager');
  });

  it('30.4 should adhere to White Atelier theme and mobile card/sheet ergonomics across Orders, Customers, and Coupons', () => {
    const files = [
      'src/components/admin/orders-manager.tsx',
      'src/components/admin/customers-manager.tsx',
      'src/components/admin/coupons-manager.tsx',
    ];

    for (const file of files) {
      const src = readFileText(file);
      expect(hasWhiteAtelierTokens(src)).toBe(true);
      expect(findAdminDarkThemeRemnants(src)).toHaveLength(0);
      expect(hasAccessibleTouchTargets(src)).toBe(true);
      expect(src).toContain('cursor-pointer');
    }
  });

  it('30.5 should handle loading, empty, and error states cleanly with text-base inputs in commerce managers', () => {
    const files = [
      'src/components/admin/orders-manager.tsx',
      'src/components/admin/customers-manager.tsx',
      'src/components/admin/coupons-manager.tsx',
    ];

    for (const file of files) {
      const src = readFileText(file);
      expect(src).toContain('text-base');
      expect(src.includes('loading') || src.includes('isLoading')).toBe(true);
      expect(src.includes('error')).toBe(true);
    }
  });
}, { tier: 1, featureId: 30 });
