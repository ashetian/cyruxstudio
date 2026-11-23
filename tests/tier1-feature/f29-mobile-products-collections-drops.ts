import { describe, it, expect } from '../framework.ts';
import {
  fileExists,
  readFileText,
  hasWhiteAtelierTokens,
  hasAccessibleTouchTargets,
  findAdminDarkThemeRemnants,
} from '../phase2-helpers.ts';

describe('Feature 29: Mobile Products, Variants, Collections & Drops Ops', () => {
  it('29.1 should support discountPrice, custom badge, category/collectionId, and mobile card views in product management', () => {
    const catalogSrc = readFileText('src/components/admin/product-catalog-table.tsx');
    const newModalSrc = readFileText('src/components/admin/new-product-modal.tsx');
    const editModalSrc = readFileText('src/components/admin/product-edit-modal.tsx');

    for (const src of [newModalSrc, editModalSrc]) {
      expect(src).toContain('discountPrice');
      expect(src).toContain('badge');
      expect(src.includes('collectionId') || src.includes('category')).toBe(true);
    }

    // Mobile-friendly card presentation alongside desktop view
    expect(catalogSrc.includes('md:hidden') || catalogSrc.includes('lg:hidden')).toBe(true);
    expect(hasWhiteAtelierTokens(catalogSrc)).toBe(true);
  });

  it('29.2 should provide touch-accessible image reordering buttons in product create/edit forms', () => {
    const newModalSrc = readFileText('src/components/admin/new-product-modal.tsx');
    const editModalSrc = readFileText('src/components/admin/product-edit-modal.tsx');

    for (const src of [newModalSrc, editModalSrc]) {
      // Explicit directional/reorder button controls (not drag-and-drop only)
      const hasReorderAction =
        src.includes('ArrowUp') ||
        src.includes('ArrowDown') ||
        src.includes('ChevronUp') ||
        src.includes('ChevronDown') ||
        src.includes('ChevronLeft') ||
        src.includes('ChevronRight') ||
        src.toLowerCase().includes('moveimage') ||
        src.toLowerCase().includes('reorder');
      expect(hasReorderAction).toBe(true);
    }
  });

  it('29.3 should implement CollectionsManager in collections-manager.tsx and wire it into admin-dashboard.tsx', () => {
    expect(fileExists('src/components/admin/collections-manager.tsx')).toBe(true);

    const colSrc = readFileText('src/components/admin/collections-manager.tsx');
    expect(colSrc).toContain('/api/admin/collections');
    expect(hasWhiteAtelierTokens(colSrc)).toBe(true);
    expect(findAdminDarkThemeRemnants(colSrc)).toHaveLength(0);
    expect(hasAccessibleTouchTargets(colSrc)).toBe(true);

    const dashboardSrc = readFileText('src/components/admin/admin-dashboard.tsx');
    expect(dashboardSrc).toContain('CollectionsManager');
  });

  it('29.4 should re-theme DropManagement, MediaAssetsGrid, and AiStudioModal in White Atelier light theme', () => {
    const files = [
      'src/components/admin/drop-management.tsx',
      'src/components/admin/media-assets-grid.tsx',
      'src/components/admin/ai-studio-modal.tsx',
    ];

    for (const file of files) {
      const src = readFileText(file);
      expect(hasWhiteAtelierTokens(src)).toBe(true);
      expect(findAdminDarkThemeRemnants(src)).toHaveLength(0);
    }
  });

  it('29.5 should enforce >=44px tap targets, text-base inputs, and cursor-pointer across product & drop modals', () => {
    const files = [
      'src/components/admin/new-product-modal.tsx',
      'src/components/admin/product-edit-modal.tsx',
      'src/components/admin/collections-manager.tsx',
      'src/components/admin/drop-management.tsx',
    ];

    for (const file of files) {
      const src = readFileText(file);
      expect(hasAccessibleTouchTargets(src)).toBe(true);
      expect(src).toContain('text-base');
      expect(src).toContain('cursor-pointer');
    }
  });
}, { tier: 1, featureId: 29 });
