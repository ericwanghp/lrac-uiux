import { NextResponse } from "next/server";
import { mergeWorktree } from "@/lib/services/imac-session-manager";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await mergeWorktree(id);
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to merge worktree" },
      { status: 500 }
    );
  }
}
