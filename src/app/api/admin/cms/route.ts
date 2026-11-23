import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import prisma from "@/lib/db";
import {
  getStorefrontCms,
  isCmsSectionKey,
  updateCmsSection,
} from "@/lib/cms";
import { formatStoreSettings } from "@/lib/settings";
import { revalidateStorefrontPaths } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [cms, settingsRecord] = await Promise.all([
      getStorefrontCms(),
      prisma.storeSettings.findFirst(),
    ]);

    const settings = formatStoreSettings(
      settingsRecord as unknown as Parameters<typeof formatStoreSettings>[0]
    );

    return NextResponse.json({
      success: true,
      cms,
      settings,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load CMS";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const bodyRecord = rawBody as Record<string, unknown>;
    const sectionsInput =
      bodyRecord.sections &&
      typeof bodyRecord.sections === "object" &&
      !Array.isArray(bodyRecord.sections)
        ? (bodyRecord.sections as Record<string, unknown>)
        : bodyRecord;

    const entries = Object.entries(sectionsInput);
    if (entries.length === 0) {
      return NextResponse.json(
        { success: false, error: "No CMS sections provided" },
        { status: 400 }
      );
    }

    for (const [key, value] of entries) {
      if (!isCmsSectionKey(key)) {
        return NextResponse.json(
          { success: false, error: `Unknown CMS section: ${key}` },
          { status: 400 }
        );
      }
      await updateCmsSection(key, value);
    }

    revalidateStorefrontPaths();

    const [cms, settingsRecord] = await Promise.all([
      getStorefrontCms(),
      prisma.storeSettings.findFirst(),
    ]);
    const settings = formatStoreSettings(
      settingsRecord as unknown as Parameters<typeof formatStoreSettings>[0]
    );

    return NextResponse.json({
      success: true,
      cms,
      settings,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.issues[0]?.message || "CMS validation failed",
        },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to update CMS";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
