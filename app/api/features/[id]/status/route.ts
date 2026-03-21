import { NextRequest, NextResponse } from "next/server";
import { readTasksJson, writeTasksJson } from "@/lib/utils/file-operations";
import { UpdateFeatureStatusInputSchema } from "@/lib/validation";

/**
 * PATCH /api/features/[id]/status
 * Update feature status
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const featureId = params.id;
    const body = await request.json();

    // Validate input
    const validatedInput = UpdateFeatureStatusInputSchema.parse({
      featureId,
      ...body,
    });

    // Read tasks.json
    const tasksData = await readTasksJson();

    // Find feature index
    const featureIndex = tasksData.features.findIndex((f) => f.id === validatedInput.featureId);

    if (featureIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: `Feature not found: ${validatedInput.featureId}`,
        },
        { status: 404 }
      );
    }

    // Update feature
    const feature = tasksData.features[featureIndex];
    if (!feature) {
      return NextResponse.json(
        {
          success: false,
          error: "Feature not found after index lookup",
        },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    // Update status
    feature.status.status = validatedInput.status;
    feature.status.passes = validatedInput.passes;

    if (validatedInput.blockReason !== undefined) {
      feature.status.blockReason = validatedInput.blockReason;
    }

    if (validatedInput.resumeContext !== undefined) {
      feature.status.resumeContext = validatedInput.resumeContext;
    }

    // Update timeline
    if (validatedInput.status === "in_progress" && !feature.timeline.startedAt) {
      feature.timeline.startedAt = now;
    }

    if (validatedInput.status === "completed" && validatedInput.passes) {
      feature.timeline.completedAt = now;
    }

    // Add to execution history
    feature.executionHistory.push({
      timestamp: now,
      action: `Status updated to ${validatedInput.status}`,
      details: `Passes: ${validatedInput.passes}`,
    });

    // Save updated tasks.json
    await writeTasksJson(tasksData);

    // Update parallel group status
    await updateParallelGroupStatus(tasksData, feature.taskBreakdown.parallelGroup);

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        feature,
        message: "Feature status updated successfully",
      },
    });
  } catch (error) {
    console.error("Error updating feature status:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update feature status",
      },
      { status: 500 }
    );
  }
}

/**
 * Update parallel group status based on feature completion
 */
async function updateParallelGroupStatus(
  tasksData: any,
  parallelGroupName: string | null
): Promise<void> {
  if (!parallelGroupName) return;

  const group = tasksData.parallelGroups[parallelGroupName];
  if (!group) return;

  const groupFeatures = tasksData.features.filter((f: any) => group.features.includes(f.id));

  const completedFeatures = groupFeatures.filter(
    (f: any) => f.status.status === "completed" && f.status.passes
  );

  // Initialize arrays if they don't exist
  if (!group.completedFeatures) {
    group.completedFeatures = [];
  }
  if (!group.remainingFeatures) {
    group.remainingFeatures = [];
  }

  // Update arrays
  group.completedFeatures = completedFeatures.map((f: any) => f.id);
  group.remainingFeatures = groupFeatures
    .filter((f: any) => f.status.status !== "completed" || !f.status.passes)
    .map((f: any) => f.id);

  // Update group status
  if (completedFeatures.length === groupFeatures.length) {
    group.status = "completed";
  } else if (completedFeatures.length > 0) {
    group.status = "in_progress";
  }

  await writeTasksJson(tasksData);
}
