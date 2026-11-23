import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { adminOrderUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: { items: true, customer: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: unknown) {
    console.error("[Admin Order GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  return handleUpdate(request, context);
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  return handleUpdate(request, context);
}

async function handleUpdate(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const existing = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const parsed = adminOrderUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    const updates = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.trackingNumber !== undefined) {
      updateData.trackingNumber = updates.trackingNumber;
    }
    if (updates.trackingCarrier !== undefined) {
      updateData.trackingCarrier = updates.trackingCarrier;
    }
    if (updates.adminNotes !== undefined) updateData.adminNotes = updates.adminNotes;
    if (updates.shippingAddress !== undefined) {
      updateData.shippingAddress = updates.shippingAddress;
    }
    if (updates.customerNotes !== undefined) {
      updateData.customerNotes = updates.customerNotes;
    }

    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: updateData,
      include: { items: true, customer: true },
    });

    return NextResponse.json({
      success: true,
      order: updated,
    });
  } catch (error: unknown) {
    console.error("[Admin Order Update Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const existing = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    await prisma.orderItem.deleteMany({
      where: { orderId: existing.id },
    });

    await prisma.order.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      deletedId: existing.id,
    });
  } catch (error: unknown) {
    console.error("[Admin Order DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete order" },
      { status: 500 }
    );
  }
}
