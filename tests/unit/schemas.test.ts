import { describe, it, expect } from "vitest";
import {
  ApprovalStatusSchema,
  CreateApprovalInputSchema,
  FeatureStatusSchema,
  FeaturePrioritySchema,
  CreateFeatureInputSchema,
  UpdateFeatureStatusInputSchema,
  ListFeaturesInputSchema,
  QASessionStatusSchema,
  CreateQASessionInputSchema,
  UpdateUserSettingsInputSchema,
} from "@/lib/validation/schemas";

describe("Validation Schemas", () => {
  describe("FeatureStatusSchema", () => {
    it("should accept valid statuses", () => {
      expect(FeatureStatusSchema.parse("pending")).toBe("pending");
      expect(FeatureStatusSchema.parse("in_progress")).toBe("in_progress");
      expect(FeatureStatusSchema.parse("completed")).toBe("completed");
      expect(FeatureStatusSchema.parse("blocked")).toBe("blocked");
    });

    it("should reject invalid status", () => {
      expect(() => FeatureStatusSchema.parse("invalid")).toThrow();
    });
  });

  describe("FeaturePrioritySchema", () => {
    it("should accept valid priorities", () => {
      expect(FeaturePrioritySchema.parse("critical")).toBe("critical");
      expect(FeaturePrioritySchema.parse("high")).toBe("high");
      expect(FeaturePrioritySchema.parse("medium")).toBe("medium");
      expect(FeaturePrioritySchema.parse("low")).toBe("low");
    });

    it("should reject invalid priority", () => {
      expect(() => FeaturePrioritySchema.parse("invalid")).toThrow();
    });
  });

  describe("CreateFeatureInputSchema", () => {
    it("should accept valid input", () => {
      const input = {
        title: "Test Feature",
        summary: "Test summary",
        ownerRole: "frontend-dev",
        priority: "high" as const,
        dependencies: [],
        parallelGroup: null,
        acceptanceCriteria: ["Criterion 1"],
      };
      const result = CreateFeatureInputSchema.parse(input);
      expect(result.title).toBe("Test Feature");
      expect(result.priority).toBe("high");
    });

    it("should reject missing required fields", () => {
      const input = {
        title: "Test Feature",
        // missing summary, ownerRole, priority, acceptanceCriteria
      };
      expect(() => CreateFeatureInputSchema.parse(input)).toThrow();
    });

    it("should reject empty title", () => {
      const input = {
        title: "",
        summary: "Test summary",
        ownerRole: "frontend-dev",
        priority: "high" as const,
        acceptanceCriteria: ["Criterion 1"],
      };
      expect(() => CreateFeatureInputSchema.parse(input)).toThrow();
    });

    it("should reject empty acceptance criteria", () => {
      const input = {
        title: "Test Feature",
        summary: "Test summary",
        ownerRole: "frontend-dev",
        priority: "high" as const,
        acceptanceCriteria: [],
      };
      expect(() => CreateFeatureInputSchema.parse(input)).toThrow();
    });

    it("should use defaults for optional fields", () => {
      const input = {
        title: "Test Feature",
        summary: "Test summary",
        ownerRole: "frontend-dev",
        priority: "high" as const,
        acceptanceCriteria: ["Criterion 1"],
      };
      const result = CreateFeatureInputSchema.parse(input);
      expect(result.dependencies).toEqual([]);
      expect(result.parallelGroup).toBeNull();
    });
  });

  describe("UpdateFeatureStatusInputSchema", () => {
    it("should accept valid input", () => {
      const input = {
        featureId: "inital-p5d-001",
        status: "in_progress" as const,
        passes: true,
      };
      const result = UpdateFeatureStatusInputSchema.parse(input);
      expect(result.featureId).toBe("inital-p5d-001");
      expect(result.status).toBe("in_progress");
    });

    it("should reject invalid feature ID format", () => {
      const input = {
        featureId: "INVALID",
        status: "in_progress" as const,
        passes: true,
      };
      expect(() => UpdateFeatureStatusInputSchema.parse(input)).toThrow();
    });
  });

  describe("ListFeaturesInputSchema", () => {
    it("should accept empty input", () => {
      const result = ListFeaturesInputSchema.parse({});
      expect(result).toEqual({});
    });

    it("should accept status filter", () => {
      const result = ListFeaturesInputSchema.parse({ status: "pending" });
      expect(result.status).toBe("pending");
    });

    it("should accept priority filter", () => {
      const result = ListFeaturesInputSchema.parse({ priority: "high" });
      expect(result.priority).toBe("high");
    });

    it("should accept multiple filters", () => {
      const result = ListFeaturesInputSchema.parse({
        status: "pending",
        priority: "high",
        parallelGroup: "foundation",
      });
      expect(result.status).toBe("pending");
      expect(result.priority).toBe("high");
      expect(result.parallelGroup).toBe("foundation");
    });
  });

  describe("QASessionStatusSchema", () => {
    it("should accept valid statuses", () => {
      expect(QASessionStatusSchema.parse("pending")).toBe("pending");
      expect(QASessionStatusSchema.parse("in_progress")).toBe("in_progress");
      expect(QASessionStatusSchema.parse("completed")).toBe("completed");
      expect(QASessionStatusSchema.parse("cancelled")).toBe("cancelled");
    });

    it("should reject invalid status", () => {
      expect(() => QASessionStatusSchema.parse("invalid")).toThrow();
    });
  });

  describe("CreateQASessionInputSchema", () => {
    it("should accept valid input", () => {
      const input = {
        projectId: "test-project",
        phase: 1,
      };
      const result = CreateQASessionInputSchema.parse(input);
      expect(result.projectId).toBe("test-project");
      expect(result.phase).toBe(1);
    });

    it("should reject invalid phase", () => {
      const input = {
        projectId: "test-project",
        phase: 9, // Invalid: must be 1-8
      };
      expect(() => CreateQASessionInputSchema.parse(input)).toThrow();
    });

    it("should accept optional initial questions", () => {
      const input = {
        projectId: "test-project",
        phase: 1,
        initialQuestions: ["Question 1", "Question 2"],
      };
      const result = CreateQASessionInputSchema.parse(input);
      expect(result.initialQuestions).toEqual(["Question 1", "Question 2"]);
    });

    it("should accept structured initial questions", () => {
      const input = {
        projectId: "test-project",
        phase: 1,
        initialQuestions: [
          {
            id: "project-goal",
            question: "What is the goal?",
            type: "textarea" as const,
            helpText: "Describe the main objective",
          },
        ],
      };
      const result = CreateQASessionInputSchema.parse(input);
      expect(result.initialQuestions?.[0]).toMatchObject({
        id: "project-goal",
        question: "What is the goal?",
        type: "textarea",
      });
    });
  });

  describe("ApprovalStatusSchema", () => {
    it("should accept valid approval statuses", () => {
      expect(ApprovalStatusSchema.parse("pending")).toBe("pending");
      expect(ApprovalStatusSchema.parse("approved")).toBe("approved");
      expect(ApprovalStatusSchema.parse("rejected")).toBe("rejected");
      expect(ApprovalStatusSchema.parse("needs_revision")).toBe("needs_revision");
    });
  });

  describe("CreateApprovalInputSchema", () => {
    it("should accept valid approval input", () => {
      const result = CreateApprovalInputSchema.parse({
        featureId: "doc-arch-lrac-uiux-md",
        type: "architecture",
        requester: "Architect",
        requesterRole: "architect",
        documentPath: "docs/architecture/ARCH-lrac-uiux.md",
        documentType: "Architecture Design",
        approvers: ["Architecture Reviewer"],
      });

      expect(result.type).toBe("architecture");
      expect(result.approvers).toEqual(["Architecture Reviewer"]);
    });
  });

  describe("UpdateUserSettingsInputSchema", () => {
    it("should accept partial settings updates", () => {
      const result = UpdateUserSettingsInputSchema.parse({
        theme: "light",
        autoSave: false,
      });

      expect(result.theme).toBe("light");
      expect(result.autoSave).toBe(false);
    });
  });
});
