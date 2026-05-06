import { NextRequest, NextResponse } from "next/server";
import { listWorkspaceRunningSessions } from "@/lib/claude-cli/list-workspace-running-sessions";
import { ensureClaudeCliServer } from "@/lib/claude-cli/server";
import { getClaudeCliSessionId } from "@/lib/claude-cli/session-utils";
import { describeProjectRoot, discoverAllImacWorktreeRoots, discoverWorkspaceProjects } from "@/lib/utils/project-discovery";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";
import { listImacSessions } from "@/lib/services/imac-session-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const requestedProjectRoot = request.nextUrl.searchParams.get("project");
    const currentProjectRoot = await getCurrentProjectRoot(requestedProjectRoot);
    const server = await ensureClaudeCliServer();
    const [currentProject, availableProjects] = await Promise.all([
      describeProjectRoot(currentProjectRoot),
      discoverWorkspaceProjects(currentProjectRoot),
    ]);
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
        wsBaseUrl: server.wsBaseUrl,
        currentProjectRoot,
        currentProjectName: currentProject.name,
        currentSession: server.manager.getSessionDescriptor(
          getClaudeCliSessionId(currentProjectRoot)
        ),
        availableProjects,
        runningSessions,
        activeWorktreeCounts,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to bootstrap Claude Code CLI",
      },
      { status: 500 }
    );
  }
}
