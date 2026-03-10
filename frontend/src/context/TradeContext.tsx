"use client";

import { useState, createContext, useContext, ReactNode } from "react";
import { Trade } from "../../types/trade";
import { mockTrades } from "../data/mockTrades";

interface TradeContextType {
  trades: Trade[];
  addTrade: (trade: Omit<Trade, "id" | "createdAt">) => void;
  deleteTrade: (id: string) => void;
}

const TradeContext = createContext<TradeContextType | null>(null);

export function TradeProvider({ children }: { children: ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>(mockTrades);

  const addTrade = (trade: Omit<Trade, "id" | "createdAt">) => {
    const newTrade: Trade = {
      ...trade,
      id: `t${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setTrades((prev) => [newTrade, ...prev]);
  };

  const deleteTrade = (id: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <TradeContext.Provider value={{ trades, addTrade, deleteTrade }}>
      {children}
    </TradeContext.Provider>
  );
}

export function useTrades() {
  const ctx = useContext(TradeContext);
  if (!ctx) throw new Error("useTrades must be used within TradeProvider");
  return ctx;
}
