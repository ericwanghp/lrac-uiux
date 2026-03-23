import { NextRequest, NextResponse } from "next/server";
import { UpdateApprovalInputSchema } from "@/lib/validation";
import {
  readApprovalsFile,
  syncApprovalsWithProject,
  writeApprovalsFile,
} from "@/lib/utils/approval-operations";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const projectRoot = _request.nextUrl.searchParams.get("project");
    const { id } = await params;
    const approvals = await syncApprovalsWithProject(projectRoot);
    const approval = approvals.find((record) => record.id === id);

    if (!approval) {
      return NextResponse.json(
        {
          success: false,
          error: `Approval record "${id}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: approval,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load approval record",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const projectRoot = request.nextUrl.searchParams.get("project");
    const { id } = await params;
    const body = await request.json();
    const validatedInput = UpdateApprovalInputSchema.parse(body);
    await syncApprovalsWithProject(projectRoot);

    const approvalsData = await readApprovalsFile(projectRoot);
    const approvalIndex = approvalsData.approvals.findIndex((record) => record.id === id);

    if (approvalIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: `Approval record "${id}" not found`,
        },
        { status: 404 }
      );
    }

    const existingApproval = approvalsData.approvals[approvalIndex];

    if (!existingApproval) {
      return NextResponse.json(
        {
          success: false,
          error: `Approval record "${id}" not found`,
        },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const nextStatus = validatedInput.status ?? existingApproval.status;
    const actor = validatedInput.actor?.trim();
    const approvedBy =
      nextStatus === "approved" && actor && !existingApproval.approvedBy.includes(actor)
        ? [...existingApproval.approvedBy, actor]
        : existingApproval.approvedBy;
    const rejectedBy =
      nextStatus === "rejected" && actor && !existingApproval.rejectedBy.includes(actor)
        ? [...existingApproval.rejectedBy, actor]
        : existingApproval.rejectedBy;

    approvalsData.approvals[approvalIndex] = {
      ...existingApproval,
      status: nextStatus,
      comments: validatedInput.comment
        ? [...existingApproval.comments, validatedInput.comment]
        : existingApproval.comments,
      approvedBy,
      rejectedBy,
      updatedAt: now,
      decidedAt:
        nextStatus === "approved" || nextStatus === "rejected" || nextStatus === "needs_revision"
          ? now
          : existingApproval.decidedAt,
    };

    await writeApprovalsFile(approvalsData, projectRoot);

    return NextResponse.json({
      success: true,
      data: approvalsData.approvals[approvalIndex],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update approval record",
      },
      { status: 400 }
    );
  }
}
