import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { adminCouponCreateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

function toLocalizedTitle(
  val: string | { tr: string; en: string } | undefined,
  fallback: string
): { tr: string; en: string } {
  if (!val) return { tr: fallback, en: fallback };
  if (typeof val === "string") return { tr: val, en: val };
  return { tr: val.tr ?? fallback, en: val.en ?? fallback };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || searchParams.get("search") || "")
      .trim()
      .toLowerCase();
    const active = searchParams.get("active");
    const type = searchParams.get("type")?.trim().toLowerCase();
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50)
    );
    const offset = Math.max(
      0,
      parseInt(searchParams.get("offset") || "0", 10) || 0
    );

    let coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    if (active === "true" || active === "false") {
      coupons = coupons.filter((c) => c.isActive === (active === "true"));
    }

    if (type === "percentage" || type === "fixed") {
      coupons = coupons.filter((c) => c.discountType.toLowerCase() === type);
    }

    if (q) {
      coupons = coupons.filter((c) => {
        const titleStr =
          typeof c.title === "object" && c.title !== null
            ? JSON.stringify(c.title).toLowerCase()
            : String(c.title || "").toLowerCase();
        return c.code.toLowerCase().includes(q) || titleStr.includes(q);
      });
    }

    coupons.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = coupons.length;
    const paginated = coupons.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      coupons: paginated,
      total,
      limit,
      offset,
    });
  } catch (error: unknown) {
    console.error("[Admin Coupons GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve coupons" },
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

    const parsed = adminCouponCreateSchema.safeParse(rawBody);
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
    const normalizedCode = data.code.toUpperCase();
    const existing = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Coupon code already exists" },
        { status: 409 }
      );
    }

    const created = await prisma.coupon.create({
      data: {
        code: normalizedCode,
        title: toLocalizedTitle(data.title, normalizedCode) as unknown as Prisma.InputJsonValue,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount ?? null,
        maxUses: data.maxUses ?? null,
        ...(data.usedCount !== undefined ? { usedCount: data.usedCount } : {}),
        isActive: data.isActive,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        coupon: created,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[Admin Coupons POST Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create coupon" },
      { status: 500 }
    );
  }
}
