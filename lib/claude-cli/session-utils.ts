import crypto from "crypto";
import path from "path";

export const DEFAULT_CLAUDE_CLI_COLS = 120;
export const DEFAULT_CLAUDE_CLI_ROWS = 30;

function createProjectScopedSessionId(prefix: string, projectRoot: string): string {
  const normalizedRoot = path.resolve(projectRoot);
  const digest = crypto.createHash("sha1").update(normalizedRoot).digest("hex").slice(0, 12);
  return `${prefix}-${digest}`;
}

export function getClaudeCliSessionId(projectRoot: string): string {
  return createProjectScopedSessionId("claude", projectRoot);
}

export function getShellSessionId(projectRoot: string): string {
  return createProjectScopedSessionId("shell", projectRoot);
}

export function getClaudeCliProjectName(projectRoot: string): string {
  return path.basename(path.resolve(projectRoot)) || projectRoot;
}

export function getPreferredShellCommand(): string {
  if (process.env.SHELL && process.env.SHELL.trim()) {
    return process.env.SHELL.trim();
  }

  return process.platform === "win32" ? "powershell.exe" : "/bin/zsh";
}
