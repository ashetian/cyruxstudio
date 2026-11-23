import { describe, it, expect } from '../framework.ts';
import {
  fileExists,
  readFileText,
  dynamicImport,
} from '../phase2-helpers.ts';

describe('Feature 34: Dynamic Storefront Metadata, Navigation & Hero/Marquee', () => {
  it('34.1 should export dynamic generateMetadata() reflecting live CMS SEO updates without hardcoded cyberpunk copy', async () => {
    const layoutSrc = readFileText('src/app/layout.tsx');
    const pageSrc = readFileText('src/app/page.tsx');

    expect(
      layoutSrc.includes('export async function generateMetadata') ||
        pageSrc.includes('export async function generateMetadata')
    ).toBe(true);

    // Invoke generateMetadata from layout.tsx or page.tsx if exported
    const targetPath = layoutSrc.includes('generateMetadata') ? 'src/app/layout.tsx' : 'src/app/page.tsx';
    const cmsMod = await dynamicImport<{
      getCmsSection: (s: string) => Promise<Record<string, unknown>>;
      updateCmsSection: (s: string, data: unknown) => Promise<unknown>;
    }>('src/lib/cms.ts');

    const originalSeo = await cmsMod.getCmsSection('seo');
    const markerTitle = `CYRUX ATELIER DYNAMIC ${Date.now()}`;
    await cmsMod.updateCmsSection('seo', {
      ...originalSeo,
      title: markerTitle,
      description: 'Architectural raw cotton garments.',
    });

    try {
      const metaMod = await dynamicImport<{
        generateMetadata: () => Promise<{ title?: unknown; description?: string }>;
      }>(targetPath);
      const metadata = await metaMod.generateMetadata();
      expect(JSON.stringify(metadata)).toContain(markerTitle);
      expect(JSON.stringify(metadata).toLowerCase()).not.toContain('cyberpunk');
    } finally {
      await cmsMod.updateCmsSection('seo', originalSeo);
    }
  });

  it('34.2 should wire FloatingNav and MenuDrawer to dynamic CMS navigation props', () => {
    const floatingNavSrc = readFileText('src/components/storefront/floating-nav.tsx');
    const menuDrawerSrc = readFileText('src/components/storefront/menu-drawer.tsx');

    expect(
      floatingNavSrc.includes('navigation') ||
        floatingNavSrc.includes('navLinks') ||
        floatingNavSrc.includes('links')
    ).toBe(true);
    expect(
      menuDrawerSrc.includes('navigation') ||
        menuDrawerSrc.includes('drawerLinks') ||
        menuDrawerSrc.includes('links')
    ).toBe(true);
  });

  it('34.3 should implement MarqueeBar component in marquee-bar.tsx and mount it on the storefront', () => {
    expect(fileExists('src/components/storefront/marquee-bar.tsx')).toBe(true);

    const marqueeSrc = readFileText('src/components/storefront/marquee-bar.tsx');
    expect(marqueeSrc).toContain('visible');
    expect(marqueeSrc).toContain('items');

    const containerSrc = readFileText('src/components/storefront/storefront-container.tsx');
    const pageSrc = readFileText('src/app/page.tsx');
    expect(
      containerSrc.includes('MarqueeBar') || pageSrc.includes('MarqueeBar')
    ).toBe(true);
  });

  it('34.4 should wire HeroSection to dynamic CMS hero configuration (copy, CTAs, media, toggles)', () => {
    const heroSrc = readFileText('src/components/storefront/hero-section.tsx');

    expect(
      heroSrc.includes('heroConfig') ||
        heroSrc.includes('heroCms') ||
        heroSrc.includes('cms') ||
        heroSrc.includes('headline')
    ).toBe(true);
    expect(
      heroSrc.includes('enable3DLogo') ||
        heroSrc.includes('show3D') ||
        heroSrc.includes('enable3d')
    ).toBe(true);
    expect(
      heroSrc.includes('showSearchPill') ||
        heroSrc.includes('showSearch')
    ).toBe(true);
  });

  it('34.5 should pass live CMS data from src/app/page.tsx into StorefrontContainer with dynamic rendering', () => {
    const pageSrc = readFileText('src/app/page.tsx');
    const containerSrc = readFileText('src/components/storefront/storefront-container.tsx');

    expect(pageSrc).toContain('getStorefrontCms');
    expect(pageSrc.includes('force-dynamic') || pageSrc.includes('revalidate = 0')).toBe(true);
    expect(containerSrc).toContain('cms');
  });
}, { tier: 1, featureId: 34 });
