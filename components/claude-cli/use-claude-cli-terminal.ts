"use client";

import * as React from "react";
import {
  PersistentTerminal,
  type ClaudeCliConnectionState,
} from "@/components/claude-cli/persistent-terminal";
import type { ThemeMode } from "@/lib/types/settings";

interface UseClaudeCliTerminalOptions {
  sessionId: string;
  projectRoot: string;
  wsBaseUrl: string;
  themeMode: ThemeMode;
  autoConnect?: boolean;
  onSessionExit?: (code: number) => void;
}

export function useClaudeCliTerminal({
  sessionId,
  projectRoot,
  wsBaseUrl,
  themeMode,
  autoConnect = true,
  onSessionExit,
}: UseClaudeCliTerminalOptions) {
  const terminalRef = React.useRef<PersistentTerminal | null>(null);
  const instanceIdRef = React.useRef(0);
  const [connectionState, setConnectionState] =
    React.useState<ClaudeCliConnectionState>("disconnected");
  const [error, setError] = React.useState<string | null>(null);

  const containerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) {
        return;
      }

      const instanceId = ++instanceIdRef.current;

      terminalRef.current?.dispose();
      terminalRef.current = new PersistentTerminal({
        sessionId,
        projectRoot,
        wsBaseUrl,
        themeMode,
        container: node,
        onStateChange: (state) => {
          if (instanceIdRef.current !== instanceId) {
            return;
          }
          setConnectionState(state);
          if (state === "connected" || state === "restoring") {
            setError(null);
          }
        },
        onError: (nextError) => {
          if (instanceIdRef.current !== instanceId) {
            return;
          }
          setError(nextError);
        },
        onSessionExit,
      });

      if (autoConnect) {
        terminalRef.current.connect();
      }
    },
    [autoConnect, onSessionExit, projectRoot, sessionId, themeMode, wsBaseUrl]
  );

  React.useEffect(() => {
    terminalRef.current?.setTheme(themeMode);
  }, [themeMode]);

  React.useEffect(() => {
    return () => {
      terminalRef.current?.dispose();
      terminalRef.current = null;
    };
  }, []);

  return {
    containerRef,
    connectionState,
    error,
  };
}
