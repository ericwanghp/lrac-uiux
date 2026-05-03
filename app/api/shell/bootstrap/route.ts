import { NextRequest, NextResponse } from "next/server";
import { ensureClaudeCliServer } from "@/lib/claude-cli/server";
import { getClaudeCliProjectName, getShellSessionId } from "@/lib/claude-cli/session-utils";
import { discoverWorkspaceProjects } from "@/lib/utils/project-discovery";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const requestedProjectRoot = request.nextUrl.searchParams.get("project");
    const currentProjectRoot = await getCurrentProjectRoot(requestedProjectRoot);
    const server = await ensureClaudeCliServer();
    const availableProjects = await discoverWorkspaceProjects(currentProjectRoot);

    return NextResponse.json({
      success: true,
      data: {
        wsBaseUrl: server.wsBaseUrl,
        currentProjectRoot,
        currentProjectName: getClaudeCliProjectName(currentProjectRoot),
        currentSession: server.manager.getSessionDescriptor(getShellSessionId(currentProjectRoot)),
        availableProjects,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to bootstrap shell workspace",
      },
      { status: 500 }
    );
  }
}
