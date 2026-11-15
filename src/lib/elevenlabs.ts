import crypto from "node:crypto";

export const MAX_CUMULATIVE_CREDIT_BUDGET = 23000;
export const ESTIMATED_IMAGE_CREDITS = 120;
export const ESTIMATED_VIDEO_CREDITS = 450;

export class CreditLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreditLimitExceededError";
  }
}

/**
 * Computes deterministic SHA-256 hash of prompt, media type, and sorted options
 * for instant asset deduplication and cache hits.
 */
export function computePromptHash(
  prompt: string,
  mediaType: "image" | "video",
  options: Record<string, unknown> = {}
): string {
  const normalizedPrompt = prompt.trim().toLowerCase();
  const sortedKeys = Object.keys(options).sort();
  const sortedOptions: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    sortedOptions[k] = options[k];
  }
  const payload = `${normalizedPrompt}:${mediaType}:${JSON.stringify(sortedOptions)}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Evaluates current credit usage against 23,000 credit ceiling budget guard.
 */
export function evaluateCreditBudget(
  currentCreditsUsed: number,
  estimatedCost: number
): {
  allowed: boolean;
  currentUsed: number;
  remaining: number;
  newTotal: number;
} {
  if (estimatedCost < 0) {
    throw new Error("Estimated cost cannot be negative");
  }
  const newTotal = currentCreditsUsed + estimatedCost;
  const remaining = Math.max(0, MAX_CUMULATIVE_CREDIT_BUDGET - currentCreditsUsed);
  const allowed = newTotal <= MAX_CUMULATIVE_CREDIT_BUDGET;

  if (!allowed) {
    throw new CreditLimitExceededError(
      `Credit budget ceiling exceeded. Current: ${currentCreditsUsed}, Requested: ${estimatedCost}, Cap: ${MAX_CUMULATIVE_CREDIT_BUDGET}. Remaining: ${remaining}`
    );
  }

  return { allowed, currentUsed: currentCreditsUsed, remaining, newTotal };
}
