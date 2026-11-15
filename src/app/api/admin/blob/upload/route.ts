import { NextRequest, NextResponse } from "next/server";
import { uploadBlob } from "@/lib/blob";

export async function POST(request: NextRequest) {
  try {
    const contentTypeHeader = request.headers.get("content-type") || "";

    let fileBuffer: Buffer;
    let filename = `upload-${Date.now()}`;
    let contentType = "application/octet-stream";

    if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file provided in form data" },
          { status: 400 }
        );
      }

      filename = file.name || filename;
      contentType = file.type;
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else if (contentTypeHeader.includes("application/json")) {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return NextResponse.json(
          { success: false, error: "Invalid JSON payload" },
          { status: 400 }
        );
      }

      filename = body.filename || filename;
      contentType = body.contentType || contentType;

      if (body.base64) {
        fileBuffer = Buffer.from(body.base64, "base64");
      } else if (body.content) {
        fileBuffer = Buffer.from(body.content, "utf8");
      } else {
        return NextResponse.json(
          { success: false, error: "Missing file content or base64 data" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported Content-Type. Use multipart/form-data or application/json",
        },
        { status: 400 }
      );
    }

    const result = await uploadBlob(fileBuffer, filename, contentType);

    return NextResponse.json(
      {
        success: true,
        url: result.url,
        pathname: result.pathname,
        contentType: result.contentType,
        size: result.size,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to upload blob";
    const isOversized = errorMsg.includes("exceeds maximum limit");
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: isOversized ? 413 : 400 }
    );
  }
}
