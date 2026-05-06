"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  FolderOpen,
  GripVertical,
  LayoutPanelLeft,
  Play,
  Square,
  TerminalSquare,
  X,
} from "lucide-react";
import { ClaudeCliGitInsights } from "@/components/claude-cli/claude-cli-git-insights";
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
import {
  CLAUDE_CLI_LAUNCH_INTENT_EVENT,
  consumeClaudeCliLaunchIntent,
  type ClaudeCliLaunchIntent,
} from "@/lib/utils/claude-cli-launch-intent";
import {
  buildProjectNavigationPath,
  buildProjectScopedPath,
  persistProjectSelection,
} from "@/lib/utils/project-selection";
import { cn } from "@/lib/utils";

type BootstrapResponse = {
  success: boolean;
  data?: {
    wsBaseUrl: string;
    currentProjectRoot: string;
    currentProjectName: string;
    currentSession: ClaudeCliSessionDescriptor | null;
    availableProjects: ProjectOption[];
    runningSessions: ClaudeCliSessionDescriptor[];
    activeWorktreeCounts: Record<string, number>;
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

type RunningSessionsResponse = {
  success: boolean;
  data?: {
    runningSessions: ClaudeCliSessionDescriptor[];
    activeWorktreeCounts: Record<string, number>;
  };
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
type StoredClaudeCliLaunchOptions = Omit<ClaudeCliLaunchOptions, "defaultPrompt">;

const SIDEBAR_COLLAPSED_STORAGE_KEY = "lrac-uiux:claude-cli-sidebar-collapsed";
const SIDEBAR_PANEL_STORAGE_KEY = "lrac-uiux:claude-cli-sidebar-panel";
const LAUNCH_OPTIONS_STORAGE_KEY = "lrac-uiux:claude-cli-launch-options";
const DETAILS_PANEL_WIDTH_STORAGE_KEY = "lrac-uiux:claude-cli-details-panel-width";
const GIT_PANEL_WIDTH_STORAGE_KEY = "lrac-uiux:claude-cli-git-panel-width";
const IMAC_WORKTREE_PATH_SEGMENT = "/.auto-coding/worktrees/";
const DEFAULT_DETAILS_PANEL_WIDTH = 296;
const DEFAULT_GIT_PANEL_WIDTH = 720;
const MIN_DETAILS_PANEL_WIDTH = 240;
const MAX_DETAILS_PANEL_WIDTH = 440;
const MIN_GIT_PANEL_WIDTH = 460;
const MAX_GIT_PANEL_WIDTH = 1120;
const DEFAULT_LAUNCH_OPTIONS: ClaudeCliLaunchOptions = {
  defaultPrompt: "",
  continueWithRecentContext: false,
  dangerouslySkipPermissions: false,
};
const DEFAULT_STORED_LAUNCH_OPTIONS: StoredClaudeCliLaunchOptions = {
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isImacWorktreeProjectRoot(projectRoot: string | null | undefined) {
  return projectRoot?.includes(IMAC_WORKTREE_PATH_SEGMENT) ?? false;
}

function getDetailsPanelMaxWidth() {
  if (typeof window === "undefined") {
    return MAX_DETAILS_PANEL_WIDTH;
  }

  return Math.min(MAX_DETAILS_PANEL_WIDTH, Math.max(MIN_DETAILS_PANEL_WIDTH, window.innerWidth * 0.36));
}

function getGitPanelMaxWidth() {
  if (typeof window === "undefined") {
    return MAX_GIT_PANEL_WIDTH;
  }

  return Math.min(MAX_GIT_PANEL_WIDTH, Math.max(MIN_GIT_PANEL_WIDTH, window.innerWidth * 0.58));
}

interface ClaudeCliResizeHandleProps {
  onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
}

function ClaudeCliResizeHandle({ onMouseDown, label }: ClaudeCliResizeHandleProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={onMouseDown}
      className={cn(
        "group relative mx-1 flex w-3 shrink-0 cursor-col-resize select-none items-center justify-center self-stretch",
        "rounded-full bg-transparent transition-colors hover:bg-primary/6"
      )}
    >
      <span className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 rounded-full bg-border/70 transition-colors group-hover:bg-primary/50" />
      <GripVertical className="relative z-10 h-3.5 w-3.5 text-muted-foreground/65 transition-colors group-hover:text-primary" />
    </button>
  );
}

export function ClaudeCliLauncher({ projectRoot }: ClaudeCliLauncherProps) {
  const router = useRouter();
  const pathname = usePathname();
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
  const [runningSessions, setRunningSessions] = React.useState<ClaudeCliSessionDescriptor[]>([]);
  const [activeWorktreeCounts, setActiveWorktreeCounts] = React.useState<Record<string, number>>({});
  const [isLauncherHovered, setIsLauncherHovered] = React.useState(false);
  const [detailsPanelWidth, setDetailsPanelWidth] = React.useState(DEFAULT_DETAILS_PANEL_WIDTH);
  const [gitPanelWidth, setGitPanelWidth] = React.useState(DEFAULT_GIT_PANEL_WIDTH);
  const resizeSessionRef = React.useRef<{
    panel: "details" | "git";
    startX: number;
    startWidth: number;
  } | null>(null);
  const pendingAutoLaunchProjectRootRef = React.useRef<string | null>(null);
  const activeSessionIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const clearManualDefaultPrompt = React.useCallback(() => {
    setLaunchOptions((current) => ({
      ...current,
      defaultPrompt: "",
    }));
  }, []);

  const syncWorkspaceProjectContext = React.useCallback(
    (nextProjectRoot: string, nextProjectName?: string | null) => {
      if (!nextProjectRoot) {
        return;
      }

      setCurrentProjectRoot(nextProjectRoot);
      setSelectedProjectRoot(nextProjectRoot);
      setCustomProjectRoot("");
      if (nextProjectName?.trim()) {
        setCurrentProjectName(nextProjectName);
      }

      persistProjectSelection(nextProjectRoot);

      if (typeof window !== "undefined") {
        const nextPath = buildProjectNavigationPath(pathname, nextProjectRoot, window.location.search);
        router.replace(nextPath);
        router.refresh();
        window.dispatchEvent(
          new CustomEvent("lrac:project-changed", { detail: { projectRoot: nextProjectRoot } })
        );
      }
    },
    [pathname, router]
  );

  const applyLaunchIntent = React.useCallback((intent: ClaudeCliLaunchIntent) => {
    if (intent.launchOptions) {
      setLaunchOptions((current) => ({
        defaultPrompt:
          typeof intent.launchOptions?.defaultPrompt === "string"
            ? intent.launchOptions.defaultPrompt
            : current.defaultPrompt,
        continueWithRecentContext:
          typeof intent.launchOptions?.continueWithRecentContext === "boolean"
            ? intent.launchOptions.continueWithRecentContext
            : current.continueWithRecentContext,
        dangerouslySkipPermissions:
          typeof intent.launchOptions?.dangerouslySkipPermissions === "boolean"
            ? intent.launchOptions.dangerouslySkipPermissions
            : current.dangerouslySkipPermissions,
      }));
    }

    const resolvedRoot = intent.projectRoot || currentProjectRoot || undefined;

    if (resolvedRoot && resolvedRoot !== currentProjectRoot) {
      setSelectedProjectRoot(resolvedRoot);
      setCustomProjectRoot(resolvedRoot);
      setActivePanel(intent.activePanel ?? "projects");
    } else {
      setActivePanel(intent.activePanel ?? "current");
    }

    pendingAutoLaunchProjectRootRef.current =
      intent.autoStart && resolvedRoot ? resolvedRoot : null;

    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    }

    setOpen(true);
    setError(null);
  }, [currentProjectRoot, isSidebarCollapsed]);

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
      if (!pendingAutoLaunchProjectRootRef.current) {
        setSelectedProjectRoot(payload.data.currentProjectRoot);
      }
      setCurrentProjectSession(payload.data.currentSession);
      setRunningSessions(payload.data.runningSessions);
      setActiveWorktreeCounts(payload.data.activeWorktreeCounts ?? {});
      const bootstrapSession = payload.data.currentSession;
      const nextSessionTabs = payload.data.runningSessions;
      const currentActiveId = activeSessionIdRef.current;
      const matchedActive = currentActiveId
        ? nextSessionTabs.find((session) => session.sessionId === currentActiveId) ?? null
        : null;

      if (currentActiveId && !matchedActive) {
        setSessionTabs(nextSessionTabs);
      } else {
        const nextActiveSession = matchedActive
          ? matchedActive
          : bootstrapSession?.active
            ? bootstrapSession
            : nextSessionTabs[0] ?? null;
        setSessionTabs(nextSessionTabs);
        setActiveSession(nextActiveSession);
        setActiveSessionId(nextActiveSession?.sessionId ?? null);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load Claude Code");
    } finally {
      setIsBootstrapping(false);
    }
  }, [projectRoot]);

  const refreshRunningSessions = React.useCallback(async () => {
    try {
      const response = await fetch(buildProjectScopedPath("/api/claude-cli/sessions?workspace=1", projectRoot), {
        cache: "no-store",
      });
      const payload = (await response.json()) as RunningSessionsResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load Claude Code sessions");
      }

      const data = payload.data;
      if (data && typeof data === "object" && "runningSessions" in data) {
        setRunningSessions(data.runningSessions);
        setActiveWorktreeCounts(data.activeWorktreeCounts ?? {});
      } else {
        setRunningSessions(data as unknown as ClaudeCliSessionDescriptor[]);
      }
    } catch {
      setRunningSessions([]);
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
        const parsed = JSON.parse(storedLaunchOptions) as Partial<StoredClaudeCliLaunchOptions>;
        setLaunchOptions({
          defaultPrompt: DEFAULT_LAUNCH_OPTIONS.defaultPrompt,
          continueWithRecentContext:
            typeof parsed.continueWithRecentContext === "boolean"
              ? parsed.continueWithRecentContext
              : DEFAULT_STORED_LAUNCH_OPTIONS.continueWithRecentContext,
          dangerouslySkipPermissions:
            typeof parsed.dangerouslySkipPermissions === "boolean"
              ? parsed.dangerouslySkipPermissions
              : DEFAULT_STORED_LAUNCH_OPTIONS.dangerouslySkipPermissions,
        });
      } catch (storageError) {
        console.warn("Failed to parse Claude CLI launch options from local storage.", storageError);
      }
    }

    const storedDetailsPanelWidth = window.localStorage.getItem(DETAILS_PANEL_WIDTH_STORAGE_KEY);
    if (storedDetailsPanelWidth) {
      const parsed = Number(storedDetailsPanelWidth);
      if (Number.isFinite(parsed)) {
        setDetailsPanelWidth(clamp(parsed, MIN_DETAILS_PANEL_WIDTH, getDetailsPanelMaxWidth()));
      }
    }

    const storedGitPanelWidth = window.localStorage.getItem(GIT_PANEL_WIDTH_STORAGE_KEY);
    if (storedGitPanelWidth) {
      const parsed = Number(storedGitPanelWidth);
      if (Number.isFinite(parsed)) {
        setGitPanelWidth(clamp(parsed, MIN_GIT_PANEL_WIDTH, getGitPanelMaxWidth()));
      }
    }
  }, []);

  React.useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return;
    }

    const pendingIntent = consumeClaudeCliLaunchIntent();
    if (pendingIntent) {
      applyLaunchIntent(pendingIntent);
    }

    const handleLaunchIntent = (event: Event) => {
      const detail = (event as CustomEvent<ClaudeCliLaunchIntent>).detail;
      if (detail) {
        applyLaunchIntent(detail);
      }
    };

    window.addEventListener(CLAUDE_CLI_LAUNCH_INTENT_EVENT, handleLaunchIntent as EventListener);

    return () => {
      window.removeEventListener(CLAUDE_CLI_LAUNCH_INTENT_EVENT, handleLaunchIntent as EventListener);
    };
  }, [applyLaunchIntent, isMounted]);

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

    const storedLaunchOptions: StoredClaudeCliLaunchOptions = {
      continueWithRecentContext: launchOptions.continueWithRecentContext,
      dangerouslySkipPermissions: launchOptions.dangerouslySkipPermissions,
    };
    window.localStorage.setItem(LAUNCH_OPTIONS_STORAGE_KEY, JSON.stringify(storedLaunchOptions));
  }, [isMounted, launchOptions]);

  React.useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(DETAILS_PANEL_WIDTH_STORAGE_KEY, String(detailsPanelWidth));
  }, [detailsPanelWidth, isMounted]);

  React.useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(GIT_PANEL_WIDTH_STORAGE_KEY, String(gitPanelWidth));
  }, [gitPanelWidth, isMounted]);

  React.useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return;
    }

    const handleWindowResize = () => {
      setDetailsPanelWidth((current) => clamp(current, MIN_DETAILS_PANEL_WIDTH, getDetailsPanelMaxWidth()));
      setGitPanelWidth((current) => clamp(current, MIN_GIT_PANEL_WIDTH, getGitPanelMaxWidth()));
    };

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [isMounted]);

  React.useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return;
    }

    const handlePointerMove = (event: MouseEvent) => {
      const resizeSession = resizeSessionRef.current;
      if (!resizeSession) {
        return;
      }

      const deltaX = event.clientX - resizeSession.startX;

      if (resizeSession.panel === "details") {
        setDetailsPanelWidth(
          clamp(resizeSession.startWidth + deltaX, MIN_DETAILS_PANEL_WIDTH, getDetailsPanelMaxWidth())
        );
        return;
      }

      setGitPanelWidth(
        clamp(resizeSession.startWidth - deltaX, MIN_GIT_PANEL_WIDTH, getGitPanelMaxWidth())
      );
    };

    const stopResize = () => {
      resizeSessionRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", stopResize);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", stopResize);
    };
  }, [isMounted]);

  const beginPanelResize = React.useCallback(
    (panel: "details" | "git", startWidth: number) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      resizeSessionRef.current = {
        panel,
        startX: event.clientX,
        startWidth,
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    []
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }

    void loadBootstrap();
  }, [loadBootstrap, open]);

  React.useEffect(() => {
    if (!isMounted) {
      return;
    }

    void refreshRunningSessions();
    const intervalId = window.setInterval(() => {
      void refreshRunningSessions();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isMounted, refreshRunningSessions]);

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
        if (!isImacWorktreeProjectRoot(startedSession.projectRoot)) {
          syncWorkspaceProjectContext(startedSession.projectRoot, startedSession.projectName);
        }
        if (targetProjectRoot === currentProjectRoot) {
          setCurrentProjectSession(startedSession);
        }
        void refreshRunningSessions();
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to start Claude Code");
      } finally {
        setIsStarting(false);
      }
    },
    [currentProjectRoot, launchOptions, projectRoot, refreshRunningSessions, syncWorkspaceProjectContext]
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

  const focusSession = React.useCallback(
    (session: ClaudeCliSessionDescriptor) => {
      setActiveSession(session);
      setSessionTabs((current) => upsertSessionTab(current, session));
      setActiveSessionId(session.sessionId);
      if (session.projectRoot === currentProjectRoot) {
        setCurrentProjectSession(session);
      }
      if (!isImacWorktreeProjectRoot(session.projectRoot)) {
        syncWorkspaceProjectContext(session.projectRoot, session.projectName);
      }
      setError(null);
      void refreshRunningSessions();
    },
    [currentProjectRoot, refreshRunningSessions, syncWorkspaceProjectContext]
  );

  const openOrLaunchSession = React.useCallback(
    async (targetProjectRoot: string) => {
      const normalizedProjectRoot = targetProjectRoot.trim();
      if (!normalizedProjectRoot) {
        setError("Select a project or provide a custom workspace path.");
        return;
      }

      const existingSession =
        (activeSession?.active && activeSession.projectRoot === normalizedProjectRoot
          ? activeSession
          : null) ||
        (currentProjectSession?.active && currentProjectSession.projectRoot === normalizedProjectRoot
          ? currentProjectSession
          : null) ||
        sessionTabs.find((session) => session.active && session.projectRoot === normalizedProjectRoot) ||
        null;

      if (existingSession) {
        focusSession(existingSession);
        return;
      }

      const inspectedSession = await loadSessionStatus(normalizedProjectRoot);
      if (inspectedSession?.active) {
        focusSession(inspectedSession);
        return;
      }

      await launchSession(normalizedProjectRoot);
    },
    [activeSession, currentProjectSession, focusSession, launchSession, loadSessionStatus, sessionTabs]
  );

  const handleOpenSelectedProject = React.useCallback(async () => {
    const targetProjectRoot = customProjectRoot.trim() || selectedProjectRoot || currentProjectRoot;
    await openOrLaunchSession(targetProjectRoot);
  }, [currentProjectRoot, customProjectRoot, openOrLaunchSession, selectedProjectRoot]);

  React.useEffect(() => {
    if (!open || isBootstrapping || isStarting) {
      return;
    }

    const pendingProjectRoot = pendingAutoLaunchProjectRootRef.current?.trim();
    if (!pendingProjectRoot) {
      return;
    }

    pendingAutoLaunchProjectRootRef.current = null;
    void openOrLaunchSession(pendingProjectRoot);
  }, [isBootstrapping, isStarting, open, openOrLaunchSession]);

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
      void refreshRunningSessions();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to stop Claude Code");
    } finally {
      setIsStopping(false);
    }
  }, [activeSession, currentProjectRoot, refreshRunningSessions, sessionTabs]);

  const handleSessionExit = React.useCallback(
    async (code: number) => {
      if (!activeSession?.projectRoot) return;

      const latest = await loadSessionStatus(activeSession.projectRoot);

      if (!latest?.active) {
        setSessionTabs((current) => removeSessionTab(current, activeSession.sessionId));
        setActiveSession(null);
        setActiveSessionId((current) => (current === activeSession.sessionId ? null : current));
      }

      if (code !== 0 && launchOptions.continueWithRecentContext) {
        setError(
          "Session exited immediately — no conversation history found for -c (continue) mode. " +
          "Try starting a new session without continue mode."
        );
        setLaunchOptions((current) => ({
          ...current,
          continueWithRecentContext: false,
          defaultPrompt: "",
        }));
      }

      void refreshRunningSessions();
    },
    [activeSession, launchOptions.continueWithRecentContext, loadSessionStatus, refreshRunningSessions]
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
  const sidebarProjectRoot = displayedSession?.projectRoot || currentProjectRoot;
  const sidebarProjectName = displayedSession?.projectName || currentProjectName;
  const activeSessionLabel = displayedSession ? `${displayedSession.projectName} connected` : "No active session";
  const toolbarProjectName = activeSession?.projectName || currentProjectName || "Workspace";
  const toolbarProjectRoot = activeSession?.projectRoot || currentProjectRoot || "Loading project context...";
  const runningSessionCount = runningSessions.length;
  const isToolbarImac = isImacWorktreeProjectRoot(activeSession?.projectRoot);
  const toolbarStatusTone = activeSession
    ? isToolbarImac
      ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
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
      const sidebarSessionActive = displayedSession?.active ?? currentProjectSession?.active ?? false;
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
              <span>{sidebarProjectName || "Current workspace"}</span>
            </div>
            <p className="mt-2 break-all text-xs text-muted-foreground">
              {sidebarProjectRoot || "Loading project context..."}
            </p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Session status</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                {sidebarSessionActive ? "Running" : "Idle"}
              </span>
            </div>
          </div>
          {launchOptionsPanel}
          <Button
            type="button"
            className="h-11 w-full rounded-2xl"
            onClick={() => void launchSession(sidebarProjectRoot)}
            disabled={isBootstrapping || isStarting || !sidebarProjectRoot}
            aria-label={sidebarSessionActive ? "Continue current project" : "Start current project"}
          >
            <Play className="mr-2 h-4 w-4" />
            {sidebarSessionActive ? "Continue current project" : "Start current project"}
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
              {isToolbarImac && (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]">IMAC</span>
              )}
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
                syncWorkspaceProjectContext(currentProjectRoot, currentProjectName);
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

        <div className="flex min-h-0 flex-1 overflow-hidden p-3 lg:p-4">
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
            <>
              <ClaudeCliResizeHandle
                label="Resize Claude workspace details panel"
                onMouseDown={beginPanelResize("details", detailsPanelWidth)}
              />
              <div
                className="claude-cli-sidebar flex min-h-0 shrink-0 flex-col overflow-hidden rounded-[1.5rem] border border-border/80 bg-card/72"
                style={{ width: detailsPanelWidth }}
              >
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
            </>
          ) : null}

          <div className="ml-1.5 flex min-w-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {sessionTabs.length > 0 ? (
                <div className="mb-2.5 space-y-1.5">
                  {(() => {
                    const mainTabs = sessionTabs.filter((s) => !isImacWorktreeProjectRoot(s.projectRoot));
                    const imacTabs = sessionTabs.filter((s) => isImacWorktreeProjectRoot(s.projectRoot));

                    // Build owner name map for iMac tabs
                    const worktreeOwnerName = new Map<string, string>();
                    for (const wt of imacTabs) {
                      const wtSegment = wt.projectRoot.indexOf("/.auto-coding/worktrees/");
                      if (wtSegment > 0 && !worktreeOwnerName.has(wt.projectRoot)) {
                        const ownerRoot = wt.projectRoot.slice(0, wtSegment);
                        const ownerTab = mainTabs.find((m) => m.projectRoot === ownerRoot);
                        if (ownerTab) {
                          worktreeOwnerName.set(wt.projectRoot, ownerTab.projectName);
                        } else {
                          const parts = ownerRoot.split("/");
                          worktreeOwnerName.set(wt.projectRoot, parts[parts.length - 1] || ownerRoot);
                        }
                      }
                    }

                    const renderRow = (label: string, isImac: boolean, tabs: typeof sessionTabs) => {
                      if (tabs.length === 0) return null;
                      return (
                        <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-border/60 bg-card/50 px-2.5 py-1.5">
                          <span className={cn(
                            "shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em]",
                            isImac
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-primary/10 text-primary"
                          )}>
                            {label}
                          </span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            {tabs.map((session) => {
                              const isActive = session.sessionId === activeSessionId;
                              const wtCount = !isImac ? (activeWorktreeCounts[session.projectRoot] ?? 0) : 0;
                              const ownerName = isImac ? (worktreeOwnerName.get(session.projectRoot) ?? null) : null;
                              return (
                                <button
                                  key={session.sessionId}
                                  type="button"
                                  onClick={() => focusSession(session)}
                                  className={cn(
                                    "relative inline-flex min-w-0 max-w-[280px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                                    isActive
                                      ? isImac
                                        ? "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300"
                                        : "border-primary/30 bg-primary/12 text-primary"
                                      : "border-border/50 bg-background/60 text-muted-foreground hover:bg-background hover:text-foreground"
                                  )}
                                  aria-label={`Switch to ${session.projectName}`}
                                >
                                  <span className={cn(
                                    "h-1.5 w-1.5 shrink-0 rounded-full",
                                    session.active ? (isImac ? "bg-amber-400" : "bg-emerald-400") : "bg-slate-400"
                                  )} />
                                  <span className="truncate font-medium">{session.projectName}</span>
                                  {ownerName ? (
                                    <span className="flex h-3.5 shrink-0 items-center gap-0.5 rounded-full bg-sky-500/12 px-1 text-[8px] font-semibold text-sky-600 dark:text-sky-400">
                                      @{ownerName}
                                    </span>
                                  ) : null}
                                  {wtCount > 0 ? (
                                    <span className="flex h-3.5 items-center gap-0.5 rounded-full bg-amber-500/15 px-1 text-[8px] font-bold text-amber-600 dark:text-amber-400">
                                      {wtCount}wt
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <>
                        {renderRow("MAIN", false, mainTabs)}
                        {renderRow("IMAC", true, imacTabs)}
                      </>
                    );
                  })()}
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

            <ClaudeCliResizeHandle
              label="Resize Claude workspace Git insights panel"
              onMouseDown={beginPanelResize("git", gitPanelWidth)}
            />

            <div className="min-h-0 shrink-0" style={{ width: gitPanelWidth }}>
              <ClaudeCliGitInsights
                className="h-full"
                projectRoot={sidebarProjectRoot || null}
              />
            </div>
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
      <div
        className="relative"
        onMouseEnter={() => setIsLauncherHovered(true)}
        onMouseLeave={() => setIsLauncherHovered(false)}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            clearManualDefaultPrompt();
            setOpen(true);
          }}
          className="relative inline-flex"
        >
          <TerminalSquare className="mr-2 h-4 w-4" />
          Claude Code
          {runningSessionCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-primary/20 bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
              {runningSessionCount}
            </span>
          ) : null}
        </Button>
        {isLauncherHovered ? (
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-[1.1rem] border border-border/80 bg-card/95 p-3 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Claude Sessions</p>
              <span className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {runningSessionCount} running
              </span>
            </div>
            {runningSessionCount > 0 ? (
              <div className="mt-3 space-y-2">
                {runningSessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="rounded-2xl border border-border/70 bg-background/75 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                      <span className="truncate text-sm font-medium text-foreground">{session.projectName}</span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                      {compactSessionId(session.sessionId)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-2xl border border-border/70 bg-background/75 px-3 py-3 text-sm text-muted-foreground">
                No Claude Code sessions are running.
              </p>
            )}
          </div>
        ) : null}
      </div>
      {isMounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}
