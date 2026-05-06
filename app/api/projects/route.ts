import { NextRequest, NextResponse } from "next/server";
import { getCurrentProjectRoot, readTasksJson } from "@/lib/utils/file-operations";
import {
  createWorkspaceProject,
  describeProjectRoot,
  discoverImacWorktreeRoots,
  discoverWorkspaceProjects,
} from "@/lib/utils/project-discovery";
import type { TasksJson } from "@/lib/types";
import { CreateProjectInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

function createEmptyTasks(projectName: string): TasksJson {
  return {
    version: "3.0",
    project: projectName,
    parallelGroups: {},
    features: [],
  };
}

/**
 * GET /api/projects
 * Get project overview with summary statistics
 */
export async function GET(request?: NextRequest) {
  try {
    const requestedProjectRoot = request?.nextUrl.searchParams.get("project");
    const currentProjectRoot = await getCurrentProjectRoot(requestedProjectRoot);
    const [tasksResult, availableProjects, currentProjectDescriptor] = await Promise.all([
      readTasksJson(currentProjectRoot).catch(() => null),
      discoverWorkspaceProjects(currentProjectRoot),
      describeProjectRoot(currentProjectRoot),
    ]);

    const tasksData =
      tasksResult || createEmptyTasks(currentProjectDescriptor.name || "current-project");

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

    // Enrich projects with IMAC worktree counts
    const worktreeCounts = await Promise.all(
      availableProjects.map((p) => discoverImacWorktreeRoots(p.root).then((r) => r.length))
    );
    const enrichedProjects = availableProjects.map((p, i) => ({
      ...p,
      imacWorktreeCount: worktreeCounts[i] || undefined,
    }));

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        project: tasksData.project,
        version: tasksData.version,
        currentProjectRoot,
        availableProjects: enrichedProjects,
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

export async function POST(request: NextRequest) {
  try {
    const requestUrl =
      (request as NextRequest & { nextUrl?: URL }).nextUrl ?? new URL((request as Request).url);
    const wantsStream = requestUrl.searchParams.get("stream") === "1";
    const currentProjectRoot = await getCurrentProjectRoot();
    const body = await request.json();
    const { projectPath, options } = CreateProjectInputSchema.parse(body);
    if (wantsStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const emitEvent = (event: string, data: unknown) => {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          };

          void (async () => {
            try {
              emitEvent("start", {
                projectPath,
                options,
              });

              const bootstrapResult = await createWorkspaceProject(
                projectPath,
                currentProjectRoot,
                options,
                {
                  onLine: (line) => emitEvent("log", { line }),
                }
              );

              emitEvent("done", {
                project: bootstrapResult.project.name,
                root: bootstrapResult.project.root,
                signals: bootstrapResult.project.signals,
                command: bootstrapResult.command,
                output: bootstrapResult.output,
                generatedPaths: bootstrapResult.generatedPaths,
              });
              controller.close();
            } catch (error) {
              emitEvent("error", {
                error: error instanceof Error ? error.message : "Failed to create project",
              });
              controller.close();
            }
          })();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const bootstrapResult = await createWorkspaceProject(projectPath, currentProjectRoot, options);

    return NextResponse.json({
      success: true,
      data: {
        project: bootstrapResult.project.name,
        root: bootstrapResult.project.root,
        signals: bootstrapResult.project.signals,
        command: bootstrapResult.command,
        output: bootstrapResult.output,
        generatedPaths: bootstrapResult.generatedPaths,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project";
    const status =
      message.includes("must stay under") || message.includes("already exists") ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}
