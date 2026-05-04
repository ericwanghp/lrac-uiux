"use client";

import { useClaudeCliTerminal } from "@/components/claude-cli/use-claude-cli-terminal";
import type { ThemeMode } from "@/lib/types/settings";

interface ClaudeCliTerminalPanelProps {
  sessionId: string;
  projectRoot: string;
  wsBaseUrl: string;
  themeMode: ThemeMode;
  onSessionExit?: (code: number) => void;
}

function getStatusLabel(state: string): string {
  switch (state) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting...";
    case "restoring":
      return "Restoring session...";
    default:
      return "Disconnected";
  }
}

function getStatusClass(state: string): string {
  switch (state) {
    case "connected":
      return "bg-emerald-400";
    case "connecting":
    case "restoring":
      return "bg-amber-400";
    default:
      return "bg-slate-400";
  }
}

export function ClaudeCliTerminalPanel({
  sessionId,
  projectRoot,
  wsBaseUrl,
  themeMode,
  onSessionExit,
}: ClaudeCliTerminalPanelProps) {
  const { containerRef, connectionState, error } = useClaudeCliTerminal({
    sessionId,
    projectRoot,
    wsBaseUrl,
    themeMode,
    autoConnect: true,
    onSessionExit,
  });

  const shellClassName =
    themeMode === "dark"
      ? "border-slate-800/70 bg-slate-950 text-slate-200"
      : "border-border/80 bg-card text-foreground";
  const topBarClassName =
    themeMode === "dark"
      ? "border-slate-800/80 text-slate-200"
      : "border-border/80 text-foreground";
  const projectPathClassName = themeMode === "dark" ? "text-slate-400" : "text-muted-foreground";
  const footerClassName =
    themeMode === "dark"
      ? "border-slate-800/80 text-slate-500"
      : "border-border/80 text-muted-foreground";
  const titleBarClassName =
    themeMode === "dark"
      ? "border-slate-800/80 bg-slate-950/90"
      : "border-border/80 bg-background/85";
  const tabClassName =
    themeMode === "dark"
      ? "border-slate-700/80 bg-slate-900 text-slate-200"
      : "border-border/80 bg-card text-foreground";

  return (
    <div className={`flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-[1.4rem] border ${shellClassName}`}>
      <div className={`flex items-center justify-between gap-3 border-b px-3 py-2 ${titleBarClassName}`}>
        <div className={`inline-flex min-w-0 items-center gap-2 rounded-full border px-3 py-1 text-xs ${tabClassName}`}>
          <TerminalDot />
          <span className="truncate font-medium">Claude Code Session</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-2.5 w-2.5 rounded-full ${getStatusClass(connectionState)}`} />
          <span className="text-xs">{getStatusLabel(connectionState)}</span>
        </div>
      </div>
      <div className={`flex items-center justify-between gap-3 border-b px-4 py-2.5 ${topBarClassName}`}>
        <span className="truncate text-sm font-medium">{projectRoot.split("/").filter(Boolean).pop() || projectRoot}</span>
        <span className={`truncate text-[11px] ${projectPathClassName}`}>{projectRoot}</span>
      </div>
      {error ? (
        <div className="border-b border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
          {error}
        </div>
      ) : null}
      <div className="claude-cli-terminal-shell min-h-0 min-w-0 flex-1">
        <div ref={containerRef} className="claude-cli-terminal-viewport h-full w-full" />
      </div>
      <div className={`border-t px-4 py-2 text-[11px] ${footerClassName}`}>
        Closing this panel does not stop the Claude Code session.
      </div>
    </div>
  );
}

function TerminalDot() {
  return <span className="inline-flex h-2 w-2 rounded-full bg-primary" aria-hidden="true" />;
}
