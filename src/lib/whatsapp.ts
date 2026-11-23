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
  lang?: "tr" | "en";
  orderNumber?: string;
  couponCode?: string;
  discountAmount?: number;
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
  const isTr = order.lang === "tr";
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

  const upperCurrency = order.currency.toUpperCase();
  const couponLine =
    order.couponCode && typeof order.discountAmount === "number" && order.discountAmount > 0
      ? isTr
        ? `Kupon: ${order.couponCode} (-${order.discountAmount.toFixed(2)} ${upperCurrency})`
        : `Coupon: ${order.couponCode} (-${order.discountAmount.toFixed(2)} ${upperCurrency})`
      : null;

  const lines = [
    isTr ? `*YENİ SİPARİŞ - CYRUX STUDIO*` : `*NEW ORDER - CYRUX STUDIO*`,
    order.orderNumber ? (isTr ? `Sipariş No: ${order.orderNumber}` : `Order No: ${order.orderNumber}`) : null,
    isTr ? `Ürün: ${order.productName.trim()}` : `Product: ${order.productName.trim()}`,
    cleanVariant ? (isTr ? `Beden: ${cleanVariant}` : `Variant: ${cleanVariant}`) : null,
    isTr
      ? `Fiyat: ${order.price.toFixed(2)} ${upperCurrency}`
      : `Price: ${order.price.toFixed(2)} ${upperCurrency}`,
    couponLine,
    formattedTime ? (isTr ? `Tarih: ${formattedTime}` : `Time: ${formattedTime}`) : null,
    cleanNotes ? (isTr ? `Not: ${cleanNotes}` : `Notes: ${cleanNotes}`) : null,
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
  cart: {
    lines: WhatsAppCartLine[];
    currency: string;
    customerNotes?: string;
    timestamp?: string;
    lang?: "tr" | "en";
    orderNumber?: string;
    couponCode?: string;
    discountAmount?: number;
    finalTotal?: number;
  }
): string {
  const isTr = cart.lang === "tr";
  const cleanPhone = sanitizePhoneNumber(whatsappNumber);
  const currency = cart.currency.toUpperCase();
  let subtotal = 0;
  const lineTexts = cart.lines.map((l, i) => {
    const lineTotal = l.unitPrice * l.quantity;
    subtotal += lineTotal;
    const variant = l.variant ? ` [${sanitizeCustomerText(l.variant)}]` : "";
    return `${i + 1}. ${l.productName.trim()}${variant} x${l.quantity} - ${lineTotal.toFixed(2)} ${currency} (Ref: ${l.productId})`;
  });
  const total =
    typeof cart.finalTotal === "number" && Number.isFinite(cart.finalTotal)
      ? cart.finalTotal
      : subtotal;
  const couponLine =
    cart.couponCode && typeof cart.discountAmount === "number" && cart.discountAmount > 0
      ? isTr
        ? `Kupon: ${cart.couponCode} (-${cart.discountAmount.toFixed(2)} ${currency})`
        : `Coupon: ${cart.couponCode} (-${cart.discountAmount.toFixed(2)} ${currency})`
      : null;
  const cleanNotes = cart.customerNotes ? sanitizeCustomerText(cart.customerNotes) : "";
  const lines = [
    isTr ? `*YENİ SİPARİŞ - CYRUX STUDIO*` : `*NEW ORDER - CYRUX STUDIO*`,
    cart.orderNumber ? (isTr ? `Sipariş No: ${cart.orderNumber}` : `Order No: ${cart.orderNumber}`) : null,
    ...lineTexts,
    couponLine,
    isTr ? `*Toplam: ${total.toFixed(2)} ${currency}*` : `*Total: ${total.toFixed(2)} ${currency}*`,
    cart.timestamp ? (isTr ? `Tarih: ${cart.timestamp}` : `Time: ${cart.timestamp}`) : null,
    cleanNotes ? (isTr ? `Not: ${cleanNotes}` : `Notes: ${cleanNotes}`) : null,
  ].filter(Boolean);

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export interface OrderableVariant {
  id?: string;
  name: string;
  inStock?: boolean;
  stock?: number;
  size?: string;
  color?: string;
  colorHex?: string;
  sku?: string;
  priceModifier?: number;
  imageUrl?: string;
}

export interface VariantMatchResult {
  matched: OrderableVariant | null;
  ambiguous: boolean;
  allSizeMatchesOutOfStock: boolean;
}

function normalizeVariantToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ");
}

