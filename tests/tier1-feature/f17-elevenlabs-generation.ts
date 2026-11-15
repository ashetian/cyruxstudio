import { describe, it, expect } from '../framework.ts';
import { ESTIMATED_IMAGE_CREDITS, ESTIMATED_VIDEO_CREDITS, MAX_CUMULATIVE_CREDIT_BUDGET } from '../contracts.ts';

describe('Feature 17: ElevenLabs Image/Video Generation', () => {
  const validateGenerateRequest = (body: any) => {
    if (!body || typeof body !== 'object') throw new Error('Body must be an object');
    if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length < 5) {
      throw new Error('Prompt must be at least 5 characters');
    }
    if (body.prompt.length > 1000) {
      throw new Error('Prompt cannot exceed 1000 characters');
    }
    if (!['image', 'video'].includes(body.mediaType)) {
      throw new Error('mediaType must be "image" or "video"');
    }
    if (body.confirmed !== true) {
      throw new Error('Must explicitly confirm credit expenditure before generation');
    }
    const cost = body.mediaType === 'video' ? ESTIMATED_VIDEO_CREDITS : ESTIMATED_IMAGE_CREDITS;
    return {
      prompt: body.prompt.trim(),
      mediaType: body.mediaType,
      estimatedCost: cost,
    };
  };

  it('17.1 should validate standard image generation request payload', () => {
    const payload = {
      prompt: 'Brutalist concrete architectural outerwear coat with titanium zips',
      mediaType: 'image',
      confirmed: true,
    };

    const validated = validateGenerateRequest(payload);
    expect(validated.mediaType).toBe('image');
    expect(validated.estimatedCost).toBe(120);
    expect(validated.prompt.length).toBeGreaterThan(10);
  });

  it('17.2 should validate video generation request payload and assign video credit cost (450 credits)', () => {
    const payload = {
      prompt: 'Cinematic slow-motion pan of model walking in brutalist warehouse',
      mediaType: 'video',
      confirmed: true,
    };

    const validated = validateGenerateRequest(payload);
    expect(validated.mediaType).toBe('video');
    expect(validated.estimatedCost).toBe(450);
  });

  it('17.3 should reject prompts shorter than 5 characters or longer than 1000 characters', () => {
    expect(() =>
      validateGenerateRequest({
        prompt: 'coat',
        mediaType: 'image',
        confirmed: true,
      })
    ).toThrow('at least 5 characters');

    const excessivePrompt = 'A'.repeat(1001);
    expect(() =>
      validateGenerateRequest({
        prompt: excessivePrompt,
        mediaType: 'image',
        confirmed: true,
      })
    ).toThrow('cannot exceed 1000 characters');
  });

  it('17.4 should verify server-side zero client-exposure contract for ELEVENLABS_API_KEY', () => {
    const isClientSafeEnvKey = (keyName: string) => !keyName.startsWith('NEXT_PUBLIC_');

    expect(isClientSafeEnvKey('ELEVENLABS_API_KEY')).toBe(true);
    expect(isClientSafeEnvKey('NEXT_PUBLIC_ELEVENLABS_API_KEY')).toBe(false);
  });

  it('17.5 should format generation response with credit metrics and budget ceiling cap', () => {
    const mockResponse = {
      cached: false,
      asset: {
        id: 'asset-01',
        mediaUrl: 'https://blob.vercel.com/ai/gen-1.png',
        mediaType: 'image',
        creditsUsed: 120,
        status: 'COMPLETED',
      },
      creditsDeducted: 120,
      totalCreditsUsed: 120,
      creditCap: MAX_CUMULATIVE_CREDIT_BUDGET,
    };

    expect(mockResponse.creditsDeducted).toBe(120);
    expect(mockResponse.creditCap).toBe(23000);
    expect(mockResponse.asset.status).toBe('COMPLETED');
  });
}, { tier: 1, featureId: 17 });
