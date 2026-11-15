import { NextResponse } from "next/server";
import { getDrops, getActiveDropAsync } from "@/lib/drops";

export async function GET() {
  try {
    const drops = await getDrops();
    const activeDrop = await getActiveDropAsync();

    return NextResponse.json({
      success: true,
      drops,
      activeDrop,
      total: drops.length,
    });
  } catch (error: unknown) {
    console.error("[Public Drops API GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve drops" },
      { status: 500 }
    );
  }
}
