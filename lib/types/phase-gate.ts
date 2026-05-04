import type { PhaseId } from "@/lib/types/settings";

export type PhaseGateStatus = "pending" | "approved" | "rejected" | "needs_revision";

export interface PhaseGateDecision {
  actorId: string;
  actorName: string;
  role: string;
  decision: PhaseGateStatus;
  comment: string;
  timestamp: string;
}

export interface PhaseGateNotification {
  channelId: string;
  channelLabel: string;
  status: "sent" | "failed" | "skipped";
  sentAt: string;
  error?: string;
}

export interface PhaseGateRecord {
  id: string;
  phase: PhaseId;
  phaseLabel: string;
  status: PhaseGateStatus;
  projectRoot: string;
  projectName: string;
  triggeredByFeatureIds: string[];
  requiredRoles: string[];
  requestedStakeholderIds: string[];
  approvalUrl: string;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  notifications: PhaseGateNotification[];
  decisions: PhaseGateDecision[];
}

export interface PhaseGatesJson {
  version: "1.0";
  gates: PhaseGateRecord[];
}
