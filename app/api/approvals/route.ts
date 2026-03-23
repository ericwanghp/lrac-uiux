import { NextRequest, NextResponse } from "next/server";
import { syncApprovalsWithProject } from "@/lib/utils/approval-operations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const projectRoot = request.nextUrl.searchParams.get("project");
    const approvals = await syncApprovalsWithProject(projectRoot);
    const documentPath = request.nextUrl.searchParams.get("documentPath");
    const status = request.nextUrl.searchParams.get("status");

    let filteredApprovals = approvals;

    if (documentPath) {
      filteredApprovals = filteredApprovals.filter(
        (approval) => approval.documentPath === documentPath
      );
    }

    if (status) {
      filteredApprovals = filteredApprovals.filter((approval) => approval.status === status);
    }

    return NextResponse.json({
      success: true,
      data: {
        approvals: filteredApprovals,
        total: filteredApprovals.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load approvals",
      },
      { status: 500 }
    );
  }
}
