import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { adminCollectionCreateSchema } from "@/lib/validations";
import { revalidateStorefrontPaths } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

function toLocalized(
  val: string | { tr: string; en: string } | undefined,
  fallback = ""
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
    const featured = searchParams.get("featured");
    const active = searchParams.get("active");
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50)
    );
    const offset = Math.max(
      0,
      parseInt(searchParams.get("offset") || "0", 10) || 0
    );

    const rawCollections = await prisma.collection.findMany({
      include: {
        products: true,
        _count: { select: { products: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    let collections = rawCollections.map((c) => {
      const rec = c as unknown as {
        id: string;
        slug: string;
        name: { tr?: string; en?: string } | string;
        description: { tr?: string; en?: string } | string;
        imageUrl: string | null;
        isFeatured: boolean;
        isActive: boolean;
        sortOrder: number;
        products?: Array<{ id: string; name: string; slug: string }>;
        _count?: { products: number };
        createdAt: Date | string;
        updatedAt: Date | string;
      };
      const nameObj =
        typeof rec.name === "object" && rec.name !== null
          ? { tr: rec.name.tr || "", en: rec.name.en || "" }
          : { tr: String(rec.name || ""), en: String(rec.name || "") };
      const descObj =
        typeof rec.description === "object" && rec.description !== null
          ? { tr: rec.description.tr || "", en: rec.description.en || "" }
          : { tr: String(rec.description || ""), en: String(rec.description || "") };
      return {
        id: rec.id,
        slug: rec.slug,
        name: nameObj,
        description: descObj,
        imageUrl: rec.imageUrl || null,
        isFeatured: Boolean(rec.isFeatured),
        isActive: rec.isActive !== undefined ? Boolean(rec.isActive) : true,
        sortOrder: typeof rec.sortOrder === "number" ? rec.sortOrder : 0,
        productCount: rec._count?.products ?? rec.products?.length ?? 0,
        productIds: Array.isArray(rec.products) ? rec.products.map((p) => p.id) : [],
        createdAt: new Date(rec.createdAt).toISOString(),
        updatedAt: new Date(rec.updatedAt).toISOString(),
      };
    });

    if (featured === "true" || featured === "false") {
      collections = collections.filter(
        (c) => c.isFeatured === (featured === "true")
      );
    }

    if (active === "true" || active === "false") {
      collections = collections.filter(
        (c) => c.isActive === (active === "true")
      );
    }

    if (q) {
      collections = collections.filter(
        (c) =>
          c.slug.toLowerCase().includes(q) ||
          c.name.tr.toLowerCase().includes(q) ||
          c.name.en.toLowerCase().includes(q) ||
          c.description.tr.toLowerCase().includes(q) ||
          c.description.en.toLowerCase().includes(q)
      );
    }

    collections.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = collections.length;
    const paginated = collections.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      collections: paginated,
      total,
      limit,
      offset,
    });
  } catch (error: unknown) {
    console.error("[Admin Collections GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve collections" },
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

    const parsed = adminCollectionCreateSchema.safeParse(rawBody);
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
    const existing = await prisma.collection.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Collection with this slug already exists" },
        { status: 409 }
      );
    }

    const created = await prisma.collection.create({
      data: {
        slug: data.slug,
        name: toLocalized(data.name) as unknown as Prisma.InputJsonValue,
        description: toLocalized(data.description) as unknown as Prisma.InputJsonValue,
        imageUrl: data.imageUrl || null,
        isFeatured: data.isFeatured,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    if (Array.isArray(data.productIds) && data.productIds.length > 0) {
      await prisma.product.updateMany({
        where: { id: { in: data.productIds } },
        data: { collectionId: created.id },
      });
    }

    revalidateStorefrontPaths(["/", "/shop"]);

    return NextResponse.json(
      {
        success: true,
        collection: created,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[Admin Collections POST Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create collection" },
      { status: 500 }
    );
  }
}
