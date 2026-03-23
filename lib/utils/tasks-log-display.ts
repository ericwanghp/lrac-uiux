type FeatureLike = {
  id: string;
};

export type PendingInteractionKind = "question" | "approval";

export type PendingInteraction = {
  eventId: string;
  kind: PendingInteractionKind;
  title: string;
  description: string;
  raisedAt: string;
  sessionId?: string;
};

type InteractionEventLike = {
  id?: string;
  sessionId?: string;
  eventType: string;
  timestamp: string;
  payload?: Record<string, unknown>;
};

export type ActivityFeedOwnershipState =
  | "waiting_human"
  | "syncing_decision"
  | "dispatching_command"
  | "paused"
  | "connecting"
  | "live"
  | "offline";

export function resolveTrackedFeatureId(
  selectedFeatureId: string,
  features: FeatureLike[]
): string {
  if (selectedFeatureId && features.some((feature) => feature.id === selectedFeatureId)) {
    return selectedFeatureId;
  }

  return features[0]?.id || "";
}

function toInteractionDescription(event: InteractionEventLike): string {
  if (event.eventType === "interaction.question.raised") {
    if (typeof event.payload?.question === "string") return event.payload.question;
    if (typeof event.payload?.description === "string") return event.payload.description;
    return "Please provide an answer to continue this session.";
  }
  if (typeof event.payload?.summary === "string") return event.payload.summary;
  if (typeof event.payload?.request === "string") return event.payload.request;
  return "Review this request and provide a decision.";
}

function toInteractionTitle(event: InteractionEventLike): string {
  if (typeof event.payload?.title === "string" && event.payload.title.trim()) {
    return event.payload.title.trim();
  }
  return event.eventType === "interaction.approval.requested"
    ? "Approval required"
    : "Question requires response";
}

export function applyInteractionEvent(
  queue: PendingInteraction[],
  event: InteractionEventLike
): PendingInteraction[] {
  if (
    event.eventType === "interaction.question.answered" ||
    event.eventType === "interaction.approval.decided" ||
    event.eventType === "interaction.human.routing.created"
  ) {
    const sourceEventId =
      typeof event.payload?.sourceEventId === "string" ? event.payload.sourceEventId : "";
    if (!sourceEventId) return queue;
    return queue.filter((item) => item.eventId !== sourceEventId);
  }

  if (
    event.eventType !== "interaction.question.raised" &&
    event.eventType !== "interaction.approval.requested"
  ) {
    return queue;
  }

  const eventId = event.id || "";
  if (!eventId) return queue;

  const nextItem: PendingInteraction = {
    eventId,
    kind: event.eventType === "interaction.approval.requested" ? "approval" : "question",
    title: toInteractionTitle(event),
    description: toInteractionDescription(event),
    raisedAt: event.timestamp,
    sessionId: event.sessionId,
  };

  const withoutSame = queue.filter((item) => item.eventId !== eventId);
  return [...withoutSame, nextItem].sort(
    (left, right) => new Date(left.raisedAt).getTime() - new Date(right.raisedAt).getTime()
  );
}

export function dismissPendingInteraction(
  queue: PendingInteraction[],
  eventId: string
): PendingInteraction[] {
  return queue.filter((item) => item.eventId !== eventId);
}

export function getActivePendingInteraction(
  queue: PendingInteraction[]
): PendingInteraction | null {
  return queue[0] || null;
}

export function resolveActivityFeedOwnershipState(input: {
  hasBlockingInteraction: boolean;
  isInteractionSubmitting: boolean;
  isCommandSubmitting: boolean;
  isPaused: boolean;
  isConnecting: boolean;
  isLive: boolean;
}): ActivityFeedOwnershipState {
  if (input.hasBlockingInteraction) return "waiting_human";
  if (input.isInteractionSubmitting) return "syncing_decision";
  if (input.isCommandSubmitting) return "dispatching_command";
  if (input.isPaused) return "paused";
  if (input.isConnecting) return "connecting";
  if (input.isLive) return "live";
  return "offline";
}
