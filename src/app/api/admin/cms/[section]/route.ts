import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getCmsSection,
  getStorefrontCms,
  isCmsSectionKey,
  updateCmsSection,
} from "@/lib/cms";
import { revalidateStorefrontPaths } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ section: string }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { section } = await context.params;
    if (!isCmsSectionKey(section)) {
      return NextResponse.json(
        { success: false, error: `Invalid CMS section: ${section}` },
        { status: 400 }
      );
    }

    const [data, cms] = await Promise.all([
      getCmsSection(section),
      getStorefrontCms(),
    ]);

    return NextResponse.json({
      success: true,
      section,
      data,
      cms,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load CMS section";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  return handleUpdateSection(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  return handleUpdateSection(request, context);
}

async function handleUpdateSection(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { section } = await context.params;
    if (!isCmsSectionKey(section)) {
      return NextResponse.json(
        { success: false, error: `Invalid CMS section: ${section}` },
        { status: 400 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const bodyRecord = rawBody as Record<string, unknown>;
    const payload =
      "data" in bodyRecord &&
      bodyRecord.data &&
      typeof bodyRecord.data === "object" &&
      !Array.isArray(bodyRecord.data)
        ? bodyRecord.data
        : bodyRecord;

    const updatedData = await updateCmsSection(section, payload);
    revalidateStorefrontPaths();
    const cms = await getStorefrontCms();

    return NextResponse.json({
      success: true,
      section,
      data: updatedData,
      cms,
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
      error instanceof Error ? error.message : "Failed to update CMS section";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