/**
 * Strips non-variant entries (such as legacy `{ _metadata }` objects or entries
 * lacking a string `name`/`size`) before variant matching or length checks.
 */
export function filterOrderableVariants(rawVariants: unknown): OrderableVariant[] {
  if (!Array.isArray(rawVariants)) return [];
  const result: OrderableVariant[] = [];
  for (const entry of rawVariants) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    if ("_metadata" in entry) continue;
    const rec = entry as Record<string, unknown>;
    const rawName = typeof rec.name === "string" ? rec.name.trim() : "";
    const rawSize = typeof rec.size === "string" ? rec.size.trim() : "";
    const resolvedName = rawName || rawSize;
    if (!resolvedName) continue;
    result.push({
      id: typeof rec.id === "string" ? rec.id : undefined,
      name: resolvedName,
      inStock: typeof rec.inStock === "boolean" ? rec.inStock : undefined,
      stock: typeof rec.stock === "number" && Number.isFinite(rec.stock) ? rec.stock : undefined,
      size: rawSize || undefined,
      color: typeof rec.color === "string" ? rec.color : undefined,
      colorHex: typeof rec.colorHex === "string" ? rec.colorHex : undefined,
      sku: typeof rec.sku === "string" ? rec.sku : undefined,
      priceModifier:
        typeof rec.priceModifier === "number" && Number.isFinite(rec.priceModifier)
          ? rec.priceModifier
          : undefined,
      imageUrl: typeof rec.imageUrl === "string" ? rec.imageUrl : undefined,
    });
  }
  return result;
}

export function isVariantOutOfStock(
  variant: Pick<OrderableVariant, "inStock" | "stock">
): boolean {
  if (variant.inStock === false) return true;
  if (typeof variant.stock === "number" && Number.isFinite(variant.stock) && variant.stock <= 0) {
    return true;
  }
  return false;
}

/**
 * Matches requested variant by:
 * 1) Exact trimmed case-insensitive `v.name`
 * 2) Slash-spacing-normalized `v.name` (e.g. "noir/s" -> "noir / s")
 * 3) Unambiguous `v.size` fallback (only when exactly 1 variant has that size)
 */
export function resolveProductVariant(
  variants: OrderableVariant[],
  requestedVariant: string | undefined
): VariantMatchResult {
  if (!requestedVariant || variants.length === 0) {
    return { matched: null, ambiguous: false, allSizeMatchesOutOfStock: false };
  }

  const rawTarget = requestedVariant.trim().toLowerCase();
  if (!rawTarget) {
    return { matched: null, ambiguous: false, allSizeMatchesOutOfStock: false };
  }

  const exactMatch = variants.find((v) => v.name.trim().toLowerCase() === rawTarget);
  if (exactMatch) {
    return { matched: exactMatch, ambiguous: false, allSizeMatchesOutOfStock: false };
  }

  const normalizedTarget = normalizeVariantToken(requestedVariant);
  const normalizedMatch = variants.find(
    (v) => normalizeVariantToken(v.name) === normalizedTarget
  );
  if (normalizedMatch) {
    return { matched: normalizedMatch, ambiguous: false, allSizeMatchesOutOfStock: false };
  }

  const sizeMatches = variants.filter(
    (v) => typeof v.size === "string" && v.size.trim().toLowerCase() === rawTarget
  );
  if (sizeMatches.length === 1) {
    return { matched: sizeMatches[0], ambiguous: false, allSizeMatchesOutOfStock: false };
  }
  if (sizeMatches.length > 1) {
    return {
      matched: null,
      ambiguous: true,
      allSizeMatchesOutOfStock: sizeMatches.every((v) => isVariantOutOfStock(v)),
    };
  }

  return { matched: null, ambiguous: false, allSizeMatchesOutOfStock: false };
}
