import { describe, it, expect } from '../framework.ts';
import {
  fileExists,
  readFileText,
  listFilesRecursive,
  findDoubleSlashUiStrings,
  findForbiddenJargon,
  findPulsingDotOrGlowRemnants,
  hasAccessibleTouchTargets,
  FORBIDDEN_STOREFRONT_JARGON,
} from '../phase2-helpers.ts';

function getStorefrontFiles(): string[] {
  const appFiles = listFilesRecursive('src/app', ['.ts', '.tsx']).filter(
    (f) => !f.startsWith('src/app/admin') && !f.startsWith('src/app/api')
  );
  const storefrontComponents = listFilesRecursive('src/components/storefront', ['.ts', '.tsx']);
  return [...appFiles, ...storefrontComponents];
}

describe('Feature 36: Dynamic Brand Routes & Storefront Pure UI Cleanup', () => {
  it('36.1 should provide dedicated dynamic brand routes (/shop, /about, /faq, /contact, /legal) reading live CMS data', () => {
    const routes = [
      'src/app/shop/page.tsx',
      'src/app/about/page.tsx',
      'src/app/faq/page.tsx',
      'src/app/contact/page.tsx',
      'src/app/legal/page.tsx',
    ];

    for (const routeFile of routes) {
      expect(fileExists(routeFile)).toBe(true);
      const src = readFileText(routeFile);
      expect(
        src.includes('getStorefrontCms') ||
          src.includes('getCmsSection') ||
          src.includes('prisma.')
      ).toBe(true);
    }
  });

  it('36.2 should implement FaqSection and ContactSection and wire AboutSection, LegalModal, and StudioFooter to CMS data', () => {
    expect(fileExists('src/components/storefront/faq-section.tsx')).toBe(true);
    expect(fileExists('src/components/storefront/contact-section.tsx')).toBe(true);

    const faqSrc = readFileText('src/components/storefront/faq-section.tsx');
    const contactSrc = readFileText('src/components/storefront/contact-section.tsx');
    const aboutSrc = readFileText('src/components/storefront/about-section.tsx');
    const legalSrc = readFileText('src/components/storefront/legal-modal.tsx');
    const footerSrc = readFileText('src/components/storefront/studio-footer.tsx');

    expect(faqSrc).toContain('items');
    expect(contactSrc).toContain('email');
    expect(aboutSrc.includes('aboutCms') || aboutSrc.includes('cms') || aboutSrc.includes('blocks') || aboutSrc.includes('headline')).toBe(true);
    expect(legalSrc.includes('legalCms') || legalSrc.includes('cms') || legalSrc.includes('documents')).toBe(true);
    expect(footerSrc.includes('footerCms') || footerSrc.includes('cms') || footerSrc.includes('rows')).toBe(true);
  });

  it('36.3 should remove double-slash labels (// 404 ERROR //) from src/app/not-found.tsx', () => {
    const notFoundSrc = readFileText('src/app/not-found.tsx');
    expect(notFoundSrc).not.toContain('// 404');
    expect(findDoubleSlashUiStrings(notFoundSrc)).toHaveLength(0);
  });

  it('36.4 should remove 35.1856° N coordinates and cyberpunk/HARDWARE/SPECIMEN sci-fi jargon across storefront & seed data', () => {
    const files = [...getStorefrontFiles(), 'src/lib/seed-data.ts'];
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileText(file);
      const hits = findForbiddenJargon(content, FORBIDDEN_STOREFRONT_JARGON);
      for (const hit of hits) {
        violations.push(`${file} -> ${hit}`);
      }
    }
    expect(violations).toHaveLength(0);
  });

  it('36.5 should eliminate double-slash UI copy and decorative animate-pulse dots/hearts across storefront', () => {
    const files = getStorefrontFiles();
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileText(file);
      for (const hit of findDoubleSlashUiStrings(content)) {
        violations.push(`${file} [//] -> ${hit}`);
      }
      for (const hit of findPulsingDotOrGlowRemnants(content)) {
        violations.push(`${file} [pulse/glow] -> ${hit}`);
      }
    }
    expect(violations).toHaveLength(0);
  });

  it('36.6 should enforce >=44px mobile touch targets on primary storefront navigation, footer, and drawer controls', () => {
    const files = [
      'src/components/storefront/floating-nav.tsx',
      'src/components/storefront/studio-footer.tsx',
      'src/components/storefront/menu-drawer.tsx',
      'src/components/storefront/cart-drawer.tsx',
    ];

    for (const file of files) {
      const content = readFileText(file);
      expect(hasAccessibleTouchTargets(content)).toBe(true);
    }

    // Ensure studio-footer legal links don't shrink below 44px on mobile (had min-h-[36px])
    const footerSrc = readFileText('src/components/storefront/studio-footer.tsx');
    expect(footerSrc).not.toContain('min-h-[36px]');
  });
}, { tier: 1, featureId: 36 });
