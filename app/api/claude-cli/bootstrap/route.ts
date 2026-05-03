import { NextRequest, NextResponse } from "next/server";
import { ensureClaudeCliServer } from "@/lib/claude-cli/server";
import { getClaudeCliSessionId } from "@/lib/claude-cli/session-utils";
import { describeProjectRoot, discoverWorkspaceProjects } from "@/lib/utils/project-discovery";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";

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
