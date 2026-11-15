/**
 * WhatsApp Ordering & Sanitization Helpers
 * Contract: Feature 11, 12, and 7
 */

import prisma from "@/lib/db";
import { INITIAL_STORE_SETTINGS } from "@/lib/seed-data";
import { sanitizeCustomerText } from "@/lib/validations";

export { sanitizeCustomerText };

/**
 * Normalizes phone numbers to clean international E.164 digits without '+', spaces, or punctuation.
 * Throws an error if no digits are found.
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== "string") {
    throw new Error("Invalid phone number: no digits found");
  }
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    throw new Error("Invalid phone number: no digits found");
  }
  return digits;
}

export interface WhatsAppOrderInput {
  productId: string;
  productName: string;
  variant?: string;
  price: number;
  currency: string;
  customerNotes?: string;
  timestamp?: string | Date;
}

export interface ResolvedStoreConfig {
  whatsappNumber: string;
  currency: string;
}

/**
 * Resolves current store settings dynamically from database
 * with resilient in-memory fallback to INITIAL_STORE_SETTINGS.
 */
export async function getActiveStoreConfig(): Promise<ResolvedStoreConfig> {
  try {
    const settings = await prisma.storeSettings.findFirst();
    return {
      whatsappNumber: settings?.whatsappNumber || INITIAL_STORE_SETTINGS.whatsappNumber,
      currency: settings?.currency?.toUpperCase() || INITIAL_STORE_SETTINGS.currency,
    };
  } catch (err) {
    console.warn("[WhatsApp Engine] Failed to fetch StoreSettings from database, falling back to seed defaults:", err);
    return {
      whatsappNumber: INITIAL_STORE_SETTINGS.whatsappNumber,
      currency: INITIAL_STORE_SETTINGS.currency,
    };
  }
}

/**
 * Formats a brutalist monospace order manifest and encodes it into a https://wa.me/<number>?text= URL.
 */
export function generateWhatsAppOrderUrl(
  whatsappNumber: string,
  order: WhatsAppOrderInput
): string {
  const cleanPhone = sanitizePhoneNumber(whatsappNumber);
  const cleanNotes = order.customerNotes
    ? sanitizeCustomerText(order.customerNotes)
    : "";
  const cleanVariant = order.variant
    ? sanitizeCustomerText(order.variant)
    : "";

  const formattedTime = order.timestamp
    ? typeof order.timestamp === "string"
      ? order.timestamp
      : order.timestamp.toISOString()
    : null;

  const lines = [
    `*NEW ORDER - CYRUX STUDIO*`,
    `Product: ${order.productName.trim()}`,
    cleanVariant ? `Variant: ${cleanVariant}` : null,
    `Price: ${order.price.toFixed(2)} ${order.currency.toUpperCase()}`,
    formattedTime ? `Time: ${formattedTime}` : null,
    cleanNotes ? `Notes: ${cleanNotes}` : null,
    `Ref ID: ${order.productId}`,
  ].filter(Boolean);

  const encodedText = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * High-level helper: dynamically resolves current store settings from DB and generates wa.me URL.
 */
export async function generateDynamicWhatsAppOrderUrl(
  order: Omit<WhatsAppOrderInput, "currency"> & { currency?: string; whatsappNumber?: string }
): Promise<string> {
  const config = await getActiveStoreConfig();
  const phone = order.whatsappNumber || config.whatsappNumber;
  const currency = order.currency || config.currency;

  return generateWhatsAppOrderUrl(phone, {
    ...order,
    currency,
  });
}

export interface WhatsAppCartLine {
  productId: string;
  productName: string;
  variant?: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Builds ONE wa.me URL containing every cart line. Prices must be DB-resolved by the caller.
 */
export function generateWhatsAppCartUrl(
  whatsappNumber: string,
  cart: { lines: WhatsAppCartLine[]; currency: string; customerNotes?: string; timestamp?: string }
): string {
  const cleanPhone = sanitizePhoneNumber(whatsappNumber);
  const currency = cart.currency.toUpperCase();
  let total = 0;
  const lineTexts = cart.lines.map((l, i) => {
    const lineTotal = l.unitPrice * l.quantity;
    total += lineTotal;
    const variant = l.variant ? ` [${sanitizeCustomerText(l.variant)}]` : "";
    return `${i + 1}. ${l.productName.trim()}${variant} x${l.quantity} - ${lineTotal.toFixed(2)} ${currency} (Ref: ${l.productId})`;
  });
  const cleanNotes = cart.customerNotes ? sanitizeCustomerText(cart.customerNotes) : "";
  const lines = [
    `*NEW ORDER - CYRUX STUDIO*`,
    ...lineTexts,
    `*Total: ${total.toFixed(2)} ${currency}*`,
    cart.timestamp ? `Time: ${cart.timestamp}` : null,
    cleanNotes ? `Notes: ${cleanNotes}` : null,
  ].filter(Boolean);

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
}
