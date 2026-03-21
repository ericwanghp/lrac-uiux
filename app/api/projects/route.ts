import { NextResponse } from "next/server";
import { readTasksJson } from "@/lib/utils/file-operations";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects
 * Get project overview with summary statistics
 */
export async function GET() {
  try {
    // Read tasks.json
    const tasksData = await readTasksJson();

    // Calculate statistics
    const totalFeatures = tasksData.features.length;
    const completedFeatures = tasksData.features.filter(
      (f) => f.status.status === "completed" && f.status.passes
    ).length;
    const inProgressFeatures = tasksData.features.filter(
      (f) => f.status.status === "in_progress"
    ).length;
    const pendingFeatures = tasksData.features.filter((f) => f.status.status === "pending").length;
    const blockedFeatures = tasksData.features.filter((f) => f.status.status === "blocked").length;

    // Calculate overall progress
    const overallProgress =
      totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0;

    // Get parallel group status
    const parallelGroups = Object.entries(tasksData.parallelGroups).map(([_key, group]) => ({
      name: group.name,
      total: group.features.length,
      completed: group.features.filter((fId) => {
        const feature = tasksData.features.find((f) => f.id === fId);
        return feature?.status.status === "completed" && feature?.status.passes;
      }).length,
      status: group.status,
    }));

    // Get current phase (highest phase with in_progress or latest completed)
    const phasePriority: Record<string, number> = {
      foundation: 1,
      "ui-components": 2,
      "phase-1-core": 3,
      "phase-1-interactive": 4,
      "phase-2-enhanced": 5,
    };

    let currentPhase = "foundation";
    let maxPriority = 0;

    Object.entries(tasksData.parallelGroups).forEach(([key, group]) => {
      const priority = phasePriority[key as keyof typeof phasePriority] || 999;
      if (
        (group.status === "in_progress" || group.status === "completed") &&
        priority > maxPriority
      ) {
        maxPriority = priority;
        currentPhase = key;
      }
    });

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        project: tasksData.project,
        version: tasksData.version,
        statistics: {
          totalFeatures,
          completedFeatures,
          inProgressFeatures,
          pendingFeatures,
          blockedFeatures,
          overallProgress,
        },
        currentPhase,
        parallelGroups,
      },
    });
  } catch (error) {
    console.error("Error getting project overview:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get project overview",
      },
      { status: 500 }
    );
  }
}
