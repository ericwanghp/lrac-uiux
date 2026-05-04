import { NextRequest, NextResponse } from "next/server";
import { readPhaseGateSummaries } from "@/lib/utils/phase-gate-summary";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const projectRoot = request.nextUrl.searchParams.get("project");
    const summaries = await readPhaseGateSummaries(projectRoot);
    return NextResponse.json({
      success: true,
      data: {
        summaries,
        pendingCount: summaries.filter((summary) => summary.status === "pending").length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load phase gate summary",
      },
      { status: 500 }
    );
  }
}
