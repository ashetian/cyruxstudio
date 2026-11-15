import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  adminProductUpdateSchema,
  normalizeProductResponse,
} from "@/lib/validations";

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

    // Check slug collision
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

    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.slug !== undefined) updateData.slug = updates.slug;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.stock !== undefined) updateData.stock = updates.stock;
    if (updates.variants !== undefined) updateData.variants = updates.variants;
    if (updates.mediaUrls !== undefined) updateData.mediaUrls = updates.mediaUrls;
    if (updates.isBestseller !== undefined) updateData.isBestseller = updates.isBestseller;

    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: updateData,
    });

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
