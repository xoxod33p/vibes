import { usersDb } from "@/lib/db";

export async function generateUniqueUsername(name?: string, email?: string): Promise<string> {
  let base = (name || email?.split("@")[0] || "user")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);

  if (base.length < 3) {
    base = `user_${base}`;
  }

  let candidate = base;
  let counter = 1;
  while (await usersDb.findByUsername(candidate)) {
    candidate = `${base.slice(0, 15)}_${counter}`;
    counter++;
  }
  return candidate;
}
