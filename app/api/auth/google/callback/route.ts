import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { usersDb } from "@/lib/db";
import { createSessionToken, getSessionCookieOptions, COOKIE_NAME } from "@/lib/auth";
import { generateUniqueUsername } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

function sendErrorResponse(errorMsg: string) {
  const html = `<!DOCTYPE html>
<html>
<head><title>Authentication Error</title></head>
<body>
<script>
if (window.opener) {
  window.opener.postMessage({
    type: "VIBES_GOOGLE_AUTH_ERROR",
    error: ${JSON.stringify(errorMsg)}
  }, "*");
  window.close();
} else {
  alert(${JSON.stringify(errorMsg)});
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

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const authError = req.nextUrl.searchParams.get("error");

  if (authError || !code) {
    return sendErrorResponse(authError || "Authorization code not provided");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return sendErrorResponse("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment");
  }

  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return sendErrorResponse(
        tokenData.error_description || tokenData.error || "Failed to exchange authorization code"
      );
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      return sendErrorResponse("Failed to fetch user profile from Google");
    }

    const profile = await userRes.json();
    const email = profile.email;
    const name = profile.name;

    if (!email) {
      return sendErrorResponse("Google account has no associated email address");
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

    const html = `<!DOCTYPE html>
<html>
<head><title>Authentication Successful</title></head>
<body>
<script>
if (window.opener) {
  window.opener.postMessage({
    type: "VIBES_GOOGLE_AUTH_SUCCESS",
    token: ${JSON.stringify(token)},
    username: ${JSON.stringify(user.username)}
  }, "*");
  window.close();
} else {
  window.location.href = "/";
}
</script>
</body>
</html>`;

    const response = new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });

    const cookieOptions = getSessionCookieOptions(req);
    response.cookies.set(COOKIE_NAME, token, cookieOptions);

    return response;
  } catch (err) {
    console.error("Google callback error:", err);
    return sendErrorResponse("An unexpected error occurred during Google authentication");
  }
}
