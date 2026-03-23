import { NextResponse } from "next/server";
import {
  loadProgressSessions,
  readArtifacts,
  readCodeArtifacts,
  readExplicitArtifacts,
  readTaskLogsByPhase,
} from "@/lib/utils/phase-view-data";

export async function GET() {
  try {
    const [sessions, taskLogs, designDocs, stitchDocs, prototypes] = await Promise.all([
      loadProgressSessions(),
      readTaskLogsByPhase([2.5]),
      readArtifacts("design"),
      readExplicitArtifacts([".stitch/DESIGN.md", ".stitch/SITE.md", ".stitch/next-prompt.md"]),
      readCodeArtifacts(
        ".stitch/designs",
        (name) =>
          name.toLowerCase().endsWith(".png") ||
          name.toLowerCase().endsWith(".jpg") ||
          name.toLowerCase().endsWith(".jpeg") ||
          name.toLowerCase().endsWith(".webp") ||
          name.toLowerCase().endsWith(".html"),
        100
      ),
    ]);

    const phaseSessions = sessions.filter((session) =>
      ["ui-ux-designer", "ux-designer", "frontend-dev"].includes(session.role)
    );
    const phaseCompleted = stitchDocs.some((artifact) => artifact.name === "DESIGN.md");

    return NextResponse.json({
      success: true,
      data: {
        phaseCompleted,
        sessions: phaseSessions,
        taskLogs,
        artifacts: {
          designDocs,
          stitchDocs,
          prototypes,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load design phase data",
      },
      { status: 500 }
    );
  }
}
