"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Trade } from "../../types/trade";
import { fetchTrades, createTrade, deleteTrade as apiDeleteTrade } from "../../lib/tradeApi";

interface TradeContextType {
  trades: Trade[];
  isLoading: boolean;
  addTrade: (trade: Omit<Trade, "id" | "createdAt">) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
}

const TradeContext = createContext<TradeContextType | null>(null);

export function TradeProvider({ children }: { children: ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTrades = async () => {
      setIsLoading(true);
      const data = await fetchTrades();
      setTrades(data);
      setIsLoading(false);
    };
    loadTrades();
  }, []);

  const addTrade = async (trade: Omit<Trade, "id" | "createdAt">) => {
    const newTrade = await createTrade(trade);
    if (newTrade) {
      setTrades((prev) => [newTrade, ...prev]);
    }
  };

  const deleteTrade = async (id: string) => {
    const success = await apiDeleteTrade(id);
    if (success) {
      setTrades((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <TradeContext.Provider value={{ trades, isLoading, addTrade, deleteTrade }}>
      {children}
    </TradeContext.Provider>
  );
}

export function useTrades() {
  const ctx = useContext(TradeContext);
  if (!ctx) throw new Error("useTrades must be used within TradeProvider");
  return ctx;
}
