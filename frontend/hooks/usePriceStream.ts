import { useEffect, useRef, useState } from "react";
import { getWebSocketUrl } from "../lib/utils";
import { useSession } from "@/lib/useSession";

export interface Tick {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  source: string;
}

export function usePriceStream(symbol: string) {
  const { data: session, status: sessionStatus } = useSession();
  const userEmail = session?.user?.email || "";
  const [lastTick, setLastTick] = useState<Tick | null>(null);
  const [status, setStatus] = useState<string>("connecting"); // connecting | open | closed | error
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef<number>(500);

  useEffect(() => {
    if (!symbol) return undefined;
    if (sessionStatus === "loading") return undefined;
    let cancelled = false;

    const open = () => {
      const url = getWebSocketUrl(`api/ws/prices?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(userEmail)}`);
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;
        setStatus("connecting");
        ws.onopen = () => {
          if (cancelled) return;
          setStatus("open");
          backoffRef.current = 500;
        };
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            if (data.type === "tick") setLastTick(data);
          } catch (_) {
            /* ignore parse errors */
          }
        };
        ws.onerror = () => {
          if (cancelled) return;
          setStatus("error");
        };
        ws.onclose = () => {
          if (cancelled) return;
          setStatus("closed");
          // Reconnect with backoff (capped at 8s)
          const delay = Math.min(8000, backoffRef.current);
          backoffRef.current = Math.min(8000, backoffRef.current * 2);
          reconnectTimerRef.current = setTimeout(open, delay);
        };
      } catch (e) {
        setStatus("error");
        reconnectTimerRef.current = setTimeout(open, 2000);
      }
    };

    open();
    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (_) { /* ignore */ }
      }
    };
  }, [symbol, userEmail, sessionStatus]);

  return { lastTick, status };
}
