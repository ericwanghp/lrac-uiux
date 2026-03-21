/**
 * WebSocket Message Types for Real-time Updates
 */

import type { WebSocket as WsWebSocket } from "ws";

export type WebSocketMessageType =
  | "file_changed"
  | "task_updated"
  | "phase_changed"
  | "connected"
  | "subscribed"
  | "unsubscribed"
  | "error"
  | "pong";

export type WebSocketMessage = {
  type: WebSocketMessageType;
  payload: unknown;
  timestamp: string;
  projectId?: string;
};

export interface FileChangedPayload {
  path: string;
  event: "add" | "change" | "unlink";
  content?: string;
}

export interface TaskUpdatedPayload {
  taskId: string;
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}

export interface PhaseChangedPayload {
  previousPhase: number;
  currentPhase: number;
  phaseName: string;
}

export interface ConnectedPayload {
  clientId: string;
  serverVersion: string;
}

export interface SubscribedPayload {
  projectId: string;
  channels: string[];
}

export interface UnsubscribedPayload {
  projectId: string;
}

export interface PongPayload {
  timestamp: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface ClientSubscription {
  projectId: string;
  channels: string[];
}

// Note: WebSocket type is from the 'ws' library, not the browser WebSocket
export interface WebSocketClient {
  id: string;
  socket: WsWebSocket; // ws library WebSocket
  subscriptions: ClientSubscription[];
  isAlive: boolean;
  lastPing: number;
}

export interface WebSocketServerConfig {
  port: number;
  heartbeatInterval: number;
  watchPaths: string[];
}

export const DEFAULT_WEBSOCKET_CONFIG: WebSocketServerConfig = {
  port: 3003,
  heartbeatInterval: 30000,
  watchPaths: [".auto-coding", "docs"],
};
