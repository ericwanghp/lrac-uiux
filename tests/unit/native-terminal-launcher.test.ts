import { beforeEach, describe, expect, it, vi } from "vitest";

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
}));

vi.mock("child_process", () => ({
  execFile: execFileMock,
  default: {
    execFile: execFileMock,
  },
}));

import { launchMacTerminalAtPath } from "@/lib/services/native-terminal-launcher";

describe("launchMacTerminalAtPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes osascript with the selected project root", async () => {
    execFileMock.mockImplementation(
      (
        _file: string,
        _args: string[],
        callback: (error: Error | null, stdout?: string, stderr?: string) => void
      ) => {
        callback(null, "", "");
      }
    );

    await launchMacTerminalAtPath("/workspace/demo");

    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(execFileMock).toHaveBeenCalledWith(
      "osascript",
      [
        "-e",
        expect.stringContaining('do script "cd " & quoted form of targetDir'),
        "/workspace/demo",
      ],
      expect.any(Function)
    );
  });
});
