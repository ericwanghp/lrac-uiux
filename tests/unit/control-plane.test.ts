import { describe, expect, it } from "vitest";
import type { ApprovalRecord } from "@/lib/types/approval";
import type { Feature } from "@/lib/types";
import type { ActivityFeed } from "@/lib/types/activity-feed";
import {
  buildSessionTree,
  deriveBlockerQueue,
  deriveWaitingInbox,
} from "@/lib/utils/control-plane";

const baseFeature: Feature = {
  id: "inital-p5d-001",
  title: "Build control plane",
  summary: "Create the main control-plane experience.",
  ownerRole: "frontend-dev",
  priority: "high",
  taskBreakdown: {
    dependencies: [],
    parallelGroup: null,
  },
  acceptanceCriteria: {
    criteria: ["Works"],
  },
  timeline: {
    createdAt: "2026-03-21T10:00:00.000Z",
    startedAt: null,
    completedAt: null,
  },
  status: {
    status: "pending",
    passes: false,
    blockReason: null,
    resumeContext: null,
  },
  executionHistory: [],
};

function createSession(overrides: Partial<ActivityFeed>): ActivityFeed {
  return {
    id: "session-root",
    parentSessionId: null,
    sessionType: "pm_main",
    featureId: "inital-p5d-001",
    status: "active",
    createdAt: "2026-03-21T10:00:00.000Z",
    updatedAt: "2026-03-21T10:05:00.000Z",
    closedAt: null,
    nextSeqNo: 3,
    events: [],
    ...overrides,
  };
}

function createApproval(overrides: Partial<ApprovalRecord>): ApprovalRecord {
  return {
    id: "approval-1",
    featureId: "doc-arch",
    type: "architecture",
    status: "pending",
    requester: "Architect",
    requesterRole: "architect",
    documentPath: "docs/architecture/ARCH-control-plane.md",
    documentType: "Architecture Design",
    comments: [],
    approvers: ["Architecture Reviewer"],
    approvedBy: [],
    rejectedBy: [],
    createdAt: "2026-03-21T10:00:00.000Z",
    updatedAt: "2026-03-21T10:30:00.000Z",
    decidedAt: null,
    ...overrides,
  };
}

describe("control-plane selectors", () => {
  it("derives blocker queue with human-intervention blockers first", () => {
    const blockers = deriveBlockerQueue([
      {
        ...baseFeature,
        id: "inital-p5d-002",
        title: "Needs secret",
        status: {
          ...baseFeature.status,
          status: "blocked",
          blockReason: {
            type: "environment_config",
            description: "Missing production secret",
            reportedAt: "2026-03-21T11:00:00.000Z",
            reportedBy: "devops-engineer",
            resolution: null,
            needsHumanIntervention: true,
          },
        },
      },
      {
        ...baseFeature,
        id: "inital-p5d-003",
        title: "Minor flaky test",
        status: {
          ...baseFeature.status,
          status: "blocked",
          blockReason: {
            type: "test_failure",
            description: "Retryable flaky test",
            reportedAt: "2026-03-21T12:00:00.000Z",
            reportedBy: "qa-engineer",
            resolution: null,
            needsHumanIntervention: false,
          },
        },
      },
    ]);

    expect(blockers).toHaveLength(2);
    expect(blockers[0]?.featureId).toBe("inital-p5d-002");
    expect(blockers[0]?.needsHumanIntervention).toBe(true);
  });

  it("derives waiting inbox from approvals and unresolved interaction events", () => {
    const waiting = deriveWaitingInbox({
      features: [
        {
          ...baseFeature,
          id: "inital-p5d-004",
          title: "Await human fix",
          status: {
            ...baseFeature.status,
            status: "blocked",
            blockReason: {
              type: "dependency",
              description: "Need stakeholder answer",
              reportedAt: "2026-03-21T10:45:00.000Z",
              reportedBy: "project-manager",
              resolution: null,
              needsHumanIntervention: true,
            },
          },
        },
      ],
      approvals: [createApproval({ status: "needs_revision" })],
      sessions: [
        createSession({
          events: [
            {
              id: "event-question-1",
              sessionId: "session-root",
              seqNo: 1,
              eventType: "interaction.question.raised",
              streamType: "system",
              timestamp: "2026-03-21T10:40:00.000Z",
              actor: { type: "agent", id: "pm-agent" },
              payload: {
                title: "Need product decision",
                question: "Should we defer the export flow?",
              },
            },
            {
              id: "event-question-2",
              sessionId: "session-root",
              seqNo: 2,
              eventType: "interaction.question.raised",
              streamType: "system",
              timestamp: "2026-03-21T10:50:00.000Z",
              actor: { type: "agent", id: "pm-agent" },
              payload: {
                title: "Need owner assignment",
                question: "Who owns the deployment rollback path?",
              },
            },
            {
              id: "event-answer-2",
              sessionId: "session-root",
              seqNo: 3,
              eventType: "interaction.question.answered",
              streamType: "system",
              timestamp: "2026-03-21T10:52:00.000Z",
              actor: { type: "user", id: "frontend-user" },
              payload: {
                sourceEventId: "event-question-2",
                answer: "Platform team",
              },
            },
          ],
        }),
      ],
    });

    expect(waiting.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["approval", "question", "blocked"])
    );
    expect(waiting.some((item) => item.sourceEventId === "event-question-1")).toBe(true);
    expect(waiting.some((item) => item.sourceEventId === "event-question-2")).toBe(false);
  });

  it("builds a parent-child session tree", () => {
    const tree = buildSessionTree([
      createSession({
        id: "root",
        parentSessionId: null,
        sessionType: "pm_main",
      }),
      createSession({
        id: "child-a",
        parentSessionId: "root",
        sessionType: "task_child",
        featureId: "inital-p5d-002",
      }),
      createSession({
        id: "child-b",
        parentSessionId: "root",
        sessionType: "task_child",
        featureId: "inital-p6t-001",
      }),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.session.id).toBe("root");
    expect(tree[0]?.children.map((item) => item.session.id)).toEqual(["child-a", "child-b"]);
  });
});
