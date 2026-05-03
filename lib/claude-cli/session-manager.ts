import { PtySession } from "@/lib/claude-cli/pty-session";
import type {
  ClaudeCliSessionDescriptor,
  ClaudeCliSessionSummary,
} from "@/lib/claude-cli/types";
import { getClaudeCliProjectName } from "@/lib/claude-cli/session-utils";

export interface ClaudeCliSessionListener {
  id: number;
  onOutput?: (data: Buffer) => void;
  onStateChange?: (summary: ClaudeCliSessionSummary) => void;
  onExit?: (code: number) => void;
}

interface ActiveProcessState {
  pty: PtySession;
  cols: number;
  rows: number;
  rawOutput: Buffer[];
  rawOutputSize: number;
}

interface SessionEntry {
  sessionId: string;
  projectRoot: string;
  projectName: string;
  summary: ClaudeCliSessionSummary;
  active: ActiveProcessState | null;
  listeners: Map<number, ClaudeCliSessionListener>;
}

let listenerCounter = 0;

export class ClaudeCliSessionManager {
  private static readonly RAW_OUTPUT_MAX = 1024 * 1024;

  private sessions = new Map<string, SessionEntry>();

  private getOrCreateEntry(
    sessionId: string,
    projectRoot: string,
    projectName = getClaudeCliProjectName(projectRoot)
  ): SessionEntry {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      existing.projectRoot = projectRoot;
      existing.projectName = projectName;
      return existing;
    }

    const entry: SessionEntry = {
      sessionId,
      projectRoot,
      projectName,
      summary: { state: "idle" },
      active: null,
      listeners: new Map<number, ClaudeCliSessionListener>(),
    };
    this.sessions.set(sessionId, entry);
    return entry;
  }

  registerSession(sessionId: string, projectRoot: string, projectName?: string): SessionEntry {
    return this.getOrCreateEntry(sessionId, projectRoot, projectName);
  }

  startSession(options: {
    sessionId: string;
    projectRoot: string;
    projectName?: string;
    command: string;
    args?: string[];
    cols?: number;
    rows?: number;
    env?: Record<string, string | undefined>;
  }): ClaudeCliSessionDescriptor {
    const entry = this.getOrCreateEntry(options.sessionId, options.projectRoot, options.projectName);
    if (entry.active) {
      this.stopSession(entry.sessionId);
    }

    const cols = options.cols ?? 120;
    const rows = options.rows ?? 30;
    const pty = PtySession.spawn({
      command: options.command,
      args: options.args ?? [],
      cwd: options.projectRoot,
      cols,
      rows,
      env: {
        ...options.env,
        PWD: options.projectRoot,
        TERM_PROGRAM: "lrac-uiux-claude-cli",
      },
    });

    entry.active = {
      pty,
      cols,
      rows,
      rawOutput: [],
      rawOutputSize: 0,
    };
    entry.summary = {
      state: "running",
      pid: pty.pid,
    };

    pty.onData((data) => {
      const active = entry.active;
      if (!active) {
        return;
      }

      active.rawOutput.push(data);
      active.rawOutputSize += data.length;

      while (
        active.rawOutputSize > ClaudeCliSessionManager.RAW_OUTPUT_MAX &&
        active.rawOutput.length > 1
      ) {
        const removed = active.rawOutput.shift();
        if (removed) {
          active.rawOutputSize -= removed.length;
        }
      }

      for (const listener of entry.listeners.values()) {
        listener.onOutput?.(data);
      }
    });

    pty.onExit((code) => {
      entry.active = null;
      entry.summary = {
        state: pty.wasInterrupted ? "interrupted" : code === 0 ? "idle" : "failed",
        pid: pty.pid,
        exitCode: code,
      };

      for (const listener of entry.listeners.values()) {
        listener.onStateChange?.(entry.summary);
        listener.onExit?.(code);
      }
    });

    return this.getSessionDescriptor(entry.sessionId)!;
  }

  stopSession(sessionId: string): void {
    const entry = this.sessions.get(sessionId);
    if (!entry?.active) {
      return;
    }

    entry.active.pty.kill();
  }

  writeInput(sessionId: string, data: string | Buffer): void {
    const entry = this.sessions.get(sessionId);
    if (!entry?.active) {
      return;
    }

    entry.active.pty.write(data);
  }

  resizeSession(sessionId: string, cols: number, rows: number): void {
    const entry = this.sessions.get(sessionId);
    if (!entry?.active) {
      return;
    }

    entry.active.cols = cols;
    entry.active.rows = rows;
    entry.active.pty.resize(cols, rows);
  }

  getSnapshot(sessionId: string): string | null {
    const entry = this.sessions.get(sessionId);
    if (!entry?.active) {
      return null;
    }

    if (entry.active.rawOutput.length === 0) {
      return "";
    }

    return Buffer.concat(entry.active.rawOutput).toString("utf-8");
  }

  getTerminalSize(sessionId: string): { cols: number; rows: number } {
    const entry = this.sessions.get(sessionId);
    return {
      cols: entry?.active?.cols ?? 120,
      rows: entry?.active?.rows ?? 30,
    };
  }

  getSessionSummary(sessionId: string): ClaudeCliSessionSummary | null {
    return this.sessions.get(sessionId)?.summary ?? null;
  }

  getSessionDescriptor(sessionId: string): ClaudeCliSessionDescriptor | null {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      return null;
    }

    return {
      sessionId: entry.sessionId,
      projectRoot: entry.projectRoot,
      projectName: entry.projectName,
      summary: entry.summary,
      active: Boolean(entry.active),
    };
  }

  addListener(
    sessionId: string,
    projectRoot: string,
    listener: Omit<ClaudeCliSessionListener, "id">
  ): ClaudeCliSessionListener {
    const entry = this.getOrCreateEntry(sessionId, projectRoot);
    const fullListener: ClaudeCliSessionListener = {
      ...listener,
      id: ++listenerCounter,
    };
    entry.listeners.set(fullListener.id, fullListener);
    return fullListener;
  }

  removeListener(sessionId: string, listenerId: number): void {
    this.sessions.get(sessionId)?.listeners.delete(listenerId);
  }
}
