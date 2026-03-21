/**
 * WebSocket Server for Real-time Updates
 *
 * Provides real-time file change notifications and task updates to connected clients.
 * Uses chokidar for file watching and ws for WebSocket communication.
 */

import { WebSocket, WebSocketServer as WSServer, RawData } from "ws";
import type { IncomingMessage } from "http";
import chokidar, { FSWatcher } from "chokidar";
import {
  WebSocketMessage,
  WebSocketMessageType,
  FileChangedPayload,
  WebSocketClient,
  WebSocketServerConfig,
  DEFAULT_WEBSOCKET_CONFIG,
} from "./types";

export class WebSocketServer {
  private wss: WSServer | null = null;
  private watcher: FSWatcher | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private config: WebSocketServerConfig;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config: Partial<WebSocketServerConfig> = {}) {
    this.config = { ...DEFAULT_WEBSOCKET_CONFIG, ...config };
  }

  /**
   * Start the WebSocket server and file watcher
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket server
        this.wss = new WSServer({ port: this.config.port });

        this.wss.on("listening", () => {
          console.log(`[WebSocket] Server started on port ${this.config.port}`);
          this.isRunning = true;

          // Start file watcher after server is ready
          this.startFileWatcher();
          this.startHeartbeat();

          resolve();
        });

        this.wss.on("error", (error) => {
          console.error("[WebSocket] Server error:", error);
          reject(error);
        });

        this.wss.on("connection", (socket: WebSocket, _request: IncomingMessage) => {
          this.handleConnection(socket);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the WebSocket server and cleanup
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Close all client connections
    for (const [_clientId, client] of this.clients) {
      client.socket.close(1001, "Server shutting down");
    }
    this.clients.clear();

    // Stop file watcher
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    // Close WebSocket server
    if (this.wss) {
      return new Promise((resolve) => {
        this.wss!.close(() => {
          console.log("[WebSocket] Server stopped");
          this.wss = null;
          resolve();
        });
      });
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: WebSocket): void {
    const clientId = this.generateClientId();
    const client: WebSocketClient = {
      id: clientId,
      socket,
      subscriptions: [],
      isAlive: true,
      lastPing: Date.now(),
    };

    this.clients.set(clientId, client);
    console.log(`[WebSocket] Client connected: ${clientId}`);

    // Send connected message
    this.sendMessage(client, "connected", {
      clientId,
      serverVersion: "1.0.0",
    });

    socket.on("message", (data: RawData) => {
      this.handleMessage(client, data);
    });

    socket.on("close", () => {
      this.handleDisconnect(clientId);
    });

    socket.on("error", (error) => {
      console.error(`[WebSocket] Client ${clientId} error:`, error);
      this.handleDisconnect(clientId);
    });

    socket.on("pong", () => {
      client.isAlive = true;
      client.lastPing = Date.now();
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(client: WebSocketClient, data: RawData): void {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "subscribe":
          this.handleSubscribe(client, message.payload);
          break;

        case "unsubscribe":
          this.handleUnsubscribe(client, message.payload);
          break;

        case "ping":
          client.isAlive = true;
          client.lastPing = Date.now();
          this.sendMessage(client, "pong", { timestamp: Date.now() });
          break;

        default:
          console.warn(`[WebSocket] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error("[WebSocket] Failed to parse message:", error);
      this.sendMessage(client, "error", {
        code: "PARSE_ERROR",
        message: "Failed to parse message",
      });
    }
  }

  /**
   * Handle client subscription request
   */
  private handleSubscribe(
    client: WebSocketClient,
    payload: { projectId: string; channels?: string[] }
  ): void {
    const { projectId, channels = ["*"] } = payload;

    // Check if already subscribed
    const existingSubscription = client.subscriptions.find((s) => s.projectId === projectId);

    if (existingSubscription) {
      // Merge channels
      const newChannels = new Set([...existingSubscription.channels, ...channels]);
      existingSubscription.channels = Array.from(newChannels);
    } else {
      client.subscriptions.push({ projectId, channels });
    }

    this.sendMessage(client, "subscribed", { projectId, channels });
    console.log(
      `[WebSocket] Client ${client.id} subscribed to ${projectId}: ${channels.join(", ")}`
    );
  }

  /**
   * Handle client unsubscription request
   */
  private handleUnsubscribe(client: WebSocketClient, payload: { projectId: string }): void {
    const { projectId } = payload;
    const index = client.subscriptions.findIndex((s) => s.projectId === projectId);

    if (index !== -1) {
      client.subscriptions.splice(index, 1);
      this.sendMessage(client, "unsubscribed", { projectId });
      console.log(`[WebSocket] Client ${client.id} unsubscribed from ${projectId}`);
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string): void {
    this.clients.delete(clientId);
    console.log(`[WebSocket] Client disconnected: ${clientId}`);
  }

  /**
   * Send message to a specific client
   */
  private sendMessage(client: WebSocketClient, type: WebSocketMessageType, payload: unknown): void {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all subscribed clients
   */
  broadcast(type: WebSocketMessageType, payload: unknown, projectId?: string): void {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      projectId,
    };

    const messageStr = JSON.stringify(message);

    for (const client of this.clients.values()) {
      // Check if client should receive this message
      if (projectId) {
        const isSubscribed = client.subscriptions.some(
          (s) =>
            s.projectId === projectId && (s.channels.includes("*") || s.channels.includes(type))
        );

        if (!isSubscribed) continue;
      }

      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(messageStr);
      }
    }
  }

  /**
   * Start file watcher for monitored paths
   */
  private startFileWatcher(): void {
    const watchPaths = this.config.watchPaths.map((p) =>
      p.startsWith("/") ? p : `${process.cwd()}/${p}`
    );

    this.watcher = chokidar.watch(watchPaths, {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    this.watcher.on("add", (path) => {
      this.handleFileChange(path, "add");
    });

    this.watcher.on("change", (path) => {
      this.handleFileChange(path, "change");
    });

    this.watcher.on("unlink", (path) => {
      this.handleFileChange(path, "unlink");
    });

    this.watcher.on("error", (error) => {
      console.error("[WebSocket] File watcher error:", error);
    });

    console.log(`[WebSocket] Watching paths: ${watchPaths.join(", ")}`);
  }

  /**
   * Handle file change event
   */
  private handleFileChange(filePath: string, event: "add" | "change" | "unlink"): void {
    const relativePath = filePath.replace(`${process.cwd()}/`, "");

    // Determine message type based on file path
    let messageType: WebSocketMessageType = "file_changed";
    let projectId: string | undefined;

    if (relativePath.includes("tasks.json")) {
      messageType = "task_updated";
    } else if (relativePath.includes("phase-manifest.json")) {
      messageType = "phase_changed";
    }

    // Extract project ID from path if possible
    const projectMatch = relativePath.match(/projects\/([^\/]+)/);
    if (projectMatch) {
      projectId = projectMatch[1];
    }

    const payload: FileChangedPayload = {
      path: relativePath,
      event,
    };

    this.broadcast(messageType, payload, projectId);

    console.log(`[WebSocket] File ${event}: ${relativePath} (${messageType})`);
  }

  /**
   * Start heartbeat to detect disconnected clients
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const [clientId, client] of this.clients) {
        if (!client.isAlive) {
          console.log(`[WebSocket] Client ${clientId} timed out, terminating`);
          client.socket.terminate();
          this.clients.delete(clientId);
          continue;
        }

        client.isAlive = false;
        client.socket.ping();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get server status
   */
  getStatus(): {
    isRunning: boolean;
    port: number;
    clientCount: number;
    watchPaths: string[];
  } {
    return {
      isRunning: this.isRunning,
      port: this.config.port,
      clientCount: this.clients.size,
      watchPaths: this.config.watchPaths,
    };
  }
}

// Singleton instance for Next.js API routes
let serverInstance: WebSocketServer | null = null;

export function getWebSocketServer(config?: Partial<WebSocketServerConfig>): WebSocketServer {
  if (!serverInstance) {
    serverInstance = new WebSocketServer(config);
  }
  return serverInstance;
}

export default WebSocketServer;
