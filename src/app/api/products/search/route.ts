import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveEditorialAssets } from "@/lib/editorial";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || searchParams.get("query") || "").trim();
    const limit = Math.min(30, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));

    // Fetch catalog products from database or in-memory fallback
    const rawProducts = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });

    const editorial = resolveEditorialAssets(rawProducts);

    const term = query.toLowerCase();

    const filtered = !term
      ? rawProducts.slice(0, limit)
      : rawProducts.filter((p) => {
          const nameMatch = p.name.toLowerCase().includes(term);
          const slugMatch = p.slug.toLowerCase().includes(term);
          const descMatch = (p.description || "").toLowerCase().includes(term);
          return nameMatch || slugMatch || descMatch;
        });

    const results = filtered.slice(0, limit).map((p) => {
      // Infer category from name or description
      let category = "Apparel";
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
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        stock: p.stock,
        isBestseller: p.isBestseller,
        category,
        image: editorial.productImages[p.slug] || p.mediaUrls[0] || "/assets/brand/logo-emblem-dark.png",
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
