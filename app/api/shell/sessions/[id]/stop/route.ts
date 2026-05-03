import { NextRequest, NextResponse } from "next/server";
import { ensureClaudeCliServer } from "@/lib/claude-cli/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const server = await ensureClaudeCliServer();
    server.manager.stopSession(id);

    return NextResponse.json({
      success: true,
      data: server.manager.getSessionDescriptor(id),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to stop shell session",
      },
      { status: 500 }
    );
  }
}
