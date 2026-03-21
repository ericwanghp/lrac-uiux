import { afterEach, describe, expect, it, vi } from "vitest";
import {
  terminalCommandsEnabled,
  tokenizeTerminalCommand,
  validateTerminalCommand,
} from "@/lib/services/terminal-command-policy";

describe("terminal command policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("tokenizes quoted arguments", () => {
    expect(tokenizeTerminalCommand('git commit -m "ship it"')).toEqual([
      "git",
      "commit",
      "-m",
      "ship it",
    ]);
  });

  it("rejects unterminated quotes", () => {
    expect(() => tokenizeTerminalCommand('git commit -m "oops')).toThrow(/unterminated quote/i);
  });

  it("validates allowlisted commands", () => {
    expect(validateTerminalCommand("npm run test")).toMatchObject({
      executable: "npm",
      executableName: "npm",
      args: ["run", "test"],
      displayCommand: "npm run test",
    });
  });

  it("blocks disallowed executables", () => {
    expect(() => validateTerminalCommand("rm -rf .")).toThrow(/blocked/i);
  });

  it("blocks disallowed eval flags", () => {
    expect(() => validateTerminalCommand('node -e "console.log(1)"')).toThrow(/blocked/i);
  });

  it("can disable terminal commands explicitly", () => {
    vi.stubEnv("LRAC_ENABLE_TERMINAL_COMMANDS", "false");
    expect(terminalCommandsEnabled()).toBe(false);
  });

  it("defaults terminal commands to enabled in development", () => {
    vi.stubEnv("LRAC_ENABLE_TERMINAL_COMMANDS", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(terminalCommandsEnabled()).toBe(true);
  });
});
