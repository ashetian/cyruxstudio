import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  filterOrderableVariants,
  generateWhatsAppCartUrl,
  getActiveStoreConfig,
  isVariantOutOfStock,
  resolveProductVariant,
  sanitizeCustomerText,
  WhatsAppCartLine,
} from "@/lib/whatsapp";
import { whatsAppCartApiRequestSchema } from "@/lib/validations";
import { validateAndCalculateCoupon } from "@/lib/coupons";
import {
  generateOrderNumber,
  persistOrderRecord,
  resolveProductForOrder,
} from "@/lib/orders";

function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Invalid JSON in request body", 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return fail("Payload must be an object", 400);
    }

    const parsed = whatsAppCartApiRequestSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.errors[0]?.message || "Invalid request payload", 400);
    }
    const {
      items,
      customerNotes,
      lang,
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      couponCode,
    } = parsed.data;

    const ids = Array.from(new Set(items.map((i) => i.productId)));
    const products = await prisma.product.findMany({ where: { id: { in: ids } } });
    const byId = new Map(products.map((p) => [p.id, p]));

    for (const id of ids) {
      if (!byId.has(id)) {
        const resolved = await resolveProductForOrder(id);
        if (resolved) byId.set(id, resolved);
      }
    }

    const lines: WhatsAppCartLine[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product) return fail(`Product not found with id: ${item.productId}`, 404);
      if (product.stock <= 0) return fail(`${product.name} is out of stock`, 400);

      const variants = filterOrderableVariants(product.variants);
      let resolvedVariant = item.variant;
      if (variants.length > 0) {
        const { matched, ambiguous, allSizeMatchesOutOfStock } =
          resolveProductVariant(variants, item.variant);
        if (!matched) {
          if (ambiguous) {
            if (allSizeMatchesOutOfStock) {
              return fail(`${product.name} (${item.variant}) is currently out of stock`, 400);
            }
            return fail(`Select a specific color and size for ${product.name}`, 400);
          }
          return fail(`Select a valid size for ${product.name}`, 400);
        }
        if (isVariantOutOfStock(matched)) {
          return fail(`${product.name} (${matched.name}) is currently out of stock`, 400);
        }
        resolvedVariant = sanitizeCustomerText(matched.name) || matched.name;
      }

      const prodRec = product as unknown as {
        price: number;
        discountPrice?: number | null;
      };
      const unitPrice =
        typeof prodRec.discountPrice === "number" &&
        prodRec.discountPrice > 0 &&
        prodRec.discountPrice < prodRec.price
          ? prodRec.discountPrice
          : prodRec.price;

      subtotal += unitPrice * item.quantity;

      lines.push({
        productId: product.id,
        productName: product.name,
        variant: resolvedVariant,
        quantity: item.quantity,
        unitPrice,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    let discountAmount = 0;
    let total = subtotal;
    let appliedCouponCode: string | null = null;

    if (couponCode) {
      const couponEval = await validateAndCalculateCoupon(couponCode, subtotal);
      if (!couponEval.ok) {
        return fail(couponEval.error, 400);
      }
      discountAmount = couponEval.discountAmount;
      total = couponEval.finalTotal;
      appliedCouponCode = couponEval.coupon.code;
    }

    const config = await getActiveStoreConfig();
    const orderNumber = generateOrderNumber();

    const redirectUrl = generateWhatsAppCartUrl(config.whatsappNumber, {
      lines,
      currency: config.currency,
      customerNotes,
      timestamp: new Date().toISOString(),
      lang,
      ...(appliedCouponCode
        ? {
            orderNumber,
            couponCode: appliedCouponCode,
            discountAmount,
            finalTotal: total,
          }
        : {}),
    });

    const persisted = await persistOrderRecord({
      orderNumber,
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      shippingAddress,
      customerNotes,
      currency: config.currency,
      subtotal,
      discountAmount,
      total,
      couponCode: appliedCouponCode,
      whatsappUrl: redirectUrl,
      items: lines.map((l) => ({
        productId: l.productId,
        productName: l.productName,
        variantName: l.variant || null,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: Math.round(l.unitPrice * l.quantity * 100) / 100,
      })),
    });

    return NextResponse.json({
      success: true,
      redirectUrl,
      orderNumber: persisted.orderNumber,
      orderId: persisted.orderId,
      subtotal,
      discountAmount,
      total,
      couponCode: appliedCouponCode,
    });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : "Internal order error", 500);
  }
}
