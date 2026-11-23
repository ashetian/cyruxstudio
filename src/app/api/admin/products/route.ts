import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import {
  adminProductCreateSchema,
  normalizeProductResponse,
} from "@/lib/validations";
import { formatStoreSettings } from "@/lib/settings";
import { revalidateStorefrontPaths } from "@/lib/revalidate";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category")?.trim().toLowerCase();
    const stockFilter = searchParams.get("stock")?.trim().toLowerCase();
    const bestseller = searchParams.get("bestseller");
    const collectionId = searchParams.get("collectionId")?.trim();
    const isActiveParam = searchParams.get("isActive");
    const q = (searchParams.get("search") || searchParams.get("q") || "")
      .trim()
      .toLowerCase();
    const sortParam = searchParams.get("sort")?.trim().toLowerCase();
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50)
    );
    const offset = Math.max(
      0,
      parseInt(searchParams.get("offset") || "0", 10) || 0
    );

    const [rawProducts, settingsRecord] = await Promise.all([
      prisma.product.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.storeSettings.findFirst(),
    ]);

    const settings = formatStoreSettings(
      settingsRecord as unknown as Parameters<typeof formatStoreSettings>[0]
    );
    const lowStockThreshold = settings.lowStockThreshold ?? 3;

    let products = rawProducts.map((p) =>
      normalizeProductResponse(
        p as unknown as Parameters<typeof normalizeProductResponse>[0]
      )
    );

    if (bestseller === "true" || bestseller === "false") {
      const flag = bestseller === "true";
      products = products.filter((p) => p.isBestseller === flag);
    }

    if (isActiveParam === "true" || isActiveParam === "false") {
      const flag = isActiveParam === "true";
      products = products.filter((p) => p.isActive === flag);
    }

    if (collectionId) {
      if (collectionId === "none" || collectionId === "unassigned") {
        products = products.filter((p) => !p.collectionId);
      } else {
        products = products.filter((p) => p.collectionId === collectionId);
      }
    }

    if (stockFilter === "in_stock" || stockFilter === "available") {
      products = products.filter((p) => p.stock > 0);
    } else if (stockFilter === "out_of_stock" || stockFilter === "depleted") {
      products = products.filter((p) => p.stock <= 0);
    } else if (stockFilter === "low_stock") {
      products = products.filter(
        (p) => p.stock > 0 && p.stock <= lowStockThreshold
      );
    }

    if (category && category !== "all") {
      products = products.filter(
        (p) =>
          p.category.toLowerCase() === category ||
          p.name.toLowerCase().includes(category)
      );
    }

    if (q) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.badge ? p.badge.toLowerCase().includes(q) : false)
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
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      } else if (sortParam === "newest") {
        products.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } else if (sortParam === "sort_order") {
        products.sort((a, b) => a.sortOrder - b.sortOrder);
      }
    }

    const total = products.length;
    const paginated = products.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      products: paginated,
      total,
      limit,
      offset,
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

    const existing = await prisma.product.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Product with this slug already exists" },
        { status: 409 }
      );
    }

    if (data.collectionId) {
      const col = await prisma.collection.findUnique({
        where: { id: data.collectionId },
      });
      if (!col) {
        return NextResponse.json(
          { success: false, error: "Referenced collection not found" },
          { status: 400 }
        );
      }
    }

    const rawVariants = Array.isArray(data.variants) ? data.variants : [];
    const legacyMeta = rawVariants.find(
      (v) => v && typeof v === "object" && "_metadata" in v
    ) as { _metadata?: { category?: unknown } } | undefined;
    const legacyCategory =
      typeof legacyMeta?._metadata?.category === "string" &&
      legacyMeta._metadata.category.trim().length > 0
        ? legacyMeta._metadata.category.trim()
        : undefined;
    const categoryToStore = data.category || legacyCategory || "outerwear";
    const cleanVariants = rawVariants.filter(
      (v) => !(v && typeof v === "object" && "_metadata" in v)
    );

    const created = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || "",
        price: data.price,
        discountPrice: data.discountPrice ?? null,
        stock: data.stock,
        variants: cleanVariants as unknown as Prisma.InputJsonValue,
        mediaUrls: data.mediaUrls || [],
        isBestseller: Boolean(data.isBestseller),
        color: data.color || null,
        colorHex: data.colorHex || null,
        twinProductSlug: data.twinProductSlug || null,
        isDiptych: Boolean(data.isDiptych),
        category: categoryToStore,
        badge: data.badge ?? null,
        sku: data.sku ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        collectionId: data.collectionId ?? null,
      },
    });

    revalidateStorefrontPaths(["/", "/shop"]);

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
