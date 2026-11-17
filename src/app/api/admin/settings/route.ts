import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { INITIAL_STORE_SETTINGS } from "@/lib/seed-data";
import { adminSettingsUpdateSchema } from "@/lib/validations";

import { formatStoreSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const record = await prisma.storeSettings.findFirst();
    const settings = formatStoreSettings(
      record as unknown as Parameters<typeof formatStoreSettings>[0]
    );

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: unknown) {
    console.error("[Admin Settings GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve store settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  return handleUpdateSettings(request);
}

export async function POST(request: NextRequest) {
  return handleUpdateSettings(request);
}

async function handleUpdateSettings(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const validation = adminSettingsUpdateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    const {
      whatsappNumber,
      currency,
      storeName,
      brandBio,
      announcement,
      socialLinks,
      brandMetadata,
      heroDesktopImage,
      heroMobileImage,
      aboutDesktopImage,
      aboutMobileImage,
    } = validation.data;

    const existing = await prisma.storeSettings.findFirst();
    const currentMeta =
      (existing?.brandMetadata as Record<string, unknown>) ||
      INITIAL_STORE_SETTINGS.brandMetadata;

    const mergedMeta: Record<string, unknown> = {
      ...currentMeta,
      ...(storeName
        ? { storeName, brandName: storeName, title: storeName }
        : {}),
      ...(brandBio
        ? { tagline: brandBio, brandBio, description: brandBio }
        : {}),
      ...(announcement !== undefined ? { announcement } : {}),
      ...(socialLinks
        ? {
            socialLinks: {
              ...((currentMeta.socialLinks as Record<string, string>) || {}),
              ...socialLinks,
            },
          }
        : {}),
      ...(heroDesktopImage !== undefined ? { heroDesktopImage } : {}),
      ...(heroMobileImage !== undefined ? { heroMobileImage } : {}),
      ...(aboutDesktopImage !== undefined ? { aboutDesktopImage } : {}),
      ...(aboutMobileImage !== undefined ? { aboutMobileImage } : {}),
      ...(brandMetadata || {}),
    };

    if (announcement !== undefined) {
      mergedMeta.announcement = announcement;
    }

    const updated = await prisma.storeSettings.upsert({
      where: { id: existing?.id || "default" },
      create: {
        id: "default",
        whatsappNumber:
          whatsappNumber ||
          existing?.whatsappNumber ||
          INITIAL_STORE_SETTINGS.whatsappNumber,
        currency:
          currency || existing?.currency || INITIAL_STORE_SETTINGS.currency,
        brandMetadata: mergedMeta as Prisma.InputJsonObject,
      },
      update: {
        ...(whatsappNumber ? { whatsappNumber } : {}),
        ...(currency ? { currency } : {}),
        brandMetadata: mergedMeta as Prisma.InputJsonObject,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Store settings updated successfully",
      settings: formatStoreSettings(
        updated as unknown as Parameters<typeof formatStoreSettings>[0]
      ),
    });
  } catch (error: unknown) {
    console.error("[Admin Settings Update Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update store settings" },
      { status: 500 }
    );
  }
}
