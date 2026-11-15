import { describe, it, expect } from '../framework.ts';
import {
  getDropsSync,
  getActiveDrop,
  getDropBySlug,
  saveDrop,
  setActiveDrop,
  deleteDrop,
  CURRENT_ACTIVE_DROP,
  DROPS_CATALOG,
} from '../../src/lib/drops.ts';

describe('Feature 23: Dynamic Atelier Drop System & Admin Persistence', () => {
  it('23.1 should retrieve dynamic drops catalog from store', () => {
    const drops = getDropsSync();
    expect(drops).toBeDefined();
    expect(drops.length).toBeGreaterThanOrEqual(1);
    expect(DROPS_CATALOG.length).toBe(drops.length);
  });

  it('23.2 should identify and return currently active drop', () => {
    const active = getActiveDrop();
    expect(active).toBeDefined();
    expect(active.status).toBe('active');
    expect(CURRENT_ACTIVE_DROP.id).toBe(active.id);
  });

  it('23.3 should retrieve drop by slug or id', () => {
    const active = getActiveDrop();
    const foundBySlug = getDropBySlug(active.slug);
    expect(foundBySlug).toBeDefined();
    expect(foundBySlug?.id).toBe(active.id);

    const foundById = getDropBySlug(active.id);
    expect(foundById).toBeDefined();
    expect(foundById?.slug).toBe(active.slug);
  });

  it('23.4 should create and persist new drop to store', async () => {
    const testDropTitle = `TEST DROP ${Date.now()}`;
    const created = await saveDrop({
      title: testDropTitle,
      chapter: 'CHAPTER 99',
      number: '99',
      status: 'upcoming',
      totalPieces: 99,
      releaseDate: { tr: 'TEST 2026', en: 'TEST 2026' },
      edition: { tr: '99 PARÇA', en: '99 PIECES' },
      description: { tr: 'Test döküm', en: 'Test run' },
      productSlugs: ['pretty-chaos-tee'],
      bannerImage: '/assets/editorial/hero-desktop.jpg',
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe(testDropTitle);

    const found = getDropBySlug(created.slug);
    expect(found).toBeDefined();
    expect(found?.title).toBe(testDropTitle);

    // Clean up test drop
    await deleteDrop(created.id);
  });

  it('23.5 should activate a drop and automatically archive previous active drop', async () => {
    const drops = getDropsSync();
    const initialActive = getActiveDrop();

    // Pick another drop or create temporary one to activate
    const otherDrop = drops.find((d) => d.id !== initialActive.id) || await saveDrop({
      title: 'TEMP DROP',
      chapter: 'CHAPTER T',
      number: '98',
      status: 'upcoming',
      totalPieces: 50,
      releaseDate: { tr: '2026', en: '2026' },
      edition: { tr: '50', en: '50' },
      description: { tr: 'Temp', en: 'Temp' },
      productSlugs: [],
      bannerImage: '/assets/editorial/hero-desktop.jpg',
    });

    const activated = await setActiveDrop(otherDrop.id);
    expect(activated).toBeDefined();
    expect(getActiveDrop().id).toBe(otherDrop.id);

    // Initial drop must now be archived
    const updatedInitial = getDropBySlug(initialActive.id);
    expect(updatedInitial?.status).toBe('archived');

    // Restore initial active drop
    await setActiveDrop(initialActive.id);
    expect(getActiveDrop().id).toBe(initialActive.id);

    if (otherDrop.title === 'TEMP DROP') {
      await deleteDrop(otherDrop.id);
    }
  });
});
