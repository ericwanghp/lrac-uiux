import { NextRequest, NextResponse } from "next/server";
import { readTasksJson } from "@/lib/utils/file-operations";
import { GetFeatureInputSchema } from "@/lib/validation";

/**
 * GET /api/features/[id]
 * Get single feature by ID
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: featureId } = await params;

    // Validate input
    const validatedInput = GetFeatureInputSchema.parse({ featureId });

    // Read tasks.json
    const tasksData = await readTasksJson();

    // Find feature
    const feature = tasksData.features.find((f) => f.id === validatedInput.featureId);

    if (!feature) {
      return NextResponse.json(
        {
          success: false,
          error: `Feature not found: ${validatedInput.featureId}`,
        },
        { status: 404 }
      );
    }

    // Get parallel group info
    const parallelGroupName = feature.taskBreakdown.parallelGroup;
    const parallelGroup = parallelGroupName ? tasksData.parallelGroups[parallelGroupName] : null;

    // Get dependency features
    const dependencies = tasksData.features.filter((f) =>
      feature.taskBreakdown.dependencies.includes(f.id)
    );

    // Get dependent features (features that depend on this one)
    const dependents = tasksData.features.filter((f) =>
      f.taskBreakdown.dependencies.includes(feature.id)
    );

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        feature,
        parallelGroup,
        dependencies,
        dependents,
      },
    });
  } catch (error) {
    console.error("Error getting feature:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get feature",
      },
      { status: 500 }
    );
  }
}
