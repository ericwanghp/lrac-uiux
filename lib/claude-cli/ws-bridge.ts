import type { IncomingMessage } from "http";
import type { Duplex } from "stream";
import { WebSocket, WebSocketServer } from "ws";
import { ClaudeCliSessionManager } from "@/lib/claude-cli/session-manager";

const OUTPUT_BUFFER_HIGH_WATER_MARK = 16 * 1024;
const OUTPUT_BUFFER_LOW_WATER_MARK = 4 * 1024;
const OUTPUT_BATCH_INTERVAL_MS = 4;
const OUTPUT_IMMEDIATE_THRESHOLD = 256;

interface ViewerState {
  clientId: string;
  ioSocket: WebSocket | null;
  controlSocket: WebSocket | null;
  pendingOutput: Buffer[];
  pendingOutputSize: number;
  restoreComplete: boolean;
  batchTimer: ReturnType<typeof setTimeout> | null;
  detachControlListener: (() => void) | null;
}

interface StreamState {
  sessionId: string;
  projectRoot: string;
  viewers: Map<string, ViewerState>;
  ptyListenerId: number | null;
  paused: boolean;
}

export class ClaudeCliWsBridge {
  private ioWss = new WebSocketServer({ noServer: true });
  private controlWss = new WebSocketServer({ noServer: true });
  private streams = new Map<string, StreamState>();

  constructor(private manager: ClaudeCliSessionManager) {
    this.ioWss.on("connection", (ws, request) => {
      this.handleIoConnection(ws, request);
    });
    this.controlWss.on("connection", (ws, request) => {
      this.handleControlConnection(ws, request);
    });
  }

  handleUpgrade(pathname: string, request: IncomingMessage, socket: Duplex, head: Buffer): void {
    if (pathname === "/api/claude-cli/io") {
      this.ioWss.handleUpgrade(request, socket, head, (ws) => {
        this.ioWss.emit("connection", ws, request);
      });
      return;
    }

    if (pathname === "/api/claude-cli/control") {
      this.controlWss.handleUpgrade(request, socket, head, (ws) => {
        this.controlWss.emit("connection", ws, request);
      });
      return;
    }

    socket.destroy();
  }

  private getParams(url: string | undefined): { sessionId: string; clientId: string; projectRoot: string } {
    const params = new URL(url ?? "", "http://127.0.0.1").searchParams;
    return {
      sessionId: params.get("sessionId") ?? "default",
      clientId: params.get("clientId") ?? `client-${Date.now()}`,
      projectRoot: params.get("projectRoot") ?? process.cwd(),
    };
  }

  private getOrCreateStream(sessionId: string, projectRoot: string): StreamState {
    const existing = this.streams.get(sessionId);
    if (existing) {
      return existing;
    }

    const stream: StreamState = {
      sessionId,
      projectRoot,
      viewers: new Map<string, ViewerState>(),
      ptyListenerId: null,
      paused: false,
    };
    this.streams.set(sessionId, stream);
    return stream;
  }

  private getOrCreateViewer(stream: StreamState, clientId: string): ViewerState {
    const existing = stream.viewers.get(clientId);
    if (existing) {
      return existing;
    }

    const viewer: ViewerState = {
      clientId,
      ioSocket: null,
      controlSocket: null,
      pendingOutput: [],
      pendingOutputSize: 0,
      restoreComplete: false,
      batchTimer: null,
      detachControlListener: null,
    };
    stream.viewers.set(clientId, viewer);
    return viewer;
  }

  private handleIoConnection(ws: WebSocket, request: IncomingMessage): void {
    const { sessionId, clientId, projectRoot } = this.getParams(request.url);
    const stream = this.getOrCreateStream(sessionId, projectRoot);
    const viewer = this.getOrCreateViewer(stream, clientId);

    if (viewer.ioSocket) {
      try {
        viewer.ioSocket.close();
      } catch {
        // Ignore replaced socket close failures.
      }
    }

    viewer.ioSocket = ws;
    ws.binaryType = "arraybuffer";
    this.flushPendingOutput(viewer);
    this.ensurePtyListener(stream);

    ws.on("message", (data) => {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      this.manager.writeInput(sessionId, buffer);
    });

    ws.on("close", () => {
      if (viewer.ioSocket === ws) {
        viewer.ioSocket = null;
      }
      this.cleanupViewerIfUnused(stream.sessionId, viewer.clientId);
    });

    ws.on("error", () => {
      if (viewer.ioSocket === ws) {
        viewer.ioSocket = null;
      }
      this.cleanupViewerIfUnused(stream.sessionId, viewer.clientId);
    });
  }

