import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { COVERS_FOLDER } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = path.join(/*turbopackIgnore: true*/ COVERS_FOLDER, filename);
  if (!fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
    return NextResponse.json({ error: "Cover not found" }, { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  let contentType = "image/jpeg";
  if (ext === ".png") contentType = "image/png";
  else if (ext === ".webp") contentType = "image/webp";
  else if (ext === ".gif") contentType = "image/gif";

  const stat = fs.statSync(/*turbopackIgnore: true*/ filePath);
  const fileStream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(fileStream);

  return new Response(webStream as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": stat.size.toString(),
      "Cache-Control": "public, max-age=2592000, immutable",
    },
  });
}
