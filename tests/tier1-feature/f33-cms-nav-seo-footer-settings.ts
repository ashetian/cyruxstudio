import { describe, it, expect } from '../framework.ts';
import {
  fileExists,
  readFileText,
  listFilesRecursive,
  hasWhiteAtelierTokens,
  hasAccessibleTouchTargets,
  findAdminDarkThemeRemnants,
} from '../phase2-helpers.ts';

function getGlobalCmsSource(): string {
  const cmsDirFiles = listFilesRecursive('src/components/admin/cms', ['.ts', '.tsx']);
  const studio = fileExists('src/components/admin/cms-studio.tsx')
    ? readFileText('src/components/admin/cms-studio.tsx')
    : '';
  return [studio, ...cmsDirFiles.map((f) => readFileText(f))].join('\n');
}

describe('Feature 33: Admin Global Navigation, SEO, Footer & StoreSettings Editors', () => {
  it('33.1 should provide Navigation CMS editor supporting floating nav and drawer links', () => {
    const combined = getGlobalCmsSource();
    expect(combined).toContain('navigation');
    expect(combined.includes('floatingLinks') || combined.includes('navLinks') || combined.includes('links')).toBe(true);
    expect(combined.includes('drawerLinks') || combined.includes('href')).toBe(true);
  });

  it('33.2 should provide SEO CMS editor supporting site title, meta description, keywords, OG image, and language', () => {
    const combined = getGlobalCmsSource();
    expect(combined).toContain('seo');
    expect(combined).toContain('title');
    expect(combined).toContain('description');
    expect(combined).toContain('keywords');
    expect(combined.includes('ogImage') || combined.includes('openGraph')).toBe(true);
  });

  it('33.3 should provide Footer CMS editor supporting monumental rows, copyright, and credit line', () => {
    const combined = getGlobalCmsSource();
    expect(combined).toContain('footer');
    expect(combined.includes('copyright') || combined.includes('rows')).toBe(true);
    expect(combined.includes('credit') || combined.includes('creditLabel') || combined.includes('madeWith')).toBe(true);
  });

  it('33.4 should update StoreSettingsForm in store-settings-form.tsx with White Atelier theme and shipping/theme controls', () => {
    const settingsSrc = readFileText('src/components/admin/store-settings-form.tsx');
    expect(settingsSrc).toContain('export function StoreSettingsForm');
    expect(settingsSrc).toContain('onSaved');
    expect(settingsSrc).toContain('whatsappNumber');
    expect(settingsSrc).toContain('currency');
    expect(settingsSrc).toContain('freeShippingThreshold');
    expect(
      settingsSrc.includes('shippingFee') || settingsSrc.includes('defaultShippingFee')
    ).toBe(true);

    expect(hasWhiteAtelierTokens(settingsSrc)).toBe(true);
    expect(findAdminDarkThemeRemnants(settingsSrc)).toHaveLength(0);
  });

  it('33.5 should enforce >=44px tap targets and text-base mobile inputs in StoreSettingsForm & Global CMS editors', () => {
    const settingsSrc = readFileText('src/components/admin/store-settings-form.tsx');
    expect(hasAccessibleTouchTargets(settingsSrc)).toBe(true);
    expect(settingsSrc).toContain('text-base');
    expect(settingsSrc).toContain('cursor-pointer');
  });
}, { tier: 1, featureId: 33 });
