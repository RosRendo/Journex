"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getBackendUrl, getWebSocketUrl } from "@/lib/utils";
import { getSession } from "next-auth/react";

interface LiveEquity {
  equity: number;
  balance: number;
  profit: number;
}

interface Tick {
  type: "tick";
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  time: number;
  source: string;
}

interface WebSocketContextType {
  isConnected: boolean;
  liveEquity: LiveEquity | null;
  livePrices: Record<string, Tick>;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  liveEquity: null,
  livePrices: {},
});

export const useWebSocket = () => useContext(WebSocketContext);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [liveEquity, setLiveEquity] = useState<LiveEquity | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, Tick>>({});

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = async () => {
      try {
        const session = await getSession();
        const token = (session?.user as any)?.apiToken || "";
        const wsUrl = getWebSocketUrl(`api/ws/prices?token=${token}`);
        
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("[WebSocket] Connected to live data stream");
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "tick") {
              setLivePrices((prev) => ({
                ...prev,
                [data.symbol]: data,
              }));
            } else if (data.type === "equity") {
              setLiveEquity({
                equity: data.equity,
                balance: data.balance,
                profit: data.profit,
              });
            } else if (data.type === "signal") {
              // we can add signals here later
            }
          } catch (e) {
            console.error("[WebSocket] Failed to parse message:", e);
          }
        };

        ws.onclose = () => {
          console.log("[WebSocket] Disconnected. Reconnecting in 3s...");
          setIsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
          console.error("[WebSocket] Error:", err);
          ws.close();
        };
      } catch (e) {
        console.error("Failed to connect WS", e);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, liveEquity, livePrices }}>
      {children}
    </WebSocketContext.Provider>
  );
}
