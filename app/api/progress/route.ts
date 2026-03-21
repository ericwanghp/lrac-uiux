import { NextResponse } from "next/server";
import { readTasksJson } from "@/lib/utils/file-operations";

/**
 * GET /api/progress
 * Get progress summary for dashboard
 */
export async function GET() {
  try {
    // Read tasks.json
    const tasksData = await readTasksJson();

    // Calculate feature statistics by status
    const featuresByStatus = {
      completed: tasksData.features.filter(
        (f) => f.status.status === "completed" && f.status.passes
      ),
      in_progress: tasksData.features.filter((f) => f.status.status === "in_progress"),
      pending: tasksData.features.filter((f) => f.status.status === "pending"),
      blocked: tasksData.features.filter((f) => f.status.status === "blocked"),
    };

    // Calculate feature statistics by priority
    const featuresByPriority = {
      critical: tasksData.features.filter((f) => f.priority === "critical"),
      high: tasksData.features.filter((f) => f.priority === "high"),
      medium: tasksData.features.filter((f) => f.priority === "medium"),
      low: tasksData.features.filter((f) => f.priority === "low"),
    };

    // Calculate parallel group progress
    const parallelGroupProgress = Object.entries(tasksData.parallelGroups).map(([key, group]) => {
      const groupFeatures = tasksData.features.filter((f) => group.features.includes(f.id));
      const completedCount = groupFeatures.filter(
        (f) => f.status.status === "completed" && f.status.passes
      ).length;

      return {
        key,
        name: group.name,
        total: groupFeatures.length,
        completed: completedCount,
        progress:
          groupFeatures.length > 0 ? Math.round((completedCount / groupFeatures.length) * 100) : 0,
        status: group.status,
      };
    });

    // Calculate overall progress
    const totalFeatures = tasksData.features.length;
    const completedFeatures = featuresByStatus.completed.length;
    const overallProgress =
      totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0;

    // Get recent activity (last 5 execution history entries across all features)
    const recentActivity = tasksData.features
      .flatMap((f) =>
        f.executionHistory.map((h) => ({
          featureId: f.id,
          featureTitle: f.title,
          ...h,
        }))
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        overallProgress,
        featuresByStatus: {
          completed: featuresByStatus.completed.length,
          in_progress: featuresByStatus.in_progress.length,
          pending: featuresByStatus.pending.length,
          blocked: featuresByStatus.blocked.length,
        },
        featuresByPriority: {
          critical: featuresByPriority.critical.length,
          high: featuresByPriority.high.length,
          medium: featuresByPriority.medium.length,
          low: featuresByPriority.low.length,
        },
        parallelGroupProgress,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Error getting progress summary:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get progress summary",
      },
      { status: 500 }
    );
  }
}
