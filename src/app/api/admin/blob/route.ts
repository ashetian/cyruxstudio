import { NextRequest, NextResponse } from "next/server";
import { listAllBlobs } from "@/lib/blob";
import { verifyAdminSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session.valid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const blobs = await listAllBlobs();

    return NextResponse.json({
      success: true,
      blobs,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to list blobs";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
