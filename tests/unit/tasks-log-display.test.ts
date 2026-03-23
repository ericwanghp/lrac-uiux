import { describe, expect, it } from "vitest";
import {
  applyInteractionEvent,
  dismissPendingInteraction,
  resolveActivityFeedOwnershipState,
  resolveTrackedFeatureId,
} from "@/lib/utils/tasks-log-display";

describe("resolveTrackedFeatureId", () => {
  const features = [{ id: "feature-a" }, { id: "feature-b" }];

  it("keeps the selected feature when it still exists", () => {
    expect(resolveTrackedFeatureId("feature-b", features)).toBe("feature-b");
  });

  it("falls back to the first available feature when selection is missing", () => {
    expect(resolveTrackedFeatureId("feature-z", features)).toBe("feature-a");
  });

  it("returns an empty string when there are no features to track", () => {
    expect(resolveTrackedFeatureId("", [])).toBe("");
  });
});

describe("applyInteractionEvent", () => {
  it("adds raised interaction events into a timestamp-sorted queue", () => {
    const queue = applyInteractionEvent(
      applyInteractionEvent([], {
        id: "evt-2",
        eventType: "interaction.approval.requested",
        timestamp: "2026-03-22T10:02:00.000Z",
        payload: { title: "Need prod rollout approval", summary: "Deploy to production?" },
      }),
      {
        id: "evt-1",
        eventType: "interaction.question.raised",
        timestamp: "2026-03-22T10:01:00.000Z",
        payload: { title: "Need PM answer", question: "Ship behind feature flag?" },
      }
    );

    expect(queue).toHaveLength(2);
    expect(queue[0]?.eventId).toBe("evt-1");
    expect(queue[0]?.kind).toBe("question");
    expect(queue[1]?.eventId).toBe("evt-2");
    expect(queue[1]?.kind).toBe("approval");
  });

  it("removes a raised interaction when answer/decision references sourceEventId", () => {
    const queued = applyInteractionEvent([], {
      id: "evt-1",
      eventType: "interaction.question.raised",
      timestamp: "2026-03-22T10:01:00.000Z",
      payload: { title: "Need PM answer", question: "Ship behind feature flag?" },
    });
    const resolved = applyInteractionEvent(queued, {
      id: "evt-2",
      eventType: "interaction.question.answered",
      timestamp: "2026-03-22T10:03:00.000Z",
      payload: { sourceEventId: "evt-1", answer: "Yes" },
    });

    expect(resolved).toEqual([]);
  });
});

describe("dismissPendingInteraction", () => {
  it("removes the selected interaction id from the queue", () => {
    const queue = [
      {
        eventId: "evt-1",
        kind: "question" as const,
        title: "Need answer",
        description: "Question",
        raisedAt: "2026-03-22T10:01:00.000Z",
      },
      {
        eventId: "evt-2",
        kind: "approval" as const,
        title: "Need approval",
        description: "Approval",
        raisedAt: "2026-03-22T10:02:00.000Z",
      },
    ];
    expect(dismissPendingInteraction(queue, "evt-1").map((item) => item.eventId)).toEqual([
      "evt-2",
    ]);
  });
});

describe("resolveActivityFeedOwnershipState", () => {
  it("returns waiting_human when any blocking interaction exists", () => {
    expect(
      resolveActivityFeedOwnershipState({
        hasBlockingInteraction: true,
        isInteractionSubmitting: false,
        isCommandSubmitting: false,
        isPaused: false,
        isConnecting: false,
        isLive: true,
      })
    ).toBe("waiting_human");
  });

  it("returns live when connected and no blockers", () => {
    expect(
      resolveActivityFeedOwnershipState({
        hasBlockingInteraction: false,
        isInteractionSubmitting: false,
        isCommandSubmitting: false,
        isPaused: false,
        isConnecting: false,
        isLive: true,
      })
    ).toBe("live");
  });
});
