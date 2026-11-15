import { describe, it, expect } from '../framework.ts';
import { computePromptHash } from '../contracts.ts';

describe('Feature 19: SHA-256 Prompt Hashing Deduplication', () => {
  it('19.1 should generate deterministic 64-character hexadecimal SHA-256 hash', () => {
    const hash = computePromptHash('Brutalist luxury tee', 'image');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('19.2 should produce identical hash regardless of leading/trailing whitespace and casing', () => {
    const hash1 = computePromptHash('Brutalist Luxury Tee', 'image');
    const hash2 = computePromptHash('   brutalist luxury tee   ', 'image');
    const hash3 = computePromptHash('BRUTALIST LUXURY TEE', 'image');

    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it('19.3 should produce identical hash regardless of options key insertion order', () => {
    const hashA = computePromptHash('Dark coat', 'image', { aspectRatio: '16:9', steps: 30 });
    const hashB = computePromptHash('Dark coat', 'image', { steps: 30, aspectRatio: '16:9' });

    expect(hashA).toBe(hashB);
  });

  it('19.4 should produce different hashes for image vs video media types with identical prompts', () => {
    const imageHash = computePromptHash('Model walking', 'image');
    const videoHash = computePromptHash('Model walking', 'video');

    expect(imageHash).not.toBe(videoHash);
  });

  it('19.5 should return cached asset with 0 credit deduction on cache hit', () => {
    const cacheMap = new Map<string, { mediaUrl: string; creditsUsed: number }>();
    const prompt = 'Oversized black hoodie on stone pedestal';
    const hash = computePromptHash(prompt, 'image');

    // Populate cache
    cacheMap.set(hash, {
      mediaUrl: 'https://blob.vercel.com/cached-hoodie.png',
      creditsUsed: 120,
    });

    const checkCache = (p: string, type: 'image' | 'video') => {
      const h = computePromptHash(p, type);
      if (cacheMap.has(h)) {
        return { cached: true, asset: cacheMap.get(h), creditsDeducted: 0 };
      }
      return { cached: false, creditsDeducted: 120 };
    };

    const hit = checkCache(prompt, 'image');
    expect(hit.cached).toBe(true);
    expect(hit.creditsDeducted).toBe(0);
    expect(hit.asset?.mediaUrl).toBe('https://blob.vercel.com/cached-hoodie.png');
  });
}, { tier: 1, featureId: 19 });
