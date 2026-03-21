import { NextRequest, NextResponse } from "next/server";
import { readTerminalSessionsFile } from "@/lib/utils/terminal-session-operations";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionsData = await readTerminalSessionsFile();
    const session = sessionsData.sessions.find((item) => item.id === params.id);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: `Terminal session not found: ${params.id}`,
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
