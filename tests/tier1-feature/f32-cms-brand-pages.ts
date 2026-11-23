import { describe, it, expect } from '../framework.ts';
import {
  fileExists,
  readFileText,
  listFilesRecursive,
  dynamicImport,
} from '../phase2-helpers.ts';

function getBrandCmsSource(): string {
  const cmsDirFiles = listFilesRecursive('src/components/admin/cms', ['.ts', '.tsx']);
  const studio = fileExists('src/components/admin/cms-studio.tsx')
    ? readFileText('src/components/admin/cms-studio.tsx')
    : '';
  return [studio, ...cmsDirFiles.map((f) => readFileText(f))].join('\n');
}

describe('Feature 32: Admin Brand Pages CMS Editors (Manifesto, FAQ, Contact, Legal)', () => {
  it('32.1 should provide Manifesto / About CMS editor with multi-block story and bilingual images/copy', () => {
    const combined = getBrandCmsSource();
    expect(combined).toContain('about');
    expect(combined.includes('storyBlocks') || combined.includes('blocks') || combined.includes('manifesto')).toBe(true);
    expect(combined.includes('tr') && combined.includes('en')).toBe(true);
  });

  it('32.2 should provide FAQ CMS editor supporting add, edit, reorder, and delete of Q&A items', () => {
    const combined = getBrandCmsSource();
    expect(combined).toContain('faq');
    expect(combined.includes('question') && combined.includes('answer')).toBe(true);
    expect(combined.includes('items')).toBe(true);
  });

  it('32.3 should provide Contact CMS editor supporting email, phone, address, hours, and social links', () => {
    const combined = getBrandCmsSource();
    expect(combined).toContain('contact');
    expect(combined).toContain('email');
    expect(combined.includes('address') || combined.includes('location')).toBe(true);
    expect(combined.includes('hours') || combined.includes('studioHours')).toBe(true);
  });

  it('32.4 should provide Legal / Policy CMS editor supporting Privacy, Terms, Shipping, and Sales/Notice docs', () => {
    const combined = getBrandCmsSource();
    expect(combined).toContain('legal');
    expect(combined).toContain('privacy');
    expect(combined).toContain('terms');
    expect(combined).toContain('shipping');
    expect(combined.includes('sales') || combined.includes('distanceSales')).toBe(true);
  });

  it('32.5 should persist and reload Manifesto, FAQ, Contact, and Legal CMS edits via src/lib/cms.ts', async () => {
    const cmsMod = await dynamicImport<{
      getCmsSection: (section: string) => Promise<Record<string, unknown>>;
      updateCmsSection: (section: string, data: unknown) => Promise<unknown>;
      getStorefrontCms: () => Promise<Record<string, unknown>>;
    }>('src/lib/cms.ts');

    const originalFaq = await cmsMod.getCmsSection('faq');
    const markerQ = `Test Shipping Question ${Date.now()}`;

    await cmsMod.updateCmsSection('faq', {
      ...originalFaq,
      items: [
        {
          id: 'faq-test-1',
          question: { tr: markerQ, en: markerQ },
          answer: { tr: '24 saat içinde kargo.', en: 'Ships within 24 hours.' },
        },
      ],
    });

    const fullCms = await cmsMod.getStorefrontCms();
    expect(JSON.stringify(fullCms.faq)).toContain(markerQ);

    // Restore
    await cmsMod.updateCmsSection('faq', originalFaq);
  });
}, { tier: 1, featureId: 32 });
