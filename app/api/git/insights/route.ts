import { NextRequest, NextResponse } from "next/server";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";
import { readGitInsights } from "@/lib/utils/git-insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const requestedProjectRoot = request.nextUrl.searchParams.get("project");
    const focusPath = request.nextUrl.searchParams.get("focusPath");
    const projectRoot = await getCurrentProjectRoot(requestedProjectRoot);
    const insights = await readGitInsights(projectRoot, { focusPath });

    return NextResponse.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load git insights",
      },
      { status: 500 }
    );
  }
}
