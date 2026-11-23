import { NextRequest, NextResponse } from "next/server";
import {
  getDrops,
  getActiveDropAsync,
  saveDrop,
  setActiveDrop,
  deleteDrop,
  type DropData,
} from "@/lib/drops";
import prisma from "@/lib/db";
import { adminDropSchema } from "@/lib/validations";
import { revalidateStorefrontPaths } from "@/lib/revalidate";

export async function GET() {
  try {
    const drops = await getDrops();
    const activeDrop = await getActiveDropAsync();

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

    if (body.action === "setActive") {
      const dropId = body.id || body.slug;
      if (!dropId) {
        return NextResponse.json(
          { success: false, error: "Drop ID or slug required" },
          { status: 400 }
        );
      }

      const updated = await setActiveDrop(String(dropId));
      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Drop not found" },
          { status: 404 }
        );
      }

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

      revalidateStorefrontPaths(["/", "/drops", "/drops/latest"]);

      return NextResponse.json({
        success: true,
        message: `Drop ${updated.number} (${updated.title}) is now active on storefront`,
        activeDrop: updated,
        drops: await getDrops(),
      });
    }

    const parsed = adminDropSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message ||
            "Number, Title, and Chapter are required",
        },
        { status: 400 }
      );
    }

    const saved = await saveDrop(
      parsed.data as Partial<DropData> & {
        title: string;
        number: string;
        chapter: string;
      }
    );

    revalidateStorefrontPaths(["/", "/drops", "/drops/latest"]);

    return NextResponse.json({
      success: true,
      drop: saved,
      activeDrop: await getActiveDropAsync(),
      drops: await getDrops(),
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

    revalidateStorefrontPaths(["/", "/drops", "/drops/latest"]);

    return NextResponse.json({
      success: true,
      drops: await getDrops(),
      activeDrop: await getActiveDropAsync(),
    });
  } catch (error) {
    console.error("[Admin Drops DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete drop" },
      { status: 500 }
    );
  }
}
