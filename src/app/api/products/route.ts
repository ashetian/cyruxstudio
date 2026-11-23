import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { normalizeProductResponse } from "@/lib/validations";
import { resolveEditorialAssets } from "@/lib/editorial";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || searchParams.get("search") || "")
      .trim()
      .toLowerCase();
    const category = searchParams.get("category")?.trim().toLowerCase();
    const collectionParam = searchParams.get("collection")?.trim().toLowerCase();
    const bestseller = searchParams.get("bestseller");
    const sort = (searchParams.get("sort") || "sortOrder").trim().toLowerCase();
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50)
    );
    const offset = Math.max(
      0,
      parseInt(searchParams.get("offset") || "0", 10) || 0
    );

    const [rawProducts, settingsRecord, collections] = await Promise.all([
      prisma.product.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.storeSettings.findFirst(),
      prisma.collection.findMany().catch(() => []),
    ]);

    const editorial = resolveEditorialAssets(
      rawProducts,
      (settingsRecord?.brandMetadata as Record<string, unknown>) || null
    );

    const collectionBySlug = new Map<string, string>();
    for (const c of collections) {
      collectionBySlug.set(c.slug.toLowerCase(), c.id);
    }

    let products = rawProducts
      .map((p) =>
        normalizeProductResponse(
          p as unknown as Parameters<typeof normalizeProductResponse>[0]
        )
      )
      .filter((p) => p.isActive !== false);

    if (bestseller === "true") {
      products = products.filter((p) => p.isBestseller);
    } else if (bestseller === "false") {
      products = products.filter((p) => !p.isBestseller);
    }

    if (category && category !== "all") {
      products = products.filter(
        (p) =>
          p.category.toLowerCase() === category ||
          p.name.toLowerCase().includes(category)
      );
    }

    if (collectionParam && collectionParam !== "all") {
      const targetColId = collectionBySlug.get(collectionParam) || collectionParam;
      products = products.filter(
        (p) => p.collectionId?.toLowerCase() === targetColId.toLowerCase()
      );
    }

    if (q) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (sort === "newest") {
      products.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sort === "price_asc") {
      products.sort(
        (a, b) => (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price)
      );
    } else if (sort === "price_desc") {
      products.sort(
        (a, b) => (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price)
      );
    } else {
      products.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    const total = products.length;
    const paginated = products.slice(offset, offset + limit).map((p) => ({
      ...p,
      image:
        editorial.productImages[p.slug] ||
        p.mediaUrls[0] ||
        "/assets/brand/logo-emblem-dark.png",
    }));

    return NextResponse.json({
      success: true,
      total,
      count: paginated.length,
      products: paginated,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve products";
    return NextResponse.json(
      { success: false, error: message, products: [] },
      { status: 500 }
    );
  }
}
