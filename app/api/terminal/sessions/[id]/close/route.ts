import { NextRequest, NextResponse } from "next/server";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";
import { closeTerminalSession } from "@/lib/services/terminal-command-runner";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const requestedProjectRoot = _request.nextUrl.searchParams.get("project");
    const projectRoot = await getCurrentProjectRoot(requestedProjectRoot);
    const session = await closeTerminalSession(id, projectRoot);
    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to close terminal session";
    if (message.includes("not found")) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
