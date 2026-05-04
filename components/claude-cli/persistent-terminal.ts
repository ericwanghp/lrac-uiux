"use client";

import { ClipboardAddon } from "@xterm/addon-clipboard";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal, type ITerminalOptions } from "@xterm/xterm";
import type { ThemeMode } from "@/lib/types/settings";

export type ClaudeCliConnectionState = "disconnected" | "connecting" | "restoring" | "connected";

export interface PersistentTerminalOptions {
  sessionId: string;
  projectRoot: string;
  wsBaseUrl: string;
  container: HTMLElement;
  themeMode: ThemeMode;
  onStateChange?: (state: ClaudeCliConnectionState) => void;
  onError?: (error: string) => void;
  onSessionExit?: (code: number) => void;
}

function cssHslVar(variableName: string, fallback: string): string {
  if (typeof document === "undefined") {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value ? `hsl(${value})` : fallback;
}

function createTerminalTheme(themeMode: ThemeMode): NonNullable<ITerminalOptions["theme"]> {
  if (themeMode === "dark") {
    return {
      background: cssHslVar("--background", "#111827"),
      foreground: cssHslVar("--foreground", "#f8fafc"),
      cursor: cssHslVar("--primary", "#fb923c"),
      cursorAccent: cssHslVar("--background", "#111827"),
      selectionBackground: "rgba(148, 163, 184, 0.24)",
      black: "#0f172a",
      red: "#f87171",
      green: "#34d399",
      yellow: "#fbbf24",
      blue: "#60a5fa",
      magenta: "#c084fc",
      cyan: "#22d3ee",
      white: "#e5e7eb",
      brightBlack: "#475569",
      brightRed: "#fca5a5",
      brightGreen: "#6ee7b7",
      brightYellow: "#fcd34d",
      brightBlue: "#93c5fd",
      brightMagenta: "#d8b4fe",
      brightCyan: "#67e8f9",
      brightWhite: "#f8fafc",
    };
  }

  return {
    background: cssHslVar("--card", "#fffaf2"),
    foreground: cssHslVar("--foreground", "#1f3340"),
    cursor: cssHslVar("--primary", "#ea6d2f"),
    cursorAccent: cssHslVar("--card", "#fffaf2"),
    selectionBackground: "rgba(234, 109, 47, 0.18)",
    black: "#334155",
    red: "#dc2626",
    green: "#0f766e",
    yellow: "#ca8a04",
    blue: "#2563eb",
    magenta: "#9333ea",
    cyan: "#0891b2",
    white: "#e2e8f0",
    brightBlack: "#64748b",
    brightRed: "#ef4444",
    brightGreen: "#14b8a6",
    brightYellow: "#eab308",
    brightBlue: "#3b82f6",
    brightMagenta: "#a855f7",
    brightCyan: "#06b6d4",
    brightWhite: "#f8fafc",
  };
}

function createTerminalOptions(themeMode: ThemeMode): ITerminalOptions {
  return {
    convertEol: false,
    cursorBlink: true,
    fontFamily: 'var(--font-mono), "JetBrains Mono", Menlo, Monaco, Consolas, monospace',
    fontSize: 13,
    lineHeight: 1.35,
    scrollback: 5000,
    theme: createTerminalTheme(themeMode),
  };
}

export class PersistentTerminal {
  private terminal: Terminal;
  private fitAddon = new FitAddon();
  private ioSocket: WebSocket | null = null;
  private controlSocket: WebSocket | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private fitRafId: number | null = null;
  private fitTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private windowResizeHandler: (() => void) | null = null;
  private viewportResizeHandler: (() => void) | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  private unacknowledgedBytes = 0;
  private clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  private disposed = false;
  private connectionState: ClaudeCliConnectionState = "disconnected";

  constructor(private options: PersistentTerminalOptions) {
    this.terminal = new Terminal(createTerminalOptions(options.themeMode));
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(new WebLinksAddon());
    this.terminal.loadAddon(new ClipboardAddon());
    this.terminal.open(options.container);
    this.terminal.focus();
    this.scheduleFit();

    this.setupInputHandlers();
    this.setupResizeObserver();
  }

  private setConnectionState(nextState: ClaudeCliConnectionState): void {
    this.connectionState = nextState;
    this.options.onStateChange?.(nextState);
  }

  private fitToContainer(): void {
    if (this.disposed) {
      return;
    }

    const { clientWidth, clientHeight } = this.options.container;
    if (clientWidth <= 0 || clientHeight <= 0) {
      return;
    }

    try {
      this.fitAddon.fit();
      this.terminal.refresh(0, Math.max(this.terminal.rows - 1, 0));
      this.sendResize(this.terminal.cols, this.terminal.rows);
    } catch {
      // Ignore fit attempts before the terminal has measurable dimensions.
    }
  }

  private scheduleFit(): void {
    if (this.disposed) {
      return;
    }

    if (this.fitRafId !== null) {
      cancelAnimationFrame(this.fitRafId);
    }
    if (this.fitTimeoutId) {
      clearTimeout(this.fitTimeoutId);
    }

    this.fitRafId = requestAnimationFrame(() => {
      this.fitRafId = requestAnimationFrame(() => {
        this.fitToContainer();
        this.fitRafId = null;
      });
    });

    // Re-fit once the surrounding layout animation settles.
    this.fitTimeoutId = setTimeout(() => {
      this.fitToContainer();
      this.fitTimeoutId = null;
    }, 180);
  }

  private setupInputHandlers(): void {
    this.terminal.onData((data) => {
      if (this.ioSocket?.readyState === WebSocket.OPEN) {
        this.ioSocket.send(data);
      }
    });

    this.terminal.onBinary((data) => {
      if (this.ioSocket?.readyState === WebSocket.OPEN) {
        this.ioSocket.send(data);
      }
    });
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleFit();
    });

    this.resizeObserver.observe(this.options.container);
    if (this.options.container.parentElement) {
      this.resizeObserver.observe(this.options.container.parentElement);
    }

    this.windowResizeHandler = () => {
      this.scheduleFit();
    };
    window.addEventListener("resize", this.windowResizeHandler);

    if (window.visualViewport) {
      this.viewportResizeHandler = () => {
        this.scheduleFit();
      };
      window.visualViewport.addEventListener("resize", this.viewportResizeHandler);
    }

    if (document.fonts) {
      void document.fonts.ready.then(() => {
        this.scheduleFit();
      });
    }
  }

  private getSocketParams(): string {
    const params = new URLSearchParams({
      sessionId: this.options.sessionId,
      clientId: this.clientId,
      projectRoot: this.options.projectRoot,
    });
    return params.toString();
  }

  connect(): void {
    if (this.disposed) {
      return;
    }

    this.setConnectionState("connecting");
    const params = this.getSocketParams();

    this.ioSocket = new WebSocket(`${this.options.wsBaseUrl}/api/claude-cli/io?${params}`);
    this.ioSocket.binaryType = "arraybuffer";
    this.ioSocket.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        this.enqueueWrite(new TextDecoder().decode(event.data));
        return;
      }

      if (typeof event.data === "string") {
        this.enqueueWrite(event.data);
      }
    };
    this.ioSocket.onclose = () => {
      if (!this.disposed && this.connectionState === "connected") {
        this.setConnectionState("disconnected");
      }
    };

    this.controlSocket = new WebSocket(`${this.options.wsBaseUrl}/api/claude-cli/control?${params}`);
    this.controlSocket.onopen = () => {
      this.setConnectionState("restoring");
    };
    this.controlSocket.onmessage = (event) => {
      try {
        this.handleControlMessage(JSON.parse(String(event.data)) as Record<string, unknown>);
      } catch {
        // Ignore malformed messages.
      }
    };
    this.controlSocket.onerror = () => {
      if (this.connectionState === "connecting") {
        this.options.onError?.("Failed to connect to Claude Code terminal");
      }
    };
  }

  private handleControlMessage(message: Record<string, unknown>): void {
    switch (message.type) {
      case "state": {
        const summary = message.summary as { state: string; exitCode?: number };
        if (
          (summary.state === "idle" || summary.state === "interrupted" || summary.state === "failed") &&
          summary.exitCode !== undefined
        ) {
          this.options.onSessionExit?.(summary.exitCode);
        }
        return;
      }
      case "exit":
        this.options.onSessionExit?.(Number(message.code ?? 0));
        return;
      case "restore":
        this.applyRestore({
          snapshot: String(message.snapshot ?? ""),
          cols: Number(message.cols ?? 120),
          rows: Number(message.rows ?? 30),
        });
        return;
      case "error":
        this.options.onError?.(String(message.message ?? "Claude Code terminal error"));
        return;
      default:
        return;
    }
  }

  private applyRestore(payload: { snapshot: string; cols: number; rows: number }): void {
    if (this.terminal.cols !== payload.cols || this.terminal.rows !== payload.rows) {
      this.terminal.resize(payload.cols, payload.rows);
    }

    this.terminal.write(payload.snapshot, () => {
      if (this.controlSocket?.readyState === WebSocket.OPEN) {
        this.controlSocket.send(JSON.stringify({ type: "restore_complete" }));
      }
      this.setConnectionState("connected");
      this.scheduleFit();
    });
  }

  private enqueueWrite(data: string): void {
    this.writeQueue = this.writeQueue.then(
      () =>
        new Promise<void>((resolve) => {
          if (this.disposed) {
            resolve();
            return;
          }

          this.terminal.write(data, () => {
            this.unacknowledgedBytes += data.length;
            if (this.controlSocket?.readyState === WebSocket.OPEN && this.unacknowledgedBytes > 0) {
              this.controlSocket.send(
                JSON.stringify({
                  type: "output_ack",
                  bytes: this.unacknowledgedBytes,
                })
              );
              this.unacknowledgedBytes = 0;
            }
            resolve();
          });
        })
    );
  }

  private sendResize(cols: number, rows: number): void {
    if (this.controlSocket?.readyState === WebSocket.OPEN) {
      this.controlSocket.send(JSON.stringify({ type: "resize", cols, rows }));
    }
  }

  setTheme(themeMode: ThemeMode): void {
    this.terminal.options.theme = createTerminalTheme(themeMode);
    this.scheduleFit();
  }

  dispose(): void {
    this.disposed = true;
    if (this.fitRafId !== null) {
      cancelAnimationFrame(this.fitRafId);
      this.fitRafId = null;
    }
    if (this.fitTimeoutId) {
      clearTimeout(this.fitTimeoutId);
      this.fitTimeoutId = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.windowResizeHandler) {
      window.removeEventListener("resize", this.windowResizeHandler);
      this.windowResizeHandler = null;
    }
    if (this.viewportResizeHandler && window.visualViewport) {
      window.visualViewport.removeEventListener("resize", this.viewportResizeHandler);
      this.viewportResizeHandler = null;
    }
    this.ioSocket?.close();
    this.ioSocket = null;
    this.controlSocket?.close();
    this.controlSocket = null;
    this.terminal.dispose();
  }
}
