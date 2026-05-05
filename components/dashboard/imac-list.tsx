"use client";

import * as React from "react";
import { GitBranch, GitMerge, Loader2, Paperclip, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ImacSession {
  id: string;
  abbreviation: string;
  title: string;
  description: string;
  status: "created" | "in-progress" | "merged" | "aborted";
  worktree: { branch: string; path: string | null };
  attachments: { id: string; originalName: string; size: number }[];
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

export function ImacList({ sessions }: ImacListProps) {
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null);

  const handleAction = React.useCallback(async (action: string, sessionId: string) => {
    setLoadingAction(`${action}-${sessionId}`);
    try {
      const response = await fetch(`/api/imac/${sessionId}/${action}`, { method: "POST" });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoadingAction(null);
    }
  }, []);

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
                  {session.status === "created" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={isLoading}
                      onClick={() => void handleAction("worktree", session.id)}
                    >
                      {loadingAction === `worktree-${session.id}` ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <GitBranch className="mr-1 h-3 w-3" />
                      )}
                      Start Worktree
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
