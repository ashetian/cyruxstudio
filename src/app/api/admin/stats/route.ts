import { NextResponse } from "next/server";
import prisma, { isDbConfigured } from "@/lib/db";
import { getDrops, getActiveDropAsync } from "@/lib/drops";
import { formatStoreSettings } from "@/app/api/admin/settings/route";
import { MAX_CUMULATIVE_CREDIT_BUDGET } from "@/lib/elevenlabs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Products & Inventory Valuation
    const products = await prisma.product.findMany();
    const activeGarmentCount = products.length;
    let totalStock = 0;
    let inventoryValuation = 0;
    let bestsellerCount = 0;
    let depletedCount = 0;
    let lowStockCount = 0;

    for (const p of products) {
      const stock = typeof p.stock === "number" ? p.stock : 0;
      const price = typeof p.price === "number" ? p.price : 0;
      totalStock += stock;
      inventoryValuation += price * stock;
      if (p.isBestseller) bestsellerCount++;
      if (stock <= 0) depletedCount++;
      else if (stock <= 3) lowStockCount++;
    }

    // 2. Drops
    const drops = await getDrops();
    const activeDrop = await getActiveDropAsync();

    // 3. Store Settings & Currency
    const settingsRecord = await prisma.storeSettings.findFirst();
    const formattedSettings = formatStoreSettings(
      settingsRecord as unknown as Parameters<typeof formatStoreSettings>[0]
    );

    // 4. ElevenLabs Credit Usage
    let creditSum = 0;
    try {
      const aggregate = await prisma.creditUsageLog.aggregate({
        _sum: { creditsUsed: true },
      });
      creditSum = aggregate._sum?.creditsUsed || 0;
    } catch {
      // In-memory or fallback
      creditSum = 0;
    }

    const remainingCredits = Math.max(0, MAX_CUMULATIVE_CREDIT_BUDGET - creditSum);

    // 5. Total Assets
    let totalAiAssets = 0;
    try {
      const assets = await prisma.elevenLabsAsset.findMany();
      totalAiAssets = assets.length;
    } catch {
      totalAiAssets = 0;
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
