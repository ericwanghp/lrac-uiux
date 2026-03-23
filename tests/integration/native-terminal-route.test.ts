import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/utils/file-operations", () => ({
  getCurrentProjectRoot: vi.fn(),
}));

vi.mock("@/lib/services/native-terminal-launcher", () => ({
  launchMacTerminalAtPath: vi.fn(),
}));

import { getCurrentProjectRoot } from "@/lib/utils/file-operations";
import { launchMacTerminalAtPath } from "@/lib/services/native-terminal-launcher";
import { POST } from "@/app/api/launcher/terminal/route";

function createRequest(projectRoot: string): NextRequest {
  return {
    nextUrl: new URL(
      `http://localhost:3000/api/launcher/terminal?project=${encodeURIComponent(projectRoot)}`
    ),
  } as NextRequest;
}

describe("POST /api/launcher/terminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("launches macOS Terminal for the selected project root", async () => {
    vi.mocked(getCurrentProjectRoot).mockReturnValue("/workspace/demo");

    const response = await POST(createRequest("/workspace/demo"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(launchMacTerminalAtPath).toHaveBeenCalledWith("/workspace/demo");
  });

  it("returns an error payload when launching Terminal fails", async () => {
    vi.mocked(getCurrentProjectRoot).mockReturnValue("/workspace/demo");
    vi.mocked(launchMacTerminalAtPath).mockRejectedValue(new Error("Terminal launch failed"));

    const response = await POST(createRequest("/workspace/demo"));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe("Terminal launch failed");
  });
});
