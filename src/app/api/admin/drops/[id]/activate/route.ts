import { NextRequest, NextResponse } from "next/server";
import { setActiveDrop } from "@/lib/drops";
import { revalidateStorefrontPaths } from "@/lib/revalidate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const activated = await setActiveDrop(id);

    if (!activated) {
      return NextResponse.json(
        { success: false, error: "Drop not found to activate" },
        { status: 404 }
      );
    }

    revalidateStorefrontPaths(["/", "/drops", "/drops/latest"]);

    return NextResponse.json({
      success: true,
      drop: activated,
    });
  } catch (error: unknown) {
    console.error("[Admin Drop Activate Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to activate drop" },
      { status: 500 }
    );
  }
}
