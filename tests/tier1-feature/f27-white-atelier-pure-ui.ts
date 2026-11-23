import { describe, it, expect } from '../framework.ts';
import {
  listFilesRecursive,
  readFileText,
  findAdminDarkThemeRemnants,
  findDoubleSlashUiStrings,
  findForbiddenJargon,
  findEmojiInUiCopy,
  findPulsingDotOrGlowRemnants,
  hasWhiteAtelierTokens,
  FORBIDDEN_HUD_PATTERNS,
} from '../phase2-helpers.ts';

function getAdminFiles(): string[] {
  return [
    ...listFilesRecursive('src/app/admin', ['.ts', '.tsx']),
    ...listFilesRecursive('src/components/admin', ['.ts', '.tsx']),
  ];
}

describe('Feature 27: White Atelier Admin Theme & Pure UI Remediation', () => {
  it('27.1 should style src/app/admin/layout.tsx and src/app/admin/login/page.tsx in White Atelier light theme with zero dark remnants', () => {
    const layoutSrc = readFileText('src/app/admin/layout.tsx');
    const loginSrc = readFileText('src/app/admin/login/page.tsx');

    expect(hasWhiteAtelierTokens(layoutSrc)).toBe(true);
    expect(hasWhiteAtelierTokens(loginSrc)).toBe(true);

    expect(findAdminDarkThemeRemnants(layoutSrc)).toHaveLength(0);
    expect(findAdminDarkThemeRemnants(loginSrc)).toHaveLength(0);
  });

  it('27.2 should eliminate dark shell/card/modal surface remnants across all admin components', () => {
    const adminFiles = getAdminFiles();
    expect(adminFiles.length).toBeGreaterThanOrEqual(5);

    const violations: string[] = [];
    for (const file of adminFiles) {
      const content = readFileText(file);
      const darkHits = findAdminDarkThemeRemnants(content);
      for (const hit of darkHits) {
        violations.push(`${file} -> ${hit}`);
      }
    }
    expect(violations).toHaveLength(0);
  });

  it('27.3 should contain zero double-slash (//) UI strings across all admin pages and components', () => {
    const adminFiles = getAdminFiles();
    const violations: string[] = [];

    for (const file of adminFiles) {
      const content = readFileText(file);
      const slashHits = findDoubleSlashUiStrings(content);
      for (const hit of slashHits) {
        violations.push(`${file} -> ${hit}`);
      }
    }
    expect(violations).toHaveLength(0);
  });

  it('27.4 should contain zero sci-fi HUD jargon or fake telemetry labels across all admin files', () => {
    const adminFiles = getAdminFiles();
    const violations: string[] = [];

    for (const file of adminFiles) {
      const content = readFileText(file);
      const hudHits = findForbiddenJargon(content, FORBIDDEN_HUD_PATTERNS);
      for (const hit of hudHits) {
        violations.push(`${file} -> ${hit}`);
      }
    }
    expect(violations).toHaveLength(0);
  });

  it('27.5 should contain zero emoji icons and zero decorative pulsing dots/glows across all admin files', () => {
    const adminFiles = getAdminFiles();
    const violations: string[] = [];

    for (const file of adminFiles) {
      const content = readFileText(file);
      for (const hit of findEmojiInUiCopy(content)) {
        violations.push(`${file} [emoji] -> ${hit}`);
      }
      for (const hit of findPulsingDotOrGlowRemnants(content)) {
        violations.push(`${file} [pulse/glow] -> ${hit}`);
      }
    }
    expect(violations).toHaveLength(0);
  });
}, { tier: 1, featureId: 27 });
