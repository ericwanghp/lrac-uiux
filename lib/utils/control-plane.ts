import type { ApprovalRecord } from "@/lib/types/approval";
import type { Feature } from "@/lib/types";
import type { ActivityEvent, ActivityFeed } from "@/lib/types/activity-feed";

export type BlockerQueueItem = {
  featureId: string;
  title: string;
  ownerRole: string;
  priority: Feature["priority"];
  summary: string;
  reportedAt: string;
  reportedBy: string;
  needsHumanIntervention: boolean;
};

export type WaitingInboxItem = {
  id: string;
  kind: "approval" | "question" | "blocked";
  title: string;
  summary: string;
  timestamp: string;
  featureId: string | null;
  sessionId: string | null;
  sourceEventId?: string;
};

export type SessionTreeNode = {
  session: ActivityFeed;
  children: SessionTreeNode[];
};

function getFeatureTimestamp(feature: Feature): string {
  return (
    feature.status.blockReason?.reportedAt ||
    feature.timeline.startedAt ||
    feature.timeline.createdAt ||
    new Date(0).toISOString()
  );
}

export function deriveBlockerQueue(features: Feature[]): BlockerQueueItem[] {
  return features
    .filter((feature) => feature.status.status === "blocked" && feature.status.blockReason)
    .map((feature) => ({
      featureId: feature.id,
      title: feature.title,
      ownerRole: feature.ownerRole,
      priority: feature.priority,
      summary: feature.status.blockReason?.description || feature.summary,
      reportedAt: feature.status.blockReason?.reportedAt || getFeatureTimestamp(feature),
      reportedBy: feature.status.blockReason?.reportedBy || feature.ownerRole,
      needsHumanIntervention: Boolean(feature.status.blockReason?.needsHumanIntervention),
    }))
    .sort((left, right) => {
      if (left.needsHumanIntervention !== right.needsHumanIntervention) {
        return left.needsHumanIntervention ? -1 : 1;
      }
      return new Date(right.reportedAt).getTime() - new Date(left.reportedAt).getTime();
    });
}

function getPendingInteractionEvents(
  sessions: ActivityFeed[]
): Array<{ session: ActivityFeed; event: ActivityEvent }> {
  const pending = new Map<string, { session: ActivityFeed; event: ActivityEvent }>();
  const resolved = new Set<string>();

  sessions.forEach((session) => {
    session.events.forEach((event) => {
      if (
        event.eventType === "interaction.question.answered" ||
        event.eventType === "interaction.approval.decided" ||
        event.eventType === "interaction.human.routing.created"
      ) {
        const sourceEventId =
          typeof event.payload?.sourceEventId === "string" ? event.payload.sourceEventId : null;
        if (sourceEventId) {
          resolved.add(sourceEventId);
          pending.delete(sourceEventId);
        }
        return;
      }

      if (
        event.eventType === "interaction.question.raised" ||
        event.eventType === "interaction.approval.requested"
      ) {
        pending.set(event.id, { session, event });
      }
    });
  });

  return Array.from(pending.values()).filter(({ event }) => !resolved.has(event.id));
}

export function deriveWaitingInbox(input: {
  features: Feature[];
  approvals: ApprovalRecord[];
  sessions: ActivityFeed[];
}): WaitingInboxItem[] {
  const approvalItems: WaitingInboxItem[] = input.approvals
    .filter((approval) => approval.status === "pending" || approval.status === "needs_revision")
    .map((approval) => ({
      id: approval.id,
      kind: "approval",
      title: approval.documentType,
      summary: `${approval.status.replace("_", " ")} · ${approval.documentPath}`,
      timestamp: approval.updatedAt,
      featureId: approval.featureId,
      sessionId: null,
    }));

  const blockedItems: WaitingInboxItem[] = deriveBlockerQueue(input.features)
    .filter((item) => item.needsHumanIntervention)
    .map((item) => ({
      id: `blocked-${item.featureId}`,
      kind: "blocked",
      title: item.title,
      summary: item.summary,
      timestamp: item.reportedAt,
      featureId: item.featureId,
      sessionId: null,
    }));

  const interactionItems: WaitingInboxItem[] = getPendingInteractionEvents(input.sessions).map(
    ({ session, event }) => ({
      id: event.id,
      kind: event.eventType === "interaction.approval.requested" ? "approval" : "question",
      title:
        typeof event.payload?.title === "string"
          ? event.payload.title
          : event.eventType === "interaction.approval.requested"
            ? "Approval required"
            : "Question requires response",
      summary:
        typeof event.payload?.summary === "string"
          ? event.payload.summary
          : typeof event.payload?.question === "string"
            ? event.payload.question
            : "Pending interaction",
      timestamp: event.timestamp,
      featureId: session.featureId,
      sessionId: session.id,
      sourceEventId: event.id,
    })
  );

  return [...interactionItems, ...approvalItems, ...blockedItems].sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  );
}

export function buildSessionTree(sessions: ActivityFeed[]): SessionTreeNode[] {
  const nodeMap = new Map<string, SessionTreeNode>();

  sessions.forEach((session) => {
    nodeMap.set(session.id, { session, children: [] });
  });

  const roots: SessionTreeNode[] = [];

  sessions.forEach((session) => {
    const node = nodeMap.get(session.id);
    if (!node) return;
    if (session.parentSessionId) {
      const parentNode = nodeMap.get(session.parentSessionId);
      if (parentNode) {
        parentNode.children.push(node);
        return;
      }
    }
    roots.push(node);
  });

  const sortTree = (nodes: SessionTreeNode[]) => {
    nodes.sort(
      (left, right) =>
        new Date(left.session.createdAt).getTime() - new Date(right.session.createdAt).getTime()
    );
    nodes.forEach((node) => sortTree(node.children));
    return nodes;
  };

  return sortTree(roots);
}
