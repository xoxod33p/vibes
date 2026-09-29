import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { usersDb } from "@/lib/db";
import { createSessionToken, getSessionCookieOptions, COOKIE_NAME } from "@/lib/auth";
import { generateUniqueUsername } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tokenToVerify = body.idToken || body.credential || body.token;

    if (!tokenToVerify) {
      return NextResponse.json({ error: "Missing authentication token" }, { status: 400 });
    }

    let email: string | undefined;
    let name: string | undefined;

    try {
      const decoded = await getAuth().verifyIdToken(tokenToVerify);
      email = decoded.email;
      name = decoded.name;
    } catch {
      try {
        const tokenInfoRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`
        );
        if (tokenInfoRes.ok) {
          const payload = await tokenInfoRes.json();
          email = payload.email;
          name = payload.name;
        }
      } catch {}
    }

    if (!email) {
      return NextResponse.json({ error: "Could not verify Google authentication token" }, { status: 401 });
    }

    let user = await usersDb.findByEmail(email);

    if (!user) {
      const username = await generateUniqueUsername(name, email);
      const userId = crypto.randomUUID();
      user = await usersDb.create({
        id: userId,
        username,
        email,
        password_hash: "",
      });
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
    console.error("Google auth error:", error);
    return NextResponse.json({ error: "Failed to authenticate with Google" }, { status: 500 });
  }
}
