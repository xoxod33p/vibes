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

    // 1. Try Firebase Admin SDK verification
    try {
      const decoded = await getAuth().verifyIdToken(tokenToVerify);
      email = decoded.email;
      name = decoded.name;
    } catch (adminErr) {
      console.warn("[google-auth] Admin verifyIdToken fallback:", adminErr instanceof Error ? adminErr.message : adminErr);
    }

    // 2. Try Google Identity Toolkit REST API (verifies Firebase Auth ID tokens directly with Google)
    if (!email) {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
      if (apiKey) {
        try {
          const idToolkitRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: tokenToVerify }),
            }
          );
          if (idToolkitRes.ok) {
            const data = await idToolkitRes.json();
            const u = data.users?.[0];
            if (u?.email) {
              email = u.email;
              name = u.displayName || u.email.split("@")[0];
            }
          }
        } catch (idErr) {
          console.warn("[google-auth] Identity toolkit error:", idErr);
        }
      }
    }

    // 3. Try verifying with Google's public x509 certificates
    if (!email) {
      try {
        const parts = tokenToVerify.split(".");
        if (parts.length === 3) {
          const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
          const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
          const now = Math.floor(Date.now() / 1000);
          if (payload.email && payload.exp && payload.exp > now) {
            const certsRes = await fetch(
              "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
            );
            if (certsRes.ok) {
              const certs = (await certsRes.json()) as Record<string, string>;
              const cert = certs[header.kid];
              if (cert) {
                const verifier = crypto.createVerify("RSA-SHA256");
                verifier.update(`${parts[0]}.${parts[1]}`);
                if (verifier.verify(cert, parts[2], "base64url")) {
                  email = payload.email;
                  name = payload.name || payload.email.split("@")[0];
                }
              }
            }
          }
        }
      } catch (x509Err) {
        console.warn("[google-auth] x509 cert verification error:", x509Err);
      }
    }

    // 4. Try Google OAuth2 tokeninfo (for direct Google OAuth ID tokens)
    if (!email) {
      try {
        const tokenInfoRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`
        );
        if (tokenInfoRes.ok) {
          const payload = await tokenInfoRes.json();
          email = payload.email;
          name = payload.name;
        }
      } catch (oauthErr) {
        console.warn("[google-auth] OAuth2 tokeninfo error:", oauthErr);
      }
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
  } catch (error: unknown) {
    console.error("Google auth error:", error);
    const msg = error instanceof Error ? error.message : "Failed to authenticate with Google";
    return NextResponse.json({ error: `Failed to authenticate with Google: ${msg}` }, { status: 500 });
  }
}
