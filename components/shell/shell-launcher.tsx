"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  FolderOpen,
  LayoutPanelLeft,
  Play,
  Square,
  TerminalSquare,
  X,
} from "lucide-react";
import { useActiveTheme } from "@/components/claude-cli/use-active-theme";
import { ShellTerminalPanel } from "@/components/shell/shell-terminal-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClaudeCliSessionDescriptor } from "@/lib/claude-cli/types";
import type { ProjectOption } from "@/lib/types";
import type { ThemeMode } from "@/lib/types/settings";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";
import { cn } from "@/lib/utils";

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

interface ShellLauncherProps {
  projectRoot: string | null;
}

function getStatusTone(themeMode: ThemeMode): string {
  return themeMode === "dark"
    ? "border-slate-700/80 bg-slate-900/80 text-slate-200"
    : "border-border/80 bg-background/80 text-foreground";
}

function compactSessionId(sessionId: string): string {
  return sessionId.length > 14 ? `${sessionId.slice(0, 6)}...${sessionId.slice(-4)}` : sessionId;
}

export function ShellLauncher({ projectRoot }: ShellLauncherProps) {
  const themeMode = useActiveTheme();
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
      const response = await fetch(buildProjectScopedPath("/api/shell/bootstrap", projectRoot), {
        cache: "no-store",
      });
      const payload = (await response.json()) as BootstrapResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "Failed to load shell workspace context");
      }

      setWsBaseUrl(payload.data.wsBaseUrl);
      setCurrentProjectRoot(payload.data.currentProjectRoot);
      setCurrentProjectName(payload.data.currentProjectName);
      setAvailableProjects(payload.data.availableProjects);
      setSelectedProjectRoot(payload.data.currentProjectRoot);
      setCurrentProjectSession(payload.data.currentSession);
      if (payload.data.currentSession?.active) {
        setActiveSession(payload.data.currentSession);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load shell workspace");
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

  const launchShell = React.useCallback(
    async (targetProjectRoot: string) => {
      setIsStarting(true);
      setError(null);

      try {
        const response = await fetch(buildProjectScopedPath("/api/shell/sessions", projectRoot), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ projectRoot: targetProjectRoot }),
        });
        const payload = (await response.json()) as SessionResponse;

        if (!response.ok || !payload.success || !payload.data?.session) {
          throw new Error(payload.error || "Failed to open shell session");
        }

        if (payload.data.wsBaseUrl) {
          setWsBaseUrl(payload.data.wsBaseUrl);
        }

        setActiveSession(payload.data.session);
        if (targetProjectRoot === currentProjectRoot) {
          setCurrentProjectSession(payload.data.session);
        }
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to start shell session");
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
          `/api/shell/sessions?projectRoot=${encodeURIComponent(targetProjectRoot)}`,
          { cache: "no-store" }
        );
        const payload = (await response.json()) as SessionStatusResponse;

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Failed to inspect shell session");
        }

        const sessionData = payload.data ?? null;
        if (targetProjectRoot === currentProjectRoot) {
          setCurrentProjectSession(sessionData);
        }
        if (!sessionData?.active && activeSession?.projectRoot === targetProjectRoot) {
          setActiveSession(null);
        }

        return sessionData;
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to inspect shell session");
        return null;
      }
    },
    [activeSession?.projectRoot, currentProjectRoot]
  );

  const handleOpenSelectedProject = React.useCallback(async () => {
    const targetProjectRoot = customProjectRoot.trim() || selectedProjectRoot || currentProjectRoot;
    if (!targetProjectRoot) {
      setError("Select a project or provide a custom workspace path.");
      return;
    }

    await launchShell(targetProjectRoot);
  }, [currentProjectRoot, customProjectRoot, launchShell, selectedProjectRoot]);

  const handleStopSession = React.useCallback(async () => {
    if (!activeSession) {
      return;
    }

    setIsStopping(true);
    setError(null);

    try {
      const response = await fetch(`/api/shell/sessions/${activeSession.sessionId}/stop`, {
        method: "POST",
      });
      const payload = (await response.json()) as SessionResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to stop shell session");
      }

      if (activeSession.projectRoot === currentProjectRoot) {
        setCurrentProjectSession(payload.data?.session ?? null);
      }
      setActiveSession(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to stop shell session");
    } finally {
      setIsStopping(false);
    }
  }, [activeSession, currentProjectRoot]);

  const handleSessionExit = React.useCallback(
    async (_code: number) => {
      if (!activeSession?.projectRoot) {
        return;
      }

      const latest = await loadSessionStatus(activeSession.projectRoot);
      if (!latest?.active) {
        setActiveSession(null);
      }
    },
    [activeSession, loadSessionStatus]
  );

  const statusThemeLabel = themeMode === "dark" ? "Dark" : "Light";
  const terminalTone = getStatusTone(themeMode);
  const shellProjectName = activeSession?.projectName || currentProjectName || "Workspace";
  const shellProjectRoot = activeSession?.projectRoot || currentProjectRoot || "Loading project context...";

  const modalContent = open ? (
    <div className="admin-overlay-fixed p-3 sm:p-4 lg:p-5" role="dialog" aria-modal="true">
      <div className="claude-cli-modal relative flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden rounded-[2rem] border border-white/40 bg-card/95 shadow-2xl backdrop-blur">
        <div className="claude-cli-toolbar flex items-center gap-3 border-b border-border/70 px-3 py-2.5 lg:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
              <TerminalSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground lg:text-base">Open SHELL</p>
                <span className="hidden rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:inline-flex">
                  Interactive
                </span>
              </div>
              <p className="truncate text-[11px] text-muted-foreground lg:text-xs">{shellProjectRoot}</p>
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 items-center justify-center xl:flex">
            <div
              className={cn(
                "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                activeSession
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-border/70 bg-background/80 text-muted-foreground"
              )}
            >
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="truncate">{activeSession ? `${shellProjectName} shell attached` : "No active shell session"}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden rounded-full lg:inline-flex"
              onClick={() => void launchShell(currentProjectRoot)}
              disabled={isBootstrapping || isStarting || !currentProjectRoot}
              aria-label={
                currentProjectSession?.active ? "Continue current project shell" : "Open current project shell"
              }
            >
              <Play className="mr-2 h-4 w-4" />
              {currentProjectSession?.active ? "Continue Shell" : "Open Shell"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Close shell panel"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-5 lg:p-5">
          <div className="claude-cli-sidebar flex min-h-0 flex-col overflow-y-auto rounded-[1.5rem] border border-border/80 bg-card/72 px-5 py-5">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Current Project</p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">Open a workspace shell</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Reference the `cli_demo2` shell flow and attach a real interactive terminal to the selected project.
                </p>
              </div>

              <div className="rounded-[1.25rem] border border-border/75 bg-background/80 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  <span>{currentProjectName || "Current workspace"}</span>
                </div>
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  {currentProjectRoot || "Loading project context..."}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Shell status</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                    {currentProjectSession?.active ? "Running" : "Idle"}
                  </span>
                </div>
                <Button
                  type="button"
                  className="mt-4 h-11 w-full rounded-2xl"
                  onClick={() => void launchShell(currentProjectRoot)}
                  disabled={isBootstrapping || isStarting || !currentProjectRoot}
                  aria-label={
                    currentProjectSession?.active ? "Continue current project shell" : "Open current project shell"
                  }
                >
                  <Play className="mr-2 h-4 w-4" />
                  {currentProjectSession?.active ? "Continue current project shell" : "Open current project shell"}
                </Button>
              </div>

              <div className="rounded-[1.25rem] border border-border/75 bg-background/80 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <LayoutPanelLeft className="h-4 w-4 text-primary" />
                  <span>Open another project</span>
                </div>
                <div className="mt-4 space-y-2">
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
                <div className="mt-4 space-y-2">
                  <label
                    htmlFor="shell-custom-project"
                    className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                  >
                    Custom path
                  </label>
                  <Input
                    id="shell-custom-project"
                    value={customProjectRoot}
                    onChange={(event) => setCustomProjectRoot(event.target.value)}
                    placeholder="Optional: /Users/ericwang/lracode/another-project"
                    className="admin-input h-11 rounded-2xl"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 h-11 w-full rounded-2xl"
                  onClick={() => void handleOpenSelectedProject()}
                  disabled={isBootstrapping || isStarting}
                  aria-label="Open selected project shell"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Open selected project
                </Button>
              </div>

              <div className="rounded-[1.25rem] border border-border/75 bg-background/80 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Square className="h-4 w-4 text-primary" />
                  <span>Session controls</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  The shell process keeps running until you stop it explicitly.
                </p>
                <div className="mt-4 rounded-2xl border border-border/70 bg-card/60 px-4 py-3 text-xs text-muted-foreground">
                  {activeSession ? (
                    <>
                      <p className="font-medium text-foreground">{activeSession.projectName}</p>
                      <p className="mt-1 break-all">{activeSession.projectRoot}</p>
                      <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-primary">
                        Session {compactSessionId(activeSession.sessionId)}
                      </p>
                    </>
                  ) : (
                    <p>No shell session is currently attached to this workspace.</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  className="mt-4 h-11 w-full rounded-2xl"
                  onClick={() => void handleStopSession()}
                  disabled={!activeSession || isStopping}
                  aria-label="Stop active shell session"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop active shell session
                </Button>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden">
            {isBootstrapping ? (
              <div className="admin-empty-state flex h-full min-h-[480px] items-center justify-center rounded-[1.8rem] px-8 text-sm">
                Loading workspace shell service...
              </div>
            ) : activeSession && wsBaseUrl ? (
              <ShellTerminalPanel
                key={`${activeSession.sessionId}:${activeSession.projectRoot}`}
                sessionId={activeSession.sessionId}
                projectRoot={activeSession.projectRoot}
                wsBaseUrl={wsBaseUrl}
                themeMode={themeMode}
                onSessionExit={handleSessionExit}
              />
            ) : (
              <div className="admin-empty-state flex h-full min-h-[480px] flex-col items-center justify-center rounded-[1.8rem] px-8 text-center">
                <TerminalSquare className="mb-4 h-12 w-12 text-primary/70" />
                <p className="text-base font-medium text-foreground">No shell session open yet</p>
                <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                  Open the current project or another workspace project to attach an interactive shell here.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="claude-cli-statusbar flex items-center gap-3 border-t border-border/70 px-3 py-2 text-[11px] text-muted-foreground lg:px-4">
          <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1">
            Theme: {statusThemeLabel}
          </span>
          <span className={cn("rounded-full border px-2.5 py-1", terminalTone)}>
            Session: {activeSession ? compactSessionId(activeSession.sessionId) : "none"}
          </span>
          <span className="hidden min-w-0 flex-1 truncate rounded-full border border-border/70 bg-background/80 px-2.5 py-1 md:inline-flex">
            Project: {activeSession?.projectRoot || currentProjectRoot || "none"}
          </span>
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
        Open SHELL
      </Button>
      {isMounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}
