import { NextResponse } from "next/server";
import { getClearSessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const cookieOptions = getClearSessionCookieOptions();
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  response.cookies.set(cookieOptions);
  return response;
}
