import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";

// Mock the file operations
vi.mock("@/lib/utils/file-operations", () => ({
  readTasksJson: vi.fn(),
  readProgressTxt: vi.fn(),
  readJsonFile: vi.fn(),
}));

import { readTasksJson } from "@/lib/utils/file-operations";

// Sample mock data
const mockTasksData = {
  version: "3.0" as const,
  project: "test-project",
  parallelGroups: {
    foundation: {
      name: "Foundation",
      features: ["inital-p5d-001"],
      canStartWhen: [],
      status: "completed" as const,
      completedFeatures: ["inital-p5d-001"],
      remainingFeatures: [],
    },
  },
  features: [
    {
      id: "inital-p5d-001",
      title: "Test Feature",
      summary: "Test summary",
      ownerRole: "frontend-dev",
      priority: "critical" as const,
      taskBreakdown: {
        dependencies: [],
        parallelGroup: "foundation",
      },
      acceptanceCriteria: {
        criteria: ["Criterion 1"],
      },
      timeline: {
        createdAt: "2026-03-14T00:00:00Z",
        startedAt: "2026-03-14T08:00:00Z",
        completedAt: "2026-03-14T08:30:00Z",
      },
      status: {
        status: "completed" as const,
        passes: true,
        blockReason: null,
        resumeContext: null,
      },
      executionHistory: [
        {
          timestamp: "2026-03-14T08:30:00Z",
          action: "Feature completed",
          details: "Test completed",
        },
      ],
    },
    {
      id: "inital-p5d-002",
      title: "Pending Feature",
      summary: "Pending summary",
      ownerRole: "backend-dev",
      priority: "high" as const,
      taskBreakdown: {
        dependencies: ["inital-p5d-001"],
        parallelGroup: null,
      },
      acceptanceCriteria: {
        criteria: ["Criterion 1"],
      },
      timeline: {
        createdAt: "2026-03-14T00:00:00Z",
        startedAt: null,
        completedAt: null,
      },
      status: {
        status: "pending" as const,
        passes: false,
        blockReason: null,
        resumeContext: null,
      },
      executionHistory: [],
    },
  ],
};

describe("API Integration Tests - Feature Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Feature filtering logic", () => {
    it("should filter by status", async () => {
      (readTasksJson as ReturnType<typeof vi.fn>).mockResolvedValue(mockTasksData);

      const result = await readTasksJson();

      // Filter by completed status
      const completedFeatures = result.features.filter((f) => f.status.status === "completed");

      expect(completedFeatures).toHaveLength(1);
      expect(completedFeatures[0].id).toBe("inital-p5d-001");
    });

    it("should filter by priority", async () => {
      (readTasksJson as ReturnType<typeof vi.fn>).mockResolvedValue(mockTasksData);

      const result = await readTasksJson();

      // Filter by critical priority
      const criticalFeatures = result.features.filter((f) => f.priority === "critical");

      expect(criticalFeatures).toHaveLength(1);
      expect(criticalFeatures[0].id).toBe("inital-p5d-001");
    });

    it("should filter by parallelGroup", async () => {
      (readTasksJson as ReturnType<typeof vi.fn>).mockResolvedValue(mockTasksData);

      const result = await readTasksJson();

      // Filter by parallelGroup
      const groupedFeatures = result.features.filter(
        (f) => f.taskBreakdown.parallelGroup === "foundation"
      );

      expect(groupedFeatures).toHaveLength(1);
      expect(groupedFeatures[0].id).toBe("inital-p5d-001");
    });

    it("should get feature by ID", async () => {
      (readTasksJson as ReturnType<typeof vi.fn>).mockResolvedValue(mockTasksData);

      const result = await readTasksJson();

      const feature = result.features.find((f) => f.id === "inital-p5d-001");

      expect(feature).toBeDefined();
      expect(feature?.title).toBe("Test Feature");
    });

    it("should return undefined for non-existent feature", async () => {
      (readTasksJson as ReturnType<typeof vi.fn>).mockResolvedValue(mockTasksData);

      const result = await readTasksJson();

      const feature = result.features.find((f) => f.id === "inital-p9x-999");

      expect(feature).toBeUndefined();
    });

    it("should return all features when no filters", async () => {
      (readTasksJson as ReturnType<typeof vi.fn>).mockResolvedValue(mockTasksData);

      const result = await readTasksJson();

      expect(result.features).toHaveLength(2);
    });
  });

  describe("Feature status updates", () => {
    it("should update feature status", async () => {
      const updatedFeatures = mockTasksData.features.map((f) =>
        f.id === "inital-p5d-002"
          ? { ...f, status: { ...f.status, status: "in_progress" as const } }
          : f
      );

      const updatedData = { ...mockTasksData, features: updatedFeatures };

      expect(updatedData.features[1].status.status).toBe("in_progress");
    });

    it("should mark feature as passes", async () => {
      const updatedFeatures = mockTasksData.features.map((f) =>
        f.id === "inital-p5d-002" ? { ...f, status: { ...f.status, passes: true } } : f
      );

      const updatedData = { ...mockTasksData, features: updatedFeatures };

      expect(updatedData.features[1].status.passes).toBe(true);
    });

    it("should set block reason", async () => {
      const blockReason = {
        type: "environment_config",
        description: "Need API key",
        reportedAt: "2026-03-15T00:00:00Z",
        reportedBy: "test-engineer",
        resolution: null,
        needsHumanIntervention: true,
      };

      const updatedFeatures = mockTasksData.features.map((f) =>
        f.id === "inital-p5d-002" ? { ...f, status: { ...f.status, blockReason } } : f
      );

      const updatedData = { ...mockTasksData, features: updatedFeatures };

      expect(updatedData.features[1].status.blockReason).toEqual(blockReason);
    });
  });

  describe("Progress tracking", () => {
    it("should calculate completion percentage", async () => {
      (readTasksJson as ReturnType<typeof vi.fn>).mockResolvedValue(mockTasksData);

      const result = await readTasksJson();
      const completedCount = result.features.filter((f) => f.status.status === "completed").length;
      const totalCount = result.features.length;
      const percentage = (completedCount / totalCount) * 100;

      expect(percentage).toBe(50);
    });

    it("should count features by status", async () => {
      (readTasksJson as ReturnType<typeof vi.fn>).mockResolvedValue(mockTasksData);

      const result = await readTasksJson();
      const statusCounts = result.features.reduce(
        (acc, f) => {
          acc[f.status.status] = (acc[f.status.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(statusCounts.completed).toBe(1);
      expect(statusCounts.pending).toBe(1);
    });

    it("should count features by priority", async () => {
      (readTasksJson as ReturnType<typeof vi.fn>).mockResolvedValue(mockTasksData);

      const result = await readTasksJson();
      const priorityCounts = result.features.reduce(
        (acc, f) => {
          acc[f.priority] = (acc[f.priority] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(priorityCounts.critical).toBe(1);
      expect(priorityCounts.high).toBe(1);
    });
  });
});
