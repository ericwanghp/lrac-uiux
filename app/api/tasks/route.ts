import { NextResponse } from "next/server";
import { readTasksJson } from "@/lib/utils/file-operations";

export async function GET() {
  try {
    const tasksData = await readTasksJson();
    return NextResponse.json({
      success: true,
      data: {
        project: tasksData.project,
        version: tasksData.version,
        features: tasksData.features,
        total: tasksData.features.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read tasks",
      },
      { status: 500 }
    );
  }
}
