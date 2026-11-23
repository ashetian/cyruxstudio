import prisma from "@/lib/db";

export interface ValidatedCouponResult {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
}

export type CouponEvaluationResult =
  | {
      ok: true;
      coupon: ValidatedCouponResult;
      subtotal: number;
      discountAmount: number;
      finalTotal: number;
    }
  | {
      ok: false;
      status: 400 | 404;
      error: string;
    };

export async function validateAndCalculateCoupon(
  rawCode: string,
  subtotal: number
): Promise<CouponEvaluationResult> {
  const normalizedCode = rawCode.trim().toUpperCase();
  if (!normalizedCode) {
    return { ok: false, status: 400, error: "Coupon code is required" };
  }

  let coupon = await prisma.coupon.findUnique({
    where: { code: normalizedCode },
  });

  if (!coupon) {
    const allCoupons = await prisma.coupon.findMany();
    coupon =
      allCoupons.find((c) => c.code.toUpperCase() === normalizedCode) || null;
  }

  if (!coupon) {
    return { ok: false, status: 404, error: "Coupon code not found" };
  }

  if (!coupon.isActive) {
    return { ok: false, status: 400, error: "Coupon is not active" };
  }

  const now = new Date();
  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    return { ok: false, status: 400, error: "Coupon is not active yet" };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
    return { ok: false, status: 400, error: "Coupon has expired" };
  }

  if (
    coupon.maxUses !== null &&
    coupon.maxUses !== undefined &&
    coupon.usedCount >= coupon.maxUses
  ) {
    return { ok: false, status: 400, error: "Coupon usage limit reached" };
  }

  if (
    coupon.minOrderAmount !== null &&
    coupon.minOrderAmount !== undefined &&
    subtotal < coupon.minOrderAmount
  ) {
    return {
      ok: false,
      status: 400,
      error: `Minimum order amount of ${coupon.minOrderAmount} required`,
    };
  }

  const discountType =
    coupon.discountType === "fixed" ? "fixed" : "percentage";
  const rawDiscount =
    discountType === "percentage"
      ? subtotal * (Math.min(100, Math.max(0, coupon.discountValue)) / 100)
      : Math.min(subtotal, Math.max(0, coupon.discountValue));

  const discountAmount = Math.round(rawDiscount * 100) / 100;
  const finalTotal = Math.max(
    0,
    Math.round((subtotal - discountAmount) * 100) / 100
  );

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountType,
      discountValue: coupon.discountValue,
    },
    subtotal,
    discountAmount,
    finalTotal,
  };
}
