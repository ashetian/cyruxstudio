import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { INITIAL_STORE_SETTINGS } from "@/lib/seed-data";
import { adminSettingsUpdateSchema } from "@/lib/validations";
import { formatStoreSettings } from "@/lib/settings";
import { revalidateStorefrontPaths } from "@/lib/revalidate";

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

export async function PATCH(request: NextRequest) {
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
      socialHandles,
      brandMetadata,
      heroDesktopImage,
      heroMobileImage,
      aboutDesktopImage,
      aboutMobileImage,
      freeShippingThreshold,
      shippingFee,
      lowStockThreshold,
      activeTheme,
      announcementEnabled,
      defaultLang,
      supportEmail,
      whatsappFormatted,
      location,
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
      ...(socialHandles
        ? {
            socialHandles: {
              ...((currentMeta.socialHandles as Record<string, string>) || {}),
              ...socialHandles,
            },
          }
        : {}),
      ...(heroDesktopImage !== undefined ? { heroDesktopImage } : {}),
      ...(heroMobileImage !== undefined ? { heroMobileImage } : {}),
      ...(aboutDesktopImage !== undefined ? { aboutDesktopImage } : {}),
      ...(aboutMobileImage !== undefined ? { aboutMobileImage } : {}),
      ...(freeShippingThreshold !== undefined ? { freeShippingThreshold } : {}),
      ...(shippingFee !== undefined ? { shippingFee: shippingFee ?? 0 } : {}),
      ...(lowStockThreshold !== undefined ? { lowStockThreshold } : {}),
      ...(activeTheme !== undefined ? { activeTheme } : {}),
      ...(announcementEnabled !== undefined ? { announcementEnabled } : {}),
      ...(defaultLang !== undefined ? { defaultLang } : {}),
      ...(supportEmail !== undefined ? { supportEmail } : {}),
      ...(whatsappFormatted !== undefined ? { whatsappFormatted } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(brandMetadata || {}),
    };

    const existingExtended = existing as unknown as {
      freeShippingThreshold?: number | null;
      shippingFee?: number;
      lowStockThreshold?: number;
      activeTheme?: string;
      announcementEnabled?: boolean;
    } | null;

    const baseCreate = {
      id: "default",
      whatsappNumber:
        whatsappNumber ||
        existing?.whatsappNumber ||
        INITIAL_STORE_SETTINGS.whatsappNumber,
      currency:
        currency || existing?.currency || INITIAL_STORE_SETTINGS.currency,
      brandMetadata: mergedMeta as Prisma.InputJsonObject,
    };

    const baseUpdate = {
      ...(whatsappNumber ? { whatsappNumber } : {}),
      ...(currency ? { currency } : {}),
      brandMetadata: mergedMeta as Prisma.InputJsonObject,
    };

    let updated;
    try {
      updated = await prisma.storeSettings.upsert({
        where: { id: existing?.id || "default" },
        create: {
          ...baseCreate,
          freeShippingThreshold:
            freeShippingThreshold !== undefined
              ? freeShippingThreshold
              : existingExtended?.freeShippingThreshold ??
                INITIAL_STORE_SETTINGS.freeShippingThreshold ??
                null,
          shippingFee:
            shippingFee !== undefined
              ? shippingFee ?? 0
              : existingExtended?.shippingFee ??
                INITIAL_STORE_SETTINGS.shippingFee ??
                0,
          lowStockThreshold:
            lowStockThreshold !== undefined
              ? lowStockThreshold
              : existingExtended?.lowStockThreshold ??
                INITIAL_STORE_SETTINGS.lowStockThreshold ??
                3,
          activeTheme:
            activeTheme ||
            existingExtended?.activeTheme ||
            INITIAL_STORE_SETTINGS.activeTheme ||
            "white-atelier",
          announcementEnabled:
            announcementEnabled !== undefined
              ? announcementEnabled
              : existingExtended?.announcementEnabled ??
                INITIAL_STORE_SETTINGS.announcementEnabled ??
                true,
        },
        update: {
          ...baseUpdate,
          ...(freeShippingThreshold !== undefined ? { freeShippingThreshold } : {}),
          ...(shippingFee !== undefined ? { shippingFee: shippingFee ?? 0 } : {}),
          ...(lowStockThreshold !== undefined ? { lowStockThreshold } : {}),
          ...(activeTheme !== undefined ? { activeTheme } : {}),
          ...(announcementEnabled !== undefined ? { announcementEnabled } : {}),
        },
      });
    } catch {
      // Fallback for production databases where only the core StoreSettings columns exist
      updated = await prisma.storeSettings.upsert({
        where: { id: existing?.id || "default" },
        create: baseCreate,
        update: baseUpdate,
      });
    }

    // Also sync hero & about image URLs into CMS sections if updated from Settings
    if (
      heroDesktopImage !== undefined ||
      heroMobileImage !== undefined ||
      aboutDesktopImage !== undefined ||
      aboutMobileImage !== undefined
    ) {
      try {
        const { updateCmsSection } = await import("@/lib/cms");
        if (heroDesktopImage !== undefined || heroMobileImage !== undefined) {
          await updateCmsSection("hero", {
            ...(heroDesktopImage !== undefined ? { desktopImage: heroDesktopImage } : {}),
            ...(heroMobileImage !== undefined ? { mobileImage: heroMobileImage } : {}),
          });
        }
        if (aboutDesktopImage !== undefined || aboutMobileImage !== undefined) {
          await updateCmsSection("about", {
            ...(aboutDesktopImage !== undefined ? { desktopImage: aboutDesktopImage } : {}),
            ...(aboutMobileImage !== undefined ? { mobileImage: aboutMobileImage } : {}),
          });
        }
      } catch {
        // Non-fatal CMS sync
      }
    }

    revalidateStorefrontPaths();

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
