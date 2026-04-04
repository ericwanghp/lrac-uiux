import { NextRequest, NextResponse } from "next/server";
import { readTerminalSessionsFile } from "@/lib/utils/terminal-session-operations";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const projectRoot = _request.nextUrl.searchParams.get("project");
    const sessionsData = await readTerminalSessionsFile(projectRoot);
    const session = sessionsData.sessions.find((item) => item.id === id);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: `Terminal session not found: ${id}`,
        },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get terminal session",
      },
      { status: 500 }
    );
  }
}
