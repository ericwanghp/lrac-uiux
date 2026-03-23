"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GlobalProjectSwitcher } from "@/components/shared/global-project-switcher";
import { buildProjectScopedPath } from "@/lib/utils/project-selection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectRealtimeStatus } from "@/components/providers/project-realtime-status-provider";

export function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectRoot = searchParams.get("project");
  const { snapshot, isConnected, isConnecting, reconnectAttempts } = useProjectRealtimeStatus();
  const [launcherTarget, setLauncherTarget] = React.useState("tasks-log");
  const [isLaunching, setIsLaunching] = React.useState(false);
  const phaseText = `Phase ${Math.min(snapshot.currentPhase, 7)}: ${snapshot.currentPhaseLabel}`;
  const statusText = isConnected
    ? `${snapshot.completed}/${snapshot.total} tasks completed · ${snapshot.overallProgress}%`
    : isConnecting
      ? "Connecting realtime status..."
      : reconnectAttempts > 0
        ? `Realtime disconnected · retry ${reconnectAttempts}`
        : "Realtime offline";
  const openLauncher = async () => {
    if (launcherTarget === "terminal") {
      setIsLaunching(true);
      try {
        const response = await fetch(
          buildProjectScopedPath("/api/launcher/terminal", projectRoot),
          {
            method: "POST",
          }
        );
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || "Failed to open Workspace Terminal");
        }
      } catch (error) {
        console.error("Failed to open Workspace Terminal:", error);
        window.alert(error instanceof Error ? error.message : "Failed to open Workspace Terminal");
      } finally {
        setIsLaunching(false);
      }
      return;
    }

    if (launcherTarget === "tasks-log") {
      router.push(buildProjectScopedPath("/tasks-log", projectRoot));
      return;
    }
    if (launcherTarget === "iterm2") {
      window.location.href = "iterm2://";
      return;
    }
    window.location.href = "vscode://";
  };

  return (
    <header
      className="admin-topbar sticky top-0 z-30 h-16 border-b border-border/80 px-6 flex items-center justify-between"
      role="banner"
    >
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <div className="flex-1 max-w-md min-w-0">
          <label htmlFor="header-search" className="sr-only">
            Search features, tasks, or docs
          </label>
          <Input
            id="header-search"
            type="search"
            placeholder="Search features, tasks, or docs..."
            className="admin-input h-10 w-full border-border/80 bg-background/80 shadow-sm"
            aria-label="Search features, tasks, or docs"
          />
        </div>
        <GlobalProjectSwitcher />
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-4 ml-4" role="group" aria-label="Header actions">
        <div className="flex items-center gap-2">
          <Select value={launcherTarget} onValueChange={setLauncherTarget}>
            <SelectTrigger className="admin-input h-9 w-[210px] border-border/80 bg-background/80 shadow-sm">
              <SelectValue placeholder="Launcher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tasks-log">Open Tasks Log</SelectItem>
              <SelectItem value="terminal">Open Workspace Terminal</SelectItem>
              <SelectItem value="iterm2">Open iTerm2</SelectItem>
              <SelectItem value="vscode">Open VSCode</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void openLauncher()}
            disabled={isLaunching}
          >
            {isLaunching ? "Opening..." : "Open"}
          </Button>
        </div>

        {/* Phase Indicator */}
        <Badge
          variant="default"
          className="hidden sm:flex"
          aria-label={`Current phase: ${phaseText}`}
        >
          {phaseText}
        </Badge>

        <div className="hidden md:flex items-center space-x-2" role="status" aria-live="polite">
          <div
            className={`h-2 w-2 rounded-full ${isConnected ? "bg-success animate-pulse" : "bg-warning"}`}
            aria-hidden="true"
          />
          <span className="text-sm text-muted-foreground">{statusText}</span>
        </div>

        {/* User Menu */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="User menu"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          onClick={() => router.push(buildProjectScopedPath("/settings", projectRoot))}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.650 0 0 0-1.51 1z" />
          </svg>
        </Button>
      </div>
    </header>
  );
}
