import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureClaudeCliServer } from "@/lib/claude-cli/server";
import {
  DEFAULT_CLAUDE_CLI_COLS,
  DEFAULT_CLAUDE_CLI_ROWS,
  getClaudeCliProjectName,
  getPreferredShellCommand,
  getShellSessionId,
} from "@/lib/claude-cli/session-utils";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";

const ShellSessionSchema = z.object({
  projectRoot: z.string().optional().nullable(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveProjectRootFromRequest(request: NextRequest): Promise<string> {
  const projectRootParam =
    request.nextUrl.searchParams.get("projectRoot") || request.nextUrl.searchParams.get("project");
  return getCurrentProjectRoot(projectRootParam);
}

export async function GET(request: NextRequest) {
  try {
    const projectRoot = await resolveProjectRootFromRequest(request);
    const server = await ensureClaudeCliServer();
    const sessionId = getShellSessionId(projectRoot);

    server.manager.registerSession(sessionId, projectRoot, getClaudeCliProjectName(projectRoot));

    return NextResponse.json({
      success: true,
      data: server.manager.getSessionDescriptor(sessionId),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load shell session",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = ShellSessionSchema.parse(await request.json().catch(() => ({})));
    const projectRoot = await getCurrentProjectRoot(body.projectRoot || request.nextUrl.searchParams.get("project"));
    const server = await ensureClaudeCliServer();
    const sessionId = getShellSessionId(projectRoot);
    const existing = server.manager.getSessionDescriptor(sessionId);

    if (!existing?.active) {
      server.manager.startSession({
        sessionId,
        projectRoot,
        projectName: getClaudeCliProjectName(projectRoot),
        command: getPreferredShellCommand(),
        args: [],
        cols: DEFAULT_CLAUDE_CLI_COLS,
        rows: DEFAULT_CLAUDE_CLI_ROWS,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        wsBaseUrl: server.wsBaseUrl,
        session: server.manager.getSessionDescriptor(sessionId),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to start shell session",
      },
      { status: 500 }
    );
  }
}
