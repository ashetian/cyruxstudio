import { NextRequest, NextResponse } from "next/server";
import { adminLoginSchema } from "@/lib/validations";
import {
  verifyAdminCredentials,
  createAdminSessionToken,
  getSessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const validation = adminLoginSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    const isValid = verifyAdminCredentials(email, password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await createAdminSessionToken({
      email,
      sub: "admin",
      role: "admin",
    });

    const cookieOptions = getSessionCookieOptions(token);
    const response = NextResponse.json({
      success: true,
      message: "Authentication successful",
      email,
    });

    response.cookies.set(cookieOptions);
    return response;
  } catch (error: unknown) {
    console.error("[Admin Login Error]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
