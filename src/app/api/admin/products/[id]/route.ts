import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  adminProductUpdateSchema,
  normalizeProductResponse,
} from "@/lib/validations";
import { revalidateStorefrontPaths } from "@/lib/revalidate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product: normalizeProductResponse(
        product as unknown as Parameters<typeof normalizeProductResponse>[0]
      ),
    });
  } catch (error: unknown) {
    console.error("[Admin Product GET by ID Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve product" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  return handleUpdate(request, context);
}

export async function PATCH(
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

    const existing = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Product ${id} not found` },
        { status: 404 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const validation = adminProductUpdateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    const updates = validation.data;

    if (updates.slug && updates.slug !== existing.slug) {
      const conflict = await prisma.product.findUnique({
        where: { slug: updates.slug },
      });
      if (conflict && conflict.id !== existing.id) {
        return NextResponse.json(
          { success: false, error: "Product with this slug already exists" },
          { status: 409 }
        );
      }
    }

    const existingRec = existing as unknown as {
      price: number;
      discountPrice?: number | null;
      category?: string;
    };
    const effectivePrice =
      updates.price !== undefined ? updates.price : existingRec.price;
    const effectiveDiscountPrice =
      updates.discountPrice !== undefined
        ? updates.discountPrice
        : existingRec.discountPrice;

    if (
      effectiveDiscountPrice != null &&
      effectiveDiscountPrice >= effectivePrice
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Discount price must be less than price",
        },
        { status: 400 }
      );
    }

    if (updates.collectionId) {
      const col = await prisma.collection.findUnique({
        where: { id: updates.collectionId },
      });
      if (!col) {
        return NextResponse.json(
          { success: false, error: "Referenced collection not found" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.slug !== undefined) updateData.slug = updates.slug;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.discountPrice !== undefined) updateData.discountPrice = updates.discountPrice;
    if (updates.stock !== undefined) updateData.stock = updates.stock;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.badge !== undefined) updateData.badge = updates.badge;
    if (updates.sku !== undefined) updateData.sku = updates.sku;
    if (updates.collectionId !== undefined) updateData.collectionId = updates.collectionId;
    if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    const existingVariantsArr = Array.isArray(existing.variants)
      ? (existing.variants as unknown[])
      : [];
    const existingHasMetadata = existingVariantsArr.some(
      (v) => v && typeof v === "object" && "_metadata" in v
    );

    if (
      updates.variants !== undefined ||
      updates.category !== undefined ||
      existingHasMetadata
    ) {
      const baseVariants =
        updates.variants !== undefined ? updates.variants : existingVariantsArr;
      const cleanVariants = (
        Array.isArray(baseVariants) ? baseVariants : []
      ).filter((v) => !(v && typeof v === "object" && "_metadata" in v));

      if (updates.category === undefined && !existingRec.category) {
        const meta = [
          ...(Array.isArray(baseVariants) ? baseVariants : []),
          ...existingVariantsArr,
        ].find(
          (v) => v && typeof v === "object" && "_metadata" in v
        ) as { _metadata?: { category?: unknown } } | undefined;
        if (
          typeof meta?._metadata?.category === "string" &&
          meta._metadata.category.trim().length > 0
        ) {
          updateData.category = meta._metadata.category.trim();
        }
      }

      if (updates.variants !== undefined || existingHasMetadata) {
        updateData.variants = cleanVariants;
      }
    }

    if (updates.mediaUrls !== undefined) updateData.mediaUrls = updates.mediaUrls;
    if (updates.isBestseller !== undefined) updateData.isBestseller = updates.isBestseller;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.colorHex !== undefined) updateData.colorHex = updates.colorHex;
    if (updates.twinProductSlug !== undefined) updateData.twinProductSlug = updates.twinProductSlug;
    if (updates.isDiptych !== undefined) updateData.isDiptych = updates.isDiptych;

    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: updateData,
    });

    revalidateStorefrontPaths(["/", "/shop", `/products/${updated.slug}`]);

    return NextResponse.json({
      success: true,
      product: normalizeProductResponse(
        updated as unknown as Parameters<typeof normalizeProductResponse>[0]
      ),
    });
  } catch (error: unknown) {
    console.error("[Admin Product Update Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update product" },
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

    const existing = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Product ${id} not found` },
        { status: 404 }
      );
    }

    await prisma.product.delete({
      where: { id: existing.id },
    });

    revalidateStorefrontPaths(["/", "/shop"]);

    return NextResponse.json({
      success: true,
      deletedId: existing.id,
      message: "Product successfully deleted",
    });
  } catch (error: unknown) {
    console.error("[Admin Product DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
