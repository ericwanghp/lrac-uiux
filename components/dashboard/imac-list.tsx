"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GitBranch, GitMerge, Loader2, Paperclip, Play, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { queueClaudeCliLaunchIntent } from "@/lib/utils/claude-cli-launch-intent";

interface ImacAttachment {
  id: string;
  originalName: string;
  relativePath: string;
  size: number;
}

interface ImacSession {
  id: string;
  abbreviation: string;
  title: string;
  description: string;
  status: "created" | "in-progress" | "merged" | "aborted";
  worktree: { branch: string; path: string | null };
  attachments: ImacAttachment[];
  createdAt: string;
  mergedAt: string | null;
}

interface ImacListProps {
  sessions: ImacSession[];
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  created: { label: "Created", variant: "secondary" },
  "in-progress": { label: "In Progress", variant: "warning" },
  merged: { label: "Merged", variant: "success" },
  aborted: { label: "Aborted", variant: "destructive" },
};

function buildImacPrompt(session: ImacSession): string {
  const lines = ["/IMAC " + session.title, "", "## Change Description", "", session.description.trim()];

  if (session.attachments.length > 0) {
    lines.push("", "## Reference Files");
    session.attachments.forEach((att) => {
      lines.push(`- ${att.originalName} (${att.relativePath}, ${Math.max(1, Math.round(att.size / 1024))} KB)`);
    });
  }

  lines.push("", "Execute the IMAC intake process for this change request.");
  return lines.join("\n");
}

export function ImacList({ sessions }: ImacListProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null);

  const handleStartInClaude = React.useCallback(async (session: ImacSession) => {
    setLoadingAction(`worktree-${session.id}`);
    try {
      let worktreeSession = session;
      if (session.status === "created") {
        const response = await fetch(`/api/imac/${session.id}/worktree`, { method: "POST" });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        worktreeSession = result.data as ImacSession;
      }

      if (!worktreeSession.worktree.path) {
        throw new Error("Worktree path not available");
      }

      queueClaudeCliLaunchIntent({
        projectRoot: worktreeSession.worktree.path,
        activePanel: "current",
        launchOptions: {
          defaultPrompt: buildImacPrompt(worktreeSession),
        },
      });

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to start IMAC session");
      setLoadingAction(null);
    }
  }, [router]);

  const handleAction = React.useCallback(async (action: string, sessionId: string) => {
    setLoadingAction(`${action}-${sessionId}`);
    try {
      const response = await fetch(`/api/imac/${sessionId}/${action}`, { method: "POST" });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoadingAction(null);
    }
  }, [router]);

  if (sessions.length === 0) {
    return (
      <Card className="admin-panel border-border/60 bg-card/90">
        <CardHeader>
          <CardTitle className="text-base">IMAC Cycles</CardTitle>
          <CardDescription>No active IMAC cycles. Create one to start an isolated change.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="admin-panel border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle className="text-base">IMAC Cycles</CardTitle>
        <CardDescription>{sessions.length} session(s) — isolated change management</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.map((session) => {
          const config = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.created!;
          const isLoading = loadingAction !== null;

          return (
            <div
              key={session.id}
              className="rounded-[1.25rem] border border-border/80 bg-secondary/35 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
                    <Badge variant={config.variant} className="rounded-full text-[10px]">
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <code className="text-primary">imac/{session.abbreviation}</code>
                    {session.worktree.path && (
                      <span className="ml-2">· {session.worktree.path}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(session.status === "created" || session.status === "in-progress") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={isLoading}
                      onClick={() => void handleStartInClaude(session)}
                    >
                      {loadingAction === `worktree-${session.id}` ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : session.status === "created" ? (
                        <Play className="mr-1 h-3 w-3" />
                      ) : (
                        <GitBranch className="mr-1 h-3 w-3" />
                      )}
                      {session.status === "created" ? "Start in Claude Code" : "Open in Claude Code"}
                    </Button>
                  )}
                  {session.status === "in-progress" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={isLoading}
                        onClick={() => void handleAction("merge", session.id)}
                      >
                        {loadingAction === `merge-${session.id}` ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <GitMerge className="mr-1 h-3 w-3" />
                        )}
                        Merge
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        disabled={isLoading}
                        onClick={() => void handleAction("abort", session.id)}
                      >
                        {loadingAction === `abort-${session.id}` ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <XCircle className="mr-1 h-3 w-3" />
                        )}
                        Abort
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {session.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{session.description}</p>
              )}
              {session.attachments.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  {session.attachments.length} attachment(s)
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
