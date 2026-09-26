import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword, createSessionToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = (body.username || "").trim();
    const password = (body.password || "").trim();
    const email = (body.email || "").trim();

    if (!username || username.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 }
      );
    }
    if (username.length > 30) {
      return NextResponse.json(
        { error: "Username must be under 30 characters" },
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existing = db.prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?)").get(username);
    if (existing) {
      return NextResponse.json(
        { error: "Username already taken. Please choose another." },
        { status: 409 }
      );
    }

    const userId = crypto.randomUUID();
    const pwHash = hashPassword(password);

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash)
      VALUES (?, ?, ?, ?)
    `).run(userId, username, email, pwHash);

    const token = await createSessionToken({ userId, username });
    const response = NextResponse.json(
      {
        success: true,
        user: { id: userId, username, email },
      },
      { status: 201 }
    );

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Failed to register user" }, { status: 500 });
  }
}
