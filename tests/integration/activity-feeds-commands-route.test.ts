import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/utils/file-operations", () => ({
  getCurrentProjectRoot: vi.fn(),
}));

vi.mock("@/lib/utils/terminal-session-operations", () => ({
  appendEventToSession: vi.fn(),
  mutateTerminalSessions: vi.fn(),
}));

vi.mock("@/lib/services/terminal-command-runner", () => ({
  hasActiveTerminalProcess: vi.fn(),
  runTerminalCommand: vi.fn(),
  submitTerminalInput: vi.fn(),
}));

vi.mock("@/lib/services/terminal-command-policy", () => ({
  terminalCommandsEnabled: vi.fn(),
  validateTerminalCommand: vi.fn(),
}));

import { getCurrentProjectRoot } from "@/lib/utils/file-operations";
import { mutateTerminalSessions } from "@/lib/utils/terminal-session-operations";
import {
  hasActiveTerminalProcess,
  runTerminalCommand,
  submitTerminalInput,
} from "@/lib/services/terminal-command-runner";
import {
  terminalCommandsEnabled,
  validateTerminalCommand,
} from "@/lib/services/terminal-command-policy";
import { POST } from "@/app/api/activity-feeds/[id]/commands/route";

function createRequest(command: string): NextRequest {
  return {
    nextUrl: new URL(
      "http://localhost:3000/api/activity-feeds/session-1/commands?project=%2Fworkspace%2Fdemo"
    ),
    json: async () => ({ command }),
  } as unknown as NextRequest;
}

describe("POST /api/activity-feeds/[id]/commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(terminalCommandsEnabled).mockReturnValue(true);
    vi.mocked(getCurrentProjectRoot).mockResolvedValue("/workspace/demo");
    vi.mocked(mutateTerminalSessions).mockResolvedValue({
      session: { id: "session-1" },
      event: { id: "event-1" },
    } as never);
  });

  it("routes command text to stdin when a process is already active", async () => {
    vi.mocked(hasActiveTerminalProcess).mockReturnValue(true);

    const response = await POST(createRequest("continue with tests"), {
      params: { id: "session-1" },
    });
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(validateTerminalCommand).not.toHaveBeenCalled();
    expect(submitTerminalInput).toHaveBeenCalledWith(
      "session-1",
      "continue with tests",
      { type: "user", id: "frontend-user" },
      "/workspace/demo"
    );
    expect(runTerminalCommand).not.toHaveBeenCalled();
  });

  it("validates and spawns a new process when no active process exists", async () => {
    vi.mocked(hasActiveTerminalProcess).mockReturnValue(false);
    vi.mocked(validateTerminalCommand).mockReturnValue({
      executable: "claude",
      executableName: "claude",
      args: ["-c"],
      displayCommand: "claude -c",
    });

    const response = await POST(createRequest("claude -c"), {
      params: { id: "session-1" },
    });
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(validateTerminalCommand).toHaveBeenCalledWith("claude -c");
    expect(runTerminalCommand).toHaveBeenCalledWith(
      "session-1",
      {
        executable: "claude",
        executableName: "claude",
        args: ["-c"],
        displayCommand: "claude -c",
      },
      { type: "user", id: "frontend-user" },
      "/workspace/demo"
    );
    expect(submitTerminalInput).not.toHaveBeenCalled();
  });
});
