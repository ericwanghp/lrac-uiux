import type { ClaudeCliSessionDescriptor } from "@/lib/claude-cli/types";

type LegacySessionEntry = {
  sessionId: string;
  projectRoot: string;
  projectName: string;
  summary: ClaudeCliSessionDescriptor["summary"];
  active: { pty: unknown } | null;
};

type WorkspaceSessionManagerLike = {
  listSessionDescriptors?: (options?: {
    activeOnly?: boolean;
    projectRoots?: string[];
  }) => ClaudeCliSessionDescriptor[];
  sessions?: Map<string, LegacySessionEntry>;
};

export function listWorkspaceRunningSessions(
  manager: WorkspaceSessionManagerLike,
  projectRoots: string[]
): ClaudeCliSessionDescriptor[] {
  if (typeof manager.listSessionDescriptors === "function") {
    return manager.listSessionDescriptors({
      activeOnly: true,
      projectRoots,
    });
  }

  const allowedProjectRoots = new Set(projectRoots);
  const legacySessions = manager.sessions;
  if (!(legacySessions instanceof Map)) {
    return [];
  }

  return Array.from(legacySessions.values())
    .filter((entry) => entry.active && allowedProjectRoots.has(entry.projectRoot))
    .map((entry) => ({
      sessionId: entry.sessionId,
      projectRoot: entry.projectRoot,
      projectName: entry.projectName,
      summary: entry.summary,
      active: Boolean(entry.active),
    }))
    .sort((a, b) => a.projectName.localeCompare(b.projectName));
}
