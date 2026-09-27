import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
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

export async function getCurrentUser(): Promise<SessionPayload | null> {
  try {
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

  // Handle standard bcrypt format
  try {
    return bcrypt.compareSync(password, storedHash);
  } catch {
    return false;
  }
}
