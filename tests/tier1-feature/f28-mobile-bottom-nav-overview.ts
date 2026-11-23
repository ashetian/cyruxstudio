import { describe, it, expect } from '../framework.ts';
import {
  fileExists,
  readFileText,
  hasWhiteAtelierTokens,
  hasAccessibleTouchTargets,
} from '../phase2-helpers.ts';

describe('Feature 28: Mobile-First Bottom Nav, Bottom Sheets & Overview Dashboard', () => {
  it('28.1 should implement fixed mobile Bottom Navigation Bar in admin-bottom-nav.tsx and mount it in admin-dashboard.tsx', () => {
    expect(fileExists('src/components/admin/admin-bottom-nav.tsx')).toBe(true);

    const navSrc = readFileText('src/components/admin/admin-bottom-nav.tsx');
    expect(navSrc).toContain('fixed');
    expect(navSrc).toContain('bottom-0');
    expect(hasWhiteAtelierTokens(navSrc)).toBe(true);
    expect(hasAccessibleTouchTargets(navSrc)).toBe(true);

    const dashboardSrc = readFileText('src/components/admin/admin-dashboard.tsx');
    expect(dashboardSrc).toContain('AdminBottomNav');
  });

  it('28.2 should implement accessible Bottom Sheet drawer in admin-bottom-sheet.tsx with dialog semantics', () => {
    expect(fileExists('src/components/admin/admin-bottom-sheet.tsx')).toBe(true);

    const sheetSrc = readFileText('src/components/admin/admin-bottom-sheet.tsx');
    expect(sheetSrc).toContain('role="dialog"');
    expect(sheetSrc).toContain('aria-modal');
    expect(hasWhiteAtelierTokens(sheetSrc)).toBe(true);
    expect(hasAccessibleTouchTargets(sheetSrc)).toBe(true);
  });

  it('28.3 should implement mobile Overview KPI dashboard with low-stock alerts and quick actions in admin-overview.tsx', () => {
    expect(fileExists('src/components/admin/admin-overview.tsx')).toBe(true);

    const overviewSrc = readFileText('src/components/admin/admin-overview.tsx');
    expect(hasWhiteAtelierTokens(overviewSrc)).toBe(true);
    expect(
      overviewSrc.includes('lowStock') ||
        overviewSrc.includes('low_stock') ||
        overviewSrc.toLowerCase().includes('low stock') ||
        overviewSrc.toLowerCase().includes('düşük stok')
    ).toBe(true);

    const dashboardSrc = readFileText('src/components/admin/admin-dashboard.tsx');
    expect(dashboardSrc).toContain('AdminOverview');
  });

  it('28.4 should enforce >=44px touch targets, focus-visible rings, cursor-pointer, and text-base mobile inputs', () => {
    const shellFiles = [
      'src/components/admin/admin-bottom-nav.tsx',
      'src/components/admin/admin-bottom-sheet.tsx',
      'src/components/admin/admin-overview.tsx',
      'src/components/admin/admin-header.tsx',
      'src/app/admin/login/page.tsx',
    ];

    for (const file of shellFiles) {
      const content = readFileText(file);
      expect(hasAccessibleTouchTargets(content)).toBe(true);
      expect(content).toContain('cursor-pointer');
      expect(content.includes('focus-visible:') || content.includes('focus:')).toBe(true);
    }

    const loginSrc = readFileText('src/app/admin/login/page.tsx');
    expect(loginSrc).toContain('text-base');
  });

  it('28.5 should prevent horizontal overflow across mobile viewports (320px-768px) in admin shell', () => {
    const dashboardSrc = readFileText('src/components/admin/admin-dashboard.tsx');
    const layoutSrc = readFileText('src/app/admin/layout.tsx');

    const hasOverflowGuard =
      dashboardSrc.includes('overflow-x-hidden') ||
      layoutSrc.includes('overflow-x-hidden');
    expect(hasOverflowGuard).toBe(true);

    // Ensure bottom padding accounts for fixed bottom nav on mobile
    expect(
      dashboardSrc.includes('pb-24') ||
        dashboardSrc.includes('pb-28') ||
        dashboardSrc.includes('pb-20')
    ).toBe(true);
  });
}, { tier: 1, featureId: 28 });
