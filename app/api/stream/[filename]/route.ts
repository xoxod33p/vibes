import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { UPLOAD_FOLDER } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = path.join(/*turbopackIgnore: true*/ UPLOAD_FOLDER, filename);
  if (!fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const stat = fs.statSync(/*turbopackIgnore: true*/ filePath);
  const fileSize = stat.size;
  const range = req.headers.get("range");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || start >= fileSize) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const validEnd = Math.min(end, fileSize - 1);
    const chunkSize = validEnd - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end: validEnd });
    const webStream = Readable.toWeb(fileStream);

    return new Response(webStream as unknown as BodyInit, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${validEnd}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } else {
    const fileStream = fs.createReadStream(filePath);
    const webStream = Readable.toWeb(fileStream);

    return new Response(webStream as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": "audio/mpeg",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  }
}
