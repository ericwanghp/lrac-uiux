"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { FolderOpen, Play, Square, TerminalSquare, X } from "lucide-react";
import { ClaudeCliTerminalPanel } from "@/components/claude-cli/claude-cli-terminal-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectOption } from "@/lib/types";
import type { ClaudeCliSessionDescriptor } from "@/lib/claude-cli/types";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";

type BootstrapResponse = {
  success: boolean;
  data?: {
    wsBaseUrl: string;
    currentProjectRoot: string;
    currentProjectName: string;
    currentSession: ClaudeCliSessionDescriptor | null;
    availableProjects: ProjectOption[];
  };
  error?: string;
};

type SessionResponse = {
  success: boolean;
  data?: {
    wsBaseUrl?: string;
    session: ClaudeCliSessionDescriptor | null;
  };
  error?: string;
};

type SessionStatusResponse = {
  success: boolean;
  data?: ClaudeCliSessionDescriptor | null;
  error?: string;
};

interface ClaudeCliLauncherProps {
  projectRoot: string | null;
}

export function ClaudeCliLauncher({ projectRoot }: ClaudeCliLauncherProps) {
  const [open, setOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const [isBootstrapping, setIsBootstrapping] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);
  const [isStopping, setIsStopping] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [wsBaseUrl, setWsBaseUrl] = React.useState("");
  const [currentProjectRoot, setCurrentProjectRoot] = React.useState("");
  const [currentProjectName, setCurrentProjectName] = React.useState("");
  const [availableProjects, setAvailableProjects] = React.useState<ProjectOption[]>([]);
  const [selectedProjectRoot, setSelectedProjectRoot] = React.useState("");
  const [customProjectRoot, setCustomProjectRoot] = React.useState("");
  const [currentProjectSession, setCurrentProjectSession] =
    React.useState<ClaudeCliSessionDescriptor | null>(null);
  const [activeSession, setActiveSession] = React.useState<ClaudeCliSessionDescriptor | null>(null);

  const loadBootstrap = React.useCallback(async () => {
    setIsBootstrapping(true);
    setError(null);

    try {
      const response = await fetch(buildProjectScopedPath("/api/claude-cli/bootstrap", projectRoot), {
        cache: "no-store",
      });
      const payload = (await response.json()) as BootstrapResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "Failed to load Claude Code workspace context");
      }

      setWsBaseUrl(payload.data.wsBaseUrl);
      setCurrentProjectRoot(payload.data.currentProjectRoot);
      setCurrentProjectName(payload.data.currentProjectName);
      setAvailableProjects(payload.data.availableProjects);
      setSelectedProjectRoot(payload.data.currentProjectRoot);
      setCurrentProjectSession(payload.data.currentSession);
      setActiveSession(payload.data.currentSession?.active ? payload.data.currentSession : null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load Claude Code");
    } finally {
      setIsBootstrapping(false);
    }
  }, [projectRoot]);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    void loadBootstrap();
  }, [loadBootstrap, open]);

  const launchSession = React.useCallback(
    async (targetProjectRoot: string) => {
      setIsStarting(true);
      setError(null);

      try {
        const response = await fetch(buildProjectScopedPath("/api/claude-cli/sessions", projectRoot), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ projectRoot: targetProjectRoot }),
        });
        const payload = (await response.json()) as SessionResponse;

        if (!response.ok || !payload.success || !payload.data?.session) {
          throw new Error(payload.error || "Failed to open Claude Code session");
        }

        if (payload.data.wsBaseUrl) {
          setWsBaseUrl(payload.data.wsBaseUrl);
        }

        setActiveSession(payload.data.session);
        if (targetProjectRoot === currentProjectRoot) {
          setCurrentProjectSession(payload.data.session);
        }
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to start Claude Code");
      } finally {
        setIsStarting(false);
      }
    },
    [currentProjectRoot, projectRoot]
  );

  const loadSessionStatus = React.useCallback(
    async (targetProjectRoot: string) => {
      try {
        const response = await fetch(
          `/api/claude-cli/sessions?projectRoot=${encodeURIComponent(targetProjectRoot)}`,
          { cache: "no-store" }
        );
        const payload = (await response.json()) as SessionStatusResponse;
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Failed to inspect Claude Code session");
        }

        if (targetProjectRoot === currentProjectRoot) {
          setCurrentProjectSession(payload.data ?? null);
        }
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to inspect Claude Code");
      }
    },
    [currentProjectRoot]
  );

  const handleOpenSelectedProject = React.useCallback(async () => {
    const targetProjectRoot = customProjectRoot.trim() || selectedProjectRoot || currentProjectRoot;
    if (!targetProjectRoot) {
      setError("Select a project or provide a custom workspace path.");
      return;
    }

    await launchSession(targetProjectRoot);
  }, [currentProjectRoot, customProjectRoot, launchSession, selectedProjectRoot]);

  const handleStopSession = React.useCallback(async () => {
    if (!activeSession) {
      return;
    }

    setIsStopping(true);
    setError(null);

    try {
      const response = await fetch(`/api/claude-cli/sessions/${activeSession.sessionId}/stop`, {
        method: "POST",
      });
      const payload = (await response.json()) as SessionResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to stop Claude Code session");
      }

      setActiveSession(null);
      if (activeSession.projectRoot === currentProjectRoot) {
        setCurrentProjectSession(payload.data?.session ?? null);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to stop Claude Code");
    } finally {
      setIsStopping(false);
    }
  }, [activeSession, currentProjectRoot]);

  const handleSessionExit = React.useCallback(
    async (_code: number) => {
      if (activeSession?.projectRoot) {
        await loadSessionStatus(activeSession.projectRoot);
      }
    },
    [activeSession?.projectRoot, loadSessionStatus]
  );

  const modalContent = open ? (
    <div className="admin-overlay-fixed p-3 sm:p-4 lg:p-5" role="dialog" aria-modal="true">
      <div className="claude-cli-modal relative flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden rounded-[2rem] border border-white/40 bg-card/95 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5 lg:px-8 lg:py-6">
          <div className="space-y-2">
            <p className="admin-kicker">Claude Code Workspace</p>
            <h2 className="text-2xl font-semibold text-foreground">Continue or start a project session</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Reuse the current project&apos;s Claude Code CLI session or open another workspace project in a new terminal.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Close Claude Code panel"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 overflow-hidden p-5 lg:gap-6 lg:p-6 xl:grid-cols-[380px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1 lg:pr-2">
            <Card className="admin-panel-soft rounded-[1.6rem] border-border/80">
              <CardHeader className="space-y-3">
                <CardTitle className="text-lg">Current Project</CardTitle>
                <CardDescription>
                  Resume the Claude Code workflow for the selected project in the top navigation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    <span>{currentProjectName || "Current workspace"}</span>
                  </div>
                  <p className="mt-2 break-all text-xs text-muted-foreground">
                    {currentProjectRoot || "Loading project context..."}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Session status: {currentProjectSession?.active ? "running" : "not running"}
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => void launchSession(currentProjectRoot)}
                  disabled={isBootstrapping || isStarting || !currentProjectRoot}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {currentProjectSession?.active ? "Continue current project" : "Start current project"}
                </Button>
              </CardContent>
            </Card>

            <Card className="admin-panel-soft rounded-[1.6rem] border-border/80">
              <CardHeader className="space-y-3">
                <CardTitle className="text-lg">Open Another Project</CardTitle>
                <CardDescription>
                  Choose another discovered workspace project or paste a custom path under the same workspace root.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Workspace project
                  </label>
                  <Select value={selectedProjectRoot} onValueChange={setSelectedProjectRoot}>
                    <SelectTrigger className="admin-input h-11 rounded-2xl">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProjects.map((project) => (
                        <SelectItem key={project.root} value={project.root}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="claude-cli-custom-project"
                    className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                  >
                    Custom path
                  </label>
                  <Input
                    id="claude-cli-custom-project"
                    value={customProjectRoot}
                    onChange={(event) => setCustomProjectRoot(event.target.value)}
                    placeholder="Optional: /Users/ericwang/lracode/another-project"
                    className="admin-input h-11 rounded-2xl"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => void handleOpenSelectedProject()}
                  disabled={isBootstrapping || isStarting}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Open selected project
                </Button>
              </CardContent>
            </Card>

            <Card className="admin-panel-soft rounded-[1.6rem] border-border/80">
              <CardHeader className="space-y-3">
                <CardTitle className="text-lg">Session Controls</CardTitle>
                <CardDescription>
                  The terminal session keeps running after you close this panel until you stop it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-xs text-muted-foreground">
                  {activeSession ? (
                    <>
                      <p className="font-medium text-foreground">{activeSession.projectName}</p>
                      <p className="mt-1 break-all">{activeSession.projectRoot}</p>
                    </>
                  ) : (
                    <p>No Claude Code session is currently attached to this panel.</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={() => void handleStopSession()}
                  disabled={!activeSession || isStopping}
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop active session
                </Button>
              </CardContent>
            </Card>

            {error ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden">
            {isBootstrapping ? (
              <div className="admin-empty-state flex h-full min-h-[480px] items-center justify-center rounded-[1.8rem] px-8 text-sm">
                Loading Claude Code terminal service...
              </div>
            ) : activeSession && wsBaseUrl ? (
              <ClaudeCliTerminalPanel
                key={`${activeSession.sessionId}:${activeSession.projectRoot}`}
                sessionId={activeSession.sessionId}
                projectRoot={activeSession.projectRoot}
                wsBaseUrl={wsBaseUrl}
                onSessionExit={handleSessionExit}
              />
            ) : (
              <div className="admin-empty-state flex h-full min-h-[480px] flex-col items-center justify-center rounded-[1.8rem] px-8 text-center">
                <TerminalSquare className="mb-4 h-12 w-12 text-primary/70" />
                <p className="text-base font-medium text-foreground">No Claude Code session open yet</p>
                <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                  Start the current project or open another workspace project to attach an interactive Claude Code CLI terminal here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="inline-flex"
      >
        <TerminalSquare className="mr-2 h-4 w-4" />
        Claude Code
      </Button>
      {isMounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}