  private handleControlConnection(ws: WebSocket, request: IncomingMessage): void {
    const { sessionId, clientId, projectRoot } = this.getParams(request.url);
    const stream = this.getOrCreateStream(sessionId, projectRoot);
    const viewer = this.getOrCreateViewer(stream, clientId);

    if (viewer.controlSocket) {
      try {
        viewer.controlSocket.close();
      } catch {
        // Ignore replaced socket close failures.
      }
    }
    if (viewer.detachControlListener) {
      viewer.detachControlListener();
      viewer.detachControlListener = null;
    }

    viewer.restoreComplete = false;
    if (!viewer.ioSocket) {
      viewer.pendingOutput = [];
      viewer.pendingOutputSize = 0;
    }
    viewer.controlSocket = ws;

    this.ensurePtyListener(stream);

    const summary = this.manager.getSessionSummary(sessionId);
    if (summary) {
      this.sendControlMessage(ws, { type: "state", summary });
    }

    const snapshot = this.manager.getSnapshot(sessionId);
    const size = this.manager.getTerminalSize(sessionId);
    this.sendControlMessage(ws, {
      type: "restore",
      snapshot: snapshot ?? "",
      cols: size.cols,
      rows: size.rows,
    });

    const listener = this.manager.addListener(sessionId, projectRoot, {
      onStateChange: (nextSummary) => {
        this.sendControlMessage(ws, { type: "state", summary: nextSummary });
      },
      onExit: (code) => {
        this.sendControlMessage(ws, { type: "exit", code });
      },
    });
    viewer.detachControlListener = () => {
      this.manager.removeListener(sessionId, listener.id);
    };

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(stream, viewer, message);
      } catch {
        // Ignore malformed control messages.
      }
    });

    ws.on("close", () => {
      if (viewer.controlSocket === ws) {
        viewer.controlSocket = null;
      }
      viewer.detachControlListener?.();
      viewer.detachControlListener = null;
      this.cleanupViewerIfUnused(stream.sessionId, viewer.clientId);
    });

    ws.on("error", () => {
      if (viewer.controlSocket === ws) {
        viewer.controlSocket = null;
      }
      viewer.detachControlListener?.();
      viewer.detachControlListener = null;
      this.cleanupViewerIfUnused(stream.sessionId, viewer.clientId);
    });
  }

  private handleClientMessage(
    stream: StreamState,
    viewer: ViewerState,
    message: Record<string, unknown>
  ): void {
    switch (message.type) {
      case "resize":
        this.manager.resizeSession(stream.sessionId, Number(message.cols), Number(message.rows));
        return;
      case "stop":
        this.manager.stopSession(stream.sessionId);
        return;
      case "output_ack":
        viewer.pendingOutputSize = Math.max(0, viewer.pendingOutputSize - Number(message.bytes ?? 0));
        this.checkResumePty(stream);
        return;
      case "restore_complete":
        viewer.restoreComplete = true;
        this.flushPendingOutput(viewer);
        return;
      default:
        return;
    }
  }

  private ensurePtyListener(stream: StreamState): void {
    if (stream.ptyListenerId !== null) {
      return;
    }

    const listener = this.manager.addListener(stream.sessionId, stream.projectRoot, {
      onOutput: (data) => {
        this.distributeOutput(stream, data);
      },
    });
    stream.ptyListenerId = listener.id;
  }

  private distributeOutput(stream: StreamState, data: Buffer): void {
    for (const viewer of stream.viewers.values()) {
      if (!viewer.restoreComplete || !viewer.ioSocket || viewer.ioSocket.readyState !== WebSocket.OPEN) {
        viewer.pendingOutput.push(data);
        viewer.pendingOutputSize += data.length;
        continue;
      }

      if (this.shouldBufferOutput(viewer)) {
        viewer.pendingOutput.push(data);
        viewer.pendingOutputSize += data.length;
        this.scheduleBatchFlush(viewer);
      } else {
        viewer.ioSocket.send(data);
      }
    }

    this.checkPausePty(stream);
  }

  private shouldBufferOutput(viewer: ViewerState): boolean {
    if (!viewer.ioSocket) {
      return true;
    }

    return viewer.pendingOutput.length > 0 || viewer.ioSocket.bufferedAmount > OUTPUT_BUFFER_LOW_WATER_MARK;
  }

  private scheduleBatchFlush(viewer: ViewerState): void {
    if (viewer.batchTimer !== null) {
      return;
    }

    const delay =
      viewer.pendingOutputSize < OUTPUT_IMMEDIATE_THRESHOLD ? 5 : OUTPUT_BATCH_INTERVAL_MS;
    viewer.batchTimer = setTimeout(() => {
      viewer.batchTimer = null;
      this.flushPendingOutput(viewer);
    }, delay);
  }

  private flushPendingOutput(viewer: ViewerState): void {
    if (viewer.batchTimer !== null) {
      clearTimeout(viewer.batchTimer);
      viewer.batchTimer = null;
    }

    if (
      viewer.pendingOutput.length === 0 ||
      !viewer.ioSocket ||
      viewer.ioSocket.readyState !== WebSocket.OPEN ||
      !viewer.restoreComplete
    ) {
      return;
    }

    const merged = Buffer.concat(viewer.pendingOutput);
    viewer.pendingOutput = [];
    viewer.pendingOutputSize = 0;
    viewer.ioSocket.send(merged);
  }

  private checkPausePty(stream: StreamState): void {
    if (stream.paused) {
      return;
    }

    for (const viewer of stream.viewers.values()) {
      if (viewer.pendingOutputSize > OUTPUT_BUFFER_HIGH_WATER_MARK) {
        stream.paused = true;
        return;
      }
    }
  }

  private checkResumePty(stream: StreamState): void {
    if (!stream.paused) {
      return;
    }

    for (const viewer of stream.viewers.values()) {
      if (viewer.pendingOutputSize > OUTPUT_BUFFER_LOW_WATER_MARK) {
        return;
      }
    }

    stream.paused = false;
  }

  private cleanupViewerIfUnused(sessionId: string, clientId: string): void {
    const stream = this.streams.get(sessionId);
    if (!stream) {
      return;
    }

    const viewer = stream.viewers.get(clientId);
    if (!viewer || viewer.ioSocket || viewer.controlSocket) {
      return;
    }

    if (viewer.batchTimer) {
      clearTimeout(viewer.batchTimer);
    }
    stream.viewers.delete(clientId);

    if (stream.viewers.size === 0 && stream.ptyListenerId !== null) {
      this.manager.removeListener(stream.sessionId, stream.ptyListenerId);
      stream.ptyListenerId = null;
      this.streams.delete(sessionId);
    }
  }

  private sendControlMessage(ws: WebSocket, message: Record<string, unknown>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}
