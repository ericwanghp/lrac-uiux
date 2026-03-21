import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function GET(_request: Request, { params }: { params: { filename: string } }) {
  const fileName = path.basename(params.filename || "");
  const ext = path.extname(fileName).toLowerCase();
  if (!fileName || !MIME_TYPES[ext]) {
    return NextResponse.json(
      { success: false, error: "Unsupported design asset" },
      { status: 400 }
    );
  }

  const fullPath = path.join(getCurrentProjectRoot(), ".stitch", "designs", fileName);
  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) {
      return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 });
    }
    const data = await fs.readFile(fullPath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": MIME_TYPES[ext],
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 });
  }
}
