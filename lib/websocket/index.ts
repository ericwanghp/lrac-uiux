/**
 * WebSocket Module
 *
 * Provides real-time updates for the LRAC UI/UX management frontend.
 */

export { WebSocketServer, getWebSocketServer } from "./server";
export { useWebSocket } from "./useWebSocket";
export type {
  WebSocketMessage,
  WebSocketMessageType,
  FileChangedPayload,
  TaskUpdatedPayload,
  PhaseChangedPayload,
  ConnectedPayload,
  SubscribedPayload,
  UnsubscribedPayload,
  PongPayload,
  ErrorPayload,
  ClientSubscription,
  WebSocketClient,
  WebSocketServerConfig,
} from "./types";
export { DEFAULT_WEBSOCKET_CONFIG } from "./types";
