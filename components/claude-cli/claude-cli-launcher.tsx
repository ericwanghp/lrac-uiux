"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  FolderOpen,
  LayoutPanelLeft,
  Play,
  Square,
  TerminalSquare,
  X,
} from "lucide-react";
import { ClaudeCliTerminalPanel } from "@/components/claude-cli/claude-cli-terminal-panel";
import { useActiveTheme } from "@/components/claude-cli/use-active-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectOption } from "@/lib/types";
import type { ClaudeCliSessionDescriptor } from "@/lib/claude-cli/types";
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

interface ClaudeCliLauncherProps {
  projectRoot: string | null;
}

type WorkspacePanel = "current" | "projects" | "session";
type ClaudeCliLaunchOptions = {
  defaultPrompt: string;
  continueWithRecentContext: boolean;
  dangerouslySkipPermissions: boolean;
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = "lrac-uiux:claude-cli-sidebar-collapsed";
const SIDEBAR_PANEL_STORAGE_KEY = "lrac-uiux:claude-cli-sidebar-panel";
const LAUNCH_OPTIONS_STORAGE_KEY = "lrac-uiux:claude-cli-launch-options";
const DEFAULT_LAUNCH_OPTIONS: ClaudeCliLaunchOptions = {
  defaultPrompt: "",
  continueWithRecentContext: false,
  dangerouslySkipPermissions: false,
};

function upsertSessionTab(
  sessions: ClaudeCliSessionDescriptor[],
  nextSession: ClaudeCliSessionDescriptor
): ClaudeCliSessionDescriptor[] {
  const existingIndex = sessions.findIndex((session) => session.sessionId === nextSession.sessionId);

  if (existingIndex === -1) {
    return [...sessions, nextSession];
  }

  return sessions.map((session) => (session.sessionId === nextSession.sessionId ? nextSession : session));
}

function removeSessionTab(
  sessions: ClaudeCliSessionDescriptor[],
  sessionId: string
): ClaudeCliSessionDescriptor[] {
  return sessions.filter((session) => session.sessionId !== sessionId);
}

function compactSessionId(sessionId: string): string {
  return sessionId.length > 14 ? `${sessionId.slice(0, 6)}...${sessionId.slice(-4)}` : sessionId;
}

export function ClaudeCliLauncher({ projectRoot }: ClaudeCliLauncherProps) {
  const themeMode = useActiveTheme();
  const [open, setOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [activePanel, setActivePanel] = React.useState<WorkspacePanel>("current");
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
  const [sessionTabs, setSessionTabs] = React.useState<ClaudeCliSessionDescriptor[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [activeSession, setActiveSession] = React.useState<ClaudeCliSessionDescriptor | null>(null);
  const [launchOptions, setLaunchOptions] =
    React.useState<ClaudeCliLaunchOptions>(DEFAULT_LAUNCH_OPTIONS);

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
      const bootstrapSession = payload.data.currentSession;
      if (bootstrapSession?.active) {
        setSessionTabs((current) => upsertSessionTab(current, bootstrapSession));
        setActiveSession(bootstrapSession);
        setActiveSessionId(bootstrapSession.sessionId);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load Claude Code");
    } finally {
      setIsBootstrapping(false);
    }
  }, [projectRoot]);

  React.useEffect(() => {
    setIsMounted(true);

    if (typeof window === "undefined") {
      return;
    }

    const storedCollapsed = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    const storedPanel = window.localStorage.getItem(SIDEBAR_PANEL_STORAGE_KEY);

    if (storedCollapsed === "true") {
      setIsSidebarCollapsed(true);
    }

    if (storedPanel === "current" || storedPanel === "projects" || storedPanel === "session") {
      setActivePanel(storedPanel);
    }

    const storedLaunchOptions = window.localStorage.getItem(LAUNCH_OPTIONS_STORAGE_KEY);
    if (storedLaunchOptions) {
      try {
        const parsed = JSON.parse(storedLaunchOptions) as Partial<ClaudeCliLaunchOptions>;
        setLaunchOptions({
          defaultPrompt:
            typeof parsed.defaultPrompt === "string" ? parsed.defaultPrompt : DEFAULT_LAUNCH_OPTIONS.defaultPrompt,
          continueWithRecentContext:
            typeof parsed.continueWithRecentContext === "boolean"
              ? parsed.continueWithRecentContext
              : DEFAULT_LAUNCH_OPTIONS.continueWithRecentContext,
          dangerouslySkipPermissions:
            typeof parsed.dangerouslySkipPermissions === "boolean"
              ? parsed.dangerouslySkipPermissions
              : DEFAULT_LAUNCH_OPTIONS.dangerouslySkipPermissions,
        });
      } catch (storageError) {
        console.warn("Failed to parse Claude CLI launch options from local storage.", storageError);
      }
    }
  }, []);

  React.useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isMounted, isSidebarCollapsed]);

  React.useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SIDEBAR_PANEL_STORAGE_KEY, activePanel);
  }, [activePanel, isMounted]);

  React.useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LAUNCH_OPTIONS_STORAGE_KEY, JSON.stringify(launchOptions));
  }, [isMounted, launchOptions]);

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
          body: JSON.stringify({
            projectRoot: targetProjectRoot,
            defaultPrompt: launchOptions.defaultPrompt.trim() || undefined,
            continueWithRecentContext: launchOptions.continueWithRecentContext,
            dangerouslySkipPermissions: launchOptions.dangerouslySkipPermissions,
          }),
        });
        const payload = (await response.json()) as SessionResponse;

        if (!response.ok || !payload.success || !payload.data?.session) {
          throw new Error(payload.error || "Failed to open Claude Code session");
        }

        const startedSession = payload.data.session;

        if (payload.data.wsBaseUrl) {
          setWsBaseUrl(payload.data.wsBaseUrl);
        }

        setActiveSession(startedSession);
        setSessionTabs((current) => upsertSessionTab(current, startedSession));
        setActiveSessionId(startedSession.sessionId);
        if (targetProjectRoot === currentProjectRoot) {
          setCurrentProjectSession(startedSession);
        }
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to start Claude Code");
      } finally {
        setIsStarting(false);
      }
    },
    [currentProjectRoot, launchOptions, projectRoot]
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
        const sessionData = payload.data ?? null;

        if (targetProjectRoot === currentProjectRoot) {
          setCurrentProjectSession(sessionData);
        }

        if (sessionData?.active) {
          setSessionTabs((current) => upsertSessionTab(current, sessionData));
          if (activeSessionId === sessionData.sessionId) {
            setActiveSession(sessionData);
          }
        } else {
          const sessionId = sessionData?.sessionId;
          if (sessionId) {
            setSessionTabs((current) => removeSessionTab(current, sessionId));
            if (activeSessionId === sessionId) {
              setActiveSessionId(null);
              setActiveSession(null);
            }
          }
        }

        return sessionData;
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to inspect Claude Code");
        return null;
      }
    },
    [activeSessionId, currentProjectRoot]
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

      const nextTabs = removeSessionTab(sessionTabs, activeSession.sessionId);
      setActiveSession(null);
      setSessionTabs(nextTabs);
      setActiveSessionId(nextTabs.at(-1)?.sessionId ?? null);
      if (activeSession.projectRoot === currentProjectRoot) {
        setCurrentProjectSession(payload.data?.session ?? null);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to stop Claude Code");
    } finally {
      setIsStopping(false);
    }
  }, [activeSession, currentProjectRoot, sessionTabs]);

  const handleSessionExit = React.useCallback(
    async (_code: number) => {
      if (activeSession?.projectRoot) {
        const latest = await loadSessionStatus(activeSession.projectRoot);

        if (!latest?.active) {
          setSessionTabs((current) => removeSessionTab(current, activeSession.sessionId));
          setActiveSession(null);
          setActiveSessionId((current) => (current === activeSession.sessionId ? null : current));
        }
      }
    },
    [activeSession, loadSessionStatus]
  );

  const sidebarItems = React.useMemo(
    () => [
      {
        id: "current" as const,
        label: "Current Project",
        description: "Resume the selected workspace project",
        icon: FolderOpen,
      },
      {
        id: "projects" as const,
        label: "Open Project",
        description: "Switch to another workspace project",
        icon: LayoutPanelLeft,
      },
      {
        id: "session" as const,
        label: "Session Controls",
        description: "Inspect and stop the active terminal session",
        icon: Square,
      },
    ],
    []
  );

  const activeSidebarItem = sidebarItems.find((item) => item.id === activePanel) ?? sidebarItems[0]!;
  const displayedSession =
    sessionTabs.find((session) => session.sessionId === activeSessionId) ??
    activeSession ??
    currentProjectSession ??
    null;
  const activeSessionLabel = displayedSession ? `${displayedSession.projectName} connected` : "No active session";
  const toolbarProjectName = activeSession?.projectName || currentProjectName || "Workspace";
  const toolbarProjectRoot = activeSession?.projectRoot || currentProjectRoot || "Loading project context...";
  const toolbarStatusTone = activeSession
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-border/70 bg-background/80 text-muted-foreground";
  const statusThemeLabel = themeMode === "dark" ? "Dark" : "Light";
  const activePanelLabel = activeSidebarItem.label;
  const updateLaunchOptions = React.useCallback(
    <K extends keyof ClaudeCliLaunchOptions>(key: K, value: ClaudeCliLaunchOptions[K]) => {
      setLaunchOptions((current) => ({
        ...current,
        [key]: value,
      }));
    },
    []
  );

  const renderSidebarContent = () => {
    const launchOptionsPanel = (
      <div className="rounded-[1.25rem] border border-border/75 bg-background/80 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Launch Options</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Applied when Claude starts a new CLI process for the selected project.
          </p>
        </div>
        <div className="mt-4 space-y-2">
          <Label
            htmlFor={`claude-cli-default-prompt-${activePanel}`}
            className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Default prompt
          </Label>
          <Textarea
            id={`claude-cli-default-prompt-${activePanel}`}
            value={launchOptions.defaultPrompt}
            onChange={(event) => updateLaunchOptions("defaultPrompt", event.target.value)}
            placeholder="Optional: add the default system/task prompt that Claude should receive on launch."
            className="admin-input min-h-[110px] rounded-2xl"
          />
        </div>
        <div className="mt-4 space-y-3 rounded-2xl border border-border/70 bg-card/60 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Continue mode</p>
              <p className="text-xs text-muted-foreground">
                Add <code>-c</code> when launching Claude CLI.
              </p>
            </div>
            <Switch
              checked={launchOptions.continueWithRecentContext}
              onCheckedChange={(checked) => updateLaunchOptions("continueWithRecentContext", checked)}
              aria-label="Enable Claude CLI -c"
            />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Skip permissions</p>
              <p className="text-xs text-muted-foreground">
                Add <code>--dangerously-skip-permissions</code> when launching Claude CLI.
              </p>
            </div>
            <Switch
              checked={launchOptions.dangerouslySkipPermissions}
              onCheckedChange={(checked) => updateLaunchOptions("dangerouslySkipPermissions", checked)}
              aria-label="Enable Claude CLI dangerously skip permissions"
            />
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          If the project already has a running session, Continue only reattaches to it and does not restart Claude
          with new launch options.
        </p>
      </div>
    );

    if (activePanel === "current") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Current Project</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Resume the Claude Code workflow for the project selected in the global header.
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
              <span className="text-muted-foreground">Session status</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                {currentProjectSession?.active ? "Running" : "Idle"}
              </span>
            </div>
          </div>
          {launchOptionsPanel}
          <Button
            type="button"
            className="h-11 w-full rounded-2xl"
            onClick={() => void launchSession(currentProjectRoot)}
            disabled={isBootstrapping || isStarting || !currentProjectRoot}
            aria-label={currentProjectSession?.active ? "Continue current project" : "Start current project"}
          >
            <Play className="mr-2 h-4 w-4" />
            {currentProjectSession?.active ? "Continue current project" : "Start current project"}
          </Button>
        </div>
      );
    }

    if (activePanel === "projects") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Open Another Project</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose another workspace project or paste a custom path under the same workspace root.
            </p>
          </div>
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
          {launchOptionsPanel}
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-2xl"
            onClick={() => void handleOpenSelectedProject()}
            disabled={isBootstrapping || isStarting}
            aria-label="Open selected project"
          >
            <Play className="mr-2 h-4 w-4" />
            Open selected project
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Session Controls</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The terminal session remains alive until you explicitly stop it.
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-border/75 bg-background/80 p-4 text-xs text-muted-foreground">
          {activeSession ? (
            <>
              <p className="font-medium text-foreground">{activeSession.projectName}</p>
              <p className="mt-1 break-all">{activeSession.projectRoot}</p>
              <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-primary">Session connected</p>
            </>
          ) : (
            <p>No Claude Code session is currently attached to this panel.</p>
          )}
        </div>
        <Button
          type="button"
          variant="destructive"
          className="h-11 w-full rounded-2xl"
          onClick={() => void handleStopSession()}
          disabled={!activeSession || isStopping}
          aria-label="Stop active session"
        >
          <Square className="mr-2 h-4 w-4" />
          Stop active session
        </Button>
      </div>
    );
  };

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
                <p className="truncate text-sm font-semibold text-foreground lg:text-base">{toolbarProjectName}</p>
                <span className="hidden rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:inline-flex">
                  Claude Code
                </span>
              </div>
              <p className="truncate text-[11px] text-muted-foreground lg:text-xs">{toolbarProjectRoot}</p>
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 items-center justify-center xl:flex">
            <div
              className={cn(
                "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                toolbarStatusTone
              )}
            >
              <CircleDot className="h-3.5 w-3.5" />
              <span className="truncate">{activeSessionLabel}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden rounded-full lg:inline-flex"
              onClick={() => {
                setActivePanel("current");
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                }
                void launchSession(currentProjectRoot);
              }}
              disabled={isBootstrapping || isStarting || !currentProjectRoot}
              aria-label={currentProjectSession?.active ? "Continue current project" : "Start current project"}
            >
              <Play className="mr-2 h-4 w-4" />
              {currentProjectSession?.active ? "Continue" : "Start"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden rounded-full lg:inline-flex"
              onClick={() => {
                setActivePanel("projects");
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                }
              }}
              aria-label="Show project launcher"
            >
              <LayoutPanelLeft className="mr-2 h-4 w-4" />
              Projects
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              aria-label={isSidebarCollapsed ? "Expand workspace sidebar" : "Collapse workspace sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
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
        </div>

        <div
          className={cn(
            "grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:gap-5 lg:p-5",
            isSidebarCollapsed
              ? "grid-cols-[72px_minmax(0,1fr)]"
              : "grid-cols-[72px_280px_minmax(0,1fr)] 2xl:grid-cols-[72px_300px_minmax(0,1fr)]"
          )}
        >
          <div className="claude-cli-sidebar flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-border/80 bg-card/72 px-2 py-3">
            <div className="flex flex-col gap-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activePanel;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActivePanel(item.id);
                      if (isSidebarCollapsed) {
                        setIsSidebarCollapsed(false);
                      }
                    }}
                    className={cn(
                      "flex h-12 items-center justify-center rounded-2xl border transition-colors",
                      isActive
                        ? "border-primary/30 bg-primary/12 text-primary"
                        : "border-transparent bg-transparent text-muted-foreground hover:border-border/70 hover:bg-background/70 hover:text-foreground"
                    )}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
            <div className="mt-auto pt-3">
              <div className="rounded-2xl border border-border/70 bg-background/70 px-2 py-3 text-center">
                <TerminalSquare className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {activeSession ? "Live" : "Idle"}
                </p>
              </div>
            </div>
          </div>

          {!isSidebarCollapsed ? (
            <div className="claude-cli-sidebar flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-border/80 bg-card/72">
              <div className="border-b border-border/70 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {activeSidebarItem.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{activeSidebarItem.description}</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {renderSidebarContent()}
                {error ? (
                  <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-col overflow-hidden">
            {sessionTabs.length > 0 ? (
              <div className="mb-3 flex items-center gap-2 overflow-x-auto rounded-[1.2rem] border border-border/75 bg-card/70 px-3 py-2">
                {sessionTabs.map((session) => {
                  const isActive = session.sessionId === activeSessionId;

                  return (
                    <button
                      key={session.sessionId}
                      type="button"
                      onClick={() => {
                        setActiveSessionId(session.sessionId);
                        setActiveSession(session);
                      }}
                      className={cn(
                        "inline-flex min-w-0 max-w-[260px] items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                        isActive
                          ? "border-primary/30 bg-primary/12 text-primary"
                          : "border-border/70 bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground"
                      )}
                      aria-label={`Switch to ${session.projectName}`}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          session.active ? "bg-emerald-400" : "bg-slate-400"
                        )}
                      />
                      <span className="truncate font-medium">{session.projectName}</span>
                      <span className="truncate text-[10px] uppercase tracking-[0.14em] opacity-70">
                        {compactSessionId(session.sessionId)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
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
                themeMode={themeMode}
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
        <div className="claude-cli-statusbar flex items-center gap-3 border-t border-border/70 px-3 py-2 text-[11px] text-muted-foreground lg:px-4">
          <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1">
            Theme: {statusThemeLabel}
          </span>
          <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1">
            Panel: {activePanelLabel}
          </span>
          <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1">
            Tabs: {sessionTabs.length}
          </span>
          <span className="hidden rounded-full border border-border/70 bg-background/80 px-2.5 py-1 md:inline-flex">
            Session: {displayedSession ? compactSessionId(displayedSession.sessionId) : "none"}
          </span>
          <span className="hidden min-w-0 flex-1 truncate rounded-full border border-border/70 bg-background/80 px-2.5 py-1 md:inline-flex">
            Project: {displayedSession?.projectRoot || currentProjectRoot || "none"}
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
        Claude Code
      </Button>
      {isMounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}
