import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentProjectRoot, sanitizePath } from "@/lib/utils/file-operations";

export const dynamic = "force-dynamic";

type UpdatePayload = {
  relativePath: string;
  content: string;
};

async function resolveMarkdownPath(relativePath: string): Promise<string> {
  const normalized = relativePath.trim();
  if (!normalized.toLowerCase().endsWith(".md")) {
    throw new Error("Only markdown files are supported");
  }
  const projectRoot = await getCurrentProjectRoot();
  return sanitizePath(path.join(projectRoot, normalized), projectRoot);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const relativePath = url.searchParams.get("relativePath");
  if (!relativePath) {
    return NextResponse.json({ success: false, error: "Missing relativePath" }, { status: 400 });
  }

  try {
    const fullPath = await resolveMarkdownPath(relativePath);
    const content = await fs.readFile(fullPath, "utf-8");
    return NextResponse.json({
      success: true,
      data: {
        relativePath,
        content,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read markdown",
      },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  let payload: UpdatePayload;
  try {
    payload = (await request.json()) as UpdatePayload;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload?.relativePath) {
    return NextResponse.json({ success: false, error: "Missing relativePath" }, { status: 400 });
  }

  try {
    const fullPath = await resolveMarkdownPath(payload.relativePath);
    await fs.writeFile(fullPath, payload.content ?? "", "utf-8");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update markdown",
      },
      { status: 400 }
    );
  }
}
