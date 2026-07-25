// FILE: marketplace/src/hooks/useWebSocket.ts
// PURPOSE: Real-time WebSocket connection to backend for live messaging + deal updates
// USAGE: const { connected, send, subscribe } = useWebSocket();

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

type MessageHandler = (data: Record<string, unknown>) => void;

interface WebSocketState {
  connected: boolean;
  reconnecting: boolean;
}

interface UseWebSocketReturn {
  connected: boolean;
  reconnecting: boolean;
  send: (type: string, payload: Record<string, unknown>) => void;
  subscribe: (type: string, handler: MessageHandler) => () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || '';
const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const PING_INTERVAL = 25000;

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<WebSocketState>({ connected: false, reconnecting: false });
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const reconnectDelay = useRef(RECONNECT_DELAY);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const unmountedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (pingTimer.current) clearInterval(pingTimer.current);
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent reconnect loop
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (unmountedRef.current || !WS_URL) return;

    // Don't reconnect if already open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    cleanup();

    // Derive wss:// from backend URL
    let url = WS_URL;
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      url = `wss://${url}`;
    }

    // Append JWT token from cookie if available
    const tokenMatch = document.cookie.match(/access_token=([^;]+)/);
    const token = tokenMatch?.[1];
    if (token) {
      url += `?token=${token}`;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      setState(prev => ({ ...prev, reconnecting: wsRef.current === null }));

      ws.onopen = () => {
        reconnectDelay.current = RECONNECT_DELAY;
        setState({ connected: true, reconnecting: false });

        // Start ping keepalive
        pingTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const type = msg.type as string;
          const handlers = handlersRef.current.get(type);
          if (handlers) {
            handlers.forEach(handler => handler(msg));
          }
          // Also fire wildcard subscribers
          const wildcard = handlersRef.current.get('*');
          if (wildcard) {
            wildcard.forEach(handler => handler(msg));
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (pingTimer.current) clearInterval(pingTimer.current);
        setState({ connected: false, reconnecting: true });

        // Exponential backoff reconnect
        if (!unmountedRef.current) {
          reconnectTimer.current = setTimeout(() => {
            reconnectDelay.current = Math.min(reconnectDelay.current * 2, MAX_RECONNECT_DELAY);
            connect();
          }, reconnectDelay.current);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // Connection failed, retry
      if (!unmountedRef.current) {
        reconnectTimer.current = setTimeout(connect, reconnectDelay.current);
      }
    }
  }, [cleanup]);

  useEffect(() => {
    unmountedRef.current = false;

    if (WS_URL) {
      connect();
    } else {
      // No WebSocket URL configured — run in disconnected mode
      setState({ connected: false, reconnecting: false });
    }

    return () => {
      unmountedRef.current = true;
      cleanup();
    };
  }, [connect, cleanup]);

  const send = useCallback((type: string, payload: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...payload }));
    }
  }, []);

  const subscribe = useCallback((type: string, handler: MessageHandler): (() => void) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type)!.add(handler);

    return () => {
      handlersRef.current.get(type)?.delete(handler);
    };
  }, []);

  return {
    connected: state.connected,
    reconnecting: state.reconnecting,
    send,
    subscribe,
  };
}
