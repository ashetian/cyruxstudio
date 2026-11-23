import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getStorefrontCms } from "@/lib/cms";
import { formatStoreSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [settingsRecord, cms] = await Promise.all([
      prisma.storeSettings.findFirst(),
      getStorefrontCms(),
    ]);

    const settings = formatStoreSettings(
      settingsRecord as unknown as Parameters<typeof formatStoreSettings>[0]
    );

    return NextResponse.json({
      success: true,
      settings,
      cms,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load CMS configuration";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
