import { NextRequest, NextResponse } from "next/server";
import { deleteBlob, validateDeleteUrl } from "@/lib/blob";
import { verifyAdminSession } from "@/lib/auth";

export async function DELETE(request: NextRequest) {
  return handleDelete(request);
}

export async function POST(request: NextRequest) {
  return handleDelete(request);
}

async function handleDelete(request: NextRequest) {
  try {
    // Defense-in-depth: check admin auth if not already intercepted by middleware
    const session = await verifyAdminSession(request);
    if (!session.valid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object" || !rawBody.url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    const url = String(rawBody.url).trim();
    validateDeleteUrl(url);

    const result = await deleteBlob(url);

    return NextResponse.json({
      success: true,
      deletedUrl: result.deletedUrl,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to delete blob";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400 }
    );
  }
}
