/**
 * cyrux studio - E2E Testing Contracts & Reference Specification Models
 *
 * Implements authoritative reference logic directly derived from PROJECT.md & ORIGINAL_REQUEST.md.
 * Used for opaque-box contract verification, schema validations, and end-to-end integration assertions.
 */

import crypto from 'node:crypto';

// ==========================================
// 1. Core Constants & Budget Invariants
// ==========================================
export const MAX_CUMULATIVE_CREDIT_BUDGET = 23000;
export const ESTIMATED_IMAGE_CREDITS = 120;
export const ESTIMATED_VIDEO_CREDITS = 450;

export const BRAND_TOKENS = {
  CANVAS_BG: '#F7F5EE',
  DARK_HERO: '#0A0A0A',
  CREAM_DISPLAY: '#FAF8F3',
  MUTED_BORDER: '#E6E3DA',
  TEXT_PRIMARY: '#0A0A0A',
};

export const ALLOWED_BLOB_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'video/mp4',
  'video/quicktime',
];

// ==========================================
// 2. Cryptographic & Deduplication Logic
// ==========================================
export function computePromptHash(
  prompt: string,
  mediaType: 'image' | 'video',
  options: Record<string, any> = {}
): string {
  const normalizedPrompt = prompt.trim().toLowerCase();
  const sortedKeys = Object.keys(options).sort();
  const sortedOptions: Record<string, any> = {};
  for (const k of sortedKeys) {
    sortedOptions[k] = options[k];
  }
  const payload = `${normalizedPrompt}:${mediaType}:${JSON.stringify(sortedOptions)}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ==========================================
// 3. WhatsApp Ordering & Phone Sanitization
// ==========================================
export function sanitizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    throw new Error('Invalid phone number: no digits found');
  }
  return digits;
}

export function sanitizeCustomerText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/['";\\]/g, '') // Strip SQL/script injection characters
    .trim();
}

export interface WhatsAppOrderInput {
  productId: string;
  productName: string;
  variant?: string;
  price: number;
  currency: string;
  customerNotes?: string;
}

export function generateWhatsAppOrderUrl(
  whatsappNumber: string,
  order: WhatsAppOrderInput
): string {
  const cleanPhone = sanitizePhoneNumber(whatsappNumber);
  const cleanNotes = order.customerNotes ? sanitizeCustomerText(order.customerNotes) : '';

  const lines = [
    `*NEW ORDER - CYRUX STUDIO*`,
    `Product: ${order.productName.trim()}`,
    order.variant ? `Variant: ${order.variant.trim()}` : null,
    `Price: ${order.price.toFixed(2)} ${order.currency.toUpperCase()}`,
    cleanNotes ? `Notes: ${cleanNotes}` : null,
    `Ref ID: ${order.productId}`,
  ].filter(Boolean);

  const encodedText = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

// ==========================================
// 4. ElevenLabs Credit Guard Invariant
// ==========================================
export class CreditLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CreditLimitExceededError';
  }
}

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
    throw new Error('Estimated cost cannot be negative');
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

// ==========================================
// 5. Jose JWT Admin Auth Simulation
// ==========================================
export function createMockAdminJwt(
  secret: string,
  payload: { sub: string; role: string; exp?: number }
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = payload.exp ?? Math.floor(Date.now() / 1000) + 3600; // 1 hour default
  const body = { ...payload, exp };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedBody = Buffer.from(JSON.stringify(body)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedBody}.${signature}`;
}

export function verifyMockAdminJwt(
  token: string,
  secret: string
): { valid: boolean; payload?: any; error?: string } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [encodedHeader, encodedBody, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expSigBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expSigBuf.length || !crypto.timingSafeEqual(sigBuf, expSigBuf)) {
    return { valid: false, error: 'Invalid signature' };
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired', payload };
    }
    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
