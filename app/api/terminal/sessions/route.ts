import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createTerminalSession,
  readTerminalSessionsFile,
  writeTerminalSessionsFile,
} from "@/lib/utils/terminal-session-operations";

const CreateSessionSchema = z.object({
  sessionType: z.enum(["pm_main", "task_child"]),
  featureId: z.string().optional().nullable(),
  parentSessionId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const projectRoot = request.nextUrl.searchParams.get("project");
    const sessionsData = await readTerminalSessionsFile(projectRoot);
    return NextResponse.json({
      success: true,
      data: {
        sessions: sessionsData.sessions,
        total: sessionsData.sessions.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list terminal sessions",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const projectRoot = request.nextUrl.searchParams.get("project");
    const body = await request.json();
    const validatedInput = CreateSessionSchema.parse(body);
    const sessionsData = await readTerminalSessionsFile(projectRoot);
    const session = createTerminalSession(validatedInput);
    sessionsData.sessions.push(session);
    await writeTerminalSessionsFile(sessionsData, projectRoot);
    return NextResponse.json(
      {
        success: true,
        data: session,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create terminal session",
      },
      { status: 500 }
    );
  }
}
