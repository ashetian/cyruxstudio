import { NextRequest, NextResponse } from "next/server";
import { deleteBlob, validateDeleteUrl } from "@/lib/blob";
import { verifyAdminSession } from "@/lib/auth";
import { blobDeleteSchema } from "@/lib/validations";

export async function DELETE(request: NextRequest) {
  return handleDelete(request);
}

export async function POST(request: NextRequest) {
  return handleDelete(request);
}

async function handleDelete(request: NextRequest) {
  try {
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
    const parsed = blobDeleteSchema.safeParse({ url });
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid blob URL",
        },
        { status: 400 }
      );
    }

    const result = await deleteBlob(parsed.data.url);

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
