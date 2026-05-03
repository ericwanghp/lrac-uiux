"use client";

import { useClaudeCliTerminal } from "@/components/claude-cli/use-claude-cli-terminal";

interface ClaudeCliTerminalPanelProps {
  sessionId: string;
  projectRoot: string;
  wsBaseUrl: string;
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
  onSessionExit,
}: ClaudeCliTerminalPanelProps) {
  const { containerRef, connectionState, error } = useClaudeCliTerminal({
    sessionId,
    projectRoot,
    wsBaseUrl,
    autoConnect: true,
    onSessionExit,
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.4rem] border border-slate-800/70 bg-slate-950">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-200">
          <span className={`h-2.5 w-2.5 rounded-full ${getStatusClass(connectionState)}`} />
          <span>{getStatusLabel(connectionState)}</span>
        </div>
        <span className="truncate text-xs text-slate-400">{projectRoot}</span>
      </div>
      {error ? (
        <div className="border-b border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
          {error}
        </div>
      ) : null}
      <div className="claude-cli-terminal-shell min-h-0 flex-1">
        <div ref={containerRef} className="claude-cli-terminal-viewport h-full w-full" />
      </div>
      <div className="border-t border-slate-800/80 px-4 py-2 text-[11px] text-slate-500">
        Closing this panel does not stop the Claude Code session.
      </div>
    </div>
  );
}
