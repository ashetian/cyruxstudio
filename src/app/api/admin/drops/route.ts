import { NextRequest, NextResponse } from "next/server";
import {
  getDropsSync,
  getActiveDrop,
  saveDrop,
  setActiveDrop,
  deleteDrop,
  type DropData,
} from "@/lib/drops";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const drops = getDropsSync();
    const activeDrop = getActiveDrop();

    return NextResponse.json({
      success: true,
      drops,
      activeDrop,
    });
  } catch (error) {
    console.error("[Admin Drops GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load drops" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // 1. Action: Set Active Drop
    if (body.action === "setActive") {
      const dropId = body.id || body.slug;
      if (!dropId) {
        return NextResponse.json(
          { success: false, error: "Drop ID or slug required" },
          { status: 400 }
        );
      }

      const updated = await setActiveDrop(dropId);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Drop not found" },
          { status: 404 }
        );
      }

      // Sync active drop into StoreSettings brandMetadata
      try {
        const settings = await prisma.storeSettings.findFirst();
        if (settings) {
          const meta = (settings.brandMetadata as Record<string, unknown>) || {};
          await prisma.storeSettings.update({
            where: { id: settings.id },
            data: {
              brandMetadata: {
                ...meta,
                activeDropSlug: updated.slug,
                activeDropNumber: updated.number,
                activeDropTitle: updated.title,
              },
            },
          });
        }
      } catch (err) {
        console.error("[StoreSettings sync error]:", err);
      }

      return NextResponse.json({
        success: true,
        message: `Drop ${updated.number} (${updated.title}) is now active on storefront`,
        activeDrop: updated,
        drops: getDropsSync(),
      });
    }

    // 2. Action: Create or Update Drop
    const { number, title, chapter } = body;
    if (!number?.trim() || !title?.trim() || !chapter?.trim()) {
      return NextResponse.json(
        { success: false, error: "Number, Title, and Chapter are required" },
        { status: 400 }
      );
    }

    const saved = await saveDrop(body as Partial<DropData> & { title: string; number: string; chapter: string });

    // If marked active, sync to StoreSettings
    if (saved.status === "active") {
      try {
        const settings = await prisma.storeSettings.findFirst();
        if (settings) {
          const meta = (settings.brandMetadata as Record<string, unknown>) || {};
          await prisma.storeSettings.update({
            where: { id: settings.id },
            data: {
              brandMetadata: {
                ...meta,
                activeDropSlug: saved.slug,
                activeDropNumber: saved.number,
                activeDropTitle: saved.title,
              },
            },
          });
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      drop: saved,
      activeDrop: getActiveDrop(),
      drops: getDropsSync(),
    });
  } catch (error) {
    console.error("[Admin Drops POST Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save drop" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Drop ID required" },
        { status: 400 }
      );
    }

    const ok = await deleteDrop(id);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Drop not found or cannot be deleted" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      drops: getDropsSync(),
      activeDrop: getActiveDrop(),
    });
  } catch (error) {
    console.error("[Admin Drops DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete drop" },
      { status: 500 }
    );
  }
}
