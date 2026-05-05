"use client";

import * as React from "react";
import {
  ArrowLeft,
  Calendar,
  GitBranch,
  GitMerge,
  Loader2,
  Paperclip,
  Play,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queueClaudeCliLaunchIntent } from "@/lib/utils/claude-cli-launch-intent";

interface Attachment {
  id: string;
  originalName: string;
  storedName: string;
  relativePath: string;
  size: number;
  uploadedAt: string;
}

interface ImacSession {
  id: string;
  abbreviation: string;
  title: string;
  description: string;
  status: "created" | "in-progress" | "merged" | "aborted";
  worktree: { branch: string; path: string | null; createdAt: string | null };
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  abortedAt: string | null;
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

export function ImacDetailClient({ session: initialSession }: { session: ImacSession }) {
  const [session, setSession] = React.useState(initialSession);
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null);

  const handleStartInClaude = React.useCallback(async () => {
    setLoadingAction("start-claude");
    try {
      let worktreeSession = session;
      if (session.status === "created") {
        const response = await fetch(`/api/imac/${session.id}/worktree`, { method: "POST" });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        worktreeSession = result.data as ImacSession;
        setSession(worktreeSession);
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
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to start IMAC in Claude Code");
    } finally {
      setLoadingAction(null);
    }
  }, [session]);

  const handleAction = React.useCallback(async (action: string) => {
    setLoadingAction(action);
    try {
      const response = await fetch(`/api/imac/${session.id}/${action}`, { method: "POST" });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      setSession(result.data);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoadingAction(null);
    }
  }, [session.id]);

  const config = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.created!;

  const timeline = [
    { label: "Created", date: session.createdAt, active: true },
    { label: "Worktree Created", date: session.worktree.createdAt, active: session.status !== "created" },
    { label: "Merged", date: session.mergedAt, active: session.status === "merged" },
    { label: "Aborted", date: session.abortedAt, active: session.status === "aborted" },
  ].filter((item) => item.active || item.date);

  return (
    <div className="admin-page">
      <div className="flex items-center gap-3 animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="admin-kicker">IMAC Cycle</p>
            <Badge variant={config.variant} className="rounded-full text-[10px]">
              {config.label}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{session.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <code className="text-primary">imac/{session.abbreviation}</code> · {session.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(session.status === "created" || session.status === "in-progress") && (
            <Button onClick={() => void handleStartInClaude()} disabled={loadingAction !== null}>
              {loadingAction === "start-claude" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : session.status === "created" ? (
                <Play className="mr-2 h-4 w-4" />
              ) : (
                <TerminalSquare className="mr-2 h-4 w-4" />
              )}
              {session.status === "created" ? "Start in Claude Code" : "Open in Claude Code"}
            </Button>
          )}
          {session.status === "in-progress" && (
            <>
              <Button variant="outline" onClick={() => void handleAction("merge")} disabled={loadingAction !== null}>
                {loadingAction === "merge" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitMerge className="mr-2 h-4 w-4" />}
                Merge to Main
              </Button>
              <Button variant="destructive" onClick={() => void handleAction("abort")} disabled={loadingAction !== null}>
                {loadingAction === "abort" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                Abort
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mt-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="admin-panel border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {session.description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          {session.worktree.path && (
            <Card className="admin-panel border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Git Worktree
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                  <p className="text-xs text-muted-foreground">Branch</p>
                  <p className="font-mono text-sm text-primary">{session.worktree.branch}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                  <p className="text-xs text-muted-foreground">Worktree Path (Claude Code project root)</p>
                  <p className="font-mono text-sm break-all">{session.worktree.path}</p>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">How this works</p>
                  <p className="text-xs text-foreground mt-1">
                    This worktree is an isolated copy of the project. Claude Code runs here independently from the main project session.
                    When the IMAC cycle is complete, use <strong>Merge to Main</strong> to bring changes back.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {session.attachments.length > 0 && (
            <Card className="admin-panel border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-primary" />
                  Attachments ({session.attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {session.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/80 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-sm truncate">{attachment.originalName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {Math.round(attachment.size / 1024)} KB
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="admin-panel border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timeline.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${item.date ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      {item.date && (
                        <p className="text-xs text-muted-foreground">{new Date(item.date).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="admin-panel border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="text-base">Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono">{session.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Abbreviation</span>
                <span className="font-mono">{session.abbreviation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(session.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
