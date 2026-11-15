import { NextRequest, NextResponse } from "next/server";
import { getDropBySlugAsync, saveDrop, deleteDrop } from "@/lib/drops";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const drop = await getDropBySlugAsync(id);

    if (!drop) {
      return NextResponse.json(
        { success: false, error: "Drop not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      drop,
    });
  } catch (error: unknown) {
    console.error("[Admin Drop GET by ID Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve drop" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  return handleUpdate(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  return handleUpdate(request, context);
}

async function handleUpdate(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const existing = await getDropBySlugAsync(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Drop not found" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const updated = await saveDrop({
      ...existing,
      ...body,
      id: existing.id,
    });

    return NextResponse.json({
      success: true,
      drop: updated,
    });
  } catch (error: unknown) {
    console.error("[Admin Drop Update Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update drop" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const deleted = await deleteDrop(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Drop not found or could not be deleted" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Drop deleted successfully",
    });
  } catch (error: unknown) {
    console.error("[Admin Drop DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete drop" },
      { status: 500 }
    );
  }
}
