import { NextRequest, NextResponse } from "next/server";
import type { PhaseGateRecord } from "@/lib/types";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";
import { readPhaseGatesFile } from "@/lib/utils/phase-gate-operations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const projectRoot = await getCurrentProjectRoot(request.nextUrl.searchParams.get("project"));
    const gateId = request.nextUrl.searchParams.get("gateId");
    const status = request.nextUrl.searchParams.get("status");
    const phaseGates = await readPhaseGatesFile(projectRoot);

    const filtered = phaseGates.gates.filter((gate: PhaseGateRecord) => {
      if (gateId && gate.id !== gateId) {
        return false;
      }
      if (status && gate.status !== status) {
        return false;
      }
      return true;
    });

    return NextResponse.json({
      success: true,
      data: {
        gates: filtered,
        total: filtered.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load phase gates",
      },
      { status: 500 }
    );
  }
}
