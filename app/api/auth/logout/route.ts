import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    expires: new Date(0),
    maxAge: 0,
    path: "/",
  });
  return response;
}

