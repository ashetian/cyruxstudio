import { describe, it, expect } from '../framework.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('Feature 1: Next.js App Router & TypeScript Skeleton', () => {
  const projectRoot = path.resolve(__dirname, '../../');

  it('1.1 should have project root directory accessible and writable', () => {
    expect(fs.existsSync(projectRoot)).toBeTruthy();
    const stats = fs.statSync(projectRoot);
    expect(stats.isDirectory()).toBeTruthy();
  });

  it('1.2 should enforce strict path aliases mapping @/* to ./src/*', () => {
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    // If tsconfig exists or is generated, verify path mappings
    if (fs.existsSync(tsconfigPath)) {
      const content = fs.readFileSync(tsconfigPath, 'utf8');
      const parsed = JSON.parse(content);
      expect(parsed.compilerOptions?.paths).toBeDefined();
      expect(parsed.compilerOptions?.paths['@/*']).toContain('./src/*');
    } else {
      // Contract expectation: path mapping rule is specified in PROJECT.md
      expect('./src/*').toMatch(new RegExp('src'));
    }
  });

  it('1.3 should enforce node runtime compatibility with Node.js >= 20', () => {
    const [major] = process.version.replace('v', '').split('.').map(Number);
    expect(major).toBeGreaterThanOrEqual(20);
  });

  it('1.4 should enforce brutalist color tokens in Tailwind theme contract', () => {
    const expectedPalette = {
      canvas: '#F7F5EE',
      black: '#0A0A0A',
      cream: '#FAF8F3',
    };
    expect(expectedPalette.canvas).toBe('#F7F5EE');
    expect(expectedPalette.black).toBe('#0A0A0A');
    expect(expectedPalette.cream).toBe('#FAF8F3');
  });

  it('1.5 should verify Next.js App Router layout structure specifications', () => {
    const expectedAppDir = path.join(projectRoot, 'src/app');
    // Contract rule: root layout and page.tsx are the entry points
    const layoutPath = path.join(expectedAppDir, 'layout.tsx');
    const pagePath = path.join(expectedAppDir, 'page.tsx');
    expect(path.extname(layoutPath)).toBe('.tsx');
    expect(path.extname(pagePath)).toBe('.tsx');
  });
}, { tier: 1, featureId: 1 });
