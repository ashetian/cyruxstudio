import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  filterOrderableVariants,
  generateWhatsAppOrderUrl,
  isVariantOutOfStock,
  resolveProductVariant,
  sanitizeCustomerText,
} from "@/lib/whatsapp";
import { whatsAppOrderApiRequestSchema } from "@/lib/validations";
import { INITIAL_STORE_SETTINGS } from "@/lib/seed-data";
import { validateAndCalculateCoupon } from "@/lib/coupons";
import {
  generateOrderNumber,
  persistOrderRecord,
  resolveProductForOrder,
} from "@/lib/orders";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Payload must be an object" },
        { status: 400 }
      );
    }

    const parsed = whatsAppOrderApiRequestSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg =
        parsed.error.errors[0]?.message || "Invalid request payload";
      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      productId,
      productName,
      variant,
      price,
      currency,
      customerNotes,
      lang,
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      couponCode,
    } = parsed.data;

    const trimmedId = productId.trim();

    let resolvedName = productName || "";
    let resolvedUnitPrice = price || 0;
    let resolvedStock = 1;

    const [product, settings] = await Promise.all([
      resolveProductForOrder(trimmedId),
      prisma.storeSettings.findFirst().catch((dbErr) => {
        console.warn("[Order Route] Could not query storeSettings from DB, using defaults:", dbErr);
        return null;
      }),
    ]);

    let resolvedVariantName = variant ? sanitizeCustomerText(variant) : undefined;

    if (product) {
      resolvedName = product.name;
      const productRecord = product as unknown as {
        price: number;
        discountPrice?: number | null;
      };
      resolvedUnitPrice =
        typeof productRecord.discountPrice === "number" &&
        productRecord.discountPrice > 0 &&
        productRecord.discountPrice < productRecord.price
          ? productRecord.discountPrice
          : productRecord.price;
      resolvedStock = product.stock;

      if (variant && Array.isArray(product.variants)) {
        const variantsList = filterOrderableVariants(product.variants);
        const { matched, ambiguous, allSizeMatchesOutOfStock } =
          resolveProductVariant(variantsList, variant);
        if (
          (matched && isVariantOutOfStock(matched)) ||
          (ambiguous && allSizeMatchesOutOfStock)
        ) {
          return NextResponse.json(
            { success: false, error: `Variant "${variant}" is currently out of stock` },
            { status: 400 }
          );
        }
        if (matched) {
          resolvedVariantName = sanitizeCustomerText(matched.name) || matched.name;
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: `Product not found with id: ${trimmedId}` },
        { status: 404 }
      );
    }

    if (resolvedStock <= 0) {
      return NextResponse.json(
        { success: false, error: "Product is out of stock" },
        { status: 400 }
      );
    }

    const subtotal = Math.round(resolvedUnitPrice * 100) / 100;
    let discountAmount = 0;
    let total = subtotal;
    let appliedCouponCode: string | null = null;

    if (couponCode) {
      const couponEval = await validateAndCalculateCoupon(couponCode, subtotal);
      if (!couponEval.ok) {
        return NextResponse.json(
          { success: false, error: couponEval.error },
          { status: 400 }
        );
      }
      discountAmount = couponEval.discountAmount;
      total = couponEval.finalTotal;
      appliedCouponCode = couponEval.coupon.code;
    }

    let activeWhatsappNumber = INITIAL_STORE_SETTINGS.whatsappNumber;
    let activeCurrency = INITIAL_STORE_SETTINGS.currency;

    if (settings?.whatsappNumber) {
      activeWhatsappNumber = settings.whatsappNumber;
    }
    if (settings?.currency) {
      activeCurrency = settings.currency.toUpperCase();
    }

    if (currency) {
      activeCurrency = currency.toUpperCase();
    }

    const sanitizedVariant = resolvedVariantName;
    const sanitizedNotes = customerNotes ? sanitizeCustomerText(customerNotes) : undefined;
    const orderNumber = generateOrderNumber();

    const redirectUrl = generateWhatsAppOrderUrl(activeWhatsappNumber, {
      productId: trimmedId,
      productName: resolvedName,
      variant: sanitizedVariant,
      price: discountAmount > 0 ? total : resolvedUnitPrice,
      currency: activeCurrency,
      customerNotes: sanitizedNotes,
      timestamp: new Date().toISOString(),
      lang,
      ...(appliedCouponCode
        ? {
            orderNumber,
            couponCode: appliedCouponCode,
            discountAmount,
          }
        : {}),
    });

    const persisted = await persistOrderRecord({
      orderNumber,
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      shippingAddress,
      customerNotes: sanitizedNotes,
      currency: activeCurrency,
      subtotal,
      discountAmount,
      total,
      couponCode: appliedCouponCode,
      whatsappUrl: redirectUrl,
      items: [
        {
          productId: product.id,
          productName: resolvedName,
          variantName: sanitizedVariant || null,
          quantity: 1,
          unitPrice: resolvedUnitPrice,
          lineTotal: subtotal,
        },
      ],
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
    const error = err instanceof Error ? err.message : "Internal order error";
    return NextResponse.json(
      { success: false, error },
      { status: 500 }
    );
  }
}
