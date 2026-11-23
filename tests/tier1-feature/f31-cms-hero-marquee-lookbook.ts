import { describe, it, expect } from '../framework.ts';
import {
  fileExists,
  readFileText,
  listFilesRecursive,
  hasWhiteAtelierTokens,
  hasAccessibleTouchTargets,
  findAdminDarkThemeRemnants,
} from '../phase2-helpers.ts';

function getCmsEditorCombinedSource(): string {
  const cmsDirFiles = listFilesRecursive('src/components/admin/cms', ['.ts', '.tsx']);
  const studio = fileExists('src/components/admin/cms-studio.tsx')
    ? readFileText('src/components/admin/cms-studio.tsx')
    : '';
  return [studio, ...cmsDirFiles.map((f) => readFileText(f))].join('\n');
}

describe('Feature 31: Admin Hero, Marquee & Lookbook/Archive CMS Editors', () => {
  it('31.1 should implement CmsStudio in cms-studio.tsx matching the M8<->M9 contract and wire into admin-dashboard.tsx', () => {
    expect(fileExists('src/components/admin/cms-studio.tsx')).toBe(true);

    const studioSrc = readFileText('src/components/admin/cms-studio.tsx');
    expect(studioSrc).toContain('export function CmsStudio');
    expect(studioSrc).toContain('initialSection');
    expect(studioSrc).toContain('onSaved');
    expect(hasWhiteAtelierTokens(studioSrc)).toBe(true);
    expect(findAdminDarkThemeRemnants(studioSrc)).toHaveLength(0);

    const cmsEditorFiles = listFilesRecursive('src/components/admin/cms', ['.ts', '.tsx']);
    expect(cmsEditorFiles.length).toBeGreaterThanOrEqual(3);

    const dashboardSrc = readFileText('src/components/admin/admin-dashboard.tsx');
    expect(dashboardSrc).toContain('CmsStudio');
  });

  it('31.2 should provide Hero CMS editor supporting bilingual headlines, CTAs, media URLs, video, and 3D/search toggles', () => {
    const combined = getCmsEditorCombinedSource();
    expect(combined).toContain('hero');
    expect(combined).toContain('desktopImage');
    expect(combined).toContain('mobileImage');
    expect(
      combined.includes('enable3DLogo') ||
        combined.includes('show3D') ||
        combined.includes('enable3d')
    ).toBe(true);
    expect(
      combined.includes('showSearchPill') ||
        combined.includes('showSearch')
    ).toBe(true);
  });

  it('31.3 should provide Marquee / Announcement CMS editor supporting items, links, visibility, and speed', () => {
    const combined = getCmsEditorCombinedSource();
    expect(combined).toContain('marquee');
    expect(combined.includes('speedSeconds') || combined.includes('speed')).toBe(true);
    expect(combined.includes('visible') || combined.includes('enabled')).toBe(true);
    expect(combined).toContain('items');
  });

  it('31.4 should provide Lookbook / Archive CMS editor supporting CampaignBlock cards, video URL, and labels', () => {
    const combined = getCmsEditorCombinedSource();
    expect(combined).toContain('lookbook');
    expect(combined.includes('videoUrl') || combined.includes('video')).toBe(true);
    expect(combined.includes('cards') || combined.includes('editorial')).toBe(true);
  });

  it('31.5 should save Hero/Marquee/Lookbook via /api/admin/cms/[section] with White Atelier mobile ergonomics', () => {
    const cmsFiles = [
      'src/components/admin/cms-studio.tsx',
      ...listFilesRecursive('src/components/admin/cms', ['.ts', '.tsx']),
    ];

    const combined = cmsFiles.map((f) => readFileText(f)).join('\n');
    expect(combined).toContain('/api/admin/cms');

    for (const file of cmsFiles) {
      const src = readFileText(file);
      expect(findAdminDarkThemeRemnants(src)).toHaveLength(0);
      if (src.includes('<button') || src.includes('<input')) {
        expect(hasAccessibleTouchTargets(src)).toBe(true);
      }
    }
  });
}, { tier: 1, featureId: 31 });
