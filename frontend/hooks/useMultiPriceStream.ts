import { useEffect, useRef, useState } from "react";
import { getWebSocketUrl } from "../lib/utils";
import { useSession } from "next-auth/react";

export interface MultiTick {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  source: string;
  dir?: number;
  ts?: number;
  time?: string;
}

export function useMultiPriceStream(symbols: string[], { tapeLimit = 60 } = {}) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || "";
  const [lastBySymbol, setLastBySymbol] = useState<Record<string, MultiTick>>({});
  const [tape, setTape] = useState<MultiTick[]>([]);
  const [status, setStatus] = useState<string>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef<number>(500);
  const tapeRef = useRef<MultiTick[]>([]);

  // Stable key so effect doesn't re-run on every render with same symbols
  const key = (symbols || []).join(",");

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;

    const open = () => {
      const url = getWebSocketUrl(`api/ws/prices?symbols=${encodeURIComponent(key)}&token=${encodeURIComponent(userEmail)}`);
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
            if (data.type !== "tick") return;
            // Update latest-by-symbol map
            setLastBySymbol((prev) => {
              const prevTick = prev[data.symbol];
              const dir = !prevTick
                ? 0
                : data.mid > prevTick.mid
                ? 1
                : data.mid < prevTick.mid
                ? -1
                : prevTick.dir || 0;
              return { ...prev, [data.symbol]: { ...data, dir } };
            });
            // Append to tape ring-buffer
            tapeRef.current = [
              { ...data, ts: Date.now() },
              ...tapeRef.current,
            ].slice(0, tapeLimit);
            setTape(tapeRef.current);
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
  }, [key, tapeLimit]);

  return { lastBySymbol, tape, status };
}
