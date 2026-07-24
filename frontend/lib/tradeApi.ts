import axios from "axios";
import { Trade } from "../types/trade";

import { getSession } from "next-auth/react";

import { getBackendUrl } from "./utils";

const backendBase = process.env.NEXT_PUBLIC_API_URL || getBackendUrl();
const API_URL = backendBase ? `${backendBase}/api` : "/api";

const api = axios.create({
  baseURL: API_URL,
});

// Inject cryptographically signed JWT token to authorize backend requests securely
api.interceptors.request.use(async (config) => {
  try {
    const session = await getSession();
    // Assuming the API token is injected into the user session by next-auth (as configured in auth.ts)
    const token = (session?.user as any)?.apiToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn("Failed to get NextAuth session in interceptor:", err);
  }
  return config;
}, (err) => {
  return Promise.reject(err);
});

/**
 * Maps a Backend Prisma Trade object to the Frontend Trade interface
 */
export const mapBackendTradeToFrontend = (backendTrade: any): Trade => {
  return {
    id: String(backendTrade.id),
    symbol: backendTrade.pair || "UNKNOWN",
    direction: (backendTrade.direction?.toLowerCase() === "short" || backendTrade.direction?.toLowerCase() === "sell") 
      ? "short" 
      : "long",
    entryPrice: Number(backendTrade.entry) || 0,
    exitPrice: Number(backendTrade.closePrice) || 0,
    stopLoss: Number(backendTrade.sl) || 0,
    takeProfit: Number(backendTrade.tp) || 0,
    lotSize: Number(backendTrade.lotSize) || 0,
    pnl: Number(backendTrade.profit) || 0,
    riskRewardRatio: Number(backendTrade.rr) || 0,
    strategyTag: backendTrade.strategy || "None",
    note: backendTrade.notes || "",
    tags: backendTrade.setupType ? backendTrade.setupType.split(",") : [],
    date: new Date(backendTrade.date).toISOString(),
    createdAt: backendTrade.createdAt ? new Date(backendTrade.createdAt).toISOString() : new Date().toISOString(),
  };
};

/**
 * Maps a Frontend Trade object to the Backend TradeInput interface
 */
export const mapFrontendTradeToBackend = (frontendTrade: Omit<Trade, "id" | "createdAt"> | Trade): any => {
  let outcome = "BREAK_EVEN";
  if (frontendTrade.pnl > 0) outcome = "WIN";
  else if (frontendTrade.pnl < 0) outcome = "LOSS";

  return {
    date: new Date(frontendTrade.date).toISOString(),
    pair: frontendTrade.symbol,
    strategy: frontendTrade.strategyTag,
    setupType: frontendTrade.tags?.join(",") || "",
    entry: frontendTrade.entryPrice,
    sl: frontendTrade.stopLoss,
    tp: frontendTrade.takeProfit,
    rr: String(frontendTrade.riskRewardRatio || 0),
    outcome: outcome,
    notes: frontendTrade.note,
    direction: frontendTrade.direction.toUpperCase(),
    profit: frontendTrade.pnl,
    lotSize: frontendTrade.lotSize,
    closePrice: frontendTrade.exitPrice,
  };
};

export const fetchTrades = async (): Promise<Trade[]> => {
  try {
    // Adding limit=1000 to fetch a reasonable amount of recent trades
    const response = await api.get("/trades?limit=1000&sortBy=date&sortOrder=desc");
    if (response.data && response.data.data) {
      return response.data.data.map(mapBackendTradeToFrontend);
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch trades:", error);
    return [];
  }
};

export const createTrade = async (trade: Omit<Trade, "id" | "createdAt">): Promise<Trade | null> => {
  try {
    const backendPayload = mapFrontendTradeToBackend(trade);
    const response = await api.post("/trades", backendPayload);
    if (response.data && response.data.data) {
      return mapBackendTradeToFrontend(response.data.data);
    }
    return null;
  } catch (error) {
    console.error("Failed to create trade:", error);
    return null;
  }
};

export const deleteTrade = async (id: string): Promise<boolean> => {
  try {
    await api.delete(`/trades/${id}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete trade ${id}:`, error);
    return false;
  }
};
