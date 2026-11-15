import { describe, it, expect } from '../framework.ts';
import { evaluateCreditBudget, CreditLimitExceededError, MAX_CUMULATIVE_CREDIT_BUDGET } from '../contracts.ts';

describe('Feature 18: Strict 23k Credit Budget Guard', () => {
  it('18.1 should allow generation when cumulative usage is well below 23,000 cap', () => {
    const currentUsage = 5000;
    const requestCost = 120; // 1 image
    const evaluation = evaluateCreditBudget(currentUsage, requestCost);

    expect(evaluation.allowed).toBe(true);
    expect(evaluation.newTotal).toBe(5120);
    expect(evaluation.remaining).toBe(MAX_CUMULATIVE_CREDIT_BUDGET - 5000);
  });

  it('18.2 should allow request that lands exactly on the 23,000 ceiling boundary (22,880 + 120 = 23,000)', () => {
    const currentUsage = 22880;
    const requestCost = 120;
    const evaluation = evaluateCreditBudget(currentUsage, requestCost);

    expect(evaluation.allowed).toBe(true);
    expect(evaluation.newTotal).toBe(23000);
  });

  it('18.3 should throw CreditLimitExceededError when request exceeds 23,000 by even 1 single credit', () => {
    const currentUsage = 22881;
    const requestCost = 120; // 22,881 + 120 = 23,001 > 23,000

    expect(() => evaluateCreditBudget(currentUsage, requestCost)).toThrow(CreditLimitExceededError);
    expect(() => evaluateCreditBudget(currentUsage, requestCost)).toThrow('Credit budget ceiling exceeded');
  });

  it('18.4 should reject any request when cumulative usage is already at 23,000', () => {
    const currentUsage = 23000;
    const requestCost = 1;

    expect(() => evaluateCreditBudget(currentUsage, requestCost)).toThrow(CreditLimitExceededError);
  });

  it('18.5 should reject negative estimated costs as invalid input', () => {
    expect(() => evaluateCreditBudget(1000, -50)).toThrow('cannot be negative');
  });
}, { tier: 1, featureId: 18 });
