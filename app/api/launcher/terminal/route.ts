import { NextRequest, NextResponse } from "next/server";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";
import { launchMacTerminalAtPath } from "@/lib/services/native-terminal-launcher";

export async function POST(request: NextRequest) {
  try {
    const requestedProjectRoot = request.nextUrl.searchParams.get("project");
    const projectRoot = getCurrentProjectRoot(requestedProjectRoot);

    await launchMacTerminalAtPath(projectRoot);

    return NextResponse.json({
      success: true,
      data: {
        projectRoot,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to open Terminal",
      },
      { status: 500 }
    );
  }
}
