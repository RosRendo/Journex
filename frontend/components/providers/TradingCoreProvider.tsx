"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { getBackendUrl } from "@/lib/utils";
import { getSession } from "@/lib/useSession";

// --- TYPE DEFINITIONS ---
export type ExecutionEnvironment = "LIVE" | "SIMULATION";

export interface AccountData {
  id: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  leverage: number;
  provider: string;
}

export interface Position {
  ticket: string | number;
  symbol: string;
  direction: "BUY" | "SELL";
  lots: number;
  openPrice: number;
  currentPrice: number;
  sl: number;
  tp: number;
  pnl: number;
  openTime: string;
}

export interface Deal {
  ticket: string | number;
  symbol: string;
  direction: "BUY" | "SELL";
  lots: number;
  openPrice: number;
  closePrice: number;
  profit: number;
  closeTime: string;
  comment?: string;
}

export interface MarketTick {
  ask: number;
  bid: number;
  pip_size: number;
  digits: number;
  symbol: string;
}

export interface RiskLimits {
  maxDailyLossPct: number;
  maxOverallLossPct: number;
  maxLeverage: number;
  maxLotSize: number;
}

interface TradingCoreContextType {
  environment: ExecutionEnvironment;
  setEnvironment: (env: ExecutionEnvironment) => void;
  account: AccountData;
  positions: Position[];
  deals: Deal[];
  marketData: Record<string, MarketTick>;
  riskLimits: RiskLimits;
  updateRiskLimits: (limits: Partial<RiskLimits>) => void;
  executeTrade: (params: {
    symbol: string;
    direction: "BUY" | "SELL";
    lots: number;
    sl: number;
    tp: number;
    comment?: string;
  }) => Promise<boolean>;
  closePosition: (ticket: string | number) => Promise<boolean>;
  closeAllPositions: () => Promise<boolean>;
  syncState: () => Promise<void>;
  loading: boolean;
}

const TradingCoreContext = createContext<TradingCoreContextType | undefined>(undefined);

// --- HELPER CONSTANTS ---
const DEFAULT_LIMITS: RiskLimits = {
  maxDailyLossPct: 5,
  maxOverallLossPct: 10,
  maxLeverage: 30,
  maxLotSize: 5.0,
};

const INITIAL_LIVE_ACCOUNT: AccountData = {
  id: "OFFLINE",
  balance: 0,
  equity: 0,
  margin: 0,
  freeMargin: 0,
  leverage: 30,
  provider: "Broker Link",
};

const INITIAL_SIM_ACCOUNT: AccountData = {
  id: "SIM-SANDBOX",
  balance: 100000,
  equity: 100000,
  margin: 0,
  freeMargin: 100000,
  leverage: 100,
  provider: "Journex Practice",
};

