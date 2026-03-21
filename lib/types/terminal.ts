export type TerminalSessionStatus = "active" | "closed";
export type TerminalSessionType = "pm_main" | "task_child";
export type TerminalEventType =
  | "terminal.command.submitted"
  | "terminal.output.appended"
  | "terminal.command.finished"
  | "interaction.question.raised"
  | "interaction.question.answered"
  | "interaction.approval.requested"
  | "interaction.approval.decided"
  | "interaction.human.routing.created"
  | "session.child.spawned"
  | "session.child.closed";
export type TerminalStreamType = "stdout" | "stderr" | "system";

export interface TerminalActor {
  type: "user" | "agent" | "system";
  id: string;
}

export interface TerminalEventPayload {
  [key: string]: unknown;
}

export interface TerminalEvent {
  id: string;
  sessionId: string;
  seqNo: number;
  eventType: TerminalEventType;
  streamType: TerminalStreamType;
  timestamp: string;
  actor: TerminalActor;
  payload: TerminalEventPayload;
}

export interface TerminalSession {
  id: string;
  parentSessionId: string | null;
  sessionType: TerminalSessionType;
  featureId: string | null;
  status: TerminalSessionStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  nextSeqNo: number;
  events: TerminalEvent[];
}

export interface TerminalSessionsJson {
  version: "1.0";
  sessions: TerminalSession[];
}
