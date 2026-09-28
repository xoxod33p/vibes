import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "vibes-black-blue-player-sqlite-secret-key-2026"
);
export const COOKIE_NAME = "vibes_session";

export interface SessionPayload {
  userId: string;
  username: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      username: payload.username as string,
    };
  } catch {
    return null;
  }
}

/**
 * Returns cookie options adapted for HTTP vs HTTPS environments.
 * If running over plain HTTP (e.g. self-hosted server without SSL), secure is false
 * so browsers don't reject/drop the cookie.
 */
export function getSessionCookieOptions(req?: NextRequest) {
  let isSecure = false;
  if (process.env.COOKIE_SECURE !== undefined) {
    isSecure = process.env.COOKIE_SECURE === "true" || process.env.COOKIE_SECURE === "1";
  } else if (req) {
    const forwardedProto = req.headers.get("x-forwarded-proto");
    isSecure = forwardedProto === "https" || req.nextUrl.protocol === "https:";
  } else if (process.env.NODE_ENV === "production" && process.env.NEXTAUTH_URL?.startsWith("https://")) {
    isSecure = true;
  }

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  };
}

export async function getCurrentUser(req?: Request | NextRequest): Promise<SessionPayload | null> {
  try {
    // 1. Try explicit request Authorization header
    if (req) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7).trim();
        const payload = await verifySessionToken(token);
        if (payload) return payload;
      }
    }

    // 2. Try Next.js incoming request headers
    try {
      const reqHeaders = await headers();
      const authHeader = reqHeaders.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7).trim();
        const payload = await verifySessionToken(token);
        if (payload) return payload;
      }
    } catch {
      // Ignore if called in environment without headers()
    }

    // 3. Fallback to session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !password) return false;

  // Plain-text match fallback (e.g. manually inserted debug users)
  if (storedHash === password) return true;

  // Handle Werkzeug scrypt format: scrypt:N:r:p$salt$hash
  if (storedHash.startsWith("scrypt:")) {
    try {
      const parts = storedHash.split("$");
      if (parts.length === 3) {
        const params = parts[0].split(":");
        const N = parseInt(params[1], 10) || 32768;
        const r = parseInt(params[2], 10) || 8;
        const p = parseInt(params[3], 10) || 1;
        const salt = parts[1];
        const expectedHex = parts[2];

        const derived = crypto.scryptSync(password, salt, 64, {
          N,
          r,
          p,
          maxmem: 128 * 1024 * 1024,
        });

        const derivedHex = derived.toString("hex");
        const a = Buffer.from(derivedHex, "utf-8");
        const b = Buffer.from(expectedHex, "utf-8");
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(a, b);
      }
    } catch (e) {
      console.error("scrypt verification error:", e);
      return false;
    }
  }

  // Handle Werkzeug pbkdf2 format: pbkdf2:sha256:iterations$salt$hash
  if (storedHash.startsWith("pbkdf2:")) {
    try {
      const parts = storedHash.split("$");
      if (parts.length === 3) {
        const meta = parts[0].split(":");
        const digest = meta[1] || "sha256";
        const iterations = parseInt(meta[2], 10) || 150000;
        const salt = parts[1];
        const expectedHex = parts[2];
        const keyLen = Buffer.from(expectedHex, "hex").length || 32;
        const derived = crypto.pbkdf2Sync(password, salt, iterations, keyLen, digest);
        const a = Buffer.from(derived.toString("hex"), "utf-8");
        const b = Buffer.from(expectedHex, "utf-8");
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(a, b);
      }
    } catch (e) {
      console.error("pbkdf2 verification error:", e);
      return false;
    }
  }

  // Handle standard bcrypt format ($2a$, $2b$, $2y$)
  try {
    return bcrypt.compareSync(password, storedHash);
  } catch {
    return false;
  }
}
