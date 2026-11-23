import { NextRequest, NextResponse } from "next/server";
import { couponValidateSchema } from "@/lib/validations";
import { validateAndCalculateCoupon } from "@/lib/coupons";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json(
        { success: false, valid: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const parsed = couponValidateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: parsed.error.errors[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    const { code, subtotal } = parsed.data;
    const evaluation = await validateAndCalculateCoupon(code, subtotal);

    if (!evaluation.ok) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: evaluation.error,
        },
        { status: evaluation.status }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      coupon: evaluation.coupon,
      subtotal: evaluation.subtotal,
      discountAmount: evaluation.discountAmount,
      finalTotal: evaluation.finalTotal,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to validate coupon";
    return NextResponse.json(
      { success: false, valid: false, error: message },
      { status: 500 }
    );
  }
}
