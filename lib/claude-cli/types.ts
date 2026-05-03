export type ClaudeCliSessionState = "idle" | "running" | "interrupted" | "failed";

export interface ClaudeCliSessionSummary {
  state: ClaudeCliSessionState;
  pid?: number;
  exitCode?: number;
}

export interface ClaudeCliSessionDescriptor {
  sessionId: string;
  projectRoot: string;
  projectName: string;
  summary: ClaudeCliSessionSummary;
  active: boolean;
}
