import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils/file-operations", () => ({
  getCurrentProjectRoot: vi.fn(),
  readTasksJson: vi.fn(),
}));

vi.mock("@/lib/utils/project-discovery", () => ({
  discoverWorkspaceProjects: vi.fn(),
  describeProjectRoot: vi.fn(),
  createWorkspaceProject: vi.fn(),
}));

import { getCurrentProjectRoot, readTasksJson } from "@/lib/utils/file-operations";
import {
  createWorkspaceProject,
  describeProjectRoot,
  discoverWorkspaceProjects,
} from "@/lib/utils/project-discovery";
import { GET, POST } from "@/app/api/projects/route";

describe("GET /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns current project context and discovered sibling projects", async () => {
    vi.mocked(getCurrentProjectRoot).mockResolvedValue("/workspace/lrac-uiux");
    vi.mocked(readTasksJson).mockResolvedValue({
      version: "3.0",
      project: "LRAC UIUX",
      parallelGroups: {
        foundation: {
          name: "Foundation",
          features: ["task-001"],
          canStartWhen: [],
          status: "completed",
          completedFeatures: ["task-001"],
          remainingFeatures: [],
        },
      },
      features: [
        {
          id: "task-001",
          title: "Foundations",
          summary: "done",
          ownerRole: "frontend-dev",
          priority: "high",
          taskBreakdown: {
            dependencies: [],
            parallelGroup: "foundation",
          },
          acceptanceCriteria: {
            criteria: ["ready"],
          },
          timeline: {
            createdAt: "2026-03-14T00:00:00Z",
            startedAt: "2026-03-14T01:00:00Z",
            completedAt: "2026-03-14T02:00:00Z",
          },
          status: {
            status: "completed",
            passes: true,
            blockReason: null,
            resumeContext: null,
          },
          executionHistory: [],
        },
      ],
    });
    vi.mocked(discoverWorkspaceProjects).mockResolvedValue([
      { root: "/workspace/lrac-uiux", name: "LRAC UIUX" },
      { root: "/workspace/agent-studio", name: "Agent Studio" },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(payload.success).toBe(true);
    expect(payload.data.project).toBe("LRAC UIUX");
    expect(payload.data.currentProjectRoot).toBe("/workspace/lrac-uiux");
    expect(payload.data.availableProjects).toEqual([
      { root: "/workspace/lrac-uiux", name: "LRAC UIUX" },
      { root: "/workspace/agent-studio", name: "Agent Studio" },
    ]);
  });

  it("returns an empty overview when the selected project has no tasks.json yet", async () => {
    vi.mocked(getCurrentProjectRoot).mockResolvedValue("/workspace/claude-code-scaffold");
    vi.mocked(readTasksJson).mockRejectedValue(new Error("File not found"));
    vi.mocked(discoverWorkspaceProjects).mockResolvedValue([
      { root: "/workspace/lrac-uiux", name: "LRAC UIUX" },
      { root: "/workspace/claude-code-scaffold", name: "claude-code-scaffold" },
    ]);
    vi.mocked(describeProjectRoot).mockResolvedValue({
      root: "/workspace/claude-code-scaffold",
      name: "claude-code-scaffold",
      signals: ["package.json", "CLAUDE.md"],
      hasTasksJson: false,
    });

    const response = await GET();
    const payload = await response.json();

    expect(payload.success).toBe(true);
    expect(payload.data.project).toBe("claude-code-scaffold");
    expect(payload.data.currentProjectRoot).toBe("/workspace/claude-code-scaffold");
    expect(payload.data.statistics).toEqual({
      totalFeatures: 0,
      completedFeatures: 0,
      inProgressFeatures: 0,
      pendingFeatures: 0,
      blockedFeatures: 0,
      overallProgress: 0,
    });
    expect(payload.data.parallelGroups).toEqual([]);
  });
});

describe("POST /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a project inside the workspace root", async () => {
    vi.mocked(getCurrentProjectRoot).mockResolvedValue("/workspace/lrac-uiux");
    vi.mocked(createWorkspaceProject).mockResolvedValue({
      root: "/workspace/new-studio",
      name: "new-studio",
      signals: [".auto-coding", "docs", ".stitch"],
      hasTasksJson: false,
    });

    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectPath: "/workspace/new-studio" }),
    });

    const response = await POST(request as any);
    const payload = await response.json();

    expect(payload.success).toBe(true);
    expect(payload.data).toEqual({
      project: "new-studio",
      root: "/workspace/new-studio",
      signals: [".auto-coding", "docs", ".stitch"],
    });
    expect(createWorkspaceProject).toHaveBeenCalledWith("/workspace/new-studio", "/workspace/lrac-uiux");
  });

  it("returns 400 when project path is outside the workspace root", async () => {
    vi.mocked(getCurrentProjectRoot).mockResolvedValue("/workspace/lrac-uiux");
    vi.mocked(createWorkspaceProject).mockRejectedValue(
      new Error("Project path must stay under /workspace")
    );

    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectPath: "/other/new-studio" }),
    });

    const response = await POST(request as any);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("must stay under");
  });
});
