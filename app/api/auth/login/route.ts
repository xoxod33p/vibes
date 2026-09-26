import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSessionToken, COOKIE_NAME } from "@/lib/auth";

interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = (body.username || "").trim();
    const password = (body.password || "").trim();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = db.prepare(
      "SELECT * FROM users WHERE LOWER(username) = LOWER(?)"
    ).get(username) as UserRow | undefined;

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = await createSessionToken({ userId: user.id, username: user.username });
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
