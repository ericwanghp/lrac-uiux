import { NextRequest, NextResponse } from "next/server";
import { readTasksJson } from "@/lib/utils/file-operations";
import { ListFeaturesInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/features
 * List all features with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const input = {
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      parallelGroup: searchParams.get("parallelGroup") || undefined,
    };

    // Validate input
    const validatedInput = ListFeaturesInputSchema.parse(input);

    // Read tasks.json
    const tasksData = await readTasksJson();

    // Filter features
    let filteredFeatures = tasksData.features;

    if (validatedInput.status) {
      filteredFeatures = filteredFeatures.filter((f) => f.status.status === validatedInput.status);
    }

    if (validatedInput.priority) {
      filteredFeatures = filteredFeatures.filter((f) => f.priority === validatedInput.priority);
    }

    if (validatedInput.parallelGroup) {
      filteredFeatures = filteredFeatures.filter(
        (f) => f.taskBreakdown.parallelGroup === validatedInput.parallelGroup
      );
    }

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        features: filteredFeatures,
        total: filteredFeatures.length,
        filters: validatedInput,
      },
    });
  } catch (error) {
    console.error("Error listing features:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list features",
      },
      { status: 500 }
    );
  }
}
