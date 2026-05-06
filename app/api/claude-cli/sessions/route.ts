import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureClaudeCliServer } from "@/lib/claude-cli/server";
import { listWorkspaceRunningSessions } from "@/lib/claude-cli/list-workspace-running-sessions";
import {
  DEFAULT_CLAUDE_CLI_COLS,
  DEFAULT_CLAUDE_CLI_ROWS,
  getClaudeCliProjectName,
  getClaudeCliSessionId,
} from "@/lib/claude-cli/session-utils";
import { discoverAllImacWorktreeRoots, discoverWorkspaceProjects } from "@/lib/utils/project-discovery";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";
import { listImacSessions } from "@/lib/services/imac-session-manager";

const ClaudeCliSessionSchema = z.object({
  projectRoot: z.string().optional().nullable(),
  args: z.array(z.string()).optional(),
  defaultPrompt: z.string().trim().optional().nullable(),
  continueWithRecentContext: z.boolean().optional(),
  dangerouslySkipPermissions: z.boolean().optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveProjectRootFromRequest(request: NextRequest): Promise<string> {
  const projectRootParam =
    request.nextUrl.searchParams.get("projectRoot") || request.nextUrl.searchParams.get("project");
  return getCurrentProjectRoot(projectRootParam);
}

function buildClaudeCliArgs(body: z.infer<typeof ClaudeCliSessionSchema>): string[] {
  const nextArgs = [...(body.args ?? [])];

  if (body.continueWithRecentContext) {
    nextArgs.push("-c");
  }

  if (body.dangerouslySkipPermissions) {
    nextArgs.push("--dangerously-skip-permissions");
  }

  if (body.defaultPrompt) {
    nextArgs.push(body.defaultPrompt);
  }

  return nextArgs;
}

export async function GET(request: NextRequest) {
  try {
    const projectRoot = await resolveProjectRootFromRequest(request);
    const server = await ensureClaudeCliServer();
    const workspaceRequested = request.nextUrl.searchParams.get("workspace") === "1";

    if (workspaceRequested) {
      const availableProjects = await discoverWorkspaceProjects(projectRoot);
      const projectRoots = availableProjects.map((project) => project.root);
      const worktreeRoots = await discoverAllImacWorktreeRoots(projectRoots);
      const allRoots = [...projectRoots, ...worktreeRoots];
      const runningSessions = listWorkspaceRunningSessions(
        server.manager as unknown as Parameters<typeof listWorkspaceRunningSessions>[0],
        allRoots
      );

      const activeWorktreeCounts: Record<string, number> = {};
      await Promise.all(
        projectRoots.map(async (root) => {
          try {
            const sessions = await listImacSessions(root);
            activeWorktreeCounts[root] = sessions.filter(
              (s) => s.status === "created" || s.status === "in-progress"
            ).length;
          } catch {
            activeWorktreeCounts[root] = 0;
          }
        })
      );

      return NextResponse.json({
        success: true,
        data: {
          runningSessions,
          activeWorktreeCounts,
        },
      });
    }

    const sessionId = getClaudeCliSessionId(projectRoot);

    server.manager.registerSession(sessionId, projectRoot, getClaudeCliProjectName(projectRoot));

    return NextResponse.json({
      success: true,
      data: server.manager.getSessionDescriptor(sessionId),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load Claude Code session",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = ClaudeCliSessionSchema.parse(await request.json().catch(() => ({})));
    const projectRoot = await getCurrentProjectRoot(body.projectRoot || request.nextUrl.searchParams.get("project"));
    const server = await ensureClaudeCliServer();
    const sessionId = getClaudeCliSessionId(projectRoot);
    const existing = server.manager.getSessionDescriptor(sessionId);
    const args = buildClaudeCliArgs(body);

    if (!existing?.active) {
      server.manager.startSession({
        sessionId,
        projectRoot,
        projectName: getClaudeCliProjectName(projectRoot),
        command: "claude",
        args,
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
        error: error instanceof Error ? error.message : "Failed to start Claude Code session",
      },
      { status: 500 }
    );
  }
}
