import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { usersDb } from "@/lib/db";
import { createSessionToken, getSessionCookieOptions, COOKIE_NAME } from "@/lib/auth";
import { generateUniqueUsername } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    const html = `<!DOCTYPE html>
<html>
<head><title>Authentication</title></head>
<body>
<script>
if (window.opener) {
  window.opener.postMessage({
    type: "VIBES_GOOGLE_AUTH_ERROR",
    error: "Google Sign-In is not configured yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"
  }, "*");
  window.close();
} else {
  alert("Google Sign-In is not configured yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env");
  window.location.href = "/";
}
</script>
</body>
</html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tokenToVerify = body.credential || body.idToken;

    if (!tokenToVerify) {
      return NextResponse.json({ error: "Missing credential token" }, { status: 400 });
    }

    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`
    );

    if (!tokenInfoRes.ok) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
    }

    const payload = await tokenInfoRes.json();
    const email = payload.email;
    const name = payload.name;

    if (!email) {
      return NextResponse.json({ error: "Email not provided by Google" }, { status: 400 });
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
