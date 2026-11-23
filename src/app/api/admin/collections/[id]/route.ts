import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { adminCollectionUpdateSchema } from "@/lib/validations";
import { revalidateStorefrontPaths } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function toLocalized(
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
    const collection = await prisma.collection.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        products: true,
        _count: { select: { products: true } },
      },
    });

    if (!collection) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      collection,
    });
  } catch (error: unknown) {
    console.error("[Admin Collection GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve collection" },
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
    const existing = await prisma.collection.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
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

    const parsed = adminCollectionUpdateSchema.safeParse(rawBody);
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
    if (updates.slug && updates.slug !== existing.slug) {
      const conflict = await prisma.collection.findUnique({
        where: { slug: updates.slug },
      });
      if (conflict && conflict.id !== existing.id) {
        return NextResponse.json(
          { success: false, error: "Collection with this slug already exists" },
          { status: 409 }
        );
      }
    }

    const updateData: Prisma.CollectionUpdateInput = {};
    if (updates.slug !== undefined) updateData.slug = updates.slug;
    if (updates.name !== undefined) {
      updateData.name = toLocalized(updates.name) as unknown as Prisma.InputJsonValue;
    }
    if (updates.description !== undefined) {
      updateData.description = toLocalized(updates.description) as unknown as Prisma.InputJsonValue;
    }
    if (updates.imageUrl !== undefined) updateData.imageUrl = updates.imageUrl || null;
    if (updates.isFeatured !== undefined) updateData.isFeatured = updates.isFeatured;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;

    const updated = await prisma.collection.update({
      where: { id: existing.id },
      data: updateData,
    });

    if (Array.isArray(updates.productIds)) {
      await prisma.product.updateMany({
        where: { collectionId: existing.id },
        data: { collectionId: null },
      });
      if (updates.productIds.length > 0) {
        await prisma.product.updateMany({
          where: { id: { in: updates.productIds } },
          data: { collectionId: existing.id },
        });
      }
    }

    revalidateStorefrontPaths(["/", "/shop"]);

    return NextResponse.json({
      success: true,
      collection: updated,
    });
  } catch (error: unknown) {
    console.error("[Admin Collection Update Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update collection" },
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
    const existing = await prisma.collection.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 }
      );
    }

    await prisma.product.updateMany({
      where: { collectionId: existing.id },
      data: { collectionId: null },
    });

    await prisma.collection.delete({
      where: { id: existing.id },
    });

    revalidateStorefrontPaths(["/", "/shop"]);

    return NextResponse.json({
      success: true,
      deletedId: existing.id,
    });
  } catch (error: unknown) {
    console.error("[Admin Collection DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete collection" },
      { status: 500 }
    );
  }
}
