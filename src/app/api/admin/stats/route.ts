import { NextResponse } from "next/server";
import prisma, { isDbConfigured } from "@/lib/db";
import { getDrops, getActiveDropAsync } from "@/lib/drops";
import { formatStoreSettings } from "@/lib/settings";
import { MAX_CUMULATIVE_CREDIT_BUDGET } from "@/lib/elevenlabs";
import { normalizeProductResponse } from "@/lib/validations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const [products, drops, activeDrop, settingsRecord] = await Promise.all([
      prisma.product.findMany(),
      getDrops(),
      getActiveDropAsync(),
      prisma.storeSettings.findFirst(),
    ]);

    const formattedSettings = formatStoreSettings(
      settingsRecord as unknown as Parameters<typeof formatStoreSettings>[0]
    );
    const lowStockThreshold = formattedSettings.lowStockThreshold ?? 3;

    const activeGarmentCount = products.length;
    let totalStock = 0;
    let inventoryValuation = 0;
    let bestsellerCount = 0;
    let depletedCount = 0;
    let lowStockCount = 0;

    const normalizedProducts = products.map((p) =>
      normalizeProductResponse(
        p as unknown as Parameters<typeof normalizeProductResponse>[0]
      )
    );

    const lowStockProducts: Array<{
      id: string;
      name: string;
      slug: string;
      stock: number;
      price: number;
      discountPrice: number | null;
      mediaUrls: string[];
      badge: string | null;
      category: string;
    }> = [];

    for (const p of normalizedProducts) {
      const stock = p.stock;
      const price = p.price;
      totalStock += stock;
      inventoryValuation += price * stock;
      if (p.isBestseller) bestsellerCount++;
      if (stock <= 0) {
        depletedCount++;
        lowStockProducts.push({
          id: p.id,
          name: p.name,
          slug: p.slug,
          stock: p.stock,
          price: p.price,
          discountPrice: p.discountPrice,
          mediaUrls: p.mediaUrls,
          badge: p.badge,
          category: p.category,
        });
      } else if (stock <= lowStockThreshold) {
        lowStockCount++;
        lowStockProducts.push({
          id: p.id,
          name: p.name,
          slug: p.slug,
          stock: p.stock,
          price: p.price,
          discountPrice: p.discountPrice,
          mediaUrls: p.mediaUrls,
          badge: p.badge,
          category: p.category,
        });
      }
    }

    lowStockProducts.sort((a, b) => a.stock - b.stock);

    let creditSum = 0;
    try {
      const aggregate = await prisma.creditUsageLog.aggregate({
        _sum: { creditsUsed: true },
      });
      creditSum = aggregate._sum?.creditsUsed || 0;
    } catch {
      creditSum = 0;
    }

    const remainingCredits = Math.max(0, MAX_CUMULATIVE_CREDIT_BUDGET - creditSum);

    let totalAiAssets = 0;
    try {
      const assets = await prisma.elevenLabsAsset.findMany();
      totalAiAssets = assets.length;
    } catch {
      totalAiAssets = 0;
    }

    let totalOrders = 0;
    let pendingOrders = 0;
    let totalRevenue = 0;
    const ordersByStatus = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    let recentOrders: Array<{
      id: string;
      orderNumber: string;
      customerName: string;
      customerPhone: string;
      status: string;
      total: number;
      currency: string;
      createdAt: string;
      itemCount: number;
    }> = [];

    try {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        include: { items: true },
      });
      totalOrders = orders.length;
      for (const o of orders) {
        if (o.status === "pending") pendingOrders++;
        if (o.status in ordersByStatus) {
          ordersByStatus[o.status as keyof typeof ordersByStatus]++;
        }
        if (o.status !== "cancelled") {
          totalRevenue += Number(o.total || 0);
        }
      }
      totalRevenue = Math.round(totalRevenue * 100) / 100;
      recentOrders = orders.slice(0, 8).map((o) => {
        const orderItems = Array.isArray((o as unknown as { items?: unknown[] }).items)
          ? ((o as unknown as { items: unknown[] }).items)
          : [];
        return {
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          status: o.status,
          total: Number(o.total || 0),
          currency: o.currency,
          createdAt: new Date(o.createdAt).toISOString(),
          itemCount: orderItems.length,
        };
      });
    } catch {
      totalOrders = 0;
    }

    let totalCustomers = 0;
    try {
      totalCustomers = await prisma.customer.count();
    } catch {
      totalCustomers = 0;
    }

    let totalCollections = 0;
    try {
      totalCollections = await prisma.collection.count();
    } catch {
      totalCollections = 0;
    }

    let activeCoupons = 0;
    try {
      const coupons = await prisma.coupon.findMany({ where: { isActive: true } });
      const now = new Date();
      activeCoupons = coupons.filter(
        (c) => !c.expiresAt || new Date(c.expiresAt) > now
      ).length;
    } catch {
      activeCoupons = 0;
    }

    return NextResponse.json({
      success: true,
      stats: {
        activeGarmentCount,
        totalStock,
        inventoryValuation: Math.round(inventoryValuation * 100) / 100,
        bestsellerCount,
        depletedCount,
        lowStockCount,
        lowStockThreshold,
        totalDrops: drops.length,
        activeDrop: activeDrop
          ? {
              id: activeDrop.id,
              number: activeDrop.number,
              title: activeDrop.title,
              slug: activeDrop.slug,
              status: activeDrop.status,
              totalPieces: activeDrop.totalPieces,
              assignedCount: activeDrop.productSlugs.length,
            }
          : null,
        credits: {
          used: creditSum,
          remaining: remainingCredits,
          cap: MAX_CUMULATIVE_CREDIT_BUDGET,
          percentage: Math.round((creditSum / MAX_CUMULATIVE_CREDIT_BUDGET) * 100),
        },
        totalAiAssets,
        currency: formattedSettings.currency,
        whatsappNumber: formattedSettings.whatsappNumber,
        dbStatus: isDbConfigured() ? "DATABASE_CONNECTED" : "IN_MEMORY_RESILIENT",
        totalOrders,
        pendingOrders,
        ordersByStatus,
        totalRevenue,
        totalCustomers,
        totalCollections,
        activeCoupons,
        lowStockProducts,
        recentOrders,
      },
    });
  } catch (error: unknown) {
    console.error("[Admin Stats GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to compute admin stats" },
      { status: 500 }
    );
  }
}
