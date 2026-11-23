import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveEditorialAssets } from "@/lib/editorial";
import { normalizeProductResponse } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || searchParams.get("query") || "").trim();
    const limit = Math.min(30, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));

    const [rawProducts, settingsRecord] = await Promise.all([
      prisma.product.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.storeSettings.findFirst(),
    ]);

    const normalized = rawProducts
      .map((p) =>
        normalizeProductResponse(
          p as unknown as Parameters<typeof normalizeProductResponse>[0]
        )
      )
      .filter((p) => p.isActive !== false);

    const editorial = resolveEditorialAssets(
      rawProducts,
      (settingsRecord?.brandMetadata as Record<string, unknown>) || null
    );

    const term = query.toLowerCase();

    const filtered = !term
      ? normalized.slice(0, limit)
      : normalized.filter((p) => {
          const nameMatch = p.name.toLowerCase().includes(term);
          const slugMatch = p.slug.toLowerCase().includes(term);
          const descMatch = (p.description || "").toLowerCase().includes(term);
          const catMatch = (p.category || "").toLowerCase().includes(term);
          return nameMatch || slugMatch || descMatch || catMatch;
        });

    const results = filtered.slice(0, limit).map((p) => {
      let category = p.category;
      if (!category || category === "apparel") {
        const nameLower = p.name.toLowerCase();
        if (nameLower.includes("tee") || nameLower.includes("t-shirt")) {
          category = "T-Shirts";
        } else if (nameLower.includes("hoodie") || nameLower.includes("sweatshirt")) {
          category = "Hoodies";
        } else if (nameLower.includes("pant") || nameLower.includes("cargo") || nameLower.includes("denim")) {
          category = "Pants";
        } else if (nameLower.includes("jacket") || nameLower.includes("puffer") || nameLower.includes("coat")) {
          category = "Outerwear";
        } else if (nameLower.includes("ring") || nameLower.includes("chain") || nameLower.includes("accessory")) {
          category = "Accessories";
        } else {
          category = "Apparel";
        }
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        discountPrice: p.discountPrice,
        stock: p.stock,
        isBestseller: p.isBestseller,
        badge: p.badge,
        category,
        image:
          editorial.productImages[p.slug] ||
          p.mediaUrls[0] ||
          "/assets/brand/logo-emblem-dark.png",
        variants: p.variants,
      };
    });

    return NextResponse.json({
      success: true,
      query,
      count: results.length,
      products: results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal search error";
    return NextResponse.json(
      { success: false, error: message, products: [] },
      { status: 500 }
    );
  }
}
