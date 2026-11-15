import { describe, it, expect } from '../framework.ts';
import { ESTIMATED_IMAGE_CREDITS, ESTIMATED_VIDEO_CREDITS, MAX_CUMULATIVE_CREDIT_BUDGET } from '../contracts.ts';

describe('Feature 20: Two-Phase Admin Confirmation Modal', () => {
  interface GenerationReviewState {
    prompt: string;
    mediaType: 'image' | 'video';
    estimatedCredits: number;
    currentUsed: number;
    remainingBefore: number;
    remainingAfter: number;
    canAfford: boolean;
  }

  const prepareConfirmationReview = (
    prompt: string,
    mediaType: 'image' | 'video',
    currentUsed: number
  ): GenerationReviewState => {
    const cost = mediaType === 'video' ? ESTIMATED_VIDEO_CREDITS : ESTIMATED_IMAGE_CREDITS;
    const remainingBefore = Math.max(0, MAX_CUMULATIVE_CREDIT_BUDGET - currentUsed);
    const remainingAfter = Math.max(0, remainingBefore - cost);
    const canAfford = currentUsed + cost <= MAX_CUMULATIVE_CREDIT_BUDGET;

    return {
      prompt,
      mediaType,
      estimatedCredits: cost,
      currentUsed,
      remainingBefore,
      remainingAfter,
      canAfford,
    };
  };

  const executeConfirmedGeneration = (review: GenerationReviewState, confirmed: boolean) => {
    if (!confirmed) {
      throw new Error('Must explicitly confirm credit expenditure before generation');
    }
    if (!review.canAfford) {
      throw new Error('Cannot proceed: estimated cost exceeds remaining credit budget');
    }
    return {
      status: 'EXECUTED',
      creditsDeducted: review.estimatedCredits,
      newBalance: review.currentUsed + review.estimatedCredits,
    };
  };

  it('20.1 should compute Phase 1 cost preview metrics accurately for image generation', () => {
    const review = prepareConfirmationReview('Brutalist eyewear', 'image', 10000);
    expect(review.estimatedCredits).toBe(120);
    expect(review.remainingBefore).toBe(13000);
    expect(review.remainingAfter).toBe(12880);
    expect(review.canAfford).toBe(true);
  });

  it('20.2 should compute Phase 1 cost preview metrics accurately for video generation', () => {
    const review = prepareConfirmationReview('Motion editorial video', 'video', 20000);
    expect(review.estimatedCredits).toBe(450);
    expect(review.remainingBefore).toBe(3000);
    expect(review.remainingAfter).toBe(2550);
    expect(review.canAfford).toBe(true);
  });

  it('20.3 should reject execution when user cancels or confirmed flag is false', () => {
    const review = prepareConfirmationReview('Leather jacket', 'image', 5000);
    expect(() => executeConfirmedGeneration(review, false)).toThrow('Must explicitly confirm');
  });

  it('20.4 should disallow execution even when confirmed if budget is insufficient', () => {
    const review = prepareConfirmationReview('Expensive video', 'video', 22800); // 22,800 + 450 = 23,250 > 23,000
    expect(review.canAfford).toBe(false);
    expect(() => executeConfirmedGeneration(review, true)).toThrow('estimated cost exceeds remaining');
  });

  it('20.5 should execute successfully and update ledger when confirmed and affordable', () => {
    const review = prepareConfirmationReview('Clean monochrome sneaker', 'image', 2000);
    const result = executeConfirmedGeneration(review, true);
    expect(result.status).toBe('EXECUTED');
    expect(result.creditsDeducted).toBe(120);
    expect(result.newBalance).toBe(2120);
  });
}, { tier: 1, featureId: 20 });
