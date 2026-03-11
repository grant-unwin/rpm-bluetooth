import { useEffect, useRef, useState, useCallback } from "react";
import type { RpmMessage, DataPoint, ConnectionStatus } from "./types";

const WS_URL = "ws://localhost:3001";
const RECONNECT_DELAY_MS = 2000;
const ROLLING_WINDOW_MS = 60_000;

export function useWebSocket() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    clearReconnectTimer();

    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setStatus("connected");
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const parsed = JSON.parse(event.data as string);
        const messages: RpmMessage[] = Array.isArray(parsed) ? parsed : [parsed];
        const now = new Date();
        const cutoff = new Date(now.getTime() - ROLLING_WINDOW_MS);

        const newPoints: DataPoint[] = messages.map((msg) => ({
          time: new Date(msg.timestamp),
          sensorId: msg.sensorId,
          sensorName: msg.sensorName,
          crankRpm: msg.crankRpm,
          wheelRpm: msg.wheelRpm,
        }));

        setData((prev) => {
          const filtered = prev.filter((p) => p.time >= cutoff);
          return [...filtered, ...newPoints];
        });
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setStatus("reconnecting");
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => {
      // onclose will fire after onerror, which handles reconnect
    };
  }, [clearReconnectTimer]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus("disconnected");
    };
  }, [connect, clearReconnectTimer]);

  const resetData = useCallback(() => {
    setData([]);
  }, []);

  return { data, status, resetData };
}
