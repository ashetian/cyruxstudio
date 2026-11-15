import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  generateWhatsAppOrderUrl,
  sanitizeCustomerText,
} from "@/lib/whatsapp";
import { whatsAppOrderApiRequestSchema } from "@/lib/validations";
import { INITIAL_STORE_SETTINGS, ProductVariant } from "@/lib/seed-data";

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

    // Validate request payload using Zod schema
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

    const { productId, productName, variant, price, currency, customerNotes, lang } =
      parsed.data;

    const trimmedId = productId.trim();

    // 1. Resolve Product record from database
    let resolvedName = productName || "";
    let resolvedPrice = price || 0;
    let resolvedStock = 1;

    const product = await prisma.product.findUnique({
      where: { id: trimmedId },
    });

    if (product) {
      resolvedName = product.name;
      // Server database price overrides client price (anti-spoofing)
      resolvedPrice = product.price;
      resolvedStock = product.stock;

      // Verify variant availability if product defines variants
      if (variant && Array.isArray(product.variants)) {
        const variantsList = product.variants as unknown as ProductVariant[];
        const matched = variantsList.find(
          (v) => v.name.toLowerCase() === String(variant).trim().toLowerCase()
        );
        if (matched && matched.inStock === false) {
          return NextResponse.json(
            { success: false, error: `Variant "${variant}" is currently out of stock` },
            { status: 400 }
          );
        }
      }
    } else {
      // Product not found in DB
      return NextResponse.json(
        { success: false, error: `Product not found with id: ${trimmedId}` },
        { status: 404 }
      );
    }

    // Verify product stock
    if (resolvedStock <= 0) {
      return NextResponse.json(
        { success: false, error: "Product is out of stock" },
        { status: 400 }
      );
    }

    // 2. Fetch current StoreSettings dynamically
    let activeWhatsappNumber = INITIAL_STORE_SETTINGS.whatsappNumber;
    let activeCurrency = INITIAL_STORE_SETTINGS.currency;

    try {
      const settings = await prisma.storeSettings.findFirst();
      if (settings?.whatsappNumber) {
        activeWhatsappNumber = settings.whatsappNumber;
      }
      if (settings?.currency) {
        activeCurrency = settings.currency.toUpperCase();
      }
    } catch (dbErr) {
      console.warn("[Order Route] Could not query storeSettings from DB, using defaults:", dbErr);
    }

    if (currency) {
      activeCurrency = currency.toUpperCase();
    }

    // 3. Generate sanitized WhatsApp order link
    const sanitizedVariant = variant ? sanitizeCustomerText(variant) : undefined;
    const sanitizedNotes = customerNotes ? sanitizeCustomerText(customerNotes) : undefined;

    const redirectUrl = generateWhatsAppOrderUrl(activeWhatsappNumber, {
      productId: trimmedId,
      productName: resolvedName,
      variant: sanitizedVariant,
      price: resolvedPrice,
      currency: activeCurrency,
      customerNotes: sanitizedNotes,
      timestamp: new Date().toISOString(),
      lang,
    });

    return NextResponse.json({
      success: true,
      redirectUrl,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Internal order error";
    return NextResponse.json(
      { success: false, error },
      { status: 500 }
    );
  }
}
