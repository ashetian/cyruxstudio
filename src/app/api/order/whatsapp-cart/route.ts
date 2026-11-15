import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateWhatsAppCartUrl, getActiveStoreConfig, WhatsAppCartLine } from "@/lib/whatsapp";
import { whatsAppCartApiRequestSchema } from "@/lib/validations";
import { ProductVariant } from "@/lib/seed-data";

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
    const { items, customerNotes } = parsed.data;

    const ids = Array.from(new Set(items.map((i) => i.productId)));
    const products = await prisma.product.findMany({ where: { id: { in: ids } } });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines: WhatsAppCartLine[] = [];
    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product) return fail(`Product not found with id: ${item.productId}`, 404);
      if (product.stock <= 0) return fail(`${product.name} is out of stock`, 400);

      const variants = Array.isArray(product.variants)
        ? (product.variants as unknown as ProductVariant[])
        : [];
      if (variants.length > 0) {
        const matched = item.variant
          ? variants.find((v) => v.name.toLowerCase() === item.variant!.toLowerCase())
          : undefined;
        if (!matched) return fail(`Select a valid size for ${product.name}`, 400);
        if (matched.inStock === false) {
          return fail(`${product.name} (${matched.name}) is currently out of stock`, 400);
        }
      }

      lines.push({
        productId: product.id,
        productName: product.name,
        variant: item.variant,
        quantity: item.quantity,
        unitPrice: product.price, // DB price only
      });
    }

    const config = await getActiveStoreConfig();
    const redirectUrl = generateWhatsAppCartUrl(config.whatsappNumber, {
      lines,
      currency: config.currency,
      customerNotes,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, redirectUrl });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : "Internal order error", 500);
  }
}
