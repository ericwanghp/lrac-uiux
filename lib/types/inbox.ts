export type InboxMessageStatus = "unread" | "read" | "resolved";

export interface InboxMessage {
  id: string;
  recipientMemberId: string;
  kind: "phase-gate-approval";
  status: InboxMessageStatus;
  title: string;
  summary: string;
  projectRoot: string;
  gateId?: string;
  approvalUrl?: string;
  createdAt: string;
  readAt: string | null;
  resolvedAt: string | null;
}

export interface InboxEnvelope {
  version: "1.0";
  messages: InboxMessage[];
}
