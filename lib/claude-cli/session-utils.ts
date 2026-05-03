import crypto from "crypto";
import path from "path";

export const DEFAULT_CLAUDE_CLI_COLS = 120;
export const DEFAULT_CLAUDE_CLI_ROWS = 30;

export function getClaudeCliSessionId(projectRoot: string): string {
  const normalizedRoot = path.resolve(projectRoot);
  const digest = crypto.createHash("sha1").update(normalizedRoot).digest("hex").slice(0, 12);
  return `claude-${digest}`;
}

export function getClaudeCliProjectName(projectRoot: string): string {
  return path.basename(path.resolve(projectRoot)) || projectRoot;
}
