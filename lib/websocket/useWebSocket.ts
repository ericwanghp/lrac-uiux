"use client";

/**
 * React Hook for WebSocket Connection
 *
 * Provides real-time updates from the WebSocket server with automatic
 * reconnection and subscription management.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  WebSocketMessage,
  FileChangedPayload,
  TaskUpdatedPayload,
  PhaseChangedPayload,
} from "./types";

export interface UseWebSocketOptions {
  url?: string | null;
  projectId?: string;
  channels?: string[];
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onFileChanged?: (payload: FileChangedPayload) => void;
  onTaskUpdated?: (payload: TaskUpdatedPayload) => void;
  onPhaseChanged?: (payload: PhaseChangedPayload) => void;
  onConnected?: (clientId: string) => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  clientId: string | null;
  error: string | null;
  reconnectAttempts: number;
}

const WEBSOCKET_ENABLED = process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === "true";
const DEFAULT_PORT = process.env.NEXT_PUBLIC_WS_PORT || "3003";
const DEFAULT_URL =
  typeof window !== "undefined" && WEBSOCKET_ENABLED
    ? process.env.NEXT_PUBLIC_WS_URL || `ws://${window.location.hostname}:${DEFAULT_PORT}`
    : null;

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = DEFAULT_URL,
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const optionsRef = useRef(options);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    clientId: null,
    error: null,
    reconnectAttempts: 0,
  });

  /**
   * Clear reconnect timer
   */
  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  /**
   * Handle incoming message
   */
  const handleMessage = useCallback((message: WebSocketMessage) => {
    const opts = optionsRef.current;

    // Call general message handler
    opts.onMessage?.(message);

    // Handle specific message types
    switch (message.type) {
      case "connected":
        if (message.payload && typeof message.payload === "object") {
          const connectedPayload = message.payload as { clientId: string };
          setState((prev) => ({
            ...prev,
            clientId: connectedPayload.clientId,
          }));
          opts.onConnected?.(connectedPayload.clientId);
        }
        break;

      case "file_changed":
        opts.onFileChanged?.(message.payload as FileChangedPayload);
        break;

      case "task_updated":
        opts.onTaskUpdated?.(message.payload as TaskUpdatedPayload);
        break;

      case "phase_changed":
        opts.onPhaseChanged?.(message.payload as PhaseChangedPayload);
        break;

      case "error":
        if (
          message.payload &&
          typeof message.payload === "object" &&
          "message" in message.payload
        ) {
          const errorPayload = message.payload as { message: string };
          setState((prev) => ({
            ...prev,
            error: errorPayload.message,
          }));
        }
        break;
    }
  }, []);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimer();

    if (socketRef.current) {
      socketRef.current.close(1000, "Client disconnect");
      socketRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      clientId: null,
    }));
  }, [clearReconnectTimer]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    clearReconnectTimer();
    shouldReconnectRef.current = true;

    if (!url) {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: null,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          reconnectAttempts: 0,
          error: null,
        }));

        // Subscribe to project if projectId is provided
        const opts = optionsRef.current;
        if (opts.projectId && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "subscribe",
              payload: {
                projectId: opts.projectId,
                channels: opts.channels || ["*"],
              },
            })
          );
        }
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      };

      socket.onclose = () => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          clientId: null,
        }));

        socketRef.current = null;
        optionsRef.current.onDisconnected?.();

        // Attempt reconnection
        if (shouldReconnectRef.current) {
          setState((prev) => {
            const newAttempts = prev.reconnectAttempts + 1;
            if (newAttempts <= maxReconnectAttempts) {
              reconnectTimerRef.current = setTimeout(() => {
                connect();
              }, reconnectInterval);
            }
            return { ...prev, reconnectAttempts: newAttempts };
          });
        }
      };

      socket.onerror = (error) => {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: "Connection error",
        }));
        optionsRef.current.onError?.(error);
      };
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: "Failed to create WebSocket connection",
      }));
    }
  }, [url, clearReconnectTimer, maxReconnectAttempts, reconnectInterval, handleMessage]);

  /**
   * Subscribe to a project
   */
  const subscribe = useCallback((targetProjectId: string, targetChannels: string[] = ["*"]) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "subscribe",
          payload: {
            projectId: targetProjectId,
            channels: targetChannels,
          },
        })
      );
    }
  }, []);

  /**
   * Unsubscribe from a project
   */
  const unsubscribe = useCallback((targetProjectId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "unsubscribe",
          payload: {
            projectId: targetProjectId,
          },
        })
      );
    }
  }, []);

  /**
   * Send ping to server
   */
  const ping = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "ping",
          payload: {},
        })
      );
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect, url]);

  // Resubscribe when projectId changes
  useEffect(() => {
    const opts = optionsRef.current;
    if (state.isConnected && opts.projectId) {
      subscribe(opts.projectId, opts.channels || ["*"]);
    }
  }, [options.projectId, options.channels, state.isConnected, subscribe]);

  return {
    ...state,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    ping,
  };
}

export default useWebSocket;
