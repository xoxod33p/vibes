import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { inspectMediaUrl } from "@/lib/media-resolver";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Please sign in or create an account to import music" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const url = (body.url || "").trim();

    if (!url) {
      return NextResponse.json({ error: "Please provide a valid URL" }, { status: 400 });
    }

    const resolved = await inspectMediaUrl(url);
    return NextResponse.json({ success: true, ...resolved });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to inspect link";
    console.error("Media inspect error:", error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
