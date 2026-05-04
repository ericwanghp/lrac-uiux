import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { PhaseGateRecord, PhaseGateStatus } from "@/lib/types";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";
import { applyPhaseGateDecision, readPhaseGatesFile } from "@/lib/utils/phase-gate-operations";

export const dynamic = "force-dynamic";

const UpdatePhaseGateSchema = z.object({
  status: z.enum(["approved", "rejected", "needs_revision"] satisfies [PhaseGateStatus, ...PhaseGateStatus[]]),
  comment: z.string().optional(),
  actorId: z.string().optional(),
  actorName: z.string().optional(),
  actorRole: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const projectRoot = await getCurrentProjectRoot(request.nextUrl.searchParams.get("project"));
    const { id } = await params;
    const phaseGates = await readPhaseGatesFile(projectRoot);
    const gate = phaseGates.gates.find((item: PhaseGateRecord) => item.id === id);

    if (!gate) {
      return NextResponse.json({ success: false, error: `Phase gate "${id}" not found` }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: gate });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load phase gate",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const projectRoot = await getCurrentProjectRoot(request.nextUrl.searchParams.get("project"));
    const { id } = await params;
    const body = UpdatePhaseGateSchema.parse(await request.json());
    const gate = await applyPhaseGateDecision({
      projectRoot,
      gateId: id,
      decision: {
        actorId: body.actorId || "frontend-user",
        actorName: body.actorName || "Current Reviewer",
        role: body.actorRole || "reviewer",
        decision: body.status,
        comment: body.comment || "",
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true, data: gate });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update phase gate",
      },
      { status: 400 }
    );
  }
}
