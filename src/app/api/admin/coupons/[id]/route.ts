import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { adminCouponUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function toLocalizedTitle(
  val: string | { tr: string; en: string }
): { tr: string; en: string } {
  if (typeof val === "string") return { tr: val, en: val };
  return { tr: val.tr ?? "", en: val.en ?? "" };
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const coupon = await prisma.coupon.findFirst({
      where: {
        OR: [{ id }, { code: id.toUpperCase() }],
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: "Coupon not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      coupon,
    });
  } catch (error: unknown) {
    console.error("[Admin Coupon GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve coupon" },
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
    const existing = await prisma.coupon.findFirst({
      where: {
        OR: [{ id }, { code: id.toUpperCase() }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Coupon not found" },
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

    const parsed = adminCouponUpdateSchema.safeParse(rawBody);
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
    const effectiveType = updates.discountType ?? existing.discountType;
    const effectiveValue = updates.discountValue ?? existing.discountValue;
    if (effectiveType === "percentage" && effectiveValue > 100) {
      return NextResponse.json(
        { success: false, error: "Percentage discount cannot exceed 100" },
        { status: 400 }
      );
    }

    if (updates.code && updates.code.toUpperCase() !== existing.code) {
      const conflict = await prisma.coupon.findUnique({
        where: { code: updates.code.toUpperCase() },
      });
      if (conflict && conflict.id !== existing.id) {
        return NextResponse.json(
          { success: false, error: "Coupon code already exists" },
          { status: 409 }
        );
      }
    }

    const updateData: Prisma.CouponUpdateInput = {};
    if (updates.code !== undefined) updateData.code = updates.code.toUpperCase();
    if (updates.title !== undefined) {
      updateData.title = toLocalizedTitle(updates.title) as unknown as Prisma.InputJsonValue;
    }
    if (updates.discountType !== undefined) {
      updateData.discountType = updates.discountType;
    }
    if (updates.discountValue !== undefined) {
      updateData.discountValue = updates.discountValue;
    }
    if (updates.minOrderAmount !== undefined) {
      updateData.minOrderAmount = updates.minOrderAmount;
    }
    if (updates.maxUses !== undefined) updateData.maxUses = updates.maxUses;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.startsAt !== undefined) {
      updateData.startsAt = updates.startsAt ? new Date(updates.startsAt) : null;
    }
    if (updates.expiresAt !== undefined) {
      updateData.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : null;
    }

    const updated = await prisma.coupon.update({
      where: { id: existing.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      coupon: updated,
    });
  } catch (error: unknown) {
    console.error("[Admin Coupon Update Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update coupon" },
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
    const existing = await prisma.coupon.findFirst({
      where: {
        OR: [{ id }, { code: id.toUpperCase() }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Coupon not found" },
        { status: 404 }
      );
    }

    await prisma.coupon.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      deletedId: existing.id,
    });
  } catch (error: unknown) {
    console.error("[Admin Coupon DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete coupon" },
      { status: 500 }
    );
  }
}
