"use client";

import React, {
  createContext, useContext, useState, useEffect, useCallback, useRef
} from "react";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────
export type PanicTrigger =
  | "daily_loss_exceeded"
  | "consecutive_losses"
  | "max_risk_exceeded"
  | "tilt_detected"
  | "manual";

export interface PanicState {
  active: boolean;
  lockedUntil: Date | null;         // null = warning only, Date = hard lock
  trigger: PanicTrigger | null;
  consecutiveLosses: number;
  dailyLossPct: number;
  message: string;
  viewOnly: boolean;                // true when locked — disables BUY/SELL
}

interface PanicContextType {
  panic: PanicState;
  triggerPanic: (trigger: PanicTrigger, lockHours?: number) => void;
  dismissPanic: () => void;
  lockAccount: (hours: number) => void;
  isPanicActive: boolean;
  isLocked: boolean;
}

// ─── Defaults ───────────────────────────────────────────────────────────────
const DEFAULT_PANIC: PanicState = {
  active: false,
  lockedUntil: null,
  trigger: null,
  consecutiveLosses: 0,
  dailyLossPct: 0,
  message: "",
  viewOnly: false,
};

// ─── Thresholds (user-configurable in future) ────────────────────────────────
const MAX_DAILY_LOSS_PCT = 3;   // 3% daily loss triggers warning
const HARD_LOCK_LOSS_PCT = 5;   // 5% triggers hard lock
const CONSECUTIVE_LOSS_WARN = 3;
const CONSECUTIVE_LOSS_LOCK = 4;

const PanicContext = createContext<PanicContextType>({
  panic: DEFAULT_PANIC,
  triggerPanic: () => {},
  dismissPanic: () => {},
  lockAccount: () => {},
  isPanicActive: false,
  isLocked: false,
});

export function PanicModeProvider({ children }: { children: React.ReactNode }) {
  const [panic, setPanic] = useState<PanicState>(DEFAULT_PANIC);
  const lastCheckRef = useRef<number>(0);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const isPanicActive = panic.active;
  const isLocked = panic.viewOnly && panic.lockedUntil !== null
    ? new Date() < panic.lockedUntil
    : false;

  // ─── Actions ──────────────────────────────────────────────────────────────
  const triggerPanic = useCallback((trigger: PanicTrigger, lockHours?: number) => {
    const messages: Record<PanicTrigger, string> = {
      daily_loss_exceeded: "Your daily loss limit has been reached.",
      consecutive_losses: "You have hit multiple consecutive losses. Tilt probability is high.",
      max_risk_exceeded: "Your open risk exceeds the maximum allowed.",
      tilt_detected: "AI has detected signs of emotional trading. Step back.",
      manual: "Account manually locked.",
    };

    setPanic(prev => ({
      ...prev,
      active: true,
      trigger,
      message: messages[trigger],
      lockedUntil: lockHours ? new Date(Date.now() + lockHours * 3600 * 1000) : null,
      viewOnly: !!lockHours,
    }));
  }, []);

  const lockAccount = useCallback((hours: number) => {
    setPanic(prev => ({
      ...prev,
      active: true,
      viewOnly: true,
      lockedUntil: new Date(Date.now() + hours * 3600 * 1000),
    }));
  }, []);

  const dismissPanic = useCallback(() => {
    // Can only dismiss if not hard-locked
    setPanic(prev => {
      if (prev.viewOnly && prev.lockedUntil && new Date() < prev.lockedUntil) {
        return prev; // Cannot dismiss a hard lock
      }
      return DEFAULT_PANIC;
    });
  }, []);

  // ─── Auto-monitor: fetch trade history + account to detect triggers ───────
  useEffect(() => {
    const check = async () => {
      const now = Date.now();
      if (now - lastCheckRef.current < 10000) return; // max once per 10s
      lastCheckRef.current = now;

      try {
        const backendUrl = getBackendUrl();

        // Get today's closed trades from the history endpoint
        const histRes = await fetchWithAuth(`${backendUrl}/api/bridge/api/history`);
        if (!histRes.ok) return;
        const histData = await histRes.json();
        const trades: any[] = histData.trades || histData.history || [];

        // Filter to TODAY
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTrades = trades.filter(t => {
          const d = new Date(t.closeTime || t.close_time || t.time * 1000);
          return d >= today;
        });

        // --- Metric 1: Consecutive losses ---
        let consec = 0;
        for (const t of [...todayTrades].reverse()) {
          const profit = t.profit ?? t.pnl ?? 0;
          if (profit < 0) consec++;
          else break;
        }

        // --- Metric 2: Daily P&L % ---
        const totalDailyPnL = todayTrades.reduce((sum, t) => sum + (t.profit ?? t.pnl ?? 0), 0);

        // Fetch balance to compute %
        const accRes = await fetchWithAuth(`${backendUrl}/api/bridge/api/account`);
        let balance = 10000;
        if (accRes.ok) {
          const accData = await accRes.json();
          balance = accData.balance || 10000;
        }

        const dailyLossPct = balance > 0 ? Math.abs(Math.min(0, totalDailyPnL) / balance * 100) : 0;

        // Update metrics on state
        setPanic(prev => ({ ...prev, consecutiveLosses: consec, dailyLossPct }));

        // Don't trigger if already panicking or locked
        if (panic.active) return;

        // --- Check triggers ---
        if (dailyLossPct >= HARD_LOCK_LOSS_PCT) {
          triggerPanic("daily_loss_exceeded", 6); // hard lock 6h
        } else if (dailyLossPct >= MAX_DAILY_LOSS_PCT) {
          triggerPanic("daily_loss_exceeded");
        } else if (consec >= CONSECUTIVE_LOSS_LOCK) {
          triggerPanic("consecutive_losses", 2); // soft lock 2h
        } else if (consec >= CONSECUTIVE_LOSS_WARN) {
          triggerPanic("consecutive_losses");
        }
      } catch {
        // Silent — bridge may not be connected
      }
    };

    // Check immediately and then every 15s
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [panic.active, triggerPanic]);

  // ─── Auto-release expired locks ──────────────────────────────────────────
  useEffect(() => {
    if (!panic.lockedUntil) return;
    const ms = panic.lockedUntil.getTime() - Date.now();
    if (ms <= 0) { dismissPanic(); return; }
    const t = setTimeout(() => setPanic(prev => ({ ...prev, active: false, viewOnly: false, lockedUntil: null })), ms);
    return () => clearTimeout(t);
  }, [panic.lockedUntil, dismissPanic]);

  return (
    <PanicContext.Provider value={{ panic, triggerPanic, dismissPanic, lockAccount, isPanicActive, isLocked }}>
      {children}
    </PanicContext.Provider>
  );
}

export const usePanicMode = () => useContext(PanicContext);
