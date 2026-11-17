import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import {
  adminProductCreateSchema,
  normalizeProductResponse,
} from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category")?.toLowerCase();
    const stockFilter = searchParams.get("stock")?.toLowerCase();
    const bestseller = searchParams.get("bestseller");
    const q = searchParams.get("search") || searchParams.get("q");
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
    );
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    const where: {
      isBestseller?: boolean;
      stock?: number | { gt?: number; lte?: number };
    } = {};

    if (bestseller !== null && bestseller !== undefined) {
      where.isBestseller = bestseller === "true";
    }
    if (stockFilter === "in_stock" || stockFilter === "available") {
      where.stock = { gt: 0 };
    } else if (stockFilter === "out_of_stock" || stockFilter === "depleted") {
      where.stock = 0;
    }

    const sortParam = searchParams.get("sort")?.toLowerCase();

    const rawProducts = await prisma.product.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    let products = rawProducts.map((p) =>
      normalizeProductResponse(p as unknown as Parameters<typeof normalizeProductResponse>[0])
    );

    if (stockFilter === "low_stock") {
      products = products.filter((p) => p.stock > 0 && p.stock <= 3);
    }

    if (category && category !== "all") {
      products = products.filter(
        (p) =>
          p.category.toLowerCase() === category ||
          p.name.toLowerCase().includes(category)
      );
    }
    if (q) {
      const term = q.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.slug.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term)
      );
    }

    if (sortParam) {
      if (sortParam === "price_desc") {
        products.sort((a, b) => b.price - a.price);
      } else if (sortParam === "price_asc") {
        products.sort((a, b) => a.price - b.price);
      } else if (sortParam === "stock_desc") {
        products.sort((a, b) => b.stock - a.stock);
      } else if (sortParam === "stock_asc") {
        products.sort((a, b) => a.stock - b.stock);
      } else if (sortParam === "name_asc") {
        products.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortParam === "oldest") {
        products.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      } else if (sortParam === "newest") {
        products.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    }

    return NextResponse.json({
      success: true,
      products,
      total: products.length,
    });
  } catch (error: unknown) {
    console.error("[Admin Products GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validation = adminProductCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check slug uniqueness
    const existing = await prisma.product.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Product with this slug already exists" },
        { status: 409 }
      );
    }

    const categoryToStore = data.category || "outerwear";
    const rawVariants = Array.isArray(data.variants) ? data.variants : [];
    const cleanVariants = rawVariants.filter(
      (v) => !(v && typeof v === "object" && "_metadata" in v)
    );
    const variantsWithCategory = [
      ...cleanVariants,
      { _metadata: { category: categoryToStore } },
    ];

    const created = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || "",
        price: data.price,
        stock: data.stock,
        variants: variantsWithCategory as unknown as Prisma.InputJsonValue,
        mediaUrls: data.mediaUrls || [],
        isBestseller: Boolean(data.isBestseller),
        color: data.color || null,
        colorHex: data.colorHex || null,
        twinProductSlug: data.twinProductSlug || null,
        isDiptych: Boolean(data.isDiptych),
      },
    });

    return NextResponse.json(
      {
        success: true,
        product: normalizeProductResponse(
          created as unknown as Parameters<typeof normalizeProductResponse>[0]
        ),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[Admin Products POST Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create product" },
      { status: 500 }
    );
  }
}