// --- PROVIDER IMPLEMENTATION ---
export function TradingCoreProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvState] = useState<ExecutionEnvironment>("LIVE");
  const [loading, setLoading] = useState(false);
  const [riskLimits, setRiskLimits] = useState<RiskLimits>(DEFAULT_LIMITS);

  // Live States
  const [liveAccount, setLiveAccount] = useState<AccountData>(INITIAL_LIVE_ACCOUNT);
  const [livePositions, setLivePositions] = useState<Position[]>([]);
  const [liveDeals, setLiveDeals] = useState<Deal[]>([]);

  // Simulation States (Maintained client-side in React memory/localStorage)
  const [simAccount, setSimAccount] = useState<AccountData>(INITIAL_SIM_ACCOUNT);
  const [simPositions, setSimPositions] = useState<Position[]>([]);
  const [simDeals, setSimDeals] = useState<Deal[]>([]);

  // Shared Market Ticks
  const [marketData, setMarketData] = useState<Record<string, MarketTick>>({});

  // Sync intervals references
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- LOCAL STORAGE HYDRATION ---
  useEffect(() => {
    const savedLimits = localStorage.getItem("JOURNEX_RISK_LIMITS");
    if (savedLimits) setRiskLimits(JSON.parse(savedLimits));

    const savedSimAcc = localStorage.getItem("JOURNEX_SIM_ACCOUNT");
    if (savedSimAcc) setSimAccount(JSON.parse(savedSimAcc));

    const savedSimPos = localStorage.getItem("JOURNEX_SIM_POSITIONS");
    if (savedSimPos) setSimPositions(JSON.parse(savedSimPos));

    const savedSimDeals = localStorage.getItem("JOURNEX_SIM_DEALS");
    if (savedSimDeals) setSimDeals(JSON.parse(savedSimDeals));

    const savedEnv = localStorage.getItem("JOURNEX_EXEC_ENVIRONMENT");
    if (savedEnv) setEnvState(savedEnv as ExecutionEnvironment);
  }, []);

  const updateRiskLimits = (newLimits: Partial<RiskLimits>) => {
    setRiskLimits((prev) => {
      const updated = { ...prev, ...newLimits };
      localStorage.setItem("JOURNEX_RISK_LIMITS", JSON.stringify(updated));
      return updated;
    });
    toast.success("Risk boundaries modified");
  };

  const setEnvironment = (env: ExecutionEnvironment) => {
    setEnvState(env);
    localStorage.setItem("JOURNEX_EXEC_ENVIRONMENT", env);
    toast.info(`Environment switched to ${env}`);
  };

  // --- API HEADERS HELPER ---
  const getHeaders = async () => {
    const session = await getSession();
    const token = (session?.user as any)?.apiToken;
    const headers: Record<string, string> = {
      "ngrok-skip-browser-warning": "true",
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  // --- DYNAMIC SIMULATION TICKER ---
  // Periodically mock price movement for open positions and recalculate floating equity
  useEffect(() => {
    if (environment !== "SIMULATION" || simPositions.length === 0) return;

    const interval = setInterval(() => {
      // Mock random fluctuations for XAUUSD, EURUSD, etc if not populated by WebSockets
      setMarketData((prev) => {
        const next = { ...prev };
        simPositions.forEach((pos) => {
          const sym = pos.symbol;
          if (!next[sym]) {
            next[sym] = { symbol: sym, ask: pos.openPrice, bid: pos.openPrice - 0.2, pip_size: 0.01, digits: 2 };
          }
          // Slight price movement
          const tick = next[sym];
          const isGold = sym.includes("XAU");
          const step = isGold ? 0.15 : 0.0001;
          const delta = (Math.random() - 0.5) * step;
          tick.ask = Math.max(0.1, tick.ask + delta);
          tick.bid = Math.max(0.1, tick.bid + delta);
        });
        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [environment, simPositions]);

  // Recalculate simulation position floating PnLs and equity on tick updates
  useEffect(() => {
    if (environment !== "SIMULATION" || simPositions.length === 0) return;

    const updatedPos = simPositions.map((pos) => {
      const tick = marketData[pos.symbol];
      if (!tick) return pos;

      const currentPrice = pos.direction === "BUY" ? tick.bid : tick.ask;
      const priceDiff = pos.direction === "BUY" ? currentPrice - pos.openPrice : pos.openPrice - currentPrice;
      
      // Determine pip value contract sizing
      const isGold = pos.symbol.includes("XAU");
      const multiplier = isGold ? 100 : 100000; // 1 lot Gold = 100oz, 1 lot FX = 100,000 units
      const pnl = priceDiff * pos.lots * multiplier;

      return {
        ...pos,
        currentPrice,
        pnl,
      };
    });

    const totalFloatingPnL = updatedPos.reduce((sum, pos) => sum + pos.pnl, 0);
    const newEquity = Math.max(0, simAccount.balance + totalFloatingPnL);

    // Save state
    setSimPositions(updatedPos);
    setSimAccount((prev) => {
      const nextAcc = { ...prev, equity: newEquity, freeMargin: newEquity };
      localStorage.setItem("JOURNEX_SIM_ACCOUNT", JSON.stringify(nextAcc));
      return nextAcc;
    });
    localStorage.setItem("JOURNEX_SIM_POSITIONS", JSON.stringify(updatedPos));

    // Watchdog check for simulated drawdown limits
    const currentDrawdownPct = ((simAccount.balance - newEquity) / simAccount.balance) * 100;
    if (currentDrawdownPct >= riskLimits.maxDailyLossPct) {
      // Trigger local panic mode
      setSimPositions([]);
      setSimAccount((prev) => ({ ...prev, balance: prev.equity, freeMargin: prev.equity }));
      localStorage.setItem("JOURNEX_SIM_POSITIONS", JSON.stringify([]));
      toast.error("🚨 SIMULATION WARNING: Daily Drawdown Limit Violated! Auto-liquidated virtual positions.");
    }
  }, [marketData, environment]);

  // --- LIVE SYNC LOGIC ---
  const syncLiveState = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge";
      const res = await fetch(`${bridgeUrl}/api/account`, { headers });
      const data = await res.json();

      if (data.error) {
        setLiveAccount(prev => ({ ...prev, id: "OFFLINE" }));
        return;
      }

      setLiveAccount({
        id: `MT5-${data.login || "UNKNOWN"}`,
        balance: data.balance || 0,
        equity: data.equity || 0,
        margin: data.margin || 0,
        freeMargin: data.free_margin || 0,
        leverage: data.leverage || 30,
        provider: data.broker_server || "MT5 Terminal",
      });

      // Synchronize positions
      const posRes = await fetch(`${bridgeUrl}/api/positions`, { headers });
      const posData = await posRes.json();
      if (Array.isArray(posData)) {
        setLivePositions(
          posData.map((p: any) => ({
            ticket: p.ticket,
            symbol: p.symbol,
            direction: p.type === 0 ? "BUY" : "SELL", // 0=BUY, 1=SELL
            lots: p.volume,
            openPrice: p.price_open,
            currentPrice: p.price_current,
            sl: p.sl,
            tp: p.tp,
            pnl: p.profit,
            openTime: new Date(p.time_setup * 1000).toISOString(),
          }))
        );
      }
    } catch (e) {
      setLiveAccount(prev => ({ ...prev, id: "OFFLINE" }));
    }
  }, []);

  // --- GLOBAL SYNC CHANNELS ---
  const syncState = useCallback(async () => {
    setLoading(true);
    if (environment === "LIVE") {
      await syncLiveState();
    }
    setLoading(false);
  }, [environment, syncLiveState]);

  // Background sync loops
  useEffect(() => {
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    syncState();
    syncTimerRef.current = setInterval(syncState, 5000);
    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [syncState]);

  // --- ORDER EXECUTION GATEWAY ---
  const executeTrade = async (params: {
    symbol: string;
    direction: "BUY" | "SELL";
    lots: number;
    sl: number;
    tp: number;
    comment?: string;
  }): Promise<boolean> => {
    // ── Pre-execution Risk Inspection ──
    if (params.lots > riskLimits.maxLotSize) {
      toast.error(`Trade execution blocked: Sizing exceeds the maximum limit of ${riskLimits.maxLotSize} lots.`);
      return false;
    }

    if (environment === "LIVE") {
      if (liveAccount.id === "OFFLINE") {
        toast.error("Bridge Connection is offline. Cannot execute live trade.");
        return false;
      }
      setLoading(true);
      try {
        const headers = await getHeaders();
        const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge";
        const res = await fetch(`${bridgeUrl}/api/execute-trade`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            symbol: params.symbol,
            direction: params.direction,
            lot_size: params.lots,
            sl: params.sl,
            tp: params.tp,
            comment: params.comment || "Journex Core Execution",
          }),
        });
        const data = await res.json();
        setLoading(false);
        if (data.success) {
          toast.success(`✅ Live Trade Placed: #${data.ticket}`);
          syncLiveState();
          return true;
        } else {
          toast.error(`Execution Failed: ${data.error}`);
          return false;
        }
      } catch (err) {
        setLoading(false);
        toast.error("Network error during execution. Check MT5 connection.");
        return false;
      }
    } else {
      // ── Simulation Engine Execution ──
      const ticket = Date.now();
      const openPrice = params.direction === "BUY"
        ? (marketData[params.symbol]?.ask || 2500)
        : (marketData[params.symbol]?.bid || 2500);

      const newPos: Position = {
        ticket,
        symbol: params.symbol,
        direction: params.direction,
        lots: params.lots,
        openPrice,
        currentPrice: openPrice,
        sl: params.sl,
        tp: params.tp,
        pnl: 0,
        openTime: new Date().toISOString(),
      };

      setSimPositions((prev) => {
        const next = [newPos, ...prev];
        localStorage.setItem("JOURNEX_SIM_POSITIONS", JSON.stringify(next));
        return next;
      });

      toast.success(`🎮 Virtual Position Placed: #${ticket} @ ${openPrice}`);
      return true;
    }
  };

  // --- POSITION CLOSING GATEWAY ---
  const closePosition = async (ticket: string | number): Promise<boolean> => {
    if (environment === "LIVE") {
      setLoading(true);
      try {
        const headers = await getHeaders();
        const pos = livePositions.find(p => p.ticket === ticket);
        if (!pos) return false;

        const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge";
        const res = await fetch(`${bridgeUrl}/api/execute-trade`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            symbol: pos.symbol,
            direction: pos.direction === "BUY" ? "SELL" : "BUY",
            lot_size: pos.lots,
            sl: 0,
            tp: 0,
            comment: `Close Position #${ticket}`,
          }),
        });
        const data = await res.json();
        setLoading(false);
        if (data.success) {
          toast.success(`Closed Position: #${ticket}`);
          syncLiveState();
          return true;
        } else {
          toast.error(`Failed to Close: ${data.error}`);
          return false;
        }
      } catch (err) {
        setLoading(false);
        toast.error("Network error during close request.");
        return false;
      }
    } else {
      // ── Close Simulation position ──
      const pos = simPositions.find((p) => p.ticket === ticket);
      if (!pos) return false;

      const tick = marketData[pos.symbol];
      const closePrice = pos.direction === "BUY" ? (tick?.bid || pos.currentPrice) : (tick?.ask || pos.currentPrice);

      const newDeal: Deal = {
        ticket: pos.ticket,
        symbol: pos.symbol,
        direction: pos.direction,
        lots: pos.lots,
        openPrice: pos.openPrice,
        closePrice,
        profit: pos.pnl,
        closeTime: new Date().toISOString(),
        comment: "Virtual simulation trade",
      };

      setSimPositions((prev) => {
        const next = prev.filter((p) => p.ticket !== ticket);
        localStorage.setItem("JOURNEX_SIM_POSITIONS", JSON.stringify(next));
        return next;
      });

      setSimDeals((prev) => {
        const next = [newDeal, ...prev];
        localStorage.setItem("JOURNEX_SIM_DEALS", JSON.stringify(next));
        return next;
      });

      setSimAccount((prev) => {
        const nextAcc = {
          ...prev,
          balance: prev.balance + pos.pnl,
          equity: prev.balance + pos.pnl,
          freeMargin: prev.balance + pos.pnl,
        };
        localStorage.setItem("JOURNEX_SIM_ACCOUNT", JSON.stringify(nextAcc));
        return nextAcc;
      });

      toast.success(`🎮 Virtual Position Closed: #${ticket} | Return: $${pos.pnl.toFixed(2)}`);
      return true;
    }
  };

  const closeAllPositions = async (): Promise<boolean> => {
    if (environment === "LIVE") {
      let success = true;
      for (const pos of livePositions) {
        const ok = await closePosition(pos.ticket);
        if (!ok) success = false;
      }
      return success;
    } else {
      simPositions.forEach((pos) => {
        closePosition(pos.ticket);
      });
      return true;
    }
  };

  // --- FINAL DECK RESOLVER ---
  const activeAccount = environment === "LIVE" ? liveAccount : simAccount;
  const activePositions = environment === "LIVE" ? livePositions : simPositions;
  const activeDeals = environment === "LIVE" ? liveDeals : simDeals;

  return (
    <TradingCoreContext.Provider
      value={{
        environment,
        setEnvironment,
        account: activeAccount,
        positions: activePositions,
        deals: activeDeals,
        marketData,
        riskLimits,
        updateRiskLimits,
        executeTrade,
        closePosition,
        closeAllPositions,
        syncState,
        loading,
      }}
    >
      {children}
    </TradingCoreContext.Provider>
  );
}

export function useTradingCore() {
  const context = useContext(TradingCoreContext);
  if (!context) throw new Error("useTradingCore must be used within a TradingCoreProvider");
  return context;
}
