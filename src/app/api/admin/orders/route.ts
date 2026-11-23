import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { adminOrderCreateSchema } from "@/lib/validations";
import { validateAndCalculateCoupon } from "@/lib/coupons";
import {
  generateOrderNumber,
  persistOrderRecord,
  resolveProductForOrder,
} from "@/lib/orders";
import { INITIAL_STORE_SETTINGS } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status")?.trim().toLowerCase();
    const customerId = searchParams.get("customerId")?.trim();
    const q = (searchParams.get("q") || searchParams.get("search") || "")
      .trim()
      .toLowerCase();
    const sort = (searchParams.get("sort") || "newest").trim().toLowerCase();
    const limit = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get("limit") || "200", 10) || 200)
    );
    const offset = Math.max(
      0,
      parseInt(searchParams.get("offset") || "0", 10) || 0
    );

    const allOrders = await prisma.order.findMany({
      include: { items: true, customer: true },
      orderBy: { createdAt: "desc" },
    });

    const summary = {
      total: allOrders.length,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    for (const o of allOrders) {
      if (o.status in summary) {
        summary[o.status as keyof typeof summary]++;
      }
    }

    let filtered = [...allOrders];

    if (statusParam && statusParam !== "all") {
      filtered = filtered.filter((o) => o.status.toLowerCase() === statusParam);
    }

    if (customerId) {
      filtered = filtered.filter((o) => o.customerId === customerId);
    }

    if (q) {
      filtered = filtered.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.toLowerCase().includes(q) ||
          (o.customerEmail ? o.customerEmail.toLowerCase().includes(q) : false) ||
          (o.trackingNumber ? o.trackingNumber.toLowerCase().includes(q) : false)
      );
    }

    if (sort === "oldest") {
      filtered.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else if (sort === "total_desc") {
      filtered.sort((a, b) => Number(b.total) - Number(a.total));
    } else if (sort === "total_asc") {
      filtered.sort((a, b) => Number(a.total) - Number(b.total));
    } else {
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      orders: paginated,
      total,
      summary,
      limit,
      offset,
    });
  } catch (error: unknown) {
    console.error("[Admin Orders GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const parsed = adminOrderCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const productIds = Array.from(new Set(data.items.map((i) => i.productId)));
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const byId = new Map(dbProducts.map((p) => [p.id, p]));

    for (const id of productIds) {
      if (!byId.has(id)) {
        const resolved = await resolveProductForOrder(id);
        if (resolved) byId.set(id, resolved);
      }
    }

    let subtotal = 0;
    const orderLines: Array<{
      productId: string;
      productName: string;
      variantName: string | null;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }> = [];

    for (const item of data.items) {
      const product = byId.get(item.productId);
      if (!product && item.unitPrice === undefined) {
        return NextResponse.json(
          { success: false, error: `Product not found: ${item.productId}` },
          { status: 404 }
        );
      }
      const prodRec = product as unknown as {
        id?: string;
        name?: string;
        price?: number;
        discountPrice?: number | null;
      } | undefined;
      const defaultUnitPrice =
        prodRec &&
        typeof prodRec.discountPrice === "number" &&
        prodRec.discountPrice > 0 &&
        typeof prodRec.price === "number" &&
        prodRec.discountPrice < prodRec.price
          ? prodRec.discountPrice
          : prodRec?.price ?? 0;
      const unitPrice =
        typeof item.unitPrice === "number" && item.unitPrice >= 0
          ? item.unitPrice
          : defaultUnitPrice;
      const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
      subtotal += lineTotal;
      orderLines.push({
        productId: prodRec?.id || item.productId,
        productName: item.productName || prodRec?.name || item.productId,
        variantName: item.variantName || null,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      });
    }

    subtotal =
      typeof data.subtotal === "number" && data.subtotal >= 0
        ? Math.round(data.subtotal * 100) / 100
        : Math.round(subtotal * 100) / 100;
    let discountAmount = 0;
    let total =
      typeof data.total === "number" && data.total >= 0
        ? Math.round(data.total * 100) / 100
        : subtotal;
    let appliedCouponCode: string | null = null;

    if (data.couponCode) {
      const couponEval = await validateAndCalculateCoupon(data.couponCode, subtotal);
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

    const settings = await prisma.storeSettings.findFirst();
    const currency = settings?.currency?.toUpperCase() || INITIAL_STORE_SETTINGS.currency;

    const orderNumber = generateOrderNumber();
    const persisted = await persistOrderRecord({
      orderNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail || undefined,
      shippingAddress: data.shippingAddress,
      customerNotes: data.customerNotes,
      adminNotes: data.adminNotes,
      status: data.status,
      currency,
      subtotal,
      discountAmount,
      total,
      couponCode: appliedCouponCode,
      items: orderLines,
    });

    const createdOrder = persisted.orderId
      ? await prisma.order.findUnique({
          where: { id: persisted.orderId },
          include: { items: true, customer: true },
        })
      : null;

    return NextResponse.json(
      {
        success: true,
        order: createdOrder || {
          id: persisted.orderId,
          orderNumber: persisted.orderNumber,
          status: data.status,
          subtotal,
          discountAmount,
          total,
          currency,
          couponCode: appliedCouponCode,
          items: orderLines,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[Admin Orders POST Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create order" },
      { status: 500 }
    );
  }
}
