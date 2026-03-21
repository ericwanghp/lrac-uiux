import { NextResponse } from "next/server";
import { PHASE_SYMBOL_TO_PHASE, TASK_ID_REGEX } from "@/lib/constants/task-id";

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        format: "{iteration}-{phaseSymbol}-{sequence}",
        firstIteration: "inital",
        regex: TASK_ID_REGEX.source,
        phaseSymbolMap: PHASE_SYMBOL_TO_PHASE,
        examples: ["inital-p1r-001", "inital-p25d-003", "imac-dashboard-persistence-bind-p5d-001"],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load task id schema",
      },
      { status: 500 }
    );
  }
}
