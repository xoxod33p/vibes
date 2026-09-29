import { NextRequest, NextResponse } from "next/server";
import { usersDb } from "@/lib/db";
import { verifyPassword, createSessionToken, getSessionCookieOptions, COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const identifier = (body.username || body.email || body.identifier || "").trim();
    const password = (body.password || "").trim();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Find user by username OR email
    const user = await usersDb.findByUsernameOrEmail(identifier);

    let isMatch = false;
    if (user) {
      isMatch = verifyPassword(password, user.password_hash);
      // Try untrimmed password fallback if trimmed failed
      if (!isMatch && body.password && body.password !== password) {
        isMatch = verifyPassword(body.password, user.password_hash);
      }
    }

    if (!user || !isMatch) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = await createSessionToken({ userId: user.id, username: user.username });
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });

    const cookieOptions = getSessionCookieOptions(req);
    response.cookies.set(COOKIE_NAME, token, cookieOptions);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
