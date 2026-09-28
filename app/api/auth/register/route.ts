import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword, createSessionToken, getSessionCookieOptions, COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

    if (email) {
      const existingEmail = db.prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(?)").get(email);
      if (existingEmail) {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        );
      }
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
        token,
        user: { id: userId, username, email },
      },
      { status: 201 }
    );

    const cookieOptions = getSessionCookieOptions(req);
    response.cookies.set(COOKIE_NAME, token, cookieOptions);

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Failed to register user" }, { status: 500 });
  }
}

