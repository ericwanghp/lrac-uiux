import fs from "fs/promises";
import { describe, expect, it, beforeEach } from "vitest";
import {
  appendEventBySessionId,
  createTerminalSession,
  mutateTerminalSessions,
  readTerminalSessionsFile,
  TERMINAL_SESSIONS_DIR,
} from "../../lib/utils/terminal-session-operations";
import type { TerminalSessionsJson } from "../../lib/types/terminal";

describe("terminal session operations", () => {
  beforeEach(async () => {
    await fs.rm(TERMINAL_SESSIONS_DIR, { recursive: true, force: true });
  });

  it("creates session and persists monotonic seq events", async () => {
    await mutateTerminalSessions(async (data: TerminalSessionsJson) => {
      data.sessions.push(
        createTerminalSession({
          sessionType: "pm_main",
          featureId: "imac-cli-terminal-orchestration-p5d-003",
        })
      );
      return null;
    });
    const sessions = await readTerminalSessionsFile();
    const session = sessions.sessions[0];
    expect(session).toBeDefined();
    await appendEventBySessionId(session.id, {
      eventType: "terminal.command.submitted",
      streamType: "system",
      payload: { command: "echo hello" },
    });
    await appendEventBySessionId(session.id, {
      eventType: "terminal.output.appended",
      streamType: "stdout",
      payload: { content: "hello" },
    });
    const updated = await readTerminalSessionsFile();
    const target = updated.sessions.find((item: { id: string }) => item.id === session.id)!;
    expect(target.events).toHaveLength(2);
    expect(target.events[0].seqNo).toBe(1);
    expect(target.events[1].seqNo).toBe(2);
  });
});
